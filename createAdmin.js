// Run once with: node createAdmin.js
// Mirrors the old create_admin.py — same default admin account and password.

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const name = "BugTrack Admin";
        const email = "admin@bugtrack.com";
        const password = "admin123";

        const existing = await User.findOne({ email });

        if (existing) {
            console.log("Admin account already exists.");
            return process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            name,
            email,
            password: hashedPassword,
            role: "admin",
        });

        console.log("Admin account created successfully.");
        console.log(`Log in with: ${email} / ${password}`);

        process.exit(0);
    } catch (error) {
        console.error("Failed to create admin:", error.message);
        process.exit(1);
    }
}

createAdmin();
