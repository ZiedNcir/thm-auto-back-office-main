const FacturMainOeuvre = require('../models/facturMainOeuvre');
const HistoriqueFactures = require('../models/historiqueFactures');
const User = require('../models/User');
const mongoose = require('mongoose');

// Génération automatique du numéro

const genererNumeroFactureMainOeuvre = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}${month}`;
    
    try {
        // Find the latest invoice for the current year-month
        const latestInvoice = await FacturMainOeuvre.findOne({
            num_facture: { $regex: `^${prefix}` }
        }).sort({ num_facture: -1 }).lean();
        
        let nextNumber = 1;
        
        if (latestInvoice?.num_facture) {
            // Extract the number part after the year-month
            const match = latestInvoice.num_facture.match(/^\d{6}(\d+)$/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }
        
        // Format number with leading zeros (e.g., 001, 002, ..., 999)
        const formattedNumber = String(nextNumber).padStart(3, '0');
        return `${prefix}${formattedNumber}`;
        
    } catch (error) {
        console.error('Error generating invoice number:', error);
        throw new Error('Failed to generate invoice number');
    }
};
exports.getAllFactures = async (req, res) => {
    try {
        const factures = await FacturMainOeuvre.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: factures.length,
            data: factures
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.createFacture = async (req, res) => {

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const {
            nomAdmin,
            nomClient,
            numeroClient,
            teleClient,
            numCarteGrise,
            matriculeVoiture,
            dateIntervention,
            changement,
            dressage,
            reparation,
            totalMainOeuvre,
            tva,
            ttc
        } = req.body;

        // Vérification admin
        const admin = await User.findOne({
            username: nomAdmin,
            role: { $in: ["admin", "sous-admin"] }
        }).session(session);

        if (!admin) {
            await session.abortTransaction();
            session.endSession();

            return res.status(404).json({
                success: false,
                message: "Utilisateur non autorisé."
            });
        }

        // Génération du numéro
        const numero = await genererNumeroFactureMainOeuvre();

        const [facture] = await FacturMainOeuvre.create([{
            num_facture: numero,
            nomAdmin,
            nomClient,
            numeroClient,
            teleClient,
            numCarteGrise,
            matriculeVoiture,
            dateIntervention,
            changement,
            dressage,
            reparation,
            totalMainOeuvre,
            tva,
            ttc
        }], { session });

        // Historique
        let historique = await HistoriqueFactures.findOne({ nomAdmin }).session(session);

        if (!historique) {

            historique = await HistoriqueFactures.create([{
                nomAdmin,
                facturesMainOeuvre: [{
                    facture: facture._id,
                    visibilite: true
                }]
            }], { session });

        } else {

            historique.facturesMainOeuvre.push({
                facture: facture._id,
                visibilite: true
            });

            await historique.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            success: true,
            message: "Facture créée avec succès.",
            data: facture
        });

    } catch (err) {

        await session.abortTransaction();
        session.endSession();

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

};
// GET BY ID ou num_facture (Intelligent)
exports.getFactureById = async (req, res) => {
    try {
        const identifiantCible = decodeURIComponent(req.params.id).trim();

        let filtreRecherche = {};
        if (mongoose.Types.ObjectId.isValid(identifiantCible)) {
            filtreRecherche = { _id: identifiantCible };
        } else {
            filtreRecherche = { num_facture: identifiantCible };
        }

        const facture = await FacturMainOeuvre.findOne(filtreRecherche);

        if (!facture) {
            return res.status(404).json({ success: false, message: 'Facture non trouvée' });
        }

        res.status(200).json({ success: true, data: facture });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE (Avec recherche intelligente + protection contre modification num_facture)
exports.updateFacture = async (req, res) => {
    try {

        const id = decodeURIComponent(req.params.id).trim();

        const { num_facture, ...updateData } = req.body;

        let filtre = {};

        if (mongoose.Types.ObjectId.isValid(id)) {
            filtre = { _id: id };
        } else {
            filtre = { num_facture: id };
        }

        const facture = await FacturMainOeuvre.findOneAndUpdate(
            filtre,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!facture) {
            return res.status(404).json({
                success: false,
                message: "Facture non trouvée"
            });
        }

        res.status(200).json({
            success: true,
            message: "Facture mise à jour avec succès",
            data: facture
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
};
// DELETE avec retrait automatique de l'historique (Sécurisé)
exports.deleteFacture = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const identifiantCible = decodeURIComponent(req.params.id).trim();

        let filtreRecherche = {};
        if (mongoose.Types.ObjectId.isValid(identifiantCible)) {
            filtreRecherche = { _id: identifiantCible };
        } else {
            filtreRecherche = { num_facture: identifiantCible };
        }

        // 1. Suppression de la facture
        const facture = await FacturMainOeuvre.findOneAndDelete(filtreRecherche).session(session);

        if (!facture) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Facture non trouvée' });
        }

        // 2. Nettoyage automatique de la référence dans historique_factures
        await HistoriqueFactures.updateMany(
            { "facturesMainOeuvre.facture": facture._id },
            { $pull: { facturesMainOeuvre: { facture: facture._id } } }
        ).session(session);

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: 'Facture supprimée et retirée de historique' });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: error.message });
    }
};