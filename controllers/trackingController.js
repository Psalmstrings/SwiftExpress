const Tracking = require("../models/Tracking.js");

// ------------------------------
// Create new shipment
// ------------------------------
exports.createTracking = async (req, res) => {
  try {
    if (!req.body.trackingId || !req.body.status || !req.body.currentLocation) {
      return res.status(400).json({ error: "trackingId, status, and currentLocation are required" });
    }

    // Check if trackingId already exists
    const exists = await Tracking.findOne({ trackingId: req.body.trackingId });
    if (exists) {
      return res.status(400).json({ error: "Tracking ID already exists" });
    }

    const tracking = new Tracking(req.body);
    await tracking.save();

    res.status(201).json({ success: true, tracking });
  } catch (error) {
    console.error("Create Tracking Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ------------------------------
// Get tracking info
// ------------------------------
exports.getTracking = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const data = await Tracking.findOne({ trackingId });

    if (!data) {
      return res.status(404).json({ error: "Tracking ID not found" });
    }

    res.json(data);
  } catch (err) {
    console.error("Get Tracking Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// Update tracking info
// ------------------------------
exports.updateTracking = async (req, res) => {
  try {
    const { trackingId } = req.params;

    // Build update object
    const updateData = {
      lastUpdated: new Date(),
    };

    if (req.body.status) updateData.status = req.body.status;
    if (req.body.currentLocation) updateData.currentLocation = req.body.currentLocation;

    // Add timeline event if provided
    if (req.body.timeline) {
      updateData.$push = { timeline: req.body.timeline };
    }

    const updated = await Tracking.findOneAndUpdate(
      { trackingId },
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Tracking ID not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Update Tracking Error:", error);
    res.status(500).json({ error: error.message });
  }
};