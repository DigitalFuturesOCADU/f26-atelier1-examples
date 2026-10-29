/*
 * Example 2: Light to Phone (the board side)
 *
 * A light sensor on this board sets the brightness of your phone screen.
 * Cover the sensor with your hand and the screen goes dark.
 * The board sends one number, the light, from 0 (dark) to 1023 (bright).
 *
 * The p5 sketch that goes with it:
 *   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/2-light-to-phone/
 *   or on the p5 Web Editor: https://editor.p5js.org/npuckett/sketches/1hCrYYrDl
 *
 * BEFORE YOU UPLOAD
 *   BOARD_NUMBER starts at 900, the class demo board. Change it to your own number. Put the same number in the p5 sketch.
 *
 * WIRING (a light sensor, called an LDR, and a 10k resistor)
 *   one leg of the LDR       to  5V
 *   the other leg of the LDR to  A0
 *   10k resistor             from A0 to GND
 *   The LDR goes either way round.
 *
 * Board: Arduino UNO R4 WiFi. Library: ArduinoBLE (install it from the Library Manager).
 * Serial Monitor: 115200 baud. It prints each light reading it sends.
 */

#include <ArduinoBLE.h>

// 1. YOUR BOARD NUMBER
// Three digits, from 001 to 999. The same number goes in the p5 sketch.
#define BOARD_NUMBER "900"

// 2. THE ADDRESSES (UUIDs). Each one ends in your board number.
BLEService boardService("19b10000-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER);

// The light: two bytes (0 to 65535), enough for 0 to 1023.
// BLERead lets the phone ask for it. BLENotify lets the board send it each time it changes.
BLEUnsignedShortCharacteristic lightCharacteristic("19b10002-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER, BLERead | BLENotify);

// 3. THE SENSOR
const int LIGHT_PIN = A0;
const int MIN_CHANGE = 10;    // send only when the light moves by this much or more
const int EVERY_MS = 50;      // look at the sensor 20 times a second

int lastSent = -1000;
unsigned long lastLook = 0;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  // 4. START BLUETOOTH AND ADVERTISE
  startBluetooth();
  BLE.setLocalName("Board-" BOARD_NUMBER);
  BLE.setAdvertisedService(boardService);
  boardService.addCharacteristic(lightCharacteristic);
  BLE.addService(boardService);
  lightCharacteristic.writeValue(0);
  BLE.advertise();

  Serial.println("Board-" BOARD_NUMBER " is waiting for a phone");
}

void loop() {
  // 5. LET BLUETOOTH DO ITS WORK. Call this every time through the loop.
  BLE.poll();
  digitalWrite(LED_BUILTIN, BLE.connected() ? HIGH : LOW);

  // 6. READ THE SENSOR, 20 times a second
  if (millis() - lastLook < EVERY_MS) return;
  lastLook = millis();
  int light = analogRead(LIGHT_PIN);

  // 7. SEND IT, only when it has changed enough. The phone gets it at once.
  if (abs(light - lastSent) >= MIN_CHANGE) {
    lightCharacteristic.writeValue(light);
    lastSent = light;
    Serial.print("light ");
    Serial.println(light);
  }
}

// You don't need to change this.
// Starts Bluetooth. The R4's radio is a second chip that does not restart when you upload.
// If it is stuck from the last sketch, this restarts it, which takes a few seconds.
#include <WiFiS3.h>
extern ModemClass modem;

void startBluetooth() {
  if (BLE.begin()) return;
  Serial.println("Restarting the radio...");
  std::string reply = "";
  modem.write(std::string(PROMPT(_RESET)), reply, CMD(_RESET));
  for (int i = 0; i < 10; i++) {
    delay(1000);
    if (BLE.begin()) return;
  }
  Serial.println("Bluetooth did not start. Unplug the board, plug it back in, and try again.");
  Serial.println("Still stuck? Update the radio firmware (Tools > Firmware Updater).");
  while (true) {
    // blink fast: something is wrong
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    delay(100);
  }
}
