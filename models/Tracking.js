const mongoose = require("mongoose");

const timelineSchema = new mongoose.Schema({
  message: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: String, required: true }, // You could use Date type if you prefer
  time: { type: String, required: true },
});

const trackingSchema = new mongoose.Schema({
  trackingId: { type: String, required: true, unique: true },
  status: { type: String, required: true, default: "Pending" },
  currentLocation: { type: String, required: true },
  expectedDelivery: { type: Date }, // Optional, can be null
  lastUpdated: { type: Date, default: Date.now },
  timeline: { type: [timelineSchema], default: [] }, // Always returns an array
});

// Optional: automatically return JSON without __v
trackingSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    delete ret._id;
  },
});

module.exports = mongoose.model("Tracking", trackingSchema);