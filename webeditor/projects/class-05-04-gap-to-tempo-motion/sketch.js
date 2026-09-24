// 04 · Gap to Tempo · Motion
// A metronome loops, four beats to a bar. The input sets its tempo. The question is: when?
// The sketch measures the time between two events and turns that gap into beats per minute.
// Here the events are shakes. Shake a steady beat and the metronome takes it up.
// It is Class 2 · 03 Shake to Filter, timed.
// The touch and sound versions keep the same metronome in the same way.
// Only the input part at the bottom of this file is different. Open all three and compare.
//
// This sketch uses Tone.js, not p5.sound. Tone.js has its own clock, the Transport.
// The beats are scheduled on that clock, not on draw(). draw() runs about 60 times a second,
// but it slows down when the phone is busy, and a beat that waits for draw() would wobble.

// H7: ask the phone to treat this page like a music player, so silent mode may not mute it.
// Not tested on a phone yet. If it changes nothing, delete this line.
if ('audioSession' in navigator) navigator.audioSession.type = 'playback';

// H5: phones only start sound inside a tap. p5-phone's sound tap starts p5.sound, not Tone.js.
// So this catches the first tap, before p5-phone's tap message does its own work,
// and starts Tone.js right there.
let unlocked = false;
function unlockAudio() {
  if (unlocked) {
    return;
  }
  unlocked = true;
  Tone.start();
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
let startTempo = 90;  // beats per minute before anyone sets one
let slowestTempo = 40;
let fastestTempo = 200;
let longestGap = 2;   // seconds. a longer pause starts a new count
let gapsToAverage = 3; // the tempo comes from the last few gaps, so one wobbly tap does not throw it

let metronome;           // the Tone.js synth that clicks
let beatLoop;            // the Tone.js loop that plays one click every beat
let beatNumber = 0;      // which beat of the bar comes next, 0 to 3
let beatShown = -1;      // which beat the screen shows as lit
let beatShownAt = 0;     // when it was lit, in milliseconds
let started = false;     // is the Transport running?
let tempo = startTempo;
let gaps = [];           // the last few gaps, in seconds
let lastEvent = -1;      // when the last event happened, in milliseconds
let soundPlayed = false; // has any sound played yet?

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone.
  // it only shows on a public https address, like the examples site.
  // in the web editor or on 127.0.0.1 the address would not open on a phone.
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  setupMetronome();
  setupInput();
}

function draw() {
  background(20);

  // the Transport starts once there is a tap
  if (unlocked && !started) {
    Tone.getTransport().start();
    started = true;
  }

  // 1. read the input: did an event happen? its time in milliseconds, or -1
  let eventTime = readEvent();
  if (eventTime >= 0) {
    // 2. measure it: the gap since the last event
    useEvent(eventTime);
    // 3. map it: the average gap in seconds is one beat, so 60 divided by it is beats per minute
    if (gaps.length > 0) {
      tempo = constrain(60 / average(gaps), slowestTempo, fastestTempo);
      // 4. use it: the Transport's clock runs at the new tempo
      Tone.getTransport().bpm.value = tempo;
    }
  }

  drawBeats();
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

function setupMetronome() {
  // a short click with no sustain, like a woodblock
  metronome = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 }
  }).toDestination();

  // Tone.js calls this once every quarter note ('4n'), on its own clock.
  // time is the exact moment the beat is due. the click is scheduled for that moment.
  beatLoop = new Tone.Loop(function (time) {
    if (beatNumber === 0) {
      metronome.triggerAttackRelease('A5', '32n', time, 1);   // the first beat of the bar is higher
    } else {
      metronome.triggerAttackRelease('E5', '32n', time, 0.6);
    }
    // the screen is told to light this beat when the sound actually plays, not now
    let shown = beatNumber;
    Tone.getDraw().schedule(function () {
      beatShown = shown;
      beatShownAt = millis();
      soundPlayed = true;
    }, time);
    beatNumber = (beatNumber + 1) % 4;
  }, '4n').start(0);

  Tone.getTransport().bpm.value = startTempo;
}

