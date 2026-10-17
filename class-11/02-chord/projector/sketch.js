// 02 Chord: Projector
// Share. The room is the instrument. This page gives every phone one note of a chord.
// Each phone plays its note, and the tilt of the phone sets how loud. Raise a phone and its
// note gets louder. Lay it flat and it goes quiet. This page makes no sound. The sound is
// in the room, from every phone.
//
// The rule: Share keeps only the last thing written, so each phone keeps its own volume in me,
// this page adds them up, and this page is the only one that writes shared.
//
// How notes are given out: this page writes shared.parts, a list of phone and note pairs.
// A new phone gets the note with the fewest phones on it. A phone that leaves is taken off.
// If one note ends up with 2 more phones than another, one phone is moved. So the chord
// stays full at any size of class, and a phone's note rarely changes.
//
// Run this on the laptop that is on the projector, and open only one projector page for a room.
// Phones join with the code on the right.
//
// Try this:
//   Keys 1 2 3 4 change the chord. Every phone keeps its place and plays the new note.
//   Key M turns on a quiet monitor, so you can hear the mix on this laptop.
//   Raise one phone and watch its bar grow.
//
// Key data:
//   guests[i].vol                    one phone's volume, from 0 to 1
//   shared.parts[phoneId]            the note a phone plays. 0 is the lowest note
//   shared.chord                     { name, names, hz } the chord, for phones to read
//   shared.chordIndex                which of the four chords it is

const ROOM = 'chord';

// the chords. each has four notes, low to high, and the pitch of each in hertz.
// C, A minor, F and G7 are the chords of a very old song, and they fit one after another
let chords = [
  { name: 'C major', names: ['C4', 'E4', 'G4', 'C5'], hz: [261.63, 329.63, 392.00, 523.25] },
  { name: 'A minor', names: ['A3', 'C4', 'E4', 'A4'], hz: [220.00, 261.63, 329.63, 440.00] },
  { name: 'F major', names: ['F4', 'A4', 'C5', 'F5'], hz: [349.23, 440.00, 523.25, 698.46] },
  { name: 'G7', names: ['G4', 'B4', 'D5', 'F5'], hz: [392.00, 493.88, 587.33, 698.46] }
];
let chordIndex = 0;
let noteColors = ['#ffc800', '#3ddcff', '#ff6b9a', '#7cff8a'];
let monitorLevel = 0.18;   // how loud the quiet monitor is, from 0 to 1

let phoneKey = '';         // who is here now. when it changes, notes are given out again
let totals = [0, 0, 0, 0]; // the summed volume of the phones on each note
let counts = [0, 0, 0, 0]; // how many phones are on each note
let shown = [0, 0, 0, 0];  // the bars, which ease toward the totals
let joinedBefore = false;  // true once this page has been in the room
let monitorOn = false;
let monitor = [];          // four oscillators, made when the monitor is first turned on

function setup() {
  createCanvas(windowWidth, windowHeight);
  projectorSetup(ROOM, '02 Chord', { chordIndex: 0, parts: {} });
  layoutProjector();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutProjector();
  showJoinCode();
}

// this runs each time the page joins the room, and again if it has to join again
function shareReady() {
  // a page that was just opened takes the chord the room already has, if it was reloaded.
  // a page that was running and joined again knows the chord better than the room does
  if (!joinedBefore && typeof shared.chordIndex === 'number') {
    chordIndex = shared.chordIndex;
  }
  joinedBefore = true;
  if (!shared.parts || typeof shared.parts !== 'object') {
    shared.parts = {};
  }
  writeChord();
  phoneKey = '';
}

function draw() {
  background(20);

  // 1. give out notes when the phones change. 2. add up the volumes. 3. draw the chord.
  const phones = phoneList();
  const key = phones.map(function (g) {
    return g.id;
  }).sort().join(',');
  if (shareConnected && key !== phoneKey) {
    phoneKey = key;
    giveOutNotes(phones);
  }
  addUpVolumes(phones);
  playMonitor();

  drawTitle('Each phone plays one note. Raise your phone to play louder.');
  drawKeys();
  drawChord(phones);
  drawJoinColumn('CHORD', chords[chordIndex].name, 64);
}

// the chord goes in shared as one object, so a phone never sees half of a change
function writeChord() {
  const c = chords[chordIndex];
  shared.chord = { name: c.name, names: c.names, hz: c.hz };
  shared.chordIndex = chordIndex;
}

