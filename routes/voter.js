const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { isLoggedIn, isVoter } = require('../middleware/auth');

// GET /voter/elections - list active elections
router.get('/elections', isLoggedIn, isVoter, async (req, res) => {
    try {
        const [elections] = await db.query(
            `SELECT e.*,
                (SELECT COUNT(*) FROM votes v WHERE v.election_id = e.id) AS total_votes,
                (SELECT COUNT(*) FROM votes v WHERE v.election_id = e.id AND v.voter_id = ?) AS has_voted
             FROM elections e
             ORDER BY e.status ASC, e.created_at DESC`,
            [req.session.user.id]
        );
        res.render('voter/elections', { title: 'Elections', elections });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Could not load elections.' });
    }
});

// GET /voter/election/:id - view election & candidates
router.get('/election/:id', isLoggedIn, isVoter, async (req, res) => {
    const electionId = req.params.id;
    try {
        const [[election]] = await db.query('SELECT * FROM elections WHERE id = ?', [electionId]);
        if (!election) return res.render('error', { message: 'Election not found.' });

        const [candidates] = await db.query(
            'SELECT * FROM candidates WHERE election_id = ?', [electionId]
        );

        const [[voteRow]] = await db.query(
            'SELECT candidate_id FROM votes WHERE voter_id = ? AND election_id = ?',
            [req.session.user.id, electionId]
        );

        res.render('voter/election-detail', {
            title: election.title,
            election,
            candidates,
            voted: voteRow || null
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Could not load election.' });
    }
});

// GET /voter/candidate/:id - candidate profile page
router.get('/candidate/:id', isLoggedIn, isVoter, async (req, res) => {
    try {
        const [[candidate]] = await db.query(
            `SELECT c.*, e.title AS election_title, e.status AS election_status, e.id AS election_id
             FROM candidates c
             JOIN elections e ON e.id = c.election_id
             WHERE c.id = ?`,
            [req.params.id]
        );
        if (!candidate) return res.render('error', { message: 'Candidate not found.' });

        // Has this voter voted in this election?
        const [[voteRow]] = await db.query(
            'SELECT candidate_id FROM votes WHERE voter_id = ? AND election_id = ?',
            [req.session.user.id, candidate.election_id]
        );

        // Vote count for this candidate (only show if election ended)
        let voteCount = null;
        if (candidate.election_status === 'ended') {
            const [[vc]] = await db.query(
                'SELECT COUNT(*) AS cnt FROM votes WHERE candidate_id = ?', [req.params.id]
            );
            voteCount = vc.cnt;
        }

        res.render('voter/candidate-profile', {
            title: candidate.name,
            candidate,
            voted: voteRow || null,
            voteCount
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Could not load candidate profile.' });
    }
});

// POST /voter/vote - cast a vote
router.post('/vote', isLoggedIn, isVoter, async (req, res) => {
    const { election_id, candidate_id } = req.body;
    const voter_id = req.session.user.id;

    try {
        // Check election is active
        const [[election]] = await db.query(
            'SELECT * FROM elections WHERE id = ? AND status = "active"', [election_id]
        );
        if (!election) {
            req.flash('error', 'This election is not currently active.');
            return res.redirect('/voter/elections');
        }

        // Check voter hasn't already voted
        const [[existing]] = await db.query(
            'SELECT id FROM votes WHERE voter_id = ? AND election_id = ?', [voter_id, election_id]
        );
        if (existing) {
            req.flash('error', 'You have already voted in this election.');
            return res.redirect(`/voter/election/${election_id}`);
        }

        // Check candidate belongs to this election
        const [[candidate]] = await db.query(
            'SELECT * FROM candidates WHERE id = ? AND election_id = ?', [candidate_id, election_id]
        );
        if (!candidate) {
            req.flash('error', 'Invalid candidate.');
            return res.redirect(`/voter/election/${election_id}`);
        }

        // Cast the vote
        await db.query(
            'INSERT INTO votes (voter_id, election_id, candidate_id) VALUES (?, ?, ?)',
            [voter_id, election_id, candidate_id]
        );

        req.flash('success', `Vote cast for ${candidate.name}!`);
        res.redirect(`/voter/election/${election_id}`);

    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            req.flash('error', 'You have already voted in this election.');
            return res.redirect(`/voter/election/${election_id}`);
        }
        console.error(err);
        req.flash('error', 'Could not cast vote. Try again.');
        res.redirect(`/voter/election/${election_id}`);
    }
});

module.exports = router;
