import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));

console.log('=== Hunting for Anomaly Categories ===\n');

// 1. Price anomalies
const negPrice = listings.filter(l => l.price < 0);
console.log(`1. Negative price: ${negPrice.length}`);

const tinyPrice = listings.filter(l => l.price > 0 && l.price < 50000);
console.log(`2. Tiny price (< 50,000): ${tinyPrice.length}`);

const lowPrice = listings.filter(l => l.price >= 50000 && l.price < 1000000);
console.log(`3. Low price (50k - 10L): ${lowPrice.length}`);

// 2. Area anomalies
const carpetGtSuper = listings.filter(l => l.carpet_area > l.super_built_up_area);
console.log(`4. Carpet > Super: ${carpetGtSuper.length}`);

const superGt10xCarpet = listings.filter(l => l.super_built_up_area > 10 * l.carpet_area);
console.log(`5. Super > 10x Carpet: ${superGt10xCarpet.length}`);

// 3. Floor anomalies
const floorGtTotal = listings.filter(l => l.total_floors > 0 && l.floor > l.total_floors);
console.log(`6. Floor > Total: ${floorGtTotal.length}`);

const floorNeg = listings.filter(l => l.floor < 0);
console.log(`7. Floor < 0: ${floorNeg.length}`);

// 4. Coordinate anomalies
const coordsSwapped = listings.filter(l => l.latitude > 50 && l.longitude < 20);
console.log(`8. Coords swapped: ${coordsSwapped.length}`);

const coordsZero = listings.filter(l => l.latitude === 0 || l.longitude === 0);
console.log(`9. Coords (0,0): ${coordsZero.length}`);

// 5. Bedroom / Bathroom anomalies
const zeroBhkNonPlot = listings.filter(l => l.bedroom <= 0 && l.property_type !== 'plot');
console.log(`10. 0 BHK non-plot: ${zeroBhkNonPlot.length}`);

const bhkGt10 = listings.filter(l => l.bedroom > 10);
console.log(`11. BHK > 10: ${bhkGt10.length}`);

const bathGt10 = listings.filter(l => l.bathroom > 10);
console.log(`12. Bath > 10: ${bathGt10.length}`);

const bathGt2xBhk = listings.filter(l => l.bathroom > 2 * l.bedroom + 2);
console.log(`13. Bath > 2*BHK + 2: ${bathGt2xBhk.length}`);

// 6. Date anomalies
const futureDate = listings.filter(l => l.posted_at > '2026-09-10T00:00:00');
console.log(`14. Future posted_at: ${futureDate.length}`);

const veryOldDate = listings.filter(l => l.posted_at < '2020-01-01T00:00:00');
console.log(`15. Very old posted_at: ${veryOldDate.length}`);

// 7. Text / Description / Contact anomalies
// What about contact numbers that appear too often or have specific patterns?
// What about descriptions? Let's check descriptions that mention enquiry, price, call, etc.
const descriptions = listings.map(l => l.description);
// Look for identical descriptions or suspicious patterns
const suspiciousTokens = [
  'call for price', 'enquiry', 'urgent', 'hot deal', 'token', 'brokerage',
  'fake', 'dummy', 'test', 'not for sale', 'investor deal', 'contact broker'
];
for (const tok of suspiciousTokens) {
  const m = listings.filter(l => l.description && l.description.toLowerCase().includes(tok));
  if (m.length > 0) console.log(`Description containing "${tok}": ${m.length}`);
}

// Check posted_by_name anomalies
const nameCounts = {};
for (const l of listings) {
  nameCounts[l.posted_by_name] = (nameCounts[l.posted_by_name] || 0) + 1;
}
const suspiciousNames = Object.entries(nameCounts).filter(([name, c]) => c > 15);
console.log('Frequent poster names:', suspiciousNames);

// Check if any listings have is_verified = false or null
const unverified = listings.filter(l => !l.is_verified);
console.log(`Unverified listings: ${unverified.length}`);

// Check if any listings have weird website
const weirdWs = listings.filter(l => !['magichomes', '100acres', 'dwelling', 'squarelane', 'zerobroker'].includes(l.website));
console.log(`Weird website: ${weirdWs.length}`);
