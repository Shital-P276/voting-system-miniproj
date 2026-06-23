const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { isLoggedIn, isAdmin } = require('../middleware/auth');

// ===== ELECTIONS =====

// GET /admin/elections
router.get('/elections', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const [elections] = await db.query(
            `SELECT e.*,
                (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) AS candidate_count,
                (SELECT COUNT(*) FROM votes v WHERE v.election_id = e.id) AS total_votes
             FROM elections e ORDER BY e.created_at DESC`
        );
        res.render('admin/elections', { title: 'Manage Elections', elections });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Could not load elections.' });
    }
});

// GET /admin/elections/new
router.get('/elections/new', isLoggedIn, isAdmin, (req, res) => {
    res.render('admin/election-form', { title: 'Create Election', election: null });
});

// POST /admin/elections/new
router.post('/elections/new', isLoggedIn, isAdmin, async (req, res) => {
    const { title, description } = req.body;
    try {
        await db.query(
            'INSERT INTO elections (title, description, status, created_by) VALUES (?, ?, "upcoming", ?)',
            [title.trim(), description.trim(), req.session.user.id]
        );
        req.flash('success', 'Election created.');
        res.redirect('/admin/elections');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Could not create election.');
        res.redirect('/admin/elections/new');
    }
});

// GET /admin/elections/:id/edit
router.get('/elections/:id/edit', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const [[election]] = await db.query('SELECT * FROM elections WHERE id = ?', [req.params.id]);
        if (!election) return res.render('error', { message: 'Election not found.' });
        res.render('admin/election-form', { title: 'Edit Election', election });
    } catch (err) {
        res.render('error', { message: 'Could not load election.' });
    }
});

// POST /admin/elections/:id/edit
router.post('/elections/:id/edit', isLoggedIn, isAdmin, async (req, res) => {
    const { title, description } = req.body;
    try {
        await db.query(
            'UPDATE elections SET title = ?, description = ? WHERE id = ?',
            [title.trim(), description.trim(), req.params.id]
        );
        req.flash('success', 'Election updated.');
        res.redirect('/admin/elections');
    } catch (err) {
        req.flash('error', 'Could not update election.');
        res.redirect(`/admin/elections/${req.params.id}/edit`);
    }
});

// POST /admin/elections/:id/toggle — start or end election
router.post('/elections/:id/toggle', isLoggedIn, isAdmin, async (req, res) => {
    const { action } = req.body; // 'start' or 'end'
    try {
        if (action === 'start') {
            await db.query(
                'UPDATE elections SET status = "active", start_time = NOW() WHERE id = ?',
                [req.params.id]
            );
            req.flash('success', 'Election started.');
        } else if (action === 'end') {
            await db.query(
                'UPDATE elections SET status = "ended", end_time = NOW() WHERE id = ?',
                [req.params.id]
            );
            req.flash('success', 'Election ended.');
        }
        res.redirect('/admin/elections');
    } catch (err) {
        req.flash('error', 'Could not update election status.');
        res.redirect('/admin/elections');
    }
});

// POST /admin/elections/:id/delete
router.post('/elections/:id/delete', isLoggedIn, isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM elections WHERE id = ?', [req.params.id]);
        req.flash('success', 'Election deleted.');
        res.redirect('/admin/elections');
    } catch (err) {
        req.flash('error', 'Could not delete election.');
        res.redirect('/admin/elections');
    }
});

// ===== CANDIDATES =====

// GET /admin/elections/:id/candidates
router.get('/elections/:id/candidates', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const [[election]] = await db.query('SELECT * FROM elections WHERE id = ?', [req.params.id]);
        if (!election) return res.render('error', { message: 'Election not found.' });
        const [candidates] = await db.query(
            'SELECT * FROM candidates WHERE election_id = ? ORDER BY name', [req.params.id]
        );
        res.render('admin/candidates', { title: 'Candidates', election, candidates });
    } catch (err) {
        res.render('error', { message: 'Could not load candidates.' });
    }
});

// POST /admin/elections/:id/candidates/add
router.post('/elections/:id/candidates/add', isLoggedIn, isAdmin, async (req, res) => {
    const { name, party, bio } = req.body;
    try {
        await db.query(
            'INSERT INTO candidates (election_id, name, party, bio) VALUES (?, ?, ?, ?)',
            [req.params.id, name.trim(), party.trim(), bio.trim()]
        );
        req.flash('success', 'Candidate added.');
        res.redirect(`/admin/elections/${req.params.id}/candidates`);
    } catch (err) {
        req.flash('error', 'Could not add candidate.');
        res.redirect(`/admin/elections/${req.params.id}/candidates`);
    }
});

