/*
 * Demo Board: every Class 13 example on one board, with no upload between them
 *
 * For demonstrating. Each student example does one thing. This sketch holds all of
 * their values at once, at the same addresses, so every example page works with it:
 *
 *   address ending   value    used by                         the board
 *   0001             angle    1 Tilt to Servo, 3, 5 (tilt)    turns the servo on pin 4
 *   0002             light    2 Light to Phone, 3             sends the light sensor on A0
 *   0003             rssi     4 Proximity                     sends the partner board's signal
 *   0004             mouth    5 Face to Board                 flashes the LED matrix
 *
 * 0 Find Your Board finds it too: it advertises Board- and its number, and shows the
 * number on the LED matrix whenever the mouth is not flashing it.
 *
 * Every page, its Web Editor copy and a QR code, for one board number:
 *   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/demo/?board=900
 *
 * A page only asks for the values it uses, so the extra ones do no harm.
 * A board takes one phone or laptop at a time. Disconnect before opening the next example.
 *
 * Two demo boards: set BOARD_NUMBER and PARTNER_NUMBER on each, crossed over.
 *   Board 900: BOARD_NUMBER "900", PARTNER_NUMBER "901"
 *   Board 901: BOARD_NUMBER "901", PARTNER_NUMBER "900"
 *
 * WIRING (the parts are optional: a board with nothing wired still does 0, 4 and the matrix)
 *   Servo: brown or black to GND, red to 5V, orange or yellow to pin 4
 *   Light sensor (LDR): one leg to 5V, the other to A0. A 10k resistor from A0 to GND
 *
 * Board: Arduino UNO R4 WiFi. Libraries: ArduinoBLE and ArduinoGraphics.
 * Servo comes with the IDE. Arduino_LED_Matrix comes with the UNO R4 boards package.
 * Serial Monitor: 115200 baud. A status line every 2 seconds, and each value as it moves.
 */

#include <ArduinoBLE.h>
#include <Servo.h>
#include <ArduinoGraphics.h>      // before Arduino_LED_Matrix.h, for text
#include <Arduino_LED_Matrix.h>
#include <WiFiS3.h>

// 1. THIS BOARD AND ITS PARTNER
#define BOARD_NUMBER "900"
#define PARTNER_NUMBER "901"

