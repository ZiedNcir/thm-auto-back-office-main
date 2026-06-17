const FacturePeinture = require('../models/facture_peinture');
const HistoriqueFactures = require('../models/historiqueFactures');
const User = require('../models/User');
const mongoose = require('mongoose');

// Fonction utilitaire pour générer le numéro (Ex: Facture_peinture:2026.01)
const genererNumeroFacturePeinture = async () => {
    const anneeEnCours = new Date().getFullYear();
    const prefixeRecherche = `Facture_peinture:${anneeEnCours}\\.`;

    const derniereFacture = await FacturePeinture.findOne({
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
    return `Facture_peinture:${anneeEnCours}.${numeroFormate}`;
};

// CREATE avec Transaction et Historique
exports.createFacturePeinture = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { nomAdmin } = req.body;

        const adminExists = await User.findOne({ username: nomAdmin }).session(session);
        if (!adminExists) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: "Nom admin introuvable." });
        }

        // Génération automatique du numéro
        const numFactureAuto = await genererNumeroFacturePeinture();

        // Ajout du numéro généré aux données reçues
        const nouvelleFactureData = { ...req.body, num_facture: numFactureAuto };
        
        const [facture] = await FacturePeinture.create([nouvelleFactureData], { session });

        // Gestion de l'historique
        let historique = await HistoriqueFactures.findOne({ nomAdmin }).session(session);

        if (!historique) {
            await HistoriqueFactures.create([{
                nomAdmin,
                facturesPeinture: [{ facture: facture._id }]
            }], { session });
        } else {
            historique.facturesPeinture.push({ facture: facture._id });
            await historique.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "Facture peinture créée + ajout historique.",
            data: facture
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: "Erreur serveur.", error: error.message });
    }
};

// GET ALL
exports.getAllFacturesPeinture = async (req, res) => {
    try {
        const factures = await FacturePeinture.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: factures.length, data: factures });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur récupération factures.", error: error.message });
    }
};

exports.getFacturePeintureById = async (req, res) => {
    try {
        const identifiantCible = decodeURIComponent(req.params.id).trim();

        let requeteRecherche = {};

        // Si l'identifiant reçu est un ID Mongoose valide (24 caractères hexadécimaux)
        if (mongoose.Types.ObjectId.isValid(identifiantCible)) {
            requeteRecherche = { _id: identifiantCible };
        } else {
            // Sinon, on cherche par le numéro de facture automatique
            requeteRecherche = { num_facture: identifiantCible };
        }

        const facture = await FacturePeinture.findOne(requeteRecherche);

        if (!facture) {
            return res.status(404).json({ 
                success: false, 
                message: `Facture avec l'identifiant '${identifiantCible}' introuvable en base de données.` 
            });
        }

        res.status(200).json({ success: true, data: facture });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur.", error: error.message });
    }
};
// UPDATE (Recherche par num_facture et protection contre sa modification)
exports.updateFacturePeinture = async (req, res) => {
    try {
        // 1. Nettoyer et décoder l'identifiant reçu (qu'il s'agisse d'un ID ou d'un numéro)
        const identifiantCible = decodeURIComponent(req.params.id).trim();
        
        // 2. SÉCURITÉ : Extraction de num_facture pour empêcher sa mise à jour
        const { num_facture, ...donneesAModifier } = req.body;

        // 3. Déterminer dynamiquement le filtre de recherche
        let filtreRecherche = {};
        if (mongoose.Types.ObjectId.isValid(identifiantCible)) {
            filtreRecherche = { _id: identifiantCible };
        } else {
            filtreRecherche = { num_facture: identifiantCible };
        }

        // 4. Recherche et mise à jour
        // Note importante : On utilise { new: true } mais Mongoose ne déclenche pas le hook .pre('save') 
        // lors d'un findOneAndUpdate. Pour forcer les calculs automatiques de vos totaux (HT, TVA, TTC),
        // nous allons charger le document modifié et appeler explicitement .save()
        const facture = await FacturePeinture.findOneAndUpdate(
            filtreRecherche,
            { $set: donneesAModifier },
            { new: true, runValidators: true }
        );

        if (!facture) {
            return res.status(404).json({ 
                success: false, 
                message: `Facture avec l'identifiant '${identifiantCible}' introuvable.` 
            });
        }

        // 5. ASTUCE : Forcer le recalcul des totaux HT, TVA et TTC via votre hook pre('save')
        await facture.save();

        res.status(200).json({
            success: true,
            message: "Facture mise à jour avec succès et montants recalculés.",
            data: facture
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur modification facture.", error: error.message });
    }
};
// DELETE avec retrait de l'historique via transaction
exports.deleteFacturePeinture = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const numFactureCible = decodeURIComponent(req.params.id).trim();

        let filtreRecherche = {};
                if (mongoose.Types.ObjectId.isValid(numFactureCible)) {
                    filtreRecherche = { _id: numFactureCible };
                } else {
                    filtreRecherche = { num_facture: numFactureCible };
                }
        
                // 1. Suppression de la facture
                const facture = await FacturePeinture.findOneAndDelete(filtreRecherche).session(session);
        
                if (!facture) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(404).json({ success: false, message: 'Facture non trouvée' });
                }

        // 2. Supprimer la référence de l'ID de cette facture dans le tableau facturesPeinture de l'historique
        await HistoriqueFactures.updateMany(
            { "facturesPeinture.facture": facture._id },
            { $pull: { facturesPeinture: { facture: facture._id } } }
        ).session(session);

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: "Facture supprimée avec succès (Retirée de l'historique)." });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: "Erreur suppression facture.", error: error.message });
    }
};