const express = require('express');
const router = express.Router();
const { verifySmtpConnection, sendTestEmail } = require('../config/email');

// Маршрут для отладки сессии
router.get('/debug-session', (req, res) => {
    res.json({
        session: req.session,
        user: req.session.user,
        hasRole: req.session.user ? 'role' in req.session.user : false,
        role: req.session.user ? req.session.user.role : 'no user'
    });
});

// Маршрут для проверки пользователя в базе данных
router.get('/debug-user/:email', async (req, res) => {
    const { User } = require('../models');
    try {
        const user = await User.findOne({ where: { email: req.params.email } });
        if (user) {
            res.json({
                found: true,
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                passwordHash: user.password.substring(0, 20) + '...'
            });
        } else {
            res.json({ found: false });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/debug-email-config', async (req, res) => {
    const result = await verifySmtpConnection();

    if (!result.ok) {
        return res.status(500).json(result);
    }

    res.json(result);
});

router.get('/debug-send-email', async (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.status(400).json({ error: 'Query parameter "email" is required' });
    }

    try {
        const verifyResult = await verifySmtpConnection();

        if (!verifyResult.ok) {
            return res.status(500).json(verifyResult);
        }

        const result = await sendTestEmail(email);
        res.json({ ok: true, ...result });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

module.exports = router;
