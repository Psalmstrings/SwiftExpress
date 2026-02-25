const express = require('express');
const { createTracking, getTracking, updateTracking } = require("../controllers/trackingController.js");

const router = express.Router();

router.post("/create", createTracking);
router.get("/:trackingId", getTracking);
router.put("/update/:trackingId", updateTracking);

module.exports = router;   // ✅ Correct for CommonJS modules