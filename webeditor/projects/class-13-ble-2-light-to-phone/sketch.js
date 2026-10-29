// Example 2: Light to Phone (the phone side)
// A light sensor on the Arduino sets how bright this screen is.
// Cover the sensor with your hand and the screen goes dark.
// The board sends one number, the light, from 0 (dark) to 1023 (bright).
//
// Arduino code for the board: LightToPhone.zip
//   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/2-light-to-phone/LightToPhone.zip
//
// Bluetooth from a web page works in Chrome on Android and on a laptop.
// On an iPhone, open this page in the Bluefy app.

// 1. YOUR BOARD NUMBER
// Three digits, the same as BOARD_NUMBER in the Arduino code.
// On a page you did not edit, add ?board= and your number to the address: ...?board=007
const BOARD_NUMBER = new URLSearchParams(location.search).get('board') || '001';

// 2. THE ADDRESSES (UUIDs). They match the Arduino code, and end in your board number.
const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;
const LIGHT_UUID = '19b10002-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;

let light = 0;   // the last reading from the board, 0 to 1023
let connectButton;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 3. SET UP BLUETOOTH: one service with one value in it.
  // uint16 is two bytes, 0 to 65535. notify: true means the board sends it when it changes.
  bleSetup({
    serviceUUID: SERVICE_UUID,
    characteristics: [
      { name: 'light', uuid: LIGHT_UUID, type: 'uint16', notify: true, read: true }
    ]
  });

  // 4. A BUTTON TO CONNECT. Bluetooth only starts from a tap.
  connectButton = createButton('Connect');
  connectButton.position(20, 20);
  connectButton.mousePressed(connectOrDisconnect);
  lockGestures();

  // on a laptop, a QR code of this page (with ?board=) so you can open it on your phone
  showDesktopQr({ label: 'Open on your phone', size: 120 });
}

// 5. A NEW READING ARRIVED. p5-phone calls this each time the board sends one
function bleReceive(name, value) {
  if (name === 'light') {
    light = value;
  }
}

// the board just connected: ask for the light now, instead of waiting for it to change
function bleReady() {
  bleRead('light');   // the answer arrives in bleReceive()
}

function draw() {
  // 6. USE IT: the light sets the brightness of the screen
  const level = map(light, 0, 1023, 0, 255, true);
  background(level);

  // the number, in a colour you can read on light or dark
  fill(level > 128 ? 0 : 255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(96);
  text(light, width / 2, height / 2);
  textSize(18);
  text('light, from 0 to 1023', width / 2, height / 2 + 70);

  drawStatus(level > 128 ? 60 : 180);
}

function connectOrDisconnect() {
  if (bleConnected) {
    bleDisconnect();
  } else {
    bleConnect();   // opens the list of boards. Pick Board- and your number
  }
}

function drawStatus(ink) {
  fill(ink);
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
