const mongoose = require('mongoose');

/* ===== MAIN D'OEUVRE ===== */

const tacheSchema = new mongoose.Schema({
    designation: String,
    prix: Number
}, { _id: false });

const mainOeuvreSchema = new mongoose.Schema({
    changement: [tacheSchema],
    dressage: [tacheSchema],
    reparation: [tacheSchema],

    totalMainOeuvre: {
        type: Number,
        default: 0
    }
}, { _id: false });

/* ===== PEINTURE ===== */

const peintureSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: true
    },
    quantite: {
        type: Number,
        required: true,
        min: 1
    },
    prixUnitaire: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        default: 0
    }
}, { _id: false });

/* ===== DEVICE ===== */

const deviceSchema = new mongoose.Schema({
    motif: {
        type: String,
        required: true,
        unique: true
    },

    nomAdmin: {
        type: String,
        required: true
    },

    client: {
        nom: String,
        teleClient: String,
        numCarteGrise: String,
        matriculeVoiture: String
    },

    factureMainOeuvre: mainOeuvreSchema,
    dateIntervention: { type: Date, required: true },

    facturePeinture: [peintureSchema],

    totalMainOeuvre: {
        type: Number,
        default: 0
    },

    totalPeinture: {
        type: Number,
        default: 0
    },

    totalGeneral: {
        type: Number,
        default: 0
    }

}, { timestamps: true });

/* ===== PRE SAVE (CORRECTEMENT PLACÉ) ===== */


/* ===== EXPORT À LA FIN ===== */

module.exports = mongoose.model('Device', deviceSchema);