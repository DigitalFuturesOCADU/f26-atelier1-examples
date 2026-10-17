// The Wall: Phone
// Share. This is the wall, small, on your phone. Tap it to leave one mark. Your mark is a dot
// in your colour, at the place you tapped. It appears on the big wall and on every other phone.
// Each mark fades over 24 hours and is deleted after 24 hours.
//
// This is memory Level 4, the room between visits. Your colour is memory Level 2: this phone
// remembers it with localStorage, so it is the same colour next time.
//
// The keep option needs the next p5-phone release. This page loads p5-phone 1.15.4, which has
// no keep, so for now the wall works and it forgets when everyone leaves. The page says which
// of the two it is doing. Change the version in index.html when Nick announces the release.
//
// The rule: Share keeps only the last thing written. If every phone did shared.marks.push(...),
// phones adding at the same moment would lose marks. So every mark has its own key in shared,
// and no two phones ever write the same key. A mark holds a place, a time and a colour.
// It holds no name.
//
// Try this:
//   Tap the wall. Wait for the ring to fill, then tap somewhere else.
//   Open this page on a second phone and watch both marks appear on both.
//   Close the page, open it again, and see whether your mark is still there.
//   On a laptop, click the wall.
//
// Key data:
//   shared['m-' + id + '-' + n]   one mark: { x, y, t, hue }
//                                 id is the first 8 letters of shareClientId, n counts this phone's marks
//   shareKept                     true when the server keeps this room after the last phone leaves
//   shareKeptUntil                when the kept room is deleted if nothing changes (ms, like Date.now())
//   myHue                         this phone's colour, kept in localStorage by phone-kit.js

const ROOM = 'the-wall';

// the rules of the wall. the wall page has the same numbers. change both together
const KEEP = '7d';           // how long the room is kept after the last mark. '7d' is seven days
const FADE_HOURS = 24;       // a mark fades over this many hours, and is deleted at the end
const MAX_MARKS = 600;       // no more marks after this. a kept room holds 64 KB
const MARK_PREFIX = 'm-';    // every mark's key starts with this
const COOLDOWN = 1500;       // milliseconds between one mark and the next from the same phone

const FADE_MS = FADE_HOURS * 60 * 60 * 1000;

let serverOk = false;
let n = 0;                   // how many marks this phone has added since the page opened
let lastMark = -COOLDOWN;    // millis() when this phone last left a mark
let myKeys = {};             // the keys of the marks this phone left this visit
let pad = { x: 0, y: 0, w: 100, h: 100 };
let marks = [];
let lastSweep = 0;
let said = '';               // a short word after a tap, such as Left a mark
let saidAt = -9999;
let k = 1;                   // one design unit for this screen

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // keep: '7d' asks for the room to be kept. the first page into an empty room sets the rule,
  // so this page asks too, in case a phone gets there before the wall does
  serverOk = phoneSetup(ROOM, {}, { shared: {}, keep: KEEP });
  if (serverOk) {
    enableShareTap('Tap to join the wall');
    // a phone that locks leaves the room. the first tap asks it to stay awake
    document.addEventListener('click', keepAwake, { once: true, capture: true });
    document.addEventListener('touchend', keepAwake, { once: true, capture: true });
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  k = min(width / 390, height / 700);
  background(20);

  if (shareConnected) {
    marks = readMarks();
    if (millis() - lastSweep > 1000) {
      sweepOldMarks();
      lastSweep = millis();
    }
  } else {
    marks = [];
  }

  drawHeader();
  drawPad();
  drawFooter();
}

// 1. read every mark in shared. 2. keep the ones that are less than 24 hours old.
function readMarks() {
  const now = Date.now();
  const out = [];
  const keys = Object.keys(shared);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key.indexOf(MARK_PREFIX) !== 0) {
      continue;
    }
    const m = shared[key];
    if (!m || typeof m.x !== 'number' || typeof m.y !== 'number' || typeof m.t !== 'number') {
      continue;
    }
    const age = max(0, now - m.t);
    if (age > FADE_MS) {
      continue;
    }
    out.push({
      key: key,
      x: constrain(m.x, 0, 1),
      y: constrain(m.y, 0, 1),
      hue: typeof m.hue === 'number' ? m.hue : 0,
      age: age
    });
  }
  return out;
}

// whichever page sees a mark that is more than 24 hours old first deletes it.
// two pages deleting the same key at once is safe
function sweepOldMarks() {
  const now = Date.now();
  const keys = Object.keys(shared);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key.indexOf(MARK_PREFIX) !== 0) {
      continue;
    }
    const m = shared[key];
    if (m && typeof m.t === 'number' && now - m.t > FADE_MS) {
      delete shared[key];
    }
  }
}

// one tap, one mark, at the place you tapped
function mousePressed() {
  if (!serverOk || !shareConnected) {
    return false;
  }
  keepAwake();
  if (mouseX < pad.x || mouseX > pad.x + pad.w || mouseY < pad.y || mouseY > pad.y + pad.h) {
    return false;
  }
  if (millis() - lastMark < COOLDOWN) {
    say('Wait a moment');
    return false;
  }
  if (marks.length >= MAX_MARKS) {
    say('The wall is full. Marks go after ' + FADE_HOURS + ' hours.');
    return false;
  }
  addMark((mouseX - pad.x) / pad.w, (mouseY - pad.y) / pad.h);
  return false;
}

