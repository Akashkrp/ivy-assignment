import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));

const hours = new Array(24).fill(0);
for (const l of listings) {
  const h = parseInt(l.posted_at.split('T')[1].split(':')[0], 10);
  hours[h]++;
}

console.log('Hourly distribution of posted_at in listings (0 to 23):');
for (let i = 0; i < 24; i++) {
  console.log(`Hour ${i.toString().padStart(2, '0')}: ${hours[i]} listings`);
}
