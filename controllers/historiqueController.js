const HistoriqueFactures = require('../models/historiqueFactures');
const FacturMainOeuvre = require('../models/facturMainOeuvre');
const FacturePeinture = require('../models/facture_peinture');
const FactureDevice = require('../models/facturesDevice');


// ======================================================
// GET ALL HISTORY
// ======================================================
exports.getAllHistory = async (req, res) => {
    try {
        const history = await HistoriqueFactures.find()
            .populate('facturesMainOeuvre.facture')
            .populate('facturesPeinture.facture')
            .populate('facturesDevice.facture')
            .sort({ createdAt: -1 });

        const countHistory = history.length;

        const countFactures = history.reduce((total, item) => {
            return (
                total +
                item.facturesMainOeuvre.length +
                item.facturesPeinture.length +
                item.facturesDevice.length
            );
        }, 0);

        res.status(200).json({
            success: true,
            countHistory,
            countFactures,
            data: history
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ======================================================
// DELETE FACTURE FROM HISTORY
// ======================================================
exports.deleteFactureFromHistory = async (req, res) => {
    try {
        const { historiqueId, factureId } = req.params;

        const historique = await HistoriqueFactures.findById(historiqueId);

        if (!historique) {
            return res.status(404).json({
                success: false,
                message: 'Historique non trouvé'
            });
        }

        const exists = historique.facturesMainOeuvre.some(
            f => f.facture.toString() === factureId
        );

        if (!exists) {
            return res.status(404).json({
                success: false,
                message: 'Facture non trouvée dans l’historique'
            });
        }

        const factureSupprimee = await FacturMainOeuvre.findById(factureId);

        historique.facturesMainOeuvre = historique.facturesMainOeuvre.filter(
            f => f.facture.toString() !== factureId
        );

        await historique.save();

        res.status(200).json({
            success: true,
            message: 'Facture supprimée de l’historique',
            data: factureSupprimee
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ======================================================
// CHANGE VISIBILITY (TOGGLE)
// ======================================================
exports.changeFactureVisibility = async (req, res) => {
    try {
        const { historiqueId, type, factureId } = req.params;

        const historique = await HistoriqueFactures.findById(historiqueId);

        if (!historique) {
            return res.status(404).json({
                success: false,
                message: "Historique introuvable"
            });
        }

        const mapping = {
            mainOeuvre: "facturesMainOeuvre",
            peinture: "facturesPeinture",
            device: "facturesDevice"
        };

        const field = mapping[type];

        if (!field) {
            return res.status(400).json({
                success: false,
                message: "Type invalide (mainOeuvre | peinture | device)"
            });
        }

        const item = historique[field].find(
            f => f.facture.toString() === factureId
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Facture introuvable dans l’historique"
            });
        }

        item.visibilite = !item.visibilite;

        await historique.save();

        res.status(200).json({
            success: true,
            message: "Visibilité modifiée avec succès",
            data: {
                historiqueId,
                factureId,
                type,
                visibilite: item.visibilite
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ======================================================
// GET VISIBLE FACTURES
// ======================================================
exports.getVisibleFactures = async (req, res) => {
    try {
        const histories = await HistoriqueFactures.find()
            .populate('facturesMainOeuvre.facture')
            .populate('facturesPeinture.facture')
            .populate('facturesDevice.facture');

        const result = histories.map(history => {
            const h = history.toObject();

            return {
                ...h,
                facturesMainOeuvre: h.facturesMainOeuvre.filter(f => f.visibilite === true),
                facturesPeinture: h.facturesPeinture.filter(f => f.visibilite === true),
                facturesDevice: h.facturesDevice.filter(f => f.visibilite === true)
            };
        });

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ======================================================
// GET HIDDEN FACTURES
// ======================================================
exports.getHiddenFactures = async (req, res) => {
    try {
        const histories = await HistoriqueFactures.find()
            .populate('facturesMainOeuvre.facture')
            .populate('facturesPeinture.facture')
            .populate('facturesDevice.facture');

        const result = histories
            .map(history => {
                const h = history.toObject();

                return {
                    ...h,
                    facturesMainOeuvre: h.facturesMainOeuvre.filter(f => f.visibilite === false),
                    facturesPeinture: h.facturesPeinture.filter(f => f.visibilite === false),
                    facturesDevice: h.facturesDevice.filter(f => f.visibilite === false)
                };
            })
            .filter(h =>
                h.facturesMainOeuvre.length > 0 ||
                h.facturesPeinture.length > 0 ||
                h.facturesDevice.length > 0
            );

        res.status(200).json({
            success: true,
            count: result.length,
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};