// The Class Lamp: Hub
// Share and Bluetooth. Every phone in the Crowd Tilt room is a tilt sensor. This page reads the
// class's average tilt and sends it to a lamp over Bluetooth: an Arduino Uno R4 WiFi running
// ClassLamp.ino, with a NeoPixel strip. No phone pairs with anything. Only this laptop does.
//
// Run this on the laptop, in Chrome or Edge. Web Bluetooth needs one click, so press the
// Connect lamp button (or the C key). Phones join the Crowd Tilt projector page as usual.
//
// The mapping, from the push the class puts on the ball:
//   left to right  sets the colour:      pushed left is red, level is green, pushed right is violet
//   up and down    sets the brightness:  pushed down the screen is bright, pushed up is dim
//   how many       sets the pixels lit:  one pixel for each phone
//
// Try this:
//   Open the Crowd Tilt projector page and join with a phone. Tilt it. The lamp follows.
//   Everyone tilt the same way, then half and half. Disagreement leaves the lamp near green.
//   No lamp? The preview on this page is the same lamp. Press M to drive it with the mouse.
//
// Key data:
//   guests[i].role     'phone' for a phone, 'projector' for the big screen, 'hub' for this page
//   shared.average     { x, y, n } the class's tilt. the projector writes it. n is how many phones
//   hue, brightness, pixels   the three bytes this page writes to the lamp
//   bleWrite(name, value)     one byte each, in a queue, only when the number changed
//
// This page writes only to me. It never writes shared, so it cannot disturb the projector.

const ROOM = 'crowd-tilt';

// the lamp. the name and the service must match ClassLamp.ino
const LAMP_NAME = 'classlamp';
const LAMP_SERVICE = '19b10000-e8f2-537e-4f6c-d104768a1214'; // the one P5PhoneBLE uses unless told otherwise
const STRIP_PREVIEW = 24;     // pixels drawn in the preview. match STRIP_LENGTH in ClassLamp.ino

// the feel of the piece. change these before you change anything else.
let sendEvery = 100;          // milliseconds between looks. 100 is ten a second
let hueFrom = 0;              // the hue byte for a class pushed all the way left. 0 is red
let hueTo = 191;              // and all the way right. 191 is violet
let darkest = 40;             // the brightness byte for a class pushed all the way up. never fully off
let brightest = 255;          // and all the way down

const AMBER = '#ffc800';
const GREY = '#9a9a9a';
const GREEN = '#5ce08a';
const RED = '#ff5a4d';

let u = 1;                    // one design unit. 1 is a 1920 by 1080 screen
let average = { x: 0, y: 0, n: 0 };   // what the class says
let where = 'nobody';         // where the average came from: 'projector', 'phones', 'mouse'
let want = { hue: 96, brightness: 40, pixels: 0 };    // what the lamp should show
let sent = { hue: -1, brightness: -1, pixels: -1 };   // what the lamp was last told. -1 means nothing yet
let writing = false;          // a write is in flight. Bluetooth takes one at a time
let writeCount = 0;           // bytes written since the lamp connected
let lastWriteAt = 0;
let mouseMode = false;        // M: the mouse stands in for the class
let mouseCount = 12;          // how many phones the mouse pretends to be. up and down arrows change it
let serverProblem = '';
let roomName = ROOM;
let connectButton;
let wakeLock = null;
let lastButtonState = false;  // was the lamp connected when the button was last drawn?

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('system-ui');
  layoutHub();

  // join the Crowd Tilt room as the hub. the page address can carry ?shareHost= and ?room=
  const fromUrl = new URLSearchParams(location.search).get('shareHost');
  const host = fromUrl || window.CLASS_SHARE_HOST || '';
  if (!host || host.indexOf('REPLACE-ME') >= 0) {
    serverProblem = 'No server address yet';
  } else {
    shareSetup({
      host: host,
      room: ROOM,
      shared: {},                 // this page never writes shared
      me: { role: 'hub' },        // the projector counts only role 'phone', so the hub is not counted
      disconnectWhenHidden: false // a laptop keeps the room open
    });
    roomName = window.shareRoom.replace(/^default:/, '');
    shareConnect().catch(function () {});
  }

  // the lamp. three bytes, in this order. ClassLamp.ino declares them in the same order
  bleSetup({
    serviceUUID: LAMP_SERVICE,
    namePrefix: LAMP_NAME,
    characteristics: [
      { name: 'hue',        type: 'uint8', write: true },   // 19b10001-...
      { name: 'brightness', type: 'uint8', write: true },   // 19b10002-...
      { name: 'pixels',     type: 'uint8', write: true }    // 19b10003-...
    ]
  });

  // Web Bluetooth needs a click. This is that click
  connectButton = createButton('Connect lamp');
  connectButton.mousePressed(toggleLamp);
  styleButton();

  keepAwake();
  // draw() stops when this tab is not in front. a timer keeps the lamp going a little longer
  setInterval(tick, sendEvery);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutHub();
  styleButton();
}

