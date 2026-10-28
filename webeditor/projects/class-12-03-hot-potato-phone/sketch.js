// 03 Hot Potato: Phone
// Share. One potato in the whole room. When it is on your phone, shake to throw it. The big
// screen picks who catches it. If the clock runs out while you hold it, you are burned.
//
// The rule: Share keeps only the last thing written, so only the projector writes shared, and
// this phone only sends an event when it throws.
//
// The clock: the projector tells the holder how many milliseconds are left. This phone counts
// down from there on its own clock. No two phone clocks are ever compared.
//
// Try this:
//   Hold the potato for as long as you dare. The screen goes redder as time runs out.
//   On a laptop, press the space bar or click to throw.
//   Close the page of the phone that holds it. The projector gives it to someone else.
//
// Key data:
//   shared.round        { state, holder, msLeft, turn, burnedId, burnedName }
//   shareClientId       this phone's id. it has the potato when shared.round.holder is the same
//   shareEmit('throw', { id: shareClientId })   tells the projector this phone threw
//   deviceShaken()      p5 calls this when the phone is shaken

const ROOM = 'hot-potato';

// the feel of the piece
let cooldown = 800;      // milliseconds after a throw before another counts
let shakeStrength = 25;  // how hard a shake must be. p5's own default is 30

let joined = false;
let serverOk = false;
let seen = '';           // the last round this phone has looked at
let deadline = 0;        // when time runs out, on this phone's clock
let threwAt = -9999;
let gotItAt = -9999;
let burnedAt = -9999;
let k = 1;               // one design unit for this screen

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  angleMode(DEGREES);
  setShakeThreshold(shakeStrength);

  serverOk = phoneSetup(ROOM);
  if (serverOk) {
    // one tap asks for motion and vibration. userSetupComplete() runs after it
    enablePermissionsTap(['gyro', 'vibration'], 'Tap to join the game');
  }
}

