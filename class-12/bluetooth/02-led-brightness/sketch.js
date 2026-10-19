// 02 LED Brightness
// Bluetooth. Tilt your phone and the LED on a board gets brighter or dimmer. The page sends one
// number from 0 to 255. That is one byte, which is what a PWM pin like D9 wants.
//
// Lay the phone flat for 0. Stand it up for 255. On a laptop, move the mouse up for bright
// and down for dark. Run it in Chrome on Android or on a laptop. On an iPhone, open it in the
// Bluefy app. Press Connect and pick your board from the list.
//
// Try this:
//   Tilt the phone before you connect. The drawing already works. It shows what the LED will do.
//   Connect, then tilt. The LED on the board follows the drawing.
//   Change stepSize to 1. The number jitters, and the page sends far more.
//
// Key data:
//   bleSetup({ ... })            says which values the board has. Here it is one, 'brightness', a uint8
//   bleWrite('brightness', 128)  sends it to the board
//   rotationX                    the front to back tilt in degrees. 0 is flat and 90 is upright
//
// Files: ble-kit.js does the connecting. You don't need to change it. A copy of this folder needs
// index.html, ble-kit.js and sketch.js. The board runs arduino/LedBrightness/LedBrightness.ino.
// The name, the type and the order of the values must be the same in both.

// every board in the room has a name that starts with p5phone, such as p5phone-ana
const BOARD_PREFIX = 'p5phone';

// the feel of the piece
let flatAt = 15;        // degrees. A phone tipped back this far or more is 0
let uprightAt = 75;     // and a phone stood up this far or more is 255
let stepSize = 5;       // the smallest change worth sending. A hand is never quite still
let writeEvery = 50;    // milliseconds. The most often this page sends. 50 is twenty a second

let level = 0;          // how bright the LED should be, 0 to 255
let sent = null;        // what the board was last told. null means nothing yet
let writing = false;    // a write is on its way. Bluetooth does one at a time
let lastWriteAt = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  angleMode(DEGREES);
  textFont('system-ui');

  // the board has one value for this page to write: brightness. A uint8 is one byte, 0 to 255.
  // LedBrightness.ino declares the same one
  bleSetup({
    namePrefix: BOARD_PREFIX,
    characteristics: [
      { name: 'brightness', type: 'uint8', write: true }
    ]
  });
  bleKitSetup({ tilt: true });
}

// a board that connects, or leaves, is told the level again
function bleReady() { sent = null; }
function bleClosed() { sent = null; }

function draw() {
  bleKitFrame();
  background(20);

  // 1. read the tilt. 2. tell the board if it changed. 3. show the LED
  level = levelNow();
  sendToBoard();
  drawTitle('02 LED Brightness', tiltHint('Tilt your phone forward and back.', 'Move the mouse up and down.'));
  drawLed(width / 2, midY, 110 * k, level / 255);
  fill(level > 0 ? AMBER : GREY);
  textAlign(CENTER, BASELINE);
  textStyle(BOLD);
  textSize(64 * k);
  text(level, width / 2, midY + 225 * k);
  textStyle(NORMAL);
  fill(GREY);
  textSize(17 * k);
  text('brightness, from 0 to 255', width / 2, midY + 255 * k);
  drawStatus(INK);
}

// the phone's tilt, or the mouse, as one number from 0 to 255
function levelNow() {
  let amount = 0;   // 0 to 1
  if (hasTilt) {
    amount = map(rotationX, flatAt, uprightAt, 0, 1);
  } else if (mouseHasMoved()) {
    amount = map(mouseY, height, 0, 0, 1);   // up the screen is brighter
  }
  const target = round(constrain(amount, 0, 1) * 255);

  // keep the old number until the new one has moved by stepSize or more.
  // 0 and 255 always get through, so the ends can be reached
  if (abs(target - level) >= stepSize || target === 0 || target === 255) {
    return target;
  }
  return level;
}

// send the level to the board, but only when it changed, and only one write at a time.
// Web Bluetooth fails a write that starts while another is still on its way
async function sendToBoard() {
  // not connected, a write already on its way, nothing new, or too soon
  if (!bleConnected || writing || level === sent || millis() - lastWriteAt < writeEvery) {
    return;
  }
  writing = true;
  const value = level;
  const ok = await bleWrite('brightness', value);
  if (ok) {
    sent = value;
  }
  lastWriteAt = millis() + (ok ? 0 : 1000);   // after a failed write, wait a second
  writing = false;
}

// an LED seen from the side. glow is 0 for dark and 1 for full bright
function drawLed(cx, cy, s, glow) {
  noStroke();
  for (let i = 5; i > 0; i--) {
    fill(255, 200, 0, glow * 16);
    circle(cx, cy - 0.1 * s, s * (1.1 + i * 0.45));
  }
  fill(150);
  rect(cx - 0.27 * s, cy + 0.6 * s, 0.07 * s, 0.6 * s);   // the short leg
  rect(cx + 0.2 * s, cy + 0.6 * s, 0.07 * s, 0.9 * s);    // the long leg
  fill(lerpColor(color(70, 62, 36), color(255, 214, 80), glow));
  rect(cx - 0.5 * s, cy - 0.9 * s, s, 1.5 * s, 0.5 * s, 0.5 * s, 0, 0);
  rect(cx - 0.6 * s, cy + 0.5 * s, 1.2 * s, 0.1 * s);
  fill(255, 40 + 80 * glow);
  ellipse(cx - 0.22 * s, cy - 0.45 * s, 0.14 * s, 0.4 * s);
}
