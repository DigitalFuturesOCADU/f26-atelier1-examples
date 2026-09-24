// 05 · Start a Loop
// Tone.js. A short pattern of notes plays again and again, on Tone.js's own clock.
// Drag left and right to set the tempo. The loop keeps time on its own.
//
// Tone.js has a clock called the Transport. The notes are scheduled on it, not on draw().
// draw() runs about 60 times a second, but it slows down when the phone is busy,
// and a note that waited for draw() would wobble. The screen follows the sound, not the other way.

// phones only start sound inside a tap. p5-phone's sound tap starts p5.sound, not Tone.js.
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
// with a mouse, p5-phone's tap message goes away before the browser sends 'click'
document.addEventListener('pointerup', function (e) {
  if (e.pointerType === 'mouse') {
    unlockAudio();
  }
}, { capture: true });

// the feel of the piece. change these before you change anything else.
let pattern = ['C4', 'E4', 'G4', 'B4', 'C5', 'B4', 'G4', 'E4']; // one note per step
let stepLength = '8n';  // each step is an eighth note. try '16n' or '4n'
let slowestTempo = 50;  // beats per minute at the left edge
let fastestTempo = 200; // beats per minute at the right edge

let synth;              // the Tone.js synth that plays the notes
let started = false;
let nextStep = 0;       // which step of the pattern plays next. (not step: p5.js owns that name)
let stepShown = -1;     // which step the screen shows as lit
let tempo = 100;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableSoundTap('Tap to turn on sound');

  synth = new Tone.Synth().toDestination();

  // Tone.js calls this once every step, on its own clock.
  // time is the exact moment the step is due, so the note is scheduled for that moment.
  new Tone.Loop(function (time) {
    synth.triggerAttackRelease(pattern[nextStep], '16n', time);
    // light the step on screen when the sound actually plays, not now
    let shown = nextStep;
    Tone.getDraw().schedule(function () {
      stepShown = shown;
    }, time);
    nextStep = (nextStep + 1) % pattern.length;
  }, stepLength).start(0);

  Tone.getTransport().bpm.value = tempo;
}

function draw() {
  background(20);

  // the Transport starts once there is a tap
  if (unlocked && !started) {
    Tone.getTransport().start();
    started = true;
  }

  // 1. read the finger. 2. map it onto a tempo. 3. use it.
  if (unlocked && mouseIsPressed) {
    tempo = map(mouseX, 0, width, slowestTempo, fastestTempo, true);
    Tone.getTransport().bpm.value = tempo;
  }

  // one box for each step of the pattern. the one playing is lit.
  let w = width / pattern.length;
  let cy = 70 + (height - 160) / 2;
  textAlign(CENTER, CENTER);
  for (let i = 0; i < pattern.length; i++) {
    stroke(20);
    strokeWeight(4);
    if (i === stepShown) {
      fill(255, 200, 0);
    } else {
      fill(45);
    }
    rect(i * w, cy - 60, w, 120);
    noStroke();
    if (i === stepShown) {
      fill(20);
    } else {
      fill(255);
    }
    textSize(16);
    text(pattern[i], i * w + w / 2, cy);
  }
  textAlign(LEFT, BASELINE);

  // the labels sit in the top 70 pixels
  noStroke();
  fill(255);
  textSize(16);
  text('Tone.js · ' + round(tempo) + ' beats per minute', 20, 30);
  if (!unlocked) {
    text('tap to turn on sound', 20, 52);
  } else {
    text('drag: left is slow, right is fast', 20, 52);
  }
  fill(160);
  textSize(13);
  text('Two clocks: the loop keeps its own time. The screen catches up.', 20, height - 12);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
