const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = process.env.VITE_IVY_API_KEY || Buffer.from('SVZZMjYtQUQ2NTBCNzc5MzA0', 'base64').toString('ascii');
const PASSWORD = process.env.VITE_DEMO_PASSWORD || Buffer.from('YzQyZDEwYWQ3Yg==', 'base64').toString('ascii');

async function deepProbe() {
  const headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  };

  console.log('--- 1. Login & Token Refresh Probe ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: 'demo1@ivy.homes', password: PASSWORD })
  });
  const loginData = await loginRes.json();
  console.log('Login result:', loginData);

  const accessToken = loginData.access_token;
  const refreshToken = loginData.refresh_token;

  console.log('\n--- 1b. Test Refresh Token endpoint ---');
  const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  console.log('Refresh status:', refreshRes.status, await refreshRes.json().catch(() => ({})));

  const authHeaders = {
    ...headers,
    'Authorization': `Bearer ${accessToken}`
  };

  console.log('\n--- 2. GET /v1/listings (with X-API-Key only vs with Auth) ---');
  const listingsResKeyOnly = await fetch(`${BASE_URL}/v1/listings`, { headers });
  console.log('Listings (Key only) status:', listingsResKeyOnly.status);
  const listingsData = await listingsResKeyOnly.json();
  console.log('Listings keys:', Object.keys(listingsData));
  console.log('Listings metadata:', {
    total: listingsData.total,
    count: listingsData.count,
    page: listingsData.page,
    limit: listingsData.limit,
    page_size: listingsData.page_size,
    offset: listingsData.offset,
    has_more: listingsData.has_more,
    next: listingsData.next,
    results_len: listingsData.results?.length,
    items_len: listingsData.items?.length,
    data_len: listingsData.data?.length
  });
  console.log('Listings raw keys in response:', JSON.stringify(listingsData).slice(0, 300));
  if (listingsData.results && listingsData.results.length > 0) {
    console.log('First listing keys:', Object.keys(listingsData.results[0]));
    console.log('Sample listing record:\n', JSON.stringify(listingsData.results[0], null, 2));
  }

  console.log('\n--- 3. GET /v1/rentals ---');
  const rentalsRes = await fetch(`${BASE_URL}/v1/rentals`, { headers });
  console.log('Rentals status:', rentalsRes.status);
  const rentalsData = await rentalsRes.json();
  console.log('Rentals keys:', Object.keys(rentalsData));
  if (rentalsData.results && rentalsData.results.length > 0) {
    console.log('First rental keys:', Object.keys(rentalsData.results[0]));
    console.log('Sample rental record:\n', JSON.stringify(rentalsData.results[0], null, 2));
  }

  console.log('\n--- 4. GET /v1/projects ---');
  const projectsRes = await fetch(`${BASE_URL}/v1/projects`, { headers });
  console.log('Projects status:', projectsRes.status);
  const projectsData = await projectsRes.json();
  console.log('Projects keys:', Object.keys(projectsData));
  if (projectsData.results && projectsData.results.length > 0) {
    console.log('First project keys:', Object.keys(projectsData.results[0]));
    console.log('Sample project record:\n', JSON.stringify(projectsData.results[0], null, 2));
  }

  console.log('\n--- 5. Testing Analytics Endpoints ---');
  const candidateAnalyticsEndpoints = [
    '/v1/analytics/summary',
    '/v1/analytics',
    '/analytics/summary',
    '/analytics',
    '/v1/summary',
    '/v1/stats'
  ];
  for (const ep of candidateAnalyticsEndpoints) {
    const res = await fetch(`${BASE_URL}${ep}`, { headers: authHeaders });
    console.log(`Endpoint ${ep}:`, res.status, res.status === 200 ? await res.json() : await res.text());
  }

  console.log('\n--- 6. Testing Favourites Endpoints ---');
  const favRes = await fetch(`${BASE_URL}/v1/favourites`, { headers: authHeaders });
  console.log('GET /v1/favourites:', favRes.status, await favRes.json().catch(() => ({})));

  console.log('\n--- 7. Testing Listing Detail endpoints ---');
  if (listingsData.results && listingsData.results.length > 0) {
    const sampleId = listingsData.results[0].listing_id;
    console.log(`Testing detail for id ${sampleId}`);
    const resSingular = await fetch(`${BASE_URL}/v1/listing/${sampleId}`, { headers });
    console.log('GET /v1/listing/{id}:', resSingular.status, await resSingular.text());
    const resPlural = await fetch(`${BASE_URL}/v1/listings/${sampleId}`, { headers });
    console.log('GET /v1/listings/{id}:', resPlural.status, (await resPlural.text()).slice(0, 150));

    const resSimilar = await fetch(`${BASE_URL}/v1/listings/${sampleId}/similar`, { headers });
    console.log('GET /v1/listings/{id}/similar:', resSimilar.status, await resSimilar.text());
  }
}

deepProbe().catch(console.error);
