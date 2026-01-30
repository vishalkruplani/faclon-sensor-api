# IoT Sensor API

This is a Node.js backend service built for the Faclon Labs internship assessment. It handles temperature data ingestion from IoT sensors via a REST API and an MQTT subscriber, persisting records to MongoDB Atlas.

---

## Features

- **RESTful API**: HTTP endpoints for sensor data ingestion and device state retrieval
- **MQTT Integration**: Real-time data ingestion via wildcard subscription to `iot/sensor/+/temperature`
- **Validation**: Used Zod and Mongoose to ensure device IDs and temperatures are correct.
- **Fast Retrieval**: Implemented a compound index to keep the 'latest reading' query efficient.
- **Structured Logging**: Production-ready logging with Pino for monitoring and debugging
- **Dynamic Devices**: New sensors are automatically supported via MQTT wildcard topics.

---

## Requirements

- Node.js 16.x or higher
- MongoDB 5.0+ (Atlas or self-hosted)
- MQTT broker (optional, for real-time features)

---

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root. Reference `.env.example` for all available options.

**Required Variables**:

```env
# Server
PORT=3000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/iot-sensors

# MQTT (Optional)
ENABLE_MQTT=true
MQTT_BROKER=mqtt://broker.hivemq.com:1883
```

### 3. Start the Service

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

The service will be available at `http://localhost:3000` by default.

---

## API Documentation

### Health Check

Verify service availability and database connectivity.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-30T12:34:56.789Z",
  "database": "connected"
}
```

---

### Ingest Sensor Reading

Submit a new temperature measurement from an IoT device.

**Endpoint**: `POST /api/sensor/ingest`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "deviceId": "sensor-01",
  "temperature": 23.5,
  "timestamp": "2026-01-30T12:00:00.000Z"
}
```

**Field Specifications**:
- `deviceId` (string, required): Alphanumeric device identifier
- `temperature` (number, required): Temperature in Celsius, range: -50 to 100
- `timestamp` (ISO 8601 string, optional): Measurement time. Defaults to server time if omitted.

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/sensor/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "sensor-01",
    "temperature": 23.5
  }'
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "deviceId": "sensor-01",
    "temperature": 23.5,
    "timestamp": "2026-01-30T12:34:56.789Z"
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "temperature": "Must be a number between -50 and 100"
  }
}
```

---

### Retrieve Latest Reading

Fetch the most recent temperature measurement for a specific device.

**Endpoint**: `GET /api/sensor/:deviceId/latest`

**Parameters**:
- `deviceId` (path parameter): Device identifier

**Example Request**:
```bash
curl http://localhost:3000/api/sensor/sensor-01/latest
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "deviceId": "sensor-01",
    "temperature": 23.5,
    "timestamp": "2026-01-30T12:34:56.789Z"
  }
}
```

**Not Found Response** (404):
```json
{
  "success": false,
  "error": "No readings found for device: sensor-01"
}
```

---

## Technical Architecture

### Database Schema

**Collection**: `sensor_readings`

```javascript
{
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  temperature: {
    type: Number,
    required: true,
    min: -50,
    max: 100
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  }
}
```

**Timestamps**: Automatically managed by Mongoose (`createdAt`, `updatedAt`)

### Indexing Strategy

A compound index on `{ deviceId: 1, timestamp: -1 }` enables:

- **O(log n) retrieval complexity** for latest reading queries
- **Efficient filtering** by device with descending time sort
- **Prevention of collection scans** as dataset grows to millions of records

The index supports both equality matches on `deviceId` and sorted retrieval by `timestamp`, making it optimal for the access pattern of this application.

**Index Creation**:
```javascript
sensorReadingSchema.index({ deviceId: 1, timestamp: -1 });
```

### MQTT Implementation

**Topic Pattern**: `iot/sensor/+/temperature`

The service subscribes to a wildcard topic where `+` matches any single-level device identifier. This design enables:

- **Zero-configuration device onboarding**: New sensors are automatically recognized
- **Horizontal scalability**: Multiple service instances can subscribe to different topic partitions
- **Decoupled architecture**: Sensor firmware doesn't need REST endpoint configuration

**Message Format**:
```json
{
  "temperature": 23.5,
  "timestamp": "2026-01-30T12:00:00.000Z"
}
```

The `deviceId` is extracted from the topic path (`iot/sensor/{deviceId}/temperature`).

**Connection Handling**:
- Automatic reconnection with exponential backoff
- Graceful shutdown on service termination
- Connection state logging for operational visibility

### Validation Pipeline

Data validation occurs at three levels:

1. **HTTP Layer**: Express middleware validates request structure
2. **Application Layer**: Zod schemas enforce runtime type safety
3. **Database Layer**: Mongoose schema constraints prevent invalid writes

**Zod Schema Example**:
```javascript
const sensorReadingSchema = z.object({
  deviceId: z.string().min(1).max(50),
  temperature: z.number().min(-50).max(100),
  timestamp: z.string().datetime().optional()
});
```

Log levels: `error`, `warn`, `info`, `debug`, `trace`

---

## Project Structure

```
iot-sensor-api/
├── src/
│   ├── config/
│   │   ├── database.js       # MongoDB connection logic
│   │   └── mqtt.js           # MQTT client configuration
│   ├── models/
│   │   └── SensorReading.js  # Mongoose schema and model
│   ├── routes/
│   │   └── sensor.js         # API route handlers
│   ├── services/
│   │   ├── ingest.js         # Data ingestion service
│   │   └── mqtt-subscriber.js # MQTT message handler
│   ├── validators/
│   │   └── sensor.js         # Zod validation schemas
│   └── app.js                # Express application setup
├── .env.example              # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## Deployment Considerations

### Environment Variables

Ensure all required environment variables are set in your deployment environment. Use secrets management (AWS Secrets Manager, Azure Key Vault, etc.) for sensitive values.

### MongoDB Atlas

Recommended configuration:
- Enable authentication
- Configure IP whitelist or VPC peering
- Use connection string with retry writes: `retryWrites=true&w=majority`
