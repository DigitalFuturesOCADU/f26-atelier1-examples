// 04 · Move to Spin
// Acceleration adds spin. Friction takes it away.
// Swing the phone and the suit spins. Hold still and it slows to a stop.

let suit;
let angle = 0;     // how far the suit is turned, in degrees
let spinSpeed = 0; // degrees added to the angle every frame

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
  angleMode(DEGREES);
  imageMode(CENTER);

  suit = await loadImage('spaceSuit2.png');
}

function draw() {
  background(20);
  fill(255);
  textSize(16);

  if (window.sensorsEnabled) {
    // 1. how hard is the phone moving? add up all three directions
    let movement = abs(accelerationX) + abs(accelerationY) + abs(accelerationZ);

    // a still phone still reports tiny numbers. ignore them.
    if (movement < 1) {
      movement = 0;
    }

    // 2. movement adds speed
    spinSpeed = spinSpeed + movement * 0.1;

    // 3. friction takes a little speed away every frame
    spinSpeed = spinSpeed * 0.95;

    // 4. keep it from spinning out of control
    spinSpeed = constrain(spinSpeed, 0, 40);

    // 5. speed changes the angle
    angle = angle + spinSpeed;

    // turn the canvas around the centre, draw the suit, then turn it back
    let h = height * 0.6;
    let w = h * suit.width / suit.height;
    push();
    translate(width / 2, height / 2);
    rotate(angle);
    image(suit, 0, 0, w, h);
    pop();

    text('movement: ' + movement.toFixed(1) + '   spinSpeed: ' + spinSpeed.toFixed(1), 20, 30);
  } else {
    text('Tap to enable motion sensors', 20, 30);
  }
}
