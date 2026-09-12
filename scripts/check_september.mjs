import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));

const sepListings = listings.filter(l => l.posted_at.startsWith('2026-09-')).sort((a, b) => a.posted_at.localeCompare(b.posted_at));

console.log(`Listings in September 2026: ${sepListings.length}`);
console.log('Days breakdown in September 2026:');
const dayCounts = {};
for (const l of sepListings) {
  const day = l.posted_at.slice(0, 10);
  dayCounts[day] = (dayCounts[day] || 0) + 1;
}
console.log(dayCounts);

// What about rentals posted_at?
const rentals = JSON.parse(fs.readFileSync('data/rentals.json', 'utf8'));
const sepRentals = rentals.filter(r => r.posted_at.startsWith('2026-09-')).sort((a, b) => a.posted_at.localeCompare(b.posted_at));
console.log(`\nRentals in September 2026: ${sepRentals.length}`);
const rentalDayCounts = {};
for (const r of sepRentals) {
  const day = r.posted_at.slice(0, 10);
  rentalDayCounts[day] = (rentalDayCounts[day] || 0) + 1;
}
console.log(rentalDayCounts);
