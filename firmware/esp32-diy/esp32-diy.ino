/*
 * BioEcho DIY ESP32 Plant Electrophysiology Node
 * Hardware: ESP32-S3 + ADS1115 16-bit ADC + INA128 instrumentation amp
 *
 * Two output modes:
 *   1. USB Serial (115200 baud) — for Web Serial API
 *   2. WiFi WebSocket — for remote monitoring
 *
 * Wiring:
 *   Plant electrode → INA128 input
 *   INA128 output → ADS1115 AIN0 (differential with AIN1)
 *   ADS1115 SDA → ESP32 GPIO21
 *   ADS1115 SCL → ESP32 GPIO22
 *   ADS1115 ADDR → GND (I2C addr 0x48)
 *
 * Serial output format (CSV):
 *   timestamp_ms,voltage_uV,channel\n
 */

#include <WiFi.h>
#include <Adafruit_ADS1X15.h>
#include <WebSocketsServer.h>

// ============================================================
// CONFIGURATION
// ============================================================
// WiFi — set before flashing or configure via serial
const char* WIFI_SSID = "";
const char* WIFI_PASS = "";

// ADS1115
Adafruit_ADS1115 ads;
const int ADS_GAIN = 16;   // ±0.256V, 7.8µV per LSB for plant signals
const float ADS_LSB = 0.0078125; // mV per LSB at GAIN=16
const int SAMPLE_RATE = 250; // Hz (for plant signals, 0.1-100Hz bandwidth)
unsigned long sampleInterval;

// Pins
const int LED_PIN = 2;
const int STIMULUS_PIN = 4; // Optional: trigger input for stimulus logging

// State
WebSocketsServer webSocket(81);
bool wifiConnected = false;
unsigned long lastSampleTime = 0;
unsigned long sampleCount = 0;
char outputBuffer[64];

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(STIMULUS_PIN, INPUT_PULLUP);

  // Initialize LED
  digitalWrite(LED_PIN, LOW);

  // Initialize ADC
  Wire.begin(21, 22); // SDA, SCL for ESP32-S3
  if (!ads.begin(0x48)) {
    Serial.println("ERROR:ADS1115 not found");
    while (1) { delay(100); }
  }

  // Configure ADC
  ads.setGain(ADS_GAIN);
  ads.setDataRate(SAMPLE_RATE); // Requested rate, actual may vary

  sampleInterval = 1000000 / SAMPLE_RATE;
  lastSampleTime = micros();

  // Connect WiFi (if configured)
  if (strlen(WIFI_SSID) > 0) {
    connectWiFi();
  }

  // Ready signal
  Serial.println("BioEcho ESP32 v1.0");
  Serial.print("Sample rate: "); Serial.print(SAMPLE_RATE); Serial.println(" Hz");
  Serial.println("Output format: timestamp_ms,voltage_uV,channel");
  Serial.println("Ready");

  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH); delay(100);
    digitalWrite(LED_PIN, LOW);  delay(100);
  }
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
  // Handle WebSocket
  if (wifiConnected) {
    webSocket.loop();
  }

  // Sample at precise interval
  unsigned long now = micros();
  if (now - lastSampleTime >= sampleInterval) {
    lastSampleTime += sampleInterval;

    // Read differential voltage (AIN0 - AIN1)
    int16_t adcValue = ads.readADC_Differential_0_1();
    float voltage_uV = adcValue * ADS_LSB * 1000.0; // Convert to µV

    // Apply calibration offset
    // (measure with electrodes shorted to find baseline)
    static float offset = 0;
    static int calSamples = 0;
    if (calSamples < 100) {
      offset += voltage_uV;
      calSamples++;
      if (calSamples == 100) {
        offset /= 100;
        Serial.print("Calibration complete. Offset: "); Serial.print(offset); Serial.println(" µV");
      }
    }
    float calibrated = voltage_uV - offset;

    // Output via USB Serial (for Web Serial API)
    unsigned long timestamp = millis();
    snprintf(outputBuffer, sizeof(outputBuffer), "%lu,%.2f,0", timestamp, calibrated);
    Serial.println(outputBuffer);

    // Output via WebSocket (for WiFi clients)
    if (wifiConnected) {
      webSocket.broadcastTXT(outputBuffer);
    }

    sampleCount++;

    // LED on every 1000 samples
    if (sampleCount % 1000 == 0) {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    }
  }

  // Check for stimulus trigger (touch sensor or button)
  static int lastStimulusState = HIGH;
  int stimulusState = digitalRead(STIMULUS_PIN);
  if (stimulusState == LOW && lastStimulusState == HIGH) {
    Serial.println("STIMULUS: touch");
  }
  lastStimulusState = stimulusState;
}

// ============================================================
// WIFI
// ============================================================
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("WebSocket: ws://");
    Serial.print(WiFi.localIP());
    Serial.println(":81");
  } else {
    wifiConnected = false;
    Serial.println("WiFi failed. Running USB-only mode.");
  }
  digitalWrite(LED_PIN, LOW);
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      break;
    case WStype_CONNECTED:
      webSocket.sendTXT(num, "{\"type\":\"connected\",\"sampleRate\":250,\"channels\":1}");
      break;
    case WStype_TEXT:
      // Handle commands: {"cmd":"stimulus","type":"water"}
      // Payload available as (char*)payload
      break;
  }
}
