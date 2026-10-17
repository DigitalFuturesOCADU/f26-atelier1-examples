// The Wall: Wall
// Share. Every phone in the class can leave one mark on this wall. A mark is a dot, in the
// colour of the phone that left it. Each mark fades over 24 hours and is deleted after 24 hours.
// This page draws every mark, counts them, and says out loud what the wall remembers.
//
// This is memory Level 4, the room between visits. Share with the keep option holds the marks
// after the last phone leaves, so the next visitor meets what the last one left.
//
// The keep option needs the next p5-phone release. This page loads p5-phone 1.15.4, which has
// no keep, so for now the wall works and it forgets when everyone leaves. The page says which
// of the two it is doing. Change the version in index.html when Nick announces the release.
//
// The rule: Share keeps only the last thing written. If every phone did shared.marks.push(...),
// phones adding at the same moment would lose marks. So every mark has its own key in shared,
// and no two phones ever write the same key.
//
// Run this on one laptop. Open only one wall page for a room. On a call, share its window.
// Phones join with the code on the right, or with the address under it.
//
// Try this:
//   Open the phone page and tap the wall. A new dot arrives here with a ring round it.
//   Close every phone and this page, then open the wall again. See what is still there.
//   Press C to clear the wall for everyone. It asks first.
//
// Key data:
//   shared['m-' + id + '-' + n]   one mark: { x, y, t, hue }
//                                 x and y run from 0 to 1 across the wall, t is Date.now(), hue is 0 to 360
//   shareKept                     true when the server keeps this room after the last phone leaves
//   shareKeptUntil                when the kept room is deleted if nothing changes (ms, like Date.now())
//   delete shared[key]            how a page removes a mark that is more than 24 hours old
//   shareClear()                  puts shared back to empty for every phone, and erases the kept copy.
//                                 p5-phone 1.15.4 does not have it, so the C key deletes the marks one by one

const ROOM = 'the-wall';

// the rules of the wall. the phone page has the same numbers. change both together
const KEEP = '7d';           // how long the room is kept after the last mark. '7d' is seven days
const FADE_HOURS = 24;       // a mark fades over this many hours, and is deleted at the end
const MAX_MARKS = 600;       // the phone page stops adding marks here. a kept room holds 64 KB
const MARK_PREFIX = 'm-';    // every mark's key starts with this

const FADE_MS = FADE_HOURS * 60 * 60 * 1000;

let field = { x: 0, y: 0, w: 100, h: 100 }; // where the marks are drawn
let marks = [];              // the marks that are on the wall right now
let seen = {};               // keys already on the wall, so a new one can show a ring
let wallOpened = false;      // true once the first look at the room has been taken
let born = {};               // when each new mark arrived, in millis()
let lastSweep = 0;
let lastClear = -1000;       // millis() at the last press of C

function setup() {
  createCanvas(windowWidth, windowHeight);
  // join the room as the wall. the page address can carry ?shareHost= and ?room=
  // keep: '7d' asks for the room to be kept. a server or a p5-phone without it just ignores it
  projectorSetup(ROOM, 'The Wall', {}, { keep: KEEP });
  layoutProjector();
  layoutWall();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutProjector();
  layoutWall();
  showJoinCode();
}

function layoutWall() {
  field.x = arena.x;
  field.y = arena.y;
  field.w = arena.w;
  field.h = arena.h - 150 * u; // the lines about memory go underneath
}

