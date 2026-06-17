const Device = require('../models/facturesDevice');

const generateMotif = async () => {
    const year = new Date().getFullYear();

    const lastDevice = await Device.findOne({
        motif: new RegExp(`^DEV-${year}`)
    }).sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastDevice && lastDevice.motif) {
        const parts = lastDevice.motif.split('-');
        const lastNum = parseInt(parts[2], 10);

        if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1;
        }
    }

    return `DEV-${year}-${String(nextNumber).padStart(4, '0')}`;
};

module.exports = generateMotif;