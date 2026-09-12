const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = 'IVY26-AD650B779304';
const PASSWORD = 'c42d10ad7b';

async function findExactEnds() {
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo1@ivy.homes', password: PASSWORD })
  });
  const { access_token } = await loginRes.json();
  const headers = { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${access_token}` };

  async function explore(endpoint) {
    console.log(`\n=== Finding end of ${endpoint} ===`);
    let offset = 0;
    const limit = 50;
    let allRecords = [];
    let pageNum = 0;

    while (true) {
      const res = await fetch(`${BASE_URL}${endpoint}?limit=${limit}&offset=${offset}`, { headers });
      const data = await res.json();
      const items = data.results || [];
      allRecords.push(...items);
      pageNum++;

      if (pageNum % 10 === 0 || !data.has_more || items.length < limit) {
        console.log(`Page ${pageNum}: offset=${data.offset}, returned=${items.length}, total_accum=${allRecords.length}, reported_total=${data.total}, has_more=${data.has_more}`);
      }

      if (!data.has_more || items.length === 0) {
        break;
      }
      offset += items.length;
    }

    // Verify all IDs are unique
    const idKey = endpoint.includes('projects') ? 'project_id' : 'listing_id';
    const idSet = new Set(allRecords.map(r => r[idKey]));
    console.log(`Finished ${endpoint}: total records fetched = ${allRecords.length}, unique IDs = ${idSet.size}`);
    return allRecords;
  }

  const listings = await explore('/v1/listings');
  const rentals = await explore('/v1/rentals');
  const projects = await explore('/v1/projects');

  return { listings, rentals, projects };
}

findExactEnds().catch(console.error);
