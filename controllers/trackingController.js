const Tracking = require("../models/Tracking.js");

// Valid status values
const VALID_STATUSES = [
  "Pending",
  "Shipment Created",
  "Processing",
  "Picked Up",
  "In Transit",
  "Arrived at Sorting Facility",
  "Customs Clearance",
  "Out for Delivery",
  "Delivery Attempted",
  "Delayed",
  "Delivered",
  "Returned",
  "Cancelled",
];

// ------------------------------
// Create new shipment (Admin or Staff)
// ------------------------------
exports.createTracking = async (req, res) => {
  try {
    const { trackingId, status, currentLocation } = req.body;

    if (!trackingId || !trackingId.trim()) {
      return res.status(400).json({ error: "trackingId is required" });
    }
    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }
    if (!currentLocation || !currentLocation.trim()) {
      return res.status(400).json({ error: "currentLocation is required" });
    }

    // Check if trackingId already exists
    const exists = await Tracking.findOne({ trackingId: trackingId.trim() });
    if (exists) {
      return res.status(409).json({ error: "Tracking ID already exists. Use a different ID." });
    }

    // Build document — spread req.body, attach creator info
    const trackingData = {
      ...req.body,
      trackingId: trackingId.trim(),
      createdBy: req.adminId || null,
      createdByName: req.user?.fullName || "Staff",
      createdByRole: req.userRole || "staff",
      lastUpdated: new Date(),
    };

    const tracking = new Tracking(trackingData);
    await tracking.save();

    res.status(201).json({ success: true, tracking });
  } catch (error) {
    console.error("Create Tracking Error:", error);

    // Handle Mongoose duplicate key error gracefully
    if (error.code === 11000) {
      return res.status(409).json({ error: "Tracking ID already exists." });
    }

    // Validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join("; ") });
    }

    res.status(500).json({ error: "Internal server error. Please try again." });
  }
};

// ------------------------------
// Get all shipments (Admin or Staff)
// Supports search, pagination, status filter, and onlyMine filter
// ------------------------------
exports.getAllTrackings = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const filter = {};

    // Filter by search (trackingId, recipientName, or senderName)
    const search = req.query.search ? req.query.search.trim() : "";
    if (search) {
      filter.$or = [
        { trackingId: { $regex: search, $options: "i" } },
        { recipientName: { $regex: search, $options: "i" } },
        { senderName: { $regex: search, $options: "i" } },
        { currentLocation: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by specific status
    if (req.query.status && req.query.status.trim()) {
      filter.status = req.query.status.trim();
    }

    // Filter for specific staff or "onlyMine"
    if (req.query.onlyMine === "true" && req.adminId) {
      filter.createdBy = req.adminId;
    } else if (req.query.staffId && req.query.staffId.trim()) {
      filter.createdBy = req.query.staffId.trim();
    }

    const [trackings, total] = await Promise.all([
      Tracking.find(filter)
        .sort({ lastUpdated: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "fullName email role"),
      Tracking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      trackings,
    });
  } catch (err) {
    console.error("Get All Trackings Error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ------------------------------
// Get tracking info by trackingId (Public or internal)
// ------------------------------
exports.getTracking = async (req, res) => {
  try {
    const { trackingId } = req.params;

    if (!trackingId || !trackingId.trim()) {
      return res.status(400).json({ error: "Tracking ID is required." });
    }

    const data = await Tracking.findOne({ trackingId: trackingId.trim() }).populate(
      "createdBy",
      "fullName email role"
    );

    if (!data) {
      return res.status(404).json({ error: "No shipment found with that tracking ID." });
    }

    res.json(data);
  } catch (err) {
    console.error("Get Tracking Error:", err);
    res.status(500).json({ error: "Internal server error. Please try again." });
  }
};

// ------------------------------
// Update tracking info + optionally push a new timeline event
// ------------------------------
exports.updateTracking = async (req, res) => {
  try {
    const { trackingId } = req.params;

    if (!trackingId || !trackingId.trim()) {
      return res.status(400).json({ error: "Tracking ID is required." });
    }

    // Build the $set portion
    const setData = {
      lastUpdated: new Date(),
      updatedBy: req.user?.fullName || "Staff",
    };

    if (req.body.status !== undefined)           setData.status          = req.body.status;
    if (req.body.currentLocation !== undefined)  setData.currentLocation = req.body.currentLocation;
    if (req.body.expectedDelivery !== undefined) setData.expectedDelivery = req.body.expectedDelivery;
    if (req.body.origin !== undefined)           setData.origin          = req.body.origin;
    if (req.body.destination !== undefined)      setData.destination     = req.body.destination;
    if (req.body.senderName !== undefined)       setData.senderName      = req.body.senderName;
    if (req.body.recipientName !== undefined)    setData.recipientName   = req.body.recipientName;
    if (req.body.packageDescription !== undefined) setData.packageDescription = req.body.packageDescription;

    // Build update operation
    const updateOp = { $set: setData };

    // Add timeline event if provided
    if (req.body.timeline && typeof req.body.timeline === "object" && !Array.isArray(req.body.timeline)) {
      updateOp.$push = { timeline: req.body.timeline };
    }

    const updated = await Tracking.findOneAndUpdate(
      { trackingId: trackingId.trim() },
      updateOp,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "No shipment found with that tracking ID." });
    }

    res.json({ success: true, tracking: updated });
  } catch (error) {
    console.error("Update Tracking Error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join("; ") });
    }

    res.status(500).json({ error: "Internal server error. Please try again." });
  }
};

// ------------------------------
// Delete a shipment (Admin or Creator)
// ------------------------------
exports.deleteTracking = async (req, res) => {
  try {
    const { trackingId } = req.params;

    const query = { trackingId: trackingId.trim() };
    // If not admin, only allow if created by this user
    if (req.userRole !== "admin") {
      query.createdBy = req.adminId;
    }

    const deleted = await Tracking.findOneAndDelete(query);

    if (!deleted) {
      return res.status(404).json({ error: "Shipment not found or insufficient permission to delete." });
    }

    res.json({ success: true, message: "Shipment deleted successfully." });
  } catch (err) {
    console.error("Delete Tracking Error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
