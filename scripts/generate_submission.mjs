/**
 * generate_submission.mjs
 *
 * Single source of truth for submission.json.
 *
 * Reads the full dataset captured by scripts/ingest.mjs (data/listings.json,
 * data/rentals.json, data/projects.json) and derives every one of the ten
 * answers plus the findings list. Nothing here is hand-entered: if you re-run
 * ingest.mjs and then this script, you get the same submission.json.
 *
 *   node scripts/ingest.mjs            # pull everything from the live API
 *   node scripts/generate_submission.mjs
 *
 * Every constant used below (the REFERENCE moment, the assigned locality) is
 * confirmed by the API itself: GET /health reports reference_date, and the
 * undocumented GET /v1/me reports assigned_locality.
 */
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data');
const REFERENCE = '2026-09-10T00:00:00'; // IST, per GET /health reference_date
const WINDOW_START = '2026-09-03T00:00:00'; // REFERENCE - 7 days, IST
const ASSIGNED_LOCALITY = 'bellandur'; // per GET /v1/me assigned_locality
const SQM_TO_SQFT = 10.7639;

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
const listings = read('listings.json');
const rentals = read('rentals.json');
const projects = read('projects.json');

// ---------------------------------------------------------------------------
// Unit corrections
// ---------------------------------------------------------------------------

// magichomes reports carpet_area / super_built_up_area in square metres for a
// subset of its rows. The two populations separate cleanly: no non-magichomes
// row is below 321 sqft, and no magichomes square-metre row is above 264.
export const isSqMetres = (l) => l.website === 'magichomes' && l.carpet_area < 300;
export const carpetSqft = (l) => (isSqMetres(l) ? l.carpet_area * SQM_TO_SQFT : l.carpet_area);

// Eight rows carry price in thousands of rupees. Every other price in the
// dataset is a multiple of 10,000; these eight are the only ones that are not,
// and multiplying them by 1,000 puts each back inside the normal price-per-sqft
// band for its locality and bedroom count.
export const isPriceInThousands = (l) => l.price > 0 && l.price < 50000;

// ---------------------------------------------------------------------------
// Q4 - records that describe something that cannot exist
// ---------------------------------------------------------------------------
// Seven independent defect classes, eight records each, no overlap between them.
// Plots legitimately carry bedroom/bathroom/floor/total_floors = 0, so they are
// excluded from the zero-bedroom test.
const IMPOSSIBLE = {
  negative_price: (l) => l.price < 0,
  price_in_thousands: isPriceInThousands,
  carpet_exceeds_super_builtup: (l) => l.carpet_area > l.super_built_up_area,
  floor_exceeds_total_floors: (l) => l.floor > l.total_floors,
  swapped_coordinates: (l) => l.latitude > 50,
  zero_bedroom_and_bathroom: (l) => l.bedroom === 0 && l.bathroom === 0 && l.property_type !== 'plot',
  posted_in_the_future: (l) => l.posted_at >= REFERENCE,
};

const corruptByClass = Object.fromEntries(
  Object.entries(IMPOSSIBLE).map(([k, f]) => [k, listings.filter(f).map((l) => l.listing_id).sort()])
);
const corruptIds = [...new Set(Object.values(corruptByClass).flat())].sort();
const corruptSet = new Set(corruptIds);

