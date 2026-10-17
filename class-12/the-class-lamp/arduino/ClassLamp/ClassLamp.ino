/*
 * The Class Lamp: the board.
 *
 * A NeoPixel strip on an Arduino Uno R4 WiFi that shows the whole class.
 * The hub page (../hub/) sends three numbers over Bluetooth, about ten times a second:
 *
 *   hue         0 to 255   the colour. the class's left to right tilt. 0 is red, 96 green, 191 violet
 *   brightness  0 to 255   how bright. the class's front to back tilt
 *   pixels      0 to 255   how many pixels are lit. one for each phone in the room
 *
 * Each number is one byte. They are three P5PhoneBLE values, in this order, and the hub
 * declares them in the same order:
 *
 *   ble.receiveByte("hue");         // 19b10001-e8f2-537e-4f6c-d104768a1214
 *   ble.receiveByte("brightness");  // 19b10002-e8f2-537e-4f6c-d104768a1214
 *   ble.receiveByte("pixels");      // 19b10003-e8f2-537e-4f6c-d104768a1214
 *
 * The board is called "classlamp". The hub looks for that name, so it does not mix this lamp
 * up with the boards other people are using for First Contact, which are called "p5phone".
 *
 * Changes are smoothed here, so a lamp moves like a lamp and not like a screen. With no hub
 * connected, the whole strip breathes slowly in amber. With a hub connected and no phones in
 * the room yet, one pixel is lit.
 *
 * No strip? The 12 by 8 LED matrix on the board shows the same three numbers:
 *   rows 1 to 6   one dot for each phone, left to right, top to bottom
 *   row 7         one dot for the hue, from left (red) to right (violet)
 *   row 8         a bar for the brightness
 * Open the Serial Monitor at 115200 baud to read the numbers as they arrive.
 *
 * WIRING (the strip is a WS2812B strip, such as Adafruit NeoPixel)
 *
 *   strip 5V   to  board 5V
 *   strip GND  to  board GND   (the board's GND, and the supply's GND if you use one)
 *   strip DIN  to  D6, through a 330 ohm resistor. put the resistor near the strip
 *   a 1000 uF capacitor across the strip's 5V and GND, near the strip. the long leg is +
 *
 * Connect GND first and 5V last. Never connect a strip's DIN with no GND.
 * Only wire to the end of the strip marked DIN (data in). The arrows point away from it.
 *
 * HOW MANY PIXELS CAN USB POWER DRIVE?
 *
 *   A NeoPixel draws up to 20 mA for each of its three colours at full brightness, so up to
 *   60 mA for white. A laptop USB port gives 500 mA, and the board needs about 100 mA of that,
 *   which leaves about 400 mA. At full white that is only 6 pixels.
 *   This sketch never shows white, because every colour is fully saturated, and it holds every
 *   pixel to about a quarter of full (MAX_BRIGHTNESS 60). The most one pixel can then draw is
 *   about 9 mA, so 24 pixels draw at most about 230 mA. That is why STRIP_LENGTH is 24.
 *   Around 40 pixels is the most USB can drive at this brightness. For a longer strip, or a
 *   higher MAX_BRIGHTNESS, power the strip from its own 5V supply (2 A is plenty for 60 pixels
 *   at this setting) and join that supply's GND to the board's GND.
 *
 * Needs the libraries P5PhoneBLE (0.1.1 or later) and Adafruit NeoPixel. Board: Arduino UNO R4 WiFi.
 */

#include <P5PhoneBLE.h>
#include <Adafruit_NeoPixel.h>
#include <Arduino_LED_Matrix.h>

// ---- the strip. change these to match yours ----
const uint8_t  STRIP_PIN    = 6;     // the pin the strip's DIN is wired to
const uint16_t STRIP_LENGTH = 24;    // how many pixels the strip has
const uint8_t  MAX_BRIGHTNESS = 60;  // the brightest any pixel gets, out of 255. read the power note above first

// ---- the feel of the lamp ----
const float SETTLE_COLOUR_MS = 300;  // how long colour and brightness take to catch up. bigger is slower
const float SETTLE_PIXELS_MS = 160;  // how long a pixel takes to switch on or off
const float BREATH_SECONDS   = 5;    // one slow breath of the idle glow
const uint8_t IDLE_HUE       = 14;   // amber, for the idle glow

const unsigned long FRAME_MS = 25;   // redraw 40 times a second

P5PhoneBLE ble;
Adafruit_NeoPixel strip(STRIP_LENGTH, STRIP_PIN, NEO_GRB + NEO_KHZ800);
ArduinoLEDMatrix matrix;

// what the hub last asked for
uint8_t wantHue = 96;
uint8_t wantBrightness = 40;
uint8_t wantPixels = 0;

// what the lamp is showing right now. these move toward what is wanted
float showHue = IDLE_HUE;
float showBrightness = 0;            // 0 to 255
float showLit[STRIP_LENGTH];         // 0 to 1 for each pixel

bool hubHere = false;                // a hub is connected
bool bleStarted = false;
unsigned long lastFrame = 0;
uint32_t shown[STRIP_LENGTH];        // the colours last sent to the strip, so it is only sent when something changed
uint8_t matrixFrame[8][12];
uint8_t matrixShown[8][12];
bool firstFrame = true;

// move a number toward a target. ms is about how long it takes to get most of the way there.
// when it is within snap of the target it lands on it, so a settled lamp stops sending to the strip
float ease(float now, float target, float dtMs, float ms, float snap) {
  if (fabs(target - now) < snap) {
    return target;
  }
  float k = 1.0f - exp(-dtMs / ms);
  return now + (target - now) * k;
}

