const mongoose = require('mongoose');
const Device = require('../models/facturesDevice');
const User = require('../models/User');
const generateMotif = require('../utils/generateMotif');
exports.createDevice = async (req, res) => {
    try {
        const { nomAdmin } = req.body;

        if (!nomAdmin) {
            return res.status(400).json({
                message: "nomAdmin obligatoire"
            });
        }

        // 🔥 génération automatique
        const motif = await generateMotif();

        const device = new Device({
            ...req.body,
            motif
        });

        await device.save();

        res.status(201).json(device);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};
exports.getAllDevices = async (req, res) => {
    try {
        const devices = await Device.find();
        res.status(200).json(devices);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};
exports.getOneDevice = async (req, res) => {
    try {
        const device = await Device.findById(req.params.id);

        if (!device) {
            return res.status(404).json({
                message: "Device introuvable"
            });
        }

        res.status(200).json(device);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};
exports.updateMainOeuvre = async (req, res) => {
    try {

        const totalMainOeuvre = Number(req.body.totalMainOeuvre || 0);

        const device = await Device.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    nomAdmin: req.body.nomAdmin,

                    client: req.body.client,

                    dateIntervention: req.body.dateIntervention,

                    factureMainOeuvre: req.body.factureMainOeuvre,

                    totalMainOeuvre,
                    totalGeneral: totalMainOeuvre
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!device) {
            return res.status(404).json({
                message: "Device introuvable"
            });
        }

        res.status(200).json(device);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};
exports.updatePeinture = async (req, res) => {
  try {
    const facturePeinture = (req.body.facturePeinture || []).map((item) => ({
      nom: item.nom,
      quantite: Number(item.quantite || 0),
      prixUnitaire: Number(item.prixUnitaire || 0),
      total: Number(item.quantite || 0) * Number(item.prixUnitaire || 0),
    }));

    const totalPeinture = facturePeinture.reduce(
      (sum, item) => sum + item.total,
      0
    );

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          nomAdmin: req.body.nomAdmin,
          client: req.body.client,

          dateIntervention: req.body.dateIntervention,
          heureFacture: req.body.heureFacture,

          facturePeinture,
          totalPeinture,
          totalGeneral: totalPeinture,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!device) {
      return res.status(404).json({
        message: "Device introuvable",
      });
    }

    res.status(200).json(device);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
exports.deleteDevice = async (req, res) => {
    try {
        const device = await Device.findByIdAndDelete(req.params.id);

        if (!device) {
            return res.status(404).json({
                message: "Device introuvable"
            });
        }

        res.status(200).json({
            message: "Device supprimé avec succès"
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};
exports.deleteMainOeuvre = async (req, res) => {
    try {
        const device = await Device.findById(req.params.id);

        if (!device) {
            return res.status(404).json({
                message: "Device introuvable"
            });
        }

        device.factureMainOeuvre = {
            changement: [],
            dressage: [],
            reparation: []
        };

        device.totalMainOeuvre = 0;

        await device.save();

        res.status(200).json(device);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};
exports.deletePeinture = async (req, res) => {
    try {
        const device = await Device.findById(req.params.id);

        if (!device) {
            return res.status(404).json({
                message: "Device introuvable"
            });
        }

        device.facturePeinture = [];
        device.totalPeinture = 0;

        await device.save();

        res.status(200).json(device);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};