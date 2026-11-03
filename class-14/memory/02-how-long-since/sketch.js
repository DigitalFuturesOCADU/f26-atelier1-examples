// Level 2 · 02 How Long Since
// Class 5's Say the Time, with a memory. The phone says what time it is, and then
// how long ago you last asked. It keeps two things: how many times you have asked,
// and when you last did. Close the page, come back tomorrow, and it still knows.
//
// localStorage keeps text only. Two things go in one object, and the object becomes
// one line of text with JSON.stringify. JSON.parse turns the text back into the object.
//   { count: 5, last: 1762094040123 }  becomes  '{"count":5,"last":1762094040123}'
// last is Date.now(): the milliseconds since 1 January 1970. Subtract two of them
// and you get how long it has been.
//
// Like the first sketch, the memory is on this phone, in this browser, and nowhere else.
//
// Where you tap sets how it speaks: left and right is how fast, up and down is how high.
// Tap the bar at the top to hear the next voice. It says its own name.

const KEY = 'class14-how-long-since'; // the name it is kept under. start it with your project's name

let memory = { count: 0, last: 0 }; // what this phone remembers. setup() reads it
let forgetHeight = 60;              // the forget bar at the bottom

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

  // what did the last visit leave? text, or null if nothing was ever written
  try {
    let saved = localStorage.getItem(KEY);
    if (saved !== null) {
      memory = JSON.parse(saved); // the text becomes the object again
    }
  } catch (e) {
    // storage is blocked, or the text was not JSON. start from nothing
  }
}

// write the whole object as one line of text
function saveMemory() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch (e) { }
}

// how long a number of milliseconds is, in words, down to the second:
// '45 seconds', '3 minutes and 12 seconds', '2 hours, 5 minutes and 1 second'
function howLong(ms) {
  let all = floor(ms / 1000);  // every second, all in one number
  let days = floor(all / 86400);
  let hours = floor(all / 3600) % 24;  // % keeps what is left over: 26 hours is 1 day and 2 hours
  let minutes = floor(all / 60) % 60;
  let seconds = all % 60;

  // a part that is 0 is left out: '1 hour and 5 seconds'
  let parts = [];
  if (days > 0) {
    parts.push(inWords(days, 'day'));
  }
  if (hours > 0) {
    parts.push(inWords(hours, 'hour'));
  }
  if (minutes > 0) {
    parts.push(inWords(minutes, 'minute'));
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(inWords(seconds, 'second'));
  }

  // join them the way you would say them: 'a and b', or 'a, b and c'
  if (parts.length === 1) {
    return parts[0];
  }
  let last = parts.pop();
  return parts.join(', ') + ' and ' + last;
}

function inWords(n, word) {
  if (n === 1) {
    return '1 ' + word;
  }
  return n + ' ' + word + 's';
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
  // what this phone remembers, in words and exactly as it is kept.
  // each one sits in a box as wide as the screen, so a long line wraps.
  // BOTTOM keeps the words on the bottom edge of their box, just above the forget bar
  let bottom = height - forgetHeight - 12;
  textAlign(LEFT, BOTTOM);
  fill(255, 200, 0);
  textSize(16);
  if (memory.count === 0) {
    text('you have not asked yet', 20, bottom - 116, width - 40, 80);
  } else {
    text('asked ' + inWords(memory.count, 'time') + ' · last time ' + howLong(Date.now() - memory.last) + ' ago', 20, bottom - 116, width - 40, 80);
  }
  textSize(13);
  text('this phone remembers: ' + savedText(), 20, bottom - 36, width - 40, 36);
  textAlign(LEFT, BASELINE);

  // the forget bar
  fill(45);
  rect(0, height - forgetHeight, width, forgetHeight);
  fill(200);
  textSize(16);
  text('forget · tap here and this phone forgets', 20, height - forgetHeight + 35);
}

// what is kept under KEY, exactly as it is kept: one line of text
function savedText() {
  try {
    let saved = localStorage.getItem(KEY);
    if (saved === null) {
      return 'nothing yet';
    }
    return saved;
  } catch (e) {
    return 'nothing. storage is blocked here';
  }
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
  // a tap on the forget bar: forget everything this phone kept
  if (mouseY > height - forgetHeight) {
    try {
      localStorage.removeItem(KEY);
    } catch (e) { }
    memory = { count: 0, last: 0 };
    return false;
  }
  // 1. read the tap. 2. map it onto a rate and a pitch. 3. say the time with them.
  let rate = map(mouseX, 0, width, slowestRate, fastestRate, true);
  let pitch = map(mouseY, height - forgetHeight, barTop + barHeight, lowestPitch, highestPitch, true);
  speechSynthesis.cancel(); // stop the last sentence, so a new tap is never ignored
  let words = 'It is ' + hour() + ' ' + nf(minute(), 2) + ', and ' + second() + ' seconds.';

  // 4. what does this phone remember? say how long ago the last time was
  if (memory.count === 0) {
    words = words + ' This is the first time you asked.';
  } else {
    words = words + ' You last asked ' + howLong(Date.now() - memory.last) + ' ago.';
  }
  sayText(words, rate, pitch);

  // 5. remember this time, for next time
  memory.count = memory.count + 1;
  memory.last = Date.now();
  saveMemory();
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
