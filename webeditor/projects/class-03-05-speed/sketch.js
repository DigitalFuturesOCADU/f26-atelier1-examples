// 05 · Change the Speed
// Every frame in a GIF has its own delay, in milliseconds. The file sets it.
// delay() replaces it for every frame at once. Each tap picks the next speed.

let gif;
let speeds = [500, 150, 50, 20]; // milliseconds per frame. smaller is faster
let which = 1;                   // which speed is on, counted from 0

async function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  gif = await loadImage('stitch.gif');
  gif.delay(speeds[which]);
}

function draw() {
  background(20);

  // the labels sit in the top 70 pixels, so the GIF is fitted below them
  let top = 70;
  let s = min(width * 0.8 / gif.width, (height - top) * 0.85 / gif.height);
  image(gif, width / 2, top + (height - top) / 2, gif.width * s, gif.height * s);

  fill(255);
  textSize(16);
  text('delay(' + speeds[which] + ')', 20, 30);
  text('tap for the next speed', 20, 52);
}

function mousePressed() {
  which = which + 1;
  if (which >= speeds.length) {
    which = 0; // past the last speed, go back to the first
  }
  gif.delay(speeds[which]);
}
