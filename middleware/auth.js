// Redirect to login if not logged in
function isLoggedIn(req, res, next) {
    if (req.session && req.session.user) return next();
    req.flash('error', 'Please login to continue.');
    res.redirect('/login');
}

// Only allow admins
function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') return next();
    res.status(403).render('error', { message: 'Access denied. Admins only.' });
}

// Only allow voters
function isVoter(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'voter') return next();
    res.status(403).render('error', { message: 'Access denied. Voters only.' });
}

module.exports = { isLoggedIn, isAdmin, isVoter };
