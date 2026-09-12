import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));
const rentals = JSON.parse(fs.readFileSync('data/rentals.json', 'utf8'));
const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));

console.log('=== 1. Investigating Duplicates (unique_properties) ===');
// How do we define duplicate properties?
// In real estate aggregator datasets, multiple portals (100acres, magichomes, dwelling, squarelane, zerobroker)
// list the same physical property.
// What fields identify the same physical property?
// Coordinates (lat, lon)?
// (apartment_name, locality, bedroom, floor, total_floors, facing_direction)?
// Let's test different deduplication keys:

function getKeys(l) {
  // normalize strings
  const apt = (l.apartment_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const loc = (l.locality || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const facing = (l.facing_direction || '').toLowerCase().trim();
  const propType = (l.property_type || '').toLowerCase().trim();
  const lat = Number(l.latitude || 0).toFixed(4);
  const lon = Number(l.longitude || 0).toFixed(4);

  return {
    // Key 1: Exact coords + floor + total_floors + bedroom
    k1: `${lat}|${lon}|${l.floor}|${l.total_floors}|${l.bedroom}`,
    // Key 2: apt + loc + floor + total_floors + bedroom + facing
    k2: `${apt}|${loc}|${l.floor}|${l.total_floors}|${l.bedroom}|${facing}`,
    // Key 3: apt + loc + floor + bedroom + facing
    k3: `${apt}|${loc}|${l.floor}|${l.bedroom}|${facing}`,
    // Key 4: lat + lon (exact location)
    k4: `${lat}|${lon}`,
    // Key 5: apt + loc + floor + total_floors + bedroom + propType
    k5: `${apt}|${loc}|${l.floor}|${l.total_floors}|${l.bedroom}|${propType}`
  };
}

const sets = { k1: new Set(), k2: new Set(), k3: new Set(), k4: new Set(), k5: new Set() };
for (const l of listings) {
  const k = getKeys(l);
  sets.k1.add(k.k1);
  sets.k2.add(k.k2);
  sets.k3.add(k.k3);
  sets.k4.add(k.k4);
  sets.k5.add(k.k5);
}
console.log(`Unique properties counts with different keys:`);
console.log(`- lat/lon + floor + total_floors + bhk: ${sets.k1.size}`);
console.log(`- apt + loc + floor + total_floors + bhk + facing: ${sets.k2.size}`);
console.log(`- apt + loc + floor + bhk + facing: ${sets.k3.size}`);
console.log(`- exact lat/lon: ${sets.k4.size}`);
console.log(`- apt + loc + floor + total_floors + bhk + propType: ${sets.k5.size}`);

// Let's inspect some obvious duplicates
const duplicatesByK2 = {};
for (const l of listings) {
  const k = getKeys(l).k2;
  if (!duplicatesByK2[k]) duplicatesByK2[k] = [];
  duplicatesByK2[k].push(l);
}
const multiListingProps = Object.values(duplicatesByK2).filter(group => group.length > 1);
console.log(`Properties appearing in multiple listings (k2): ${multiListingProps.length}`);
console.log('Sample duplicate pair:');
if (multiListingProps.length > 0) {
  const sample = multiListingProps[0];
  console.log(sample.map(l => ({
    id: l.listing_id,
    ws: l.website,
    apt: l.apartment_name,
    loc: l.locality,
    floor: l.floor,
    total_floors: l.total_floors,
    bhk: l.bedroom,
    facing: l.facing_direction,
    carpet: l.carpet_area,
    price: l.price
  })));
}

// === 2. Investigating Reference Date & listings_last_7_days ===
console.log('\n=== 2. Investigating Reference Date & listings_last_7_days ===');
// REFERENCE = 2026-09-10T00:00:00+05:30 (IST)
// Reference - 7 days = 2026-09-03T00:00:00+05:30 (IST)
// In UTC:
// Reference = 2026-09-09T18:30:00Z
// Reference - 7 days = 2026-09-02T18:30:00Z
// Let's inspect posted_at timestamps in listings
const postedAts = listings.map(l => l.posted_at);
console.log('Sample posted_at:', postedAts.slice(0, 10));
const hasZ = postedAts.filter(p => p && p.endsWith('Z')).length;
const hasOffset = postedAts.filter(p => p && (p.includes('+') || p.includes('-'))).length;
console.log(`posted_at with Z: ${hasZ} / ${listings.length}`);
console.log(`posted_at with offset: ${hasOffset} / ${listings.length}`);

// If posted_at has no Z and no offset, what timezone is it in?
// Is it UTC, or is it already IST?
// Let's check max posted_at and min posted_at!
const sortedDates = [...postedAts].sort();
console.log(`Min posted_at: ${sortedDates[0]}, Max posted_at: ${sortedDates[sortedDates.length - 1]}`);

// Let's test counting in [REFERENCE - 7 days, REFERENCE) under both interpretations:
// Interpretation A: posted_at is in IST (local server time)
// [2026-09-03T00:00:00, 2026-09-10T00:00:00)
const countA = listings.filter(l => {
  const d = l.posted_at;
  return d >= '2026-09-03T00:00:00' && d < '2026-09-10T00:00:00';
}).length;

// Interpretation B: posted_at is UTC string, e.g. "2026-09-02T18:30:00" to "2026-09-09T18:30:00"
const countB = listings.filter(l => {
  // parse as UTC
  const d = new Date(l.posted_at + 'Z').getTime();
  const ref = new Date('2026-09-09T18:30:00Z').getTime();
  const refMinus7 = ref - 7 * 24 * 60 * 60 * 1000;
  return d >= refMinus7 && d < ref;
}).length;

console.log(`Count A (string comparison / assuming posted_at is IST): ${countA}`);
console.log(`Count B (assuming posted_at is UTC and converted to IST): ${countB}`);
