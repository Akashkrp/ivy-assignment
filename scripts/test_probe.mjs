const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = 'IVY26-AD650B779304';
const PASSWORD = 'c42d10ad7b';

async function probe() {
  console.log('--- 1. Testing Health ---');
  const healthRes = await fetch(`${BASE_URL}/health`);
  console.log('Health:', healthRes.status, await healthRes.json());

  console.log('\n--- 2. Testing Auth Login without API key ---');
  let loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo1@ivy.homes', password: PASSWORD })
  });
  console.log('Login (no key):', loginRes.status, await loginRes.json().catch(() => loginRes.text()));

  console.log('\n--- 2b. Testing Auth Login with API key in query ---');
  loginRes = await fetch(`${BASE_URL}/auth/login?api_key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo1@ivy.homes', password: PASSWORD })
  });
  const loginData = await loginRes.json().catch(() => ({}));
  console.log('Login (query key):', loginRes.status, loginData);

  console.log('\n--- 2c. Testing Auth Login with API key in x-api-key header ---');
  const loginResHeader = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({ email: 'demo1@ivy.homes', password: PASSWORD })
  });
  console.log('Login (header key):', loginResHeader.status, await loginResHeader.json().catch(() => ({})));

  console.log('\n--- 3. Testing GET /v1/listings ---');
  const listingsRes = await fetch(`${BASE_URL}/v1/listings?api_key=${API_KEY}`);
  console.log('Listings status:', listingsRes.status);
  const listingsData = await listingsRes.json().catch(() => ({}));
  console.log('Listings keys:', Object.keys(listingsData));
  if (listingsData.results) {
    console.log('Results length:', listingsData.results.length);
    console.log('First result keys:', Object.keys(listingsData.results[0] || {}));
    console.log('Pagination info:', {
      total: listingsData.total,
      page: listingsData.page,
      limit: listingsData.limit,
      page_size: listingsData.page_size,
      offset: listingsData.offset,
      has_more: listingsData.has_more,
      next_page: listingsData.next_page
    });
  } else {
    console.log('Response body:', listingsData);
  }

  console.log('\n--- 4. Testing GET /v1/rentals ---');
  const rentalsRes = await fetch(`${BASE_URL}/v1/rentals?api_key=${API_KEY}`);
  console.log('Rentals status:', rentalsRes.status);
  const rentalsData = await rentalsRes.json().catch(() => ({}));
  console.log('Rentals keys:', Object.keys(rentalsData));

  console.log('\n--- 5. Testing GET /v1/projects ---');
  const projectsRes = await fetch(`${BASE_URL}/v1/projects?api_key=${API_KEY}`);
  console.log('Projects status:', projectsRes.status);
  const projectsData = await projectsRes.json().catch(() => ({}));
  console.log('Projects keys:', Object.keys(projectsData));

  console.log('\n--- 6. Testing GET /v1/analytics/summary ---');
  const analyticsRes = await fetch(`${BASE_URL}/v1/analytics/summary?api_key=${API_KEY}`);
  console.log('Analytics status:', analyticsRes.status);
  const analyticsData = await analyticsRes.json().catch(() => ({}));
  console.log('Analytics data:', analyticsData);
}

probe().catch(console.error);
