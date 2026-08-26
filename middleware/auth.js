function requireLogin(req, res, next) {
    if (!req.session.userId) {
        req.flash("Please log in first.");
        return res.redirect("/login");
    }
    next();
}

// Matches old app.py: admin hitting user-only pages gets silently redirected, no flash.
function blockAdminFromUserPages(req, res, next) {
    if (req.session.role === "admin") {
        return res.redirect("/admin");
    }
    next();
}

function requireAdmin(req, res, next) {
    if (req.session.role !== "admin") {
        req.flash("Administrator access required.");
        return res.redirect("/dashboard");
    }
    next();
}

module.exports = { requireLogin, blockAdminFromUserPages, requireAdmin };
