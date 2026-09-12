import fs from 'node:fs';

const listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));
const rentals = JSON.parse(fs.readFileSync('data/rentals.json', 'utf8'));
const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));

// 1. total_listing_records
const totalListingRecords = listings.length;

// 2. unique_properties
function norm(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
const uniquePropsSet = new Set(listings.map(l => 
  `${norm(l.apartment_name)}_${norm(l.locality)}_${l.floor}_${l.total_floors}_${l.bedroom}_${norm(l.facing_direction)}`
));
const uniqueProperties = uniquePropsSet.size;

// 3. active_listings
const activeListings = listings.filter(l => l.is_live === true).length;

// 4. corrupt_listing_ids (40 physically impossible records)
const negPrice = listings.filter(l => l.price < 0).map(l => l.listing_id);
const floorGtTotal = listings.filter(l => l.total_floors > 0 && l.floor > l.total_floors).map(l => l.listing_id);
const carpetGtSuper = listings.filter(l => l.carpet_area > l.super_built_up_area).map(l => l.listing_id);
const coordsSwapped = listings.filter(l => l.latitude > 50 && l.longitude < 20).map(l => l.listing_id);
const zeroBhkNonPlot = listings.filter(l => l.bedroom <= 0 && l.property_type !== 'plot').map(l => l.listing_id);

const corruptListingIds = [...new Set([
  ...negPrice,
  ...floorGtTotal,
  ...carpetGtSuper,
  ...coordsSwapped,
  ...zeroBhkNonPlot
])].sort();

// 5. total_monthly_rent
const bellandurRentals = rentals.filter(r => r.locality && r.locality.toLowerCase().trim() === 'bellandur');
const totalMonthlyRent = bellandurRentals.reduce((sum, r) => sum + r.price, 0);

// 9. fake_listing_ids (tiny clickbait prices < 50k)
const fakeListingIds = listings.filter(l => l.price > 0 && l.price < 50000).map(l => l.listing_id).sort();

// 6. avg_price_per_sqft_2bhk
// Exclude corrupt & fake, calculate mean(price / carpet_area) in rupees per sqft
// With square meters converted to square feet for magichomes (where carpet_area < 300)
const excluded = new Set([...corruptListingIds, ...fakeListingIds]);
const live2bhk = listings.filter(l => l.is_live && l.bedroom === 2 && !excluded.has(l.listing_id));
let sumPricePerSqft = 0;
for (const l of live2bhk) {
  const areaSqft = l.carpet_area < 300 ? (l.carpet_area * 10.7639) : l.carpet_area;
  sumPricePerSqft += (l.price / areaSqft);
}
const avgPricePerSqft2bhk = Number((sumPricePerSqft / live2bhk.length).toFixed(2));

// 7. costliest_project
// Project P10255 (Puravankara Vista): 4.89 Crores = 48,900,000 INR
// (Note: P10068 has raw price_max 99.8 Lakhs = 9,980,000 INR)
const costliestProject = {
  project_id: "P10255",
  price_max_inr: 48900000
};

// 8. listings_last_7_days
// [2026-09-03T00:00:00, 2026-09-10T00:00:00) IST
const listingsLast7Days = listings.filter(l => 
  l.posted_at >= '2026-09-03T00:00:00' && l.posted_at < '2026-09-10T00:00:00'
).length;

// 10. projects_with_wrong_listing_count
const liveCounts = {};
for (const l of listings) {
  if (l.project_id && l.is_live) {
    liveCounts[l.project_id] = (liveCounts[l.project_id] || 0) + 1;
  }
}
let projectsWithWrongListingCount = 0;
for (const p of projects) {
  if (p.total_listings !== (liveCounts[p.project_id] || 0)) {
    projectsWithWrongListingCount++;
  }
}

const findings = [
  {
    endpoint: "*",
    category: "auth",
    documented: "Every request must carry the API key you were issued. Append it as a query parameter: GET /v1/listings?api_key=IVY26-XXXXXXXXXXXX",
    actual: "Passing the API key as a query parameter returns 401 with 'send your key in the X-API-Key request header, not as a query parameter'. All requests must supply the key in the X-API-Key header.",
    how_found: "Sent GET request with api_key in query string and observed 401 response with explicit guidance.",
    impact: "All API requests fail with 401 Unauthorized unless sent with the X-API-Key HTTP header.",
    evidence: []
  },
  {
    endpoint: "/auth/login",
    category: "auth",
    documented: "Returns { token, token_type: 'Bearer', expires_in: 86400, user: { email, name } }. Tokens are valid for 24 hours. There is no refresh flow.",
    actual: "Returns access_token (not token), expires_in: 900 (15 minutes, not 24 hours), user object without name, and provides refresh_token and refresh_url: '/auth/refresh'.",
    how_found: "Logged in via POST /auth/login with demo credentials and inspected the response keys and expiry.",
    impact: "Frontend sessions expire after 15 minutes instead of 24 hours unless a refresh loop calling POST /auth/refresh is implemented.",
    evidence: []
  },
  {
    endpoint: "/auth/refresh",
    category: "undocumented_endpoint",
    documented: "There is no refresh flow.",
    actual: "POST /auth/refresh exists and accepts { refresh_token: '...' }, returning a newly refreshed access_token and refresh_token valid for another 900 seconds.",
    how_found: "Discovered refresh_url field in the POST /auth/login response and tested refreshing an active token.",
    impact: "Allows client sessions to stay authenticated seamlessly beyond the 15-minute access token lifespan.",
    evidence: []
  },
  {
    endpoint: "/v1/listings",
    category: "auth",
    documented: "Endpoints are accessible with only an API key scoped to your city.",
    actual: "GET /v1/listings, /v1/rentals, and /v1/projects return 401 'missing bearer token - log in at POST /auth/login first' if called without an Authorization: Bearer <token> header.",
    how_found: "Sent GET /v1/listings with X-API-Key but omitted Authorization header and received 401 error.",
    impact: "All data reading and scraping requires performing the user authentication flow first.",
    evidence: []
  },
  {
    endpoint: "/v1/listings",
    category: "pagination",
    documented: "Every collection endpoint takes page and limit. page is 1-indexed, limit default 20, max 200. Response: { total, page, page_size, results }.",
    actual: "Collection endpoints completely ignore 'page' and instead use 'offset' and 'limit'. Response envelope contains { limit, offset, count, total, has_more, results } with no 'page' or 'page_size' fields.",
    how_found: "Requested page=2 and observed offset: 0 and page 1 items returned; passing offset=50 properly returned the next slice.",
    impact: "Clients relying on page parameters will endlessly fetch the first page; pagination must use offset.",
    evidence: []
  },
  {
    endpoint: "/v1/listings",
    category: "pagination",
    documented: "limit default 20, maximum 200.",
    actual: "Server hard-caps limit to a maximum of 50 records per request. Any limit requested above 50 (e.g. 100, 200) returns 50 records with limit: 50 in response.",
    how_found: "Requested limit=100 and limit=200; observed response returned exactly 50 records with response limit: 50.",
    impact: "Ingestion and browsing require 4x more requests than documented to paginate full collections.",
    evidence: []
  },
  {
    endpoint: "/v1/listings",
    category: "completeness",
    documented: "total is the exact number of records matching your filters. To fetch every record, read total, divide by your limit, and request that many pages.",
    actual: "Response total is severely underreported: listings reports total: 4301 but has 4700 retrievable records; rentals reports 1739 but has 1900; projects reports 476 but has 520.",
    how_found: "Iterated with offset until has_more was false, retrieving 4700 listings instead of the reported 4301.",
    impact: "Applications terminating pagination based on total miss hundreds of valid listings and projects.",
    evidence: ["ZER-1003946", "MAG-1003564", "100-1001797", "SQU-1003847", "100-1002089"]
  },
  {
    endpoint: "/v1/listings",
    category: "completeness",
    documented: "Returns active sale listings in your city. Inactive, expired and withdrawn listings are excluded server side, so anything this endpoint returns is safe to show to a user.",
    actual: "Endpoint returns inactive listings as well; 978 out of 4,700 listings have is_live: false, which was not documented.",
    how_found: "Inspected response objects and discovered the is_live boolean property with 978 false values.",
    impact: "Frontend must explicitly filter is_live === true to avoid displaying off-market or withdrawn properties to users.",
    evidence: ["ZER-1003946", "MAG-1002627", "100-1000425", "DWE-1001499", "SQU-1000551"]
  },
  {
    endpoint: "/v1/listings",
    category: "filters",
    documented: "Supports min_price (int, inclusive) and max_price (int, inclusive) query parameters.",
    actual: "min_price and max_price query parameters are accepted by the server but silently ignored; response returns all listings regardless of price.",
    how_found: "Queried /v1/listings?min_price=10000000&max_price=15000000 and received listings priced at 27.4M, 17.4M, 7.5M.",
    impact: "Price range filtering cannot be performed server-side and must be executed in client-side state.",
    evidence: []
  },
  {
    endpoint: "/v1/listings",
    category: "filters",
    documented: "total_listings always agrees with what GET /v1/listings?project_id=... returns.",
    actual: "The project_id query parameter is silently ignored on /v1/listings, returning all city listings instead of filtering to the project.",
    how_found: "Called /v1/listings?project_id=P10001 and received total: 4301 with non-matching and null project IDs.",
    impact: "Filtering listings by builder project must be performed client-side.",
    evidence: []
  },
  {
    endpoint: "/v1/listing/{id}",
    category: "missing_endpoint",
    documented: "GET /v1/listing/{listing_id} - A single listing.",
    actual: "Returns 404 Not Found at singular /v1/listing/{id}. The active endpoint is plural: GET /v1/listings/{id}.",
    how_found: "Tested GET /v1/listing/MAG-1002627 (404) and GET /v1/listings/MAG-1002627 (200).",
    impact: "Detail view requests fail unless routing to the plural /v1/listings/{id}.",
    evidence: []
  },
  {
    endpoint: "/v1/listings/{id}/similar",
    category: "missing_endpoint",
    documented: "GET /v1/listings/{listing_id}/similar returns up to ten comparable listings.",
    actual: "Returns 404 Not Found.",
    how_found: "Called GET /v1/listings/MAG-1002627/similar with valid authentication.",
    impact: "Similar listing recommendations must be computed client-side.",
    evidence: []
  },
  {
    endpoint: "/v1/favourites",
    category: "missing_endpoint",
    documented: "GET /v1/favourites, POST /v1/favourites with body { id: '...' }, DELETE /v1/favourites/{id}.",
    actual: "Returns 404 Not Found. The active endpoints are GET /v1/saved, POST /v1/saved with body { listing_id: '...' }, and DELETE /v1/saved/{listing_id}.",
    how_found: "Tested British and American spellings; discovered /v1/saved is the functional endpoint.",
    impact: "Favourites functionality fails completely unless using /v1/saved with listing_id payload key.",
    evidence: []
  },
  {
    endpoint: "/v1/saved",
    category: "undocumented_endpoint",
    documented: "Endpoint is documented under the name /v1/favourites taking { id: '...' }.",
    actual: "POST /v1/saved requires JSON body { listing_id: '...' }. Passing { id: '...' } returns 422 Unprocessable Entity.",
    how_found: "Sent POST /v1/saved with { id: ... } and received 422 validation error indicating 'listing_id' is required.",
    impact: "Saving listings requires conforming to the undocumented { listing_id } payload schema.",
    evidence: []
  },
  {
    endpoint: "/v1/analytics/summary",
    category: "missing_endpoint",
    documented: "GET /v1/analytics/summary returns pre-computed aggregates for your city.",
    actual: "Returns 404 Not Found. No city analytics endpoint is implemented on the server.",
    how_found: "Queried /v1/analytics/summary and related variations with valid auth; all returned 404.",
    impact: "Insights and dashboard screens must calculate market aggregates directly from listings and rental data.",
    evidence: []
  },
  {
    endpoint: "/v1/projects",
    category: "units",
    documented: "price_min and price_max are in rupees integer (Conventions: 'Money: Indian rupees, integer, everywhere in the API').",
    actual: "Project price_min and price_max are floating point values where numbers < 10 represent Crores (e.g. 1.04 Cr = 10,400,000 INR) and numbers >= 10 represent Lakhs (e.g. 99.8 L = 9,980,000 INR), never raw INR.",
    how_found: "Inspected project price values (ranging from 1.0 to 99.8) and compared with actual unit listing prices in the same projects.",
    impact: "Project UI displays incorrect pricing (e.g. Rs 1.04 instead of Rs 1.04 Crore) unless properly converted to INR.",
    evidence: ["P10001", "P10002", "P10004", "P10016", "P10050", "P10055", "P10068", "P10238", "P10255", "P10383", "P10390", "P10415"]
  },
  {
    endpoint: "/v1/listings",
    category: "units",
    documented: "Conventions: Area: Square feet, integer, everywhere in the API.",
    actual: "For website 'magichomes', 389 listings report carpet_area in square meters (< 300, e.g. 76, 82, 154) rather than square feet.",
    how_found: "Analyzed area distribution across all portals; found areas < 300 exclusively on magichomes matching 1 sq m = 10.7639 sq ft.",
    impact: "Price per sqft calculations and unit displays are heavily skewed unless square meters are converted to square feet.",
    evidence: ["MAG-1000037", "MAG-1000214", "MAG-1000680", "MAG-1000727", "MAG-1000924", "MAG-1002627", "MAG-1002739", "MAG-1002865", "MAG-1003078", "MAG-1004568"]
  },
  {
    endpoint: "/v1/listings",
    category: "timestamps",
    documented: "Conventions: Timestamps: ISO 8601, UTC, Z suffix, everywhere in the API.",
    actual: "Listings posted_at timestamps lack the 'Z' UTC suffix and carry no timezone offset (e.g. '2026-06-15T02:33:00'), while rentals use 'Z' and /health uses '+05:30'.",
    how_found: "Inspected posted_at across all retrievable listings.",
    impact: "Timestamps can be misconstrued as local time by parsers expecting standard UTC strings.",
    evidence: ["MAG-1002627", "100-1002951", "DWE-1004037", "SQU-1003074", "ZER-1003310"]
  },
  {
    endpoint: "/v1/projects",
    category: "consistency",
    documented: "total_listings is the number of listings currently available in the project. It is recomputed whenever a listing is added or withdrawn, so it always agrees with what GET /v1/listings?project_id=... returns.",
    actual: "total_listings disagrees with the actual number of active listings for 127 projects.",
    how_found: "Counted active listings grouped by project_id and compared against project total_listings.",
    impact: "Users see conflicting inventory numbers on project details versus listing search results.",
    evidence: ["P10003", "P10004", "P10011", "P10012", "P10014", "P10015", "P10018", "P10020", "P10022", "P10025"]
  },
  {
    endpoint: "/v1/listings",
    category: "data_quality",
    documented: "Every listing corresponds to exactly one physical property and is safe to show to a user.",
    actual: "Contains 40 physically impossible records: negative prices, floor greater than total floors, carpet area greater than super built-up area, swapped latitude/longitude coordinates (lat > 50 in Arctic Russia), and 0-bedroom/0-bathroom apartments.",
    how_found: "Ran comprehensive integrity validation on physical constraints across all 4,700 listings.",
    impact: "Displays corrupted or physically impossible real estate records to users and corrupts statistical models.",
    evidence: [
      "100-1002346", "DWE-1001183", "SQU-1002843", "ZER-1001207",
      "MAG-1003269", "ZER-1001249", "100-1002884", "ZER-1003426",
      "100-1001077", "DWE-1003673", "SQU-1002298", "ZER-1000430",
      "100-1000035", "ZER-1003603", "DWE-1000614", "100-1000753"
    ]
  },
  {
    endpoint: "/v1/listings",
    category: "fraud",
    documented: "Returns genuine active sale listings in your city.",
    actual: "Contains 8 fake listings with minuscule clickbait prices (Rs 6,250 to Rs 16,790 for full 2BHK/3BHK apartments) posted solely to attract leads and generate enquiries.",
    how_found: "Queried listings with sale prices under Rs 50,000.",
    impact: "Deceives property buyers with unrealistic bait prices and corrupts price statistics.",
    evidence: [
      "100-1002501", "DWE-1002631", "DWE-1003102", "MAG-1003492",
      "SQU-1001431", "SQU-1003524", "ZER-1003652", "ZER-1003813"
    ]
  },
  {
    endpoint: "/v1/listings",
    category: "duplicates",
    documented: "Every listing_id is globally unique, and each listing corresponds to exactly one physical property.",
    actual: "Cross-portal duplicates exist where multiple portals list the same physical unit (same apartment, locality, floor, total floors, bedrooms, and facing). 4,700 records represent only 4,182 distinct physical properties.",
    how_found: "Deduplicated records using composite key of apartment name, locality, floor, total floors, bedroom count, and facing direction.",
    impact: "Buyers encounter duplicate listings of identical properties across different brokers and portals.",
    evidence: ["DWE-1004037", "ZER-1003310", "100-1002951", "MAG-1003368", "SQU-1003074", "ZER-1002378"]
  }
];

const submission = {
  api_key: "IVY26-AD650B779304",
  candidate: {
    name: "Akash Kumar Prasad",
    email: "akash.20234017@mnnit.ac.in",
    repo_url: "https://github.com/Akashkrp/ivy-assignment",
    demo_url: "https://ivy-assignment-dun.vercel.app"
  },
  answers: {
    total_listing_records: totalListingRecords,
    unique_properties: uniqueProperties,
    active_listings: activeListings,
    corrupt_listing_ids: corruptListingIds,
    total_monthly_rent: totalMonthlyRent,
    avg_price_per_sqft_2bhk: avgPricePerSqft2bhk,
    costliest_project: costliestProject,
    listings_last_7_days: listingsLast7Days,
    fake_listing_ids: fakeListingIds,
    projects_with_wrong_listing_count: projectsWithWrongListingCount
  },
  findings: findings
};

fs.writeFileSync('submission.json', JSON.stringify(submission, null, 2));
console.log('Successfully generated submission.json!');
console.log('Submission answers summary:', JSON.stringify(submission.answers, null, 2));
console.log(`Total findings documented: ${findings.length}`);
