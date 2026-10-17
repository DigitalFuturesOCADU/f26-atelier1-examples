# Share load test

Opens 30 fake phones on one Share room and checks that the room keeps up. Run it against the class server before class, so you know it works with a full room.

It speaks the P5PhoneShare wire protocol (version 2) directly, the same messages p5-phone sends. It measures the server and the network, not the browser.

## What you need

Node 22 or newer. Check with `node --version`. There is nothing to install.

## Run it

From the root of this repo:

```
node tests/share-load/load.mjs https://p5-phone-share.YOUR-NAME.workers.dev load-test 30
```

The three parts are the server, a room name, and how many phones. Use a room name nobody is using, like `load-test`. Never use `crowd-tilt` or another class room name unless you want the fake phones to appear on the projector.

It takes about 20 seconds. Options go on the end:

| Option | Default | What it does |
|---|---|---|
| `--seconds=15` | 15 | how long the phones send once they are all in |
| `--hz=10` | 10 | updates per second from each phone. A tilting phone sends about 10 |
| `--stagger=50` | 50 | milliseconds between one phone joining and the next. 0 joins them all at once |

For a local test, start the server with `npx wrangler dev --port 8790 --ip 127.0.0.1` in `companion/P5PhoneShare`, then use `http://127.0.0.1:8790` as the server.

## What it prints

- How long joining took. A few milliseconds is normal. Over a second is slow.
- How many messages each phone sends and receives each second.
- How late updates arrive, from one phone to another. Under 100 milliseconds at the 95th percentile feels instant.
- Whether every phone sees all the others. Every line should say 30 of 30.
- Whether the phones noticed when half of them left.

The last line says PASS or FAIL.

## Run it with a projector open

Open the Crowd Tilt projector page on the same room, then run the test with that room name:

```
node tests/share-load/load.mjs https://p5-phone-share.YOUR-NAME.workers.dev crowd-tilt 30
```

The projector should show 30 phones, and the ball should keep moving smoothly. The fake phones tilt in circles, so the average stays near the middle. The projector and any real phones in the room are not counted in the test, so the result is still about the 30 fake phones.

## How many phones is too many

Every update from one phone goes to every other phone in the room. So the room sends out about phones times phones times updates per second. At 30 phones and 10 updates a second that is about 9,000 messages a second. If that starts to lag, run it again with `--hz=5`.
