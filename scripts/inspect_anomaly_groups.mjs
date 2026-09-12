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

console.log('=== Full Details of Anomaly Groups ===\n');

for (const [name, list] of Object.entries(groups)) {
  console.log(`--- Group: ${name} (${list.length} records) ---`);
  for (const l of list) {
    console.log(JSON.stringify({
      id: l.listing_id,
      ws: l.website,
      apt: l.apartment_name,
      loc: l.locality,
      type: l.property_type,
      bhk: l.bedroom,
      bath: l.bathroom,
      floor: l.floor,
      tot_floor: l.total_floors,
      carpet: l.carpet_area,
      super: l.super_built_up_area,
      lat: l.latitude,
      lon: l.longitude,
      price: l.price,
      posted_by: l.posted_by,
      contact: l.posted_by_contact,
      posted_at: l.posted_at,
      desc: l.description?.slice(0, 60)
    }));
  }
  console.log('');
}