// shared.parts says which note each phone plays
function giveOutNotes(phones) {
  const size = chords[chordIndex].names.length;
  const ids = phones.map(function (g) {
    return g.id;
  });
  const parts = shared.parts;

  // take off the phones that left
  Object.keys(parts).forEach(function (id) {
    if (ids.indexOf(id) < 0) {
      delete parts[id];
    }
  });

  // count how many phones are on each note
  const onNote = new Array(size).fill(0);
  ids.forEach(function (id) {
    if (parts[id] !== undefined && parts[id] < size) {
      onNote[parts[id]] += 1;
    }
  });

  // a new phone gets the note with the fewest phones on it
  ids.forEach(function (id) {
    if (parts[id] === undefined || parts[id] >= size) {
      const fewest = onNote.indexOf(Math.min(...onNote));
      parts[id] = fewest;
      onNote[fewest] += 1;
    }
  });

  // if one note has 2 more phones than another, move one phone across
  for (let tries = 0; tries < 50; tries++) {
    const most = onNote.indexOf(Math.max(...onNote));
    const least = onNote.indexOf(Math.min(...onNote));
    if (onNote[most] - onNote[least] < 2) {
      break;
    }
    const mover = ids.slice().reverse().find(function (id) {
      return parts[id] === most;
    });
    parts[mover] = least;
    onNote[most] -= 1;
    onNote[least] += 1;
  }
}

function addUpVolumes(phones) {
  const size = chords[chordIndex].names.length;
  totals = new Array(size).fill(0);
  counts = new Array(size).fill(0);
  for (let i = 0; i < phones.length; i++) {
    const note = shared.parts ? shared.parts[phones[i].id] : undefined;
    if (note !== undefined && note < size) {
      totals[note] += phones[i].vol || 0;
      counts[note] += 1;
    }
  }
}

// the quiet monitor. one oscillator for each note, as loud as the phones on that note
function playMonitor() {
  if (!monitorOn) {
    return;
  }
  const c = chords[chordIndex];
  const full = max(1, ceil(phoneList().length / c.names.length));
  for (let k = 0; k < monitor.length; k++) {
    monitor[k].freq(c.hz[k], 0.1);
    monitor[k].amp(constrain(totals[k] / full, 0, 1) * monitorLevel, 0.1);
  }
}

function toggleMonitor() {
  monitorOn = !monitorOn;
  if (monitorOn && monitor.length === 0) {
    userStartAudio();
    for (let k = 0; k < 4; k++) {
      const osc = new p5.Oscillator(chords[chordIndex].hz[k], 'triangle');
      osc.amp(0);
      osc.start();
      monitor.push(osc);
    }
  }
  if (!monitorOn) {
    for (let k = 0; k < monitor.length; k++) {
      monitor[k].amp(0, 0.1);
    }
  }
}

function keyPressed() {
  if (key >= '1' && key <= '4' && shareConnected) {
    chordIndex = int(key) - 1;
    writeChord();
  }
  if (key === 'm' || key === 'M') {
    toggleMonitor();
  }
}

// ---- drawing ----

function drawKeys() {
  noStroke();
  fill(GREY);
  textAlign(RIGHT, BASELINE);
  textSize(26 * u);
  let line = 'KEYS  1 2 3 4 change the chord     M monitor ';
  line += monitorOn ? 'on' : 'off';
  text(line, arena.x + arena.w, 84 * u);
  textAlign(LEFT, BASELINE);
}

function drawChord(phones) {
  const c = chords[chordIndex];
  const size = c.names.length;
  const gap = 24 * u;
  const w = (arena.w - gap * (size - 1)) / size;
  const full = max(1, ceil(phones.length / size)); // a full bar: every phone on the note, as loud as it goes

  const barTop = arena.y + 190 * u;
  const barBottom = arena.y + arena.h - 250 * u;
  const dotsTop = barBottom + 40 * u;

  for (let k = 0; k < size; k++) {
    const x = arena.x + k * (w + gap);
    const hue = noteColors[k];
    shown[k] = lerp(shown[k], constrain(totals[k] / full, 0, 1), 0.2);

    // the note and how many phones are on it
    noStroke();
    fill(hue);
    textAlign(LEFT, BASELINE);
    textStyle(BOLD);
    textSize(120 * u);
    text(c.names[k], x, arena.y + 110 * u);
    textStyle(NORMAL);
    fill(GREY);
    textSize(28 * u);
    const many = counts[k] === 1 ? '1 phone' : counts[k] + ' phones';
    text(many, x, arena.y + 156 * u);

    // the bar: the summed volume of the phones on this note
    fill(34);
    rect(x, barTop, w, barBottom - barTop);
    const h = shown[k] * (barBottom - barTop);
    const col = color(hue);
    col.setAlpha(220);
    fill(col);
    rect(x, barBottom - h, w, h);

    // one dot for each phone. a loud phone is a big bright dot
    const onThis = phones.filter(function (g) {
      return shared.parts && shared.parts[g.id] === k;
    });
    const perRow = max(1, floor((w - 10 * u) / (64 * u)));
    for (let i = 0; i < onThis.length; i++) {
      const vol = onThis[i].vol || 0;
      const cx = x + 32 * u + (i % perRow) * 64 * u;
      const cy = dotsTop + 34 * u + floor(i / perRow) * 64 * u;
      const dot = color(hue);
      dot.setAlpha(60 + vol * 195);
      fill(dot);
      circle(cx, cy, (14 + vol * 46) * u);
    }
  }

  if (phones.length === 0 && !serverProblem) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(54 * u);
    text('Waiting for phones. Scan the code to join.', arena.x + arena.w / 2, arena.y + arena.h * 0.5);
    textAlign(LEFT, BASELINE);
  }
}
