# Ivy Homes — Software Engineering Internship, September 2026

A property frontend built on the Ivy Homes API, and an audit of everywhere
`API_REFERENCE.md` disagrees with the service it claims to describe.

- **Candidate:** Akash Kumar Prasad · MNNIT Allahabad · akash.20234017@mnnit.ac.in
- **City:** Bangalore · **Assigned locality:** Bellandur
- **Live demo:** https://ivy-assignment-dun.vercel.app
- **Answers and findings:** [`submission.json`](./submission.json)

Built with React 19, Vite, Tailwind CSS, react-router and three.js. Claude
(Anthropic) was used throughout — for the frontend, for the probe and analysis
scripts, and as a sounding board for the hypotheses below. Every number in
`submission.json` is produced by a committed script from the raw API dump, not
typed in by hand.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

```bash
npm run build        # production bundle into dist/
```

Two optional scripts reproduce the data and the answers from scratch:

```bash
node scripts/ingest.mjs               # pulls the full dataset into data/ (94+38+11 requests)
node scripts/generate_submission.mjs  # derives all ten answers -> submission.json
```

`scripts/generate_submission.mjs` is the single source of truth. The insights
screen reads the same `submission.json` and `derived.json` it writes, so what
the app shows and what the submission claims cannot drift apart.

Credentials live in `.env` (see `.env.example`): `VITE_IVY_API_KEY`,
`VITE_DEMO_PASSWORD`, `VITE_ASSIGNED_LOCALITY`, `VITE_CITY`. Sign in with any of
`demo1@ivy.homes`, `demo2@ivy.homes`, `demo3@ivy.homes`.

### How data reaches the browser

Login, the saved-listings CRUD and session refresh all hit the live API from the
browser. Bulk browsing reads a snapshot in `public/data/` that
`scripts/ingest.mjs` pulled from that same API, for the reason the brief itself
suggests: the whole dataset is only a few thousand records, most documented
filters do not work server side, and Q2's deduplication and Q9's fraud detection
both need every record in memory at once. Paging the API on every keystroke
would be slower and no more truthful.

---

## The ten answers

Anchored to `REFERENCE = 2026-09-10T00:00:00+05:30`, confirmed by `GET /health`.
The assigned locality is confirmed by the undocumented `GET /v1/me`.

| # | Key | Answer | How |
|---|---|---|---|
| 1 | `total_listing_records` | **4700** | Page by `offset` until `has_more` is false — 94 requests ending at offset 4650. The envelope says `total: 4301`. All 4,700 ids are distinct, and `/v1/localities` independently sums to 4,700. |
| 2 | `unique_properties` | **4182** | 490 clusters of the same flat posted twice, 518 redundant records. Society names are respelled between copies, so the name is normalised before grouping on society + locality + floor + building height + bedrooms + facing. |
| 3 | `active_listings` | **3722** | `is_live` is undocumented and 978 records have it false. |
| 4 | `corrupt_listing_ids` | **56 ids** | Seven impossibility classes, exactly eight records each, disjoint. |
| 5 | `total_monthly_rent` | **6448700** | Sum over the 191 rentals whose `locality` is `bellandur`. The `title` field names a different locality in 1,691 of 1,900 records; filtering on it instead gives a plausible-looking and wrong ₹65,35,100. |
| 6 | `avg_price_per_sqft_2bhk` | **11743.41** | Mean of price ÷ carpet area over the 1,150 live 2 BHK records left after removing answers 4 and 9, with square-metre areas converted first. |
| 7 | `costliest_project` | **P10255 · 48900000** | Project prices are crores below 10 and lakhs at 10 and above. |
| 8 | `listings_last_7_days` | **149** | `[2026-09-03, 2026-09-10)` IST. Listing timestamps are naive **IST**, not the UTC the conventions table promises. |
| 9 | `fake_listing_ids` | **170 ids** | Seven phone numbers running enquiry-bait rings. |
| 10 | `projects_with_wrong_listing_count` | **127** | `total_listings` against the live listing count per project. |

---

## Working out what to distrust