void setup() {
  Serial.begin(115200);

  strip.begin();
  strip.clear();
  strip.show();
  matrix.begin();

  for (uint16_t i = 0; i < STRIP_LENGTH; i++) {
    showLit[i] = 0;
    shown[i] = 0;
  }

  // the order of these three matters. it is the order of the hub's bleSetup() list
  ble.receiveByte("hue");
  ble.receiveByte("brightness");
  ble.receiveByte("pixels");
  ble.setStatusLED(LED_BUILTIN);  // solid when the hub is connected, blinking while it waits
  bleStarted = ble.begin("classlamp");
  Serial.println(bleStarted ? "The Class Lamp is waiting for the hub." : "Bluetooth did not start.");
}

void loop() {
  if (bleStarted) {
    ble.update();  // always first
  }

  bool hubNow = bleStarted && ble.isConnected();
  if (hubNow != hubHere) {
    hubHere = hubNow;
    if (hubHere) {
      wantHue = 96;
      wantBrightness = 40;
      wantPixels = 0;
      Serial.println("The hub is connected.");
    } else {
      Serial.println("The hub left. Breathing until it comes back.");
    }
  }

  // new numbers from the hub
  bool changed = false;
  if (ble.changed("hue")) {
    wantHue = constrain(ble.getInt("hue"), 0, 255);
    changed = true;
  }
  if (ble.changed("brightness")) {
    wantBrightness = constrain(ble.getInt("brightness"), 0, 255);
    changed = true;
  }
  if (ble.changed("pixels")) {
    wantPixels = constrain(ble.getInt("pixels"), 0, 255);
    changed = true;
  }
  if (changed) {
    Serial.print("hue ");
    Serial.print(wantHue);
    Serial.print("   brightness ");
    Serial.print(wantBrightness);
    Serial.print("   pixels ");
    Serial.println(wantPixels);
  }

  unsigned long now = millis();
  if (now - lastFrame < FRAME_MS) {
    return;
  }
  float dt = now - lastFrame;
  lastFrame = now;

  // 1. what should the lamp be showing? 2. move toward it. 3. draw it
  float targetHue;
  float targetBrightness;
  uint16_t targetPixels;
  if (hubHere) {
    targetHue = wantHue;
    targetBrightness = wantBrightness;
    targetPixels = max((int)wantPixels, 1);   // one pixel is lit even with no phones, so you can see it is connected
  } else {
    // the idle glow: the whole strip, slowly breathing
    float breath = 0.5f - 0.5f * cos(TWO_PI * now / (BREATH_SECONDS * 1000.0f));
    targetHue = IDLE_HUE;
    targetBrightness = 8 + 36 * breath;
    targetPixels = STRIP_LENGTH;
  }

  showHue = ease(showHue, targetHue, dt, SETTLE_COLOUR_MS, 0.5f);
  showBrightness = ease(showBrightness, targetBrightness, dt, SETTLE_COLOUR_MS, 0.5f);
  for (uint16_t i = 0; i < STRIP_LENGTH; i++) {
    showLit[i] = ease(showLit[i], i < targetPixels ? 1.0f : 0.0f, dt, SETTLE_PIXELS_MS, 0.01f);
  }

  drawStrip();
  drawMatrix(targetPixels, now);
  firstFrame = false;
}

// the strip. only sends when a colour changed
void drawStrip() {
  uint16_t hue16 = (uint16_t)(constrain(showHue, 0, 255) * 256.0f);
  bool differs = false;
  for (uint16_t i = 0; i < STRIP_LENGTH; i++) {
    float v = showBrightness / 255.0f * showLit[i] * MAX_BRIGHTNESS;
    uint32_t c = strip.ColorHSV(hue16, 255, (uint8_t)(v + 0.5f));
    strip.setPixelColor(i, c);
    if (c != shown[i]) {
      differs = true;
    }
  }
  if (differs) {
    strip.show();
    for (uint16_t i = 0; i < STRIP_LENGTH; i++) {
      shown[i] = strip.getPixelColor(i);
    }
  }
}

// the matrix is 12 across and 8 down. one number for each of the three things the hub sends
void drawMatrix(uint16_t targetPixels, unsigned long now) {
  memset(matrixFrame, 0, sizeof(matrixFrame));
  if (hubHere) {
    // rows 0 to 5: one dot for each phone
    int phones = min((int)wantPixels, 72);
    for (int k = 0; k < phones; k++) {
      matrixFrame[k / 12][k % 12] = 1;
    }
    // row 6: where the hue is, from red on the left to violet on the right
    int col = constrain((int)(showHue * 11.0f / 191.0f + 0.5f), 0, 11);
    matrixFrame[6][col] = 1;
    // row 7: a bar as long as the brightness
    int bar = (int)(showBrightness * 12.0f / 255.0f + 0.5f);
    for (int c = 0; c < bar && c < 12; c++) {
      matrixFrame[7][c] = 1;
    }
  } else {
    // waiting: two dots in the middle that come and go
    if ((now / 900) % 2 == 0) {
      matrixFrame[3][5] = 1;
      matrixFrame[3][6] = 1;
      matrixFrame[4][5] = 1;
      matrixFrame[4][6] = 1;
    }
  }
  if (firstFrame || memcmp(matrixFrame, matrixShown, sizeof(matrixFrame)) != 0) {
    matrix.renderBitmap(matrixFrame, 8, 12);
    memcpy(matrixShown, matrixFrame, sizeof(matrixFrame));
  }
}
