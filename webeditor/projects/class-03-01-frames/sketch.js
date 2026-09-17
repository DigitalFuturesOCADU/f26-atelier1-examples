// 01 · Count the Frames
// A GIF loads like any other image, but it carries a list of frames.
// numFrames() says how many there are. getCurrentFrame() says which one is showing.
// image() draws the GIF and moves it forward. It only plays while it is being drawn.

let gif;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  noStroke();

  gif = await loadImage('stitch.gif');
}

function draw() {
  background(20);

  // labels at the top, frame strip at the bottom, the GIF in between
  let top = 70;
  let bottom = 30;
  let s = min(width * 0.8 / gif.width, (height - top - bottom) / gif.height);
  image(gif, width / 2, top + (height - top - bottom) / 2, gif.width * s, gif.height * s);

  let total = gif.numFrames();     // how many frames the file has
  let now = gif.getCurrentFrame(); // the one showing now, counted from 0

  fill(255);
  textSize(16);
  text('numFrames(): ' + total, 20, 30);
  text('getCurrentFrame(): ' + now, 20, 52);

  // a strip along the bottom: one block per frame, the current one lit
  let block = width / total;
  for (let i = 0; i < total; i++) {
    if (i === now) {
      fill(223, 237, 51);
    } else {
      fill(80);
    }
    rect(i * block, height - 14, block - 2, 8);
  }
}
