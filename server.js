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
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

// Validate MongoDB URI
if (!mongoUri) {
    console.error('❌ MONGO_URI or MONGODB_URI is not defined in environment variables');
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('MONGO')));
    // Don't exit in serverless, just log the error
}

// Connect to MongoDB (lazy connection for serverless)
const connectDB = async () => {
    if (!mongoUri) {
        console.error('❌ Cannot connect to MongoDB: URI is undefined');
        return;
    }
    
    try {
        await mongoose.connect("mongodb+srv://THM:THM20113786@thm-auto.151lpuv.mongodb.net/THM-AUTO?retryWrites=true&w=majority", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB connecté');
    } catch (error) {
        console.error('❌ Erreur MongoDB :', error.message);
    }
};
