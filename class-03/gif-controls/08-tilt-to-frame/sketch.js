// 08 · Tilt to Scrub
// Tilting the phone side to side picks the frame. Nothing plays on its own.
// rotationY is the tilt: about -45 with the left edge down, 45 with the right edge down.
// Same four steps as 04, with a sensor in place of the finger.

let gif;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone.
  // it only shows on a public https address, like the examples site.
  // in the web editor or on 127.0.0.1 the address would not open on a phone.
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableGyroTap('Tap to enable motion sensors');
  angleMode(DEGREES); // rotation values in degrees
  imageMode(CENTER);

  gif = await loadImage('stitch.gif');
  gif.pause(); // the tilt chooses the frame, not the clock
}

function draw() {
  background(20);
  fill(255);
  textSize(16);

  if (window.sensorsEnabled) {
    let last = gif.numFrames() - 1;

    // 1. read the input: tilt side to side
    let tilt = rotationY;
    // 2. keep it inside the range we want
    tilt = constrain(tilt, -45, 45);
    // 3. map the tilt range onto the frame range
    let frame = round(map(tilt, -45, 45, 0, last));
    // 4. use it
    gif.setFrame(frame);

    // the label sits in the top 50 pixels, so the GIF is fitted below it
    let top = 50;
    let s = min(width * 0.8 / gif.width, (height - top) * 0.85 / gif.height);
    image(gif, width / 2, top + (height - top) / 2, gif.width * s, gif.height * s);

    text('rotationY: ' + round(rotationY) + '   frame: ' + frame, 20, 30);
  } else {
    text('Tap to enable motion sensors', 20, 30);
  }
}
