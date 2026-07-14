/*
 * BioEcho SpikerBox-Compatible Firmware
 * Replicates Backyard Brains Plant SpikerBox serial protocol
 * Hardware: Arduino Uno/Leonardo + instrumentation amplifier (AD623 + TLC2272)
 *
 * Pin mapping (BYB SpikerBox v0.24):
 *   A0 — Plant electrode input (through amplifier)
 *   D13 — LED indicator
 *
 * Serial protocol (CDC USB):
 *   Outbound: 16-bit little-endian samples continuously
 *   Inbound:  c:<channels>\n — set channel count
 *             s:<rate>\n  — set sample rate
 *             b:\n        — request board type
 */

#include <avr/pgmspace.h>

// Pin definitions
const int ELECTRODE_PIN = A0;
const int LED_PIN = 13;

// Configuration
int numChannels = 1;
int sampleRate = 10000;  // Hz (BYB default)
unsigned long sampleInterval;
unsigned long lastSampleTime = 0;

// ADC settings
const int ADC_BITS = 10;     // Arduino Uno 10-bit
const float ADC_REF = 5.0;   // Volts
int rawValue = 0;

// Serial buffer for command parsing
char serialBuffer[32];
int bufferIndex = 0;

void setup() {
  pinMode(ELECTRODE_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);
  while (!Serial) { delay(10); }

  // Send startup message (compatible with SpikeRecorder)
  Serial.println(F("BioEcho SpikerBox Compatible v1.0"));
  Serial.println(F("CURRENT_SHIELD_TYPE:PlantSpikerBox"));

  sampleInterval = 1000000 / sampleRate; // microseconds
  lastSampleTime = micros();

  // Blink to indicate ready
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH); delay(100);
    digitalWrite(LED_PIN, LOW);  delay(100);
  }
}

void loop() {
  // Handle incoming serial commands
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      serialBuffer[bufferIndex] = '\0';
      processCommand(serialBuffer);
      bufferIndex = 0;
    } else if (bufferIndex < sizeof(serialBuffer) - 1) {
      serialBuffer[bufferIndex++] = c;
    }
  }

  // Sample at configured rate
  unsigned long now = micros();
  if (now - lastSampleTime >= sampleInterval) {
    lastSampleTime += sampleInterval;

    // Read electrode signal
    rawValue = analogRead(ELECTRODE_PIN);

    // Convert to µV (BYB uses ~0.1µV per LSB after gain compensation)
    // Raw 10-bit: 0-1023 maps to 0-5V
    // With 72x gain: actual signal = reading * 5.0 / 1024 / 72 * 1e6 µV
    float voltage_uV = (rawValue / 1024.0) * ADC_REF / 72.0 * 1000000.0;

    // Send as 16-bit little-endian (BYB compatible)
    // Scale to fit int16 range (-32768 to 32767) at ~0.1µV per LSB
    int16_t output = (int16_t)(voltage_uV * 10.0);
    Serial.write((uint8_t*)&output, 2);

    // LED pulse on sample for debug
    if (sampleCount % 1000 == 0) {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    }
    sampleCount++;
  }
}

volatile unsigned long sampleCount = 0;

void processCommand(char* cmd) {
  if (cmd[0] == 'c' && cmd[1] == ':') {
    numChannels = atoi(cmd + 2);
    if (numChannels < 1) numChannels = 1;
    if (numChannels > 4) numChannels = 4;
  } else if (cmd[0] == 's' && cmd[1] == ':') {
    int newRate = atoi(cmd + 2);
    if (newRate >= 100 && newRate <= 50000) {
      sampleRate = newRate;
      sampleInterval = 1000000 / sampleRate;
    }
  } else if (cmd[0] == 'b' && cmd[1] == ':') {
    Serial.println(F("CURRENT_SHIELD_TYPE:PlantSpikerBox"));
  }
}
