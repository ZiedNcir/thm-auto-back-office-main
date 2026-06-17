const FacturMainOeuvre = require('../models/facturMainOeuvre');
const HistoriqueFactures = require('../models/historiqueFactures');
const User = require('../models/User');
const mongoose = require('mongoose');

// Fonction utilitaire pour générer le numéro (Ex: Main-d'oeuvre:2026.01)
const genererNumeroFactureMainOeuvre = async () => {
    const anneeEnCours = new Date().getFullYear();
    // Le \\. permet d'échapper le point dans la RegEx
    const prefixeRecherche = `Main-d'oeuvre:${anneeEnCours}\\.`;

    const derniereFacture = await FacturMainOeuvre.findOne({
        num_facture: new RegExp(`^${prefixeRecherche}`)
    }).sort({ createdAt: -1 });

    let prochainNumero = 1;

    if (derniereFacture && derniereFacture.num_facture) {
        const parties = derniereFacture.num_facture.split('.');
        const compteurActuel = parseInt(parties[1], 10);
        if (!isNaN(compteurActuel)) {
            prochainNumero = compteurActuel + 1;
        }
    }

    const numeroFormate = String(prochainNumero).padStart(2, '0');
    return `Main-d'oeuvre:${anneeEnCours}.${numeroFormate}`;
};

// CREATE avec Transaction, Historique et Numérotation automatique
exports.createFacture = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            changement = [],
            dressage = [],
            reparation = [],
            nombreHeure,
            prixParHeure,
            tva = 19,
            nomAdmin
        } = req.body;

        // vérifier admin ou sous-admin
        const admin = await User.findOne({
            username: nomAdmin,
            role: { $in: ['admin', 'sous-admin'] }
        }).session(session);

        if (!admin) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Utilisateur non autorisé à créer une facture"
            });
        }

        // Calculs financiers
        const totalChangement = changement.reduce((sum, item) => sum + (item.prix || 0), 0);
        const totalDressage = dressage.reduce((sum, item) => sum + (item.prix || 0), 0);
        const totalReparation = reparation.reduce((sum, item) => sum + (item.prix || 0), 0);
        const totalMainOeuvre = nombreHeure * prixParHeure;

        const totalHT = totalChangement + totalDressage + totalReparation + totalMainOeuvre;
        const ttc = totalHT + (totalHT * tva / 100);

        // Génération automatique du numéro unique
        const numFactureAuto = await genererNumeroFactureMainOeuvre();

        const nouvelleFactureData = {
            ...req.body,
            num_facture: numFactureAuto,
            totalMainOeuvre,
            ttc
        };

        const [facture] = await FacturMainOeuvre.create([nouvelleFactureData], { session });

        // Gestion de l'historique
        let historique = await HistoriqueFactures.findOne({ nomAdmin }).session(session);

        if (!historique) {
            await HistoriqueFactures.create([{
                nomAdmin,
                facturesMainOeuvre: [{ facture: facture._id, visibilite: true }]
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

        res.status(201).json({
            success: true,
            message: 'Facture créée avec succès',
            data: facture
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET ALL
exports.getAllFactures = async (req, res) => {
    try {
        const factures = await FacturMainOeuvre.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: factures.length, data: factures });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
        const identifiantCible = decodeURIComponent(req.params.id).trim();

        // Sécurité : Extraction de num_facture pour empêcher sa modification
        const { num_facture, ...donneesRecues } = req.body;

        let filtreRecherche = {};
        if (mongoose.Types.ObjectId.isValid(identifiantCible)) {
            filtreRecherche = { _id: identifiantCible };
        } else {
            filtreRecherche = { num_facture: identifiantCible };
        }

        let factureExistante = await FacturMainOeuvre.findOne(filtreRecherche);

        if (!factureExistante) {
            return res.status(404).json({ success: false, message: "Facture non trouvée" });
        }

        // Fusion des données existantes et des modifications pour recalculer proprement
        const dataHT = {
            ...factureExistante.toObject(),
            ...donneesRecues
        };

        const {
            changement = [],
            dressage = [],
            reparation = [],
            nombreHeure,
            prixParHeure,
            tva = 19
        } = dataHT;

        // Recalcul des pièces et services
        const totalChangement = changement.reduce((sum, item) => sum + (item.prix || 0), 0);
        const totalDressage = dressage.reduce((sum, item) => sum + (item.prix || 0), 0);
        const totalReparation = reparation.reduce((sum, item) => sum + (item.prix || 0), 0);
        
        // Recalcul main d'œuvre
        const totalMainOeuvre = (nombreHeure || 0) * (prixParHeure || 0);

        // Nouveau total HT et TTC
        const totalHT = totalChangement + totalDressage + totalReparation + totalMainOeuvre;
        const ttc = totalHT + (totalHT * tva / 100);

        // Application des modifications au document Mongoose
        Object.assign(factureExistante, donneesRecues);
        factureExistante.totalMainOeuvre = totalMainOeuvre;
        factureExistante.ttc = ttc;

        await factureExistante.save();

        res.status(200).json({
            success: true,
            message: "Facture mise à jour avec recalcul",
            data: factureExistante
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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