The first sweep is the cheap one and it does pay: call every documented path,
see what 404s, read one response, and diff it against the reference. That found
the header-not-query-parameter key, the missing bearer token, `page` being
ignored in favour of `offset`, the 50-record cap, `/v1/listing/{id}` versus
`/v1/listings/{id}`, `/v1/favourites` versus `/v1/saved`, the absent
`/v1/analytics/summary` and `/v1/listings/{id}/similar`, and the 15-minute token
with the refresh flow the documentation says does not exist. An hour, and none
of it required a hypothesis.

Everything that mattered after that needed one.

**`total` is a lie, and it is the expensive one.** The documentation tells you to
read `total`, divide by your limit, and request that many pages. Doing exactly
that stops at 4,301 of 4,700 listings. What gave it away was not the listings
endpoint but `has_more`, which stays `true` past the reported total; probing
offsets past the real end returns `count: 0`, so the end is unambiguous. `total`
turns out to be understated by a uniform ~8.5% on every collection and every
filtered query — 4301/4700, 1739/1900, 476/520, and `locality=bellandur`
reporting 406 against 444. The undocumented `/v1/localities` reports the true
counts, which is the cleanest possible proof that the other endpoint is wrong.
Every answer below would have been wrong if this one had been missed.

**Areas that are not areas.** Plotting carpet area per portal shows magichomes
with a second mode near 100 that no other portal has. 389 of its 940 records are
in square metres. The two populations do not overlap at all — nothing from
another portal is below 321 sqft, no square-metre record is above 264 — and the
converted rows then match the rest of the same portal on both price per square
foot (11,541 against 11,234) and carpet-to-super-built-up ratio (0.751 against
0.749), which is what turns a guess into a conclusion.

**Project prices that are not rupees.** `price_min` and `price_max` run from 1 to
99.8, which is obviously not rupees. The thing that makes it interesting is that
372 of 520 projects have a raw `price_min` **larger** than their raw
`price_max` — impossible under any single unit. Reading the magnitude as the
unit (below 10 crores, 10 and above lakhs) is the only rule that leaves all 520
with min ≤ max, and it is the one that brackets the real listing prices inside
each project. It also changes the answer to question 7: under the magnitude rule
P10255 wins at 4.89 crore, but read as lakhs throughout, P10068 would win at
₹99.8 lakh.

**Timestamps that lie about their timezone.** The conventions table says UTC
with a `Z` suffix everywhere. Listing timestamps carry no suffix and no offset,
and rentals carry `Z`, so at most one of them can be right. Two things settle
it. The latest non-future listing is `2026-09-09T23:40:00` and the latest rental
is `2026-09-09T18:11:00Z`, which is 23:41 IST — both collections stop a few
minutes short of the same instant, which only lines up if the naive stamps are
already IST. And the server itself groups `sort_by=posted_at` on the IST
calendar date, converting the rentals' `Z` values to do it. Reading them as UTC
changes question 8 from 149 to 142.

**The rental title.** Every rental has a `title` like "2 BHK for rent in
Koramangala" alongside a `locality`. They disagree in 1,691 of 1,900 records,
and the locality the title names is always a real locality, so nothing looks
wrong record by record. The `description` agrees with `locality` in all 1,900,
and the bedroom count in the title is right every time — only the title's
locality is shuffled. This is a direct trap for question 5: filter Bellandur
rentals by title and you get 184 units and ₹65,35,100 instead of 191 and
₹64,48,700. The app now shows the locality field and flags the title as wrong
rather than displaying both and letting them contradict each other.

### The two that the obvious rule gets wrong

The brief says the first rule that fits will fit most of the data, and that the
answer is in what it gets wrong. That happened twice, in opposite directions.

**Eight cheap listings that are not fraud.** Sorting by price surfaces eight
records between ₹6,250 and ₹16,790 for whole 2 and 3 BHK flats. That reads as
textbook enquiry bait and it is what I first recorded them as. It is wrong.
Every other price in the dataset is a multiple of 10,000 and these eight are the
only exceptions; multiplied by 1,000 each one lands between 0.69× and 1.25× of
the median rate for its own locality and bedroom count. They are a units error —
price recorded in thousands — sitting alongside the magichomes area error, not a
fraud pattern. Bait pricing does not produce a clean factor of exactly 1,000
across eight independent records on five different portals. They belong in
answer 4, not answer 9.

