const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = 'IVY26-AD650B779304';
const PASSWORD = 'c42d10ad7b';

async function testParams() {
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo1@ivy.homes', password: PASSWORD })
  });
  const { access_token } = await loginRes.json();
  const headers = { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${access_token}` };

  console.log('--- Test Limit values ---');
  for (const lim of [20, 50, 100, 200, 500, 1000]) {
    const res = await fetch(`${BASE_URL}/v1/listings?limit=${lim}`, { headers });
    const data = await res.json();
    console.log(`limit=${lim}: status=${res.status}, returned count=${data.count || data.results?.length}, limit_in_resp=${data.limit}`);
  }

  console.log('\n--- Test Pagination parameters (page vs offset) ---');
  const resPage = await fetch(`${BASE_URL}/v1/listings?page=2&limit=5`, { headers });
  const dataPage = await resPage.json();
  console.log('page=2, limit=5:', { offset: dataPage.offset, first_id: dataPage.results?.[0]?.listing_id });

  const resOffset = await fetch(`${BASE_URL}/v1/listings?offset=5&limit=5`, { headers });
  const dataOffset = await resOffset.json();
  console.log('offset=5, limit=5:', { offset: dataOffset.offset, first_id: dataOffset.results?.[0]?.listing_id });

  console.log('\n--- Test Filters on /v1/listings ---');
  // Locality
  const resLoc = await fetch(`${BASE_URL}/v1/listings?locality=bellandur&limit=5`, { headers });
  const dataLoc = await resLoc.json();
  console.log('Filter locality=bellandur: total=', dataLoc.total, 'sample localities=', dataLoc.results?.map(r => r.locality));

  // BHK
  const resBhk = await fetch(`${BASE_URL}/v1/listings?bhk=2&limit=5`, { headers });
  const dataBhk = await resBhk.json();
  console.log('Filter bhk=2: total=', dataBhk.total, 'sample bedrooms=', dataBhk.results?.map(r => r.bedroom));

  // bedroom param (undocumented?)
  const resBed = await fetch(`${BASE_URL}/v1/listings?bedroom=2&limit=5`, { headers });
  const dataBed = await resBed.json();
  console.log('Filter bedroom=2: total=', dataBed.total, 'sample bedrooms=', dataBed.results?.map(r => r.bedroom));

  // Furnishing
  const resFurn = await fetch(`${BASE_URL}/v1/listings?furnishing=fully-furnished&limit=5`, { headers });
  const dataFurn = await resFurn.json();
  console.log('Filter furnishing=fully-furnished: total=', dataFurn.total, 'sample furnishing=', dataFurn.results?.map(r => r.furnishing));

  // min_price & max_price
  const resPrice = await fetch(`${BASE_URL}/v1/listings?min_price=10000000&max_price=15000000&limit=5`, { headers });
  const dataPrice = await resPrice.json();
  console.log('Filter price 10M-15M: total=', dataPrice.total, 'sample prices=', dataPrice.results?.map(r => r.price));

  // sort_by & order
  const resSortPrice = await fetch(`${BASE_URL}/v1/listings?sort_by=price&order=asc&limit=5`, { headers });
  const dataSortPrice = await resSortPrice.json();
  console.log('Sort by price asc: prices=', dataSortPrice.results?.map(r => r.price));

  const resSortPriceDesc = await fetch(`${BASE_URL}/v1/listings?sort_by=price&order=desc&limit=5`, { headers });
  const dataSortPriceDesc = await resSortPriceDesc.json();
  console.log('Sort by price desc: prices=', dataSortPriceDesc.results?.map(r => r.price));

  // Saved endpoints test
  console.log('\n--- Test /v1/saved methods ---');
  const getSaved = await fetch(`${BASE_URL}/v1/saved`, { headers });
  console.log('GET /v1/saved:', await getSaved.json());

  const sampleListingId = dataPage.results[0].listing_id;
  console.log('Testing POST /v1/saved with id:', sampleListingId);
  const postSaved = await fetch(`${BASE_URL}/v1/saved`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ listing_id: sampleListingId })
  });
  console.log('POST /v1/saved {listing_id}:', postSaved.status, await postSaved.json().catch(() => ({})));

  const postSavedDocId = await fetch(`${BASE_URL}/v1/saved`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: sampleListingId })
  });
  console.log('POST /v1/saved {id}:', postSavedDocId.status, await postSavedDocId.json().catch(() => ({})));
}

testParams().catch(console.error);
