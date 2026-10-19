/*
 * LedOnOff: switch an LED on and off from a phone.
 *
 * The phone page sends one value over Bluetooth, led. It is true or false. When it arrives,
 * this sketch turns the LED on D9 on or off.
 *
 * It pairs with the phone page in the folder above this one, 01-led-on-off.
 * Open that page in Chrome on Android or on a laptop. On an iPhone, open it in the Bluefy app.
 *
 * THE VALUE
 * The name, the type and the order must be the same on the board and on the phone.
 *
 *   name   led
 *   type   bool, which is true or false
 *   goes   from the phone to the board
 *   board  ble.receiveBool("led");
 *   phone  { name: 'led', type: 'bool', write: true }
 *
 * "receive" is the board's side. The phone writes and the board receives.
 *
 * Open the Serial Monitor at 115200 baud. It prints "led on" or "led off" each time the
 * phone sends one.
 *
 * WIRING
 *
 *   board D9                       to  one end of a 220 ohm resistor
 *   the other end of the resistor  to  the LED's long leg
 *   the LED's short leg            to  board GND
 *
 * An LED only works one way round. The long leg is the plus side. The short leg is next to
 * the flat edge of the LED. Never wire an LED to a pin with no resistor.
 *
 * Needs the library P5PhoneBLE (0.1.1 or later). Board: Arduino UNO R4 WiFi.
 */

#include <P5PhoneBLE.h>

// Every board in the room has a name. Change yourname to your own name, so you can find
// your board in the phone's list. Keep p5phone- at the start.
const char* BOARD_NAME = "p5phone-yourname";

const int LED_PIN = 9;   // the pin the LED is wired to

P5PhoneBLE ble;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  // Declare the value before begin(). The phone page declares the same one
  ble.receiveBool("led");
  ble.setDebug(true);              // print connects and disconnects
  ble.setStatusLED(LED_BUILTIN);   // the board's own LED: blinking while it waits, solid when connected
  bool started = ble.begin(BOARD_NAME);

  Serial.println(started ? "LedOnOff is waiting for a phone." : "Bluetooth did not start.");
  Serial.print("The board is called ");
  Serial.println(BOARD_NAME);
}

void loop() {
  ble.update();   // always first

  // changed() is true once for each new value the phone sends
  if (ble.changed("led")) {
    bool on = ble.getBool("led");
    digitalWrite(LED_PIN, on ? HIGH : LOW);
    Serial.println(on ? "led on" : "led off");
  }
}
