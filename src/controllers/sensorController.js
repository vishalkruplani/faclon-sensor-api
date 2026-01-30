const Sensor = require("../models/Sensor");
const logger = require("../utils/logger");
const { z } = require("zod");

const ingestSchema = z.object({
  deviceId: z.string().min(1, "deviceId cannot be empty"),
  temperature: z.number({
    required_error: "temperature is required",
    invalid_type_error: "temperature must be a number",
  }),
  timestamp: z.number().optional().default(() => Date.now()),
});

exports.ingestReading = async (req, res, next) => {
  try {
    const validated = ingestSchema.parse(req.body);

    const reading = new Sensor({
      deviceId: validated.deviceId,
      temperature: validated.temperature,
      timestamp: validated.timestamp,
    });

    await reading.save();
    logger.info({ deviceId: reading.deviceId }, "Sensor reading ingested");

    res.status(201).json({
      success: true,
      data: reading,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: error.errors.map((e) => e.message).join(", "),
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }
    next(error);
  }
};

exports.getLatestReading = async (req, res, next) => {
  try {
    const { deviceId } = req.params;

    const reading = await Sensor.findOne({ deviceId })
      .sort({ timestamp: -1 })
      .limit(1);

    if (!reading) {
      return res.status(404).json({
        success: false,
        error: "No readings found for this device",
      });
    }

    res.json({
      success: true,
      data: reading,
    });
  } catch (error) {
    next(error);
  }
};
