# Smart Parking System - ESP32 IoT Integration

This document contains the Arduino code for the ESP32-based IoT parking spot monitoring system.

## Overview

This system uses ESP32 microcontroller with IR sensors to detect parking spot occupancy and automatically updates the backend API via WiFi. The code uses arrays for easy scalability - simply change `NUM_SENSORS` to add more parking spots.

## Hardware Requirements

-   ESP32 Development Board
-   Multiple IR Obstacle Avoidance Sensors (scalable)
-   I2C LCD Display (16x2) with address 0x27
-   Jumper wires and breadboard
-   USB cable for programming

## Default Pin Configuration

| Component   | ESP32 Pin |
| ----------- | --------- |
| IR Sensor 1 | GPIO 32   |
| IR Sensor 2 | GPIO 33   |
| IR Sensor 3 | GPIO 25   |
| IR Sensor 4 | GPIO 26   |
| IR Sensor 5 | GPIO 27   |
| IR Sensor 6 | GPIO 14   |
| LCD SDA     | GPIO 21   |
| LCD SCL     | GPIO 22   |

**Note**: You can add more sensors by modifying the `SENSOR_PINS` array and `NUM_SENSORS` constant in the code.

## Required Libraries

Install these libraries via Arduino IDE Library Manager:

```
- WiFi (built-in)
- HTTPClient (built-in)
- Wire (built-in)
- LiquidCrystal_I2C by Frank de Brabander
```

## Configuration Steps

1. **Number of Sensors**: Set `NUM_SENSORS` to match your hardware setup
2. **WiFi Credentials**: Replace `ssid` and `password` with your WiFi network details
3. **API URL**: Replace with your server's IP address (e.g., `http://192.168.1.100:3002/api/v1/iot/spots`)
4. **API Key**: Get `IOT_API_KEY` from your backend `.env` file
5. **Sensor Pins**: Add/modify pins in the `SENSOR_PINS` array
6. **Spot IDs**: Get the UUID values for your parking spots from the database

### Getting Spot IDs from Database

```bash
# Connect to PostgreSQL
psql -U postgres -d smart_parking

# Query parking spots (adjust LIMIT based on NUM_SENSORS)
SELECT id, "spotNumber", level, section FROM "ParkingSpot" LIMIT 6;
```

Copy the UUID values and paste them into the `SPOT_IDS` array in the same order.

## Arduino Code

