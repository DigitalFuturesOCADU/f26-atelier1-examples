// ==============================================
// loading.js — loading spinner and error panel drawn on the p5 canvas
// ==============================================
// Adapted from p5-phone's examples/ml5/ml5-loading.js, generalized for any
// model download (ml5, MediaPipe, YOLO, Transformers.js).
//
//   setLoading('Loading model')   show the spinner with a message
//   setLoading('Downloading', 0.4) show it with a progress bar (0..1)
//   clearLoading()                hide it
//   setError('Not supported')     show a sticky message panel instead
//   drawStatus()                  call LAST in draw() so it sits on top
//
// For the p5.js Web Editor, upload this file next to sketch.js and change
// the <script src> in index.html to "loading.js".
// ==============================================

let cvLoadingMessage = null;
let cvLoadingProgress = null;
let cvErrorMessage = null;

function setLoading(message, progress) {
  cvLoadingMessage = message || 'Loading';
  cvLoadingProgress = (typeof progress === 'number') ? constrain(progress, 0, 1) : null;
}

function clearLoading() {
  cvLoadingMessage = null;
  cvLoadingProgress = null;
}

function isLoading() {
  return cvLoadingMessage !== null;
}

function setError(message) {
  cvErrorMessage = message;
  clearLoading();
  console.error(message);
}

function drawStatus() {
  if (cvErrorMessage) {
    drawErrorPanel(cvErrorMessage);
  } else if (cvLoadingMessage) {
    drawLoadingSpinner(cvLoadingMessage, cvLoadingProgress);
  }
}

function drawLoadingSpinner(label, progress) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 34;
  const activeDot = frameCount % 12;

  push();
  resetMatrix();
  noStroke();
  fill(0, 180);
  rect(0, 0, width, height);

  for (let index = 0; index < 12; index += 1) {
    const angle = TWO_PI * index / 12;
    const alpha = map((index + 12 - activeDot) % 12, 0, 11, 255, 55);
    fill(255, alpha);
    circle(centerX + cos(angle) * radius, centerY + sin(angle) * radius, 9);
  }

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  text(label, centerX, centerY + 70);

  if (progress !== null && progress !== undefined) {
    const barWidth = min(240, width - 60);
    fill(255, 60);
    rect(centerX - barWidth / 2, centerY + 92, barWidth, 6, 3);
    fill(255);
    rect(centerX - barWidth / 2, centerY + 92, barWidth * progress, 6, 3);
  }
  pop();
}

function drawErrorPanel(message) {
  const panelWidth = min(width - 32, 460);

  push();
  resetMatrix();
  noStroke();
  fill(0, 200);
  rect(0, 0, width, height);

  textSize(16);
  textAlign(CENTER, CENTER);
  textWrap(WORD);
  fill(30, 34, 44);
  rect((width - panelWidth) / 2, height / 2 - 90, panelWidth, 180, 10);
  fill(255);
  text(message, (width - panelWidth) / 2 + 20, height / 2 - 80, panelWidth - 40, 160);
  pop();
}
