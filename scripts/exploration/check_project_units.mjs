import fs from 'node:fs';

const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));

console.log('=== Checking Projects Prices ===');
const sortedProjects = [...projects].sort((a, b) => b.price_max - a.price_max);

for (const p of sortedProjects.slice(0, 10)) {
  console.log(`- ${p.project_id}: ${p.apartment_name}, dev: ${p.developer_name}, min_area: ${p.min_area_sqft}, max_area: ${p.max_area_sqft}, price_min: ${p.price_min}, price_max: ${p.price_max}`);
}

console.log('\nCheapest projects by price_min:');
const cheapest = [...projects].sort((a, b) => a.price_min - b.price_min);
for (const p of cheapest.slice(0, 10)) {
  console.log(`- ${p.project_id}: ${p.apartment_name}, dev: ${p.developer_name}, min_area: ${p.min_area_sqft}, max_area: ${p.max_area_sqft}, price_min: ${p.price_min}, price_max: ${p.price_max}`);
}

// Compare project prices with actual listing prices in the same projects!
const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));
console.log('\n=== Comparing Project Prices with Listings in same project ===');
for (const p of sortedProjects.slice(0, 5)) {
  const projListings = listings.filter(l => l.project_id === p.project_id);
  console.log(`Project ${p.project_id} (${p.apartment_name}): price_min=${p.price_min}, price_max=${p.price_max}`);
  console.log(`  Listings count: ${projListings.length}`);
  if (projListings.length > 0) {
    const listingPrices = projListings.map(l => l.price);
    console.log(`  Listing prices (INR):`, listingPrices);
  }
}
