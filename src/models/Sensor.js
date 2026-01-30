const mongoose = require("mongoose");

const sensorSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, "deviceId is required"],
    index: true,
  },
  temperature: {
    type: Number,
    required: [true, "temperature is required"],
  },
  timestamp: {
    type: Number,
    default: () => Date.now(),
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

sensorSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model("Sensor", sensorSchema);
