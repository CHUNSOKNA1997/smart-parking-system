# IoT Implementation Summary

This document summarizes the complete IoT integration implementation for the Smart Parking System.

## Overview

The IoT implementation allows ESP32 microcontrollers with IR sensors to monitor parking spot occupancy in real-time and automatically update the backend via WiFi. The implementation is integrated into the existing **parking-service** microservice - no separate IoT service is needed.

## Architecture Decision

**No separate IoT service required** - IoT endpoints are part of parking-service because:
- IoT devices only update parking spot availability
- No complex business logic needed
- Keeps microservices architecture simple and focused

## Microservices Structure

1. **auth-service** (Port 3001) - User authentication and management
2. **parking-service** (Port 3002) - Parking spots, bookings, transactions, **+ IoT endpoints**
3. **payment-service** (Port 3003) - KHQR payment processing

## Implementation Details

### Backend Files Created

#### 1. IoT Authentication Middleware
**File**: `services/parking-service/src/middleware/iot-auth.middleware.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import { sendErrorResponse } from "../utils/response.js";

export const authenticateIoT = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const apiKey = req.headers["x-api-key"];

        if (!apiKey) {
            return sendErrorResponse(
                res,
                "API key is required",
                401,
                "MISSING_API_KEY"
            );
        }

        const validApiKey = process.env.IOT_API_KEY;

        if (!validApiKey) {
            console.error("IOT_API_KEY not configured in environment");
            return sendErrorResponse(
                res,
                "IoT authentication not configured",
                500,
                "CONFIG_ERROR"
            );
        }

        if (apiKey !== validApiKey) {
            return sendErrorResponse(
                res,
                "Invalid API key",
                401,
                "INVALID_API_KEY"
            );
        }

        next();
    } catch (error) {
        console.error("IoT authentication error:", error);
        return sendErrorResponse(
            res,
            "Authentication failed",
            500,
            "AUTH_ERROR"
        );
    }
};
```

**Purpose**: Validates X-API-Key header against IOT_API_KEY from environment variables.

#### 2. IoT Routes
**File**: `services/parking-service/src/routes/iot.routes.ts`

```typescript
import express from "express";
import ParkingController from "../controllers/parking.controller.js";
import { authenticateIoT } from "../middleware/iot-auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/iot/spots/{spotId}/status:
 *   patch:
 *     summary: Update parking spot availability status (IoT devices only)
 *     tags: [IoT]
 *     security:
 *       - apiKeyAuth: []
 */
router.patch(
    "/spots/:spotId/status",
    authenticateIoT,
    ParkingController.updateSpotStatus
);

export default router;
```

**Endpoint**: `PATCH /api/v1/iot/spots/:spotId/status`
**Authentication**: X-API-Key header

#### 3. Controller Method
**File**: `services/parking-service/src/controllers/parking.controller.ts`

Added `updateSpotStatus` method at line 145-194:

```typescript
// Update spot status (IoT endpoint)
static async updateSpotStatus(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        const { spotId } = req.params;
        const { isAvailable } = req.body;

        if (typeof isAvailable !== "boolean") {
            return sendError(
                res,
                400,
                "isAvailable must be a boolean value"
            );
        }

        const spot = await ParkingSpotModel.findById(spotId);

        if (!spot) {
            return sendError(res, 404, "Parking spot not found");
        }

        const updatedSpot = await ParkingSpotModel.updateAvailability(
            spotId,
            isAvailable
        );

        console.log(
            `IoT Update: Spot ${spot.id} -> ${
                isAvailable ? "AVAILABLE" : "OCCUPIED"
            }`
        );

        return sendSuccess(
            res,
            200,
            "Spot status updated successfully",
            { spot: updatedSpot }
        );
    } catch (error) {
        console.error("Update spot status error:", error);
        return sendError(
            res,
            500,
            "Failed to update spot status",
            error.message
        );
    }
}
```

#### 4. App Registration
**File**: `services/parking-service/src/app.ts`

```typescript
import iotRoutes from "./routes/iot.routes.js";

// API v1 routes
app.use("/api/v1/parking", parkingRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/iot", iotRoutes); // Added IoT routes
```

#### 5. Swagger Configuration
**File**: `services/parking-service/src/config/swagger.ts`

Added API Key security scheme:

```typescript
securitySchemes: {
    bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
    },
    apiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
    },
}
```

#### 6. Environment Configuration
**File**: `services/parking-service/.env`

```env
# IoT Configuration
IOT_API_KEY=esp32-parking-iot-secret-key-2024
```

### Frontend (ESP32 Arduino Code)

**File**: `iot-source-code.md`

#### Key Features:
- **Array-based scalable design** - Change `NUM_SENSORS` to add more parking spots
- **WiFi connectivity** with auto-reconnection
- **HTTP PATCH requests** to backend API
- **Debouncing logic** (2-second delay to prevent noise)
- **LCD status display** showing total/free/used spots
- **State tracking** for all sensors

