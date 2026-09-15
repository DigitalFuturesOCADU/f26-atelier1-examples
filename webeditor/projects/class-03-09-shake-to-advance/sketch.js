// 09 · Shake for the Next Frame
// The GIF holds still. Each shake moves it one frame forward.
// deviceShaken() is an event. p5.js calls it for you when a shake passes the threshold.

let gif;
let frame = 0;
let lastShake = 0; // when the last shake counted, in milliseconds

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enableGyroTap('Tap to enable motion sensors');
  setShakeThreshold(30); // lower is easier to trigger
  imageMode(CENTER);

  gif = await loadImage('stitch.gif');
  gif.pause(); // the shake chooses when to move, not the clock
}

function draw() {
  background(20);
  fill(255);
  textSize(16);

  if (window.sensorsEnabled) {
    let s = min(width * 0.8 / gif.width, height * 0.7 / gif.height);
    image(gif, width / 2, height / 2, gif.width * s, gif.height * s);

    text('frame: ' + frame + '   last frame: ' + (gif.numFrames() - 1), 20, 30);
    text('shake for the next frame', 20, 52);
  } else {
    text('Tap to enable motion sensors', 20, 30);
  }
}

function deviceShaken() {
  // one shake calls this many times in a row.
  // only count it if 0.7 seconds have passed since the last one.
  if (millis() - lastShake > 700) {
    frame = frame + 1;
    if (frame >= gif.numFrames()) {
      frame = 0;
    }
    gif.setFrame(frame);
    lastShake = millis();
  }
}
