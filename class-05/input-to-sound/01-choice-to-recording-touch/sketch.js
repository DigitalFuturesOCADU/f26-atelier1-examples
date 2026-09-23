// 01 · Choice to Recording · Touch
// Four recordings. The input picks which one plays. The question is: which one?
// Here a finger picks. The screen is split into four zones, one for each recording.
// The motion and sound versions play the same four recordings in the same way.
// Only the input part at the bottom of this file is different. Open all three and compare.

// The recordings. Each one tells people what to do with time: wait, mark, wake, go.
// wait: RAVAG interval signal, 1925. Austrian radio's clock, ticking 270 times a minute
//       between programmes. Public domain. https://commons.wikimedia.org/wiki/File:RAVAG-Pausenzeichen.ogg
// mark: Lovely meditation bell. CC0. https://archive.org/details/LovelyMeditationBell
// wake: Mechanical clock ring. CC0. https://commons.wikimedia.org/wiki/File:Mechanical_Clock_Ring_(Directory.Audio).mp3
// go:   "Cross now" pedestrian signal, East Molesey, UK. CC0.
//       https://commons.wikimedia.org/wiki/File:Pedestrian_crossing_audio.wav
// None of them needs a credit. They are credited anyway.

// H7: ask the phone to treat this page like a music player, so silent mode may not mute it.
// Not tested on a phone yet. If it changes nothing, delete this line.
if ('audioSession' in navigator) navigator.audioSession.type = 'playback';

// H5: phones only start sound inside a tap. This catches the first tap, before
// p5-phone's tap message does its own work, and starts the sound system right there.
let unlocked = false;
function unlockAudio() {
  if (unlocked) {
    return;
  }
  unlocked = true;
  userStartAudio();
}
document.addEventListener('touchend', unlockAudio, { capture: true, once: true });
document.addEventListener('click', unlockAudio, { capture: true, once: true });

// Each recording is loaded from its own site by its full web address.
// That is why this sketch has no file to upload.
// To use your own recording, upload it to the sketch and put its file name here, like 'mySound.mp3'.
// The backup is a copy on the examples site. It is only used if the first site does not answer.
let recordings = [
  {
    name: 'wait',
    file: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8c/RAVAG-Pausenzeichen.ogg/RAVAG-Pausenzeichen.ogg.mp3',
    backup: 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/wait-ravag.mp3'
  },
  {
    name: 'mark',
    file: 'https://archive.org/download/LovelyMeditationBell/STE-015.mp3',
    backup: 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/mark-bell.mp3'
  },
  {
    name: 'wake',
    file: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Mechanical_Clock_Ring_%28Directory.Audio%29.mp3',
    backup: 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/wake-clock-ring.mp3'
  },
  {
    name: 'go',
    file: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/4a/Pedestrian_crossing_audio.wav/Pedestrian_crossing_audio.wav.mp3',
    backup: 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-05/input-to-sound/sounds/go-crossing.mp3'
  }
];

// the feel of the piece. change these before you change anything else.
let secondsToWait = 10; // how long to wait for a site before loading the backup copy

let sounds = [];         // the four loaded recordings
let playing = -1;        // which recording is playing. -1 is none
let startedAt = 0;       // when it started, in milliseconds
let soundPlayed = false; // has any sound played yet?
let usedBackup = false;  // did a site fail to answer?

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone.
  // it only shows on a public https address, like the examples site.
  // in the web editor or on 127.0.0.1 the address would not open on a phone.
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  setupInput();

  // load the four recordings. there is no await here, so draw() starts straight away
  // and each tile says 'loading' until its recording arrives.
  loadAll();
}

