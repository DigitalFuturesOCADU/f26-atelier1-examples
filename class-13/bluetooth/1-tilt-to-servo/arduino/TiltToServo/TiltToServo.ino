/*
 * Example 1: Tilt to Servo (the board side)
 *
 * Tilt your phone left and right, and a servo on this board turns to match.
 * The phone sends one number, the angle, from 0 to 180.
 * This sketch waits for that number and gives it to the servo.
 *
 * The p5 sketch that goes with it:
 *   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/1-tilt-to-servo/
 *   or on the p5 Web Editor: https://editor.p5js.org/npuckett/sketches/IIBeEjtN-
 *
 * BEFORE YOU UPLOAD
 *   BOARD_NUMBER starts at 900, the class demo board. Change it to your own number. Put the same number in the p5 sketch.
 *
 * WIRING (a small servo, such as an SG90)
 *   brown or black wire     to  GND
 *   red wire                to  5V
 *   orange or yellow wire   to  pin 4
 *
 * Board: Arduino UNO R4 WiFi. Library: ArduinoBLE (install it from the Library Manager).
 * Servo comes with the Arduino IDE.
 * Serial Monitor: 115200 baud. It prints each angle as it arrives.
 */

#include <ArduinoBLE.h>
#include <Servo.h>

// 1. YOUR BOARD NUMBER
// Three digits, from 001 to 999. The same number goes in the p5 sketch.
// It is the end of every address below, so your phone finds your board and no other.
#define BOARD_NUMBER "900"

// 2. THE ADDRESSES (UUIDs)
// A service holds the values. Each value is a characteristic with its own address.
// C++ joins two pieces of text written side by side, so the first address
// ends up as 19b10000-e8f2-537e-4f6c-d104768a1900.
BLEService boardService("19b10000-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER);

// The angle: one byte (0 to 255). BLEWrite means the phone writes it.
BLEByteCharacteristic angleCharacteristic("19b10001-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER, BLEWrite);

// 3. THE SERVO
const int SERVO_PIN = 4;
Servo servo;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  servo.attach(SERVO_PIN);
  servo.write(90);   // start in the middle

  // 4. START BLUETOOTH AND ADVERTISE
  startBluetooth();
  BLE.setLocalName("Board-" BOARD_NUMBER);   // the name the phone shows in its list
  BLE.setAdvertisedService(boardService);     // the address the phone looks for
  boardService.addCharacteristic(angleCharacteristic);
  BLE.addService(boardService);
  angleCharacteristic.writeValue(90);
  BLE.advertise();

  Serial.println("Board-" BOARD_NUMBER " is waiting for a phone");
}

void loop() {
  // 5. LET BLUETOOTH DO ITS WORK. Call this every time through the loop.
  BLE.poll();

  // the L light is on while a phone is connected
  digitalWrite(LED_BUILTIN, BLE.connected() ? HIGH : LOW);

  // 6. A NEW ANGLE ARRIVED: turn the servo
  if (angleCharacteristic.written()) {
    int angle = angleCharacteristic.value();
    angle = constrain(angle, 0, 180);
    servo.write(angle);
    Serial.print("angle ");
    Serial.println(angle);
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
