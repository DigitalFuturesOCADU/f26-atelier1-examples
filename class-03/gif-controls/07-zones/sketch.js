// 07 · Three Zones
// The screen is split into three bands. Where you tap decides what happens.
// top: play or pause   middle: next speed   bottom: back to the start

let gif;
let playing = true;
let speeds = [500, 150, 50];
let which = 1;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  textSize(16);

  gif = await loadImage('stitch.gif');
  gif.delay(speeds[which]);
}

function draw() {
  background(20);

  let s = min(width * 0.8 / gif.width, height * 0.7 / gif.height);
  image(gif, width / 2, height / 2, gif.width * s, gif.height * s);

  // the two lines that divide the bands
  stroke(80);
  line(0, height / 3, width, height / 3);
  line(0, height * 2 / 3, width, height * 2 / 3);
  noStroke();

  // a label in each band
  fill(255);
  if (playing) {
    text('playing   tap here to pause', 20, 30);
  } else {
    text('paused   tap here to play', 20, 30);
  }
  text('delay(' + speeds[which] + ')   tap here for the next speed', 20, height / 3 + 30);
  text('frame: ' + gif.getCurrentFrame() + '   tap here to reset', 20, height * 2 / 3 + 30);
}

function mousePressed() {
  if (mouseY < height / 3) {
    // top band: play or pause
    if (playing) {
      gif.pause();
      playing = false;
    } else {
      gif.play();
      playing = true;
    }
  } else if (mouseY < height * 2 / 3) {
    // middle band: next speed
    which = which + 1;
    if (which >= speeds.length) {
      which = 0;
    }
    gif.delay(speeds[which]);
  } else {
    // bottom band: back to the start. reset() also plays
    gif.reset();
    playing = true;
  }
}
