// 02 Chord: Phone
// p5.sound and Share. Your phone plays one note of a chord. The big screen gives it to you.
// Raise your phone and the note gets louder. Lay it flat and it goes quiet. Every phone
// in the room plays at once, so the room is the instrument.
//
// The rule: Share keeps only the last thing written, so this phone keeps its own volume in me
// and the projector adds them up.
//
// Try this:
//   Raise your phone, then lay it flat.
//   Find the other phones on your note. Raise them all together.
//   The projector can change the chord. Your note changes and the number stays yours.
//   On a laptop, move the mouse up and down, or use the up and down arrow keys.
//
// Key data:
//   shared.parts[shareClientId]  the note this phone plays. 0 is the lowest note
//   shared.chord                 { name, names, hz } the chord, written by the projector
//   me.vol                       this phone's volume, from 0 to 1, about ten times a second

const ROOM = 'chord';

// the feel of the piece. change these before you change anything else.
let waveType = 'triangle'; // 'sine' is purer. 'triangle' carries better on a phone speaker
let loudest = 0.35;        // the loudest this phone gets, from 0 to 1. a room full of phones adds up
let sendEvery = 100;       // milliseconds between volume updates

let osc;                   // the oscillator. it plays this phone's note
let joined = false;
let serverOk = false;
let lastSend = 0;
let playing = 0;           // the volume now, from 0 to 1
let pitch = 0;             // the pitch now, in hertz
let k = 1;                 // one design unit for this screen
let noteColors = ['#ffc800', '#3ddcff', '#ff6b9a', '#7cff8a'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  angleMode(DEGREES);

  // it runs all the time, silent. the tilt turns it up
  osc = new p5.Oscillator(261.63, waveType);
  osc.amp(0);

  serverOk = phoneSetup(ROOM, { vol: 0 });
  if (serverOk) {
    // one tap turns on tilt and sound. userSetupComplete() runs after it
    enablePermissionsTap(['gyro', 'sound'], 'Tap to join the chord');
  }
}

function userSetupComplete() {
  joined = true;
  osc.start();        // after the sound tap, so it does not click
  keepAwake();        // a phone that locks leaves the room, and goes quiet
  shareConnect();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function shareReady() {
  checkMyName();
}

// the note the projector has given this phone, or nothing yet
function myNote() {
  const parts = shared.parts;
  const chord = shared.chord;
  if (!joined || !parts || !chord || parts[shareClientId] === undefined) {
    return null;
  }
  const i = parts[shareClientId];
  return { index: i, name: chord.names[i], hz: chord.hz[i], chord: chord.name };
}

function draw() {
  k = min(width / 390, height / 700);
  const note = myNote();

  // 1. read the tilt. 2. send it as the volume. 3. play the note at that volume.
  const raise = raiseNow();
  if (joined && shareConnected && millis() - lastSend >= sendEvery) {
    me.vol = round(raise * 20) / 20;    // steps of 0.05, so a phone held still sends nothing
    lastSend = millis();
  }
  let target = 0;
  if (note && shareConnected) {
    target = raise;
    if (note.hz !== pitch) {
      osc.freq(note.hz, 0.08);
      pitch = note.hz;
    }
  }
  if (abs(target - playing) > 0.01) {
    osc.amp(target * loudest, 0.1);
    playing = target;
  }

  // the screen glows in the colour of the note, as loud as the note
  const base = color(20);
  let glow = base;
  if (note) {
    glow = lerpColor(base, color(noteColors[note.index % 4]), playing * 0.45);
  }
  background(glow);

  drawNote(note, raise);
  drawFooter(note);
}

function drawNote(note, raise) {
  noStroke();
  fill(255);
  textStyle(BOLD);
  textSize(34 * k);
  if (!serverOk) {
    textSize(26 * k);
    centreLines(serverProblem, height * 0.2, width * 0.85, 34 * k);
    textStyle(NORMAL);
    return;
  }
  if (!joined || !shareConnected) {
    centreLines('02 Chord', height * 0.12, width * 0.9, 40 * k);
    textStyle(NORMAL);
    return;
  }
  if (!note) {
    centreLines('Waiting for a note', height * 0.12, width * 0.9, 40 * k);
    textStyle(NORMAL);
    fill('#9a9a9a');
    textSize(22 * k);
    centreLines('The big screen gives each phone one note.', height * 0.2, width * 0.8, 30 * k);
    return;
  }

  // your note, as big as the screen allows
  centreLines('Your note', height * 0.12, width * 0.9, 40 * k);
  fill(noteColors[note.index % 4]);
  textSize(min(width * 0.5, height * 0.3));
  centreLines(note.name, height * 0.42, width, 10);
  textStyle(NORMAL);

  fill('#cfcfcf');
  textSize(24 * k);
  let same = 0;
  for (let i = 0; i < guests.length; i++) {
    if (guests[i].role === 'phone' && shared.parts[guests[i].id] === note.index) {
      same += 1;
    }
  }
  let line = note.chord + '. ';
  if (same === 0) {
    line += 'You are the only one on this note.';
  } else if (same === 1) {
    line += '1 other phone plays it too.';
  } else {
    line += same + ' other phones play it too.';
  }
  centreLines(line, height * 0.5, width * 0.85, 32 * k);

  // how loud you are now
  const meterW = width * 0.7;
  const meterY = height * 0.62;
  fill(40);
  rect(width / 2 - meterW / 2, meterY, meterW, 22 * k);
  fill(noteColors[note.index % 4]);
  rect(width / 2 - meterW / 2, meterY, meterW * raise, 22 * k);
}

function drawFooter(note) {
  noStroke();
  fill('#9a9a9a');
  textSize(20 * k);
  if (joined && note) {
    const how = hasRealTilt ? 'Raise your phone to play louder.\nLay it flat to go quiet.' : 'Move the mouse up to play louder.\nMove it down to go quiet.';
    centreLines(how, height * 0.72, width * 0.86, 28 * k);
  }
  textSize(17 * k);
  centreLines(footerLine(), height - 40 * k, width * 0.9, 24 * k);
  if (joined) {
    centreLines('No sound? Check your phone is not on silent.', height - 70 * k, width * 0.9, 24 * k);
  }
}
