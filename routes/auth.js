const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');

// GET /login
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login', { title: 'Login' });
});

// POST /login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const user = rows[0];

        if (!user.is_active) {
            req.flash('error', 'Your account has been disabled. Contact admin.');
            return res.redirect('/login');
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
        req.flash('success', `Welcome back, ${user.name}!`);
        return res.redirect('/');

    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong. Try again.');
        res.redirect('/login');
    }
});

// GET /register
router.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('register', { title: 'Register' });
});

// POST /register
router.post('/register', async (req, res) => {
    const { name, email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
        req.flash('error', 'Passwords do not match.');
        return res.redirect('/register');
    }

    if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters.');
        return res.redirect('/register');
    }

    try {
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            req.flash('error', 'Email already registered.');
            return res.redirect('/register');
        }

        const hash = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name.trim(), email.trim(), hash, 'voter']
        );

        req.flash('success', 'Registration successful! Please login.');
        res.redirect('/login');

    } catch (err) {
        console.error(err);
        req.flash('error', 'Registration failed. Try again.');
        res.redirect('/register');
    }
});

// GET /logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;
