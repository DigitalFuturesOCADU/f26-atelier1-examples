// 04 Show of Hands, Networked: Projector
// Share. The same vote as Class 10's Show of Hands. Tilt your phone left for A or right for B.
// The vote stays when you tilt back. This page adds up the votes and shows the tally.
//
// What is different: in Class 10 a camera watched the phones and knew where each vote was
// in the room. Here the votes come over the network. This page knows how many votes there
// are for A and for B. It does not know where anyone is. The camera knows where you are.
// The network only knows what you sent.
//
// The rule: Share keeps only the last thing written, so each phone keeps its own vote in me,
// this page adds them up, and nothing goes in shared at all.
//
// Run this on the laptop that is on the projector, and open only one projector page for a room.
// Phones join with the code on the right.
//
// Try this:
//   Ask the room a question with two answers. Tilt left for A, right for B.
//   Change your vote by tilting the other way.
//   Key R clears every vote, so you can ask again.
//   Run Class 10's camera version, then this one. What can you tell about the room each time?
//
// Key data:
//   guests[i].vote   'A', 'B', or '' if that phone has not voted
//   shareEmit('reset')   tells every phone to clear its vote

const ROOM = 'show-of-hands';

let tally = { A: 0, B: 0, none: 0, phones: 0 };
let shown = { A: 0, B: 0 };   // the bars, which ease toward the tally
let colors = { A: '#ffc800', B: '#3ddcff' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  projectorSetup(ROOM, '04 Show of Hands, Networked', {});
  layoutProjector();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutProjector();
  showJoinCode();
}

function draw() {
  background(20);
  countTheVotes();
  drawTitle('Tilt left for A. Tilt right for B. Your vote stays until you tilt the other way.');
  drawVotes();
  drawNotKnown();
  drawJoinColumn('VOTED', (tally.A + tally.B) + ' of ' + tally.phones, 64);
}

// 1. read every phone. 2. count A, B and no vote yet.
function countTheVotes() {
  const phones = phoneList();
  tally = { A: 0, B: 0, none: 0, phones: phones.length };
  for (let i = 0; i < phones.length; i++) {
    const v = phones[i].vote;
    if (v === 'A') {
      tally.A += 1;
    } else if (v === 'B') {
      tally.B += 1;
    } else {
      tally.none += 1;
    }
  }
}

function keyPressed() {
  if ((key === 'r' || key === 'R') && shareConnected) {
    shareEmit('reset');
  }
}

// ---- drawing ----

function drawVotes() {
  const gap = 48 * u;
  const w = (arena.w - gap) / 2;
  const barTop = arena.y + 330 * u;
  const barBottom = arena.y + arena.h - 190 * u;
  const sides = ['A', 'B'];
  for (let s = 0; s < 2; s++) {
    const side = sides[s];
    const x = arena.x + s * (w + gap);
    shown[side] = lerp(shown[side], tally.phones > 0 ? tally[side] / tally.phones : 0, 0.18);

    noStroke();
    fill(colors[side]);
    textAlign(LEFT, BASELINE);
    textStyle(BOLD);
    textSize(200 * u);
    text(side, x, arena.y + 280 * u);
    textSize(300 * u);
    text(tally[side], x + 160 * u, arena.y + 280 * u);
    textStyle(NORMAL);

    // the bar is the share of all the phones in the room
    fill(34);
    rect(x, barTop, w, barBottom - barTop);
    fill(colors[side]);
    const h = shown[side] * (barBottom - barTop);
    rect(x, barBottom - h, w, h);
    fill(GREY);
    textSize(28 * u);
    const pct = tally.phones > 0 ? round(100 * tally[side] / tally.phones) : 0;
    text(pct + ' percent of the phones', x, barBottom + 40 * u);
  }

  fill(GREY);
  textSize(30 * u);
  textAlign(RIGHT, BASELINE);
  text(tally.none + (tally.none === 1 ? ' phone has not voted' : ' phones have not voted'), arena.x + arena.w, arena.y + 36 * u);
  textAlign(LEFT, BASELINE);

  if (tally.phones === 0 && !serverProblem) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(54 * u);
    text('Waiting for phones. Scan the code to join.', arena.x + arena.w / 2, arena.y + arena.h * 0.55);
    textAlign(LEFT, BASELINE);
  }
}

// say plainly what this page cannot see
function drawNotKnown() {
  const h = 120 * u;
  const y = arena.y + arena.h - h;
  noFill();
  stroke(90);
  strokeWeight(3 * u);
  rect(arena.x, y, arena.w, h);
  noStroke();
  fill(255);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(38 * u);
  text('This screen does not know where anyone is.', arena.x + 28 * u, y + 40 * u);
  textStyle(NORMAL);
  fill(GREY);
  textSize(28 * u);
  text('It only knows what each phone sent. In Class 10 the camera could see where each phone was.', arena.x + 28 * u, y + 88 * u);
  textAlign(LEFT, BASELINE);
}