function draw() {
  background(20);

  if (shareConnected) {
    marks = readMarks();
    noticeNewMarks();
    if (millis() - lastSweep > 1000) {
      sweepOldMarks();
      lastSweep = millis();
    }
  } else {
    marks = [];
  }

  drawTitle('Tap your phone to leave a mark. Every mark fades over a day.');
  drawField();
  drawMarks();
  drawMemory();
  drawJoinColumn('MARKS', marks.length, 96);
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
    // a phone with a clock set ahead gives a negative age. that counts as new
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

// a mark that was not here a moment ago gets a ring. marks already here when this page
// opened do not, because they are not new
function noticeNewMarks() {
  const present = {};
  for (let i = 0; i < marks.length; i++) {
    const key = marks[i].key;
    present[key] = true;
    if (!seen[key]) {
      seen[key] = true;
      if (wallOpened) {
        born[key] = millis();
      }
    }
  }
  // forget marks that are gone, so seen does not grow
  const keys = Object.keys(seen);
  for (let i = 0; i < keys.length; i++) {
    if (!present[keys[i]]) {
      delete seen[keys[i]];
      delete born[keys[i]];
    }
  }
  wallOpened = true;
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

function drawField() {
  noStroke();
  fill(26);
  rect(field.x, field.y, field.w, field.h);
  noFill();
  stroke(70);
  strokeWeight(2 * u);
  rect(field.x, field.y, field.w, field.h);
  noStroke();
}

function drawMarks() {
  // fewer pixels per mark when the wall fills up
  const r = 17 * u * constrain(map(marks.length, 60, MAX_MARKS, 1, 0.6), 0.6, 1);
  const ctx = drawingContext;
  ctx.save(); // the marks use the canvas directly, so put its state back afterwards
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    // a mark at the edge stays inside the frame
    const x = field.x + r + m.x * (field.w - 2 * r);
    const y = field.y + r + m.y * (field.h - 2 * r);
    // a new mark is fully bright. at 24 hours it is almost gone
    const fade = m.age / FADE_MS;
    const alpha = lerp(1, 0.12, fade);
    ctx.fillStyle = 'hsla(' + m.hue + ', 85%, 64%, ' + alpha + ')';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TWO_PI);
    ctx.fill();

    // a ring that grows and goes, for the first second
    const b = born[m.key];
    if (b !== undefined) {
      const k = (millis() - b) / 1200;
      if (k < 1) {
        ctx.strokeStyle = 'hsla(' + m.hue + ', 85%, 74%, ' + (1 - k) + ')';
        ctx.lineWidth = 4 * u;
        ctx.beginPath();
        ctx.arc(x, y, r + k * 60 * u, 0, TWO_PI);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// what this wall remembers, said plainly, under the marks
function drawMemory() {
  const x = field.x;
  const y = field.y + field.h;
  noStroke();
  textAlign(LEFT, BASELINE);
  if (serverProblem || !shareConnected) {
    return;
  }

  const words = memoryWords();
  const head = words.head;
  const sub = words.sub;

  fill(255);
  textStyle(BOLD);
  textSize(40 * u);
  text(head, x, y + 56 * u);
  textStyle(NORMAL);
  fill(GREY);
  textSize(26 * u);
  const lines = wrapText(sub, field.w);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], x, y + 94 * u + i * 32 * u);
  }

  // the oldest mark, and the clear key
  let oldest = 0;
  for (let i = 0; i < marks.length; i++) {
    oldest = max(oldest, marks[i].age);
  }
  let detail = marks.length === 0
    ? 'The wall is empty.'
    : 'The oldest mark is ' + spanWords(oldest) + ' old. Marks go at ' + FADE_HOURS + ' hours.';
  detail += '  Press C to clear the wall.';
  textSize(22 * u);
  text(detail, x, y + 94 * u + lines.length * 32 * u + 8 * u);

  if (shareError) {
    fill(RED);
    textSize(24 * u);
    text(shareError, x, y + 94 * u + lines.length * 32 * u + 40 * u);
  }
}

// what the wall remembers, in two sentences
function memoryWords() {
  // p5-phone 1.15.4 has no shareKept at all, so ask the window. a plain shareKept would be an error
  if (window.shareKept) {
    // shareKeptUntil is when the kept room is deleted if nobody adds a mark.
    // each mark moves it forward
    return {
      head: 'This wall remembers.',
      sub: 'Marks stay after everyone leaves. It forgets everything in ' +
        spanWords(window.shareKeptUntil - Date.now()) + ' if nobody adds a mark.'
    };
  }
  return {
    head: 'This wall forgets when everyone leaves.',
    sub: 'This page counts as someone. When the last page closes, every mark is gone.'
  };
}

// a time as words: 3 hours 12 minutes, or 6 days 23 hours
function spanWords(ms) {
  ms = max(0, ms);
  const minutes = floor(ms / 60000);
  const days = floor(minutes / 1440);
  const hours = floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) {
    return days + (days === 1 ? ' day ' : ' days ') + hours + (hours === 1 ? ' hour' : ' hours');
  }
  if (hours > 0) {
    return hours + (hours === 1 ? ' hour ' : ' hours ') + mins + (mins === 1 ? ' minute' : ' minutes');
  }
  if (minutes > 0) {
    return minutes + (minutes === 1 ? ' minute' : ' minutes');
  }
  return 'under a minute';
}

// C clears the wall for everyone. it asks first, because it cannot be undone
function keyPressed() {
  if (key === 'c' || key === 'C') {
    if (millis() - lastClear < 500) {
      return;
    }
    if (window.confirm('Clear every mark from the wall, for everyone?')) {
      clearTheWall();
    }
    lastClear = millis();
  }
}

function clearTheWall() {
  if (typeof shareClear === 'function') {
    shareClear();      // p5-phone with the keep option. it also erases the kept copy
    return;
  }
  // p5-phone 1.15.4 has no shareClear. delete every mark one by one instead
  const keys = Object.keys(shared);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].indexOf(MARK_PREFIX) === 0) {
      delete shared[keys[i]];
    }
  }
}
