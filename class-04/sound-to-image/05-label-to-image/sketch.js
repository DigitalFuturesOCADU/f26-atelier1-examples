// 05 · Label to Image
// A trained model listens and names what it hears. Each name has its own picture.
// Level, timing and bands cannot tell a clap from a snap. A model that was taught both can.
// It starts with a model that knows 18 English words. Say "go", "stop" or "up".
// Then train your own at teachablemachine.withgoogle.com and paste its link below.

// 1. THE MODEL
// 'SpeechCommands18w' is built in to ml5.js, so the sketch runs before you train anything.
// To use your own: in Teachable Machine choose Export Model, then Upload my model,
// copy the link, and put it here with model.json on the end, like
// 'https://teachablemachine.withgoogle.com/models/abc123/model.json'
let modelURL = 'SpeechCommands18w';

// 2. THE PICTURES
// On the left, a label exactly as the model spells it. On the right, the picture it shows.
// With your own model, the labels are the class names you typed in Teachable Machine.
// The GIFs come from the class GIF library by their full web address, so there is no file to upload.
// To use your own, upload it to the sketch and put its file name here, like 'myGif.gif'.
let library = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/';
let pictures = {
  'go': library + 'cow.gif',
  'stop': library + 'hand.gif',
  'up': library + 'jelloGif.gif'
};
// what shows when the model hears nothing it knows
let restingPicture = library + 'bugEating.gif';

// the feel of the piece. change these before you change anything else.
let confidenceNeeded = 0.8; // from 0 to 1. how sure the model has to be before the picture changes
let holdSeconds = 3;        // how long a picture stays before it goes back to resting

let classifier;
let gifs = {};       // the loaded pictures, by label
let resting;
let labels = [];     // the labels that have pictures
let current = '';    // the label showing now. empty means resting
let confidence = 0;
let heard = '';      // the last thing the model said, even if it has no picture
let changedAt = 0;
let listening = false;
let problem = '';

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  imageMode(CENTER);
  textSize(16);

  // this does not use p5.sound. ml5.js opens the microphone itself.
  // the tap is still needed: a phone will not start listening without one.
  enableSoundTap('Tap to start listening');

  resting = await loadImage(restingPicture);
  for (let label in pictures) {
    gifs[label] = await loadImage(pictures[label]);
    labels.push(label);
  }
  classifier = await ml5.soundClassifier(modelURL);
  startListening();
}

// p5-phone calls this after the tap
function userSetupComplete() {
  startListening();
}

// listening can only start when two things are both true:
// the model has loaded, and the person has tapped. they can happen in either order.
function startListening() {
  if (listening || !classifier || !window.soundEnabled) {
    return;
  }
  listening = true;
  try {
    // from here on, gotResult runs every time the model has something to say
    let started = classifier.classifyStart(gotResult);
    if (started && started.catch) {
      started.catch(noMicrophone);
    }
  } catch (error) {
    noMicrophone(error);
  }
}

function noMicrophone(error) {
  problem = 'no microphone. tap the screen to step through the labels';
  console.log(error);
}

// results is a list, most likely first. each one has a label and a confidence.
function gotResult(results) {
  heard = results[0].label;
  let sure = results[0].confidence;
  // only act when the model is sure, and only for labels that have a picture
  if (sure > confidenceNeeded && gifs[heard]) {
    show(heard, sure);
  }
}

function show(label, sure) {
  current = label;
  confidence = sure;
  changedAt = millis();
}

function draw() {
  background(20);

  // after a while with nothing new, go back to resting
  if (current !== '' && millis() - changedAt > holdSeconds * 1000) {
    current = '';
  }

  let picture = resting;
  if (current !== '') {
    picture = gifs[current];
    // less sure, more see-through. the doubt is part of the picture.
    tint(255, map(confidence, confidenceNeeded, 1, 110, 255));
  }
  let top = 90;
  let s = min(width * 0.85 / picture.width, (height - top) * 0.85 / picture.height);
  image(picture, width / 2, top + (height - top) / 2, picture.width * s, picture.height * s);
  noTint();

  fill(255);
  noStroke();
  if (current !== '') {
    text('showing: ' + current + '   sure: ' + nf(confidence, 1, 2), 20, 30);
  } else {
    text('resting', 20, 30);
  }
  text('last heard: ' + heard + '   it has pictures for: ' + labels.join(', '), 20, 52, width - 40);
  if (problem !== '') {
    text(problem, 20, 96);
  } else if (!listening) {
    text('tap to start listening', 20, 96);
  }
}

// the fallback: a tap shows the next label, as if the model had heard it.
// the first tap belongs to the start message, so it is not counted.
function mousePressed() {
  if (window.soundEnabled && labels.length > 0) {
    let next = (labels.indexOf(current) + 1) % labels.length;
    show(labels[next], 1);
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
