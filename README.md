# Ivy Homes — Software Engineering Internship (September 2026)
### Full-Stack Real Estate Intelligence Platform & Empirical API Audit

**Candidate:** Akash Kumar Prasad  
**College Email:** [akash.20234017@mnnit.ac.in](mailto:akash.20234017@mnnit.ac.in)  
**Assigned City:** Bangalore  
**Assigned Locality:** Bellandur  
**Repository:** [https://github.com/akashprasad/ivy-homes](https://github.com/akashprasad/ivy-homes)  
**Demo URL:** [https://ivy-homes.vercel.app](https://ivy-homes.vercel.app)  
**Reference Moment:** `2026-09-10T00:00:00+05:30` (IST)  

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Quick Start & Setup Instructions](#quick-start--setup-instructions)
3. [Answers to the 10 Mandatory Questions](#answers-to-the-10-mandatory-questions)
4. [Hypothesis Testing & Empirical Findings](#hypothesis-testing--empirical-findings)
   - [What We Suspected & Proved (The 22 Documentation Lies)](#what-we-suspected--proved-the-22-documentation-lies)
   - [What We Checked That Turned Out To Be Perfectly Fine](#what-we-checked-that-turned-out-to-be-perfectly-fine)
5. [Frontend Architecture & Key Features](#frontend-architecture--key-features)
6. [Data Ingestion & Local SQLite Database](#data-ingestion--local-sqlite-database)
7. [Submission File Structure (`submission.json`)](#submission-file-structure-submissionjson)

---

## Project Overview

This project completes the Ivy Homes September 2026 Internship assignment, comprising:
1. **Automated Ingestion Pipeline:** A Node.js engine that fetches the entire city dataset (`4,700` listings, `1,900` rentals, `520` projects) within rate limits and mirrors it to local SQLite (`data/ivy_homes.db`) and JSON files.
2. **Rigorous Data Investigation:** Formulated mathematical proofs to solve the 10 city-specific questions in `statement.md` anchored to the exact reference moment.
3. **Comprehensive Documentation Audit:** Discovered, reproduced, and evidenced **22 specific discrepancies ("lies")** between `API_REFERENCE.md` and actual server behavior.
4. **Interactive Production Web App:** Built with React, Vite, and Tailwind CSS, featuring active demo session authentication with automatic 15-minute token refresh, resilient client-side filtering compensating for server filter flaws, property detail routes, favourites synchronization, and an interactive "Insights & Truth Explorer".

---

## Quick Start & Setup Instructions

### Prerequisites
- Node.js `v18+` or `v20+` (tested on Node v24.20.0)
- npm `v9+` or `v11+`

### 1. Clone the Repository
```bash
git clone https://github.com/akashprasad/ivy-homes.git
cd ivy-homes
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Ingestion Script (Optional — Already Mirrored)
To pull fresh records directly from the Ivy Homes API and verify live endpoint pagination:
```bash
node scripts/ingest.mjs
```
This stores all records in `data/listings.json`, `data/rentals.json`, `data/projects.json`, and `data/ivy_homes.db`.

### 4. Run Frontend Locally
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### 5. Build for Production
```bash
npm run build
```

---

## Answers to the 10 Mandatory Questions

All calculations are anchored to `REFERENCE = 2026-09-10T00:00:00+05:30 (IST)` for the city of **Bangalore** and assigned locality **Bellandur**:

| # | Question Key | Evaluated Answer | Evaluation Rule | Methodology & Proof |
|---|---|---|---|---|
| **1** | `total_listing_records` | **`4700`** | Exact Count | The API's response metadata falsely reports `total: 4301`. Continuing offset pagination until `has_more: false` yields exactly **4,700 unique retrievable records** across 94 pages. |
| **2** | `unique_properties` | **`4182`** | ±1% Allowed | Multiple real estate portals list identical physical units. Deduplication across composite keys `(apartment_name, locality, floor, total_floors, bedroom, facing_direction)` reveals that the 4,700 records represent **4,182 distinct physical properties**. |
| **3** | `active_listings` | **`3722`** | Exact Count | The documentation claimed inactive listings are excluded server-side. In truth, **978** listings have `is_live: false`, leaving exactly **3,722 active listings**. |
| **4** | `corrupt_listing_ids` | **`40 IDs`** (Sorted list below) | Real vs Invented | Exactly 5 distinct physical impossibility categories exist in the synthetic dataset, each containing **exactly 8 records** (5 × 8 = 40 records): negative prices, floor > total floors, carpet area > super built-up, swapped lat/lon (lat > 50 in Arctic Russia), and 0-BHK apartments. |
| **5** | `total_monthly_rent` | **`6448700`** (₹64,48,700) | Exact Count | Sum of monthly rent across all 191 retrievable rental units in assigned locality **Bellandur**. |
| **6** | `avg_price_per_sqft_2bhk` | **`11496.64`** (₹11,496.64 / sqft) | ±1% Allowed | Evaluated across retrievable listings where `is_live === true` and `bedroom === 2`, excluding corrupt (40) and fake (8) records. Compensates for the `magichomes` unit lie where carpet area is reported in square meters (< 300) by converting m² to sqft (× 10.7639). |
| **7** | `costliest_project` | **`{"project_id": "P10255", "price_max_inr": 48900000}`** | ±1% Allowed | Project units lie: values < 10 are in Crores, values >= 10 are in Lakhs. Project `P10255` (*Puravankara Vista*) has `price_max = 4.89 Cr` (₹4,89,00,000 INR), which is higher in real INR than `P10068` (`price_max = 99.8 L` = ₹9,980,000 INR). |
| **8** | `listings_last_7_days` | **`149`** | Exact Count | Number of listings posted in `[2026-09-03T00:00:00, 2026-09-10T00:00:00) IST`. The database dates are already recorded in local IST. |
| **9** | `fake_listing_ids` | **`8 IDs`** (Sorted list below) | Real vs Invented | Exactly 8 clickbait sale listings exist with artificially minuscule prices (₹6,250 to ₹16,790 for full 2BHK/3BHK apartments) posted solely to generate leads. |
| **10** | `projects_with_wrong_listing_count` | **`127`** | Exact Count | `total_listings` was documented to always agree with available listings. For **127** out of 520 projects, this number contradicts the actual count of active listings in the database. |

### Corrupt Listing IDs (40 IDs)
```json
[
  "100-1000035", "100-1000753", "100-1001077", "100-1001141", "100-1002346", 
  "100-1002442", "100-1002512", "100-1002600", "100-1002884", "100-1003117", 
  "100-1003624", "DWE-1000614", "DWE-1001165", "DWE-1001183", "DWE-1001909", 
  "DWE-1002892", "DWE-1003673", "MAG-1000179", "MAG-1000885", "MAG-1002362", 
  "MAG-1003269", "MAG-1003510", "SQU-1000394", "SQU-1000979", "SQU-1002298", 
  "SQU-1002843", "SQU-1003177", "SQU-1003370", "ZER-1000260", "ZER-1000430", 
  "ZER-1000500", "ZER-1001207", "ZER-1001249", "ZER-1001334", "ZER-1002586", 
  "ZER-1002632", "ZER-1002667", "ZER-1002911", "ZER-1003426", "ZER-1003603"
]
```

### Fake Listing IDs (8 IDs)
```json
[
  "100-1002501", "DWE-1002631", "DWE-1003102", "MAG-1003492", 
  "SQU-1001431", "SQU-1003524", "ZER-1003652", "ZER-1003813"
]
```

---

## Hypothesis Testing & Empirical Findings

### What We Suspected & Proved (The 22 Documentation Lies)

1. **API Key Authentication (`auth`):**
   - *Documented:* Append API key as query parameter `?api_key=...`.
   - *Actual:* Returns 401. Key must strictly be passed in the `X-API-Key` HTTP header.
2. **Bearer Token on Collections (`auth`):**
   - *Documented:* Collection endpoints only require the API key.
   - *Actual:* Returns 401 without an active `Authorization: Bearer <token>` session.
3. **Session Expiration (`auth`):**
   - *Documented:* Tokens last 24 hours (`expires_in: 86400`); no refresh flow exists.
   - *Actual:* Tokens expire in 15 minutes (`expires_in: 900`). The response returns `access_token` and `refresh_url: "/auth/refresh"`.
4. **Token Refresh Endpoint (`undocumented_endpoint`):**
   - *Documented:* "There is no refresh flow."
   - *Actual:* `POST /auth/refresh` exists and refreshes access tokens without requiring re-entering credentials.
5. **Pagination Mechanism (`pagination`):**
   - *Documented:* Endpoints take `page` (1-indexed) and `limit`, returning `{ total, page, page_size, results }`.
   - *Actual:* Server completely ignores `page` and uses `offset`. Response contains `{ limit, offset, count, total, has_more, results }`.
6. **Limit Ceiling (`pagination`):**
   - *Documented:* Maximum limit is 200.
   - *Actual:* Hard-capped at 50. Requesting 100 or 200 returns only 50 records.
7. **Total Underreporting (`completeness`):**
   - *Documented:* `total` is the exact number of matching records.
   - *Actual:* Listings reports `total: 4301` but has `4700` records; rentals reports `1739` but has `1900`; projects reports `476` but has `520`.
8. **Inactive Listings (`completeness`):**
   - *Documented:* Inactive listings are excluded server-side.
   - *Actual:* 978 listings have `is_live: false` and are returned unless filtered by the client.
9. **Min/Max Price Filter Flaw (`filters`):**
   - *Documented:* `min_price` and `max_price` query parameters filter results.
   - *Actual:* Accepted by server but silently ignored; client-side filtering is mandatory.
10. **Project ID Filter Flaw (`filters`):**
    - *Documented:* `GET /v1/listings?project_id=...` filters listings to that project.
    - *Actual:* Query parameter is ignored; returns unfiltered listings.
11. **Singular Listing Endpoint (`missing_endpoint`):**
    - *Documented:* `GET /v1/listing/{listing_id}`.
    - *Actual:* 404 Not Found. Real endpoint is plural: `GET /v1/listings/{id}`.
12. **Similar Listings Endpoint (`missing_endpoint`):**
    - *Documented:* `GET /v1/listings/{id}/similar`.
    - *Actual:* 404 Not Found. Must be computed on the client.
13. **Favourites Path (`missing_endpoint`):**
    - *Documented:* `GET /v1/favourites`, `POST /v1/favourites`.
    - *Actual:* 404 Not Found. The active endpoint is `/v1/saved`.
14. **Saved Payload Schema (`undocumented_endpoint`):**
    - *Documented:* Send `{ id: "..." }`.
    - *Actual:* Requires `{ listing_id: "..." }`. Sending `id` returns 422 Unprocessable Entity.
15. **Analytics Summary Endpoint (`missing_endpoint`):**
    - *Documented:* `GET /v1/analytics/summary`.
    - *Actual:* 404 Not Found.
16. **Project Units Lie (`units`):**
    - *Documented:* `price_min` and `price_max` are integer Rupees.
    - *Actual:* Values < 10 are in Crores; values >= 10 are in Lakhs.
17. **Carpet Area Units Lie (`units`):**
    - *Documented:* Area is square feet integer everywhere.
    - *Actual:* 389 listings on `magichomes` report area in square meters (< 300).
18. **Timestamp Offset Missing (`timestamps`):**
    - *Documented:* All timestamps have UTC `Z` suffix.
    - *Actual:* Listings timestamps omit `Z` and timezone offsets, stored in local IST.
19. **Project Inventory Discrepancies (`consistency`):**
    - *Documented:* `total_listings` always agrees with current inventory.
    - *Actual:* 127 projects report wrong counts compared to actual database listings.
20. **Impossible Data Injected (`data_quality`):**
    - *Documented:* All records describe real properties.
    - *Actual:* 40 records have physically impossible values (negative price, floor > total floors, etc.).
21. **Fraudulent Enquiry Bait (`fraud`):**
    - *Documented:* Genuine sale listings.
    - *Actual:* 8 listings have clickbait prices under ₹50,000.
22. **Duplicate Properties (`duplicates`):**
    - *Documented:* Each listing corresponds to exactly one physical property.
    - *Actual:* 4,700 listings describe only 4,182 distinct physical properties due to portal duplicates.

---

### What We Checked That Turned Out To Be Perfectly Fine

Testing hypotheses that did **not** pan out is essential to demonstrate rigorous investigative thinking:

1. **Hypothesis: Rental Prices Might Be in Thousands or Negative**
   - *Suspicion:* Since listing sale prices had negative values and projects had mixed Lakhs/Crores units, we hypothesized rentals might also have negative prices or units in thousands.
   - *Investigation:* Analyzed all 1,900 rental records and specifically the 191 in Bellandur.
   - *Finding:* **Completely Fine.** Min price is ₹12,000 and max is ₹98,000. Exactly 0 negative or zero prices exist in rentals. Rent and deposit values follow standard Indian rental market scales.

2. **Hypothesis: 0 Bedrooms and 0 Floors on Plots Were Corrupted Records**
   - *Suspicion:* We found 182 records with `total_floors: 0` and `bedroom: 0` and suspected they were corrupt data.
   - *Investigation:* Grouped these records by `property_type`.
   - *Finding:* **Completely Fine.** Exactly 100% of these records were of type `plot`. Vacant plots of land in Indian real estate have no bedrooms and no building floors. Only the 8 non-plot records with 0 BHK were corrupt.

3. **Hypothesis: Rate Limiting Might Throttle Fast Ingestion**
   - *Suspicion:* With 140+ requests required to paginate the dataset, we suspected the server might aggressively enforce burst limits or drop connections.
   - *Investigation:* Benchmarked sequential ingestion requests against the stated 1200 req/min limit.
   - *Finding:* **Completely Fine.** The server handled all 140 requests smoothly within 45 seconds with 0 rate limit errors (`429`), demonstrating honest capacity.

4. **Hypothesis: Project Dates or Total Units Might Be Bogus**
   - *Suspicion:* We checked if launch dates, possession dates, or unit counts were corrupted (e.g. negative units or dates in the year 3000).
   - *Investigation:* Checked min/max ranges for `launch_date`, `possession_date`, and `total_units`.
   - *Finding:* **Completely Fine.** Launch dates span 2022 to 2025, possession dates span 2026 to 2030, and total units range from 100 to 1,200 units, aligning with authentic construction timelines.

5. **Hypothesis: Portal Websites Might Include Unknown Names or Malformed URLs**
   - *Suspicion:* We suspected some listings might come from undocumented portals or have broken URLs.
   - *Investigation:* Ran distinct set queries on `website` and verified URL prefixes.
   - *Finding:* **Completely Fine.** All 4,700 listings belong strictly to the 5 known portals (`100acres`, `dwelling`, `magichomes`, `squarelane`, `zerobroker`) in roughly equal distribution (~940 listings each).

6. **Hypothesis: Bathrooms or Balconies Might Have Negative Values**
   - *Suspicion:* We tested whether bathroom or balcony counts had negative numbers similar to negative floor or price anomalies.
   - *Investigation:* Checked `bathroom < 0` and `balcony < 0` across all listings.
   - *Finding:* **Completely Fine.** All bathroom and balcony numbers were non-negative (0 to 5).

---

## Frontend Architecture & Key Features

The frontend is built using **React 19**, **Vite**, and **Tailwind CSS** with a luxury dark-mode design system:
- **Authentication:** Demo switcher (`demo1`, `demo2`, `demo3` with password `c42d10ad7b`). Automatically refreshes access tokens in the background every 15 minutes to guarantee session survival well beyond 30 minutes.
- **Client-Side Filter Engine:** Directly addresses the server's documentation discrepancies by filtering locality, BHK, price range, and furnishing in state, ensuring instant response times.
- **Property Detail Pages (`/listings/:id`):** URL-routable pages featuring full architectural specifications, seller contact details, anomaly detection alerts, and client-computed comparable recommendations.
- **Dedicated Rentals & Projects Views:** Reflects true normalized INR prices and includes a dedicated Bellandur rental summary banner (Q5) and Costliest Project spotlight (Q7).
- **Favourites Hub (`/favourites`):** Synced with the active user session and backed by localStorage for persistence across reloads.
- **Insights & Truth Explorer (`/insights`):** Visual presentation of all 10 verified data answers and an interactive discrepancy explorer with direct evidence links.

---

## Data Ingestion & Local SQLite Database

The dataset is ingested by `scripts/ingest.mjs` into both structured JSON and a normalized SQLite database at `data/ivy_homes.db`:
- Table `listings`: 4,700 rows
- Table `rentals`: 1,900 rows
- Table `projects`: 520 rows

---

## Submission File Structure (`submission.json`)

The generated `submission.json` adheres strictly to `submission.template.json` with all 10 verified answers and 22 documented findings:
```json
{
  "api_key": "IVY26-AD650B779304",
  "candidate": {
    "name": "Akash Kumar Prasad",
    "email": "akash.20234017@mnnit.ac.in",
    "repo_url": "https://github.com/akashprasad/ivy-homes",
    "demo_url": "https://ivy-homes.vercel.app"
  },
  "answers": {
    "total_listing_records": 4700,
    "unique_properties": 4182,
    "active_listings": 3722,
    "corrupt_listing_ids": [ ... 40 IDs ... ],
    "total_monthly_rent": 6448700,
    "avg_price_per_sqft_2bhk": 11496.64,
    "costliest_project": { "project_id": "P10255", "price_max_inr": 48900000 },
    "listings_last_7_days": 149,
    "fake_listing_ids": [ ... 8 IDs ... ],
    "projects_with_wrong_listing_count": 127
  },
  "findings": [ ... 22 Discrepancies ... ]
}
```
