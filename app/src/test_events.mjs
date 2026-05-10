
import fs from 'fs';
const weaponsContent = fs.readFileSync('data/weapons.ts', 'utf8');
const subsystemsContent = fs.readFileSync('data/subsystems.ts', 'utf8');

const getEventIds = (content) => {
  const ids = [];
  const items = content.split('id: ');
  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const idMatch = item.match(/^'([^']+)'/);
    if (idMatch && item.includes('availability: \'event\'')) {
      ids.push(idMatch[1]);
    }
  }
  return ids;
}

const weaponIds = getEventIds(weaponsContent);
const subsystemIds = getEventIds(subsystemsContent);

console.log('Weapons with event availability:', weaponIds);
console.log('Subsystems with event availability:', subsystemIds);

const eventNodesContent = fs.readFileSync('data/eventNodes.ts', 'utf8');
const allIds = [...weaponIds, ...subsystemIds];

const missingIds = [];
for (const id of allIds) {
  if (!eventNodesContent.includes(id)) {
    missingIds.push(id);
  }
}

console.log('IDs missing from eventNodes.ts:', missingIds);

