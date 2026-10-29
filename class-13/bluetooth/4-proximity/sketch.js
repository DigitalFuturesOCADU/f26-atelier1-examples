// Example 5: Proximity (the phone side)
// Two boards, two people. Your board listens for your partner's board and measures how
// strong its signal is (RSSI). This page shows it: the closer the boards, the closer the dots.
//
// RSSI is a negative number, in dBm. About -40 is touching, -60 is an arm's length,
// -80 is across a room. -100 means your board can't hear the partner at all.
// It jumps around. Hands, bodies and walls all change it.
//
// Arduino code for the board: Proximity.zip
//   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/4-proximity/Proximity.zip
// This sketch on the p5 Web Editor: https://editor.p5js.org/npuckett/sketches/0ClUw3Yn4
//
// Bluetooth from a web page works in Chrome on Android and on a laptop.
// On an iPhone, open this page in the Bluefy app.

// 1. YOUR BOARD NUMBER
// Three digits, the same as BOARD_NUMBER in the Arduino code. Your partner's number is
// only in the Arduino code: your board does the listening.
// It starts at 900, the class demo board. Change '900' at the end of the line below to your
// number. (The first part lets a page address such as ...?board=901 choose the board. Leave it.)
const BOARD_NUMBER = new URLSearchParams(location.search).get('board') || '900';

// 2. THE ADDRESSES (UUIDs). They match the Arduino code.
const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;
const RSSI_UUID = '19b10003-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;

// 3. THE FEEL. Change these after you have walked apart and back once
const TOUCHING = -45;   // this strong or stronger: touching
const NEAR = -65;       // this strong or stronger: near
const FAR = -85;        // weaker than this: far away

let rssi = -100;        // the partner's strength, from your board
let connectButton;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 4. SET UP BLUETOOTH. int8 is one signed byte, -128 to 127.
  // notify: true means the board sends it, five times a second
  bleSetup({
    serviceUUID: SERVICE_UUID,
    characteristics: [
      { name: 'rssi', uuid: RSSI_UUID, type: 'int8', notify: true, read: true }
    ]
  });

  connectButton = createButton('Connect');
  connectButton.position(20, 20);
  connectButton.mousePressed(connectOrDisconnect);
  lockGestures();

  // on a laptop, a QR code of this page so you can open it on your phone. In the Web Editor, save first
  showDesktopQr({ label: 'Open on your phone', size: 120 });
}

// 5. A NEW READING ARRIVED
function bleReceive(name, value) {
  if (name === 'rssi') {
    rssi = value;
  }
}

function bleReady() {
  bleRead('rssi');
}

function draw() {
  background(20);

  // 6. USE IT. The stronger the signal, the closer the two dots.
  // map() turns -100 (far) to -40 (touching) into a gap from wide to none
  const gap = map(rssi, -100, -40, width * 0.8, 0, true);
  const y = height / 2;
  noStroke();
  fill(255, 200, 0);
  circle(width / 2 - gap / 2 - 30, y, 60);   // you
  fill(rssi <= -100 ? 70 : 255);
  circle(width / 2 + gap / 2 + 30, y, 60);   // your partner

  // the words and the number
  fill(255);
  textAlign(CENTER, TOP);
  textSize(40);
  text(closeness(), width / 2, y + 70);
  textSize(20);
  fill(180);
  text(rssi + ' dBm', width / 2, y + 120);

  drawStatus();
}

// a word for the strength. Change TOUCHING, NEAR and FAR above to fit your space
function closeness() {
  if (rssi <= -100) return 'no partner';
  if (rssi >= TOUCHING) return 'touching';
  if (rssi >= NEAR) return 'near';
  if (rssi >= FAR) return 'in the room';
  return 'far away';
}

function connectOrDisconnect() {
  if (bleConnected) {
    bleDisconnect();
  } else {
    bleConnect();   // opens the list of boards. Pick Board- and your number
  }
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
