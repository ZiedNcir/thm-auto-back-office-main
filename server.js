require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');


const facturMainOeuvreRoutes = require('./routes/facturMainOeuvreRoutes');
const HistoriqueFactureRoutes = require('./routes/HistoriqueFactureRoutes');
const facturPent= require ('./routes/facturePeintureRoutes');
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
const mongoUri = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

mongoose.connect(mongoUri)
    .then(() => {
        console.log('✅ MongoDB connecté');
        
        app.listen(PORT, () => {
            console.log(`🚀 Serveur lancé sur port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ Erreur MongoDB :', error.message);
    });