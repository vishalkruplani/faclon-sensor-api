require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const sensorRoutes = require("./routes/sensorRoutes");
const { setupMQTT } = require("./config/mqtt");
const logger = require("./utils/logger");

const app = express();
app.use(express.json());

app.use("/api/sensor", sensorRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "faclon",
      serverSelectionTimeoutMS: 5000,
    });
    logger.info("MongoDB Connected");

    if (process.env.ENABLE_MQTT === "true") {
      setupMQTT();
    }

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("MongoDB Connection failed:", err.message);
    process.exit(1);
  }
}

startServer();
