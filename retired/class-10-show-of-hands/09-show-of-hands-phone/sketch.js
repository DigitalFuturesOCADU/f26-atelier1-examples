// 09 · Show of Hands: Phone
// Your phone shows its own marker, so a camera can count you.
// Pick a seat number, tap Start, then tilt the phone left for A or right for B.
// The choice stays when you straighten the phone, so you can hold it up to the camera.
// There is no network. The only thing that carries your vote is the picture on your screen.
//
// Pair it with 10 Show of Hands: Projector, which finds every marker in the room.
//
// What to try
//   Tilt left, then right. The marker changes and the phone buzzes (where it can).
//   Turn the brightness all the way up. A bright screen reads from farther away.
//   Hold the phone still with the whole screen facing the camera. A thumb over the white
//   edge hides the marker. The white border around the black square is part of the marker.
//   On a laptop, press the left or right arrow key, or click the left or right half.
//
// Key data
//   seat       your number, 1 to 99. It is kept on this phone (localStorage)
//   vote       null before you choose, then 'A' or 'B'
//   id         the marker number: the seat for A, the seat plus 100 for B
//   dictionary ARUCO_MIP_36h12 from js-aruco2. dictionary.codeList[id] is a string of 36
//              characters, one per cell of a 6 by 6 grid. '1' is a white cell, '0' a black one
//
// The marker is 10 cells wide: a white border, a black frame, then the 6 by 6 code
// (the same drawing as js-aruco2's generateSVG). Every cell is one whole number of screen pixels,
// so the edges stay sharp.

// the feel of the piece. change these before you change anything else.
let tiltAt = 20;         // degrees of tilt that choose a side. smaller is more sensitive
let holdMs = 150;        // how long the tilt must last, so a bump does not count
let voteB = 100;         // B shows the seat number plus this

const SEAT_KEY = 'atelier1-show-of-hands-seat';
const CELLS = 10;        // white border + black frame + 6 code cells + black frame + white border

let dictionary;          // the marker codes
let seat = 1;            // 1 to 99
let vote = null;         // null, 'A' or 'B'
let started = false;     // has the Start tap finished?
let startedAt = 0;
let tiltSeen = false;    // has the phone sent a real tilt reading yet? a laptop never does
let leaningTo = null;    // the side the phone is tilted toward right now
let leaningSince = 0;
let wakeLock = null;     // keeps the screen on
let wantAwake = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  angleMode(DEGREES);
  noSmooth();            // sharp edges, no blur between cells
  textFont('system-ui');

  dictionary = new AR.Dictionary('ARUCO_MIP_36h12');

  setUpStartScreen();
}

// ---------- the start screen ----------

function setUpStartScreen() {
  seat = loadSeat();
  showSeat();
  holdToRepeat(document.getElementById('minus'), -1);
  holdToRepeat(document.getElementById('plus'), 1);

  if (window.isDesktop) {
    document.getElementById('desktop-note').style.display = 'block';
  }

  // The Start tap does three things. The screen lock and full screen run first, in the tap itself,
  // because a phone only allows them while a finger has just touched the screen.
  // Then p5-phone asks for motion (and vibration) in the same tap.
  const go = document.getElementById('go');
  let tapped = false;
  function onStart() {
    if (tapped) return;
    tapped = true;
    saveSeat();
    wantAwake = true;
    keepAwake();
    goFullscreen();
  }
  go.addEventListener('touchend', onStart);
  go.addEventListener('click', onStart);
  enablePermissionsOn('#go', ['sensors', 'vibration']);
}

// p5-phone calls this once the motion question has been answered
function userSetupComplete() {
  started = true;
  startedAt = millis();
  document.getElementById('start').style.display = 'none';
}

function loadSeat() {
  let saved = NaN;
  try {
    saved = parseInt(localStorage.getItem(SEAT_KEY), 10);
  } catch (error) {
    // storage can be blocked. a new random seat is fine then
  }
  if (saved >= 1 && saved <= 99) return saved;
  const first = Math.floor(Math.random() * 99) + 1;
  seat = first;
  saveSeat();
  return first;
}

function saveSeat() {
  try {
    localStorage.setItem(SEAT_KEY, String(seat));
  } catch (error) {
    // not saved. it still works for this visit
  }
}

