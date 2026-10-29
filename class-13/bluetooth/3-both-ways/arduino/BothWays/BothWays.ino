/*
 * Example 3: Both Ways (the board side)
 *
 * Examples 1 and 2 at the same time, on one connection.
 *   phone to board: tilt the phone and the servo turns (the angle, 0 to 180)
 *   board to phone: the light sensor sets the brightness of the phone screen (0 to 1023)
 *
 * The code is Example 1 and Example 2 put together. The addresses are the same as in
 * those examples: the angle ends in 0001 and the light ends in 0002.
 *
 * The p5 sketch that goes with it:
 *   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/3-both-ways/
 *   or on the p5 Web Editor: https://editor.p5js.org/npuckett/sketches/tlnvkn_Aq
 *
 * BEFORE YOU UPLOAD
 *   BOARD_NUMBER starts at 900, the class demo board. Change it to your own number. Put the same number in the p5 sketch.
 *
 * WIRING
 *   Servo: brown or black to GND, red to 5V, orange or yellow to pin 4
 *   Light sensor (LDR): one leg to 5V, the other leg to A0
 *   10k resistor: from A0 to GND
 *
 * Board: Arduino UNO R4 WiFi. Library: ArduinoBLE (install it from the Library Manager).
 * Servo comes with the Arduino IDE.
 * Serial Monitor: 115200 baud. It prints what arrives and what it sends.
 */

#include <ArduinoBLE.h>
#include <Servo.h>

// 1. YOUR BOARD NUMBER
// Three digits, from 001 to 999. The same number goes in the p5 sketch.
#define BOARD_NUMBER "900"

// 2. THE ADDRESSES (UUIDs). One service, two values in it.
BLEService boardService("19b10000-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER);

// phone to board: the angle, one byte. The phone writes it.
BLEByteCharacteristic angleCharacteristic("19b10001-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER, BLEWrite);

// board to phone: the light, two bytes. The board sends it when it changes.
BLEUnsignedShortCharacteristic lightCharacteristic("19b10002-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER, BLERead | BLENotify);

// 3. THE SERVO AND THE SENSOR
const int SERVO_PIN = 4;
const int LIGHT_PIN = A0;
const int MIN_CHANGE = 10;    // send the light only when it moves by this much or more
const int EVERY_MS = 50;      // look at the sensor 20 times a second

Servo servo;
int lastSent = -1000;
unsigned long lastLook = 0;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  servo.attach(SERVO_PIN);
  servo.write(90);

  // 4. START BLUETOOTH AND ADVERTISE. Both values go in the one service
  startBluetooth();
  BLE.setLocalName("Board-" BOARD_NUMBER);
  BLE.setAdvertisedService(boardService);
  boardService.addCharacteristic(angleCharacteristic);
  boardService.addCharacteristic(lightCharacteristic);
  BLE.addService(boardService);
  angleCharacteristic.writeValue(90);
  lightCharacteristic.writeValue(0);
  BLE.advertise();

  Serial.println("Board-" BOARD_NUMBER " is waiting for a phone");
}

void loop() {
  // 5. LET BLUETOOTH DO ITS WORK. Call this every time through the loop.
  BLE.poll();
  digitalWrite(LED_BUILTIN, BLE.connected() ? HIGH : LOW);

  // 6. PHONE TO BOARD: a new angle arrived, so turn the servo (as in Example 1)
  if (angleCharacteristic.written()) {
    int angle = constrain(angleCharacteristic.value(), 0, 180);
    servo.write(angle);
    Serial.print("angle ");
    Serial.println(angle);
  }

  // 7. BOARD TO PHONE: read the light and send it when it changed (as in Example 2)
  if (millis() - lastLook >= EVERY_MS) {
    lastLook = millis();
    int light = analogRead(LIGHT_PIN);
    if (abs(light - lastSent) >= MIN_CHANGE) {
      lightCharacteristic.writeValue(light);
      lastSent = light;
      Serial.print("light ");
      Serial.println(light);
    }
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