```cpp
/*
 * Smart Parking System - ESP32 IoT Integration (Array-Based)
 * Monitors parking spot occupancy using IR sensors and updates backend API
 *
 * SCALABLE DESIGN: To add more sensors, just:
 * 1. Change NUM_SENSORS
 * 2. Add pins to SENSOR_PINS array
 * 3. Add UUIDs to SPOT_IDS array
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// LCD Configuration
LiquidCrystal_I2C lcd(0x27, 16, 2);

//  CONFIGURATION (MODIFY THESE)

// Number of parking spots to monitor
const int NUM_SENSORS = 6;  // Change this to add more sensors

// WiFi Credentials
const char* ssid = "YourWiFiSSID";           // Replace with your WiFi SSID
const char* password = "YourWiFiPassword";   // Replace with your WiFi Password

// API Configuration
const char* API_URL = "http://192.168.1.100:3002/api/v1/iot/spots";  // Replace with your server IP
const char* API_KEY = "your-secret-api-key-here";  // Replace with your IOT_API_KEY from .env

// Sensor Pin Configuration (add more pins as needed)
const int SENSOR_PINS[NUM_SENSORS] = {32, 33, 25, 26, 27, 14};

// Parking Spot IDs from database (get from PostgreSQL query)
const char* SPOT_IDS[NUM_SENSORS] = {
    "spot-uuid-1",  // Replace with actual UUIDs from database
    "spot-uuid-2",
    "spot-uuid-3",
    "spot-uuid-4",
    "spot-uuid-5",
    "spot-uuid-6"
};

//  STATE TRACKING (DO NOT MODIFY)

int lastStates[NUM_SENSORS] = {0};           // Track last sensor states
unsigned long lastUpdates[NUM_SENSORS] = {0}; // Track last update times

const unsigned long DEBOUNCE_DELAY = 2000;    // 2 seconds debounce

//  SETUP

void setup() {
    Serial.begin(115200);

    // Initialize LCD
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print(" Smart Parking");
    lcd.setCursor(0, 1);
    lcd.print("  Connecting...");

    // Initialize all sensors
    for (int i = 0; i < NUM_SENSORS; i++) {
        pinMode(SENSOR_PINS[i], INPUT_PULLUP);
    }

    // Connect to WiFi
    connectWiFi();

    // Display ready message
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(" System Ready");
    lcd.setCursor(0, 1);
    lcd.print("Spots: ");
    lcd.print(NUM_SENSORS);
    delay(2000);
    lcd.clear();

    Serial.println("\n=== Smart Parking System Started ===");
    Serial.print("Monitoring ");
    Serial.print(NUM_SENSORS);
    Serial.println(" parking spots");
}

//  WIFI CONNECTION

void connectWiFi() {
    Serial.print("Connecting to WiFi");
    WiFi.begin(ssid, password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi Connected!");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("WiFi Connected");
        lcd.setCursor(0, 1);
        lcd.print(WiFi.localIP());
        delay(2000);
    } else {
        Serial.println("\nWiFi Connection Failed!");
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("WiFi Failed!");
        lcd.setCursor(0, 1);
        lcd.print("Check Settings");
    }
}

// API UPDATE

void updateSpotStatus(const char* spotId, bool isOccupied) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi not connected, skipping update");
        return;
    }

    HTTPClient http;

    // Build URL
    String url = String(API_URL) + "/" + String(spotId) + "/status";

    Serial.print("Updating spot: ");
    Serial.println(url);

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", API_KEY);

    // Build JSON payload
    String payload = "{\"isAvailable\":";
    payload += isOccupied ? "false" : "true";
    payload += "}";

    Serial.print("Payload: ");
    Serial.println(payload);

    // Send PATCH request
    int httpCode = http.PATCH(payload);

    if (httpCode > 0) {
        Serial.print("HTTP Response: ");
        Serial.println(httpCode);

        if (httpCode == 200) {
            String response = http.getString();
            Serial.println("Success: " + response);
        } else {
            Serial.println("Error: " + http.getString());
        }
    } else {
        Serial.print("HTTP Error: ");
        Serial.println(http.errorToString(httpCode));
    }

    http.end();
}

//  LCD DISPLAY

void updateLCD() {
    int occupied = 0;

    // Count occupied spots
    for (int i = 0; i < NUM_SENSORS; i++) {
        if (digitalRead(SENSOR_PINS[i]) == 1) {
            occupied++;
        }
    }

    int available = NUM_SENSORS - occupied;

    // Display summary
    lcd.setCursor(0, 0);
    lcd.print("Total: ");
    lcd.print(NUM_SENSORS);
    lcd.print("       ");

    lcd.setCursor(0, 1);
    lcd.print("Free: ");
    lcd.print(available);
    lcd.print(" | Used:");
    lcd.print(occupied);
    lcd.print(" ");
}

//  MAIN LOOP

void loop() {
    // Check WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi disconnected, reconnecting...");
        connectWiFi();
    }

    // Check all sensors
    for (int i = 0; i < NUM_SENSORS; i++) {
        int currentState = digitalRead(SENSOR_PINS[i]);
        unsigned long currentTime = millis();

        // Check if state changed and debounce period has passed
        if (currentState != lastStates[i] &&
            (currentTime - lastUpdates[i]) > DEBOUNCE_DELAY) {

            lastStates[i] = currentState;
            lastUpdates[i] = currentTime;

            bool isOccupied = (currentState == 1);

            Serial.print("Spot ");
            Serial.print(i + 1);
            Serial.print(" changed to: ");
            Serial.println(isOccupied ? "OCCUPIED" : "AVAILABLE");

            // Update backend API
            updateSpotStatus(SPOT_IDS[i], isOccupied);
        }
    }

    // Update LCD display
    updateLCD();

    delay(200);
}
```

