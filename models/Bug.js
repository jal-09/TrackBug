const mongoose = require("mongoose");

const CATEGORIES = ["UI", "Functionality", "Performance", "Security", "Other"];
const PRIORITIES = ["Low", "Medium", "High"];
const STATUSES = ["Open", "In Progress", "Resolved"];

const bugSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            enum: CATEGORIES,
            required: true,
        },
        priority: {
            type: String,
            enum: PRIORITIES,
            required: true,
        },
        status: {
            type: String,
            enum: STATUSES,
            default: "Open",
        },
        reporterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

bugSchema.statics.CATEGORIES = CATEGORIES;
bugSchema.statics.PRIORITIES = PRIORITIES;
bugSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model("Bug", bugSchema);
