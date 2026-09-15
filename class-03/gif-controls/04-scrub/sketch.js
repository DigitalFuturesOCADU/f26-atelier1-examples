// 04 · Drag to Scrub
// While you drag, your finger's position picks the frame.
// The left edge is the first frame. The right edge is the last.
// map() turns one range (0 to width) into another (0 to the last frame).
// On the phone the same four steps work with a sensor instead of mouseX. See 08.

let gif;
let frame = 0;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  gif = await loadImage('stitch.gif');
  gif.pause(); // we choose the frame, not the clock
}

function draw() {
  background(20);

  if (mouseIsPressed) {
    let last = gif.numFrames() - 1;

    // 1. read the input
    let x = mouseX;
    // 2. keep it inside the range we want
    x = constrain(x, 0, width);
    // 3. map the input range onto the frame range
    frame = round(map(x, 0, width, 0, last));
    // 4. use it
    gif.setFrame(frame);
  }

  let s = min(width * 0.8 / gif.width, height * 0.7 / gif.height);
  image(gif, width / 2, height / 2, gif.width * s, gif.height * s);

  fill(255);
  textSize(16);
  text('mouseX: ' + round(mouseX) + '   frame: ' + frame, 20, 30);
  text('drag across the screen', 20, 52);
}
