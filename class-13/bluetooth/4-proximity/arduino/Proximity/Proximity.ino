/*
 * Example 4: Proximity (the board side)
 *
 * Two boards, two people. Each board listens for its partner board, and measures how
 * strong its signal is. That strength is called RSSI. The closer the boards, the stronger it is.
 * Each board sends the strength to its own phone, and the phone shows how close the partner is.
 *
 * RSSI is a negative number, in dBm:
 *   about -40   the boards are touching
 *   about -60   an arm's length apart
 *   about -80   across a room
 *   -100        this sketch's number for "can't hear the partner at all"
 * It jumps around a lot. Hands, bodies and walls all change it. So the sketch smooths it.
 *
 * The p5 sketch that goes with it:
 *   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/4-proximity/
 *   or on the p5 Web Editor: https://editor.p5js.org/npuckett/sketches/0ClUw3Yn4
 *
 * BEFORE YOU UPLOAD
 *   Find a partner. Each of you sets two numbers:
 *     BOARD_NUMBER    your own number. The same number goes in your p5 sketch.
 *     PARTNER_NUMBER  your partner's number.
 *   For example, Sam is 004 and Ana is 011.
 *   Sam's board: BOARD_NUMBER "004", PARTNER_NUMBER "011". Ana's board: the other way round.
 *
 * WIRING: nothing. The board's own radio does the work.
 *
 * Board: Arduino UNO R4 WiFi. Library: ArduinoBLE (install it from the Library Manager).
 * Serial Monitor: 115200 baud. It prints the partner's strength once a second.
 */

#include <ArduinoBLE.h>

// 1. YOUR NUMBER AND YOUR PARTNER'S NUMBER. Three digits each.
#define BOARD_NUMBER "001"
#define PARTNER_NUMBER "002"

// 2. THE ADDRESSES (UUIDs)
// Your board advertises its own service, as in the other examples.
BLEService boardService("19b10000-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER);

// The partner's strength, sent to your phone. A signed byte, -128 to 127.
BLECharCharacteristic rssiCharacteristic("19b10003-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER, BLERead | BLENotify);

// The partner's service: the one address this board listens for. Every other signal is ignored.
const char* PARTNER_SERVICE = "19b10000-e8f2-537e-4f6c-d104768a1" PARTNER_NUMBER;

// 3. THE FEEL
const float SMOOTHING = 0.2;      // 0.1 is slow and steady. 0.5 is fast and jumpy
const int LOST_AFTER_MS = 3000;   // no signal for this long means the partner is gone
const int SEND_EVERY_MS = 200;    // tell the phone five times a second

float smoothRssi = -100;          // the partner's strength, smoothed
unsigned long lastHeard = 0;
unsigned long lastSend = 0;
unsigned long lastPrint = 0;
bool phoneWasConnected = false;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  // 4. START BLUETOOTH, ADVERTISE, AND LISTEN
  startBluetooth();
  BLE.setLocalName("Board-" BOARD_NUMBER);
  BLE.setAdvertisedService(boardService);
  boardService.addCharacteristic(rssiCharacteristic);
  BLE.addService(boardService);
  rssiCharacteristic.writeValue(-100);
  BLE.advertise();                         // so the partner board (and your phone) can find this one

  BLE.scanForUuid(PARTNER_SERVICE, true);  // listen for the partner. true means: report it every time

  Serial.println("Board-" BOARD_NUMBER " is listening for Board-" PARTNER_NUMBER);
}

void loop() {
  // 5. LET BLUETOOTH DO ITS WORK
  BLE.poll();

  // 6. KEEP ADVERTISING WHEN THE PHONE CONNECTS
  // A board stops advertising when a phone connects. Start again, or the partner loses you
  bool phoneConnected = BLE.connected();
  if (phoneConnected && !phoneWasConnected) {
    BLE.advertise();
  }
  phoneWasConnected = phoneConnected;
  digitalWrite(LED_BUILTIN, phoneConnected ? HIGH : LOW);

  // 7. HEARD THE PARTNER? Smooth its strength
  BLEDevice partner = BLE.available();
  if (partner) {
    int rssi = partner.rssi();
    if (rssi < 0) {                        // 127 means no reading. Skip it
      if (millis() - lastHeard > LOST_AFTER_MS) {
        smoothRssi = rssi;                   // the first reading after a gap: start from it
      } else {
        smoothRssi = smoothRssi + (rssi - smoothRssi) * SMOOTHING;
      }
      lastHeard = millis();
    }
  }

  // nothing for a while: the partner is gone, or switched off
  if (millis() - lastHeard > LOST_AFTER_MS) {
    smoothRssi = -100;
  }

  // 8. SEND IT TO THE PHONE, five times a second
  if (millis() - lastSend >= SEND_EVERY_MS) {
    lastSend = millis();
    int value = (int)round(smoothRssi);
    if (value != rssiCharacteristic.value()) {
      rssiCharacteristic.writeValue(value);
    }
  }

  // and print it once a second
  if (millis() - lastPrint >= 1000) {
    lastPrint = millis();
    Serial.print("partner ");
    Serial.println((int)round(smoothRssi));
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