#### Configuration Required:

```cpp
// CONFIGURATION
const int NUM_SENSORS = 6;
const char* ssid = "YourWiFiSSID";
const char* password = "YourWiFiPassword";
const char* API_URL = "http://192.168.1.100:3002/api/v1/iot/spots";
const char* API_KEY = "esp32-parking-iot-secret-key-2024";

const int SENSOR_PINS[NUM_SENSORS] = {32, 33, 25, 26, 27, 14};
const char* SPOT_IDS[NUM_SENSORS] = {
    "spot-id-1", "spot-id-2", "spot-id-3",
    "spot-id-4", "spot-id-5", "spot-id-6"
};
```

#### Hardware Requirements:
- ESP32 Development Board
- IR Obstacle Avoidance Sensors (scalable quantity)
- I2C LCD Display (16x2, address 0x27)
- Jumper wires and breadboard
- USB cable for programming

#### Required Arduino Libraries:
- WiFi (built-in)
- HTTPClient (built-in)
- Wire (built-in)
- LiquidCrystal_I2C by Frank de Brabander

## API Endpoint Specification

### Update Spot Status

**Endpoint**: `PATCH /api/v1/iot/spots/{spotId}/status`

**Headers**:
```
Content-Type: application/json
X-API-Key: esp32-parking-iot-secret-key-2024
```

**Request Body**:
```json
{
  "isAvailable": false
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Spot status updated successfully",
  "data": {
    "spot": {
      "id": "A1-001",
      "level": 1,
      "section": "A",
      "spotType": "CAR",
      "isAvailable": false,
      "pricePerHour": "2.00",
      "lastUpdated": "2025-11-17T10:30:00.000Z"
    }
  }
}
```

**Error Responses**:

Missing API Key (401):
```json
{
  "success": false,
  "message": "API key is required",
  "errorCode": "MISSING_API_KEY"
}
```

Invalid API Key (401):
```json
{
  "success": false,
  "message": "Invalid API key",
  "errorCode": "INVALID_API_KEY"
}
```

Spot Not Found (404):
```json
{
  "success": false,
  "message": "Parking spot not found"
}
```

## Database Schema

### ParkingSpot Table

```sql
CREATE TABLE parking_spots (
  spot_id VARCHAR(10) PRIMARY KEY,
  level INT NOT NULL,
  section VARCHAR(10) NOT NULL,
  spot_type VARCHAR(20) NOT NULL, -- 'CAR' or 'MOTORCYCLE'
  is_available BOOLEAN DEFAULT TRUE,
  price_per_hour DECIMAL(10,2) DEFAULT 2.00,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Note**: The spot identifier is stored in the `id` field (mapped from `spot_id`), not `spotNumber`.

## Setup Instructions

### Backend Setup

1. **Add IOT_API_KEY to environment**:
   ```bash
   echo "IOT_API_KEY=esp32-parking-iot-secret-key-2024" >> services/parking-service/.env
   ```

2. **Start parking-service**:
   ```bash
   cd services/parking-service
   npm run dev
   ```

3. **Verify Swagger documentation**:
   Open `http://localhost:3002/api-docs` and check for IoT endpoints

### ESP32 Setup

1. **Install Arduino IDE** and add ESP32 board support

2. **Install required libraries**:
   - Open Arduino IDE Library Manager
   - Install: LiquidCrystal_I2C by Frank de Brabander

3. **Get WiFi credentials**:
   - SSID: Your WiFi network name
   - Password: Your WiFi password
   - **Important**: ESP32 only supports 2.4GHz WiFi

4. **Get local IP address** (not localhost):
   - Windows: `ipconfig` (look for IPv4 Address)
   - Linux/Mac: `ip addr` or `ifconfig`
   - Example: `192.168.1.100`

5. **Get parking spot IDs from database**:
   ```bash
   psql -U postgres -d parking_db -c "SELECT id, level, section FROM parking_spots LIMIT 6;"
   ```

6. **Configure ESP32 code**:
   - Open Arduino code from `iot-source-code.md`
   - Replace WiFi SSID and password
   - Replace API_URL with your local IP
   - Replace API_KEY with value from `.env`
   - Replace SPOT_IDS with actual database IDs

7. **Upload to ESP32**:
   - Connect ESP32 via USB
   - Select board: ESP32 Dev Module
   - Select correct COM port
   - Upload sketch

8. **Monitor Serial output**:
   - Open Serial Monitor (115200 baud)
   - Verify WiFi connection
   - Test sensor by placing object in front
   - Check for HTTP 200 responses

## Testing

### Test Backend Endpoint