function userSetupComplete() {
  joined = true;
  keepAwake();        // a phone that locks leaves the room
  shareConnect();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function shareReady() {
  checkMyName();
}

// the round as the projector wrote it, or nothing yet
function currentRound() {
  const r = shared.round;
  if (!joined || !shareConnected || !r) {
    return null;
  }
  return r;
}

function iHold(r) {
  return r && r.state === 'play' && r.holder === shareClientId;
}

// p5 calls this when the phone is shaken
function deviceShaken() {
  throwIt();
}

// a laptop has no shake. the space bar and a click do the same
function keyPressed() {
  if (key === ' ') {
    throwIt();
  }
}
function mousePressed() {
  if (joined && !hasRealTilt) {
    throwIt();
  }
  return false;
}

function throwIt() {
  const r = currentRound();
  if (!iHold(r) || millis() - threwAt < cooldown) {
    return;
  }
  threwAt = millis();
  shareEmit('throw', { id: shareClientId });
}

function draw() {
  k = min(width / 390, height / 700);
  const r = currentRound();
  watchTheRound(r);

  if (!serverOk) {
    background(20);
    noStroke();
    fill(255);
    textStyle(BOLD);
    textSize(26 * k);
    centreLines(serverProblem, height * 0.2, width * 0.85, 34 * k);
    textStyle(NORMAL);
    return;
  }

  if (!r) {
    background(20);
    drawWords([['03 Hot Potato', 1]]);
  } else if (r.state === 'waiting') {
    background(20);
    const n = 1 + otherPhones().length;
    const here = n === 1 ? 'You are the only phone here.' : 'You are one of ' + n + '.';
    drawWords([['Waiting for more phones', 1], ['Two phones make a game.\n' + here, 0]]);
  } else if (r.state === 'burned') {
    drawBurned(r);
  } else if (iHold(r)) {
    drawHolding();
  } else {
    drawWatching(r);
  }
  drawFooter();
}

// 1. notice a new round or a new holder. 2. start the clock again. 3. buzz.
function watchTheRound(r) {
  if (!r) {
    return;
  }
  const key = r.state + '|' + r.holder + '|' + r.turn;
  if (key === seen) {
    return;
  }
  seen = key;
  if (r.state === 'play') {
    deadline = millis() + r.msLeft;
  }
  if (iHold(r)) {
    gotItAt = millis();
    vibrate(150);                 // Android only
  }
  if (r.state === 'burned' && r.burnedId === shareClientId) {
    burnedAt = millis();
    vibrate([300, 100, 500]);
  }
}

// the potato is yours. the screen goes redder as time runs out
function drawHolding() {
  const left = max(0, (deadline - millis()) / 1000);
  const total = max(1, shared.round.msLeft / 1000);
  const heat = 1 - constrain(left / max(total, 4), 0, 1);
  background(lerpColor(color('#8a3a00'), color('#d11a1a'), heat));

  const wobble = left < 2 ? sin(millis() / 35) * 5 * k : 0;
  const pop = map(millis() - gotItAt, 0, 300, 1.4, 1, true);
  drawPotato(width / 2 + wobble, height * 0.34, min(width, height * 0.5) * 0.62 * pop, heat);

  noStroke();
  fill(255);
  textStyle(BOLD);
  textSize(110 * k);
  centreLines(left.toFixed(1), height * 0.68, width, 100 * k);
  textSize(36 * k);
  const how = hasRealTilt ? 'Shake to throw!' : 'Press space to throw!';
  centreLines(millis() - threwAt < 700 ? 'Thrown!' : how, height * 0.78, width * 0.9, 44 * k);
  textStyle(NORMAL);
}

// someone else has it
function drawWatching(r) {
  background(20);
  const who = nameOfHolder(r.holder);
  fill(255);
  noStroke();
  textStyle(BOLD);
  fitNameText(who, 90 * k, width * 0.9);
  centreLines(who, height * 0.36, width, 10);
  textStyle(NORMAL);
  fill('#cfcfcf');
  textSize(30 * k);
  centreLines('has the potato', height * 0.44, width * 0.9, 40 * k);
  fill('#9a9a9a');
  textSize(22 * k);
  let line = 'Keep your phone ready.\nIt could come to you next.';
  if (millis() - threwAt < 1500 && millis() - threwAt > 0) {
    line = 'You threw it!';
  }
  centreLines(line, height * 0.6, width * 0.85, 30 * k);
}

function drawBurned(r) {
  const me_ = r.burnedId === shareClientId;
  background(me_ ? color('#b3261e') : color(20));
  noStroke();
  fill(255);
  textStyle(BOLD);
  if (me_) {
    textSize(60 * k);
    centreLines('You got burned', height * 0.34, width * 0.9, 70 * k);
    textStyle(NORMAL);
    textSize(26 * k);
    centreLines('A new round starts soon.', height * 0.56, width * 0.9, 34 * k);
  } else {
    fitNameText(r.burnedName, 70 * k, width * 0.9);
    centreLines(r.burnedName, height * 0.34, width, 10);
    textStyle(NORMAL);
    fill('#cfcfcf');
    textSize(30 * k);
    centreLines('got burned', height * 0.43, width * 0.9, 40 * k);
  }
  textStyle(NORMAL);
}

// the name of whoever holds the potato. it may be this phone's own name
function nameOfHolder(id) {
  for (let i = 0; i < guests.length; i++) {
    if (guests[i].id === id) {
      return guests[i].name || 'Someone';
    }
  }
  return 'Someone';
}

function fitNameText(str, biggest, w) {
  let size = biggest;
  textSize(size);
  while (textWidth(str) > w && size > 18) {
    size -= 4;
    textSize(size);
  }
}

// a title and a smaller line under it, for the waiting screens
function drawWords(rows) {
  noStroke();
  fill(255);
  textStyle(BOLD);
  textSize(34 * k);
  let y = height * 0.2;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][1] === 0) {
      textStyle(NORMAL);
      fill('#9a9a9a');
      textSize(24 * k);
    }
    if (rows[i][0]) {
      const n = centreLines(rows[i][0], y, width * 0.86, 40 * k);
      y += n * 40 * k + 20 * k;
    }
  }
  textStyle(NORMAL);
}

function drawFooter() {
  noStroke();
  fill(255, 255, 255, 140);
  textSize(17 * k);
  centreLines('You are ' + myName, height - 68 * k, width * 0.9, 24 * k);
  centreLines(footerLine(), height - 40 * k, width * 0.9, 24 * k);
}

// a potato: a lumpy oval with a few dark eyes. heat is 0 for cool, 1 for about to burn
function drawPotato(x, y, size, heat) {
  push();
  translate(x, y);
  rotate(-23);
  noStroke();
  fill(lerpColor(color('#c99a5b'), color('#ffb199'), heat * 0.6));
  ellipse(0, 0, size * 1.25, size * 0.9);
  ellipse(-size * 0.2, size * 0.05, size * 0.8, size * 0.85);
  fill(0, 0, 0, 70);
  ellipse(-size * 0.2, -size * 0.08, size * 0.12, size * 0.08);
  ellipse(size * 0.15, size * 0.12, size * 0.1, size * 0.07);
  ellipse(size * 0.3, -size * 0.1, size * 0.09, size * 0.06);
  pop();
}
