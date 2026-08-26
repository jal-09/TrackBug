const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const {MongoStore} = require("connect-mongo");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const bugRoutes = require("./routes/bugs");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------
// Middleware
// ---------------------------------

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "bugtrack-secret",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1 day
        },
    })
);

// Flask-style flash messages: req.flash(msg) now shows up once on the NEXT
// request (i.e. after the redirect that usually follows it), then clears.
app.use((req, res, next) => {
    req.flash = (message) => {
        if (!req.session.flashMessages) req.session.flashMessages = [];
        req.session.flashMessages.push(message);
    };

    res.locals.messages = req.session.flashMessages || [];
    req.session.flashMessages = [];

    res.locals.username = req.session.userName || null;
    res.locals.role = req.session.role || null;

    next();
});

// ---------------------------------
// View Engine
// ---------------------------------

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---------------------------------
// Routes
// ---------------------------------

app.get("/", (req, res) => {
    res.render("index");
});

app.use("/", authRoutes);
app.use("/", bugRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
    res.status(404).send("Page not found.");
});

// ---------------------------------
// Start Server
// ---------------------------------

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully.");

        app.listen(PORT, () => {
            console.log(`TrackBug running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("MongoDB connection failed:");
        console.error(error.message);
        process.exit(1);
    }
}

startServer();

module.exports = app;
