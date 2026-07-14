# BioEcho ESP32 DIY Plant Electrophysiology Node

## Hardware Requirements

| Component | Part | Cost | Source |
|-----------|------|------|--------|
| Microcontroller | ESP32-S3 Dev Board | $8-15 | Any ESP32-S3 dev module |
| ADC | ADS1115 16-bit I2C | $10 | Adafruit #1085 |
| Instrumentation Amp | INA128 or AD8226 | $5-8 | Digikey/Mouser |
| Electrodes | Ag/AgCl ECG electrodes OR stainless steel needles | $10-30 | Amazon or medical supply |
| Resistors | 10kΩ, 100kΩ (for INA128 gain set) | $1 | — |
| Wires | Shielded audio cable (for electrode connections) | $3 | — |
| Breadboard + jumpers | — | $10 | — |
| **Total** | | **~$50** | |

## Wiring Diagram

```
Plant electrode (+) ─── R1(10kΩ) ─┬─ INA128 pin 3 (+IN)
                                   │
                                  Shield GND
                                   │
Plant electrode (-) ─── R2(10kΩ) ─┬─ INA128 pin 2 (-IN)
                                   │
                                  GND

INA128 pin 8 (+) ─── VCC (3.3V)
INA128 pin 4 (-) ─── GND
INA128 pin 1 ─── RG1 ─┬─ 100Ω pot ─┬── RG2 ─── INA128 pin 8 (gain adjust)
INA128 pin 6 (OUT) ─── ADS1115 AIN0

ADS1115 VDD ─── 3.3V
ADS1115 GND ─── GND
ADS1115 SDA ─── ESP32 GPIO21
ADS1115 SCL ─── ESP32 GPIO22
ADS1115 ADDR ─── GND (I2C addr 0x48)
```

## Calibration

1. Short both electrode inputs together (connect them)
2. Upload firmware, open Serial Monitor at 115200 baud
3. Watch for "Calibration complete" message (~100 samples)
4. Note the offset value printed
5. Connect electrodes to plant (stem + leaf)
6. The signal should show baseline drift and occasional spikes

## Usage

### USB Mode (recommended for first use)
1. Connect ESP32 via USB
2. Open web app → select "USB Serial (SpikerBox / ESP32)"
3. Click Connect → select the ESP32 COM port

### WiFi Mode
1. Set WIFI_SSID and WIFI_PASS in the firmware
2. Flash and check serial output for IP address
3. Open web app → connect via WebSocket to `ws://ESP32_IP:81`

## Output Format

Lines are CSV: `timestamp_ms,voltage_uV,channel`

Example:
```
0,12.34,0
4,15.67,0
8,11.22,0
```

Channel 0 = primary plant electrode differential reading.

## Stimulus Input

Connect a touch sensor or button to GPIO4 (GND when triggered).
The firmware logs "STIMULUS: touch" when triggered, which the web app reads as an event marker.
