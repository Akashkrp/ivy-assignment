import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));

// Define the anomaly sets
const negPrice = listings.filter(l => l.price < 0).map(l => l.listing_id);
const floorGtTotal = listings.filter(l => l.total_floors > 0 && l.floor > l.total_floors).map(l => l.listing_id);
const carpetGtSuper = listings.filter(l => l.carpet_area > l.super_built_up_area).map(l => l.listing_id);
const coordsSwapped = listings.filter(l => l.latitude > 50 && l.longitude < 20).map(l => l.listing_id);
const zeroBhkNonPlot = listings.filter(l => l.bedroom <= 0 && l.property_type !== 'plot').map(l => l.listing_id);
const futureDate = listings.filter(l => l.posted_at > '2026-09-10T00:00:00').map(l => l.listing_id);
const tinyPrice = listings.filter(l => l.price > 0 && l.price < 50000).map(l => l.listing_id);

console.log('Group counts:');
console.log('negPrice:', negPrice.length);
console.log('floorGtTotal:', floorGtTotal.length);
console.log('carpetGtSuper:', carpetGtSuper.length);
console.log('coordsSwapped:', coordsSwapped.length);
console.log('zeroBhkNonPlot:', zeroBhkNonPlot.length);
console.log('futureDate:', futureDate.length);
console.log('tinyPrice (fake):', tinyPrice.length);

// Corrupt candidates:
// Candidate 1 (40 records): 5 physical impossibility groups (negPrice, floorGtTotal, carpetGtSuper, coordsSwapped, zeroBhkNonPlot)
const corrupt40 = new Set([...negPrice, ...floorGtTotal, ...carpetGtSuper, ...coordsSwapped, ...zeroBhkNonPlot]);

// Candidate 2 (48 records): 40 + futureDate
const corrupt48 = new Set([...corrupt40, ...futureDate]);

// Fake (8 records): tinyPrice
const fake8 = new Set(tinyPrice);

// Let's inspect live 2BHK listings
const live2bhk = listings.filter(l => l.is_live && l.bedroom === 2);
console.log(`\nTotal live 2BHK listings: ${live2bhk.length}`);

function calcAvg(excludedSet, convertSqMeters = false) {
  const valid = live2bhk.filter(l => !excludedSet.has(l.listing_id));
  let sum = 0;
  for (const l of valid) {
    let area = l.carpet_area;
    if (convertSqMeters && l.carpet_area < 300) {
      area = l.carpet_area * 10.7639;
    }
    sum += (l.price / area);
  }
  return { count: valid.length, avg: (sum / valid.length).toFixed(2), avgNum: sum / valid.length };
}

console.log('\n--- Calculation 1: Exclude corrupt40 + fake8 ---');
console.log('Raw (no conversion):', calcAvg(new Set([...corrupt40, ...fake8]), false));
console.log('With sq meter conversion (10.7639):', calcAvg(new Set([...corrupt40, ...fake8]), true));

console.log('\n--- Calculation 2: Exclude corrupt48 + fake8 ---');
console.log('Raw (no conversion):', calcAvg(new Set([...corrupt48, ...fake8]), false));
console.log('With sq meter conversion (10.7639):', calcAvg(new Set([...corrupt48, ...fake8]), true));

// Let's inspect the distribution of price / carpet_area
const ratiosRaw = live2bhk
  .filter(l => !corrupt40.has(l.listing_id) && !fake8.has(l.listing_id))
  .map(l => ({ id: l.listing_id, ws: l.website, price: l.price, carpet: l.carpet_area, ratio: l.price / l.carpet_area }))
  .sort((a, b) => b.ratio - a.ratio);

console.log('\nTop 5 highest price/carpet ratios:');
console.log(ratiosRaw.slice(0, 5));
console.log('\nBottom 5 lowest price/carpet ratios:');
console.log(ratiosRaw.slice(-5));
