import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));
const rentals = JSON.parse(fs.readFileSync('data/rentals.json', 'utf8'));
const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));

console.log('=== Deep Investigation ===\n');

// 1. Let's inspect `total_floors === 0`
const zeroFloors = listings.filter(l => l.total_floors <= 0);
console.log(`Listings with total_floors <= 0: ${zeroFloors.length}`);
console.log('Breakdown by property_type:');
const zeroFloorsByType = {};
for (const l of zeroFloors) {
  zeroFloorsByType[l.property_type] = (zeroFloorsByType[l.property_type] || 0) + 1;
}
console.log(zeroFloorsByType);

// 2. What about negative prices?
const negPrice = listings.filter(l => l.price < 0);
console.log(`\nNegative price listings (${negPrice.length}):`, negPrice.map(l => ({ id: l.listing_id, price: l.price })));

// 3. Floor > Total floors
const floorExceeds = listings.filter(l => l.total_floors > 0 && l.floor > l.total_floors);
console.log(`\nFloor > total_floors (${floorExceeds.length}):`, floorExceeds.map(l => ({ id: l.listing_id, floor: l.floor, total: l.total_floors })));

// 4. Carpet area > Super built up area
const carpetExceeds = listings.filter(l => l.carpet_area > l.super_built_up_area);
console.log(`\nCarpet > Super built-up (${carpetExceeds.length}):`, carpetExceeds.map(l => ({ id: l.listing_id, carpet: l.carpet_area, super: l.super_built_up_area })));

// 5. Swapped latitude / longitude
const swappedCoords = listings.filter(l => l.latitude > 50 && l.longitude < 20);
console.log(`\nSwapped coordinates (${swappedCoords.length}):`, swappedCoords.map(l => ({ id: l.listing_id, lat: l.latitude, lon: l.longitude })));

// 6. Zero bedrooms (for non-plots)
const zeroBhk = listings.filter(l => l.bedroom <= 0);
console.log(`\nZero BHK (${zeroBhk.length}):`, zeroBhk.map(l => ({ id: l.listing_id, bhk: l.bedroom, prop: l.property_type })));

// 7. Negative bedrooms, bathrooms, balconies, etc.
const negOther = listings.filter(l => l.bathroom < 0 || l.balcony < 0 || l.covered_parking < 0);
console.log(`\nNegative bathroom/balcony/parking (${negOther.length})`);

// 8. Total impossible records if we combine:
// - negative price
// - floor > total_floors
// - carpet_area > super_built_up_area
// - swapped coordinates
// - zero/negative bedrooms for apartment/villa/house
const impossibleSet = new Set([
  ...negPrice.map(l => l.listing_id),
  ...floorExceeds.map(l => l.listing_id),
  ...carpetExceeds.map(l => l.listing_id),
  ...swappedCoords.map(l => l.listing_id),
  ...zeroBhk.map(l => l.listing_id)
]);
console.log(`\nTotal physically impossible listings count: ${impossibleSet.size}`);
console.log('Sorted impossible IDs:', [...impossibleSet].sort());
