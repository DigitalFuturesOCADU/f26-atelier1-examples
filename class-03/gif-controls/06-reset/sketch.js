// 06 · Back to the Start
// reset() jumps to frame 0 and plays from there, even if the GIF was paused.
// Tap to restart the loop. Watch the frame number jump.

let gif;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  gif = await loadImage('stitch.gif');
}

function draw() {
  background(20);

  let s = min(width * 0.8 / gif.width, height * 0.7 / gif.height);
  image(gif, width / 2, height / 2, gif.width * s, gif.height * s);

  fill(255);
  textSize(16);
  text('frame: ' + gif.getCurrentFrame(), 20, 30);
  text('tap to reset', 20, 52);
}

function mousePressed() {
  gif.reset();
}
