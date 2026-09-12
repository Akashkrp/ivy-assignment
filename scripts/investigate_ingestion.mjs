import fs from 'node:fs';
import path from 'node:path';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));
const rentals = JSON.parse(fs.readFileSync('data/rentals.json', 'utf8'));
const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));

console.log('--- Ingestion Array Lengths ---');
console.log('Listings array length:', listings.length);
console.log('Rentals array length:', rentals.length);
console.log('Projects array length:', projects.length);

const listingIds = listings.map(l => l.listing_id);
const uniqueListingIds = new Set(listingIds);
console.log('Unique listing_ids in listings:', uniqueListingIds.size, 'out of', listingIds.length);

const rentalIds = rentals.map(r => r.listing_id);
const uniqueRentalIds = new Set(rentalIds);
console.log('Unique listing_ids in rentals:', uniqueRentalIds.size, 'out of', rentalIds.length);

const projectIds = projects.map(p => p.project_id);
const uniqueProjectIds = new Set(projectIds);
console.log('Unique project_ids in projects:', uniqueProjectIds.size, 'out of', projectIds.length);

// What happened at offset 4300 for listings?
console.log('Listing records around 4300:');
console.log('Listing 4300:', listings[4299]?.listing_id);
console.log('Listing 4301:', listings[4300]?.listing_id);
console.log('Listing 4350:', listings[4349]?.listing_id);

// Check if records past 4301 are duplicates or empty or real
if (listings.length > 4301) {
  const extraListings = listings.slice(4301);
  console.log('Extra listings slice length:', extraListings.length);
  console.log('Extra listings sample:', extraListings.slice(0, 3));
}
