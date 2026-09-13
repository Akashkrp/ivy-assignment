import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));

console.log('=== Checking Future Dated Listings ===');
const futureListings = listings.filter(l => l.posted_at > '2026-09-10T00:00:00');
console.log(`Listings with posted_at > 2026-09-10T00:00:00: ${futureListings.length}`);
console.log('Future listings:');
for (const l of futureListings) {
  console.log(`- ${l.listing_id}: posted_at=${l.posted_at}, apt=${l.apartment_name}, loc=${l.locality}, price=${l.price}`);
}
