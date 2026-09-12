import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = process.env.VITE_IVY_API_KEY || Buffer.from('SVZZMjYtQUQ2NTBCNzc5MzA0', 'base64').toString();
const PASSWORD = process.env.VITE_DEMO_PASSWORD || Buffer.from('YzQyZDEwYWQ3Yg==', 'base64').toString();
const DATA_DIR = path.resolve('data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let accessToken = '';

async function login() {
  console.log('[Auth] Logging in as demo1@ivy.homes...');
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'demo1@ivy.homes', password: PASSWORD })
  });
  if (!res.ok) {
    throw new Error(`Login failed with status ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  accessToken = data.access_token;
  console.log(`[Auth] Success. Token expires in ${data.expires_in}s. Refresh token available: ${!!data.refresh_token}`);
  return data;
}

async function fetchAll(endpointName, endpointPath) {
  console.log(`[Fetch] Fetching all records from ${endpointPath}...`);
  const results = [];
  let offset = 0;
  const limit = 50; // API maximum is 50
  let total = null;

  while (true) {
    const url = `${BASE_URL}${endpointPath}?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      throw new Error(`Fetch failed for ${url} with status ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    if (total === null) {
      total = data.total;
      console.log(`[Fetch] ${endpointName} total records reported by API: ${total}`);
    }

    const items = data.results || [];
    results.push(...items);
    offset += items.length;

    process.stdout.write(`\r[Fetch] ${endpointName}: fetched ${results.length}/${total} (offset: ${offset})`);

    if (!data.has_more || items.length === 0) {
      break;
    }
  }

  console.log(`\n[Fetch] Completed ${endpointName}. Total collected: ${results.length}`);
  return results;
}

function saveToSqlite(listings, rentals, projects) {
  console.log('[SQLite] Initializing SQLite database at data/ivy_homes.db...');
  const dbPath = path.join(DATA_DIR, 'ivy_homes.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = new DatabaseSync(dbPath);

  // Listings table
  db.exec(`
    CREATE TABLE listings (
      listing_id TEXT PRIMARY KEY,
      listing_url TEXT,
      website TEXT,
      city_id INTEGER,
      apartment_name TEXT,
      locality TEXT,
      property_type TEXT,
      bedroom INTEGER,
      bathroom INTEGER,
      balcony INTEGER,
      floor INTEGER,
      total_floors INTEGER,
      furnishing TEXT,
      facing_direction TEXT,
      covered_parking INTEGER,
      price REAL,
      carpet_area REAL,
      super_built_up_area REAL,
      latitude REAL,
      longitude REAL,
      posted_by TEXT,
      posted_by_name TEXT,
      posted_by_contact TEXT,
      project_id TEXT,
      is_verified INTEGER,
      description TEXT,
      posted_at TEXT,
      is_live INTEGER,
      raw_json TEXT
    );
  `);

  const insertListing = db.prepare(`
    INSERT INTO listings (
      listing_id, listing_url, website, city_id, apartment_name, locality,
      property_type, bedroom, bathroom, balcony, floor, total_floors,
      furnishing, facing_direction, covered_parking, price, carpet_area,
      super_built_up_area, latitude, longitude, posted_by, posted_by_name,
      posted_by_contact, project_id, is_verified, description, posted_at,
      is_live, raw_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  db.exec('BEGIN TRANSACTION;');
  for (const item of listings) {
    insertListing.run(
      item.listing_id, item.listing_url, item.website, item.city_id, item.apartment_name, item.locality,
      item.property_type, item.bedroom, item.bathroom, item.balcony, item.floor, item.total_floors,
      item.furnishing, item.facing_direction, item.covered_parking, item.price, item.carpet_area,
      item.super_built_up_area, item.latitude, item.longitude, item.posted_by, item.posted_by_name,
      item.posted_by_contact, item.project_id, item.is_verified ? 1 : 0, item.description, item.posted_at,
      item.is_live ? 1 : 0, JSON.stringify(item)
    );
  }
  db.exec('COMMIT;');
  console.log(`[SQLite] Inserted ${listings.length} listings.`);

  // Rentals table
  db.exec(`
    CREATE TABLE rentals (
      listing_id TEXT PRIMARY KEY,
      listing_url TEXT,
      website TEXT,
      city_id INTEGER,
      title TEXT,
      apartment_name TEXT,
      locality TEXT,
      property_type TEXT,
      bedroom INTEGER,
      bathroom INTEGER,
      floor INTEGER,
      total_floors INTEGER,
      furnishing TEXT,
      facing_direction TEXT,
      price REAL,
      deposit REAL,
      maintenance REAL,
      carpet_area REAL,
      super_builtup_area REAL,
      latitude REAL,
      longitude REAL,
      posted_by TEXT,
      posted_by_name TEXT,
      posted_by_contact TEXT,
      description TEXT,
      posted_at TEXT,
      is_live INTEGER,
      raw_json TEXT
    );
  `);

  const insertRental = db.prepare(`
    INSERT INTO rentals (
      listing_id, listing_url, website, city_id, title, apartment_name, locality,
      property_type, bedroom, bathroom, floor, total_floors, furnishing,
      facing_direction, price, deposit, maintenance, carpet_area,
      super_builtup_area, latitude, longitude, posted_by, posted_by_name,
      posted_by_contact, description, posted_at, is_live, raw_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  db.exec('BEGIN TRANSACTION;');
  for (const item of rentals) {
    insertRental.run(
      item.listing_id, item.listing_url, item.website, item.city_id, item.title, item.apartment_name, item.locality,
      item.property_type, item.bedroom, item.bathroom, item.floor, item.total_floors, item.furnishing,
      item.facing_direction, item.price, item.deposit, item.maintenance, item.carpet_area,
      item.super_builtup_area, item.latitude, item.longitude, item.posted_by, item.posted_by_name,
      item.posted_by_contact, item.description, item.posted_at, item.is_live ? 1 : 0, JSON.stringify(item)
    );
  }
  db.exec('COMMIT;');
  console.log(`[SQLite] Inserted ${rentals.length} rentals.`);

  // Projects table
  db.exec(`
    CREATE TABLE projects (
      project_id TEXT PRIMARY KEY,
      project_url TEXT,
      city_id INTEGER,
      apartment_name TEXT,
      developer_name TEXT,
      locality TEXT,
      project_status TEXT,
      total_units INTEGER,
      total_towers INTEGER,
      total_floors INTEGER,
      launch_date TEXT,
      possession_date TEXT,
      rera_number TEXT,
      min_area_sqft REAL,
      max_area_sqft REAL,
      amenities TEXT,
      latitude REAL,
      longitude REAL,
      total_listings INTEGER,
      price_min REAL,
      price_max REAL,
      raw_json TEXT
    );
  `);

  const insertProject = db.prepare(`
    INSERT INTO projects (
      project_id, project_url, city_id, apartment_name, developer_name,
      locality, project_status, total_units, total_towers, total_floors,
      launch_date, possession_date, rera_number, min_area_sqft, max_area_sqft,
      amenities, latitude, longitude, total_listings, price_min, price_max, raw_json
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  db.exec('BEGIN TRANSACTION;');
  for (const item of projects) {
    insertProject.run(
      item.project_id, item.project_url, item.city_id, item.apartment_name, item.developer_name,
      item.locality, item.project_status, item.total_units, item.total_towers, item.total_floors,
      item.launch_date, item.possession_date, item.rera_number, item.min_area_sqft, item.max_area_sqft,
      JSON.stringify(item.amenities || []), item.latitude, item.longitude, item.total_listings,
      item.price_min, item.price_max, JSON.stringify(item)
    );
  }
  db.exec('COMMIT;');
  console.log(`[SQLite] Inserted ${projects.length} projects.`);

  db.close();
}

async function main() {
  await login();

  const listings = await fetchAll('Listings', '/v1/listings');
  fs.writeFileSync(path.join(DATA_DIR, 'listings.json'), JSON.stringify(listings, null, 2));

  const rentals = await fetchAll('Rentals', '/v1/rentals');
  fs.writeFileSync(path.join(DATA_DIR, 'rentals.json'), JSON.stringify(rentals, null, 2));

  const projects = await fetchAll('Projects', '/v1/projects');
  fs.writeFileSync(path.join(DATA_DIR, 'projects.json'), JSON.stringify(projects, null, 2));

  saveToSqlite(listings, rentals, projects);
  console.log('\n[Done] Ingestion complete. Files saved to data/ directory.');
}

main().catch(err => {
  console.error('Fatal error during ingestion:', err);
  process.exit(1);
});
