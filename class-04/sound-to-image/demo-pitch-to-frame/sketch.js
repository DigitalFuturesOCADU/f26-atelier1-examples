// Demo · Pitch to Frame
// The note you hum picks the frame. A low note is the first frame, a high note is the last.
// Slide your voice up like a siren and it scrubs through.
// The FFT in 04 can say roughly low or roughly high. This finds the actual note, in hertz.
//
// This is a look ahead, not one of the numbered examples. It works differently underneath:
// it opens the microphone with the browser's own tools, not p5.sound, and it loads a
// small pitch library called Pitchy from the web while the sketch is starting.

// The GIF is loaded from the class GIF library by its full web address.
// That is why this sketch has no file to upload.
// To use your own GIF, upload it to the sketch and put its file name here, like 'myGif.gif'.
let gifFile = 'https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-03/gif-library/gifs/jelloGif.gif';

// the feel of the piece. change these before you change anything else.
let lowNote = 100;       // hertz. the bottom of the range. a low hum
let highNote = 600;      // hertz. the top of the range. a high hum or a low whistle
let clarityNeeded = 0.9; // from 0 to 1. how clearly pitched the sound has to be to count
let smoothing = 0.25;    // 1 is raw and jumpy. 0.05 is slow and calm

let gif;
let detector;  // the pitch finder, from Pitchy
let analyser;  // hands the sketch the raw sound wave
let samples;   // the raw sound wave, as a list of numbers
let audio;     // the browser's sound system
let pitch = 0;
let clarity = 0;
let position = 0; // from 0 to 1. where the note sits between lowNote and highNote
let fingerDown = false;
let micOpen = false;
let problem = '';

// p5-phone starts anything named mic that has a start function.
// this one is home made, so the tap can open the microphone without p5.sound.
let mic = {
  start: function () {
    audio = new AudioContext();
    analyser = audio.createAnalyser();
    analyser.fftSize = 2048;
    samples = new Float32Array(analyser.fftSize);
    // turn off the phone's call clean-up, which would flatten a held note
    let wanted = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
    navigator.mediaDevices.getUserMedia(wanted).then(function (stream) {
      // the microphone goes into the analyser and nowhere else, so nothing comes out of the speaker
      audio.createMediaStreamSource(stream).connect(analyser);
      micOpen = true;
    }).catch(function (error) {
      problem = 'no microphone. drag a finger up and down';
      console.log(error);
    });
  }
};

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  imageMode(CENTER);
  textSize(16);
  enableMicTap('Tap to turn on the microphone');

  gif = await loadImage(gifFile);
  gif.pause(); // the note chooses the frame, not the clock

  // Pitchy is a newer kind of library, a module, so it is loaded here and not in index.html
  let pitchy = await import('https://esm.sh/pitchy@4');
  detector = pitchy.PitchDetector.forFloat32Array(2048);
}

function draw() {
  background(20);

  if (micOpen && detector) {
    // 1. read the input: the raw sound wave, then the note inside it
    analyser.getFloatTimeDomainData(samples);
    let found = detector.findPitch(samples, audio.sampleRate);
    pitch = found[0];
    clarity = found[1];
    // 2. only a clear note inside the range counts. breath and noise have no clear note.
    if (clarity > clarityNeeded && pitch > lowNote * 0.8 && pitch < highNote * 1.2) {
      // notes are heard in ratios, not steps, so the range is mapped through log()
      let target = map(log(pitch), log(lowNote), log(highNote), 0, 1, true);
      // 3. smooth it
      position = lerp(position, target, smoothing);
    }
  }
  // the fallback: a finger stands in for the voice. higher on the screen is a higher note.
  if (fingerDown) {
    position = lerp(position, constrain(map(mouseY, height, 0, 0, 1), 0, 1), smoothing);
  }

  // 4. use it
  let last = gif.numFrames() - 1;
  let frame = round(position * last);
  gif.setFrame(frame);

  let top = 70;
  let s = min(width * 0.8 / gif.width, (height - top) * 0.85 / gif.height);
  image(gif, width / 2, top + (height - top) / 2, gif.width * s, gif.height * s);

  // the note as a marker up the left edge
  noStroke();
  fill(100, 200, 255);
  rect(0, height - position * height - 6, 24, 12);

  fill(255);
  text('note: ' + round(pitch) + ' Hz   clarity: ' + nf(clarity, 1, 2) + '   frame: ' + frame, 20, 30);
  if (problem !== '') {
    text(problem, 20, 52);
  } else if (micOpen) {
    text('listening. hum low, then high', 20, 52);
  } else {
    text('tap to turn on the microphone', 20, 52);
  }
}

// the first tap belongs to the microphone message, so it is not counted.
// p5's own mouseIsPressed can stay stuck after that tap, so the sketch keeps its own record.
function mousePressed() {
  if (window.micEnabled) {
    fingerDown = true;
  }
  return false;
}

function mouseReleased() {
  fingerDown = false;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
