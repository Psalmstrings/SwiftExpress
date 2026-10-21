const express = require("express");
const router = express.Router();
const {
  createTracking,
  getTracking,
  updateTracking,
  deleteTracking,
  getAllTrackings,
} = require("../controllers/trackingController.js");
const { verifyToken } = require("../controllers/adminController");

// Public route — anyone can look up a tracking ID
router.get("/:trackingId", getTracking);

// Protected routes — require admin JWT token
router.post("/create",              verifyToken, createTracking);
router.put("/update/:trackingId",   verifyToken, updateTracking);
router.delete("/delete/:trackingId",verifyToken, deleteTracking);
router.get("/",                     verifyToken, getAllTrackings);

module.exports = router;