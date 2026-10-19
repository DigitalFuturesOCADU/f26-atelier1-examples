/*
 * LedBrightness: set how bright an LED is from a phone.
 *
 * The phone page sends one number over Bluetooth, brightness. It goes from 0 to 255, and it
 * follows how far you tilt the phone. This sketch gives the number to the LED on D9 with
 * analogWrite(), so 0 is off and 255 is full bright.
 *
 * It pairs with the phone page in the folder above this one, 02-led-brightness.
 * Open that page in Chrome on Android or on a laptop. On an iPhone, open it in the Bluefy app.
 *
 * THE VALUE
 * The name, the type and the order must be the same on the board and on the phone.
 *
 *   name   brightness
 *   type   uint8, which is one byte, a whole number from 0 to 255
 *   goes   from the phone to the board
 *   board  ble.receiveByte("brightness");
 *   phone  { name: 'brightness', type: 'uint8', write: true }
 *
 * "receive" is the board's side. The phone writes and the board receives.
 *
 * Open the Serial Monitor at 115200 baud. It prints each brightness as it arrives.
 *
 * WIRING
 *
 *   board D9                       to  one end of a 220 ohm resistor
 *   the other end of the resistor  to  the LED's long leg
 *   the LED's short leg            to  board GND
 *
 * An LED only works one way round. The long leg is the plus side. The short leg is next to
 * the flat edge of the LED. Never wire an LED to a pin with no resistor.
 * D9 is a PWM pin, which is what lets analogWrite() dim the LED. Not every pin can do that.
 * On the R4 they are D3, D5, D6, D9, D10 and D11.
 *
 * Needs the library P5PhoneBLE (0.1.1 or later). Board: Arduino UNO R4 WiFi.
 */

#include <P5PhoneBLE.h>

// Every board in the room has a name. Change yourname to your own name, so you can find
// your board in the phone's list. Keep p5phone- at the start.
const char* BOARD_NAME = "p5phone-yourname";

const int LED_PIN = 9;   // the pin the LED is wired to. It must be a PWM pin

P5PhoneBLE ble;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  // Declare the value before begin(). The phone page declares the same one
  ble.receiveByte("brightness");
  ble.setDebug(true);              // print connects and disconnects
  ble.setStatusLED(LED_BUILTIN);   // the board's own LED: blinking while it waits, solid when connected
  bool started = ble.begin(BOARD_NAME);

  Serial.println(started ? "LedBrightness is waiting for a phone." : "Bluetooth did not start.");
  Serial.print("The board is called ");
  Serial.println(BOARD_NAME);
}

void loop() {
  ble.update();   // always first

  // changed() is true once for each new value the phone sends
  if (ble.changed("brightness")) {
    int brightness = ble.getInt("brightness");   // getInt() works on a byte too
    analogWrite(LED_PIN, brightness);
    Serial.print("brightness ");
    Serial.println(brightness);
  }
}
