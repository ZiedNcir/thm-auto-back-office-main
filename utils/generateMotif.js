const Device = require('../models/facturesDevice');

const generateMotif = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}${month}`;
    
    try {
        // Find the latest invoice for the current year-month
        const latestInvoice = await Device.findOne({
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

module.exports = generateMotif;