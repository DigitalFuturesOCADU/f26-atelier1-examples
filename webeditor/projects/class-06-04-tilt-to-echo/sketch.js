// 04 · Tilt to Echo
// 01's brush, with a longer memory. Every frame, the last frame is drawn back
// a little bigger and a little turned, then the new mark goes on top.
// Old marks spiral outward as echoes. Hold still and the brush draws a tunnel.
// Motion in, a drawing out. WEBGL, for createFramebuffer().
//
// A framebuffer is a canvas you can draw into and then use as an image.
// This sketch keeps two and swaps them each frame: read from one, draw into the other.

// the feel of the piece. change these before you change anything else.
let grow = 1.015;      // how much bigger each echo is. 1 is no growth
let twist = 0.6;       // how far each echo turns, in degrees
let keep = 250;        // how much of each echo survives. 255 keeps it all
let speed = 0.4;       // how far a full tilt pushes the brush each frame
let friction = 0.96;   // 1 rolls forever, 0.8 stops quickly
let size = 24;         // the brush

let before;            // last frame
let after;             // this frame
let label;             // an HTML line for the words
let x = 0;             // where the brush is. in WEBGL (0, 0) is the middle
let y = 0;
let vx = 0;
let vy = 0;
let restX = null;      // the forward tilt that counts as level. set by the first reading

// a laptop has no motion sensors. this turns true when the first real reading arrives.
let motionArrived = false;
window.addEventListener('devicemotion', function (event) {
  let g = event.accelerationIncludingGravity;
  if (g && g.x !== null) {
    motionArrived = true;
  }
});

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  pixelDensity(1); // two full-screen framebuffers at full sharpness is a lot for a phone
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableGyroTap('Tap to turn on motion');
  angleMode(DEGREES);
  colorMode(HSB, 360, 100, 100, 255);
  label = makeLabel();

  before = createFramebuffer({ depth: false });
  after = createFramebuffer({ depth: false });
}

function draw() {
  // 1. read the tilt as a push. the fallback: a finger pulls the brush toward it.
  let pushX = 0;
  let pushY = 0;
  if (window.sensorsEnabled && motionArrived) {
    if (restX === null) {
      restX = rotationX;
    }
    pushX = constrain(rotationY, -45, 45) / 45;
    pushY = constrain(rotationX - restX, -45, 45) / 45;
  }
  if (mouseIsPressed) {
    pushX = constrain((mouseX - width / 2 - x) / 200, -1, 1);
    pushY = constrain((mouseY - height / 2 - y) / 200, -1, 1);
  }

  // 2. move the brush, the same as 01
  vx = (vx + pushX * speed) * friction;
  vy = (vy + pushY * speed) * friction;
  x = constrain(x + vx, -width / 2, width / 2);
  y = constrain(y + vy, -height / 2, height / 2);

  // 3. draw into 'after': last frame, grown and turned and faded, then the new mark
  after.draw(function () {
    background(0, 0, 8);
    push();
    rotate(twist);
    scale(grow);
    tint(255, keep);
    imageMode(CENTER);
    image(before, 0, 0);
    pop();

    noStroke();
    fill(frameCount % 360, 70, 100);
    circle(x, y, size);
  });

  // 4. show it, then swap, so this frame becomes next frame's 'before'
  imageMode(CENTER);
  image(after, 0, 0);
  let swap = before;
  before = after;
  after = swap;

  if (!window.sensorsEnabled) {
    label.html('tap to turn on motion');
  } else if (!motionArrived) {
    label.html('no motion here. hold a finger down to steer');
  } else {
    label.html('tilt to draw. hold still for a tunnel');
  }
}

// In WEBGL, text() only works after loadFont(). Words that only label the
// screen are simpler as one line of HTML on top of the canvas.
function makeLabel() {
  let div = createDiv('');
  div.position(16, 12);
  div.style('color', '#ffffff');
  div.style('font', '15px sans-serif');
  div.style('pointer-events', 'none');
  return div;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  before.resize(width, height);
  after.resize(width, height);
}
