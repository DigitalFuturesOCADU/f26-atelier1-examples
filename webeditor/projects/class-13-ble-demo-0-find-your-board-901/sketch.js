// 0 Find Your Board
// How many Bluetooth signals are in this room? And how do you find your one board among them?
// Each button opens the browser's list of nearby devices, filtered three ways:
//
//   Everything        no filter. Every device that is advertising: phones, headphones,
//                     laptops, watches, and every board in the room
//   Every Board-      only devices whose name starts with Board-. Every board in the class
//   Only mine         only the device that advertises your board's service address,
//                     the one that ends in your number
//
// Count the list each time. Pick a device to see its name. Nothing connects.
// The board side is Board Check, which advertises Board- and your number:
//   https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-13/bluetooth/0-find-your-board/BoardCheck.zip
// This sketch on the p5 Web Editor: https://editor.p5js.org/npuckett/sketches/9tF2AttBQ
//
// This uses Web Bluetooth directly, so you can see the filters. p5-phone is only for the QR code.
// It works in Chrome on Android and on a laptop. On an iPhone, open it in the Bluefy app.

// YOUR BOARD NUMBER. Three digits, the same as in the Arduino code.
// On a page you did not edit, add ?board= and your number to the address: ...?board=007
const BOARD_NUMBER = new URLSearchParams(location.search).get('board') || '901';
const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1' + BOARD_NUMBER;

let message = 'Press a button. Count what is in the list.';

function setup() {
  createCanvas(windowWidth, windowHeight);

  // three buttons, three filters
  createButton('Everything').position(20, 20).mousePressed(() => {
    pick({ acceptAllDevices: true }, 'everything');
  });
  createButton('Every Board-').position(20, 90).mousePressed(() => {
    pick({ filters: [{ namePrefix: 'Board-' }] }, 'names that start with Board-');
  });
  createButton('Only mine').position(20, 160).mousePressed(() => {
    pick({ filters: [{ services: [SERVICE_UUID] }] }, 'the service that ends in ' + BOARD_NUMBER);
  });

  // on a laptop, a QR code of this page (with ?board=) so you can open it on your phone
  showDesktopQr({ label: 'Open on your phone', size: 120 });
}

// open the browser's list with one filter, and show what was picked
async function pick(options, what) {
  if (!navigator.bluetooth) {
    message = 'No Bluetooth here. Use Chrome, or Bluefy on an iPhone.';
    return;
  }
  try {
    const device = await navigator.bluetooth.requestDevice(options);
    message = 'Filter: ' + what + '\nYou picked: ' + (device.name || 'a device with no name');
  } catch (error) {
    // closing the list without picking lands here
    message = 'Filter: ' + what + '\nNothing picked.';
  }
}

function draw() {
  background(20);
  fill(255);
  noStroke();
  textSize(20);
  textAlign(LEFT, TOP);
  text(message, 20, 240, width - 40);
  fill(150);
  textSize(15);
  text('Your number: ' + BOARD_NUMBER + '\nYour service: ' + SERVICE_UUID, 20, height - 70, width - 40);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
