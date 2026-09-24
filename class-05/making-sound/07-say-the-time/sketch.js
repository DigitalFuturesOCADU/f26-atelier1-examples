// 07 · Say the Time
// Speech. The phone's own voice says what time it is. No library, no recording.
// Where you tap sets how it speaks: left and right is how fast, up and down is how high.
//
// The voice is the browser's own speech, speechSynthesis. It sits outside the sound system,
// so there are no effects on it. Its settings are fixed when a sentence starts.
// Every phone has its own voices, so the same sketch sounds different on each one.

// a phone only lets a page speak once a tap has made it speak.
// This catches the first tap, before p5-phone's tap message does its own work,
// and says one word inside that tap. After that, speech works from anywhere.
let unlocked = false;
function unlockSpeech() {
  if (unlocked) {
    return;
  }
  unlocked = true;
  sayText(firstWord, 1, 1);
}
document.addEventListener('touchend', unlockSpeech, { capture: true, once: true });
document.addEventListener('click', unlockSpeech, { capture: true, once: true });
// with a mouse, p5-phone's tap message goes away before the browser sends 'click'
document.addEventListener('pointerup', function (e) {
  if (e.pointerType === 'mouse') {
    unlockSpeech();
  }
}, { capture: true });

// the feel of the piece. change these before you change anything else.
let firstWord = 'Ready.'; // said on the first tap
let slowestRate = 0.5;    // speech rate at the left edge. 1 is normal
let fastestRate = 2;      // speech rate at the right edge
let lowestPitch = 0.2;    // voice pitch at the bottom. 1 is normal
let highestPitch = 2;     // voice pitch at the top. 2 is the highest

let lastSaid = '';
let lastRate = 1;
let lastPitch = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableSoundTap('Tap to turn on sound');
}

function draw() {
  background(20);

  // the last sentence, big. it is lit while the phone speaks.
  let cy = 70 + (height - 160) / 2;
  textAlign(CENTER, CENTER);
  noStroke();
  if (speechSynthesis.speaking) {
    fill(255, 200, 0);
  } else {
    fill(255);
  }
  textSize(min(40, width / 12));
  if (lastSaid !== '') {
    text('"' + lastSaid + '"', width / 2, cy);
    fill(160);
    textSize(16);
    text('rate ' + nf(lastRate, 1, 2) + '   pitch ' + nf(lastPitch, 1, 2), width / 2, cy + 50);
  }
  textAlign(LEFT, BASELINE);

  // the labels sit in the top 70 pixels
  fill(255);
  textSize(16);
  text('speechSynthesis · the phone\'s own voice', 20, 30);
  if (!unlocked) {
    text('tap to turn on sound', 20, 52);
  } else {
    text('tap: left is slow, right is fast, higher is a higher voice', 20, 52);
  }
  fill(160);
  textSize(13);
  text('Nothing to download: the voice is already on the phone.', 20, height - 12);
}

function mousePressed() {
  // the first tap belongs to the sound message, so it does not speak the time
  if (!unlocked) {
    return false;
  }
  // 1. read the tap. 2. map it onto a rate and a pitch. 3. say the time with them.
  let rate = map(mouseX, 0, width, slowestRate, fastestRate, true);
  let pitch = map(mouseY, height, 70, lowestPitch, highestPitch, true);
  speechSynthesis.cancel(); // stop the last sentence, so a new tap is never ignored
  sayText('It is ' + hour() + ' ' + nf(minute(), 2) + ', and ' + second() + ' seconds.', rate, pitch);
  return false;
}

// say something. the rate and pitch are fixed now, for the whole sentence.
function sayText(words, rate, pitch) {
  let sentence = new SpeechSynthesisUtterance(words);
  sentence.rate = rate;
  sentence.pitch = pitch;
  speechSynthesis.speak(sentence);
  lastSaid = words;
  lastRate = rate;
  lastPitch = pitch;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
