// 05 Light Sensor
// Bluetooth. A light sensor on a board tells your phone how bright the room is. The screen
// gets brighter and darker to match, and shows the raw number and a bar. The board sends.
// The phone listens.
//
// Run it in Chrome on Android or on a laptop. On an iPhone, open it in the Bluefy app.
// Press Connect and pick your board from the list. Then cover the sensor with your hand.
//
// Try this:
//   Move the mouse up and down before you connect, or drag a finger. The drawing already
//   works. It shows what the sensor will do.
//   Connect, then cover the sensor, then shine a phone light on it.
//   Read the number in a dark corner and by a window. Set darkest and brightest to those two
//   numbers. Now the screen uses its whole range.
//
// Key data:
//   bleSetup({ ... })        says which values the board has. Here it is one, 'light', an int32
//   bleValues.light          the newest value the board sent. 0 is dark and 1023 is bright
//   bleRead('light')         asks the board for the value once, so there is a number straight away
//   bleReceive(name, value)  runs each time the board sends a new value
//
// Files: ble-kit.js does the connecting. You don't need to change it. A copy of this folder needs
// index.html, ble-kit.js and sketch.js. The board runs arduino/LightSensor/LightSensor.ino. The
// name, the type and the order of the values must be the same in both.

// every board in the room has a name that starts with p5phone, such as p5phone-ana
const BOARD_PREFIX = 'p5phone';

// the feel of the piece
let darkest = 0;        // the reading in the dark. The screen is black at this number
let brightest = 1023;   // the reading in bright light. The screen is white at this number

let light = null;       // the reading from the board. null means none yet
let shown = 0;          // 0 to 1. How bright the screen is. It eases toward the reading

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  // the board has one value to send to this page: light. An int32 is a whole number.
  // sendInt() on the board sends an int32. notify means the board tells the page when it changes.
  // read lets the page ask for the value once. LightSensor.ino declares the same one
  bleSetup({
    namePrefix: BOARD_PREFIX,
    characteristics: [
      { name: 'light', type: 'int32', notify: true, read: true }
    ]
  });
  bleKitSetup();
}

// a board that has not moved yet sends nothing, so ask it for the number once
function bleReady() {
  bleRead('light');
}

function bleClosed() {
  light = null;
}

// runs each time the board sends a new value
function bleReceive(name, value) {
  if (name === 'light') {
    light = value;
  }
}

function draw() {
  bleKitFrame();

  // 1. get the reading. 2. ease the screen toward it. 3. show it
  const reading = readingNow();
  const target = constrain(map(reading, darkest, brightest, 0, 1), 0, 1);
  shown = lerp(shown, target, 0.2);
  background(shown * 255);
  const ink = shown > 0.46 ? 0 : 255;       // black on a light screen, white on a dark one
  const soft = shown > 0.46 ? 40 : 215;

  drawTitle('05 Light Sensor', bleConnected ? 'Cover the sensor with your hand.' : 'No board yet. Move the mouse up and down, or drag a finger.', ink, soft);
  noStroke();
  fill(ink);
  textAlign(CENTER, BASELINE);
  textStyle(BOLD);
  textSize(88 * k);
  text(reading === null ? '...' : reading, width / 2, midY + 30 * k);
  textStyle(NORMAL);
  fill(soft);
  textSize(17 * k);
  text('light, from ' + darkest + ' to ' + brightest, width / 2, midY + 62 * k);

  // a bar as long as the reading
  const barW = width * 0.7;
  noFill();
  stroke(ink);
  strokeWeight(2 * k);
  rect((width - barW) / 2, midY + 100 * k, barW, 26 * k);
  noStroke();
  fill(ink);
  rect((width - barW) / 2, midY + 100 * k, barW * target, 26 * k);
  drawStatus(ink);
}

// the board's reading. With no board, the mouse or a finger stands in: up the screen is brighter
function readingNow() {
  if (bleConnected) {
    return light;
  }
  if (mouseHasMoved()) {
    return round(map(mouseY, height, 0, darkest, brightest));
  }
  return round((darkest + brightest) / 2);
}