function layoutHub() {
  u = min(width / 1920, height / 1080);
}

// the lamp is told something the moment it connects, and again after any gap
function bleReady() {
  sent = { hue: -1, brightness: -1, pixels: -1 };
  writeCount = 0;
  tick();
}

function bleClosed() {
  sent = { hue: -1, brightness: -1, pixels: -1 };
  writing = false;
}

function toggleLamp() {
  if (bleConnected) {
    bleDisconnect();
  } else {
    bleConnect();
  }
}

function keyPressed() {
  if (key === 'c' || key === 'C') {
    toggleLamp();
  }
  if (key === 'm' || key === 'M') {
    mouseMode = !mouseMode;
  }
  if (key === 'ArrowUp') {
    mouseCount = min(mouseCount + 1, 255);
  }
  if (key === 'ArrowDown') {
    mouseCount = max(mouseCount - 1, 0);
  }
}

// ten times a second: 1. read the class. 2. work out the lamp. 3. tell the lamp if it changed
function tick() {
  readTheClass();
  want = lampFor(average);
  sendLamp();
}

// the class's average tilt. the projector writes it to shared.average. with no projector in the
// room, add up the phones here
function readTheClass() {
  if (mouseMode) {
    average = {
      x: constrain(mouseX / width * 2 - 1, -1, 1),
      y: constrain(mouseY / height * 2 - 1, -1, 1),
      n: mouseCount
    };
    where = 'mouse';
    return;
  }
  if (typeof guests === 'undefined' || !shareConnected) {
    average = { x: 0, y: 0, n: 0 };
    where = 'nobody';
    return;
  }
  const phones = guests.filter(function (g) {
    return g.role === 'phone';
  });
  const projectorHere = guests.some(function (g) {
    return g.role === 'projector';
  });
  const said = shared.average;
  if (projectorHere && said && isFinite(said.x) && isFinite(said.y) && isFinite(said.n)) {
    average = { x: said.x, y: said.y, n: said.n };
    where = 'projector';
    return;
  }
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < phones.length; i++) {
    sx += phones[i].x || 0;
    sy += phones[i].y || 0;
  }
  const n = phones.length;
  average = { x: n > 0 ? sx / n : 0, y: n > 0 ? sy / n : 0, n: n };
  where = 'phones';
}

// the whole mapping, in one place. three numbers, each one byte
function lampFor(avg) {
  return {
    hue: round(map(constrain(avg.x, -1, 1), -1, 1, hueFrom, hueTo)),
    brightness: round(map(constrain(avg.y, -1, 1), -1, 1, darkest, brightest)),
    pixels: constrain(round(avg.n), 0, 255)
  };
}

// write the numbers that changed, one at a time. Web Bluetooth does one write at a time, and a
// second one started too soon fails. if the class moves while a write is on its way, the next
// look sends the newest numbers
async function sendLamp() {
  if (!bleConnected || writing) {
    return;
  }
  writing = true;
  try {
    const names = ['hue', 'brightness', 'pixels'];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const value = want[name];
      if (sent[name] !== value) {
        const ok = await bleWrite(name, value);
        if (!ok) {
          break;
        }
        sent[name] = value;
        writeCount += 1;
        lastWriteAt = millis();
      }
    }
  } finally {
    writing = false;
  }
}

