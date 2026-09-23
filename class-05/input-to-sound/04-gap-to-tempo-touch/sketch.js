// 04 · Gap to Tempo · Touch
// A metronome loops, four beats to a bar. The input sets its tempo. The question is: when?
// The sketch measures the time between two events and turns that gap into beats per minute.
// Here the events are taps. Tap a steady beat and the metronome takes it up.
// The motion and sound versions keep the same metronome in the same way.
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

// ---------- the input: touch. this is the only part that changes between versions. ----------
// From the p5-phone Touch Basic example: the moment a finger lands.

let findings = ['Two taps make one gap. Pause for 2 seconds to start over.'];
let tappedAt = -1; // when the last tap landed, waiting for draw() to use it

function setupInput() {
  enableSoundTap('Tap to turn on sound');
}

function mousePressed() {
  wakeAudio();
  // the first tap belongs to the permission message, so it is not counted
  if (unlocked) {
    tappedAt = millis(); // the exact moment, not the next frame
  }
  return false;
}

// hand draw() the new tap once, then forget it
function readEvent() {
  let t = tappedAt;
  tappedAt = -1;
  return t;
}

function inputReading() {
  if (lastEvent < 0) {
    return 'tap: none yet';
  }
  return 'last tap: ' + nf((millis() - lastEvent) / 1000, 1, 1) + ' s ago';
}

function inputStatus() {
  if (!unlocked) {
    return 'tap to turn on sound';
  }
  return 'tap a steady beat anywhere';
}

// a flash where the finger landed
function drawInput() {
  if (lastEvent >= 0 && millis() - lastEvent < 200) {
    noFill();
    stroke(255, 90, 90);
    strokeWeight(4);
    circle(mouseX, mouseY, 90);
    noStroke();
  }
}
