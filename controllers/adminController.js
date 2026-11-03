const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const Tracking = require("../models/Tracking");
const jwt = require("jsonwebtoken");

// Create JWT token with role
const createToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured. Set it in your .env file.");
  }
  return jwt.sign(
    {
      id: user._id,
      role: user.role || "admin",
      email: user.email,
      fullName: user.fullName,
    },
    secret,
    { expiresIn: "7d" }
  );
};

// Middleware to verify JWT token
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ status: "error", msg: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    req.user = decoded;
    req.userRole = decoded.role || "admin";
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ status: "error", msg: "Session expired. Please log in again." });
    }
    return res.status(401).json({ status: "error", msg: "Invalid token." });
  }
};

// Middleware to require Admin role specifically
exports.requireAdmin = (req, res, next) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ status: "error", msg: "Forbidden: Admin privileges required" });
  }
  next();
};

// Admin / Superadmin Initial Signup
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

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await Admin.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ status: "error", msg: "An account with this email already exists" });
    }

    const admin = new Admin({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
      role: "admin",
      status: "active",
    });

    await admin.save();

    const token = createToken(admin);

    res.status(201).json({
      status: "success",
      msg: "Admin account created successfully",
      user: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
      },
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

// Unified Login controller (Admin & Staff)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ status: "error", msg: "Email is required" });
    }
    if (!password) {
      return res.status(400).json({ status: "error", msg: "Password is required" });
    }

    const user = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ status: "error", msg: "Invalid email or password" });
    }

    // Check if account is inactive
    if (user.status === "inactive") {
      return res.status(403).json({
        status: "error",
        msg: "Your account has been deactivated. Please contact the administrator.",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ status: "error", msg: "Invalid email or password" });
    }

    // Update lastLogin without retriggering pre-save password hash
    await Admin.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const role = user.role || "admin";
    const token = createToken({ ...user.toObject(), role });

    res.status(200).json({
      status: "success",
      msg: "Login successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: role,
        phone: user.phone || "",
      },
      token,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ status: "error", msg: "Internal server error. Please try again." });
  }
};

// Current authenticated user profile
exports.getMe = async (req, res) => {
  try {
    const user = await Admin.findById(req.adminId).select("-password");
    if (!user) {
      return res.status(404).json({ status: "error", msg: "User not found" });
    }
    res.json({ status: "success", user });
  } catch (err) {
    console.error("Get Me Error:", err);
    res.status(500).json({ status: "error", msg: "Server error" });
  }
};

// ----------------------------------------------------
// STAFF MANAGEMENT (Admin Only)
// ----------------------------------------------------

// Admin creates a new staff member
exports.createStaff = async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ status: "error", msg: "Staff full name is required" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ status: "error", msg: "Email address is required" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ status: "error", msg: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await Admin.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ status: "error", msg: "A user with this email already exists" });
    }

    const staff = new Admin({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
      role: "staff",
      status: "active",
      phone: phone ? phone.trim() : "",
      createdBy: req.adminId,
    });

    await staff.save();

    res.status(201).json({
      status: "success",
      msg: `Staff account for ${staff.fullName} created successfully`,
      staff: {
        id: staff._id,
        fullName: staff.fullName,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        status: staff.status,
        createdAt: staff.createdAt,
      },
    });
  } catch (err) {
    console.error("Create Staff Error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ status: "error", msg: "A user with this email already exists" });
    }
    res.status(500).json({ status: "error", msg: "Failed to create staff account" });
  }
};

// Admin gets list of all staff members with order counts
exports.getStaffList = async (req, res) => {
  try {
    const staffMembers = await Admin.find({ role: "staff" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    // Attach order counts for each staff member
    const staffWithMetrics = await Promise.all(
      staffMembers.map(async (member) => {
        const orderCount = await Tracking.countDocuments({ createdBy: member._id });
        return {
          ...member,
          id: member._id,
          orderCount,
        };
      })
    );

    res.json({
      status: "success",
      count: staffWithMetrics.length,
      staff: staffWithMetrics,
    });
  } catch (err) {
    console.error("Get Staff List Error:", err);
    res.status(500).json({ status: "error", msg: "Failed to load staff list" });
  }
};

// Admin updates staff status or details
exports.updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { fullName, phone, status, password } = req.body;

    const staff = await Admin.findOne({ _id: staffId, role: "staff" });
    if (!staff) {
      return res.status(404).json({ status: "error", msg: "Staff member not found" });
    }

    if (fullName) staff.fullName = fullName.trim();
    if (phone !== undefined) staff.phone = phone.trim();
    if (status && ["active", "inactive"].includes(status)) staff.status = status;
    if (password && password.length >= 6) {
      staff.password = password; // Will be hashed by pre-save
    }

    await staff.save();

    res.json({
      status: "success",
      msg: "Staff updated successfully",
      staff: {
        id: staff._id,
        fullName: staff.fullName,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        status: staff.status,
      },
    });
  } catch (err) {
    console.error("Update Staff Error:", err);
    res.status(500).json({ status: "error", msg: "Failed to update staff" });
  }
};

// Admin deletes a staff member
exports.deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await Admin.findOneAndDelete({ _id: staffId, role: "staff" });
    if (!staff) {
      return res.status(404).json({ status: "error", msg: "Staff member not found" });
    }

    res.json({
      status: "success",
      msg: `Staff member "${staff.fullName}" was removed successfully.`,
    });
  } catch (err) {
    console.error("Delete Staff Error:", err);
    res.status(500).json({ status: "error", msg: "Failed to delete staff member" });
  }
};

// Admin dashboard summary statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalShipments, totalStaff, statusBreakdown, recentShipments] = await Promise.all([
      Tracking.countDocuments(),
      Admin.countDocuments({ role: "staff" }),
      Tracking.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Tracking.find().sort({ lastUpdated: -1 }).limit(5),
    ]);

    const statusCounts = {};
    statusBreakdown.forEach((item) => {
      statusCounts[item._id] = item.count;
    });

    res.json({
      status: "success",
      stats: {
        totalShipments,
        totalStaff,
        statusCounts,
        recentShipments,
      },
    });
  } catch (err) {
    console.error("Get Dashboard Stats Error:", err);
    res.status(500).json({ status: "error", msg: "Failed to fetch dashboard statistics" });
  }
};
