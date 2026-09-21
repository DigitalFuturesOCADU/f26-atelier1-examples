// 03 · Shake to Filter
// Each shake switches to the next filter.
// deviceShaken() is an event. p5.js calls it for you when a shake passes the threshold.

let suit;
let filterNames = ['none', 'GRAY', 'INVERT', 'THRESHOLD', 'POSTERIZE', 'BLUR'];
let filterNumber = 0; // which filter is on: 0 is none
let lastShake = 0;    // when the last shake counted, in milliseconds

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
  setShakeThreshold(30); // lower is easier to trigger
  imageMode(CENTER);

  suit = await loadImage('spaceSuit2.png');
}

function draw() {
  background(20);

  if (window.sensorsEnabled) {
    let h = height * 0.7;
    let w = h * suit.width / suit.height;
    image(suit, width / 2, height / 2, w, h);

    // a filter changes everything drawn so far, so it comes after the image
    if (filterNumber === 1) {
      filter(GRAY);
    } else if (filterNumber === 2) {
      filter(INVERT);
    } else if (filterNumber === 3) {
      filter(THRESHOLD, 0.4);
    } else if (filterNumber === 4) {
      filter(POSTERIZE, 3);
    } else if (filterNumber === 5) {
      filter(BLUR, 8);
    }

    // the label comes after the filter, so it stays readable
    fill(255);
    textSize(16);
    text('filter: ' + filterNames[filterNumber] + '   (shake for the next one)', 20, 30);
  } else {
    fill(255);
    textSize(16);
    text('Tap to enable motion sensors', 20, 30);
  }
}

function deviceShaken() {
  // one shake calls this many times in a row.
  // only count it if 0.7 seconds have passed since the last one.
  if (millis() - lastShake > 700) {
    filterNumber = filterNumber + 1;
    if (filterNumber >= filterNames.length) {
      filterNumber = 0;
    }
    lastShake = millis();
  }
}
