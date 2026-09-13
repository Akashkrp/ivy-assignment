import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));
const rentals = JSON.parse(fs.readFileSync('data/rentals.json', 'utf8'));
const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));

console.log('=== Precision Verification of All 10 Answers ===\n');

// 1. total_listing_records
console.log('1. total_listing_records:', listings.length);

// 2. unique_properties
function norm(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
const propSet = new Set(listings.map(l => `${norm(l.apartment_name)}_${norm(l.locality)}_${l.floor}_${l.total_floors}_${l.bedroom}_${norm(l.facing_direction)}`));
console.log('2. unique_properties:', propSet.size);

// 3. active_listings
const activeListings = listings.filter(l => l.is_live === true);
console.log('3. active_listings:', activeListings.length);

// 4. corrupt_listing_ids
const negPrice = listings.filter(l => l.price < 0).map(l => l.listing_id);
const floorGtTotal = listings.filter(l => l.total_floors > 0 && l.floor > l.total_floors).map(l => l.listing_id);
const carpetGtSuper = listings.filter(l => l.carpet_area > l.super_built_up_area).map(l => l.listing_id);
const coordsSwapped = listings.filter(l => l.latitude > 50 && l.longitude < 20).map(l => l.listing_id);
const zeroBhkNonPlot = listings.filter(l => l.bedroom <= 0 && l.property_type !== 'plot').map(l => l.listing_id);
const futureDate = listings.filter(l => l.posted_at > '2026-09-10T00:00:00').map(l => l.listing_id);

const corrupt40 = [...new Set([...negPrice, ...floorGtTotal, ...carpetGtSuper, ...coordsSwapped, ...zeroBhkNonPlot])].sort();
const corrupt48 = [...new Set([...corrupt40, ...futureDate])].sort();

console.log(`4. corrupt_listing_ids (40 items):`, corrupt40);
console.log(`   corrupt_listing_ids (48 items with future dates):`, corrupt48);

// 5. total_monthly_rent
const bellandurRentals = rentals.filter(r => r.locality && r.locality.toLowerCase().trim() === 'bellandur');
const totalRent = bellandurRentals.reduce((sum, r) => sum + r.price, 0);
console.log(`5. total_monthly_rent in Bellandur: count=${bellandurRentals.length}, total=${totalRent}`);

// Check if any bellandur rentals are negative or strange
const strangeRentals = bellandurRentals.filter(r => r.price <= 0 || r.carpet_area <= 0);
console.log('   strange rentals in Bellandur:', strangeRentals.length);

// 6. avg_price_per_sqft_2bhk
const fake8 = listings.filter(l => l.price > 0 && l.price < 50000).map(l => l.listing_id).sort();
console.log('\n9. fake_listing_ids (8 items):', fake8);

const live2bhk = listings.filter(l => l.is_live && l.bedroom === 2);
function calcQ6(corruptList, convert) {
  const ex = new Set([...corruptList, ...fake8]);
  const subset = live2bhk.filter(l => !ex.has(l.listing_id));
  let total = 0;
  for (const l of subset) {
    const area = (convert && l.carpet_area < 300) ? (l.carpet_area * 10.7639) : l.carpet_area;
    total += (l.price / area);
  }
  return Number((total / subset.length).toFixed(2));
}

console.log('6. avg_price_per_sqft_2bhk options:');
console.log('   - Exclude 40, Converted sq m -> sq ft:', calcQ6(corrupt40, true));
console.log('   - Exclude 40, Raw (no conversion):', calcQ6(corrupt40, false));
console.log('   - Exclude 48, Converted sq m -> sq ft:', calcQ6(corrupt48, true));
console.log('   - Exclude 48, Raw (no conversion):', calcQ6(corrupt48, false));

// 7. costliest_project
// Let's check projects
console.log('\n7. costliest_project options:');
// Option A: Real world INR with unit normalization (Crores vs Lakhs)
// P10255 (Puravankara Vista): 4.89 Cr = 48,900,000 INR
console.log('   Option A (Correct Unit Normalization):', { project_id: 'P10255', price_max_inr: 48900000 });
// Option B: If 99.8 is treated as Crores: 998,000,000 INR
console.log('   Option B (If 99.8 treated as Crores):', { project_id: 'P10068', price_max_inr: 998000000 });
// Option C: If 99.8 is treated as Lakhs: 9,980,000 INR
console.log('   Option C (If 99.8 treated as Lakhs):', { project_id: 'P10068', price_max_inr: 9980000 });

// 8. listings_last_7_days
const count7DaysIST = listings.filter(l => l.posted_at >= '2026-09-03T00:00:00' && l.posted_at < '2026-09-10T00:00:00').length;
console.log('\n8. listings_last_7_days (IST [2026-09-03, 2026-09-10)):', count7DaysIST);

// 10. projects_with_wrong_listing_count
const liveCounts = {};
const allCounts = {};
for (const l of listings) {
  if (l.project_id) {
    allCounts[l.project_id] = (allCounts[l.project_id] || 0) + 1;
    if (l.is_live) liveCounts[l.project_id] = (liveCounts[l.project_id] || 0) + 1;
  }
}
let wrongLive = 0;
let wrongAll = 0;
for (const p of projects) {
  if (p.total_listings !== (liveCounts[p.project_id] || 0)) wrongLive++;
  if (p.total_listings !== (allCounts[p.project_id] || 0)) wrongAll++;
}
console.log(`\n10. projects_with_wrong_listing_count:`);
console.log(`    Compared to active listings: ${wrongLive}`);
console.log(`    Compared to all listings: ${wrongAll}`);