```bash
# Get a spot ID
SPOT_ID=$(psql -U postgres -d parking_db -t -c "SELECT id FROM parking_spots LIMIT 1;")

# Mark spot as occupied
curl -X PATCH "http://localhost:3002/api/v1/iot/spots/${SPOT_ID}/status" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: esp32-parking-iot-secret-key-2024" \
  -d '{"isAvailable": false}'

# Mark spot as available
curl -X PATCH "http://localhost:3002/api/v1/iot/spots/${SPOT_ID}/status" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: esp32-parking-iot-secret-key-2024" \
  -d '{"isAvailable": true}'
```

### Expected Backend Logs

```
PATCH /api/v1/iot/spots/A1-001/status
IoT Update: Spot A1-001 -> OCCUPIED
```

## Data Flow

```
ESP32 IR Sensor detects car
    ↓
State change + debounce (2 seconds)
    ↓
HTTP PATCH to parking-service
    ↓
IoT middleware validates X-API-Key
    ↓
Controller updates spot availability
    ↓
Database updated (isAvailable, lastUpdated)
    ↓
Response sent to ESP32
    ↓
Users see real-time availability in app
```

## Scaling to More Sensors

To add more parking spots, only modify 3 lines in Arduino code:

```cpp
// Change from 6 to desired number
const int NUM_SENSORS = 10;

// Add more GPIO pins
const int SENSOR_PINS[NUM_SENSORS] = {32, 33, 25, 26, 27, 14, 15, 16, 17, 18};

// Add more spot IDs
const char* SPOT_IDS[NUM_SENSORS] = {
    "A1-001", "A1-002", "A1-003", "A1-004", "A1-005",
    "A1-006", "A1-007", "A1-008", "A1-009", "A1-010"
};
```

**No backend changes needed** - the endpoint handles any valid spot ID.

## Security Considerations

### Current Implementation (Shared API Key)
- **Pros**: Simple, easy to implement
- **Cons**: All devices share same key

### Improvements for Production

1. **Per-device tokens**:
   - Generate unique API key for each ESP32
   - Store in database with device metadata
   - Easier to revoke individual devices

2. **HTTPS**:
   - Requires SSL certificate
   - Encrypts API key in transit

3. **Rate limiting**:
   - Prevent abuse
   - Limit updates per device per minute

4. **Device registration**:
   - Admin dashboard to manage IoT devices
   - Track device status, battery, last seen

## Troubleshooting

### WiFi Connection Issues
- Check SSID and password spelling
- Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Move ESP32 closer to router
- Check Serial Monitor for error messages

### HTTP Errors
- **404**: Wrong API_URL or spot ID doesn't exist
- **401**: Wrong API_KEY or missing X-API-Key header
- **500**: Backend error, check parking-service logs

### Sensors Not Working
- Check wiring (VCC, GND, OUT)
- Verify sensor power voltage (5V or 3.3V)
- Adjust sensitivity potentiometer on sensor
- Test with multimeter

### LCD Not Displaying
- Check I2C address (default 0x27, some use 0x3F)
- Run I2C scanner sketch to find correct address
- Verify SDA/SCL connections (GPIO 21/22)

## Questions & Answers

### Q: Do I need a separate IoT service?
**A**: No, IoT endpoints are integrated into parking-service.

### Q: What is the purpose of IoT authentication?
**A**: Prevents unauthorized devices from updating parking spot data. Only devices with the correct API key can send updates.

### Q: Where does IOT_API_KEY come from?
**A**: You generate it and store it in both:
1. Backend `.env` file
2. ESP32 Arduino code

### Q: Can I use localhost for API_URL?
**A**: No, use your local network IP (e.g., `192.168.1.100`) because localhost on ESP32 refers to the ESP32 itself, not your computer.

### Q: How do I find my WiFi password?
**A**:
- Check router sticker
- Windows: `netsh wlan show profile name="NetworkName" key=clear`
- Linux: Check network manager or `/etc/NetworkManager/system-connections/`
- Mac: Keychain Access app

## Future Enhancements

- MQTT support for bidirectional real-time communication
- OTA (Over-The-Air) firmware updates
- Temperature and humidity sensors
- Sensor multiplexer for 16+ spots on one ESP32
- Battery backup with deep sleep mode
- Web-based configuration interface
- IoT device management dashboard
- Per-device authentication tokens
- Rate limiting for IoT endpoints

## Files Reference

### Backend
- `services/parking-service/src/middleware/iot-auth.middleware.ts` - API key validation
- `services/parking-service/src/routes/iot.routes.ts` - IoT endpoint routing
- `services/parking-service/src/controllers/parking.controller.ts` - Update spot status logic
- `services/parking-service/src/app.ts` - Route registration
- `services/parking-service/src/config/swagger.ts` - API documentation
- `services/parking-service/.env` - IOT_API_KEY configuration

### Frontend
- `iot-source-code.md` - Complete ESP32 Arduino code and documentation

### Documentation
- `iot-implementation.md` - This file (implementation summary)
