// 02 · Play and Pause
// Tap to stop the GIF. Tap again to start it.
// pause() freezes it on the frame it is showing. play() carries on from there.

let gif;
let playing = true; // our own note of the state. the GIF does not report it.

async function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  gif = await loadImage('stitch.gif');
}

function draw() {
  background(20);

  // the labels sit in the top 70 pixels, so the GIF is fitted below them
  let top = 70;
  let s = min(width * 0.8 / gif.width, (height - top) * 0.85 / gif.height);
  image(gif, width / 2, top + (height - top) / 2, gif.width * s, gif.height * s);

  fill(255);
  textSize(16);
  if (playing) {
    text('playing', 20, 30);
    text('tap to pause', 20, 52);
  } else {
    text('paused on frame ' + gif.getCurrentFrame(), 20, 30);
    text('tap to play', 20, 52);
  }
}

function mousePressed() {
  if (playing) {
    gif.pause();
    playing = false;
  } else {
    gif.play();
    playing = true;
  }
}
