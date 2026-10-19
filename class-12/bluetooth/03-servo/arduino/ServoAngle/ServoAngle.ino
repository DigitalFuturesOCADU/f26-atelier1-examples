/*
 * ServoAngle: turn a servo from a phone.
 *
 * The phone page sends one number over Bluetooth, angle. It goes from 0 to 180, and it
 * follows how far you tilt the phone left and right. This sketch gives the number to a
 * servo, and the servo arm turns to that angle.
 *
 * It pairs with the phone page in the folder above this one, 03-servo.
 * Open that page in Chrome on Android or on a laptop. On an iPhone, open it in the Bluefy app.
 *
 * THE VALUE
 * The name, the type and the order must be the same on the board and on the phone.
 *
 *   name   angle
 *   type   uint8, which is one byte, a whole number from 0 to 255. This page sends 0 to 180
 *   goes   from the phone to the board
 *   board  ble.receiveByte("angle");
 *   phone  { name: 'angle', type: 'uint8', write: true }
 *
 * "receive" is the board's side. The phone writes and the board receives.
 *
 * Open the Serial Monitor at 115200 baud. It prints each angle as it arrives.
 *
 * WIRING (a small servo such as an SG90)
 *
 *   servo red wire                       to  board 5V
 *   servo brown or black wire            to  board GND
 *   servo signal wire, orange or yellow  to  board D10
 *
 * Connect GND first and 5V last.
 * One small servo can run from the board's 5V while the board is on USB. If the board resets
 * or the servo twitches, the servo wants more power than USB gives. Run it from its own 5V
 * supply and join that supply's GND to the board's GND.
 *
 * Needs the library P5PhoneBLE (0.1.1 or later) and the Servo library. The Servo library
 * comes with the Arduino IDE. If #include <Servo.h> is not found, install Servo from the
 * Library Manager. Board: Arduino UNO R4 WiFi.
 */

#include <P5PhoneBLE.h>
#include <Servo.h>

// Every board in the room has a name. Change yourname to your own name, so you can find
// your board in the phone's list. Keep p5phone- at the start.
const char* BOARD_NAME = "p5phone-yourname";

const int SERVO_PIN = 10;     // the pin the servo's signal wire is on
const int START_ANGLE = 90;   // where the arm waits before the phone says anything

P5PhoneBLE ble;
Servo servo;

void setup() {
  Serial.begin(115200);

  servo.attach(SERVO_PIN);
  servo.write(START_ANGLE);

  // Declare the value before begin(). The phone page declares the same one
  ble.receiveByte("angle");
  ble.setDebug(true);              // print connects and disconnects
  ble.setStatusLED(LED_BUILTIN);   // the board's own LED: blinking while it waits, solid when connected
  bool started = ble.begin(BOARD_NAME);

  Serial.println(started ? "ServoAngle is waiting for a phone." : "Bluetooth did not start.");
  Serial.print("The board is called ");
  Serial.println(BOARD_NAME);
}

void loop() {
  ble.update();   // always first

  // changed() is true once for each new value the phone sends
  if (ble.changed("angle")) {
    int angle = constrain(ble.getInt("angle"), 0, 180);   // a servo only turns 0 to 180
    servo.write(angle);
    Serial.print("angle ");
    Serial.println(angle);
  }
}