function draw() {
  background(20);

  // 1. read the input: which one was chosen this frame? -1 means none
  let choice = readChoice();

  // 2. use it: play the chosen recording from the start
  if (choice >= 0) {
    playRecording(choice);
  }

  // 3. show it: the four recordings, and the input on top
  drawTiles();
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

// load the four recordings, one after the other
async function loadAll() {
  for (let i = 0; i < recordings.length; i++) {
    sounds[i] = await loadRecording(recordings[i]);
  }
}

// load one recording by its web address.
// a site that does not answer never says no. it just never finishes.
// so the sketch waits a few seconds, and then loads the backup copy instead.
async function loadRecording(recording) {
  let sound = await Promise.race([loadSound(recording.file), timeLimit(secondsToWait)]);
  if (sound === undefined) {
    usedBackup = true;
    sound = await loadSound(recording.backup);
  }
  return sound;
}

// a promise that is kept after some seconds, with nothing inside it
function timeLimit(seconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, seconds * 1000);
  });
}

// play one recording from the start. whatever was playing stops.
function playRecording(n) {
  if (sounds[n] === undefined) {
    return; // not loaded yet
  }
  if (playing >= 0) {
    sounds[playing].stop();
  }
  sounds[n].play();
  playing = n;
  startedAt = millis();
  soundPlayed = true;
}

// the four recordings as four tiles. the one playing is lit, with a bar for how far it has got.
function drawTiles() {
  let tileTop = 70;
  let tileBottom = height - 90; // room for the notes
  let w = width / 2;
  let h = (tileBottom - tileTop) / 2;
  let seconds = (millis() - startedAt) / 1000;

  for (let i = 0; i < 4; i++) {
    let x = (i % 2) * w;
    let y = tileTop + floor(i / 2) * h;
    let loaded = sounds[i] !== undefined;
    let isOn = loaded && i === playing && seconds < sounds[i].duration();

    stroke(20);
    strokeWeight(6);
    if (isOn) {
      fill(255, 200, 0);
    } else {
      fill(45);
    }
    rect(x, y, w, h);

    noStroke();
    textAlign(CENTER, CENTER);
    textSize(28);
    if (isOn) {
      fill(20);
      rect(x + 10, y + h - 20, (w - 20) * seconds / sounds[i].duration(), 8);
    } else {
      fill(255);
    }
    text(recordings[i].name, x + w / 2, y + h / 2);
    if (!loaded) {
      textSize(14);
      text('loading', x + w / 2, y + h / 2 + 30);
    }
    textAlign(LEFT, BASELINE);
  }
}

// the notes along the bottom. the input part adds its own lines.
function drawNotes() {
  let lines = notes.slice(); // a copy, so the list below can grow
  if (usedBackup) {
    lines.push('Loaded the backup copy: the original site did not answer.');
  }
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
  if (getAudioContext().state !== 'running') {
    userStartAudio();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ---------- the input: touch. this is the only part that changes between versions. ----------
// From the p5-phone Touch Zones example. The screen is split into four zones.

let notes = ['A finger points straight at the one it wants.'];
let zone = -1;   // the last zone touched. -1 is none yet
let tapped = -1; // a new tap, waiting for draw() to use it

function setupInput() {
  enableSoundTap('Tap to turn on sound');
}

// which zone holds this point? 0 top left, 1 top right, 2 bottom left, 3 bottom right.
// the line across is the middle of the tiles, not the middle of the screen.
function getZone(x, y) {
  let xDivision = width / 2;
  let yDivision = (70 + height - 90) / 2;
  if (x < xDivision && y < yDivision) {
    return 0;
  } else if (x >= xDivision && y < yDivision) {
    return 1;
  } else if (x < xDivision && y >= yDivision) {
    return 2;
  } else {
    return 3;
  }
}

function mousePressed() {
  wakeAudio();
  // the first tap belongs to the permission message, so it does not choose anything
  if (unlocked) {
    zone = getZone(mouseX, mouseY);
    tapped = zone;
  }
  return false;
}

// hand draw() the new tap once, then forget it
function readChoice() {
  let choice = tapped;
  tapped = -1;
  return choice;
}

function inputReading() {
  if (zone < 0) {
    return 'touch: none yet';
  }
  return 'touch: zone ' + (zone + 1) + '   plays: ' + recordings[zone].name;
}

function inputStatus() {
  if (!unlocked) {
    return 'tap to turn on sound';
  }
  return 'tap a zone';
}

// touch needs nothing extra on screen. the tiles are the zones.
function drawInput() {
}
