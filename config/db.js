const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB || process.env.MONGODB_URI;
        if (!uri) {
            throw new Error("MongoDB URI is not set in environment variables");
        }
        await mongoose.connect(uri);
        console.log("MongoDB Connected Successfully");
    } catch (err) {
        console.error("MongoDB Connection Error:", err.message);
        throw err;
    }
};

module.exports = connectDB;
