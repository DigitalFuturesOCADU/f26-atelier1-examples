// 01 · Load an Image
// p5.js 2.0 loads files with async and await.
// No motion yet. The next three sketches start from this one.

let suit; // the image, once it has loaded

async function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER); // x and y now mean the centre of the image

  // setup waits on this line until the file is ready
  suit = await loadImage('spaceSuit2.png');
}

function draw() {
  background(20);

  // fit the suit to 70% of the screen height, and keep its shape
  let h = height * 0.7;
  let w = h * suit.width / suit.height;

  image(suit, width / 2, height / 2, w, h);

  // the image knows its own size in pixels
  fill(255);
  textSize(16);
  text('suit.width: ' + suit.width + '   suit.height: ' + suit.height, 20, 30);
}
