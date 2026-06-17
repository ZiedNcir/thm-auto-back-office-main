require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const facturMainOeuvreRoutes = require('./routes/facturMainOeuvreRoutes');
const HistoriqueFactureRoutes = require('./routes/HistoriqueFactureRoutes');
const facturPent = require('./routes/facturePeintureRoutes');
const factureDeviceRoutes = require('./routes/FactureDeviceRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

/* ================= MIDDLEWARES ================= */
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ================= ROUTES ================= */
app.use('/api/users', userRoutes);
app.use('/api/factur-main-oeuvre', facturMainOeuvreRoutes);
app.use('/api/historique-factures', HistoriqueFactureRoutes);
app.use('/api/facture-peinture', facturPent);
app.use('/api/facture-device', factureDeviceRoutes);

/* ================= TEST ROUTE ================= */
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API THM AUTO running successfully'
    });
});

/* ================= DATABASE ================= */
// Hardcoded MongoDB URI (works even if env vars fail)
const MONGO_URI = "mongodb+srv://THM:THM20113786@thm-auto.151lpuv.mongodb.net/THM-AUTO?retryWrites=true&w=majority";
const PORT = process.env.PORT || 5000;

console.log('🔍 Environment check:');
console.log('PORT from env:', process.env.PORT || 'Using default 5000');
console.log('MONGO_URI from env:', process.env.MONGO_URI ? '✅ Set' : '❌ Undefined (using hardcoded)');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB connecté');
        return true;
    } catch (error) {
        console.error('❌ Erreur MongoDB :', error.message);
        return false;
    }
};

// For serverless platforms (AWS Lambda, Vercel, Netlify)
if (process.env.AWS_LAMBDA || process.env.VERCEL || process.env.NETLIFY) {
    console.log('🔄 Running in serverless mode');
    
    // Cache MongoDB connection
    let cachedDb = null;
    
    const connectToDatabase = async () => {
        if (cachedDb) {
            console.log('♻️ Using cached database connection');
            return cachedDb;
        }
        
        try {
            await mongoose.connect(MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            cachedDb = mongoose.connection;
            console.log('✅ MongoDB connected for serverless');
            return cachedDb;
        } catch (error) {
            console.error('❌ MongoDB connection error:', error.message);
            throw error;
        }
    };

    // Export for serverless
    module.exports.handler = async (event, context) => {
        context.callbackWaitsForEmptyEventLoop = false;
        
        try {
            await connectToDatabase();
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    message: 'Database connection failed',
                    error: error.message
                })
            };
        }

        // Process request with Express
        return new Promise((resolve, reject) => {
            app(event, context, (err, result) => {
                if (err) {
                    console.error('Express error:', err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    };
} else {
    // Local development
    console.log('🔄 Running in local development mode');
    
    connectDB().then((connected) => {
        if (connected) {
            app.listen(PORT, () => {
                console.log(`🚀 Serveur lancé sur port ${PORT}`);
                console.log(`📍 http://localhost:${PORT}`);
            });
        } else {
            console.error('❌ Failed to connect to MongoDB. Server not started.');
            process.exit(1);
        }
    });
}