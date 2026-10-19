// 09 Marker on a Screen: the numbers
// A page of numbers. Tap one and your phone shows that marker, full screen.
// Hold it up to 08 ArUco Markers on another device, next to the paper marker
// with the same number, and compare them.
//
// Try this
//   Tap the number on your paper marker. Both should read as the same number in 08.
//   Type any number from 0 to 249 in the box for a marker that is not on the sheets.
//
// Key data
//   COUNT     how many numbers to show. 37 is 0 to 36, the same as the printed sheets
//   LAST_ID   the highest number in the dictionary, ARUCO_MIP_36h12
//   each number opens marker/?id=N, the marker page in the folder next to this one

const COUNT = 37;
const LAST_ID = 249;

function setup() {
  noCanvas(); // this page is only links

  const grid = select('#numbers');
  for (let id = 0; id < COUNT; id++) {
    const link = createA(markerPage(id), String(id));
    link.parent(grid);
  }

  // the box for any other number
  select('#other').elt.addEventListener('submit', openOther);
}

function markerPage(id) {
  return 'marker/?id=' + id;
}

function openOther(event) {
  event.preventDefault();
  const id = parseInt(select('#other-id').value(), 10);
  if (id >= 0 && id <= LAST_ID) {
    location.href = markerPage(id);
  } else {
    alert('Pick a number from 0 to ' + LAST_ID + '.');
  }
}
