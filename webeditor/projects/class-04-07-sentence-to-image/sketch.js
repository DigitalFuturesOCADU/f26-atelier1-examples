// 07 · Sentence to Image
// Speech as material. Nothing is a command. The sketch waits for a whole sentence,
// then measures it: how many words, how long the words are, and whether it sounds
// positive or negative. Those three numbers set the picture.
// Compare it with 06. There the speaker is in control. Here the speaker is being read.
// What was heard is drawn on the screen, so the person can see what the phone made of them.
//
// A sketch gets the microphone level or speech, not both at once.
// Speech also leaves the phone: the browser sends the sound to a speech service and gets text back.

// The GIF is loaded from the class GIF library by its full web address.
// That is why this sketch has no file to upload.
// To use your own GIF, upload it to the sketch and put its file name here, like 'myGif.gif'.
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/hand.gif';

let language = 'en-US';

// the fallback: with no speech, a tap reads the next one of these instead
let spareSentences = [
  'what a lovely bright morning',
  'this is a terrible and disappointing catastrophe of extraordinary proportions',
  'no'
];

let speechRec;
let sentiment; // an ml5.js model that scores text from 0, negative, to 1, positive
let gif;
let sentence = '';
let wordCount = 0;
let averageLength = 0;
let tone = 0.5;
let spare = 0;
let listening = false;
let problem = '';

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone.
  // it only shows on a public https address, like the examples site.
  // in the web editor or on 127.0.0.1 the address would not open on a phone.
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  imageMode(CENTER);
  textSize(16);

  if (!('webkitSpeechRecognition' in window)) {
    problem = 'this browser has no speech recognition. tap for a spare sentence';
  }
  enableSpeechTap('Tap to start listening');

  gif = await loadImage(gifFile);
  // trained on film reviews, in English only. it is crude, and that is worth noticing.
  sentiment = await ml5.sentiment('MovieReviews');
}

// p5-phone calls this after the tap
function userSetupComplete() {
  speechRec = new p5.SpeechRec(language);
  speechRec.continuous = true;      // keep listening, sentence after sentence
  speechRec.interimResults = false; // wait for the finished sentence. this is the difference from 06
  speechRec.onResult = gotSentence;
  speechRec.onStart = function () {
    listening = true;
  };
  // phones stop listening after a pause. when that happens, start again,
  // a moment later, unless speech was refused.
  speechRec.onEnd = function () {
    listening = false;
    if (problem === '') {
      setTimeout(restartListening, 300);
    }
  };
  speechRec.onError = function (e) {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      problem = 'speech was not allowed. tap for a spare sentence';
    }
  };
  speechRec.start();
}

function restartListening() {
  speechRec.start();
}

// this runs once per finished sentence
function gotSentence() {
  measure(speechRec.resultString);
}

// turn a sentence into three numbers
function measure(said) {
  sentence = said;
  let words = said.split(' ');
  wordCount = words.length;

  let letters = 0;
  for (let i = 0; i < words.length; i++) {
    letters = letters + words[i].length;
  }
  averageLength = letters / wordCount;

  // the tone takes a moment, so the answer arrives in gotTone
  if (sentiment) {
    sentiment.predict(said, gotTone);
  }
}

function gotTone(result) {
  tone = result.confidence; // 0 is negative, 1 is positive
}

function draw() {
  background(20);

  // long words slow the animation down
  gif.delay(round(map(averageLength, 2, 9, 30, 300, true)));

  // the tone is the colour: blue for negative, white in the middle, orange for positive
  let cold = color(90, 140, 255);
  let warm = color(255, 170, 70);
  let middle = color(255);
  let tintColour;
  if (tone < 0.5) {
    tintColour = lerpColor(cold, middle, tone * 2);
  } else {
    tintColour = lerpColor(middle, warm, (tone - 0.5) * 2);
  }

  // the word count is the number of copies, in a grid
  let copies = constrain(wordCount, 1, 16);
  let columns = ceil(sqrt(copies));
  let rows = ceil(copies / columns);
  let top = 110;
  let cellW = width / columns;
  let cellH = (height - top) / rows;
  let s = min(cellW * 0.95 / gif.width, cellH * 0.95 / gif.height);
  tint(tintColour);
  for (let i = 0; i < copies; i++) {
    let x = (i % columns) * cellW + cellW / 2;
    let y = top + floor(i / columns) * cellH + cellH / 2;
    image(gif, x, y, gif.width * s, gif.height * s);
  }
  noTint();

  fill(255);
  noStroke();
  text('words: ' + wordCount + '   average length: ' + nf(averageLength, 1, 1) + '   tone: ' + nf(tone, 1, 2), 20, 30);
  fill(160);
  text('heard: ' + sentence, 20, 44, width - 40);
  fill(255);
  if (problem !== '') {
    text(problem, 20, height - 20);
  } else if (listening) {
    text('listening. say a sentence, then pause', 20, height - 20);
  } else if (!window.speechEnabled) {
    text('tap to start listening', 20, height - 20);
  }
}

// the fallback: a tap reads the next spare sentence, as if it had been said.
// the first tap belongs to the start message, so it is not counted.
function mousePressed() {
  if (window.speechEnabled) {
    measure(spareSentences[spare]);
    spare = (spare + 1) % spareSentences.length;
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
