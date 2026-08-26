const express = require("express");
const router = express.Router();
const Bug = require("../models/Bug");
const { requireLogin, requireAdmin } = require("../middleware/auth");

router.use(requireLogin, requireAdmin);

// Admin dashboard — every bug, with reporter + assignee names
router.get("/", async (req, res) => {
    try {
        const bugs = await Bug.find()
            .sort({ created_at: -1 })
            .populate("reporterId", "name")
            .populate("assignedTo", "name");

        res.render("admin-dashboard", { bugs });
    } catch (error) {
        console.error(error);
        req.flash("Could not load admin dashboard.");
        res.redirect("/login");
    }
});

// GET manage a single bug
router.get("/bug/:id", async (req, res) => {
    try {
        const bug = await Bug.findById(req.params.id).populate("reporterId", "name");

        if (!bug) {
            req.flash("Bug not found.");
            return res.redirect("/admin");
        }

        res.render("manage-bug", {
            bug,
            PRIORITIES: Bug.PRIORITIES,
            STATUSES: Bug.STATUSES,
        });
    } catch (error) {
        console.error(error);
        req.flash("Bug not found.");
        res.redirect("/admin");
    }
});

// POST update a bug — priority/status change, and the editing admin becomes the assignee
router.post("/bug/:id", async (req, res) => {
    try {
        const bug = await Bug.findById(req.params.id);

        if (!bug) {
            req.flash("Bug not found.");
            return res.redirect("/admin");
        }

        const priority = (req.body.priority || "").trim();
        const status = (req.body.status || "").trim();

        if (!Bug.PRIORITIES.includes(priority)) {
            req.flash("Invalid priority.");
            return res.redirect(`/admin/bug/${req.params.id}`);
        }

        if (!Bug.STATUSES.includes(status)) {
            req.flash("Invalid status.");
            return res.redirect(`/admin/bug/${req.params.id}`);
        }

        bug.priority = priority;
        bug.status = status;
        bug.assignedTo = req.session.userId;
        await bug.save();

        req.flash("Bug updated successfully.");
        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        req.flash("Bug not found.");
        res.redirect("/admin");
    }
});

module.exports = router;
