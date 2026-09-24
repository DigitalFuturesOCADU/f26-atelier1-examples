// 07 · Say the Time
// Speech. The phone's own voice says what time it is. No library, no recording.
// Where you tap sets how it speaks: left and right is how fast, up and down is how high.
// Your phone has voices. Tap the bar at the top to hear the next one. It says its own name.
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
let firstWord = 'Ready.';  // said on the first tap
let voiceName = '';        // start on a voice by name, like 'Samantha' or 'Daniel'. '' is the phone's default
let onlyMyLanguage = true; // true: only the voices in the phone's language. false: every voice
let slowestRate = 0.5;     // speech rate at the left edge. 1 is normal
let fastestRate = 2;       // speech rate at the right edge
let lowestPitch = 0.2;     // voice pitch at the bottom. 1 is normal
let highestPitch = 2;      // voice pitch at the top. 2 is the highest

let voices = [];       // the voices on this phone
let voiceNumber = -1;  // which one is in use. -1 is the phone's default
let barTop = 80;       // the voice bar, under the labels
let barHeight = 60;
let lastSaid = '';
let lastRate = 1;
let lastPitch = 1;

// your phone has voices. every phone has a different set.
// the list can arrive a moment after the page opens, so it is read again when it changes.
function loadVoices() {
  let language = navigator.language.slice(0, 2); // 'en' from 'en-CA'
  let all = speechSynthesis.getVoices();
  voices = [];
  for (let i = 0; i < all.length; i++) {
    if (!onlyMyLanguage || all[i].lang.startsWith(language)) {
      voices.push(all[i]);
    }
  }
  // start on the voice named in voiceName, or else on the phone's default
  voiceNumber = -1;
  for (let i = 0; i < voices.length; i++) {
    if (voiceName !== '' && voices[i].name.includes(voiceName)) {
      voiceNumber = i;
      break;
    }
  }
  if (voiceNumber < 0) {
    for (let i = 0; i < voices.length; i++) {
      if (voices[i].default) {
        voiceNumber = i;
      }
    }
  }
}
loadVoices();
speechSynthesis.addEventListener('voiceschanged', loadVoices);

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
    // a box as wide as the screen, so a long sentence wraps onto more lines
    text('"' + lastSaid + '"', 20, cy - 100, width - 40, 200);
    fill(160);
    textSize(16);
    text('rate ' + nf(lastRate, 1, 2) + '   pitch ' + nf(lastPitch, 1, 2), width / 2, cy + 120);
  }
  textAlign(LEFT, BASELINE);

  drawVoiceBar();

  // the labels sit in the top 70 pixels
  fill(255);
  textSize(16);
  text('speechSynthesis · the phone\'s own voice', 20, 30);
  if (!unlocked) {
    text('tap to turn on sound', 20, 52);
  } else {
    text('tap: left is slow, right is fast, up is higher', 20, 52);
  }
  fill(160);
  textSize(13);
  text('Your phone has voices. Every phone has a different set.', 20, height - 12);
}

// the voice bar: which voice is in use, out of how many. tap it for the next one.
function drawVoiceBar() {
  noFill();
  stroke(90);
  rect(20, barTop, width - 40, barHeight, 8);
  noStroke();
  fill(255);
  textSize(16);
  if (voices.length === 0) {
    text('the phone\'s default voice', 32, barTop + 25);
  } else if (voiceNumber < 0) {
    text('the phone\'s default voice · ' + voices.length + ' voices', 32, barTop + 25);
  } else {
    text(voices[voiceNumber].name, 32, barTop + 25);
  }
  fill(160);
  textSize(13);
  if (voices.length > 0) {
    text('voice ' + (voiceNumber + 1) + ' of ' + voices.length + ' · tap here for the next one', 32, barTop + 46);
  }
}

// the next voice in the list. it says its own name.
function nextVoice() {
  if (voices.length === 0) {
    return;
  }
  voiceNumber = (voiceNumber + 1) % voices.length;
  voiceName = voices[voiceNumber].name;
  speechSynthesis.cancel();
  sayText('My name is ' + voiceName + '.', 1, 1);
}

function mousePressed() {
  // the first tap belongs to the sound message, so it does not speak the time
  if (!unlocked) {
    return false;
  }
  // a tap on the voice bar picks the next voice
  if (mouseY >= barTop && mouseY <= barTop + barHeight) {
    nextVoice();
    return false;
  }
  // 1. read the tap. 2. map it onto a rate and a pitch. 3. say the time with them.
  let rate = map(mouseX, 0, width, slowestRate, fastestRate, true);
  let pitch = map(mouseY, height, barTop + barHeight, lowestPitch, highestPitch, true);
  speechSynthesis.cancel(); // stop the last sentence, so a new tap is never ignored
  let words = 'It is ' + hour() + ' ' + nf(minute(), 2) + ', and ' + second() + ' seconds.';
  sayText(words, rate, pitch);
  return false;
}

// say something in the chosen voice. the rate and pitch are fixed now, for the whole sentence.
function sayText(words, rate, pitch) {
  let sentence = new SpeechSynthesisUtterance(words);
  if (voiceNumber >= 0) {
    sentence.voice = voices[voiceNumber];
    sentence.lang = voices[voiceNumber].lang;
  }
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
