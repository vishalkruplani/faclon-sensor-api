const mqtt = require("mqtt");
const Sensor = require("../models/Sensor");
const logger = require("../utils/logger");

exports.setupMQTT = (brokerUrl = "mqtt://localhost:1883") => {
  const client = mqtt.connect(brokerUrl);

  client.on("connect", () => {
    logger.info("MQTT Connected");
    client.subscribe("iot/sensor/+/temperature", (err) => {
      if (err) logger.error("MQTT Subscription failed:", err);
      else logger.info("Subscribed to iot/sensor/+/temperature");
    });
  });

  client.on("message", async (topic, message) => {
    try {
      const parts = topic.split("/");
      const deviceId = parts[2];
      const data = JSON.parse(message.toString());

      await Sensor.create({
        deviceId,
        temperature: parseFloat(data.temperature),
        timestamp: Date.now(),
      });

      logger.info({ deviceId, temp: data.temperature }, "MQTT reading saved");
    } catch (error) {
      logger.error({ error, topic }, "MQTT processing failed");
    }
  });

  client.on("error", (err) => {
    logger.error("MQTT Error:", err);
  });

  return client;
};
