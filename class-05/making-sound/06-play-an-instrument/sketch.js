// 06 · Play an Instrument
// smplr. A marimba made of recordings of a real one, one for each note. That is a sampled instrument.
// The screen is split into keys. Tap a key to strike that note.
//
// smplr downloads the recordings the first time the page opens. That takes a moment,
// and with no network there is no marimba.

// the browser's own sound system. smplr plays through it.
let audio = new AudioContext();

// phones only start sound inside a tap. p5-phone's sound tap starts p5.sound, not this.
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
// with a mouse, p5-phone's tap message goes away before the browser sends 'click'
document.addEventListener('pointerup', function (e) {
  if (e.pointerType === 'mouse') {
    unlockAudio();
  }
}, { capture: true });

// the feel of the piece. change these before you change anything else.
// C major pentatonic: five notes to an octave, and none of them clash.
let keys = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'];
let instrumentName = 'marimba'; // try 'vibraphone', 'kalimba', 'celesta' or 'acoustic_grand_piano'
let velocity = 100;             // how hard each note is struck, from 0 to 127

let instrument;              // the marimba, from smplr
let instrumentReady = false; // true once its recordings have arrived
let loadProblem = '';
let lastKey = -1;            // the key struck last
let struckAt = 0;            // when, in milliseconds

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableSoundTap('Tap to turn on sound');

  // smplr is a newer kind of library, a module, so it is loaded here and not in index.html
  let smplr = await import('https://cdn.jsdelivr.net/npm/smplr@1.0.0/dist/index.mjs');
  instrument = smplr.Soundfont(audio, { instrument: instrumentName });
  // there is no await here, so draw() starts straight away and says 'loading'
  instrument.ready.then(function () {
    instrumentReady = true;
  }).catch(function (error) {
    loadProblem = 'The instrument did not load. Check the network.';
    console.log(error);
  });
}

function draw() {
  background(20);

  // the keys, low on the left, high on the right. the one struck last glows and fades.
  let w = width / keys.length;
  let glow = map(millis() - struckAt, 0, 600, 1, 0, true);
  textAlign(CENTER, CENTER);
  for (let i = 0; i < keys.length; i++) {
    stroke(20);
    strokeWeight(4);
    if (i === lastKey) {
      fill(lerp(45, 255, glow), lerp(45, 200, glow), lerp(45, 0, glow));
    } else {
      fill(45);
    }
    rect(i * w, 70, w, height - 160);
    noStroke();
    fill(255);
    textSize(16);
    text(keys[i], i * w + w / 2, height - 110);
  }
  textAlign(LEFT, BASELINE);

  // the labels sit in the top 70 pixels
  noStroke();
  fill(255);
  textSize(16);
  text('smplr · ' + instrumentName, 20, 30);
  if (!unlocked) {
    text('tap to turn on sound', 20, 52);
  } else if (loadProblem !== '') {
    text(loadProblem, 20, 52);
  } else if (!instrumentReady) {
    text('loading the recordings of each note…', 20, 52);
  } else {
    text('tap a key', 20, 52);
  }
  fill(160);
  textSize(13);
  text('Every note is a recording, downloaded when the page opens.', 20, height - 12);
}

function mousePressed() {
  // the first tap belongs to the sound message, so it does not play a note
  if (!unlocked || !instrumentReady) {
    return false;
  }
  audio.resume(); // a phone can put the sound to sleep. any tap wakes it.

  // 1. read the tap. 2. map it onto a key. 3. strike that note.
  let k = constrain(floor(mouseX / width * keys.length), 0, keys.length - 1);
  instrument.start({ note: keys[k], velocity: velocity });
  lastKey = k;
  struckAt = millis();
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
