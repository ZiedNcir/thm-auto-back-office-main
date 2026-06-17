const express = require('express');
const router = express.Router();

const {
    createFacture,
    getAllFactures,
    getFactureById,
    deleteFacture,updateFacture
} = require('../controllers/facturMainOeuvreController');

router.post('/create', createFacture);
router.get('/all', getAllFactures);
router.get('/:id', getFactureById);
router.delete('/:id', deleteFacture);
router.put('/update/:id', updateFacture);
module.exports = router;