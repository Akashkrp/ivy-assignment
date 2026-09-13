import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));

// What identifies a physical property?
// 1. In an apartment / society:
// (apartment_name, locality, floor, total_floors, bedroom, facing_direction)
// 2. What about plots / independent houses?
// Let's check records that have identical coordinates:
const coordMap = {};
for (const l of listings) {
  // normalize lat/lon to 4 decimal places (~11 meters)
  const key = `${Number(l.latitude).toFixed(4)},${Number(l.longitude).toFixed(4)}`;
  if (!coordMap[key]) coordMap[key] = [];
  coordMap[key].push(l);
}

// Check how many coordinate keys have multiple listings
const multiCoord = Object.values(coordMap).filter(g => g.length > 1);
console.log(`Unique coord keys (4 decimals): ${Object.keys(coordMap).length}`);
console.log(`Coord groups with >1 listing: ${multiCoord.length}`);

// Let's check exact physical property keys:
// Clean apartment name (strip spaces, lowercase)
function norm(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Key A: (apartment_name, locality, floor, total_floors, bedroom, facing_direction)
const keyA = new Set(listings.map(l => `${norm(l.apartment_name)}_${norm(l.locality)}_${l.floor}_${l.total_floors}_${l.bedroom}_${norm(l.facing_direction)}`));

// Key B: (apartment_name, locality, floor, total_floors, bedroom)
const keyB = new Set(listings.map(l => `${norm(l.apartment_name)}_${norm(l.locality)}_${l.floor}_${l.total_floors}_${l.bedroom}`));

// Key C: (apartment_name, locality, floor, bedroom, facing_direction)
const keyC = new Set(listings.map(l => `${norm(l.apartment_name)}_${norm(l.locality)}_${l.floor}_${l.bedroom}_${norm(l.facing_direction)}`));

// Key D: (apartment_name, locality, floor, total_floors, bedroom, property_type)
const keyD = new Set(listings.map(l => `${norm(l.apartment_name)}_${norm(l.locality)}_${l.floor}_${l.total_floors}_${l.bedroom}_${norm(l.property_type)}`));

console.log(`Key A (apt + loc + floor + tot_floors + bhk + facing): ${keyA.size}`);
console.log(`Key B (apt + loc + floor + tot_floors + bhk): ${keyB.size}`);
console.log(`Key C (apt + loc + floor + bhk + facing): ${keyC.size}`);
console.log(`Key D (apt + loc + floor + tot_floors + bhk + prop): ${keyD.size}`);

// What about plots? Plots have floor: 0, total_floors: 0, bedroom: 0.
// How many plots are there?
const plots = listings.filter(l => l.property_type === 'plot');
console.log(`Total plots: ${plots.length}`);
const plotKeys = new Set(plots.map(p => `${norm(p.apartment_name)}_${norm(p.locality)}_${p.carpet_area}`));
console.log(`Unique plot keys: ${plotKeys.size}`);
