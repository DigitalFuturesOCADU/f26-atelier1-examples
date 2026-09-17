// Shake for a New Image
// Based on Daniel Shiffman's "p5.js 2.0 Loading a Sequence":
// https://editor.p5js.org/codingtrain/sketches/lQxT7PTKC
// The image does not live in this folder. Each shake asks the Dog API for
// the address of a random photo, loads it, and fills the screen with it.

let dog;             // the photo on screen. Empty until the first one arrives.
let loading = true;  // true while we are waiting for a photo
let lastShake = 0;   // when the last shake counted, in milliseconds

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enableGyroTap('Tap to enable motion sensors');
  setShakeThreshold(30); // lower is easier to trigger
  imageMode(CENTER);

  await newDog(); // the first photo
}

function draw() {
  background(20);

  if (loading) {
    drawLoading();
    return; // nothing else to draw until the photo is here
  }

  // Fill the screen. Work out how much the photo has to grow to cover the
  // width, and how much to cover the height, then use the bigger of the two.
  // Both sides grow by the same amount, so the photo is never squashed.
  // Whatever does not fit runs off the edges.
  let cover = max(width / dog.width, height / dog.height);
  image(dog, width / 2, height / 2, dog.width * cover, dog.height * cover);

  // a dark strip so the label stays readable over a pale photo
  noStroke();
  fill(0, 150);
  rect(0, 0, width, 44);

  fill(255);
  textAlign(LEFT, BASELINE);
  textSize(16);
  if (window.sensorsEnabled) {
    text('shake for a new dog', 20, 28);
  } else {
    text('Tap to enable motion sensors', 20, 28);
  }
}

// Ask the API for one random photo, then load it.
// Both steps take time, so both are awaited.
async function newDog() {
  loading = true;
  let data = await loadJSON('https://dog.ceo/api/breeds/image/random');
  dog = await loadImage(data.message); // data.message is the photo's address
  loading = false;
}

// This is what await buys you. newDog() is stopped at each await, waiting
// for the network, but draw() keeps running the whole time. So the wait is
// not a frozen canvas. It is a screen you get to design.
function drawLoading() {
  // a third of the way down, so the first one is not hidden behind
  // the permission prompt, which sits in the middle of the screen
  let y = height * 0.33;

  // a ring that breathes while we wait
  noFill();
  stroke(255);
  strokeWeight(3);
  circle(width / 2, y - 60, 50 + sin(millis() / 150) * 14);

  // dots that fill in one at a time: 0, 1, 2, 3, then back to 0
  let dots = floor(millis() / 300) % 4;
  let message = 'Finding Best Dog Available';
  for (let i = 0; i < dots; i = i + 1) {
    message = message + '.';
  }

  noStroke();
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(18);
  // centred by hand, leaving room for all three dots, so the words
  // hold still while the dots come and go
  let x = width / 2 - textWidth('Finding Best Dog Available...') / 2;
  text(message, x, y);
}

function deviceShaken() {
  // one shake calls this many times in a row.
  // only count it if 0.7 seconds have passed since the last one.
  // loading is checked too, so a shake cannot start a second request
  // while one is still on its way.
  if (millis() - lastShake > 700 && !loading) {
    newDog();
    lastShake = millis();
  }
}
