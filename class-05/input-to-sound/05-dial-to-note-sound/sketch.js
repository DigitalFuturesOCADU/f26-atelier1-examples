// 05 · Dial to Note · Sound
// A marimba, and a dial that runs through a scale. The input turns the dial.
// The question is: which note? Each time the dial reaches a new note, the marimba plays it.
// Here your voice turns the dial. Hum low, then high. It is Class 4 · Demo Pitch to Frame.
// On a speaker the phone hears the marimba too, and chases its own notes.
// The touch and motion versions play the same marimba in the same way.
// Only the input part at the bottom of this file is different. Open all three and compare.
//
// The marimba is a set of recordings of a real one, one for each note. That is a sampled instrument.
// The library smplr downloads the recordings the first time the page opens. That takes a moment,
// and with no network there is no marimba.

// H7: the audio session line in the touch and motion versions is left out here.
// Opening the microphone changes the phone's audio session anyway.

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

// ---------- the input: sound. this is the only part that changes between versions. ----------
// From Class 4 · Demo Pitch to Frame. It opens the microphone with the browser's own tools,
// not p5.sound, and finds the note with a small pitch library called Pitchy.
// It uses the same sound system as the marimba, audio, so the sketch has only one.

let lowNote = 100;       // hertz. the bottom of the range. a low hum
let highNote = 600;      // hertz. the top of the range. a high hum or a low whistle
let clarityNeeded = 0.9; // from 0 to 1. how clearly pitched the sound has to be to count
let smoothing = 0.25;    // 1 is raw and jumpy. 0.05 is slow and calm

// H9, H10: with the microphone open, the phone hears its own speaker.
let findings = [
  'On a speaker it hears the marimba and chases its own notes.',
  'Use headphones. Without them the phone hears itself.'
];

let detector;      // the pitch finder, from Pitchy
let analyser;      // hands the sketch the raw sound wave
let samples;       // the raw sound wave, as a list of numbers
let pitch = 0;
let clarity = 0;
let hummed = 0.5;  // from 0 to 1. where the hummed note sits between lowNote and highNote
let micReady = false; // true once the microphone is feeding the analyser
let problem = '';

// p5-phone starts anything named mic that has a start function.
// this one is home made, so the tap can open the microphone without p5.sound.
let mic = {
  start: function () {
    analyser = audio.createAnalyser();
    analyser.fftSize = 2048;
    samples = new Float32Array(analyser.fftSize);
    // turn off the phone's call clean-up, which would flatten a held note
    let wanted = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
    navigator.mediaDevices.getUserMedia(wanted).then(function (stream) {
      // the microphone goes into the analyser and nowhere else, so nothing comes out of the speaker
      audio.createMediaStreamSource(stream).connect(analyser);
      micReady = true;
    }).catch(function (error) {
      problem = 'no microphone. check the permission';
      console.log(error);
    });
  }
};

function setupInput() {
  enableMicTap('Tap to turn on the microphone');
  loadPitchy();
}

// Pitchy is a newer kind of library, a module, so it is loaded here and not in index.html
async function loadPitchy() {
  let pitchy = await import('https://esm.sh/pitchy@4');
  detector = pitchy.PitchDetector.forFloat32Array(2048);
}

// where the hummed note points the dial, from 0 to 1. -1 when there is no clear note
function readPosition() {
  if (!micReady || !detector) {
    return -1;
  }
  // the raw sound wave, then the note inside it
  analyser.getFloatTimeDomainData(samples);
  let found = detector.findPitch(samples, audio.sampleRate);
  pitch = found[0];
  clarity = found[1];
  // only a clear note inside the range counts. breath and noise have no clear note.
  if (clarity > clarityNeeded && pitch > lowNote * 0.8 && pitch < highNote * 1.2) {
    // notes are heard in ratios, not steps, so the range is mapped through log()
    let target = map(log(pitch), log(lowNote), log(highNote), 0, 1, true);
    hummed = lerp(hummed, target, smoothing);
    return hummed;
  }
  return -1;
}

function inputReading() {
  return 'note: ' + round(pitch) + ' Hz   clarity: ' + nf(clarity, 1, 2);
}

function inputStatus() {
  if (problem !== '') {
    return problem;
  }
  if (!micReady) {
    return 'tap to turn on the microphone';
  }
  return 'listening. hum low, then high';
}

// the hummed note as a marker up the left edge
function drawInput() {
  noStroke();
  fill(100, 200, 255);
  rect(0, height - hummed * height - 6, 24, 12);
}

// any touch wakes the sound system, in case the phone put it to sleep
function mousePressed() {
  wakeAudio();
  return false;
}
