const { GameManager } = require('./gameManager');
const config = require('./config.json');

const gmNormal = new GameManager();
gmNormal.eventMode = false;
const floorsNormal = gmNormal.preGenerateAllFloors();
const countNormal = Object.keys(floorsNormal).length * 2; // 2 items per floor

const gmEvent = new GameManager();
gmEvent.eventMode = true;
const floorsEvent = gmEvent.preGenerateAllFloors();
const countEvent = Object.keys(floorsEvent).length * 2;

console.log(`Normal Mode Items: ${countNormal}`);
console.log(`Event Mode Items: ${countEvent}`);

// Check specific item counts for Normal Mode
let nothingCountNormal = 0;
for (const floor of Object.values(floorsNormal)) {
    if (floor.left.type === 'nothing') nothingCountNormal++;
    if (floor.right.type === 'nothing') nothingCountNormal++;
}
console.log(`Normal Mode Nothing Count: ${nothingCountNormal}`);

// Check specific item counts for Event Mode
let nothingCountEvent = 0;
let eventCount = 0;
for (const floor of Object.values(floorsEvent)) {
    if (floor.left.type === 'nothing') nothingCountEvent++;
    if (floor.right.type === 'nothing') nothingCountEvent++;
    if (floor.left.type === 'event') eventCount++;
    if (floor.right.type === 'event') eventCount++;
}
console.log(`Event Mode Nothing Count: ${nothingCountEvent}`);
console.log(`Event Mode Event Count: ${eventCount}`);
