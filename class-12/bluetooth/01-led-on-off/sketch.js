// 01 LED On and Off
// Bluetooth. Your phone switches an LED on a board. Tap the screen and the LED goes on.
// Tap again and it goes off. This is the smallest thing you can send to a board.
//
// Run it in Chrome on Android or on a laptop. On an iPhone, open it in the Bluefy app.
// Press Connect and pick your board from the list. Then tap the screen.
//
// Try this:
//   Tap the screen before you connect. The drawing already works. It shows what the LED will do.
//   Connect, then tap. The LED on the board follows the drawing.
//
// Key data:
//   bleSetup({ ... })      says which values the board has. Here it is one, 'led', a bool
//   bleWrite('led', true)  sends it to the board. true is on and false is off
//   bleConnected           true while a board is connected
//
// Files: ble-kit.js does the connecting. You don't need to change it. A copy of this folder needs
// index.html, ble-kit.js and sketch.js. The board runs arduino/LedOnOff/LedOnOff.ino. The name,
// the type and the order of the values must be the same in both.

// every board in the room has a name that starts with p5phone, such as p5phone-ana
const BOARD_PREFIX = 'p5phone';

// the feel of the piece
let writeEvery = 50;    // milliseconds. The most often this page sends. 50 is twenty a second

let ledOn = false;      // what the LED should do
let sent = null;        // what the board was last told. null means nothing yet
let writing = false;    // a write is on its way. Bluetooth does one at a time
let lastWriteAt = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  // the board has one value for this page to write: led. A bool is true or false.
  // LedOnOff.ino declares the same one
  bleSetup({
    namePrefix: BOARD_PREFIX,
    characteristics: [
      { name: 'led', type: 'bool', write: true }
    ]
  });
  bleKitSetup();
}

// a tap on the screen switches the LED. event.target is what was tapped,
// so a tap on the Connect button does not
function mousePressed(event) {
  if (event.target.tagName === 'CANVAS') {
    ledOn = !ledOn;
  }
}

// a board that connects, or leaves, is told the LED state again
function bleReady() { sent = null; }
function bleClosed() { sent = null; }

function draw() {
  bleKitFrame();
  background(20);

  // 1. tell the board if the LED changed. 2. show the LED
  sendToBoard();
  drawTitle('01 LED On and Off', 'Tap the screen to switch the LED.');
  drawLed(width / 2, midY, 110 * k, ledOn ? 1 : 0);
  fill(ledOn ? AMBER : GREY);
  textAlign(CENTER, BASELINE);
  textStyle(BOLD);
  textSize(48 * k);
  text(ledOn ? 'ON' : 'OFF', width / 2, midY + 220 * k);
  drawStatus(INK);
}

// send the LED state to the board, but only when it changed, and only one write at a time.
// Web Bluetooth fails a write that starts while another is still on its way
async function sendToBoard() {
  // not connected, a write already on its way, nothing new, or too soon
  if (!bleConnected || writing || ledOn === sent || millis() - lastWriteAt < writeEvery) {
    return;
  }
  writing = true;
  const value = ledOn;
  const ok = await bleWrite('led', value);
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
