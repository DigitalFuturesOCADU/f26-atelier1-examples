// roles.js
// The same file sits in the projector folder and the phone folder, so both pages agree on
// the roles. Each role has a name, a colour, the colour of the text that reads on it, and a
// shape. The shape is there so no role depends on colour alone.
//
// The projector uses the first 3 or 4 of these, whichever you choose. To add a role, add a
// line here, in both folders.

const ROLES = [
  { name: 'Red',    colour: '#d92b2b', ink: '#ffffff', shape: '●' },
  { name: 'Blue',   colour: '#1f5fd1', ink: '#ffffff', shape: '■' },
  { name: 'Yellow', colour: '#ffd23f', ink: '#141414', shape: '▲' },
  { name: 'Green',  colour: '#1f8f4e', ink: '#ffffff', shape: '◆' }
];

function roleByName(name) {
  for (let i = 0; i < ROLES.length; i++) {
    if (ROLES[i].name === name) {
      return ROLES[i];
    }
  }
  return null;
}
