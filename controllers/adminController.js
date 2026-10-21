const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");

// Create JWT token
const createToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured. Set it in your .env file.");
  }
  return jwt.sign({ id }, secret, { expiresIn: "7d" });
};

// Middleware to verify admin token
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ status: "error", msg: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ status: "error", msg: "Session expired. Please log in again." });
    }
    return res.status(401).json({ status: "error", msg: "Invalid token." });
  }
};

// Signup controller
exports.signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ status: "error", msg: "Full name is required" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ status: "error", msg: "Email is required" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ status: "error", msg: "Password must be at least 6 characters" });
    }

    // Check if admin already exists
    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ status: "error", msg: "An account with this email already exists" });
    }

    // Create admin — password will be hashed by the pre-save hook in Admin model
    const admin = new Admin({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
    });

    await admin.save();

    const token = createToken(admin._id);

    res.status(201).json({
      status: "success",
      msg: "Account created successfully",
      admin: { id: admin._id, fullName: admin.fullName, email: admin.email },
      token,
    });
  } catch (err) {
    console.error("Signup Error:", err);

    if (err.code === 11000) {
      return res.status(409).json({ status: "error", msg: "An account with this email already exists" });
    }

    res.status(500).json({ status: "error", msg: "Internal server error. Please try again." });
  }
};

// Login controller
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ status: "error", msg: "Email is required" });
    }
    if (!password) {
      return res.status(400).json({ status: "error", msg: "Password is required" });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      // Generic message to not reveal whether email exists
      return res.status(401).json({ status: "error", msg: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ status: "error", msg: "Invalid email or password" });
    }

    const token = createToken(admin._id);

    res.status(200).json({
      status: "success",
      msg: "Login successful",
      admin: { id: admin._id, fullName: admin.fullName, email: admin.email },
      token,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ status: "error", msg: "Internal server error. Please try again." });
  }
};