// ---- drawing ----

function draw() {
  background(20);
  noStroke();

  // the lamp as it will look, from what is wanted. the real lamp eases toward this
  const col = lampColour(want.hue, want.brightness);
  const lit = bleConnected ? max(want.pixels, 1) : want.pixels;

  drawTitle();
  drawLampPreview(col, lit);
  drawNumbers();
  drawStates();
  drawHints();

  // the button follows the connection
  if (lastButtonState !== bleConnected) {
    lastButtonState = bleConnected;
    styleButton();
  }
}

function drawTitle() {
  fill(255);
  textAlign(LEFT, BASELINE);
  textStyle(BOLD);
  textSize(56 * u);
  text('The Class Lamp', 48 * u, 84 * u);
  textStyle(NORMAL);
  fill(GREY);
  textSize(30 * u);
  text('The hub. The lamp follows the class.', 48 * u, 128 * u);
}

// a big glow and a strip of pixels, in the lamp's colour
function drawLampPreview(col, lit) {
  const cx = 48 * u + 440 * u;
  const cy = 480 * u;
  // the glow: bigger and brighter with the brightness
  const level = want.brightness / 255;
  for (let i = 6; i > 0; i--) {
    fill(red(col), green(col), blue(col), 14 + (6 - i) * 7);
    circle(cx, cy, (230 + i * 52) * u * (0.6 + level * 0.4));
  }
  fill(col);
  circle(cx, cy, 300 * u);

  // the strip
  const gap = 36 * u;
  const total = STRIP_PREVIEW;
  const x0 = cx - (total - 1) * gap / 2;
  const y0 = 830 * u;
  for (let i = 0; i < total; i++) {
    if (i < lit) {
      fill(col);
    } else {
      fill(48);
    }
    circle(x0 + i * gap, y0, 26 * u);
  }
  fill(GREY);
  textAlign(CENTER, BASELINE);
  textSize(26 * u);
  const shownLit = min(lit, total);
  text(shownLit + ' of ' + total + ' pixels lit', cx, y0 + 56 * u);
  textAlign(LEFT, BASELINE);
}

// the colour a lamp with these two bytes shows
function lampColour(hue, brightness) {
  push();
  colorMode(HSB, 360, 100, 100);
  const c = color(hue / 256 * 360, 100, 12 + 88 * brightness / 255);
  pop();
  return c;
}

function drawNumbers() {
  const x = 1240 * u;
  fill(GREY);
  textSize(26 * u);
  text('PHONES', x, 58 * u);
  fill(255);
  textStyle(BOLD);
  textSize(150 * u);
  text(average.n, x, 190 * u);
  textStyle(NORMAL);

  fill(GREY);
  textSize(26 * u);
  text('THE CLASS PUSHES THE BALL', x, 262 * u);
  fill(AMBER);
  textStyle(BOLD);
  textSize(54 * u);
  text('x ' + nfs(average.x, 1, 2) + '    y ' + nfs(average.y, 1, 2), x, 322 * u);
  textStyle(NORMAL);

  fill(GREY);
  textSize(26 * u);
  text('THE LAMP IS TOLD', x, 392 * u);
  fill(255);
  textSize(36 * u);
  text('hue ' + want.hue, x, 440 * u);
  text('brightness ' + want.brightness, x, 484 * u);
  text('pixels ' + want.pixels, x, 528 * u);
}

