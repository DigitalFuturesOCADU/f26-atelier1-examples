// Level 2 · 01 Where You Left Off
// Class 3's One Frame at a Time, with a memory. Each tap shows the next frame,
// and the phone remembers which frame you were on. Close the page, open it again,
// and the GIF is where you left it. Without the memory, it starts at frame 0 every time.
//
// localStorage keeps a little text on this phone, in this browser, and nowhere else.
// Your laptop has its own. Another phone has its own. Nobody else can see yours.
//   localStorage.setItem(KEY, text)    write
//   localStorage.getItem(KEY)          read. null if nothing was ever written
//   localStorage.removeItem(KEY)       forget

const KEY = 'class14-where-you-left-off'; // the name it is kept under. start it with your project's name

let gif;
let frame = 0;      // the frame we are showing
let barHeight = 60; // the forget bar at the bottom

async function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  gif = await loadImage('stitch.gif');
  gif.pause(); // stop it from playing on its own

  // what did the last visit leave? localStorage gives back text, like "7", or null
  try {
    let saved = localStorage.getItem(KEY);
    if (saved !== null) {
      frame = Number(saved) % gif.numFrames(); // the text "7" becomes the number 7
    }
  } catch (e) {
    // some private windows block storage. the sketch still runs. it just forgets
  }
  gif.setFrame(frame);
}

function draw() {
  background(20);
  if (!gif) {
    return; // the GIF is still loading
  }

  // the labels sit in the top 90 pixels, so the GIF is fitted below them and above the bar
  let top = 90;
  let bottom = height - barHeight;
  let s = min(width * 0.8 / gif.width, (bottom - top) * 0.85 / gif.height);
  image(gif, width / 2, top + (bottom - top) / 2, gif.width * s, gif.height * s);

  let last = gif.numFrames() - 1; // counting from 0, the last frame is one less than the total

  noStroke();
  fill(255);
  textSize(16);
  text('setFrame(' + frame + ')   last frame: ' + last, 20, 30);
  text('tap for the next frame. then reload the page', 20, 52);

  // what this phone keeps, exactly as it is kept: text
  fill(255, 200, 0);
  text('this phone remembers: ' + savedText(), 20, 74);

  // the forget bar
  fill(45);
  rect(0, bottom, width, barHeight);
  fill(200);
  text('forget · tap here and this phone forgets the frame', 20, bottom + 35);
}

// what is kept under KEY, in quotes, because it is text
function savedText() {
  try {
    let saved = localStorage.getItem(KEY);
    if (saved === null) {
      return 'nothing yet';
    }
    return '"' + saved + '"';
  } catch (e) {
    return 'nothing. storage is blocked here';
  }
}

function mousePressed() {
  if (!gif) {
    return;
  }

  // a tap on the bar: forget, and go back to the first frame
  if (mouseY > height - barHeight) {
    try {
      localStorage.removeItem(KEY);
    } catch (e) { }
    frame = 0;
    gif.setFrame(frame);
    return false;
  }

  frame = frame + 1;
  if (frame >= gif.numFrames()) {
    frame = 0; // past the last frame, go back to the first
  }
  gif.setFrame(frame);

  // remember it. the number 7 is kept as the text "7"
  try {
    localStorage.setItem(KEY, frame);
  } catch (e) { }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