// one event. measure the gap since the one before.
// a gap longer than longestGap is a pause, and the count starts again.
function useEvent(t) {
  if (lastEvent >= 0) {
    let gap = (t - lastEvent) / 1000;
    if (gap < longestGap) {
      gaps.push(gap);
      if (gaps.length > gapsToAverage) {
        gaps.shift(); // forget the oldest
      }
    } else {
      gaps = [];
    }
  }
  lastEvent = t;
}

// the average of a list of numbers
function average(list) {
  let total = 0;
  for (let i = 0; i < list.length; i++) {
    total = total + list[i];
  }
  return total / list.length;
}

// four squares for the four beats of the bar. the one that just played is lit.
function drawBeats() {
  let areaTop = 70;
  let areaBottom = height - 90; // room for the notes
  let size = min(width / 4.5, (areaBottom - areaTop) / 3);
  let y = (areaTop + areaBottom) / 2 - size / 2;

  for (let i = 0; i < 4; i++) {
    let x = width / 2 + (i - 2) * size * 1.05;
    let lit = i === beatShown && millis() - beatShownAt < 150;
    noStroke();
    if (lit && i === 0) {
      fill(255, 90, 90);
    } else if (lit) {
      fill(255, 200, 0);
    } else {
      fill(45);
    }
    rect(x, y, size, size, 8);
  }

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(40);
  text(round(tempo) + ' bpm', width / 2, y + size + 50);
  textSize(14);
  if (gaps.length > 0) {
    text('average gap: ' + round(average(gaps) * 1000) + ' ms', width / 2, y + size + 86);
  } else {
    text('no gap yet', width / 2, y + size + 86);
  }
  textAlign(LEFT, BASELINE);
}

// the notes along the bottom. the input part adds its own lines.
function drawNotes() {
  let lines = findings.slice(); // a copy, so the list below can grow
  lines.push('The beat runs on Tone.js\'s clock, not on draw().');
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
  if (Tone.getContext().state !== 'running') {
    Tone.start();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ---------- the input: motion. this is the only part that changes between versions. ----------
// From Class 2 · 03 Shake to Filter. deviceShaken() is an event:
// p5.js calls it when a shake passes the threshold. Here the sketch keeps its time.

let shakeLockout = 250; // milliseconds. one shake calls deviceShaken() many times in a row

let findings = ['A shake is slower than a tap. Fast tempos are hard to reach.'];
let shakenAt = -1;      // when the last shake counted, waiting for draw() to use it
let lastShake = -10000;

// a laptop has no motion sensors. this turns true when the first real reading arrives.
let motionArrived = false;
window.addEventListener('devicemotion', function (event) {
  let g = event.accelerationIncludingGravity;
  if (g && g.x !== null) {
    motionArrived = true;
  }
});

function setupInput() {
  setShakeThreshold(30); // lower is easier to trigger
  enablePermissionsTap(['motion', 'sound'], 'Tap to turn on motion and sound');
}

function deviceShaken() {
  // H3: only count it if the lockout has passed since the last one
  if (millis() - lastShake > shakeLockout) {
    shakenAt = millis(); // the exact moment, not the next frame
    lastShake = shakenAt;
  }
}

// hand draw() the new shake once, then forget it
function readEvent() {
  let t = shakenAt;
  shakenAt = -1;
  return t;
}

function inputReading() {
  if (lastEvent < 0) {
    return 'shake: none yet';
  }
  return 'last shake: ' + nf((millis() - lastEvent) / 1000, 1, 1) + ' s ago';
}

function inputStatus() {
  if (!window.sensorsEnabled) {
    return 'tap to turn on motion and sound';
  }
  if (!motionArrived) {
    return 'no motion sensors here. on a laptop, open this on a phone';
  }
  if (millis() - lastShake < shakeLockout) {
    return 'shake counted. waiting a moment before the next';
  }
  return 'shake a steady beat';
}

// the screen flashes red for a moment when a shake counts
function drawInput() {
  if (millis() - lastShake < 150) {
    noFill();
    stroke(255, 90, 90);
    strokeWeight(12);
    rect(0, 0, width, height);
    noStroke();
  }
}

// any touch wakes the sound system, in case the phone put it to sleep
function mousePressed() {
  wakeAudio();
  return false;
}
