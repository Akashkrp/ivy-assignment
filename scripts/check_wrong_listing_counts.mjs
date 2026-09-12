import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));
const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));

const allCounts = {};
const liveCounts = {};

for (const l of listings) {
  if (l.project_id) {
    allCounts[l.project_id] = (allCounts[l.project_id] || 0) + 1;
    if (l.is_live) {
      liveCounts[l.project_id] = (liveCounts[l.project_id] || 0) + 1;
    }
  }
}

let wrongAllCount = 0;
let wrongLiveCount = 0;
let matchAllCount = 0;
let matchLiveCount = 0;

for (const p of projects) {
  const actualAll = allCounts[p.project_id] || 0;
  const actualLive = liveCounts[p.project_id] || 0;

  if (p.total_listings === actualAll) {
    matchAllCount++;
  } else {
    wrongAllCount++;
  }

  if (p.total_listings === actualLive) {
    matchLiveCount++;
  } else {
    wrongLiveCount++;
  }
}

console.log(`Total projects: ${projects.length}`);
console.log(`Comparison against ALL listings with project_id:`);
console.log(`- Matching: ${matchAllCount}, Wrong: ${wrongAllCount}`);

console.log(`\nComparison against LIVE listings with project_id:`);
console.log(`- Matching: ${matchLiveCount}, Wrong: ${wrongLiveCount}`);

// Inspect projects where total_listings matches actualLive vs actualAll
console.log('\nSample breakdown:');
for (const p of projects.slice(0, 15)) {
  const actualAll = allCounts[p.project_id] || 0;
  const actualLive = liveCounts[p.project_id] || 0;
  console.log(`Project ${p.project_id}: reported=${p.total_listings}, actualAll=${actualAll}, actualLive=${actualLive}`);
}
