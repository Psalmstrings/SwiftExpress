const mongoose = require("mongoose");

const timelineSchema = new mongoose.Schema({
  message:  { type: String, required: true },
  location: { type: String, required: true },
  date:     { type: String, required: true },
  time:     { type: String, required: false, default: "" }, // Optional – not required so older records don't break
  status:   { type: String, required: false, default: "" }, // Snapshot of status at this event
});

const trackingSchema = new mongoose.Schema({
  trackingId:       { type: String, required: true, unique: true, trim: true },
  status:           { type: String, required: true, default: "Pending" },
  currentLocation:  { type: String, required: true },
  origin:           { type: String, default: "" },
  destination:      { type: String, default: "" },
  senderName:       { type: String, default: "" },
  recipientName:    { type: String, default: "" },
  packageDescription: { type: String, default: "" },
  expectedDelivery: { type: Date },
  lastUpdated:      { type: Date, default: Date.now },
  timeline:         { type: [timelineSchema], default: [] },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
  createdByName:    { type: String, default: "" },
  createdByRole:    { type: String, default: "admin" },
  updatedBy:        { type: String, default: "" },
});

// Automatically return clean JSON without __v
trackingSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    delete ret._id;
  },
});

module.exports = mongoose.model("Tracking", trackingSchema);
