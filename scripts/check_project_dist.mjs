import fs from 'node:fs';

const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));
const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));

console.log('=== Checking all project price distributions ===');
const pmax = projects.map(p => p.price_max).sort((a, b) => a - b);
console.log('Min price_max:', pmax[0], 'Max price_max:', pmax[pmax.length - 1]);

const under10 = projects.filter(p => p.price_max < 10);
const over10 = projects.filter(p => p.price_max >= 10);

console.log(`Projects with price_max < 10 (Crores?): ${under10.length}`);
console.log(`Projects with price_max >= 10 (Lakhs?): ${over10.length}`);

console.log('\nSample under 10:');
for (const p of under10.slice(0, 5)) {
  const l = listings.filter(x => x.project_id === p.project_id);
  console.log(`- ${p.project_id} (${p.apartment_name}): price_min=${p.price_min}, price_max=${p.price_max}, listing prices=${l.map(x => x.price).slice(0, 3)}`);
}

console.log('\nSample over 10:');
for (const p of over10.slice(0, 5)) {
  const l = listings.filter(x => x.project_id === p.project_id);
  console.log(`- ${p.project_id} (${p.apartment_name}): price_min=${p.price_min}, price_max=${p.price_max}, listing prices=${l.map(x => x.price).slice(0, 3)}`);
}
