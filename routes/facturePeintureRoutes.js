const express = require('express');
const router = express.Router();
const factureController = require('../controllers/facturePeintureController');

router.post('/create', factureController.createFacturePeinture);
router.get('/', factureController.getAllFacturesPeinture);
router.get('/:id', factureController.getFacturePeintureById);
router.put('/:id', factureController.updateFacturePeinture);
router.delete('/:id', factureController.deleteFacturePeinture);

module.exports = router;