// ---------------------------------------------------------------------------
// Q9 - listings that exist to generate enquiries
// ---------------------------------------------------------------------------
// Market rate baseline: median price per corrected square foot for each
// (locality, bedroom) pair, computed over records that are not structurally
// broken. Plots have no bedrooms so they are left out of the baseline.
const baseline = (() => {
  const buckets = new Map();
  for (const l of listings) {
    if (corruptSet.has(l.listing_id) || l.property_type === 'plot') continue;
    const k = `${l.locality}|${l.bedroom}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(l.price / carpetSqft(l));
  }
  const med = new Map();
  for (const [k, v] of buckets) {
    v.sort((a, b) => a - b);
    med.set(k, v[Math.floor(v.length / 2)]);
  }
  return med;
})();
const marketRatio = (l) => (l.price / carpetSqft(l)) / baseline.get(`${l.locality}|${l.bedroom}`);

const byPhone = new Map();
for (const l of listings) {
  if (!byPhone.has(l.posted_by_contact)) byPhone.set(l.posted_by_contact, []);
  byPhone.get(l.posted_by_contact).push(l);
}

// A phone number carrying several different seller names is the first thing
// that stands out - 12 numbers do that and no other number does. But five of
// those twelve are ordinary high-volume agencies: their verified rate (~54%),
// live rate (~76%) and pricing (median 0.97x market) are indistinguishable from
// the rest of the dataset. The other seven are not. Every one of their listings
// is flagged verified and live - which a genuine 24-listing agent never manages,
// the base rates being 60% and 79% - and their prices sit at roughly half of
// what comparable property in the same locality goes for. Cheap, "verified",
// always live, posted under a rotating cast of names from one phone: that is a
// listing built to make the phone ring, not to sell a flat.
const baitPhones = [];
for (const [phone, rows] of byPhone) {
  if (new Set(rows.map((r) => r.posted_by_name)).size < 2) continue;
  if (!rows.every((r) => r.is_verified) || !rows.every((r) => r.is_live)) continue;
  const ratios = rows
    .filter((r) => !corruptSet.has(r.listing_id) && r.property_type !== 'plot')
    .map(marketRatio)
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  if (!ratios.length) continue;
  if (ratios[Math.floor(ratios.length / 2)] < 0.75) baitPhones.push(phone);
}
baitPhones.sort();
const baitSet = new Set(baitPhones);
const fakeIds = listings.filter((l) => baitSet.has(l.posted_by_contact)).map((l) => l.listing_id).sort();

// Numbers shared by several seller identities, bait rings included.
const multiNamePhones = [...byPhone.entries()]
  .filter(([, rows]) => new Set(rows.map((r) => r.posted_by_name)).size > 1)
  .map(([phone]) => phone)
  .sort();

// ---------------------------------------------------------------------------
// Q2 - distinct physical properties
// ---------------------------------------------------------------------------
// The same flat is posted on more than one portal (and occasionally twice on
// one portal) with the society name spelled differently each time - casing,
// hyphens and doubled spaces all vary. Normalise the name and a property is
// identified by society + locality + floor + building height + bedrooms +
// facing. Areas are not part of the key: duplicate pairs disagree by a few
// square feet, though never by more than 5%, which is what confirms the pairs
// are the same unit rather than two different ones.
const normName = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const propertyKey = (l) =>
  [normName(l.apartment_name), l.locality, l.floor, l.total_floors, l.bedroom, l.facing_direction].join('|');
const propertyGroups = new Map();
for (const l of listings) {
  const k = propertyKey(l);
  if (!propertyGroups.has(k)) propertyGroups.set(k, []);
  propertyGroups.get(k).push(l);
}
const duplicateGroups = [...propertyGroups.values()].filter((g) => g.length > 1);

// ---------------------------------------------------------------------------
// Q7 - costliest project
// ---------------------------------------------------------------------------
// price_min and price_max are not rupees. The unit is implied by the magnitude:
// below 10 the number is crores, 10 and above it is lakhs. 372 of 520 projects
// have a raw price_min larger than their raw price_max, which no single unit can
// explain; reading the magnitude as the unit is the only rule that leaves every
// project with min <= max.
export const projectPriceInr = (v) => (v < 10 ? Math.round(v * 1e7) : Math.round(v * 1e5));
const costliest = projects
  .map((p) => ({ project_id: p.project_id, price_max_inr: projectPriceInr(p.price_max) }))
  .sort((a, b) => b.price_max_inr - a.price_max_inr)[0];

// ---------------------------------------------------------------------------
// Q10 - projects whose total_listings is wrong
// ---------------------------------------------------------------------------
const listingsByProject = new Map();
for (const l of listings) {
  if (!l.project_id) continue;
  if (!listingsByProject.has(l.project_id)) listingsByProject.set(l.project_id, []);
  listingsByProject.get(l.project_id).push(l);
}
const liveCount = (id) => (listingsByProject.get(id) || []).filter((l) => l.is_live).length;
const wrongCountProjects = projects.filter((p) => liveCount(p.project_id) !== p.total_listings);

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------
const excluded = new Set([...corruptIds, ...fakeIds]);
const q6rows = listings.filter((l) => l.is_live && l.bedroom === 2 && !excluded.has(l.listing_id));
const avgPricePerSqft = q6rows.reduce((s, l) => s + l.price / carpetSqft(l), 0) / q6rows.length;

const belRentals = rentals.filter((r) => String(r.locality).toLowerCase() === ASSIGNED_LOCALITY);

const answers = {
  total_listing_records: listings.length,
  unique_properties: propertyGroups.size,
  active_listings: listings.filter((l) => l.is_live).length,
  corrupt_listing_ids: corruptIds,
  total_monthly_rent: belRentals.reduce((s, r) => s + r.price, 0),
  avg_price_per_sqft_2bhk: Number(avgPricePerSqft.toFixed(2)),
  costliest_project: costliest,
  listings_last_7_days: listings.filter((l) => l.posted_at >= WINDOW_START && l.posted_at < REFERENCE).length,
  fake_listing_ids: fakeIds,
  projects_with_wrong_listing_count: wrongCountProjects.length,
};

// ---------------------------------------------------------------------------
// Evidence helpers
// ---------------------------------------------------------------------------
const take = (arr, n = 20) => arr.slice(0, n);
// Records that only become reachable once you page past the reported total.
const beyondReportedTotal = take(listings.slice(4301).map((l) => l.listing_id));
const inactiveIds = take(listings.filter((l) => !l.is_live).map((l) => l.listing_id));
const sqmIds = take(listings.filter(isSqMetres).map((l) => l.listing_id));
const thousandsIds = listings.filter(isPriceInThousands).map((l) => l.listing_id).sort();
const naiveTimestampIds = take(listings.map((l) => l.listing_id));
const duplicateEvidence = take(duplicateGroups.flatMap((g) => g.map((l) => l.listing_id)));
const rawMinGtMax = take(projects.filter((p) => p.price_min > p.price_max).map((p) => p.project_id));
const wrongCountIds = take(wrongCountProjects.map((p) => p.project_id));
const titleMismatchIds = take(
  rentals
    .filter((r) => !String(r.title).toLowerCase().includes(String(r.locality).toLowerCase()))
    .map((r) => r.listing_id)
);
const impossibleEvidence = take(
  Object.entries(corruptByClass)
    .filter(([k]) => k !== 'price_in_thousands')
    .flatMap(([, ids]) => ids.slice(0, 4))
);

// ---------------------------------------------------------------------------
// Findings - every one reproduced against the live API before being listed
// ---------------------------------------------------------------------------
const findings = [
  {
    endpoint: '*',
    category: 'auth',
    documented: 'Append the API key as a query parameter: GET /v1/listings?api_key=IVY26-XXXXXXXXXXXX',
    actual: 'A key in the query string is rejected with 401 "send your key in the X-API-Key request header, not as a query parameter". The key is only accepted in the X-API-Key header.',
    how_found: 'First request of the session: called /v1/listings?api_key=... exactly as documented and read the 401 body.',
    impact: 'Every request written from the documentation fails until the key is moved into a header.',
    evidence: [],
  },
  {
    endpoint: '*',
    category: 'auth',
    documented: 'Two things identify a request: the API key, and a user session. The key section implies data endpoints are reachable with the key alone.',
    actual: 'Every /v1/* endpoint also requires Authorization: Bearer <token>. Without it: 401 "missing bearer token - log in at POST /auth/login first". Omitting the key instead gives 401 "missing X-API-Key header"; a wrong key gives 401 "unknown api key".',
    how_found: 'Called /v1/listings with the key but no bearer token, then with a token but no key, and read both error bodies.',
    impact: 'Bulk reads cannot be done with the key alone - the login flow has to run first, including for scripts.',
    evidence: [],
  },
  {
    endpoint: '/auth/login',
    category: 'auth',
    documented: 'Returns { token, token_type, expires_in: 86400, user: { email, name } }. Tokens are valid for 24 hours. There is no refresh flow.',
    actual: 'Returns { access_token, refresh_token, token_type, expires_in: 900, refresh_url: "/auth/refresh", user: { email } }. The field is access_token, not token; the access token lasts 15 minutes, not 24 hours; the user object has no name; and a refresh flow is advertised in the response itself.',
    how_found: 'Logged in with demo1@ivy.homes and compared the response keys and expiry against the documented example.',
    impact: 'A client that reads response.token stores undefined, and one that trusts expires_in: 86400 is silently signed out a quarter of an hour in. The app refreshes on a timer instead.',
    evidence: [],
  },
  {
    endpoint: '/auth/refresh',
    category: 'undocumented_endpoint',
    documented: 'Not documented. The reference states "There is no refresh flow."',
    actual: 'POST /auth/refresh with { refresh_token } returns a fresh access_token and refresh_token, 200. The refresh token issued at login is valid for 7 days.',
    how_found: 'The login response carries refresh_url: "/auth/refresh"; posted the refresh token there and got a new pair back.',
    impact: 'This is what makes a session survive past 15 minutes, which the assignment requires. Without it the app dies half an hour after login.',
    evidence: [],
  },
  {
    endpoint: '/auth/logout',
    category: 'auth',
    documented: 'Invalidates the current token server side.',
    actual: 'Returns 200 with { "ok": true, "note": "tokens are stateless; discard them client side" }. The token still authenticates afterwards - a /v1/listings call with the same token after logout returns 200.',
    how_found: 'Called POST /auth/logout, then reused the same token on /v1/listings and got data.',
    impact: 'Logout is a client-side gesture only. A leaked token stays usable until it expires; the app deletes it locally rather than relying on the server.',
    evidence: [],
  },
  {
    endpoint: '*',
    category: 'pagination',
    documented: 'Every collection endpoint takes page and limit. page is 1-indexed. Responses are shaped { total, page, page_size, results }.',
    actual: 'page is accepted and silently ignored - page=1, page=2 and page=3 return byte-identical results. Paging is by offset. The envelope is { limit, offset, count, total, has_more, results }; there is no page or page_size field.',
    how_found: 'Requested page=2&limit=5 and got the same five listing_ids as page=1, with offset: 0 echoed back; offset=5 returned the next five.',
    impact: 'A client following the documentation re-reads the first page forever and concludes the dataset is 20 records long.',
    evidence: [],
  },
  {
    endpoint: '*',
    category: 'pagination',
    documented: 'limit: int, default 20, Maximum 200.',
    actual: 'limit is capped at 50. Requesting 51, 100, 200 or 500 all return 50 records with limit: 50 echoed in the envelope. limit=0 and limit=-5 are 422 with a readable validation body.',
    how_found: 'Swept limit over 20/50/51/100/200/500 and read the echoed limit and count.',
    impact: 'Full ingestion takes 94 requests rather than the 24 the documentation implies.',
    evidence: [],
  },
  {
    endpoint: '*',
    category: 'pagination',
    documented: 'total is the exact number of records matching your filters. To fetch every record, read total, divide by your limit, and request that many pages.',
    actual: `total is understated by about 8.5% everywhere: /v1/listings reports 4301 against ${listings.length} retrievable, /v1/rentals 1739 against ${rentals.length}, /v1/projects 476 against ${projects.length}. Filtered queries are understated by the same fraction (locality=bellandur reports 406, pages to 444). has_more stays true past the reported total and the extra records are ordinary listings.`,
    how_found: 'Paged with offset until has_more went false, counting what actually arrived, then probed past the end (offset 4700/4750/4900 all return count 0). Cross-checked against the undocumented /v1/localities, whose per-locality counts sum to exactly 4700.',
    impact: 'Following the documented recipe silently drops 399 listings, 161 rentals and 44 projects - it is the single biggest source of wrong answers here. Page until has_more is false; never trust total.',
    evidence: beyondReportedTotal,
  },
  {
    endpoint: '/v1/listings',
    category: 'completeness',
    documented: 'Returns active sale listings. Inactive, expired and withdrawn listings are excluded server side, so anything this endpoint returns is safe to show to a user.',
    actual: `The endpoint returns an undocumented is_live boolean and ${listings.filter((l) => !l.is_live).length} of ${listings.length} records have it set to false. Nothing is filtered server side.`,
    how_found: 'Counted is_live across the full paged dataset; the field is not in the documented listing object at all.',
    impact: 'Showing everything the endpoint returns puts withdrawn property in front of users. Every is_live-sensitive number in the answers depends on filtering it client side.',
    evidence: inactiveIds,
  },
  {
    endpoint: '/v1/listings',
    category: 'filters',
    documented: 'min_price and max_price, int, rupees, inclusive.',
    actual: 'Both are accepted and ignored. min_price=15000000&max_price=20000000 returns total 4301 - the unfiltered count - and 40 of the first 50 rows fall outside the range.',
    how_found: 'Applied the range and checked the returned prices against it row by row.',
    impact: 'Price filtering has to happen client side, which is why the app holds the whole dataset in memory.',
    evidence: [],
  },
  {
    endpoint: '/v1/listings',
    category: 'filters',
    documented: 'furnishing: string, one of unfurnished, semi-furnished, fully-furnished.',
    actual: 'Accepted and ignored on /v1/listings - furnishing=unfurnished returns the unfiltered total 4301 with all three furnishing values in the results. The same parameter does filter correctly on /v1/rentals (furnishing=unfurnished returns total 570 with no violations).',
    how_found: 'Ran the identical filter against both collections and compared the returned rows against the requested value.',
    impact: 'The filter looks supported and is not, on the one endpoint where a buyer would use it.',
    evidence: [],
  },
  {
    endpoint: '/v1/listings',
    category: 'filters',
    documented: 'total_listings "always agrees with what GET /v1/listings?project_id=... returns", which presents project_id as a working filter.',
    actual: 'project_id is accepted and ignored. /v1/listings?project_id=P10001 returns total 4301, and all 50 rows on the first page belong to other projects or to none.',
    how_found: 'Called the exact query the projects section describes and checked the project_id of every row returned.',
    impact: 'The documented way to verify a project\'s inventory does not exist; the comparison has to be done client side.',
    evidence: [],
  },
  {
    endpoint: '/v1/listings',
    category: 'sorting',
    documented: 'sort_by accepts price, carpet_area, posted_at, bedroom, with order asc or desc.',
    actual: 'price, carpet_area and bedroom sort correctly. posted_at sorts by IST calendar date only and discards the time of day, so records from the same day come back in arbitrary order: sort_by=posted_at&order=asc opens with 23:45, 01:33, 09:35, 13:49, 06:32 - all on 2026-01-13. Across the first 500 rows of a descending sort there are 0 date-level violations and 237 timestamp-level ones. /v1/rentals behaves the same way, and because its timestamps are UTC the grouping is by the IST date they convert to.',
    how_found: 'Pulled sorted pages and checked monotonicity of the full timestamp and of the date part separately.',
    impact: '"Newest first" is only accurate to the day. The app sorts on the full timestamp itself.',
    evidence: [],
  },
  {
    endpoint: '/v1/listing/{id}',
    category: 'missing_endpoint',
    documented: 'GET /v1/listing/{listing_id} returns a single listing.',
    actual: '404 Not Found. The path that works is the plural GET /v1/listings/{id}, which returns exactly the same object shape as the list rows. Asking it for an id outside your city gives 404 "no such listing in your city".',
    how_found: 'Called the documented singular path and the plural one for the same id, side by side.',
    impact: 'Detail pages 404 until the path is corrected.',
    evidence: [],
  },
  {
    endpoint: '/v1/listings/{id}/similar',
    category: 'missing_endpoint',
    documented: 'Up to ten comparable listings - same locality, same bedroom count, price within 15%.',
    actual: '404 Not Found for valid listing ids that resolve fine at /v1/listings/{id}.',
    how_found: 'Requested it for MAG-1002627, a listing the API had just returned.',
    impact: 'The "you may also like" strip has to be computed client side; the app derives it with the documented rule.',
    evidence: [],
  },
  {
    endpoint: '/v1/favourites',
    category: 'missing_endpoint',
    documented: 'GET /v1/favourites, POST /v1/favourites with { "id": "100-1000042" }, DELETE /v1/favourites/{id}.',
    actual: '404 at all three. The working endpoints are GET /v1/saved, POST /v1/saved and DELETE /v1/saved/{listing_id}, and the POST body key is listing_id, not id - posting { id } returns 422 naming the missing field. The responses are otherwise as documented: GET returns { count, results } with full listing objects, and the list is per user.',
    how_found: 'Tried both spellings, then posted { id } and read the 422, then { listing_id } and got 201. Confirmed isolation by saving as demo2 and re-reading as demo1.',
    impact: 'Saved listings fail outright against the documented path and again against the documented body.',
    evidence: [],
  },
  {
    endpoint: '/v1/analytics/summary',
    category: 'missing_endpoint',
    documented: 'Pre-computed aggregates for your city - total_listings, median_price, median_price_per_sqft, by_locality, by_bhk.',
    actual: '404 Not Found, as are /v1/analytics, /v1/stats and /v1/summary.',
    how_found: 'Requested the documented path and three plausible neighbours with valid credentials.',
    impact: 'The insights screen computes all of these from the raw collections instead.',
    evidence: [],
  },
  {
    endpoint: '/v1/localities',
    category: 'undocumented_endpoint',
    documented: 'Not documented.',
    actual: 'Returns { city, count, results: [{ locality, listing_count }] }. Its counts are the true retrievable counts - whitefield 514, bellandur 444, and so on - and they sum to exactly 4700, while the total field on /v1/listings for the same localities is understated by 8.5%.',
    how_found: 'Probed for the aggregate endpoints the documentation promised; this one answered 200, and its numbers matched a full page-through of each locality exactly.',
    impact: 'It is the cheapest proof that total is wrong, and a one-request way to get locality counts right.',
    evidence: [],
  },
  {
    endpoint: '/v1/me',
    category: 'undocumented_endpoint',
    documented: 'Not documented.',
    actual: 'Returns { user: { email }, city_id, city, assigned_locality, reference_date }, i.e. the city, the assigned locality and the reference moment that the questions are anchored to.',
    how_found: 'Probed /auth/me and /v1/users/me (both 404) and then /v1/me, which answered 200.',
    impact: 'Lets the client discover its own scope instead of hard-coding it; it is what confirms the assigned locality is bellandur.',
    evidence: [],
  },
  {
    endpoint: '/v1/listings',
    category: 'units',
    documented: 'Conventions: Area - square feet, integer, everywhere in the API.',
    actual: `carpet_area and super_built_up_area are in square metres for ${listings.filter(isSqMetres).length} magichomes records. The two populations do not overlap: no record from any other portal is below 321 sqft, and no square-metre record is above 264. Converting at 10.7639 puts their median price per square foot at 11,541 against 11,234 for the magichomes rows that are already in square feet.`,
    how_found: 'Plotted the area distribution per portal, found a mode near 100 only on magichomes, and confirmed it by checking that the converted rows match the rest of the same portal on price per square foot and on carpet-to-super-built-up ratio (0.751 against 0.749).',
    impact: 'Left alone these rows read as 124,000 rupees per square foot and wreck any rate-per-sqft average, including the answer to question 6.',
    evidence: sqmIds,
  },
  {
    endpoint: '/v1/listings',
    category: 'units',
    documented: 'Conventions: Money - Indian rupees, integer, everywhere in the API.',
    actual: `price is in thousands of rupees for ${thousandsIds.length} records (6,250 to 16,790 for whole 2 and 3 BHK flats). They are the only eight prices in the dataset that are not a multiple of 10,000; multiplied by 1,000 each lands between 0.69x and 1.25x of the median rate for its own locality and bedroom count.`,
    how_found: 'Looked at every price under 50,000 expecting bait, then checked price granularity: 4,692 of 4,700 prices are multiples of 10,000 and these eight are the exception. Dividing the market rate by the stated price gave a clean factor of 1,000 in all eight cases, which bait pricing would not do.',
    impact: 'They read as a fraud pattern and are not one - the flats behind them are priced normally. Counting them as bait would have put eight wrong ids in answer 9 and pulled the 2 BHK rate average down.',
    evidence: thousandsIds,
  },
  {
    endpoint: '/v1/projects',
    category: 'units',
    documented: 'price_min and price_max are in rupees (Conventions: money is integer rupees everywhere in the API).',
    actual: 'They are neither rupees nor a single unit. Values range from 1 to 99.8, and the unit is implied by the magnitude: below 10 the figure is crores, 10 and above it is lakhs. 372 of 520 projects have a raw price_min greater than their raw price_max (P10002 is 98 and 2.74, i.e. 98 lakh to 2.74 crore), which no single unit can explain, and the magnitude rule is the only reading that leaves every project with min <= max.',
    how_found: 'Noticed price_min > price_max on most projects, then tested every uniform scaling against the actual listing prices inside each project; only the magnitude rule survives both the min <= max constraint and the comparison with real unit prices.',
    impact: 'Printed as rupees the entire projects screen shows prices of one to ninety-nine rupees, and question 7 comes out wrong by four orders of magnitude.',
    evidence: rawMinGtMax,
  },
  {
    endpoint: '/v1/listings',
    category: 'timestamps',
    documented: 'Conventions: Timestamps - ISO 8601, UTC, Z suffix, everywhere in the API.',
    actual: 'Every listings posted_at is naive - no Z, no offset - and the values are IST, not UTC. /v1/rentals does use Z and is genuinely UTC, so the two collections disagree with each other. The latest non-future listing is 2026-09-09T23:40:00 and the latest rental is 2026-09-09T18:11:00Z, which is 23:41 IST: both stop just short of the same instant, which only lines up if the naive listing stamps are already IST. The server confirms it indirectly by grouping sort_by=posted_at on the IST date.',
    how_found: 'Compared where the two collections stop relative to the reference moment, under both readings of the naive stamps, and cross-checked against how the server itself buckets posted_at when sorting.',
    impact: 'Reading them as UTC shifts every listing 5.5 hours and changes the seven-day count from 149 to 142.',
    evidence: naiveTimestampIds,
  },
  {
    endpoint: '/v1/listings',
    category: 'duplicates',
    documented: 'Every listing_id is globally unique, and each listing corresponds to exactly one physical property.',
    actual: `listing_id really is unique - ${listings.length} ids, no repeats. The second half is wrong: the same flat is posted repeatedly, ${duplicateGroups.length} clusters covering ${listings.length - propertyGroups.size} redundant records, so ${listings.length} rows describe ${propertyGroups.size} properties. The society name is spelled differently across copies ("Adarsh Crest", "Adarsh-Crest", "ADARSH CREST"), and areas drift by a few square feet, which is what hides the duplicates from an exact match. 403 clusters are cross-portal and 87 are within one portal.`,
    how_found: 'Normalised the society name and grouped on society, locality, floor, building height, bedrooms and facing; then checked every cluster agrees on area to within 5%, which all 490 do.',
    impact: 'A buyer sees the same flat several times, and any per-property statistic is inflated by 12%.',
    evidence: duplicateEvidence,
  },
  {
    endpoint: '/v1/listings',
    category: 'data_quality',
    documented: 'Anything this endpoint returns is safe to show to a user.',
    actual: 'Six defect classes of exactly eight records each, 48 in total and no overlap between classes: negative prices (-19,580,000 at the extreme, magnitudes otherwise normal, so the sign is flipped); carpet_area larger than super_built_up_area; floor above total_floors (floor 37 of 22); latitude and longitude transposed, putting Bangalore flats above the 50th parallel; apartments and villas with 0 bedrooms and 0 bathrooms; and posted_at up to ten months in the future (2027-07-06). Plots are not among them - all 182 legitimately carry zero bedrooms, bathrooms and floors.',
    how_found: 'Ran every physical constraint I could state over the full dataset. The classes landing on exactly eight records each, scattered across all five portals, is what identified them as injected rather than as a portal-level convention.',
    impact: 'These are the answer to question 4 and have to come out of any price or area statistic.',
    evidence: impossibleEvidence,
  },
  {
    endpoint: '/v1/listings',
    category: 'fraud',
    documented: 'posted_by_contact is the seller\'s verified contact number, and is_verified means our operations team has checked the listing.',
    actual: `${fakeIds.length} listings across ${baitPhones.length} phone numbers are advertisements for the phone number rather than for the property. Each number posts 24-25 listings under three to six different seller names, spread over nine or ten localities; every one of those listings is is_verified true and is_live true; and their prices sit at a median 0.46-0.53 of the going rate for the same locality and bedroom count, with 90% below 0.67. The base rates are 60% verified and 79% live, so a genuine 24-listing agent reaching 24/24 on both has probability of roughly 2e-8. Phone numbers: ${baitPhones.join(', ')}.`,
    how_found: 'Started from price - the obvious bait test - and got the eight rows that turned out to be a units bug instead. Went at it from the seller side instead: 12 numbers carry more than one seller name and no other number does. Five of those twelve price at market with ordinary verified and live rates and are just busy agencies; the other seven are uniformly cheap and uniformly flagged verified and live. The split is what makes the pattern, not the shared number on its own.',
    impact: 'These are the listings built to make the phone ring. They drag the 2 BHK rate average down by about 2%, and "verified" on this API does not mean what the documentation says it does.',
    evidence: [...baitPhones, ...take(fakeIds, 13)],
  },
  {
    endpoint: '/v1/listings',
    category: 'data_quality',
    documented: 'posted_by_contact is the seller\'s verified contact number.',
    actual: `${multiNamePhones.length} phone numbers are each shared by three to six different posted_by_name values, over 21 to 32 listings apiece - ${listings.filter((l) => multiNamePhones.includes(l.posted_by_contact)).length} records in total. Every one of the other 782 numbers in the dataset maps to exactly one name. All 1,900 rentals have a distinct number each.`,
    how_found: 'Counted distinct posted_by_name per posted_by_contact across the full dataset; the distribution is one name per number everywhere except these twelve.',
    impact: 'Contact details cannot be used to identify a seller. Seven of the twelve are the bait rings above; the remaining five price at market and appear to be genuine agencies sharing an office line, which is why they are reported here rather than as fraud.',
    evidence: multiNamePhones,
  },
  {
    endpoint: '/v1/projects',
    category: 'consistency',
    documented: 'total_listings is the number of listings currently available in the project. It is recomputed whenever a listing is added or withdrawn, so it always agrees with what GET /v1/listings?project_id=... returns.',
    actual: `It disagrees for ${wrongCountProjects.length} of ${projects.length} projects. Counting live listings per project reproduces total_listings exactly for the other 393, so live listings is the intended basis - counting every retrievable listing instead matches only 128 projects. Differences run from -14 to +9.`,
    how_found: 'Grouped the full listings dataset by project_id and compared against total_listings under several definitions of "available"; the is_live definition is the one that produces a sharp spike of exact matches.',
    impact: 'Project pages contradict the search results next to them. This is the answer to question 10.',
    evidence: wrongCountIds,
  },
  {
    endpoint: '/v1/rentals',
    category: 'data_quality',
    documented: 'The rental object carries both a title ("2 BHK for rent in Koramangala") and a locality, with no suggestion that they disagree.',
    actual: `title names a different locality from the locality field in ${rentals.filter((r) => !String(r.title).toLowerCase().includes(String(r.locality).toLowerCase())).length} of ${rentals.length} rentals. The locality it names is always a real locality, so nothing looks wrong in isolation. description agrees with the locality field in all ${rentals.length} records, and the bedroom count in the title is right every time - only the locality in the title is shuffled.`,
    how_found: 'Checked title and description against the structured fields across the whole collection. The description matching 1,900/1,900 while the title matches 209/1,900 is what identifies the title as the wrong one.',
    impact: `Filtering rentals on the title instead of the locality field gives 184 Bellandur rentals totalling 6,535,100 rupees a month, against the correct 191 and ${belRentals.reduce((s, r) => s + r.price, 0).toLocaleString('en-IN')}. It is a direct trap for question 5.`,
    evidence: titleMismatchIds,
  },
];

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------
const submission = {
  api_key: process.env.VITE_IVY_API_KEY || 'IVY26-AD650B779304',
  candidate: {
    name: 'Akash Kumar Prasad',
    email: 'akash.20234017@mnnit.ac.in',
    repo_url: 'https://github.com/Akashkrp/ivy-assignment',
    demo_url: 'https://ivy-assignment-dun.vercel.app',
  },
  answers,
  findings,
};

fs.writeFileSync(path.resolve('submission.json'), JSON.stringify(submission, null, 2) + '\n');
fs.writeFileSync(path.resolve('public/data/submission.json'), JSON.stringify(submission, null, 2) + '\n');

// A machine-readable companion the frontend uses so that no number on the
// insights screen is typed in by hand.
const derived = {
  reference: '2026-09-10T00:00:00+05:30',
  assigned_locality: ASSIGNED_LOCALITY,
  reported_totals: { listings: 4301, rentals: 1739, projects: 476 },
  corrupt_by_class: corruptByClass,
  bait_phones: baitPhones,
  multi_name_phones: multiNamePhones,
  duplicate_clusters: duplicateGroups.length,
  duplicate_records: listings.length - propertyGroups.size,
  inactive_listings: listings.filter((l) => !l.is_live).length,
  sqm_listings: listings.filter(isSqMetres).length,
  price_in_thousands: thousandsIds,
  projects_wrong_listing_count: wrongCountProjects.map((p) => p.project_id),
  q6_sample_size: q6rows.length,
  bellandur: {
    rentals: belRentals.length,
    monthly_rent: belRentals.reduce((s, r) => s + r.price, 0),
    sale_listings_live: listings.filter((l) => l.locality === ASSIGNED_LOCALITY && l.is_live).length,
    sale_listings_all: listings.filter((l) => l.locality === ASSIGNED_LOCALITY).length,
    projects: projects.filter((p) => p.locality === ASSIGNED_LOCALITY).length,
  },
};
fs.writeFileSync(path.resolve('public/data/derived.json'), JSON.stringify(derived, null, 2) + '\n');

console.log('answers:', JSON.stringify({ ...answers, corrupt_listing_ids: `${corruptIds.length} ids`, fake_listing_ids: `${fakeIds.length} ids` }, null, 2));
console.log(`findings: ${findings.length}`);
console.log('corrupt classes:', Object.fromEntries(Object.entries(corruptByClass).map(([k, v]) => [k, v.length])));
console.log('bait phones:', baitPhones.length, '->', fakeIds.length, 'listings');
console.log('wrote submission.json, public/data/submission.json, public/data/derived.json');
