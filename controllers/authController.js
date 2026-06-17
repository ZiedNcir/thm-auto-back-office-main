const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};
 
exports.register = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const user = await User.create({ username, password, role });
        
        const token = createToken(user._id);

        // Set the cookie
        res.cookie('token', token, { httpOnly: true, maxAge: 86400000 });

        // Return token, role, and user info in JSON
        res.status(201).json({ 
            message: "User registered", 
            token: token, // <--- Token is now here
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.code === 11000 ? "Username taken" : err.message });
    }
};
exports.adminAddSousAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Check if user exists
        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).json({ error: "User already exists" });

        // 2. Create new sous-admin
        const newSousAdmin = await User.create({
            username,
            password,
            role: 'sous-admin' 
        });

        // 3. Generate a token for the new user (Optional, but useful if you want to log them in immediately)
        const token = createToken(newSousAdmin._id);

        // 4. Set the cookie
        res.cookie('token', token, { 
            httpOnly: true, 
            maxAge: 86400000, // 24 hours
            secure: process.env.NODE_ENV === 'production' 
        });

        // 5. Return complete JSON including token, role, and cookie status
        res.status(201).json({
            message: "Sous-admin created successfully",
            token: token, // Returning token in JSON as requested
            user: {
                id: newSousAdmin._id,
                username: newSousAdmin.username,
                role: newSousAdmin.role
            },
            cookieSet: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = createToken(user._id);
        res.cookie('token', token, { httpOnly: true, maxAge: 86400000 });

        res.status(200).json({ 
            message: "Logged in successfully",
            token: token, // <--- Token is now here
            role: user.role 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: true, // Set to true if using HTTPS
        sameSite: 'None' 
    });

    res.status(200).json({
        message_en: "Logged out successfully.",
        message_fr: "Déconnexion réussie."
    });
};

exports.getAllUsers = async (req, res) => {
try {
        // Find only users where role is 'sous-admin'
        // .select('-password') ensures we don't leak hashes
        const sousAdmins = await User.find({ role: 'sous-admin' }).select('-password');
        
        res.status(200).json({
            count: sousAdmins.length,
            success: true,
            data: sousAdmins
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch sous-admins" });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        // Find user by ID and exclude the password field
        const user = await User.findById(id).select();

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(user);
    } catch (err) {
        // If the ID format is wrong (e.g., too short), Mongoose throws a CastError
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ error: "Invalid User ID format" });
        }
        res.status(500).json({ error: "Server error" });
    }
};
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password } = req.body;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message_en: "User not found.",
                message_fr: "Utilisateur non trouvé."
            });
        }

        // On ne met à jour le username que s'il est différent du nom actuel
        if (username && username !== user.username) {
            user.username = username;
        }

        // On met à jour le mot de passe s'il est fourni
        if (password) {
            user.password = password;
        }

        // Si rien n'a été modifié, on peut répondre directement sans sauvegarder
        if (!user.isModified()) {
            return res.status(200).json({
                message_en: "No changes detected.",
                message_fr: "Aucune modification détectée."
            });
        }

        await user.save();

        res.status(200).json({
            message_en: "Update successful.",
            message_fr: "Mise à jour réussie.",
            user: { id: user._id, username: user.username }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message_en: "Username already exists.",
                message_fr: "Le nom d'utilisateur existe déjà."
            });
        }
        res.status(500).json({
            message_en: "Error during update.",
            message_fr: "Erreur lors de la mise à jour.",
            error: error.message
        });
    }
};


exports.deleteUserAny = async (req, res) => {
    try {
        const { id } = req.params;

        // Find and delete in one step
        const deletedUser = await User.findByIdAndDelete(id);

        // If no user was found with that ID
        if (!deletedUser) {
            return res.status(404).json({
                message_en: "User not found. Nothing to delete.",
                message_fr: "Utilisateur non trouvé. Rien à supprimer."
            });
        }

        // Success response
        res.status(200).json({
            message_en: "User deleted successfully.",
            message_fr: "Utilisateur supprimé avec succès.",
            deletedUser: {
                id: deletedUser._id,
                username: deletedUser.username
            }
        });

    } catch (err) {
        res.status(500).json({
            message_en: "An error occurred during deletion.",
            message_fr: "Une erreur est survenue lors de la suppression.",
            error: err.message
        });
    }
};
exports.changePasswordByUsername = async (req, res) => {
    try {
        const { username, newPassword, confirmPassword } = req.body;

        // Vérifier champs
        if (!username || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Tous les champs sont obligatoires."
            });
        }

        // Vérifier password match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Les mots de passe ne correspondent pas."
            });
        }

        // Vérifier user
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Nom d'utilisateur introuvable."
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Mot de passe modifié avec succès."
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Erreur serveur.",
            error: error.message
        });
    }
};