function showSeat() {
  document.getElementById('seat').textContent = seat;
}

function changeSeat(by) {
  seat = ((seat - 1 + by + 99) % 99) + 1; // 1 to 99, and round again at the ends
  showSeat();
  saveSeat();
}

// press the button for one step, hold it to keep stepping, faster and faster
function holdToRepeat(button, by) {
  let timer = null;
  function stop() {
    clearTimeout(timer);
    timer = null;
  }
  function again(wait) {
    changeSeat(by);
    timer = setTimeout(function () { again(Math.max(70, wait * 0.8)); }, wait);
  }
  button.addEventListener('pointerdown', function (event) {
    event.preventDefault();
    again(450);
  });
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointerleave', stop);
  button.addEventListener('pointercancel', stop);
}

// ---------- screen lock and full screen ----------

// the browser gives the lock back whenever the page is hidden, so ask again when it returns
document.addEventListener('visibilitychange', function () {
  if (wantAwake && document.visibilityState === 'visible') keepAwake();
});

async function keepAwake() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (error) {
    console.warn('The screen lock was refused: ' + error.message); // low battery or power saving
  }
}

function goFullscreen() {
  // iPhone Safari cannot do this for a page. That is fine, the marker still fills the screen
  const page = document.documentElement;
  if (page.requestFullscreen) {
    page.requestFullscreen().catch(function () {});
  }
}

// ---------- choosing ----------

// How far the right edge of the phone sits below the left edge, in degrees.
// Negative is a tilt to the left. Positive is a tilt to the right.
// rotationX is the front to back tilt and rotationY the side to side tilt. rotationY alone
// jumps around when the phone stands upright, so this uses gravity across the screen instead.
// It stays steady when the phone lies flat, is held at an angle, or is held up to a camera.
function tiltAngle() {
  return asin(cos(rotationX) * sin(rotationY));
}

function readTilt() {
  const tilt = tiltAngle();
  let side = null;
  if (tilt <= -tiltAt) side = 'A';
  if (tilt >= tiltAt) side = 'B';

  if (side === null) {
    leaningTo = null; // straight again. the choice stays
    return;
  }
  if (side !== leaningTo) {
    leaningTo = side;
    leaningSince = millis();
  } else if (millis() - leaningSince > holdMs) {
    choose(side);
  }
}

function choose(side) {
  if (side === vote) return;
  vote = side;
  if (window.vibrationEnabled) vibrate(40);
}

function markerId() {
  return seat + (vote === 'B' ? voteB : 0);
}

// ---------- drawing ----------

function draw() {
  if (!started) {
    background(20);
    return;
  }

  if (window.sensorsEnabled) {
    if (rotationX !== 0 || rotationY !== 0) tiltSeen = true;
    if (tiltSeen) readTilt();
  }

  if (vote === null) {
    drawWaiting();
  } else {
    drawMarkerScreen();
  }
}

// before you choose: no marker yet, only a prompt and a gauge
function drawWaiting() {
  background(20);
  const portrait = height >= width;
  const tilt = tiltSeen ? tiltAngle() : 0;
  const pullA = constrain(-tilt / tiltAt, 0, 1);
  const pullB = constrain(tilt / tiltAt, 0, 1);

  // the two choices light up as you tilt toward them
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  textSize(portrait ? width * 0.45 : min(height * 0.6, width * 0.25));
  fill(lerp(50, 255, pullA));
  text('A', width * 0.25, height * 0.46);
  fill(lerp(50, 255, pullB));
  text('B', width * 0.75, height * 0.46);

  // the prompt
  fill(255);
  textAlign(CENTER, TOP);
  textSize(constrain(width * 0.062, 20, 36));
  text('Tilt left for A, right for B', 16, height * 0.06, width - 32);

  // the gauge. the two ticks are where a tilt turns into a choice
  const margin = width * 0.12;
  const gaugeY = height * 0.82;
  const reach = width / 2 - margin;
  stroke(90);
  strokeWeight(4);
  line(margin, gaugeY, width - margin, gaugeY);
  stroke(200);
  const tickX = map(tiltAt, 0, 45, 0, reach);
  line(width / 2 - tickX, gaugeY - 14, width / 2 - tickX, gaugeY + 14);
  line(width / 2 + tickX, gaugeY - 14, width / 2 + tickX, gaugeY + 14);
  noStroke();
  fill(255);
  circle(width / 2 + map(constrain(tilt, -45, 45), 0, 45, 0, reach), gaugeY, 26);

  // small print
  textStyle(NORMAL);
  fill(150);
  textSize(constrain(width * 0.04, 14, 20));
  text('seat ' + seat, 16, height * 0.9, width - 32);
  if (!tiltSeen && millis() - startedAt > 1500) {
    fill(220);
    text('No tilt sensor found. Press the left or right arrow key, or tap the left or right half.',
         24, height * 0.9 + constrain(width * 0.07, 24, 32), width - 48);
  }
}

