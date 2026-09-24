// 05 · Dial to Note · Touch
// A marimba, and a dial that runs through a scale. The input turns the dial.
// The question is: which note? Each time the dial reaches a new note, the marimba plays it.
// Here two fingers turn the dial, like turning a knob.
// The motion and sound versions play the same marimba in the same way.
// Only the input part at the bottom of this file is different. Open all three and compare.
//
// The marimba is a set of recordings of a real one, one for each note. That is a sampled instrument.
// The library smplr downloads the recordings the first time the page opens. That takes a moment,
// and with no network there is no marimba.

// H7: ask the phone to treat this page like a music player, so silent mode may not mute it.
// Not tested on a phone yet. If it changes nothing, delete this line.
if ('audioSession' in navigator) navigator.audioSession.type = 'playback';

// the browser's own sound system. smplr plays through it.
let audio = new AudioContext();

// H5: phones only start sound inside a tap. p5-phone's sound tap starts p5.sound, not this.
// So this catches the first tap, before p5-phone's tap message does its own work,
// and starts the sound system right there.
let unlocked = false;
function unlockAudio() {
  if (unlocked) {
    return;
  }
  unlocked = true;
  audio.resume();
}
document.addEventListener('touchend', unlockAudio, { capture: true, once: true });
document.addEventListener('click', unlockAudio, { capture: true, once: true });
// with a mouse, p5-phone's tap message goes away before the browser sends 'click',
// so the release of the mouse button is caught here as well.
document.addEventListener('pointerup', function (e) {
  if (e.pointerType === 'mouse') {
    unlockAudio();
  }
}, { capture: true });

// the feel of the piece. change these before you change anything else.
// the scale: C major pentatonic, two octaves. five notes to an octave, none of them clash.
// (it cannot be called scale. p5.js already has a function with that name.)
let scaleNotes = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
let instrumentName = 'marimba'; // try 'vibraphone', 'kalimba', 'celesta' or 'acoustic_grand_piano'
let velocity = 100;             // how hard each note is struck, from 0 to 127

let instrument;              // the marimba, from smplr
let instrumentReady = false; // true once its recordings have arrived
let loadProblem = '';
let position = 0.5;          // from 0 to 1. where the dial points
let noteIndex = -1;          // which note of the scale the dial is on. -1 is none yet
let soundPlayed = false;     // has any sound played yet?

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone.
  // it only shows on a public https address, like the examples site.
  // in the web editor or on 127.0.0.1 the address would not open on a phone.
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  angleMode(DEGREES);
  setupInput();

  // smplr is a newer kind of library, a module, so it is loaded here and not in index.html
  let smplr = await import('https://cdn.jsdelivr.net/npm/smplr@1.0.0/dist/index.mjs');
  instrument = smplr.Soundfont(audio, { instrument: instrumentName });
  // there is no await here, so draw() starts straight away and says 'Loading instrument…'
  instrument.ready.then(function () {
    instrumentReady = true;
  }).catch(function (error) {
    loadProblem = 'The instrument did not load. Check the network.';
    console.log(error);
  });
}

function draw() {
  background(20);

  // 1. read the input: where the dial points, from 0 to 1. -1 means no new reading
  let raw = readPosition();
  if (raw >= 0) {
    position = raw;
  }
  // 2. map it: the position range onto the notes of the scale
  let newIndex = constrain(floor(position * scaleNotes.length), 0, scaleNotes.length - 1);
  // 3. use it: a note plays only when the dial moves onto a new one
  if (raw >= 0 && newIndex !== noteIndex) {
    noteIndex = newIndex;
    playNote(noteIndex);
  }

  drawDial();
  drawInput();

  // the labels sit in the top 70 pixels, the same in every version
  fill(255);
  noStroke();
  textSize(16);
  text(inputReading(), 20, 30);
  text(inputStatus(), 20, 52);
  drawNotes();
}

// ---------- the sound. this part is the same in the touch, motion and sound versions. ----------

