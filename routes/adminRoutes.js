const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken, requireAdmin } = adminController;

// Public auth routes
router.post("/signup", adminController.signup);
router.post("/login",  adminController.login);

// Protected routes (Admin & Staff)
router.get("/me", verifyToken, adminController.getMe);

// Admin-only management routes
router.get("/stats",            verifyToken, requireAdmin, adminController.getDashboardStats);
router.post("/staff",           verifyToken, requireAdmin, adminController.createStaff);
router.get("/staff",            verifyToken, requireAdmin, adminController.getStaffList);
router.put("/staff/:staffId",   verifyToken, requireAdmin, adminController.updateStaff);
router.delete("/staff/:staffId",verifyToken, requireAdmin, adminController.deleteStaff);

module.exports = router;
