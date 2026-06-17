

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
const PORT = 5000;
const JWT_SECRET="7WK5T79u5mIzjIXXi2oI9Fglmgivv7RAJ7izyj9tUyQ";


// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            
        });
        console.log('✅ MongoDB connecté');
        return true;
    } catch (error) {
        console.error('❌ Erreur MongoDB :', error.message);
        return false;
    }
};


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