// strike one note of the scale
function playNote(n) {
  if (!instrumentReady) {
    return;
  }
  instrument.start({ note: scaleNotes[n], velocity: velocity });
  soundPlayed = true;
}

// the dial. the scale runs around it, low on the left, high on the right.
function drawDial() {
  let cx = width / 2;
  let cy = 70 + (height - 70 - 90) / 2;
  let r = min(width, height - 160) * 0.38;

  // each note of the scale has a mark. the one playing is lit.
  textAlign(CENTER, CENTER);
  textSize(12);
  for (let i = 0; i < scaleNotes.length; i++) {
    let a = map(i + 0.5, 0, scaleNotes.length, -135, 135);
    let x = cx + r * sin(a);
    let y = cy - r * cos(a);
    noStroke();
    if (i === noteIndex) {
      fill(255, 200, 0);
      circle(x, y, 30);
      fill(20);
    } else {
      fill(60);
      circle(x, y, 30);
      fill(200);
    }
    text(scaleNotes[i], x, y);
  }

  // the pointer
  let pointer = map(position, 0, 1, -135, 135);
  stroke(255);
  strokeWeight(4);
  line(cx, cy, cx + r * 0.75 * sin(pointer), cy - r * 0.75 * cos(pointer));
  noStroke();
  fill(255);
  circle(cx, cy, 14);

  textSize(40);
  if (loadProblem !== '') {
    textSize(16);
    text(loadProblem, cx, cy + r * 0.45);
  } else if (!instrumentReady) {
    textSize(20);
    text('Loading instrument…', cx, cy + r * 0.45);
  } else if (noteIndex >= 0) {
    text(scaleNotes[noteIndex], cx, cy + r * 0.45);
  }
  textAlign(LEFT, BASELINE);
}

// the notes along the bottom. the input part adds its own lines.
function drawNotes() {
  let lines = findings.slice(); // a copy, so the list below can grow
  // H6, H8: until the first sound plays, say what usually silences a phone
  if (!soundPlayed) {
    lines.push('No sound? Check silent mode.');
  }
  fill(160);
  noStroke();
  textSize(13);
  let y = height - 12;
  for (let i = lines.length - 1; i >= 0; i--) {
    text(lines[i], 20, y);
    y = y - 18;
  }
}

// a phone can put the sound system to sleep when you leave the page.
// any touch wakes it up again.
function wakeAudio() {
  if (audio.state !== 'running') {
    audio.resume();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ---------- the input: touch. this is the only part that changes between versions. ----------
// From the p5-phone Touch Angle example: the angle of the line between two fingers.

let findings = ['Two fingers turn the dial either way, and it stays where they stop.'];
let fingerAngle = 0; // degrees. 0 is fingers side by side

function setupInput() {
  enableSoundTap('Tap to turn on sound');
}

// where the two fingers point the dial, from 0 to 1. -1 if there are not two fingers
function readPosition() {
  if (touches.length < 2) {
    return -1;
  }
  fingerAngle = atan2(touches[1].y - touches[0].y, touches[1].x - touches[0].x);
  // a line has two ends, so turning it half way round gives the same line.
  // fold the angle into -90 to 90. fingers side by side is the middle of the scale.
  if (fingerAngle > 90) {
    fingerAngle = fingerAngle - 180;
  }
  if (fingerAngle < -90) {
    fingerAngle = fingerAngle + 180;
  }
  return map(fingerAngle, -90, 90, 0, 1);
}

function inputReading() {
  return 'fingers: ' + touches.length + '   angle: ' + round(fingerAngle) + '°';
}

function inputStatus() {
  if (!unlocked) {
    return 'tap to turn on sound';
  }
  return 'two fingers: turn them like a knob';
}

// the two fingers and the line between them
function drawInput() {
  if (touches.length >= 2) {
    stroke(255, 90, 90);
    strokeWeight(3);
    line(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
    noStroke();
    fill(255, 90, 90);
    circle(touches[0].x, touches[0].y, 40);
    circle(touches[1].x, touches[1].y, 40);
  }
}

function mousePressed() {
  wakeAudio();
  return false;
}
