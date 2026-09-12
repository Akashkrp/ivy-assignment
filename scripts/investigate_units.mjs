import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));

console.log('=== Checking magichomes carpet areas ===');
const magichomes = listings.filter(l => l.website === 'magichomes');
const smallMagichomes = magichomes.filter(l => l.carpet_area < 300);
console.log(`Magichomes total: ${magichomes.length}, with carpet < 300: ${smallMagichomes.length}`);

const otherWebsites = listings.filter(l => l.website !== 'magichomes');
const smallOthers = otherWebsites.filter(l => l.carpet_area < 300);
console.log(`Other websites total: ${otherWebsites.length}, with carpet < 300: ${smallOthers.length}`);

// Print samples of smallMagichomes
console.log('\nSample small magichomes:');
for (const l of smallMagichomes.slice(0, 5)) {
  console.log(`id: ${l.listing_id}, bhk: ${l.bedroom}, carpet: ${l.carpet_area}, super: ${l.super_built_up_area}, type: ${l.property_type}`);
}

// Print samples of normal magichomes (carpet >= 300)
console.log('\nSample normal magichomes:');
for (const l of magichomes.filter(l => l.carpet_area >= 300).slice(0, 5)) {
  console.log(`id: ${l.listing_id}, bhk: ${l.bedroom}, carpet: ${l.carpet_area}, super: ${l.super_built_up_area}, type: ${l.property_type}`);
}
