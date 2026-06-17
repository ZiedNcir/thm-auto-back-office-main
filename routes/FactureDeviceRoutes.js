const express = require('express');
const router = express.Router();

const factureCtrl = require('../controllers/FactureDeviceController');

router.post('/', factureCtrl.createDevice);
router.get('/', factureCtrl.getAllDevices);
router.get('/:id', factureCtrl.getOneDevice);

router.put('/:id/main', factureCtrl.updateMainOeuvre);
router.put('/:id/peinture', factureCtrl.updatePeinture);

router.delete('/:id', factureCtrl.deleteDevice);
router.delete('/:id/main', factureCtrl.deleteMainOeuvre);
router.delete('/:id/peinture', factureCtrl.deletePeinture);

module.exports = router; 