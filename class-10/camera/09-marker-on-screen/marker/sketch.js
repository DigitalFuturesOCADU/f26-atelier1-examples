// 09 Marker on a Screen: the marker
// Shows one marker as big as the screen allows, black on white. The number comes from
// the address: marker/?id=7 shows marker 7. It is drawn exactly like the printed sheets,
// so 08 ArUco Markers reads the paper 7 and the screen 7 as the same number.
//
// Try this
//   Tap the screen. It goes full screen (where the phone allows it) and stays on.
//   Turn the brightness all the way up. A web page cannot do that for you.
//   Hold it up to 08 next to the paper marker with the same number. Compare them far away,
//   with glare on the glass, tilted, dimmer, and in the dark.
//
// Key data
//   id          the marker number, 0 to 249, from ?id= in the address
//   dictionary  ARUCO_MIP_36h12 from js-aruco2. dictionary.codeList[id] is a string of 36
//               characters, one per cell of the 6 by 6 inside. '1' is a white cell, '0' a black one
//
// The marker is 10 cells wide: a white border, a black frame, the 6 by 6 code, a black frame
// and a white border. The black square is the middle 8 cells. Every cell is a whole number
// of screen pixels, so the edges stay sharp.

const CELLS = 10;       // white border + black frame + 6 code cells + black frame + white border
const TOP_ROOM = 56;    // room at the top for the Numbers link
const WORDS_ROOM = 96;  // room for the number and the brightness line

let dictionary;
let id = null;      // null when the address has no good number
let tapped = false; // has the screen been tapped yet?
let wakeLock = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  noSmooth(); // sharp edges, no blur between cells
  textFont('system-ui');

  dictionary = new AR.Dictionary('ARUCO_MIP_36h12');
  id = readId();
  if (id !== null) document.title = 'Marker ' + id + ' · 09 Marker on a Screen';

  // Full screen and the screen lock only work in a tap, so listen for the tap itself.
  // (A phone counts touchend as a tap. A laptop counts click.)
  document.addEventListener('touchend', onTap);
  document.addEventListener('click', onTap);
}

// The number from the address, or null if it is missing or out of range.
function readId() {
  const value = parseInt(new URLSearchParams(location.search).get('id'), 10);
  if (value >= 0 && value < dictionary.codeList.length) return value;
  return null;
}

function draw() {
  background(255);
  if (id === null) {
    drawWords('No marker number. Go back and pick one.', width / 2, height / 2 - 20, width - 32);
    return;
  }

  const density = pixelDensity();
  const portrait = height >= width;

  // The room for the marker. The words go under it on a tall screen, beside it on a wide one.
  const roomWidth = portrait ? width : width - WORDS_ROOM * 2;
  const roomHeight = portrait ? height - TOP_ROOM - WORDS_ROOM : height - TOP_ROOM;

  // one cell is a whole number of screen pixels, so no edge falls between two pixels
  const cell = Math.floor(min(roomWidth, roomHeight) * density / CELLS) / density;
  const span = cell * CELLS;
  const x = snap((roomWidth - span) / 2, density);
  const y = snap(TOP_ROOM + (roomHeight - span) / 2, density);
  drawMarker(id, x, y, cell);

  // the number and the brightness line, outside the white border
  let wordsX = width / 2;
  let wordsY = y + span + 10;
  let wordsWidth = width - 32;
  if (!portrait) {
    wordsX = roomWidth + WORDS_ROOM;
    wordsY = height / 2 - 40;
    wordsWidth = WORDS_ROOM * 2 - 16;
  }
  drawWords(String(id), wordsX, wordsY, wordsWidth, 22, BOLD);
  drawWords('Turn the brightness all the way up.', wordsX, wordsY + 30, wordsWidth);
  if (!tapped) drawWords('Tap for full screen. The screen stays on.', wordsX, wordsY + 52, wordsWidth);
}

// A marker drawn from the code list: a black square, then a white cell wherever the code has a '1'.
// (x, y) is the top left of the white border. cell is the size of one cell.
function drawMarker(id, x, y, cell) {
  const pattern = dictionary.codeList[id];
  const bits = dictionary.markSize - 2; // 6 cells across the code
  noStroke();
  fill(0);
  rect(x + cell, y + cell, (bits + 2) * cell, (bits + 2) * cell);
  fill(255);
  for (let row = 0; row < bits; row++) {
    for (let col = 0; col < bits; col++) {
      if (pattern[row * bits + col] === '1') {
        rect(x + (col + 2) * cell, y + (row + 2) * cell, cell, cell);
      }
    }
  }
}

function drawWords(words, x, y, boxWidth, size = 15, style = NORMAL) {
  noStroke();
  fill(style === BOLD ? 0 : 90);
  textStyle(style);
  textSize(size);
  textAlign(CENTER, TOP);
  text(words, x - boxWidth / 2, y, boxWidth);
}

// round to a whole screen pixel
function snap(value, density) {
  return Math.round(value * density) / density;
}

// ---------- the tap: full screen and the screen lock ----------

function onTap(event) {
  if (event.target.id === 'back') return; // the Numbers link just goes back
  tapped = true;
  keepAwake();
  goFullscreen();
}

// the browser gives the lock back whenever the page is hidden, so ask again when it returns
document.addEventListener('visibilitychange', function () {
  if (tapped && document.visibilityState === 'visible') keepAwake();
});

async function keepAwake() {
  if (!('wakeLock' in navigator) || (wakeLock && !wakeLock.released)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (error) {
    console.warn('The screen lock was refused: ' + error.message); // low battery or power saving
  }
}

function goFullscreen() {
  // iPhone Safari cannot do this for a page. That is fine, the marker still fills the screen
  const page = document.documentElement;
  if (page.requestFullscreen && !document.fullscreenElement) {
    page.requestFullscreen().catch(function () {});
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
