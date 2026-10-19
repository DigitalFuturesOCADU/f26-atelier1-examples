// 03 Servo
// Bluetooth. Tilt your phone left and right and the arm of a servo on a board turns. The page
// sends one number from 0 to 180, which is an angle in degrees.
//
// Tilt left for 0. Hold level for 90. Tilt right for 180. On a laptop, move the mouse left and
// right. Run it in Chrome on Android or on a laptop. On an iPhone, open it in the Bluefy app.
// Press Connect and pick your board from the list.
//
// Try this:
//   Tilt the phone before you connect. The drawing already works. It shows what the servo will do.
//   Connect, then tilt. The servo arm follows the drawing.
//   Change reach to 30. A smaller tilt now turns the arm all the way.
//
// Key data:
//   bleSetup({ ... })      says which values the board has. Here it is one, 'angle', a uint8
//   bleWrite('angle', 90)  sends it to the board
//   rotationY              the left to right tilt in degrees. 0 is level
//
// Files: ble-kit.js does the connecting. You don't need to change it. A copy of this folder needs
// index.html, ble-kit.js and sketch.js. The board runs arduino/ServoAngle/ServoAngle.ino. The
// name, the type and the order of the values must be the same in both.

// every board in the room has a name that starts with p5phone, such as p5phone-ana
const BOARD_PREFIX = 'p5phone';

// the feel of the piece
let reach = 45;         // degrees of tilt, left or right, that turn the arm all the way
let stepSize = 2;       // the smallest change worth sending. A hand is never quite still
let writeEvery = 50;    // milliseconds. The most often this page sends. 50 is twenty a second

let angle = 90;         // where the servo arm should be, 0 to 180
let sent = null;        // what the board was last told. null means nothing yet
let writing = false;    // a write is on its way. Bluetooth does one at a time
let lastWriteAt = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  angleMode(DEGREES);
  textFont('system-ui');

  // the board has one value for this page to write: angle. A uint8 is one byte, 0 to 255.
  // ServoAngle.ino declares the same one
  bleSetup({
    namePrefix: BOARD_PREFIX,
    characteristics: [
      { name: 'angle', type: 'uint8', write: true }
    ]
  });
  bleKitSetup({ tilt: true });
}

// a board that connects, or leaves, is told the angle again
function bleReady() { sent = null; }
function bleClosed() { sent = null; }

function draw() {
  bleKitFrame();
  background(20);

  // 1. read the tilt. 2. tell the board if it changed. 3. show the servo
  angle = angleNow();
  sendToBoard();
  drawTitle('03 Servo', tiltHint('Tilt your phone left and right.', 'Move the mouse left and right.'));
  drawServo(width / 2, midY + 14 * k, 130 * k, angle);
  fill(AMBER);
  textAlign(CENTER, BASELINE);
  textStyle(BOLD);
  textSize(64 * k);
  text(angle, width / 2, midY + 192 * k);
  textStyle(NORMAL);
  fill(GREY);
  textSize(17 * k);
  text('angle, from 0 to 180 degrees', width / 2, midY + 222 * k);
  drawStatus(INK);
}

// the phone's tilt, or the mouse, as one angle from 0 to 180
function angleNow() {
  let a = 90;   // straight up, until there is something to read
  if (hasTilt) {
    a = map(rotationY, -reach, reach, 0, 180);
  } else if (mouseHasMoved()) {
    a = map(mouseX, 0, width, 0, 180);
  }
  const target = round(constrain(a, 0, 180));

  // keep the old angle until the new one has moved by stepSize or more.
  // 0 and 180 always get through, so the ends can be reached
  if (abs(target - angle) >= stepSize || target === 0 || target === 180) {
    return target;
  }
  return angle;
}

// send the angle to the board, but only when it changed, and only one write at a time.
// Web Bluetooth fails a write that starts while another is still on its way
async function sendToBoard() {
  // not connected, a write already on its way, nothing new, or too soon
  if (!bleConnected || writing || angle === sent || millis() - lastWriteAt < writeEvery) {
    return;
  }
  writing = true;
  const value = angle;
  const ok = await bleWrite('angle', value);
  if (ok) {
    sent = value;
  }
  lastWriteAt = millis() + (ok ? 0 : 1000);   // after a failed write, wait a second
  writing = false;
}

// a servo seen from above. 0 points the arm left, 90 straight up, 180 right
function drawServo(cx, cy, r, a) {
  noStroke();
  fill(60);
  rect(cx - 0.7 * r, cy + 0.12 * r, 1.4 * r, 0.62 * r, 6 * k);   // the body
  rect(cx - 0.95 * r, cy + 0.5 * r, 1.9 * r, 0.1 * r);            // the mounting tabs
  noFill();
  stroke(70);
  strokeWeight(2 * k);
  arc(cx, cy, 2 * r, 2 * r, 180, 360);                            // the sweep
  stroke(AMBER);
  strokeWeight(14 * k);
  strokeCap(ROUND);
  line(cx, cy, cx - cos(a) * r * 0.95, cy - sin(a) * r * 0.95);   // the arm
  noStroke();
  fill(255);
  circle(cx, cy, 22 * k);
}
