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

        // Enforce the intended lifecycle (System Design, State Diagram page):
        // status only ever moves forward through Open -> In Progress -> Resolved.
        // Reopening a resolved bug is out of scope (Requirements CL-6, BT-10 cut),
        // so a backward move is rejected server-side rather than silently allowed.
        const currentIndex = Bug.STATUSES.indexOf(bug.status);
        const newIndex = Bug.STATUSES.indexOf(status);

        if (newIndex < currentIndex) {
            req.flash(`Cannot move a bug from "${bug.status}" back to "${status}".`);
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