**Twelve shared phone numbers, of which only seven are rings.** With the price
route exhausted, the seller side is the other way in. Exactly 12 phone numbers
post under more than one `posted_by_name`; the other 782 map one-to-one, so 12
is a real signal and not noise. Stopping there gives 306 listings and would be
wrong. Five of those twelve price at a median 0.97× of market with 54% verified
and 76% live — indistinguishable from the population, and evidently just busy
agencies sharing an office line. The other seven price at a median 0.46–0.53× of
market and have **every single listing** flagged `is_verified` and `is_live`.
Against base rates of 60% and 79%, one agent going 24-for-24 on both is roughly
a one-in-fifty-million coincidence; seven of them is not a coincidence at all.
170 listings, and `is_verified` does not mean what the documentation says it
means.

The impossibility classes fell out of the same discipline: every physical
constraint I could state, run over all 4,700 records. Negative prices, carpet
area above super built-up, floor above the building's height, latitude and
longitude transposed, apartments with zero bedrooms and zero bathrooms, and
`posted_at` up to ten months past the reference. Each class contains exactly
eight records spread evenly over all five portals — which is what marks them as
injected per-record defects rather than a portal convention, and which is the
argument for counting the price-in-thousands rows as a seventh class of the same
kind while leaving the 389 magichomes areas out of answer 4 entirely.

---

## What I checked that turned out to be fine

The hypotheses that went nowhere, with what actually came back.

**Rental prices might carry the same unit damage as sale prices.** They do not.
All 1,900 are between ₹7,500 and ₹91,000 with none at or below zero, the
deposit-to-rent ratio sits in a clean 2–10× band, and the median rent is ₹41/sqft.
The five rentals under 300 sqft are all genuine 1 BHK studios with matching
super-built-up areas, not square-metre rows — the ratio holds at 0.743, same as
the rest of the collection.

**The 182 records with zero bedrooms, bathrooms and floors might be corrupt.**
They are all plots, and all 182 of them are zero on every one of those fields.
A plot has no bedrooms. Only the 8 non-plot records with zeroes are defects, and
treating the plots as corrupt would have put 182 invented ids into answer 4.

**Seller-written descriptions might contradict the structured fields.** The brief
warns that a seller can write anything, so I checked bedroom count, property
type, furnishing, society name, locality and facing direction from the
description text against the fields, on all 4,700 listings. Zero contradictions.
For listings the prose is entirely trustworthy — it is the rentals' `title`,
which is generated rather than seller-written, that is wrong.

**Rate limiting might make full ingestion awkward.** It does not. The full pull
is 143 requests against a 1,200/minute limit and returns zero `429`s. The API is
exactly as honest about capacity as the brief says.

**Sorting and the rest of the filters might be broken too.** Mostly they are
fine, and saying so matters as much as reporting what is not. `sort_by` works
correctly for `price`, `carpet_area` and `bedroom` in both directions;
`locality`, `bhk`, `property_type` and `project_status` all filter correctly;
`furnishing` filters correctly on `/v1/rentals`. Bad input is handled properly —
`sort_by=nonsense` returns 400 naming the sortable fields, `order=sideways` and
`limit=0` return 422. Only `posted_at` sorting is wrong, and only in that it
discards the time of day.

**Identifiers might overlap or dangle.** Every `listing_id` and every
`listing_url` is unique, the id prefix matches the portal on all 4,700 records,
and every non-null `project_id` resolves to a real project. The documentation's
claim that ids are globally unique is true; it is only the "one physical
property" half of that sentence that fails.

**Projects might be internally inconsistent.** No project has `min_area_sqft`
above `max_area_sqft`, fewer units than towers, or a possession date before its
launch date. All 520 carry a distinct RERA number. `project_status` and
`possession_date` are uncorrelated — 52% of "ready to move" projects have a
future possession date — but the documentation never claims a relationship
between them, so it is noise in the generator rather than a discrepancy worth
reporting. Reporting it would have cost precision.

