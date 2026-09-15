// 03 · One Frame at a Time
// The GIF does not play on its own here. Each tap shows the next frame.
// setFrame() jumps to any frame you name. Frames are counted from 0.

let gif;
let frame = 0; // the frame we are showing

async function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  gif = await loadImage('stitch.gif');
  gif.pause(); // stop it from playing on its own
}

function draw() {
  background(20);

  let s = min(width * 0.8 / gif.width, height * 0.7 / gif.height);
  image(gif, width / 2, height / 2, gif.width * s, gif.height * s);

  let last = gif.numFrames() - 1; // counting from 0, the last frame is one less than the total

  fill(255);
  textSize(16);
  text('setFrame(' + frame + ')   last frame: ' + last, 20, 30);
  text('tap for the next frame', 20, 52);
}

function mousePressed() {
  frame = frame + 1;
  if (frame >= gif.numFrames()) {
    frame = 0; // past the last frame, go back to the first
  }
  gif.setFrame(frame);
}