function drawStates() {
  const x = 1240 * u;
  let y = 612 * u;

  // Share
  let share = { dot: RED, words: 'Share: cannot reach the server. Trying again' };
  if (serverProblem) {
    share = { dot: RED, words: 'Share: ' + serverProblem };
  } else if (shareConnected) {
    share = { dot: GREEN, words: 'Share: connected, room ' + roomName };
  } else if (shareStatus === 'connecting' || shareStatus === 'idle') {
    share = { dot: AMBER, words: 'Share: connecting' };
  }
  y = stateRow(share.dot, share.words, x, y);

  // where the numbers come from
  let source = 'Waiting for phones';
  let sourceDot = AMBER;
  if (where === 'projector') {
    source = 'Numbers: from the projector (shared.average)';
    sourceDot = GREEN;
  } else if (where === 'phones') {
    source = average.n > 0 ? 'Numbers: added up here. No projector in the room' : 'Waiting for phones. No projector in the room yet';
    sourceDot = average.n > 0 ? GREEN : AMBER;
  } else if (where === 'mouse') {
    source = 'Numbers: the mouse. Press M to stop. Up and down change the phones';
    sourceDot = AMBER;
  }
  y = stateRow(sourceDot, source, x, y);

  // the lamp
  let lamp = { dot: AMBER, words: 'Lamp: not connected. The preview still works' };
  if (bleConnected) {
    lamp = { dot: GREEN, words: 'Lamp: connected to ' + (window.bleDeviceName || LAMP_NAME) + '. ' + writeCount + ' bytes written' };
  } else if (bleStatus === 'requesting' || bleStatus === 'connecting') {
    lamp = { dot: AMBER, words: 'Lamp: connecting' };
  } else if (bleStatus === 'unsupported') {
    lamp = { dot: RED, words: 'Lamp: ' + (window.bleError || 'this browser has no Web Bluetooth. Use Chrome or Edge') };
  } else if (bleStatus === 'error') {
    lamp = { dot: RED, words: 'Lamp: ' + (window.bleError || 'could not connect') };
  } else if (bleStatus === 'disconnected') {
    lamp = { dot: RED, words: 'Lamp: lost. Press Connect lamp' };
  }
  stateRow(lamp.dot, lamp.words, x, y);
}

// one line with a coloured dot. returns where the next line goes
function stateRow(dotColour, words, x, y) {
  fill(dotColour);
  circle(x + 9 * u, y - 8 * u, 18 * u);
  fill(255);
  textSize(26 * u);
  const lines = wrapWords(words, 620 * u - 34 * u);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], x + 32 * u, y + i * 32 * u);
  }
  return y + lines.length * 32 * u + 22 * u;
}

function drawHints() {
  fill(GREY);
  textSize(22 * u);
  textAlign(LEFT, BASELINE);
  const lines = [
    'Left to right is the colour. Up and down is the brightness. One pixel for each phone.',
    'Keep this tab in front. C connects the lamp. M lets the mouse drive it, to test without phones.'
  ];
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], 48 * u, height - 56 * u + i * 30 * u);
  }
}

// the Connect lamp button, over the bottom right corner of the canvas
function styleButton() {
  if (!connectButton) {
    return;
  }
  connectButton.position(1240 * u, height - 190 * u);
  connectButton.style('font-size', max(16, 30 * u) + 'px');
  connectButton.style('font-weight', '700');
  connectButton.style('padding', (14 * u) + 'px ' + (34 * u) + 'px');
  connectButton.style('border', '0');
  connectButton.style('border-radius', '0');
  connectButton.style('cursor', 'pointer');
  connectButton.style('background', bleConnected ? '#333333' : AMBER);
  connectButton.style('color', bleConnected ? '#ffffff' : '#141414');
  connectButton.html(bleConnected ? 'Disconnect lamp' : 'Connect lamp');
}

// break words into lines no wider than w. text size must be set first
function wrapWords(str, w) {
  const words = String(str).split(' ');
  const lines = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const next = line ? line + ' ' + words[i] : words[i];
    if (line && textWidth(next) > w) {
      lines.push(line);
      line = words[i];
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

// a laptop that sleeps drops the room. ask it to stay awake
async function keepAwake() {
  if (!('wakeLock' in navigator)) {
    return;
  }
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) {
    wakeLock = null;
  }
}
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') {
    keepAwake();
  }
});
