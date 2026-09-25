// 03 · Tilt to View
// The screen is the front of a deep box. The walls run back behind the glass,
// and a grid of blocks stands on the back wall.
// Tilt the phone and you look into the box from the side, like peering into a shadowbox.
// Move it and the blocks ripple. Hold still and they settle.
// Motion in, a 3D view out. The first sketch here in WEBGL.
//
// Three things are new. createCanvas(..., WEBGL) turns on 3D, and (0, 0) moves to the
// middle of the screen. buildGeometry() draws the walls once, in setup, and keeps them.
// frustum() pins the front of the box to the edges of the screen, however you look in.

// the feel of the piece. change these before you change anything else.
let depth = 1.5;       // how deep the box is, as a share of the screen height
let look = 0.6;        // how far a full tilt moves your eye, as a share of the screen
let smoothing = 0.15;  // 1 is raw and jumpy, 0.05 is slow and calm
let columns = 9;       // blocks across the back wall
let splash = 8;        // how much a movement pushes the blocks
let spread = 0.2;      // how fast a ripple travels to the next block
let settle = 0.95;     // 1 ripples forever, 0.85 settles quickly

let room;              // the walls, made by buildGeometry()
let label;             // an HTML line for the words. see the note at the bottom
let eyeX = 0;          // where your eye is, sideways from the middle of the screen
let eyeY = 0;
let restX = null;      // the forward tilt that counts as level. set by the first reading

let rows;              // blocks down the back wall, worked out from the screen shape
let cell;              // the size of one grid cell
let lift = [];         // how far each block sticks out beyond its resting length
let speed = [];        // how fast each block is moving

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
  angleMode(DEGREES); // rotation values in degrees
  label = makeLabel();
  makeRoom();
}

function draw() {
  background(10);

  // 1. read the tilt. the fallback: drag a finger to move your eye.
  let targetX = eyeX;
  let targetY = eyeY;
  if (window.sensorsEnabled && motionArrived) {
    if (restX === null) {
      restX = rotationX;
    }
    targetX = constrain(rotationY / 40, -1, 1) * width * look;
    targetY = constrain((rotationX - restX) / 40, -1, 1) * height * look;
  }
  if (mouseIsPressed) {
    targetX = map(mouseX, 0, width, -1, 1) * width * look;
    targetY = map(mouseY, 0, height, -1, 1) * height * look;
  }

  // 2. smooth it, and measure how far the eye moved this frame
  let oldX = eyeX;
  let oldY = eyeY;
  eyeX = lerp(eyeX, targetX, smoothing);
  eyeY = lerp(eyeY, targetY, smoothing);
  let moved = dist(oldX, oldY, eyeX, eyeY);

  // 3. the movement splashes the block nearest to where you are looking from
  let c = constrain(floor(map(eyeX, -width * look, width * look, 0, columns)), 0, columns - 1);
  let r = constrain(floor(map(eyeY, -height * look, height * look, 0, rows)), 0, rows - 1);
  speed[r][c] += min(moved * splash, 400);
  ripple();

  // 4. put the eye in front of the screen, looking straight in.
  // frustum() keeps the screen's four edges fixed, so the front of the box never moves.
  let eyeZ = height * 1.2;
  let near = eyeZ * 0.05;
  let s = near / eyeZ;
  camera(eyeX, eyeY, eyeZ, eyeX, eyeY, 0, 0, 1, 0);
  frustum((-width / 2 - eyeX) * s, (width / 2 - eyeX) * s,
          (-height / 2 + eyeY) * s, (height / 2 + eyeY) * s,
          near, eyeZ + height * depth * 2);

  // 5. light it: a little everywhere, and one light at the opening, like a window
  ambientLight(50);
  pointLight(255, 245, 230, 0, -height * 0.4, height * 0.3);
  directionalLight(90, 90, 110, 1, 0.5, -0.4); // a cool side light, so each block shows its sides
  noStroke();
  model(room);
  drawBlocks();

  if (!window.sensorsEnabled) {
    label.html('tap to turn on motion');
  } else if (!motionArrived) {
    label.html('no motion here. drag a finger to look in');
  } else {
    label.html('tilt to look into the corners. move to make it ripple');
  }
}

// the walls, floor and ceiling of the box, from the screen's edges back to the back wall.
// built once, because they never change.
function makeRoom() {
  let w = width / 2;
  let h = height / 2;
  let back = -height * depth;
  room = buildGeometry(function () {
    fill(70, 70, 80);
    quad3(-w, -h, 0, -w, h, 0, -w, h, back, -w, -h, back); // left wall
    quad3(w, -h, 0, w, -h, back, w, h, back, w, h, 0);     // right wall
    fill(90, 85, 80);
    quad3(-w, h, 0, w, h, 0, w, h, back, -w, h, back);     // floor
    fill(55, 55, 65);
    quad3(-w, -h, 0, -w, -h, back, w, -h, back, w, -h, 0); // ceiling
    fill(30, 30, 38);
    quad3(-w, -h, back, -w, h, back, w, h, back, w, -h, back); // back wall
  });

  // the grid of blocks: square cells, as many rows as fit
  cell = width / columns;
  rows = max(1, floor(height / cell));
  for (let r = 0; r < rows; r++) {
    lift[r] = [];
    speed[r] = [];
    for (let c = 0; c < columns; c++) {
      lift[r][c] = 0;
      speed[r][c] = 0;
    }
  }
}

// one flat face with four corners
function quad3(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4) {
  beginShape();
  vertex(x1, y1, z1);
  vertex(x2, y2, z2);
  vertex(x3, y3, z3);
  vertex(x4, y4, z4);
  endShape(CLOSE);
}

// each block is pulled toward the average of its neighbours, and slowly loses speed.
// that is enough for a push on one block to travel outward as a ripple, then die away.
function ripple() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      let around = 0;
      let n = 0;
      if (r > 0) { around += lift[r - 1][c]; n++; }
      if (r < rows - 1) { around += lift[r + 1][c]; n++; }
      if (c > 0) { around += lift[r][c - 1]; n++; }
      if (c < columns - 1) { around += lift[r][c + 1]; n++; }
      speed[r][c] += (around / n - lift[r][c]) * spread; // follow the neighbours
      speed[r][c] -= lift[r][c] * 0.02;                  // drift back to rest
      speed[r][c] *= settle;                             // lose a little speed
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      lift[r][c] = constrain(lift[r][c] + speed[r][c], -cell, height * depth * 0.8);
    }
  }
}

// the blocks stand out from the back wall toward you
function drawBlocks() {
  let back = -height * depth;
  let rest = cell * 1.2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      let len = max(4, rest + lift[r][c]);
      let x = -width / 2 + (c + 0.5) * cell;
      let y = -height / 2 + (r + 0.5) * cell + (height - rows * cell) / 2;
      let warm = constrain(lift[r][c] / (cell * 3), 0, 1);
      fill(lerp(200, 255, warm), lerp(200, 120, warm), lerp(210, 70, warm));
      push();
      translate(x, y, back + len / 2);
      box(cell * 0.82, cell * 0.82, len);
      pop();
    }
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
  makeRoom();
}
