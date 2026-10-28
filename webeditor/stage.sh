#!/bin/sh
# Copy each example's files (index.html, sketch.js and any images) into
# webeditor/projects/<slug>/ for p5-webeditor-sync. Version 1.2.0 and later
# upload images intact as Web Editor assets.
set -e
cd "$(dirname "$0")/.."
for dir in class-02/motion-to-image/*/ class-03/gif-controls/*/ class-03/shake-for-a-new-image/ class-04/sound-to-image/*/ class-05/making-sound/*/ class-05/input-to-sound/*-*-*/ class-05/gif-and-sound/*/ class-06/drawing/*/; do
  name=$(basename "$dir")
  class=$(echo "$dir" | cut -d/ -f1)
  slug="$class-$name"
  mkdir -p "webeditor/projects/$slug"
  find "$dir" -maxdepth 1 -type f -exec cp {} "webeditor/projects/$slug/" \;
done

# Class 13 Share Basics. The folder is class-11/ (the Share examples kept their old folder
# after the Class 11 and 13 swap), so the Web Editor names use class-13.
for dir in class-11/share-basics/*/; do
  slug="class-13-$(basename "$dir")"
  mkdir -p "webeditor/projects/$slug"
  find "$dir" -maxdepth 1 -type f -exec cp {} "webeditor/projects/$slug/" \;
done

# Class 12 One Number and the Room Inspector. Share moved to Class 12 on 2026-10-26, so these
# new names use class-12. The Share Basics above keep class-13 because their sketches already exist.
for name in one-number room-inspector; do
  slug="class-12-$name"
  mkdir -p "webeditor/projects/$slug"
  find "class-11/$name" -maxdepth 1 -type f -exec cp {} "webeditor/projects/$slug/" \;
done

# Class 12 One Cow to Many: six snapshots of one sketch, single player to the whole room.
for dir in class-11/one-cow-to-many/*/; do
  slug="class-12-cow-$(basename "$dir")"
  mkdir -p "webeditor/projects/$slug"
  find "$dir" -maxdepth 1 -type f -exec cp {} "webeditor/projects/$slug/" \;
done

# Class 12 class-wide examples, a projector page and a phone page each. The Web Editor holds one
# folder per sketch, so the copy carries class-server.js itself, and the projector's join code
# (and its phone redirect) point at the phone page on GitHub Pages instead of ../phone/.
PAGES=https://digitalfuturesocadu.github.io/f26-atelier1-examples/class-11
for dir in class-11/0[1-4]-*/; do
  ex=$(basename "$dir")
  for side in projector phone; do
    slug="class-12-$ex-$side"
    out="webeditor/projects/$slug"
    mkdir -p "$out"
    find "$dir$side" -maxdepth 1 -type f -exec cp {} "$out/" \;
    cp class-11/class-server.js "$out/"
    sed -i '' "s#\.\./\.\./class-server\.js#class-server.js#; s#'\.\./phone/'#'$PAGES/$ex/phone/'#" "$out/index.html"
    if [ -f "$out/join-panel.js" ]; then
      sed -i '' "s#new URL('\.\./phone/', location\.href)#new URL('$PAGES/$ex/phone/')#" "$out/join-panel.js"
    fi
  done
done