// POST /admin/candidates/:id/delete
router.post('/candidates/:id/delete', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const [[cand]] = await db.query('SELECT election_id FROM candidates WHERE id = ?', [req.params.id]);
        await db.query('DELETE FROM candidates WHERE id = ?', [req.params.id]);
        req.flash('success', 'Candidate removed.');
        res.redirect(`/admin/elections/${cand.election_id}/candidates`);
    } catch (err) {
        req.flash('error', 'Could not remove candidate.');
        res.redirect('/admin/elections');
    }
});

// ===== RESULTS =====

// GET /admin/elections/:id/results
router.get('/elections/:id/results', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const [[election]] = await db.query('SELECT * FROM elections WHERE id = ?', [req.params.id]);
        if (!election) return res.render('error', { message: 'Election not found.' });

        const [results] = await db.query(
            `SELECT c.id, c.name, c.party,
                COUNT(v.id) AS vote_count
             FROM candidates c
             LEFT JOIN votes v ON v.candidate_id = c.id
             WHERE c.election_id = ?
             GROUP BY c.id
             ORDER BY vote_count DESC`,
            [req.params.id]
        );

        const [[{ total_votes }]] = await db.query(
            'SELECT COUNT(*) AS total_votes FROM votes WHERE election_id = ?', [req.params.id]
        );

        res.render('admin/results', { title: 'Results', election, results, total_votes });
    } catch (err) {
        res.render('error', { message: 'Could not load results.' });
    }
});

// ===== LIVE TURNOUT DASHBOARD =====

// GET /admin/dashboard - live turnout dashboard page
router.get('/dashboard', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const [elections] = await db.query(
            `SELECT e.id, e.title, e.status,
                (SELECT COUNT(*) FROM votes v WHERE v.election_id = e.id) AS total_votes,
                (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) AS candidate_count
             FROM elections e ORDER BY e.status = 'active' DESC, e.created_at DESC`
        );
        const [[{ total_users }]] = await db.query(`SELECT COUNT(*) AS total_users FROM users WHERE role = 'voter'`);
        res.render('admin/dashboard', { title: 'Live Dashboard', elections, total_users });
    } catch (err) {
        res.render('error', { message: 'Could not load dashboard.' });
    }
});

// GET /admin/api/turnout - JSON endpoint polled every 5s by dashboard
router.get('/api/turnout', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const [elections] = await db.query(
            `SELECT e.id, e.title, e.status,
                (SELECT COUNT(*) FROM votes v WHERE v.election_id = e.id) AS total_votes,
                (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) AS candidate_count
             FROM elections e WHERE e.status = 'active'`
        );
        const [[{ total_voters }]] = await db.query(`SELECT COUNT(*) AS total_voters FROM users WHERE role = 'voter'`);
        res.json({ elections, total_voters, timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch turnout.' });
    }
});

// ===== STATISTICS + CHARTS =====

// GET /admin/elections/:id/stats
router.get('/elections/:id/stats', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const [[election]] = await db.query('SELECT * FROM elections WHERE id = ?', [req.params.id]);
        if (!election) return res.render('error', { message: 'Election not found.' });

        const [results] = await db.query(
            `SELECT c.name, c.party, COUNT(v.id) AS vote_count
             FROM candidates c
             LEFT JOIN votes v ON v.candidate_id = c.id
             WHERE c.election_id = ?
             GROUP BY c.id ORDER BY vote_count DESC`,
            [req.params.id]
        );

        const [[{ total_votes }]] = await db.query(
            'SELECT COUNT(*) AS total_votes FROM votes WHERE election_id = ?', [req.params.id]
        );

        // Votes over time (grouped by hour)
        const [timeline] = await db.query(
            `SELECT DATE_FORMAT(voted_at, '%Y-%m-%d %H:00') AS hour, COUNT(*) AS count
             FROM votes WHERE election_id = ?
             GROUP BY hour ORDER BY hour ASC`,
            [req.params.id]
        );

        res.render('admin/stats', { title: 'Statistics', election, results, total_votes, timeline });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Could not load stats.' });
    }
});

// ===== VOTERS =====

// GET /admin/voters
router.get('/voters', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const [voters] = await db.query(
            `SELECT u.*, COUNT(v.id) AS votes_cast
             FROM users u
             LEFT JOIN votes v ON v.voter_id = u.id
             WHERE u.role = 'voter'
             GROUP BY u.id
             ORDER BY u.created_at DESC`
        );
        res.render('admin/voters', { title: 'Manage Voters', voters });
    } catch (err) {
        res.render('error', { message: 'Could not load voters.' });
    }
});

// POST /admin/voters/:id/toggle — enable/disable voter
router.post('/voters/:id/toggle', isLoggedIn, isAdmin, async (req, res) => {
    try {
        await db.query(
            'UPDATE users SET is_active = NOT is_active WHERE id = ? AND role = "voter"',
            [req.params.id]
        );
        req.flash('success', 'Voter status updated.');
        res.redirect('/admin/voters');
    } catch (err) {
        req.flash('error', 'Could not update voter.');
        res.redirect('/admin/voters');
    }
});

module.exports = router;
