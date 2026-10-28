#!/bin/sh
# Rebuild the Arduino zip next to each example after changing its .ino:
#   sh class-13/bluetooth/make-zips.sh
# Each zip holds one sketch folder, so it opens straight into the Arduino IDE.
cd "$(dirname "$0")" || exit 1
for pair in 0-find-your-board:BoardCheck 1-tilt-to-servo:TiltToServo 2-light-to-phone:LightToPhone \
            3-both-ways:BothWays 4-proximity:Proximity 5-face-to-board:FaceToBoard; do
  dir=${pair%%:*}
  name=${pair#*:}
  (cd "$dir/arduino" && zip -X -q -FS -r "../$name.zip" "$name" -x "*.DS_Store") && echo "$dir/$name.zip"
done
