const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = process.env.VITE_IVY_API_KEY || Buffer.from('SVZZMjYtQUQ2NTBCNzc5MzA0', 'base64').toString('ascii');
const PASSWORD = process.env.VITE_DEMO_PASSWORD || Buffer.from('YzQyZDEwYWQ3Yg==', 'base64').toString('ascii');

async function checkEnd() {
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo1@ivy.homes', password: PASSWORD })
  });
  const { access_token } = await loginRes.json();
  const headers = { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${access_token}` };

  for (const off of [4250, 4300, 4350, 4400]) {
    const res = await fetch(`${BASE_URL}/v1/listings?limit=50&offset=${off}`, { headers });
    const data = await res.json();
    console.log(`offset ${off}: total=${data.total}, offset=${data.offset}, count=${data.count}, has_more=${data.has_more}, results_len=${data.results?.length}`);
  }

  // Check Rentals
  console.log('\n--- Rentals End ---');
  for (const off of [1700, 1739, 1750, 1800]) {
    const res = await fetch(`${BASE_URL}/v1/rentals?limit=50&offset=${off}`, { headers });
    const data = await res.json();
    console.log(`rentals offset ${off}: total=${data.total}, offset=${data.offset}, count=${data.count}, has_more=${data.has_more}, results_len=${data.results?.length}`);
  }

  // Check Projects
  console.log('\n--- Projects End ---');
  for (const off of [450, 476, 500, 550]) {
    const res = await fetch(`${BASE_URL}/v1/projects?limit=50&offset=${off}`, { headers });
    const data = await res.json();
    console.log(`projects offset ${off}: total=${data.total}, offset=${data.offset}, count=${data.count}, has_more=${data.has_more}, results_len=${data.results?.length}`);
  }
}

checkEnd().catch(console.error);
