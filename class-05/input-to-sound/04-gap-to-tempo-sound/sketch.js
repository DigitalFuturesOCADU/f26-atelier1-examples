// 04 · Gap to Tempo · Sound
// A metronome loops, four beats to a bar. The input sets its tempo. The question is: when?
// The sketch measures the time between two events and turns that gap into beats per minute.
// Here the events are claps. Clap a steady beat and the metronome takes it up.
// It is Class 4 · 02 Clap to Step, timed. On a speaker the phone hears its own clicks as claps,
// and the metronome locks onto its own beat.
// The touch and motion versions keep the same metronome in the same way.
// Only the input part at the bottom of this file is different. Open all three and compare.
//
// This sketch uses Tone.js, not p5.sound. Tone.js has its own clock, the Transport.
// The beats are scheduled on that clock, not on draw(). draw() runs about 60 times a second,
// but it slows down when the phone is busy, and a beat that waits for draw() would wobble.

// H7: the audio session line in the touch and motion versions is left out here.
// Opening the microphone changes the phone's audio session anyway.

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

// ---------- the input: sound. this is the only part that changes between versions. ----------
// From Class 4 · 02 Clap to Step. A clap is the level crossing the line on its way up.
// The microphone comes from Tone.js here, not p5.sound, so the whole sketch uses one sound system.
// Tone.UserMedia is the microphone. Tone.Meter measures how loud it is, like p5.Amplitude.

let boost = 5;        // phones hear quietly. raise it if claps do not reach the line
let threshold = 0.35; // the line. how loud a sound has to be to count
let lockout = 200;    // milliseconds. one clap must not count twice

// H9, H10: with the microphone open, the phone hears its own speaker.
let findings = [
  'On a speaker it hears its own clicks as claps.',
  'Use headphones. Without them the phone hears itself.'
];

let userMedia;  // the microphone, from Tone.js
let levelMeter; // measures how loud the microphone is, from Tone.js
let micReady = false;
let problem = '';
let level = 0;
let wasAbove = false; // was the level over the line on the last frame?
let lastClap = -10000;

// p5-phone starts anything named mic that has a start function.
// this one is home made, so the tap can open the microphone with Tone.js instead of p5.sound.
let mic = {
  start: function () {
    userMedia = new Tone.UserMedia();
    levelMeter = new Tone.Meter({ normalRange: true, smoothing: 0.5 });
    // the microphone goes into the meter and nowhere else, so nothing comes out of the speaker
    userMedia.connect(levelMeter);
    userMedia.open().then(function () {
      micReady = true;
    }).catch(function (error) {
      problem = 'no microphone. check the permission';
      console.log(error);
    });
  }
};

function setupInput() {
  enableMicTap('Tap to turn on the microphone');
}

// did a clap just happen? its time in milliseconds, or -1
function readEvent() {
  if (!micReady) {
    return -1;
  }
  level = constrain(levelMeter.getValue() * boost, 0, 1);
  // an event, not a value. it only counts at the moment the level
  // crosses the line on its way up. a long hum is one event, not many.
  let isAbove = level > threshold;
  let clapAt = -1;
  // H3: a clap inside the lockout is not counted. the status line shows the wait.
  if (isAbove && !wasAbove && millis() - lastClap > lockout) {
    clapAt = millis();
    lastClap = clapAt;
  }
  wasAbove = isAbove;
  return clapAt;
}

function inputReading() {
  if (lastEvent < 0) {
    return 'clap: none yet   level: ' + nf(level, 1, 2);
  }
  return 'last clap: ' + nf((millis() - lastEvent) / 1000, 1, 1) + ' s ago   level: ' + nf(level, 1, 2);
}

function inputStatus() {
  if (problem !== '') {
    return problem;
  }
  if (!micReady) {
    return 'tap to turn on the microphone';
  }
  if (millis() - lastClap < lockout) {
    return 'clap counted. waiting a moment before the next';
  }
  return 'clap a steady beat';
}

// the level as a bar up the left edge, with the line. it flashes when a clap counts.
function drawInput() {
  noStroke();
  if (millis() - lastClap < 120) {
    fill(255, 200, 0);
  } else {
    fill(100, 200, 255);
  }
  rect(0, height - level * height, 12, level * height);
  stroke(255, 200, 0);
  strokeWeight(2);
  line(0, height - threshold * height, 40, height - threshold * height);
  noStroke();
}

// any touch wakes the sound system, in case the phone put it to sleep
function mousePressed() {
  wakeAudio();
  return false;
}
