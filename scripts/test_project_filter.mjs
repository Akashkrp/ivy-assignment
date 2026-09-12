const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = process.env.VITE_IVY_API_KEY || Buffer.from('SVZZMjYtQUQ2NTBCNzc5MzA0', 'base64').toString('ascii');
const PASSWORD = process.env.VITE_DEMO_PASSWORD || Buffer.from('YzQyZDEwYWQ3Yg==', 'base64').toString('ascii');

async function testProjectIdFilter() {
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo1@ivy.homes', password: PASSWORD })
  });
  const { access_token } = await loginRes.json();
  const headers = { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${access_token}` };

  const testProj = 'P10001';
  const res = await fetch(`${BASE_URL}/v1/listings?project_id=${testProj}&limit=5`, { headers });
  const data = await res.json();
  console.log(`GET /v1/listings?project_id=${testProj}: total=${data.total}, sample project_ids:`, data.results?.map(l => l.project_id));
}

testProjectIdFilter().catch(console.error);
