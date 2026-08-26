const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/User");

// GET Register
router.get("/register", (req, res) => {
    res.render("register");
});

// POST Register
router.post("/register", async (req, res) => {
    try {
        const name = (req.body.name || "").trim();
        const email = (req.body.email || "").trim().toLowerCase();
        const password = req.body.password || "";
        const confirmPassword = req.body.confirm_password || "";

        if (!name || !email || !password || !confirmPassword) {
            req.flash("All fields are required.");
            return res.redirect("/register");
        }

        if (password !== confirmPassword) {
            req.flash("Passwords do not match.");
            return res.redirect("/register");
        }

        if (password.length < 6) {
            req.flash("Password must be at least 6 characters.");
            return res.redirect("/register");
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            req.flash("An account with this email already exists.");
            return res.redirect("/register");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            name,
            email,
            password: hashedPassword,
            role: "user",
        });

        req.flash("Registration successful. Please log in.");
        res.redirect("/login");
    } catch (error) {
        console.error(error);
        req.flash("Something went wrong. Please try again.");
        res.redirect("/register");
    }
});

// GET Login
router.get("/login", (req, res) => {
    if (req.session.userId) {
        return res.redirect(req.session.role === "admin" ? "/admin" : "/dashboard");
    }
    res.render("login");
});

// POST Login
router.post("/login", async (req, res) => {
    try {
        const email = (req.body.email || "").trim().toLowerCase();
        const password = req.body.password || "";

        if (!email || !password) {
            req.flash("Email and password are required.");
            return res.redirect("/login");
        }

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            req.session.userId = user._id.toString();
            req.session.userName = user.name;
            req.session.role = user.role;

            return res.redirect(user.role === "admin" ? "/admin" : "/dashboard");
        }

        req.flash("Invalid email or password.");
        res.redirect("/login");
    } catch (error) {
        console.error(error);
        req.flash("Something went wrong. Please try again.");
        res.redirect("/login");
    }
});

// Logout — clear auth fields but keep the session alive so the flash message survives the redirect
router.get("/logout", (req, res) => {
    req.session.userId = null;
    req.session.userName = null;
    req.session.role = null;
    req.flash("You have been logged out.");
    res.redirect("/login");
});

module.exports = router;
