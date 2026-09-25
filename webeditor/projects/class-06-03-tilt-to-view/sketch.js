// 03 · Tilt to View
// A small world made once, then looked at through the phone.
// Tilt the phone and the camera circles the world, as if the screen were a window.
// Motion in, a 3D view out. The first sketch here in WEBGL.
//
// Two things are new. createCanvas(..., WEBGL) turns on 3D, and (0, 0) moves to the
// middle of the screen. buildGeometry() draws hundreds of boxes once, in setup,
// and keeps them as one shape, so draw() only has to show it.

// the feel of the piece. change these before you change anything else.
let count = 300;       // how many boxes in the world
let turn = 2;          // how far the camera goes round for each degree of tilt
let smoothing = 0.1;   // 1 is raw and jumpy, 0.05 is slow and calm

let world;             // the shape made by buildGeometry()
let label;             // an HTML line for the words. see the note at the bottom
let yaw = 0;           // camera: round the side, in degrees
let pitch = -20;       // camera: up and down, in degrees
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
  pixelDensity(1); // 3D on a phone screen at full sharpness gets hot. 1 is enough
  lockGestures();

  // on a laptop, show a QR code of this page so you can open it on your phone
  if (location.protocol === 'https:' && window.self === window.top) {
    showDesktopQr();
  }

  enableGyroTap('Tap to turn on motion');
  angleMode(DEGREES);
  label = makeLabel();

  // build the world once. random() runs here only, so the world stays the same.
  world = buildGeometry(function () {
    noStroke();
    for (let i = 0; i < count; i++) {
      let angle = random(360);
      let r = random(40, 260);
      let h = random(10, 120) * (1 - r / 320);
      push();
      translate(cos(angle) * r, -h / 2, sin(angle) * r);
      fill(map(r, 40, 260, 255, 60), 120, map(r, 40, 260, 80, 255));
      box(random(8, 20), h, random(8, 20));
      pop();
    }
  });
}

function draw() {
  background(20);

  // 1. read the tilt. the fallback: drag a finger across and up and down.
  let targetYaw = yaw;
  let targetPitch = pitch;
  if (window.sensorsEnabled && motionArrived) {
    if (restX === null) {
      restX = rotationX;
    }
    targetYaw = constrain(rotationY, -60, 60) * turn;
    targetPitch = constrain(-20 - (rotationX - restX), -80, -5);
  }
  if (mouseIsPressed) {
    targetYaw = map(mouseX, 0, width, -120, 120);
    targetPitch = map(mouseY, 0, height, -5, -80);
  }
  // 2. smooth it
  yaw = lerp(yaw, targetYaw, smoothing);
  pitch = lerp(pitch, targetPitch, smoothing);

  // 3. place the camera on a sphere round the middle, looking at the middle
  let d = 700;
  let cx = d * cos(pitch) * sin(yaw);
  let cy = d * sin(pitch);
  let cz = d * cos(pitch) * cos(yaw);
  camera(cx, cy, cz, 0, -30, 0, 0, 1, 0);

  // 4. light it and show it
  ambientLight(120);
  directionalLight(255, 255, 255, 0.5, 1, -0.3);
  model(world);

  // the ground
  push();
  rotateX(90);
  fill(40);
  noStroke();
  circle(0, 0, 620);
  pop();

  if (!window.sensorsEnabled) {
    label.html('tap to turn on motion');
  } else if (!motionArrived) {
    label.html('no motion here. drag a finger to look around');
  } else {
    label.html('tilt left and right to go round, forward and back to look down');
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
}
