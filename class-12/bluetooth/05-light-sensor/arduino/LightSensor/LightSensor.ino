/*
 * LightSensor: tell a phone how bright the room is.
 *
 * The board reads a light sensor (an LDR) and sends one number over Bluetooth, light. It goes
 * from 0 in the dark to 1023 in bright light. The phone page turns its screen brighter and
 * darker to match.
 *
 * It pairs with the phone page in the folder above this one, 05-light-sensor.
 * Open that page in Chrome on Android or on a laptop. On an iPhone, open it in the Bluefy app.
 *
 * THE VALUE
 * The name, the type and the order must be the same on the board and on the phone.
 *
 *   name   light
 *   type   int32, a whole number. sendInt() sends four bytes, so the phone says int32
 *   goes   from the board to the phone
 *   board  ble.sendInt("light");
 *   phone  { name: 'light', type: 'int32', notify: true, read: true }
 *
 * "send" is the board's side. The board sends and the phone is notified. Notify means the
 * board tells the phone each time the value changes. The phone does not have to ask.
 *
 * A reading wobbles a little all the time. If the board sent every wobble it would flood the
 * radio. So it looks ten times a second, and it only sends when the reading has moved by
 * STEP or more.
 *
 * Open the Serial Monitor at 115200 baud. It prints each number it sends, with no phone
 * needed. Use it to check your wiring first. Cover the sensor with a finger and the number falls.
 *
 * WIRING
 *
 *   board 5V                           to  one leg of the LDR
 *   the other leg of the LDR           to  board A0, and also one end of the 10k resistor
 *   the other end of the 10k resistor  to  board GND
 *
 * An LDR has no plus or minus side, so it can go in either way round.
 * The LDR and the resistor share the voltage on A0. More light lowers the LDR's resistance,
 * so A0 gets closer to 5V and the number goes up.
 *
 * Needs the library P5PhoneBLE (0.1.1 or later). Board: Arduino UNO R4 WiFi.
 */

#include <P5PhoneBLE.h>

// Every board in the room has a name. Change yourname to your own name, so you can find
// your board in the phone's list. Keep p5phone- at the start.
const char* BOARD_NAME = "p5phone-yourname";

const int LDR_PIN = A0;                   // the pin the LDR and the 10k resistor meet at
const unsigned long LOOK_EVERY_MS = 100;  // how often to read the sensor. 100 is ten times a second
const int STEP = 8;                       // a change smaller than this is not worth sending

P5PhoneBLE ble;

int lastSent = -1000;           // the number the phone has. Far from any reading, so the first one is sent
unsigned long lastLookAt = 0;

void setup() {
  Serial.begin(115200);
  analogReadResolution(10);     // readings go from 0 to 1023

  // Declare the value before begin(). The phone page declares the same one
  ble.sendInt("light");
  ble.setDebug(true);              // print connects and disconnects
  ble.setStatusLED(LED_BUILTIN);   // the board's own LED: blinking while it waits, solid when connected
  bool started = ble.begin(BOARD_NAME);

  Serial.println(started ? "LightSensor is waiting for a phone." : "Bluetooth did not start.");
  Serial.print("The board is called ");
  Serial.println(BOARD_NAME);
}

void loop() {
  ble.update();   // always first

  if (millis() - lastLookAt < LOOK_EVERY_MS) {
    return;
  }
  lastLookAt = millis();

  int light = analogRead(LDR_PIN);
  if (abs(light - lastSent) >= STEP) {
    lastSent = light;
    ble.set("light", light);
    Serial.print("light ");
    Serial.println(light);
  }
}
