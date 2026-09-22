// 06 · Word to Image
// Speech as a trigger. The person is given a list of words, and each word is a command.
// Say "go" and the machine runs. Say "stop" and it holds. Colour words tint it.
// It listens to the words as they arrive, so it reacts in the middle of a sentence.
// Compare it with 07, which waits for the whole sentence and then measures it.
//
// A sketch gets the microphone level or speech, not both at once.
// Speech also leaves the phone: the browser sends the sound to a speech service and gets text back.

// The GIF is loaded from the class GIF library by its full web address.
// That is why this sketch has no file to upload.
// To use your own GIF, upload it to the sketch and put its file name here, like 'myGif.gif'.
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/how-to-move-a-highway-barrier.gif';

// the words it knows. the person has to be told these, so they are drawn on the screen.
let commands = ['go', 'stop', 'faster', 'slower', 'back', 'red', 'green', 'blue', 'white'];
let language = 'en-US';

let speechRec;
let gif;
let playing = false;
let frameDelay = 100;     // milliseconds per frame. smaller is faster
let tintColour;
let lastWord = '';        // the last command it acted on
let heardText = '';       // the phrase it is hearing now, for the screen
let heardWords = [];      // the word it saw at each place since it started listening
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
  tintColour = color(255);

  if (!('webkitSpeechRecognition' in window)) {
    problem = 'this browser has no speech recognition. tap to step through the words';
  }
  enableSpeechTap('Tap to start listening');

  gif = await loadImage(gifFile);
  gif.pause();
}

// p5-phone calls this after the tap
function userSetupComplete() {
  speechRec = new p5.SpeechRec(language);
  speechRec.continuous = true;     // keep listening, phrase after phrase
  speechRec.interimResults = true; // send words as they arrive, before the phrase is finished
  speechRec.onResult = gotSpeech;
  speechRec.onStart = function () {
    listening = true;
  };
  // phones stop listening after a pause. when that happens, start again,
  // a moment later, unless speech was refused.
  speechRec.onEnd = function () {
    listening = false;
    heardWords = []; // a new round of listening counts its words from the start
    if (problem === '') {
      setTimeout(restartListening, 300);
    }
  };
  speechRec.onError = function (e) {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      problem = 'speech was not allowed. tap to step through the words';
    }
  };
  speechRec.start();
}

// some phones refuse to start again without a tap. if this fails,
// the screen says so, and the next tap tries again.
function restartListening() {
  try {
    speechRec.start();
  } catch (error) {
    console.log(error);
  }
}

// this runs every time the text changes, many times per phrase.
// the speech service guesses as it goes and corrects itself:
// "no" can turn into "go" a moment later.
function gotSpeech() {
  heardText = speechRec.resultString.toLowerCase();

  // every word heard since it started listening, in order
  let results = speechRec.resultJSON.results;
  let all = '';
  for (let i = 0; i < results.length; i++) {
    all = all + ' ' + results[i][0].transcript;
  }
  let words = all.trim().toLowerCase().split(/\s+/); // split at the spaces

  // act on a word when it first appears at its place in the list.
  // a word that stays the same is not acted on again, so one "faster"
  // does not count five times. a corrected word is new, so it counts.
  for (let i = 0; i < words.length; i++) {
    let word = words[i].replace(/[^a-z]/g, ''); // "Go." becomes "go"
    if (word !== heardWords[i]) {
      heardWords[i] = word;
      doCommand(word);
    }
  }
}

function doCommand(word) {
  if (!commands.includes(word)) {
    return;
  }
  lastWord = word;
  if (word === 'go') {
    playing = true;
  } else if (word === 'stop') {
    playing = false;
  } else if (word === 'faster') {
    frameDelay = max(frameDelay / 2, 20);
  } else if (word === 'slower') {
    frameDelay = min(frameDelay * 2, 800);
  } else if (word === 'back') {
    gif.reset();
  } else if (word === 'red') {
    tintColour = color(255, 90, 90);
  } else if (word === 'green') {
    tintColour = color(90, 255, 120);
  } else if (word === 'blue') {
    tintColour = color(100, 150, 255);
  } else if (word === 'white') {
    tintColour = color(255);
  }
}

function draw() {
  background(20);

  if (playing) {
    gif.play();
    gif.delay(frameDelay);
  } else {
    gif.pause();
  }

  let top = 120;
  let s = min(width * 0.9 / gif.width, (height - top) * 0.85 / gif.height);
  tint(tintColour);
  image(gif, width / 2, top + (height - top) / 2, gif.width * s, gif.height * s);
  noTint();

  fill(255);
  noStroke();
  text('say: ' + commands.join('  '), 20, 30, width - 40);
  text('last command: ' + lastWord, 20, 84);
  fill(160);
  text('heard: ' + heardText, 20, 106);
  fill(255);
  if (problem !== '') {
    text(problem, 20, height - 20);
  } else if (listening) {
    text('listening', 20, height - 20);
  } else if (!window.speechEnabled) {
    text('tap to start listening', 20, height - 20);
  } else {
    text('not listening. tap to listen again', 20, height - 20);
  }
}

// the fallback: a tap does the next command in the list, as if it had been said.
// the first tap belongs to the start message, so it is not counted.
// if listening has stopped, a tap starts it again instead.
function mousePressed() {
  if (!window.speechEnabled) {
    return false;
  }
  if (speechRec && !listening && problem === '') {
    restartListening();
  } else {
    let next = (commands.indexOf(lastWord) + 1) % commands.length;
    doCommand(commands[next]);
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
