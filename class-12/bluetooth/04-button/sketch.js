// 04 Button
// Bluetooth. A button on a board tells your phone when it is pressed. The page shows pressed
// or not pressed, and counts the presses. The board sends. The phone listens.
//
// Run it in Chrome on Android or on a laptop. On an iPhone, open it in the Bluefy app.
// Press Connect and pick your board from the list. Then press the button on the board.
//
// Try this:
//   Press and hold the screen before you connect. The drawing already works. It shows what
//   the button will do.
//   Connect, then press the button on the board. The circle fills while you hold it.
//   Hold the button down. The count goes up once, not many times.
//
// Key data:
//   bleSetup({ ... })        says which values the board has. Here it is one, 'button', a bool
//   bleValues.button         the newest value the board sent. true while the button is down
//   bleReceive(name, value)  runs each time the board sends a new value
//   bleConnected             true while a board is connected
//
// Files: ble-kit.js does the connecting. You don't need to change it. A copy of this folder needs
// index.html, ble-kit.js and sketch.js. The board runs arduino/Button/Button.ino. The name, the
// type and the order of the values must be the same in both.

// every board in the room has a name that starts with p5phone, such as p5phone-ana
const BOARD_PREFIX = 'p5phone';

let presses = 0;        // how many times the button went down
let wasDown = false;    // was the button down the last time the board sent

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  // the board has one value to send to this page: button. A bool is true or false.
  // notify means the board tells the page when it changes. Button.ino declares the same one
  bleSetup({
    namePrefix: BOARD_PREFIX,
    characteristics: [
      { name: 'button', type: 'bool', notify: true }
    ]
  });
  bleKitSetup();
}

// runs each time the board sends a new value. The count goes up when the button goes down
function bleReceive(name, value) {
  if (name === 'button') {
    if (value && !wasDown) {
      presses += 1;
    }
    wasDown = value;
  }
}

// a new connection starts a new count
function bleReady() {
  presses = 0;
  wasDown = false;
}

// with no board, pressing the screen stands in for the button.
// event.target is what was pressed, so a press on the Connect button does not count
function mousePressed(event) {
  if (!bleConnected && event.target.tagName === 'CANVAS') {
    presses += 1;
  }
}

function draw() {
  bleKitFrame();
  background(20);

  // 1. read the button. 2. show it
  const down = bleConnected ? bleValues.button === true : mouseIsPressed;
  drawTitle('04 Button', bleConnected ? 'Press the button on the board.' : 'No board yet. Press and hold the screen to try it.');
  drawPad(width / 2, midY, 100 * k, down);
  noStroke();
  textAlign(CENTER, BASELINE);
  textStyle(BOLD);
  textSize(34 * k);
  fill(down ? AMBER : GREY);
  text(down ? 'PRESSED' : 'NOT PRESSED', width / 2, midY + 175 * k);
  fill(255);
  textSize(64 * k);
  text(presses, width / 2, midY + 250 * k);
  textStyle(NORMAL);
  fill(GREY);
  textSize(17 * k);
  text(presses === 1 ? 'press' : 'presses', width / 2, midY + 278 * k);
  drawStatus(INK);
}

// a big round button seen from above. it fills when it is down
function drawPad(cx, cy, r, down) {
  noStroke();
  if (down) {
    for (let i = 4; i > 0; i--) {
      fill(255, 200, 0, 22);
      circle(cx, cy, r * (2 + i * 0.35));
    }
    fill(AMBER);
    circle(cx, cy, r * 2);
  } else {
    noFill();
    stroke(GREY);
    strokeWeight(5 * k);
    circle(cx, cy, r * 2);
    noStroke();
    fill(40);
    circle(cx, cy, r * 1.6);
  }
}
