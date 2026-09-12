import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));
const rentals = JSON.parse(fs.readFileSync('data/rentals.json', 'utf8'));
const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));

console.log('=== Checking Non-Plot Zero BHK ===');
const nonPlotZeroBhk = listings.filter(l => l.bedroom <= 0 && l.property_type !== 'plot');
console.log(`Non-plot Zero BHK count: ${nonPlotZeroBhk.length}`);
console.log(nonPlotZeroBhk.map(l => ({ id: l.listing_id, prop: l.property_type, bhk: l.bedroom })));

console.log('\n=== Checking Other Potential Corrupt Categories ===');
// What about bathroom <= 0?
const zeroBath = listings.filter(l => l.bathroom <= 0 && l.property_type !== 'plot');
console.log(`Zero bath (non-plot): ${zeroBath.length}`);
if (zeroBath.length > 0) console.log(zeroBath.map(l => ({ id: l.listing_id, bath: l.bathroom })));

// What about price <= 0?
const zeroOrNegPrice = listings.filter(l => l.price <= 0);
console.log(`Price <= 0: ${zeroOrNegPrice.length}`);

// What about floor < 0?
const negFloor = listings.filter(l => l.floor < 0);
console.log(`Floor < 0: ${negFloor.length}`);

// What about carpet_area <= 0?
const negCarpet = listings.filter(l => l.carpet_area <= 0);
console.log(`Carpet <= 0: ${negCarpet.length}`);

// What about super_built_up_area <= 0?
const negSuper = listings.filter(l => l.super_built_up_area <= 0);
console.log(`Super <= 0: ${negSuper.length}`);

// Let's examine Fake Listings
console.log('\n=== Investigating Fake Listings ===');
// Sellers write descriptions or repeated phone numbers or suspicious patterns
// Let's check duplicate descriptions across different properties
const descCount = {};
for (const l of listings) {
  const d = l.description?.trim();
  if (d) {
    descCount[d] = (descCount[d] || 0) + 1;
  }
}
const dupDescs = Object.entries(descCount).filter(([_, c]) => c > 1);
console.log(`Descriptions appearing more than once: ${dupDescs.length}`);

// Check posted_by_contact
const contactCount = {};
for (const l of listings) {
  const c = l.posted_by_contact;
  if (c) {
    contactCount[c] = (contactCount[c] || 0) + 1;
  }
}
const topContacts = Object.entries(contactCount).sort((a, b) => b[1] - a[1]).slice(0, 20);
console.log('Top contact numbers count:', topContacts);

// Check phone numbers format
const weirdPhone = listings.filter(l => {
  const p = l.posted_by_contact;
  // standard Indian mobile: +91 followed by 10 digits
  return !/^\+91[6-9]\d{9}$/.test(p);
});
console.log(`Weird phone numbers: ${weirdPhone.length}`);
if (weirdPhone.length > 0) {
  const phoneSet = new Set(weirdPhone.map(l => l.posted_by_contact));
  console.log('Sample weird phone numbers:', [...phoneSet].slice(0, 10));
}

// Notice in statement.md:
// "9. fake_listing_ids: Some of these listings are not real. They exist to generate enquiries. List their listing_ids, sorted."
// Look at descriptions: do some descriptions contain keywords like "enquiry", "fake", "call", "urgent", or certain phrases?
const suspiciousWords = ['enquiry', 'inquiry', 'call for price', 'brokerage', 'contact for details', 'test', 'fake', 'sample'];
for (const word of suspiciousWords) {
  const matches = listings.filter(l => l.description && l.description.toLowerCase().includes(word));
  console.log(`Listings containing "${word}": ${matches.length}`);
}

// Let's check listing_url or website
const websiteCount = {};
for (const l of listings) {
  websiteCount[l.website] = (websiteCount[l.website] || 0) + 1;
}
console.log('Listings by website:', websiteCount);

// Check price anomalies (e.g. suspiciously low price like 1 rupee or 1000 rupees)
const cheapListings = listings.filter(l => l.price > 0 && l.price < 500000);
console.log(`Listings with price < 5 Lakhs: ${cheapListings.length}`);
if (cheapListings.length > 0) {
  console.log(cheapListings.map(l => ({ id: l.listing_id, price: l.price, type: l.property_type, desc: l.description })));
}

// Check carpet area units!
console.log('\n=== Investigating Carpet Area in Listings ===');
// Some listings have carpet_area like 154 (sq meters) and some 1540 (sqft)
// Let's see if website or property_type or locality determines it:
for (const ws of Object.keys(websiteCount)) {
  const wsListings = listings.filter(l => l.website === ws && l.property_type === 'apartment' && l.bedroom === 2);
  const avgCarpet = wsListings.reduce((sum, l) => sum + l.carpet_area, 0) / (wsListings.length || 1);
  console.log(`Website: ${ws}, 2BHK apt count: ${wsListings.length}, avg carpet_area: ${avgCarpet.toFixed(1)}`);
}
