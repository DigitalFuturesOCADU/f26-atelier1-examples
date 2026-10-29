/*
 * Example 5: Face to Board (the board side)
 *
 * A laptop camera watches your face. Tilt your head, and the servo tilts with it.
 * Open your mouth, and the LED matrix on the board flashes.
 * The p5 sketch sends two values:
 *   tilt    the head tilt as a servo angle, 0 to 180 (90 is a level head)
 *   mouth   true while the mouth is open, false when it closes
 *
 * The board does not know about faces. It gets an angle and a true or false, the same
 * as from a phone's tilt or a tap. The tilt uses the same address as the angle in
 * Examples 1 and 3, so Example 1's board sketch also follows your head.
 *
 * The p5 sketch that goes with it:
 *   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/5-face-to-board/
 *   or on the p5 Web Editor: https://editor.p5js.org/npuckett/sketches/l83G5eNmq
 *
 * BEFORE YOU UPLOAD
 *   BOARD_NUMBER starts at 900, the class demo board. Change it to your own number. Put the same number in the p5 sketch.
 *
 * WIRING (a small servo, such as an SG90)
 *   brown or black wire     to  GND
 *   red wire                to  5V
 *   orange or yellow wire   to  pin 4
 *   The LED matrix is on the board already.
 *
 * Board: Arduino UNO R4 WiFi. Library: ArduinoBLE (install it from the Library Manager).
 * Servo comes with the Arduino IDE. Arduino_LED_Matrix comes with the UNO R4 boards package.
 * Serial Monitor: 115200 baud.
 */

#include <ArduinoBLE.h>
#include <Servo.h>
#include <Arduino_LED_Matrix.h>

// 1. YOUR BOARD NUMBER
// Three digits, from 001 to 999. The same number goes in the p5 sketch.
#define BOARD_NUMBER "900"

// 2. THE ADDRESSES (UUIDs). One service, two values in it.
BLEService boardService("19b10000-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER);

// the head tilt as an angle, one byte. The same address as the angle in Example 1
BLEByteCharacteristic tiltCharacteristic("19b10001-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER, BLEWrite);

// the mouth: true or false
BLEBoolCharacteristic mouthCharacteristic("19b10004-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER, BLEWrite);

// 3. THE SERVO AND THE LED MATRIX
const int SERVO_PIN = 4;
const int FLASH_MS = 120;   // how fast the matrix flashes while the mouth is open

Servo servo;
ArduinoLEDMatrix matrix;

// the 12 x 8 matrix as three numbers. Every bit is one LED
const uint32_t ALL_ON[] = { 0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF };
const uint32_t ALL_OFF[] = { 0, 0, 0 };

bool mouthOpen = false;
bool lit = false;
unsigned long lastFlash = 0;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  servo.attach(SERVO_PIN);
  servo.write(90);
  matrix.begin();

  // 4. START BLUETOOTH AND ADVERTISE
  startBluetooth();
  BLE.setLocalName("Board-" BOARD_NUMBER);
  BLE.setAdvertisedService(boardService);
  boardService.addCharacteristic(tiltCharacteristic);
  boardService.addCharacteristic(mouthCharacteristic);
  BLE.addService(boardService);
  tiltCharacteristic.writeValue(90);
  mouthCharacteristic.writeValue(false);
  BLE.advertise();

  Serial.println("Board-" BOARD_NUMBER " is waiting for a laptop or phone");
}

void loop() {
  // 5. LET BLUETOOTH DO ITS WORK
  BLE.poll();
  digitalWrite(LED_BUILTIN, BLE.connected() ? HIGH : LOW);

  // 6. A NEW TILT: turn the servo
  if (tiltCharacteristic.written()) {
    int angle = constrain(tiltCharacteristic.value(), 0, 180);
    servo.write(angle);
    Serial.print("tilt ");
    Serial.println(angle);
  }

  // 7. THE MOUTH OPENED OR CLOSED
  if (mouthCharacteristic.written()) {
    mouthOpen = mouthCharacteristic.value();
    Serial.println(mouthOpen ? "mouth open" : "mouth closed");
  }

  // 8. FLASH THE MATRIX while the mouth is open. Dark when it is closed
  if (mouthOpen && millis() - lastFlash >= FLASH_MS) {
    lastFlash = millis();
    lit = !lit;
    matrix.loadFrame(lit ? ALL_ON : ALL_OFF);
  }
  if (!mouthOpen && lit) {
    lit = false;
    matrix.loadFrame(ALL_OFF);
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
