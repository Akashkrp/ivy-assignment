const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = process.env.VITE_IVY_API_KEY || Buffer.from('SVZZMjYtQUQ2NTBCNzc5MzA0', 'base64').toString('ascii');
const PASSWORD = process.env.VITE_DEMO_PASSWORD || Buffer.from('YzQyZDEwYWQ3Yg==', 'base64').toString('ascii');

async function testWithAuth() {
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'demo1@ivy.homes', password: PASSWORD })
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token;
  console.log('Got token:', token.slice(0, 30) + '...');

  const headers = {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${token}`
  };

  // 1. Listings
  console.log('\n--- 1. Testing GET /v1/listings ---');
  const listingsRes = await fetch(`${BASE_URL}/v1/listings`, { headers });
  console.log('Listings status:', listingsRes.status);
  const listings = await listingsRes.json();
  console.log('Listings top keys:', Object.keys(listings));
  console.log('Listings pagination info:', {
    total: listings.total,
    page: listings.page,
    limit: listings.limit,
    page_size: listings.page_size,
    offset: listings.offset,
    has_more: listings.has_more,
    next: listings.next,
    count: listings.count,
    results_len: listings.results?.length,
    items_len: listings.items?.length
  });
  const firstListing = (listings.results || listings.items || listings.data || listings)[0];
  console.log('First listing:', JSON.stringify(firstListing, null, 2));

  // 2. Rentals
  console.log('\n--- 2. Testing GET /v1/rentals ---');
  const rentalsRes = await fetch(`${BASE_URL}/v1/rentals`, { headers });
  console.log('Rentals status:', rentalsRes.status);
  const rentals = await rentalsRes.json();
  console.log('Rentals top keys:', Object.keys(rentals));
  console.log('Rentals pagination info:', {
    total: rentals.total,
    page: rentals.page,
    limit: rentals.limit,
    page_size: rentals.page_size,
    offset: rentals.offset,
    has_more: rentals.has_more
  });
  const firstRental = (rentals.results || rentals.items || rentals.data || rentals)[0];
  console.log('First rental:', JSON.stringify(firstRental, null, 2));

  // 3. Projects
  console.log('\n--- 3. Testing GET /v1/projects ---');
  const projectsRes = await fetch(`${BASE_URL}/v1/projects`, { headers });
  console.log('Projects status:', projectsRes.status);
  const projects = await projectsRes.json();
  console.log('Projects top keys:', Object.keys(projects));
  console.log('Projects pagination info:', {
    total: projects.total,
    page: projects.page,
    limit: projects.limit,
    page_size: projects.page_size,
    offset: projects.offset,
    has_more: projects.has_more
  });
  const firstProject = (projects.results || projects.items || projects.data || projects)[0];
  console.log('First project:', JSON.stringify(firstProject, null, 2));

  // 4. Test OpenAPI / docs / Swagger
  console.log('\n--- 4. Testing OpenAPI / Docs endpoints ---');
  const docEndpoints = ['/docs', '/openapi.json', '/api-docs', '/swagger.json', '/v1/docs'];
  for (const ep of docEndpoints) {
    const res = await fetch(`${BASE_URL}${ep}`, { headers });
    console.log(`${ep}:`, res.status);
  }

  // 5. Test Favourites variants
  console.log('\n--- 5. Testing Favourites variants ---');
  const favEndpoints = [
    '/v1/favourites',
    '/v1/favorites',
    '/favourites',
    '/favorites',
    '/v1/saved',
    '/v1/saved-listings',
    '/v1/users/me/favourites',
    '/v1/users/me/favorites'
  ];
  for (const ep of favEndpoints) {
    const res = await fetch(`${BASE_URL}${ep}`, { headers });
    console.log(`${ep}:`, res.status, res.status === 200 ? await res.json() : '');
  }

  // 6. Test Analytics variants
  console.log('\n--- 6. Testing Analytics variants ---');
  const anaEndpoints = [
    '/v1/analytics/summary',
    '/v1/analytics',
    '/analytics/summary',
    '/analytics',
    '/v1/market-summary',
    '/v1/insights',
    '/v1/overview',
    '/v1/metrics'
  ];
  for (const ep of anaEndpoints) {
    const res = await fetch(`${BASE_URL}${ep}`, { headers });
    console.log(`${ep}:`, res.status, res.status === 200 ? await res.json() : '');
  }

  // 7. Single listing & similar
  if (firstListing) {
    const id = firstListing.listing_id;
    console.log('\n--- 7. Testing Listing Detail for id:', id);
    const s1 = await fetch(`${BASE_URL}/v1/listing/${id}`, { headers });
    console.log('GET /v1/listing/{id}:', s1.status, s1.status === 200 ? 'OK' : await s1.text());
    const s2 = await fetch(`${BASE_URL}/v1/listings/${id}`, { headers });
    console.log('GET /v1/listings/{id}:', s2.status, s2.status === 200 ? 'OK' : await s2.text());
    const s3 = await fetch(`${BASE_URL}/v1/listings/${id}/similar`, { headers });
    console.log('GET /v1/listings/{id}/similar:', s3.status, s3.status === 200 ? 'OK' : await s3.text());
  }
}

testWithAuth().catch(console.error);
