// 4 Send Text
// Share Basics. A value in me can be text as well as a number. Each phone sends what you
// type in the box. Every phone shows what everyone is typing, in their colour, as they type.
//
// Your room: change ROOM to the room you were given. Phones with the same ROOM meet.
//
// Key data: me.text (yours), guests[i].text (theirs)

const SHARE_HOST = 'https://p5-phone-share.npuckett.workers.dev';   // the class server
const ROOM = 'class';    // your room
const MY_NAME = '';      // your name

const ANIMALS = ['otter', 'heron', 'moth', 'fox', 'newt', 'crow', 'hare', 'wren', 'seal', 'lynx'];
let textBox;             // the text box (box is a p5 name, so not that)

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('system-ui');
  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: 'send-text',
    me: { name: MY_NAME || random(ANIMALS), hue: floor(random(360)), text: '' }
  });
  enablePermissionsTap(['share'], 'Tap to join');
  showDesktopQr();

  textBox = createInput('');
  textBox.attribute('placeholder', 'type here');
  textBox.attribute('maxlength', '40');
  textBox.style('font-size', '20px');   // 16 or more stops an iPhone zooming in
  textBox.style('padding', '10px');
  textBox.position(16, 16);
  textBox.size(width - 56);
  // every time the text changes, send it
  textBox.input(function () {
    me.text = textBox.value();
  });
}

function draw() {
  const k = min(width / 390, height / 700);
  background(20);
  noStroke();
  colorMode(HSB);

  // everyone who sends text: me first
  const everyone = [me].concat(guestsWith('text'));
  textAlign(LEFT, TOP);
  for (let i = 0; i < everyone.length; i++) {
    const person = everyone[i];
    const y = 100 * k + i * 70 * k;
    fill(0, 0, 60);
    textSize(14 * k);
    text(person.name + (person === me ? ' (you)' : ''), 20 * k, y);
    fill(person.hue, 60, 100);
    textSize(26 * k);
    text(person.text || '...', 20 * k, y + 20 * k, width - 40 * k);
  }

  textAlign(CENTER, CENTER);
  fill(0, 0, 60);
  textSize(16 * k);
  text(shareStatusText(), width / 2, height - 66 * k);
  text('you send ' + JSON.stringify(me), 10 * k, height - 50 * k, width - 20 * k, 44 * k);   // a box, so a long line wraps
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  textBox.size(width - 56);
}
