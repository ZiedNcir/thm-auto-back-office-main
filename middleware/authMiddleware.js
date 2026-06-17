const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protectAndAdmin = async (req, res, next) => {
    try {
        // 1. Get token from cookies
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: "Not authorized, no token" });
        }

        // 2. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Find user and check role
        const currentUser = await User.findById(decoded.id);
        
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({ error: "Access denied: Admins only" });
        }

        // Add user info to request and move to next step
        req.user = currentUser;
        next();
    } catch (err) {
        res.status(401).json({ error: "Token failed or expired" });
    }
};