import fs from 'node:fs';

const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));

console.log('=== Normalizing Project Prices to INR ===');

const projectsWithInr = projects.map(p => {
  // Convert price_max to INR:
  // If price_max >= 10, it's in Lakhs (1e5) -> price_inr = price_max * 1e5
  // If price_max < 10, it's in Crores (1e7) -> price_inr = price_max * 1e7
  const priceMaxInr = p.price_max >= 10 ? Math.round(p.price_max * 1e5) : Math.round(p.price_max * 1e7);
  const priceMinInr = p.price_min >= 10 ? Math.round(p.price_min * 1e5) : Math.round(p.price_min * 1e7);

  return {
    project_id: p.project_id,
    apartment_name: p.apartment_name,
    raw_price_min: p.price_min,
    raw_price_max: p.price_max,
    price_min_inr: priceMinInr,
    price_max_inr: priceMaxInr
  };
});

const sortedByInr = [...projectsWithInr].sort((a, b) => b.price_max_inr - a.price_max_inr);
console.log('\nTop 10 costliest projects in INR (converting Lakhs vs Crores):');
for (const p of sortedByInr.slice(0, 10)) {
  console.log(`- ${p.project_id} (${p.apartment_name}): raw_max=${p.raw_price_max}, inr=${p.price_max_inr} (${(p.price_max_inr / 1e7).toFixed(2)} Cr)`);
}

// What if price_max was assumed to be in Crores for all projects?
const sortedRawCrores = [...projects].sort((a, b) => b.price_max - a.price_max);
console.log('\nTop 5 projects if raw price_max is treated as Crores for all:');
for (const p of sortedRawCrores.slice(0, 5)) {
  console.log(`- ${p.project_id} (${p.apartment_name}): price_max=${p.price_max} -> ${(p.price_max * 1e7)} INR`);
}
