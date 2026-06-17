const mongoose = require('mongoose');

const historiqueSchema = new mongoose.Schema({
    nomAdmin: {
        type: String,
        required: true
    },

    facturesMainOeuvre: [
        {
            facture: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'FacturMainOeuvre',
                required: true
            },
            visibilite: {
                type: Boolean,
                default: true
            }
        }
    ],

    facturesPeinture: [
        {
            facture: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'FacturePeinture',
                required: true
            },
            visibilite: {
                type: Boolean,
                default: true
            }
        }
    ],
 
    facturesDevice: [
        {
            
        }
    ]

}, {
    timestamps: true,
    collection: 'historique_factures'
});

module.exports = mongoose.model('HistoriqueFactures', historiqueSchema);