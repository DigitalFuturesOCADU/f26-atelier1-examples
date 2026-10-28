// Example 3: Both Ways (the phone side)
// Examples 1 and 2 at the same time, on one connection.
//   phone to board: tilt the phone left and right, and the servo turns (0 to 180)
//   board to phone: the light sensor sets how bright this screen is (0 to 1023)
// On a laptop, move the mouse left and right instead of tilting.
//
// The code is Example 1 and Example 2 put together. Each part is marked PHONE TO BOARD
// or BOARD TO PHONE.
//
// Arduino code for the board: BothWays.zip
//   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/3-both-ways/BothWays.zip
//
// Bluetooth from a web page works in Chrome on Android and on a laptop.
// On an iPhone, open this page in the Bluefy app.

// 1. YOUR BOARD NUMBER
// Three digits, the same as BOARD_NUMBER in the Arduino code.
// On a page you did not edit, add ?board= and your number to the address: ...?board=007
const BOARD_NUMBER = new URLSearchParams(location.search).get('board') || '001';

// 2. THE ADDRESSES (UUIDs). The same as in Examples 1 and 2.
const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;
const ANGLE_UUID = '19b10001-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;
const LIGHT_UUID = '19b10002-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;

let angle = 90;        // PHONE TO BOARD: the angle to send, 0 to 180
let lastSent = -1;
let sending = false;
let light = 0;         // BOARD TO PHONE: the last light reading, 0 to 1023
let connectButton;

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);

  // 3. SET UP BLUETOOTH: one service with two values in it
  bleSetup({
    serviceUUID: SERVICE_UUID,
    characteristics: [
      { name: 'angle', uuid: ANGLE_UUID, type: 'uint8', write: true },                // phone to board
      { name: 'light', uuid: LIGHT_UUID, type: 'uint16', notify: true, read: true }   // board to phone
    ]
  });

  // the first tap turns on tilt. An iPhone asks first
  enableGyroTap('Tap to start');

  // 4. A BUTTON TO CONNECT. Bluetooth only starts from a tap.
  connectButton = createButton('Connect');
  connectButton.position(20, 20);
  connectButton.mousePressed(connectOrDisconnect);
  lockGestures();
}

function draw() {
  // BOARD TO PHONE: the light sets the background
  const level = map(light, 0, 1023, 0, 255, true);
  background(level);

  // PHONE TO BOARD: read the tilt (or the mouse) and send the angle when it changed
  if (isMobile) {
    angle = map(rotationY, -45, 45, 0, 180, true);
  } else {
    angle = map(mouseX, 0, width, 0, 180, true);
  }
  angle = round(angle);
  if (bleConnected && angle !== lastSent && !sending) {
    sendAngle();
  }

  drawServo(level > 128 ? 0 : 255);
  drawStatus(level > 128 ? 60 : 180);
}

// PHONE TO BOARD: one write at a time
async function sendAngle() {
  sending = true;
  const value = angle;
  const ok = await bleWrite('angle', value);
  if (ok) lastSent = value;
  sending = false;
}

// BOARD TO PHONE: p5-phone calls this each time the board sends a value
function bleReceive(name, value) {
  if (name === 'light') {
    light = value;
  }
}

// the board just connected: send the angle again, and ask for the light now
function bleReady() {
  lastSent = -1;
  bleRead('light');
}

function connectOrDisconnect() {
  if (bleConnected) {
    bleDisconnect();
  } else {
    bleConnect();   // opens the list of boards. Pick Board- and your number
  }
}

// a servo arm, seen from above, and both numbers
function drawServo(ink) {
  const cx = width / 2;
  const cy = height / 2;
  const r = min(width, height) * 0.3;
  stroke(128);
  strokeWeight(2);
  noFill();
  arc(cx, cy, r * 2, r * 2, 180, 360);
  stroke(255, 200, 0);
  strokeWeight(14);
  line(cx, cy, cx - cos(angle) * r, cy - sin(angle) * r);
  noStroke();
  fill(ink);
  textAlign(CENTER, TOP);
  textSize(40);
  text('angle ' + angle, cx, cy + 30);
  textSize(24);
  text('light ' + light, cx, cy + 80);
}

function drawStatus(ink) {
  fill(ink);
  noStroke();
  textAlign(LEFT, BOTTOM);
  textSize(16);
  let words = 'Not connected. Looking for Board-' + BOARD_NUMBER;
  if (bleConnected) words = 'Connected to ' + bleDeviceName;
  if (!bleSupported) words = 'No Bluetooth here. Use Chrome, or Bluefy on an iPhone.';
  text(words, 20, height - 20);
  connectButton.html(bleConnected ? 'Disconnect' : 'Connect');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