**Coordinates might be noisy generally.** Excluding the eight transposed pairs,
every listing sits between 12.81–13.13°N and 77.43–77.75°E. That is Bangalore.

**Logout might work.** It returns 200 and the token still authenticates
afterwards — so this one did not turn out fine, but the API is honest about it:
the response body says `tokens are stateless; discard them client side`.

---

## The app

Six things the brief asks for, and where each one lives.

| Requirement | Where | Notes |
|---|---|---|
| Login | `LoginModal`, `services/api.js` | Real `POST /auth/login`. Session survives refresh via `localStorage`, and a one-minute timer refreshes the 15-minute access token through `POST /auth/refresh`, so it is still working half an hour later. |
| Browse listings | `/` — `ListingsView` | Paginated, 24 per page. Locality, bedrooms, price range and furnishing all filter, client-side, because the server ignores `min_price`, `max_price` and `furnishing`. |
| Listing detail | `/listings/:id` — `ListingDetailView` | Reachable by URL. Shows the raw square-metre value next to the converted one, explains any defect on the record, and computes comparables using the rule the missing `/similar` endpoint documents. |
| Saved listings | `/favourites` — `FavouritesView` | `GET`/`POST`/`DELETE /v1/saved`. Per user — the offline mirror is keyed by email, so signing in as `demo2` never shows `demo1`'s list. Survives reload and re-login. |
| Rentals and projects | `/rentals`, `/projects` | Rent, deposit and maintenance as served; project prices normalised out of crores/lakhs into rupees with the raw value shown beside them; every project card compares `total_listings` against the real count. |
| Insights | `/insights` | All ten answers with their reasoning, the defect inspector, the bait rings with their evidence, the 29 findings, and a Bellandur breakdown. |

Every figure on the insights screen is computed from the dataset or read from
`submission.json` at render time. There are no hard-coded statistics anywhere in
the app — if the data changes, the screens change with it.

A three.js locality map plots the dataset geographically, including the eight
transposed coordinates that land outside Bangalore. It is decoration; the six
requirements above do not depend on it.

---

## What I would do with another two days

**Reconcile the duplicate clusters instead of just counting them.** 490 clusters
describe one flat twice, and the two copies disagree — on price by up to 34%, on
area by a few square feet, on `posted_by`. There is a real product in picking
the truthful copy: prefer the portal whose price sits closest to the cluster's
own comparables, surface the spread as a negotiating signal, and show the buyer
one property with three prices rather than three properties.

**Put a confidence score on the fraud call.** Right now a listing is bait or it
is not, on a rule with a hard 0.75 threshold. The honest version is a score over
the signals I actually measured — rate versus local comparables, the
verified/live pattern for the number, alias count, locality spread — so the five
agencies that share a line come out medium rather than being silently cleared,
and a reviewer can move the line themselves.

**Ingest incrementally and diff.** The snapshot is a single moment. Pulling
nightly and storing diffs would answer the questions the static dump cannot:
which listings are relisted at a lower price, which bait numbers rotate their
aliases, whether `total` drifts, whether the impossible records ever get fixed.

**Make the audit a test suite.** Every finding in `submission.json` is currently
prose plus evidence ids. Each one is also a executable assertion against the live
API — `page` is ignored, `limit` caps at 50, `total` understates by 8.5%. Run
them in CI and the document stops being able to go stale, which is the failure
mode that produced `API_REFERENCE.md` in the first place.

---

## Findings

29 discrepancies in `submission.json`, every one reproduced against the live API
before being written down. Grouped by the categories the brief defines:

`auth` 4 · `pagination` 3 · `filters` 3 · `sorting` 1 · `units` 3 ·
`timestamps` 1 · `duplicates` 1 · `completeness` 1 · `data_quality` 3 ·
`fraud` 1 · `consistency` 1 · `missing_endpoint` 4 · `undocumented_endpoint` 3

Things I considered and left out because I could not reproduce them as a
documentation discrepancy: the `project_status` / `possession_date`
non-correlation described above, and `locality` matching case-insensitively when
the reference says lowercase. Precision counts as much as recall, and a finding
I cannot defend is worse than one I did not make.
