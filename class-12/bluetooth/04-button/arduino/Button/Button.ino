/*
 * Button: tell a phone when a button is pressed.
 *
 * The board reads a pushbutton and sends one value over Bluetooth, button. It is true while
 * the button is held down and false when it is let go. The phone page shows it and counts
 * the presses.
 *
 * It pairs with the phone page in the folder above this one, 04-button.
 * Open that page in Chrome on Android or on a laptop. On an iPhone, open it in the Bluefy app.
 *
 * THE VALUE
 * The name, the type and the order must be the same on the board and on the phone.
 *
 *   name   button
 *   type   bool, which is true or false
 *   goes   from the board to the phone
 *   board  ble.sendBool("button");
 *   phone  { name: 'button', type: 'bool', notify: true }
 *
 * "send" is the board's side. The board sends and the phone is notified. Notify means the
 * board tells the phone each time the value changes. The phone does not have to ask.
 *
 * Open the Serial Monitor at 115200 baud. It prints "button pressed" and "button released"
 * on every press, with no phone needed. Use it to check your wiring first.
 *
 * WIRING
 *
 *   one leg of the button        to  board D2
 *   the other leg of the button  to  board GND
 *
 * No resistor is needed. INPUT_PULLUP turns on a resistor inside the board. The pin reads
 * HIGH when the button is up and LOW when it is pressed.
 * A small button has four legs. Use two legs that are on opposite corners.
 * The R4 WiFi has no button of its own to use here, only the reset button, so wire one.
 *
 * Needs the library P5PhoneBLE (0.1.1 or later). Board: Arduino UNO R4 WiFi.
 */

#include <P5PhoneBLE.h>

// Every board in the room has a name. Change yourname to your own name, so you can find
// your board in the phone's list. Keep p5phone- at the start.
const char* BOARD_NAME = "p5phone-yourname";

const int BUTTON_PIN = 2;                // the pin the button is wired to
const unsigned long DEBOUNCE_MS = 20;    // a button chatters for a few milliseconds each time it is pressed

P5PhoneBLE ble;

bool pressed = false;           // the state we trust
bool lastReading = false;       // what the pin said last time
unsigned long changedAt = 0;    // when the pin last changed

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // Declare the value before begin(). The phone page declares the same one
  ble.sendBool("button");
  ble.setDebug(true);              // print connects and disconnects
  ble.setStatusLED(LED_BUILTIN);   // the board's own LED: blinking while it waits, solid when connected
  bool started = ble.begin(BOARD_NAME);

  Serial.println(started ? "Button is waiting for a phone." : "Bluetooth did not start.");
  Serial.print("The board is called ");
  Serial.println(BOARD_NAME);
}

void loop() {
  ble.update();   // always first

  bool reading = (digitalRead(BUTTON_PIN) == LOW);   // LOW means pressed
  if (reading != lastReading) {
    lastReading = reading;
    changedAt = millis();
  }

  // trust the reading once it has held still for a moment
  if (millis() - changedAt >= DEBOUNCE_MS && reading != pressed) {
    pressed = reading;
    Serial.println(pressed ? "button pressed" : "button released");
  }

  // set() only sends when the value has changed, so it is safe to call every time round
  ble.set("button", pressed);
}