// after you choose: the marker as big as the screen allows, black on pure white
function drawMarkerScreen() {
  background(255);
  const density = pixelDensity();
  const portrait = height >= width;

  // one cell is a whole number of screen pixels, so no edge falls between two pixels
  const room = portrait ? width : height;
  const cell = Math.floor(room * density / CELLS) / density;
  const span = cell * CELLS;

  // room for the label: under the marker on a tall screen, beside it on a wide one
  const labelSize = portrait ? span * 0.5 : span * 0.6;
  let x;
  let y;
  if (portrait) {
    x = snap((width - span) / 2, density);
    y = snap(max(0, (height - span - labelSize) / 2), density);
  } else {
    x = snap(max(0, (width - span - labelSize) / 2), density);
    y = snap((height - span) / 2, density);
  }

  drawMarker(markerId(), x, y, cell);

  // the label sits in a box under the marker (beside it on a wide screen), well outside the white border
  const id = markerId();
  let boxX;
  let boxY;
  let boxWidth;
  if (portrait) {
    boxWidth = width - 24;
    boxX = 12;
    boxY = y + span + cell * 0.6;
  } else {
    boxWidth = labelSize;
    boxX = x + span + cell * 0.6;
    boxY = height / 2 - labelSize * 0.35;
  }
  const smallSize = max(14, span * 0.048);
  noStroke();
  textAlign(CENTER, TOP);
  fill(0);
  textStyle(BOLD);
  textSize(span * 0.26);
  text(vote, boxX, boxY, boxWidth);
  textStyle(NORMAL);
  fill(60);
  textSize(smallSize);
  text('seat ' + seat + ' · marker ' + id, boxX, boxY + span * 0.32, boxWidth);
  fill(110);
  textSize(max(12, span * 0.04));
  text('Tilt to change', boxX, boxY + span * 0.32 + smallSize * 1.6, boxWidth);
}

// A marker drawn from the code list: a black square, then a white cell wherever the code has a '1'.
// (x, y) is the top left of the white border. cell is the size of one cell.
function drawMarker(id, x, y, cell) {
  const pattern = dictionary.codeList[id];
  const bits = dictionary.markSize - 2; // 6 cells across the code
  noStroke();
  fill(0);
  rect(x + cell, y + cell, (bits + 2) * cell, (bits + 2) * cell);
  fill(255);
  for (let row = 0; row < bits; row++) {
    for (let col = 0; col < bits; col++) {
      if (pattern[row * bits + col] === '1') {
        rect(x + (col + 2) * cell, y + (row + 2) * cell, cell, cell);
      }
    }
  }
}

// round to a whole screen pixel
function snap(value, density) {
  return Math.round(value * density) / density;
}

// ---------- laptop and no-sensor fallbacks ----------

function keyPressed() {
  if (!started) return;
  if (key === 'ArrowLeft') choose('A');
  if (key === 'ArrowRight') choose('B');
  return false;
}

// A click or tap on the left half is A, on the right half is B. Only on a laptop,
// or on a phone that has shown no tilt reading, so a touch never moves a vote by accident.
function mouseReleased() {
  const noSensor = !tiltSeen && millis() - startedAt > 2000;
  if (started && millis() - startedAt > 400 && (window.isDesktop || noSensor)) {
    choose(mouseX < width / 2 ? 'A' : 'B');
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
