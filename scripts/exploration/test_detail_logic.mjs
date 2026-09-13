import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));
const sample = listings[0];
console.log('Sample listing ID:', sample.listing_id);

// Simulate ListingDetailView logic
const match = listings.find((l) => l.listing_id === sample.listing_id);
console.log('Found match:', !!match);

const comps = listings
  .filter((l) => 
    l.listing_id !== match.listing_id &&
    l.locality?.toLowerCase() === match.locality?.toLowerCase() &&
    l.bedroom === match.bedroom &&
    Math.abs(l.price - match.price) / (match.price || 1) <= 0.25
  )
  .slice(0, 4);

console.log('Found comps:', comps.length);
console.log('Listing detail simulation successful!');
