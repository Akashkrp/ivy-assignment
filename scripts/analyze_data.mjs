import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));
const rentals = JSON.parse(fs.readFileSync('data/rentals.json', 'utf8'));
const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));

console.log(`Loaded: ${listings.length} listings, ${rentals.length} rentals, ${projects.length} projects.\n`);

// ----------------------------------------------------
// Q1: total_listing_records
// ----------------------------------------------------
console.log('=== Q1: total_listing_records ===');
console.log(`Total listings: ${listings.length}`);

// ----------------------------------------------------
// Q3: active_listings (is_live === true)
// ----------------------------------------------------
console.log('\n=== Q3: active_listings ===');
const activeListings = listings.filter(l => l.is_live === true);
const inactiveListings = listings.filter(l => l.is_live === false);
console.log(`Active listings (is_live === true): ${activeListings.length}`);
console.log(`Inactive listings (is_live === false): ${inactiveListings.length}`);
console.log(`Other/null is_live: ${listings.length - activeListings.length - inactiveListings.length}`);

// ----------------------------------------------------
// Q4: Corrupt listing IDs (impossible physical reality)
// ----------------------------------------------------
console.log('\n=== Q4: Corrupt listing IDs search ===');
const corrupt = [];

for (const l of listings) {
  const reasons = [];
  if (l.price <= 0) reasons.push(`non-positive price: ${l.price}`);
  if (l.carpet_area <= 0) reasons.push(`non-positive carpet_area: ${l.carpet_area}`);
  if (l.super_built_up_area <= 0) reasons.push(`non-positive super_built_up_area: ${l.super_built_up_area}`);
  if (l.floor > l.total_floors) reasons.push(`floor (${l.floor}) > total_floors (${l.total_floors})`);
  if (l.carpet_area > l.super_built_up_area) reasons.push(`carpet_area (${l.carpet_area}) > super_built_up_area (${l.super_built_up_area})`);
  if (l.bedroom <= 0 && l.property_type !== 'plot') reasons.push(`bedroom <= 0: ${l.bedroom}`);
  if (l.bathroom < 0) reasons.push(`bathroom < 0: ${l.bathroom}`);
  if (l.balcony < 0) reasons.push(`balcony < 0: ${l.balcony}`);
  if (l.floor < 0) reasons.push(`negative floor: ${l.floor}`);
  if (l.total_floors <= 0) reasons.push(`total_floors <= 0: ${l.total_floors}`);
  if (l.latitude < -90 || l.latitude > 90 || l.longitude < -180 || l.longitude > 180) reasons.push(`invalid coords: ${l.latitude}, ${l.longitude}`);
  // Bangalore coordinates are roughly lat: 12.7 to 13.3, lon: 77.3 to 77.9
  if (l.latitude < 12.0 || l.latitude > 14.0 || l.longitude < 76.5 || l.longitude > 78.5) {
    reasons.push(`coords outside Bangalore: ${l.latitude}, ${l.longitude}`);
  }

  if (reasons.length > 0) {
    corrupt.push({ id: l.listing_id, reasons, record: l });
  }
}

console.log(`Potential corrupt listings found: ${corrupt.length}`);
for (const c of corrupt) {
  console.log(`- ${c.id}: ${c.reasons.join('; ')}`);
}

// ----------------------------------------------------
// Q5: total_monthly_rent in assigned locality (bellandur)
// ----------------------------------------------------
console.log('\n=== Q5: total_monthly_rent in Bellandur ===');
const bellandurRentals = rentals.filter(r => r.locality && r.locality.toLowerCase().trim() === 'bellandur');
console.log(`Total rentals in Bellandur: ${bellandurRentals.length}`);
const totalRent = bellandurRentals.reduce((sum, r) => sum + (r.price || 0), 0);
console.log(`Sum of rent in Bellandur: ${totalRent}`);
console.log('Sample rental prices in Bellandur:', bellandurRentals.slice(0, 5).map(r => ({ id: r.listing_id, price: r.price, is_live: r.is_live })));

// ----------------------------------------------------
// Q7: costliest_project
// ----------------------------------------------------
console.log('\n=== Q7: costliest_project ===');
let maxProject = null;
let maxPrice = -Infinity;
for (const p of projects) {
  if (p.price_max > maxPrice) {
    maxPrice = p.price_max;
    maxProject = p;
  }
}
console.log('Max project record:', {
  project_id: maxProject?.project_id,
  apartment_name: maxProject?.apartment_name,
  developer_name: maxProject?.developer_name,
  price_min: maxProject?.price_min,
  price_max: maxProject?.price_max
});
console.log('All top 5 costliest projects by price_max:');
const sortedProjects = [...projects].sort((a, b) => b.price_max - a.price_max);
for (const p of sortedProjects.slice(0, 5)) {
  console.log(`- ${p.project_id} (${p.apartment_name}): price_max = ${p.price_max}`);
}

// ----------------------------------------------------
// Q10: projects_with_wrong_listing_count
// ----------------------------------------------------
console.log('\n=== Q10: projects_with_wrong_listing_count ===');
const listingCountsByProjectAll = {};
const listingCountsByProjectLive = {};
for (const l of listings) {
  if (l.project_id) {
    listingCountsByProjectAll[l.project_id] = (listingCountsByProjectAll[l.project_id] || 0) + 1;
    if (l.is_live) {
      listingCountsByProjectLive[l.project_id] = (listingCountsByProjectLive[l.project_id] || 0) + 1;
    }
  }
}

let wrongAll = 0;
let wrongLive = 0;
const wrongSamples = [];

for (const p of projects) {
  const actualAll = listingCountsByProjectAll[p.project_id] || 0;
  const actualLive = listingCountsByProjectLive[p.project_id] || 0;
  if (p.total_listings !== actualAll) {
    wrongAll++;
    if (wrongSamples.length < 5) {
      wrongSamples.push({ id: p.project_id, reported: p.total_listings, actualAll, actualLive });
    }
  }
  if (p.total_listings !== actualLive) {
    wrongLive++;
  }
}
console.log(`Projects with total_listings != actualAll: ${wrongAll} / ${projects.length}`);
console.log(`Projects with total_listings != actualLive: ${wrongLive} / ${projects.length}`);
console.log('Samples of discrepancies:', wrongSamples);

// ----------------------------------------------------
// Exploration: Carpet Area units & Q6: avg_price_per_sqft_2bhk
// ----------------------------------------------------
console.log('\n=== Carpet Area distribution ===');
const areas = listings.map(l => l.carpet_area).sort((a, b) => a - b);
console.log(`Min area: ${areas[0]}, Max area: ${areas[areas.length - 1]}`);
console.log(`Areas < 300 sqft: ${listings.filter(l => l.carpet_area < 300).length} / ${listings.length}`);
console.log('Sample listings with area < 300:');
for (const l of listings.filter(l => l.carpet_area < 300).slice(0, 5)) {
  console.log(`- ${l.listing_id}: bhk=${l.bedroom}, carpet=${l.carpet_area}, super=${l.super_built_up_area}, prop=${l.property_type}`);
}
console.log('Sample listings with area >= 300:');
for (const l of listings.filter(l => l.carpet_area >= 300).slice(0, 5)) {
  console.log(`- ${l.listing_id}: bhk=${l.bedroom}, carpet=${l.carpet_area}, super=${l.super_built_up_area}, prop=${l.property_type}`);
}
