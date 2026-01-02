/*
  Smart Soil Monitoring System - Arduino Code
  
  This code reads soil moisture, temperature, and humidity sensors
  and sends the data via Serial to Raspberry Pi or computer
  
  Hardware Required:
  - Arduino Uno/Nano
  - Soil Moisture Sensor (Analog)
  - DHT22 Temperature & Humidity Sensor
  - Jumper wires
  
  Connections:
  - Soil Moisture Sensor: VCC -> 5V, GND -> GND, A0 -> A0
  - DHT22: VCC -> 5V, GND -> GND, Data -> Pin 2
*/

#include <DHT.h>

// DHT22 sensor configuration
#define DHTPIN 2        // DHT22 data pin connected to digital pin 2
#define DHTTYPE DHT22   // DHT22 sensor type
DHT dht(DHTPIN, DHTTYPE);

// Soil moisture sensor configuration
const int soilMoisturePin = A0;  // Soil moisture sensor connected to analog pin A0

// Calibration values for soil moisture sensor
const int dryValue = 1023;    // Value when sensor is in dry air
const int wetValue = 300;     // Value when sensor is in water

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Initialize DHT sensor
  dht.begin();
  
  // Print startup message
  Serial.println("🌱 Smart Soil Monitoring System Started");
  Serial.println("📡 Sending sensor data every 2 seconds...");
  Serial.println("=" * 40);
  
  // Wait for sensors to stabilize
  delay(2000);
}

void loop() {
  // Read soil moisture
  int soilMoistureRaw = analogRead(soilMoisturePin);
  
  // Convert raw value to percentage (0-100%)
  // Higher raw value = drier soil, so we invert it
  int soilMoisturePercent = map(soilMoistureRaw, dryValue, wetValue, 0, 100);
  soilMoisturePercent = constrain(soilMoisturePercent, 0, 100);
  
  // Read temperature and humidity from DHT22
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  
  // Check if DHT22 readings are valid
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    delay(2000);
    return;
  }
  
  // Print sensor readings in a format that can be parsed
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print(" °C, Humidity: ");
  Serial.print(humidity);
  Serial.print(" %, Soil Moisture: ");
  Serial.print(soilMoisturePercent);
  Serial.println(" %");
  
  // Alternative format for easier parsing (uncomment if needed)
  /*
  Serial.print("TEMP:");
  Serial.print(temperature);
  Serial.print(",HUM:");
  Serial.print(humidity);
  Serial.print(",SOIL:");
  Serial.println(soilMoisturePercent);
  */
  
  // JSON format (uncomment if your system expects JSON)
  /*
  Serial.print("{\"temperature\":");
  Serial.print(temperature);
  Serial.print(",\"humidity\":");
  Serial.print(humidity);
  Serial.print(",\"soilMoisture\":");
  Serial.print(soilMoisturePercent);
  Serial.println("}");
  */
  
  // Wait 2 seconds before next reading
  delay(2000);
}

/*
  Calibration Instructions:
  
  1. Soil Moisture Sensor Calibration:
     - Insert sensor in completely dry soil/air and note the reading (dryValue)
     - Insert sensor in water and note the reading (wetValue)
     - Update the dryValue and wetValue constants above
  
  2. Testing:
     - Open Serial Monitor (Tools -> Serial Monitor)
     - Set baud rate to 9600
     - You should see readings every 2 seconds
  
  3. Troubleshooting:
     - If DHT22 shows "Failed to read", check wiring
     - If soil moisture shows 0% or 100% constantly, recalibrate
     - Make sure all connections are secure
  
  4. Data Format:
     The default format is: "Temperature: 25.5 °C, Humidity: 60.2 %, Soil Moisture: 45 %"
     This matches the parsing in the Node.js application
*/