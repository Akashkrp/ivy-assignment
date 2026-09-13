import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));

const groups = {
  negPrice: listings.filter(l => l.price < 0),
  tinyPrice: listings.filter(l => l.price > 0 && l.price < 50000),
  carpetGtSuper: listings.filter(l => l.carpet_area > l.super_built_up_area),
  floorGtTotal: listings.filter(l => l.total_floors > 0 && l.floor > l.total_floors),
  coordsSwapped: listings.filter(l => l.latitude > 50 && l.longitude < 20),
  zeroBhkNonPlot: listings.filter(l => l.bedroom <= 0 && l.property_type !== 'plot'),
  futureDate: listings.filter(l => l.posted_at > '2026-09-10T00:00:00')
};

console.log('2BHK Live count per group:');
for (const [name, list] of Object.entries(groups)) {
  const live2bhk = list.filter(l => l.is_live && l.bedroom === 2);
  console.log(`- ${name}: ${live2bhk.length} live 2BHK records`);
  if (live2bhk.length > 0) {
    console.log('  IDs:', live2bhk.map(l => l.listing_id));
  }
}
