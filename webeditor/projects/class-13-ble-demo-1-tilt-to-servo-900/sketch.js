// Example 1: Tilt to Servo (the phone side)
// Tilt your phone left and right, and a servo on the Arduino turns to match.
// The phone sends one number, the angle, from 0 to 180.
// On a laptop, move the mouse left and right instead.
//
// Arduino code for the board: TiltToServo.zip
//   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/1-tilt-to-servo/TiltToServo.zip
// This sketch on the p5 Web Editor: https://editor.p5js.org/npuckett/sketches/IIBeEjtN-
//
// Bluetooth from a web page works in Chrome on Android and on a laptop.
// On an iPhone, open this page in the Bluefy app.

// 1. YOUR BOARD NUMBER
// Three digits, the same as BOARD_NUMBER in the Arduino code.
// It is set to 900, a class demo board. Change '900' at the end of the line below to your
// number. (The first part lets a page address such as ...?board=901 choose the board. Leave it.)
const BOARD_NUMBER = new URLSearchParams(location.search).get('board') || '900';

// 2. THE ADDRESSES (UUIDs). They match the Arduino code, and end in your board number.
const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;
const ANGLE_UUID = '19b10001-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;

let angle = 90;        // the angle to send, 0 to 180
let lastSent = -1;     // the angle the board has now
let sending = false;   // Bluetooth sends one thing at a time
let connectButton;

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);

  // 3. SET UP BLUETOOTH: one service with one value in it.
  // uint8 is one byte, 0 to 255. write: true means this page writes it.
  bleSetup({
    serviceUUID: SERVICE_UUID,
    characteristics: [
      { name: 'angle', uuid: ANGLE_UUID, type: 'uint8', write: true }
    ]
  });

  // the first tap turns on tilt. An iPhone asks first
  enableGyroTap('Tap to start');

  // 4. A BUTTON TO CONNECT. Bluetooth only starts from a tap.
  connectButton = createButton('Connect');
  connectButton.position(20, 20);
  connectButton.mousePressed(connectOrDisconnect);
  lockGestures();

  // on a laptop, a QR code of this page so you can open it on your phone. In the Web Editor, save first
  showDesktopQr({ label: 'Open on your phone', size: 120 });
}

function draw() {
  background(20);

  // 5. READ THE TILT. Tilt left for 0, hold level for 90, tilt right for 180
  if (isMobile) {
    angle = map(rotationY, -45, 45, 0, 180, true);
  } else {
    angle = map(mouseX, 0, width, 0, 180, true);
  }
  angle = round(angle);

  // 6. SEND IT, when it has changed and the last send has finished
  if (bleConnected && angle !== lastSent && !sending) {
    sendAngle();
  }

  drawServo();
  drawStatus();
}

async function sendAngle() {
  sending = true;
  const value = angle;
  const ok = await bleWrite('angle', value);   // wait until the board has it
  if (ok) lastSent = value;
  sending = false;
}

function connectOrDisconnect() {
  if (bleConnected) {
    bleDisconnect();
  } else {
    bleConnect();   // opens the list of boards. Pick Board- and your number
  }
}

// the board just connected: send the angle again
function bleReady() {
  lastSent = -1;
}

// a servo arm, seen from above
function drawServo() {
  const cx = width / 2;
  const cy = height / 2;
  const r = min(width, height) * 0.3;
  stroke(70);
  strokeWeight(2);
  noFill();
  arc(cx, cy, r * 2, r * 2, 180, 360);
  stroke(255, 200, 0);
  strokeWeight(14);
  line(cx, cy, cx - cos(angle) * r, cy - sin(angle) * r);
  noStroke();
  fill(255);
  textAlign(CENTER, TOP);
  textSize(48);
  text(angle, cx, cy + 30);
}

function drawStatus() {
  fill(180);
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
