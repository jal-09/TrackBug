const express = require("express");
const router = express.Router();
const Bug = require("../models/Bug");
const { requireLogin, blockAdminFromUserPages } = require("../middleware/auth");

// User dashboard — only bugs this user reported
router.get("/dashboard", requireLogin, blockAdminFromUserPages, async (req, res) => {
    try {
        const bugs = await Bug.find({ reporterId: req.session.userId }).sort({ created_at: -1 });
        res.render("dashboard", { bugs });
    } catch (error) {
        console.error(error);
        req.flash("Could not load your dashboard.");
        res.redirect("/login");
    }
});

// GET report bug form
router.get("/report-bug", requireLogin, blockAdminFromUserPages, (req, res) => {
    res.render("report-bug", {
        CATEGORIES: Bug.CATEGORIES,
        PRIORITIES: Bug.PRIORITIES,
    });
});

// POST report bug
router.post("/report-bug", requireLogin, blockAdminFromUserPages, async (req, res) => {
    try {
        const title = (req.body.title || "").trim();
        const description = (req.body.description || "").trim();
        const category = (req.body.category || "").trim();
        const priority = (req.body.priority || "").trim();

        if (!title || !description) {
            req.flash("Title and description are required.");
            return res.redirect("/report-bug");
        }

        if (title.length < 3) {
            req.flash("Bug title must be at least 3 characters.");
            return res.redirect("/report-bug");
        }

        if (!Bug.CATEGORIES.includes(category)) {
            req.flash("Please select a valid category.");
            return res.redirect("/report-bug");
        }

        if (!Bug.PRIORITIES.includes(priority)) {
            req.flash("Please select a valid priority.");
            return res.redirect("/report-bug");
        }

        await Bug.create({
            title,
            description,
            category,
            priority,
            status: "Open",
            reporterId: req.session.userId,
        });

        req.flash("Bug reported successfully.");
        res.redirect("/dashboard");
    } catch (error) {
        console.error(error);
        req.flash("Could not submit bug. Please try again.");
        res.redirect("/report-bug");
    }
});

module.exports = router;
