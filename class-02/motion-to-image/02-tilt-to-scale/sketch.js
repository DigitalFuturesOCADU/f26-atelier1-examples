// 02 · Tilt to Scale
// rotationX drives the size of the suit.
// Lay the phone flat and the suit is small. Stand the phone up and the suit stands tall.
// Input range: 0 to 90 degrees. Output range: 0.2 to 1.2 times the size.

let suit;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enableGyroTap('Tap to enable motion sensors');
  angleMode(DEGREES); // rotation values in degrees
  imageMode(CENTER);

  suit = await loadImage('spaceSuit2.png');
}

function draw() {
  background(20);
  fill(255);
  textSize(16);

  if (window.sensorsEnabled) {
    // 1. read the input: tip forward and back
    let tilt = rotationX;

    // 2. keep it inside the range we want: flat (0) to upright (90)
    tilt = constrain(tilt, 0, 90);

    // 3. map the input range onto the output range
    let size = map(tilt, 0, 90, 0.2, 1.2);

    // 4. use it
    let h = height * 0.7 * size;
    let w = h * suit.width / suit.height;
    image(suit, width / 2, height / 2, w, h);

    text('rotationX: ' + round(rotationX) + '   size: ' + size.toFixed(2), 20, 30);
  } else {
    text('Tap to enable motion sensors', 20, 30);
  }
}
