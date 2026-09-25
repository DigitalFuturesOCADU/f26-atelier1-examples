// 01 · Tilt to Trail
// The phone is a brush. Tilt it and the mark rolls across the screen.
// The screen is never wiped clean. Each frame lays a thin veil over the last one,
// so the drawing remembers where the phone has been, and slowly forgets.
// Motion in, a drawing out. Class 2's tilt, and Class 5's draw loop as a clock.

// the feel of the piece. change these before you change anything else.
let fade = 12;         // how fast the trail forgets. 0 never forgets, 255 forgets at once
let speed = 0.4;       // how far a full tilt pushes the brush each frame
let friction = 0.96;   // 1 rolls forever, 0.8 stops quickly
let thinnest = 2;      // line weight when the brush is slow
let thickest = 28;     // line weight when it is fast

let x, y;              // where the brush is
let px, py;            // where it was last frame
let vx = 0;            // how fast it is moving
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
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableGyroTap('Tap to turn on motion');
  angleMode(DEGREES);
  colorMode(HSB, 360, 100, 100, 255);
  background(0, 0, 8);

  x = width / 2;
  y = height / 2;
  px = x;
  py = y;
}

function draw() {
  // 1. the veil: a see-through rectangle instead of background()
  noStroke();
  fill(0, 0, 8, fade);
  rect(0, 0, width, height);

  // 2. read the tilt as a push. the fallback: a finger pulls the brush toward it.
  let pushX = 0;
  let pushY = 0;
  if (window.sensorsEnabled && motionArrived) {
    // however you are holding the phone when motion turns on counts as level
    if (restX === null) {
      restX = rotationX;
    }
    pushX = constrain(rotationY, -45, 45) / 45;
    pushY = constrain(rotationX - restX, -45, 45) / 45;
  }
  if (mouseIsPressed) {
    pushX = constrain((mouseX - x) / 200, -1, 1);
    pushY = constrain((mouseY - y) / 200, -1, 1);
  }

  // 3. the push changes the speed, friction takes some away, the speed moves the brush
  vx = (vx + pushX * speed) * friction;
  vy = (vy + pushY * speed) * friction;
  px = x;
  py = y;
  x = constrain(x + vx, 0, width);
  y = constrain(y + vy, 0, height);

  // 4. the mark: faster is thicker, and the colour turns with the direction of travel
  let fast = dist(px, py, x, y);
  stroke(atan2(vy, vx) + 180, 70, 100);
  strokeWeight(map(fast, 0, 15, thinnest, thickest, true));
  line(px, py, x, y);

  // the label sits on a dark band so the trail never hides it
  noStroke();
  fill(0, 0, 8);
  rect(0, 0, width, 40);
  fill(0, 0, 100);
  textSize(15);
  if (!window.sensorsEnabled) {
    text('tap to turn on motion', 16, 26);
  } else if (!motionArrived) {
    text('no motion here. hold a finger down to steer', 16, 26);
  } else {
    text('tilt to draw. hold still and it fades', 16, 26);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(0, 0, 8);
}