## How It Works

1. **Initialization**: ESP32 connects to WiFi and initializes all sensors using a loop
2. **Sensor Monitoring**: Continuously reads all IR sensor states in a loop (HIGH = occupied, LOW = empty)
3. **Debouncing**: Only sends updates if state changes and 2 seconds have passed since last update
4. **API Update**: Sends PATCH request to backend with spot availability status
5. **LCD Display**: Shows summary (Total spots, Free spots, Used spots)
6. **Auto-Reconnect**: Automatically reconnects to WiFi if connection is lost

## Scalability

To add more parking spots:

1. **Increase NUM_SENSORS**: Change `const int NUM_SENSORS = 6;` to desired number
2. **Add Sensor Pins**: Add GPIO pins to the array: `const int SENSOR_PINS[] = {32, 33, 25, 26, 27, 14, 15, 16};`
3. **Add Spot IDs**: Add corresponding UUIDs to the array: `const char* SPOT_IDS[] = {..., "new-uuid"};`
4. **Upload**: Flash the updated code to ESP32

That's it! No need to modify any functions or logic.

## API Endpoint

The ESP32 sends PATCH requests to:

```
PATCH http://your-server:3002/api/v1/iot/spots/{spotId}/status
Headers:
  Content-Type: application/json
  X-API-Key: your-iot-api-key
Body:
  {
    "isAvailable": true/false
  }
```

## Testing

1. **Serial Monitor**: Open Serial Monitor (115200 baud) to view debug messages
2. **WiFi Connection**: Verify "WiFi Connected!" message appears
3. **Sensor Test**: Place object in front of IR sensor, should see "Spot X changed to: OCCUPIED"
4. **API Test**: Check Serial Monitor for HTTP response codes (200 = success)
5. **LCD Display**: Verify LCD shows correct spot status

## Troubleshooting

### WiFi Not Connecting

-   Double-check SSID and password
-   Ensure ESP32 is within WiFi range
-   Verify WiFi network is 2.4GHz (ESP32 doesn't support 5GHz)

### HTTP Errors

-   Verify API_URL is correct (use local network IP, not localhost)
-   Check IOT_API_KEY matches backend .env file
-   Ensure parking-service is running and accessible
-   Test endpoint with curl first

### Sensors Not Working

-   Check wiring connections
-   Verify sensor power (5V or 3.3V depending on sensor model)
-   Test sensors individually with multimeter
-   Adjust sensor sensitivity potentiometer

### LCD Not Displaying

-   Verify I2C address (default 0x27, some use 0x3F)
-   Check SDA and SCL connections
-   Run I2C scanner sketch to find correct address

## Security Notes

-   Keep IOT_API_KEY secret and secure
-   Use HTTPS in production (requires SSL certificate)
-   Consider implementing per-device authentication tokens
-   Monitor API logs for suspicious activity
-   Change API key regularly

## Code Advantages

✅ **Scalable**: Add 10, 20, or 100 sensors by just modifying 3 lines
✅ **Clean**: Single loop handles all sensors
✅ **Efficient**: Uses less memory than declaring individual variables
✅ **Maintainable**: No repetitive code to debug
✅ **Flexible**: Easy to change pin assignments

## Example: Scaling to 10 Sensors

```cpp
const int NUM_SENSORS = 10;
const int SENSOR_PINS[NUM_SENSORS] = {32, 33, 25, 26, 27, 14, 15, 16, 17, 18};
const char* SPOT_IDS[NUM_SENSORS] = {
    "uuid-1", "uuid-2", "uuid-3", "uuid-4", "uuid-5",
    "uuid-6", "uuid-7", "uuid-8", "uuid-9", "uuid-10"
};
```

Done! The rest of the code automatically adapts.

## Future Enhancements

-   Add MQTT support for real-time bidirectional communication
-   Implement OTA (Over-The-Air) firmware updates
-   Add temperature and humidity sensors
-   Use sensor multiplexer for 16+ spots on one ESP32
-   Battery backup with deep sleep mode
-   Web-based configuration interface
