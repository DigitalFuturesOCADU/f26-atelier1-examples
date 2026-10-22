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
