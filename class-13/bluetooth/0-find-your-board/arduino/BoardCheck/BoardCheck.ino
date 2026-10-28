/*
 * Board Check: is this board ready for Bluetooth?
 *
 * Upload this first. It checks three things and prints them in the Serial Monitor:
 *   1. the version of the radio firmware (the program on the board's second chip, which
 *      does the WiFi and the Bluetooth)
 *   2. whether Bluetooth starts
 *   3. the name and number this board advertises
 * It also shows your board number on the LED matrix, so you can tell your board from the rest.
 *
 * The p5 sketch that goes with it, Find Your Board:
 *   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/0-find-your-board/
 *
 * BEFORE YOU UPLOAD
 *   Change BOARD_NUMBER below to your own number.
 *
 * Open the Serial Monitor at 115200 baud. It prints the check every 5 seconds.
 *   radio firmware 0.6.0, newest 0.6.0      good
 *   radio firmware 0.2.1, newest 0.6.0      update it (Tools > Firmware Updater)
 *   Bluetooth: OK                           good
 *   Bluetooth: did not start                update the firmware, then unplug and plug in again
 *
 * Board: Arduino UNO R4 WiFi.
 * Libraries: ArduinoBLE and ArduinoGraphics (install both from the Library Manager).
 */

#include <ArduinoBLE.h>
#include <ArduinoGraphics.h>      // must come before Arduino_LED_Matrix.h, for text
#include <Arduino_LED_Matrix.h>
#include <WiFiS3.h>

// 1. YOUR BOARD NUMBER. Three digits, from 001 to 999.
#define BOARD_NUMBER "001"

// 2. THE SERVICE ADDRESS. It ends in your board number. Find Your Board looks for it.
BLEService boardService("19b10000-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER);
BLEByteCharacteristic numberCharacteristic("19b10001-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER, BLERead);

ArduinoLEDMatrix matrix;
bool bluetoothOK = false;
unsigned long lastPrint = 0;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  matrix.begin();

  // 3. START BLUETOOTH AND ADVERTISE
  bluetoothOK = startBluetooth();
  if (bluetoothOK) {
    BLE.setLocalName("Board-" BOARD_NUMBER);
    BLE.setAdvertisedService(boardService);
    boardService.addCharacteristic(numberCharacteristic);
    BLE.addService(boardService);
    numberCharacteristic.writeValue(atoi(BOARD_NUMBER) % 256);
    BLE.advertise();
  }

  // 4. SHOW THE NUMBER ON THE MATRIX. Three digits just fit, 4 dots wide each
  matrix.beginDraw();
  matrix.stroke(0xFFFFFFFF);
  matrix.textFont(Font_4x6);
  matrix.beginText(0, 1, 0xFFFFFF);
  matrix.print(bluetoothOK ? BOARD_NUMBER : "BT?");
  matrix.endText();
  matrix.endDraw();
}

void loop() {
  if (bluetoothOK) {
    BLE.poll();
    digitalWrite(LED_BUILTIN, BLE.connected() ? HIGH : LOW);
  }

  // 5. PRINT THE CHECK every 5 seconds
  if (millis() - lastPrint >= 5000) {
    lastPrint = millis();
    Serial.println();
    Serial.print("radio firmware ");
    Serial.print(WiFi.firmwareVersion());
    Serial.print(", newest ");
    Serial.println(WIFI_FIRMWARE_LATEST_VERSION);
    if (bluetoothOK) {
      Serial.println("Bluetooth: OK");
      Serial.println("advertising as Board-" BOARD_NUMBER);
      Serial.println("service 19b10000-e8f2-537e-4f6c-d104768a1" BOARD_NUMBER);
      Serial.print("connected: ");
      Serial.println(BLE.connected() ? "yes" : "no");
    } else {
      Serial.println("Bluetooth: did not start");
      Serial.println("Update the radio firmware (Tools > Firmware Updater), then unplug the board and plug it back in.");
    }
  }
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