function addMark(x, y) {
  // one key for each mark. the id is this phone's, so two phones never write the same key
  const key = MARK_PREFIX + shareClientId.slice(0, 8) + '-' + n++;
  shared[key] = {
    x: round(constrain(x, 0, 1) * 1000) / 1000,
    y: round(constrain(y, 0, 1) * 1000) / 1000,
    t: Date.now(),
    hue: myHue
  };
  myKeys[key] = true;
  lastMark = millis();
  say('Left a mark');
}

function say(words) {
  said = words;
  saidAt = millis();
}

function drawHeader() {
  noStroke();
  fill(255);
  textStyle(BOLD);
  if (!serverOk) {
    textSize(26 * k);
    centreLines(serverProblem, height * 0.2, width * 0.85, 34 * k);
    textStyle(NORMAL);
    return;
  }
  textSize(34 * k);
  centreLines('The Wall', 56 * k, width * 0.9, 40 * k);
  textStyle(NORMAL);

  fill(GREY_TEXT);
  textSize(19 * k);
  let line = 'Connecting';
  if (shareConnected) {
    const t = millis() - saidAt;
    if (t < 2500 && said) {
      fill(255, 200, 0);
      line = said;
    } else {
      line = marks.length === 1 ? '1 mark on the wall' : marks.length + ' marks on the wall';
    }
  }
  centreLines(line, 86 * k, width * 0.9, 24 * k);
}

// the pad is the wall, small. a tap anywhere on it leaves a mark there
function drawPad() {
  if (!serverOk) {
    return;
  }
  pad.x = 20 * k;
  pad.y = 110 * k;
  pad.w = width - 40 * k;
  pad.h = max(120, height - pad.y - 170 * k);

  noStroke();
  fill(26);
  rect(pad.x, pad.y, pad.w, pad.h);
  noFill();
  stroke(70);
  strokeWeight(2 * k);
  rect(pad.x, pad.y, pad.w, pad.h);
  noStroke();

  const ctx = drawingContext;
  ctx.save(); // the marks use the canvas directly, so put its state back afterwards
  const r = 7 * k * constrain(map(marks.length, 60, MAX_MARKS, 1, 0.6), 0.6, 1);
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    const x = pad.x + r + m.x * (pad.w - 2 * r);
    const y = pad.y + r + m.y * (pad.h - 2 * r);
    const alpha = lerp(1, 0.12, m.age / FADE_MS);
    ctx.fillStyle = 'hsla(' + m.hue + ', 85%, 64%, ' + alpha + ')';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TWO_PI);
    ctx.fill();
    // a white ring on the marks this phone left, so you can find yours
    if (myKeys[m.key]) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5 * k;
      ctx.beginPath();
      ctx.arc(x, y, r + 3 * k, 0, TWO_PI);
      ctx.stroke();
    }
  }
  ctx.restore();

  if (shareConnected && marks.length === 0) {
    fill(GREY_TEXT);
    textSize(20 * k);
    centreLines('The wall is empty.\nTap to leave the first mark.', pad.y + pad.h / 2 - 10 * k, pad.w * 0.8, 28 * k);
  }

  // the ring that fills while this phone waits to leave another mark
  if (shareConnected) {
    const wait = constrain((millis() - lastMark) / COOLDOWN, 0, 1);
    noFill();
    stroke(60);
    strokeWeight(4 * k);
    circle(width / 2, pad.y + pad.h + 30 * k, 36 * k);
    stroke(wait >= 1 ? color('hsl(' + myHue + ', 85%, 65%)') : color(255, 200, 0));
    strokeWeight(4 * k);
    if (wait >= 1) {
      circle(width / 2, pad.y + pad.h + 30 * k, 36 * k);
    } else {
      arc(width / 2, pad.y + pad.h + 30 * k, 36 * k, 36 * k, -HALF_PI, -HALF_PI + TWO_PI * wait);
    }
    noStroke();
  }
}

// what this wall remembers, in a line, and the state of the connection
function drawFooter() {
  noStroke();
  if (!serverOk) {
    return;
  }
  if (shareConnected) {
    fill(255);
    textSize(18 * k);
    if (window.shareKept) { // p5-phone 1.15.4 has no shareKept, so ask the window
      centreLines('This wall remembers.', height - 96 * k, width * 0.9, 24 * k);
      fill(GREY_TEXT);
      centreLines('Marks stay after you leave.', height - 70 * k, width * 0.9, 24 * k);
    } else {
      centreLines('This wall forgets when everyone leaves.', height - 70 * k, width * 0.9, 24 * k);
    }
  }
  fill(GREY_TEXT);
  textSize(16 * k);
  let line = footerLine();
  if (shareError) {
    fill(255, 90, 77);
    line = shareError;
  }
  centreLines(line, height - 28 * k, width * 0.9, 22 * k);
}