// 2. THE ADDRESSES: the same as in the examples
BLEService boardService("19b10000-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER);
BLEByteCharacteristic angleCharacteristic("19b10001-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER, BLEWrite);
BLEUnsignedShortCharacteristic lightCharacteristic("19b10002-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER, BLERead | BLENotify);
BLECharCharacteristic rssiCharacteristic("19b10003-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER, BLERead | BLENotify);
BLEBoolCharacteristic mouthCharacteristic("19b10004-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER, BLEWrite);
const char* PARTNER_SERVICE = "19b10000-e8f2-537e-4f6c-d104768a1" PARTNER_NUMBER;

// 3. THE PARTS AND THE FEEL (the same values as the examples)
const int SERVO_PIN = 4;
const int LIGHT_PIN = A0;
const int MIN_CHANGE = 10;        // light: send when it moves by this much
const float SMOOTHING = 0.2;      // partner signal: 0.1 slow and steady, 0.5 fast and jumpy
const int LOST_AFTER_MS = 3000;   // partner: no signal this long means gone
const int FLASH_MS = 120;         // mouth: how fast the matrix flashes

Servo servo;
ArduinoLEDMatrix matrix;
const uint32_t ALL_ON[] = { 0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF };
const uint32_t ALL_OFF[] = { 0, 0, 0 };

int lastLight = -1000;
float smoothRssi = -100;
unsigned long lastHeard = 0, lastLook = 0, lastRssiSend = 0, lastFlash = 0, lastStatus = 0;
bool mouthOpen = false, lit = false, wasConnected = false;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  servo.attach(SERVO_PIN);
  servo.write(90);
  matrix.begin();

  bool ok = startBluetooth();
  showNumber(ok ? BOARD_NUMBER : "BT?");
  if (!ok) {
    Serial.println("Bluetooth did not start. Update the radio firmware, then unplug and plug in again.");
    while (true) {}
  }

  BLE.setLocalName("Board-" BOARD_NUMBER);
  BLE.setAdvertisedService(boardService);
  boardService.addCharacteristic(angleCharacteristic);
  boardService.addCharacteristic(lightCharacteristic);
  boardService.addCharacteristic(rssiCharacteristic);
  boardService.addCharacteristic(mouthCharacteristic);
  BLE.addService(boardService);
  angleCharacteristic.writeValue(90);
  lightCharacteristic.writeValue(0);
  rssiCharacteristic.writeValue(-100);
  mouthCharacteristic.writeValue(false);
  BLE.advertise();
  BLE.scanForUuid(PARTNER_SERVICE, true);   // listen for the partner, every advert

  Serial.println("Demo Board-" BOARD_NUMBER ", partner Board-" PARTNER_NUMBER);
}

void loop() {
  BLE.poll();

  // a page connected: advertise again, so the partner still hears this board
  bool connected = BLE.connected();
  if (connected && !wasConnected) BLE.advertise();
  if (connected != wasConnected) Serial.println(connected ? "page connected" : "page left");
  wasConnected = connected;
  digitalWrite(LED_BUILTIN, connected ? HIGH : LOW);

  // 0001 angle: turn the servo (Examples 1, 3 and 5)
  if (angleCharacteristic.written()) {
    int angle = constrain(angleCharacteristic.value(), 0, 180);
    servo.write(angle);
    Serial.print("angle ");
    Serial.println(angle);
  }

  // 0004 mouth: flash the matrix while true (Example 5)
  if (mouthCharacteristic.written()) {
    mouthOpen = mouthCharacteristic.value();
    Serial.println(mouthOpen ? "mouth open" : "mouth closed");
    if (!mouthOpen) {
      lit = false;
      showNumber(BOARD_NUMBER);   // back to the number
    }
  }
  if (mouthOpen && millis() - lastFlash >= FLASH_MS) {
    lastFlash = millis();
    lit = !lit;
    matrix.loadFrame(lit ? ALL_ON : ALL_OFF);
  }

  // 0002 light: send it when it changes (Examples 2 and 3)
  if (millis() - lastLook >= 50) {
    lastLook = millis();
    int light = analogRead(LIGHT_PIN);
    if (abs(light - lastLight) >= MIN_CHANGE) {
      lightCharacteristic.writeValue(light);
      lastLight = light;
    }
  }

  // 0003 rssi: the partner's signal, smoothed (Example 4)
  BLEDevice partner = BLE.available();
  if (partner) {
    int rssi = partner.rssi();
    if (rssi < 0) {
      if (millis() - lastHeard > LOST_AFTER_MS) smoothRssi = rssi;
      else smoothRssi += (rssi - smoothRssi) * SMOOTHING;
      lastHeard = millis();
    }
  }
  if (millis() - lastHeard > LOST_AFTER_MS) smoothRssi = -100;
  if (millis() - lastRssiSend >= 200) {
    lastRssiSend = millis();
    int value = (int)round(smoothRssi);
    if (value != rssiCharacteristic.value()) rssiCharacteristic.writeValue(value);
  }

  // a status line every 2 seconds, for the Serial Monitor on the projector
  if (millis() - lastStatus >= 2000) {
    lastStatus = millis();
    Serial.print("Board-" BOARD_NUMBER "  firmware ");
    Serial.print(WiFi.firmwareVersion());
    Serial.print("  page ");
    Serial.print(connected ? "connected" : "none");
    Serial.print("  light ");
    Serial.print(lastLight);
    Serial.print("  partner ");
    Serial.println((int)round(smoothRssi));
  }
}

// the board number on the LED matrix. Three digits, 4 dots wide each, just fit
void showNumber(const char* words) {
  matrix.beginDraw();
  matrix.clear();
  matrix.stroke(0xFFFFFFFF);
  matrix.textFont(Font_4x6);
  matrix.beginText(0, 1, 0xFFFFFF);
  matrix.print(words);
  matrix.endText();
  matrix.endDraw();
}

// Starts Bluetooth. The R4's radio is a second chip that does not restart when you upload.
// If it is stuck from the last sketch, this restarts it, which takes a few seconds.
extern ModemClass modem;

bool startBluetooth() {
  if (BLE.begin()) return true;
  Serial.println("Restarting the radio...");
  std::string reply = "";
  modem.write(std::string(PROMPT(_RESET)), reply, CMD(_RESET));
  for (int i = 0; i < 10; i++) {
    delay(1000);
    if (BLE.begin()) return true;
  }
  return false;
}
