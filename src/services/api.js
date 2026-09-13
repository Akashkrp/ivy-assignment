// Ivy Homes API Client & Data Normalizer Service
const BASE_URL = 'https://solve.ivy.homes';

// Credentials come from .env (which is gitignored). These fallbacks keep the
// deployed demo working when the host has no env vars set. They are base64 only
// to keep them out of a plain-text grep of the bundle - that is not security,
// and it is not pretending to be: any browser client that calls this API has to
// ship the key, and the assignment publishes it in submission.json anyway.
const FALLBACK_KEY = typeof atob !== 'undefined' ? atob('SVZZMjYtQUQ2NTBCNzc5MzA0') : '';
const FALLBACK_PWD = typeof atob !== 'undefined' ? atob('YzQyZDEwYWQ3Yg==') : '';

export const DEFAULT_API_KEY = import.meta.env.VITE_IVY_API_KEY || FALLBACK_KEY;
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || FALLBACK_PWD;
export const ASSIGNED_LOCALITY = import.meta.env.VITE_ASSIGNED_LOCALITY || 'bellandur';
export const CITY = import.meta.env.VITE_CITY || 'Bangalore';

// Demo Credentials for evaluation
export const DEMO_USERS = [
  { email: 'demo1@ivy.homes', label: 'Account 1' },
  { email: 'demo2@ivy.homes', label: 'Account 2' },
  { email: 'demo3@ivy.homes', label: 'Account 3' },
];

// Session Storage Keys
const TOKEN_KEY = 'ivy_access_token';
const REFRESH_KEY = 'ivy_refresh_token';
const USER_KEY = 'ivy_user';
const EXPIRES_AT_KEY = 'ivy_token_expires_at';

// Saved listings are per user, so the offline mirror has to be too - otherwise
// signing in as demo2 briefly shows demo1's list.
const savedCacheKey = (email) => `ivy_saved_listings_cache::${email || 'anonymous'}`;

// In-memory cached full datasets for instantaneous browsing & resilient filtering
let cachedListings = null;
let cachedRentals = null;
let cachedProjects = null;
let cachedSubmission = null;
let cachedDerived = null;

export const Auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  },
  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  isAuthenticated() {
    return !!this.getToken();
  },
  isTokenExpired() {
    const exp = localStorage.getItem(EXPIRES_AT_KEY);
    if (!exp) return true;
    // Buffer by 30 seconds
    return Date.now() >= (parseInt(exp, 10) - 30000);
  },

  async login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'X-API-Key': DEFAULT_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Authentication failed');
    }

    const data = await res.json();
    this.saveSession(data);
    return data;
  },

  saveSession(data) {
    const token = data.access_token || data.token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in || 900; // 15 mins default
    const expiresAt = Date.now() + (expiresIn * 1000);

    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(EXPIRES_AT_KEY, expiresAt.toString());
    if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  },

  async refresh() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'X-API-Key': DEFAULT_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!res.ok) {
      this.logout();
      throw new Error('Refresh token invalid or expired');
    }

    const data = await res.json();
    this.saveSession(data);
    return data;
  },

  async getValidToken() {
    if (this.isTokenExpired()) {
      try {
        await this.refresh();
      } catch (err) {
        console.warn('Token refresh failed:', err);
      }
    }
    return this.getToken();
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

// Setup background timer for proactive token refresh before 15m expires
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (Auth.isAuthenticated() && Auth.isTokenExpired()) {
      Auth.refresh().catch(console.warn);
    }
  }, 60000); // Check every 1 minute
}

// ---------------------------------------------------------------------------
// Data normalization
//
// The same derivations that scripts/generate_submission.mjs runs offline, so
// what the screens show and what submission.json claims cannot drift apart.
// ---------------------------------------------------------------------------

export const REFERENCE_IST = '2026-09-10T00:00:00';
const SQM_TO_SQFT = 10.7639;

// magichomes reports area in square metres for some of its rows. The two
// populations do not overlap: nothing from another portal is below 321 sqft and
// no square-metre row is above 264.
export const isSqMetres = (l) => l.website === 'magichomes' && l.carpet_area < 300;

// Eight rows carry price in thousands of rupees - the only eight prices in the
// dataset that are not a multiple of 10,000.
export const isPriceInThousands = (l) => l.price > 0 && l.price < 50000;

// Six things a listing can claim that cannot be true, plus the thousands-scaled
// price, which as served describes a flat selling for six thousand rupees.
// Plots legitimately carry zero bedrooms, bathrooms and floors.
export const IMPOSSIBLE = {
  negative_price: {
    label: 'Negative sale price',
    test: (l) => l.price < 0,
    describe: (l) => `Sale price is negative (${formatINR(l.price)}).`
  },
  price_in_thousands: {
    label: 'Price in thousands of rupees',
    test: isPriceInThousands,
    describe: (l) => `Price is ${formatINR(l.price)} for a ${l.bedroom} BHK - the value is in thousands, not rupees (${formatINR(l.price * 1000)}).`
  },
  carpet_exceeds_super_builtup: {
    label: 'Carpet area exceeds super built-up',
    test: (l) => l.carpet_area > l.super_built_up_area,
    describe: (l) => `Carpet area (${l.carpet_area}) is larger than super built-up area (${l.super_built_up_area}).`
  },
  floor_exceeds_total_floors: {
    label: 'Floor above the top of the building',
    test: (l) => l.floor > l.total_floors,
    describe: (l) => `On floor ${l.floor} of a ${l.total_floors}-floor building.`
  },
  swapped_coordinates: {
    label: 'Latitude and longitude transposed',
    test: (l) => l.latitude > 50,
    describe: (l) => `Coordinates (${l.latitude}, ${l.longitude}) are transposed - as given the flat sits above the 50th parallel.`
  },
  zero_bedroom_and_bathroom: {
    label: 'Zero bedrooms and bathrooms',
    test: (l) => l.bedroom === 0 && l.bathroom === 0 && l.property_type !== 'plot',
    describe: (l) => `A ${l.property_type} with 0 bedrooms and 0 bathrooms.`
  },
  posted_in_the_future: {
    label: 'Posted in the future',
    test: (l) => l.posted_at >= REFERENCE_IST,
    describe: (l) => `Posted ${String(l.posted_at).slice(0, 10)}, after the reference moment.`
  }
};

export function normalizeListing(l) {
  const converted = isSqMetres(l);
  const carpetAreaSqft = converted ? Math.round(l.carpet_area * SQM_TO_SQFT) : l.carpet_area;
  const superBuiltUpSqft = converted ? Math.round(l.super_built_up_area * SQM_TO_SQFT) : l.super_built_up_area;

  const defects = Object.entries(IMPOSSIBLE)
    .filter(([, d]) => d.test(l))
    .map(([key, d]) => ({ key, label: d.label, detail: d.describe(l) }));

  // Price as it would read once the unit error is undone. Used for rate maths
  // and shown alongside the served value, never silently in place of it.
  const priceInr = isPriceInThousands(l) ? l.price * 1000 : l.price;

  return {
    ...l,
    raw_carpet_area: l.carpet_area,
    raw_super_built_up_area: l.super_built_up_area,
    carpet_area: carpetAreaSqft,
    super_built_up_area: superBuiltUpSqft,
    is_area_converted: converted,
    price_inr: priceInr,
    defects,
    defect_keys: defects.map((d) => d.key),
    is_corrupt: defects.length > 0,
    is_future_dated: l.posted_at >= REFERENCE_IST,
    is_fake: false, // filled in by annotateListings, which needs the whole set
    price_per_sqft: carpetAreaSqft > 0 && priceInr > 0 ? Math.round(priceInr / carpetAreaSqft) : null
  };
}

/**
 * Second pass over the whole collection: the enquiry-bait rings.
 *
 * A single phone number posting under several seller names is what stands out
 * first - twelve numbers do it, nobody else does. Five of those twelve price at
 * market with ordinary verified and live rates and are just busy agencies. The
 * other seven price at roughly half the going rate for the same locality and
 * bedroom count and have every single listing flagged verified and live, which
 * at base rates of 60% and 79% does not happen by chance over 24 listings.
 */
export function annotateListings(rows) {
  const marketRate = new Map();
  const buckets = new Map();
  for (const l of rows) {
    if (l.is_corrupt || l.property_type === 'plot') continue;
    const k = `${l.locality}|${l.bedroom}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(l.price_per_sqft);
  }
  for (const [k, v] of buckets) {
    v.sort((a, b) => a - b);
    marketRate.set(k, v[Math.floor(v.length / 2)]);
  }

  const byPhone = new Map();
  for (const l of rows) {
    if (!byPhone.has(l.posted_by_contact)) byPhone.set(l.posted_by_contact, []);
    byPhone.get(l.posted_by_contact).push(l);
  }

  const baitPhones = new Set();
  const multiNamePhones = new Set();
  for (const [phone, group] of byPhone) {
    if (new Set(group.map((r) => r.posted_by_name)).size < 2) continue;
    multiNamePhones.add(phone);
    if (!group.every((r) => r.is_verified) || !group.every((r) => r.is_live)) continue;
    const ratios = group
      .filter((r) => !r.is_corrupt && r.property_type !== 'plot')
      .map((r) => r.price_per_sqft / marketRate.get(`${r.locality}|${r.bedroom}`))
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);
    if (ratios.length && ratios[Math.floor(ratios.length / 2)] < 0.75) baitPhones.add(phone);
  }

  for (const l of rows) {
    const rate = marketRate.get(`${l.locality}|${l.bedroom}`);
    l.market_rate_ratio = rate ? l.price_per_sqft / rate : null;
    l.locality_market_rate = rate || null;
    l.is_fake = baitPhones.has(l.posted_by_contact);
    l.shares_contact_number = multiNamePhones.has(l.posted_by_contact);
  }
  rows.baitPhones = [...baitPhones].sort();
  rows.multiNamePhones = [...multiNamePhones].sort();
  return rows;
}

export function normalizeProject(p) {
  // In projects, numbers < 10 are in Crores, numbers >= 10 are in Lakhs
  const minInr = p.price_min >= 10 ? Math.round(p.price_min * 1e5) : Math.round(p.price_min * 1e7);
  const maxInr = p.price_max >= 10 ? Math.round(p.price_max * 1e5) : Math.round(p.price_max * 1e7);

  return {
    ...p,
    raw_price_min: p.price_min,
    raw_price_max: p.price_max,
    price_min_inr: minInr,
    price_max_inr: maxInr,
    price_min_display: formatCrores(minInr),
    price_max_display: formatCrores(maxInr)
  };
}

export function formatINR(val) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN');
}

export function formatCrores(inr) {
  if (inr >= 10000000) {
    return `₹${(inr / 10000000).toFixed(2)} Cr`;
  }
  if (inr >= 100000) {
    return `₹${(inr / 100000).toFixed(2)} L`;
  }
  return formatINR(inr);
}

// Data Fetching API
export const API = {
  async fetchListings() {
    if (cachedListings) return cachedListings;
    try {
      const res = await fetch('/data/listings.json');
      const data = await res.json();
      cachedListings = annotateListings(data.map(normalizeListing));
      return cachedListings;
    } catch (e) {
      console.error('Failed to load listings cache:', e);
      return [];
    }
  },

  async fetchDerived() {
    if (cachedDerived) return cachedDerived;
    try {
      const res = await fetch('/data/derived.json');
      cachedDerived = await res.json();
      return cachedDerived;
    } catch (e) {
      console.error('Failed to load derived.json:', e);
      return null;
    }
  },

  async fetchRentals() {
    if (cachedRentals) return cachedRentals;
    try {
      const res = await fetch('/data/rentals.json');
      const data = await res.json();
      cachedRentals = data;
      return cachedRentals;
    } catch (e) {
      console.error('Failed to load rentals cache:', e);
      return [];
    }
  },

  async fetchProjects() {
    if (cachedProjects) return cachedProjects;
    try {
      const res = await fetch('/data/projects.json');
      const data = await res.json();
      cachedProjects = data.map(normalizeProject);
      return cachedProjects;
    } catch (e) {
      console.error('Failed to load projects cache:', e);
      return [];
    }
  },

  async fetchSubmission() {
    if (cachedSubmission) return cachedSubmission;
    try {
      const res = await fetch('/data/submission.json');
      cachedSubmission = await res.json();
      return cachedSubmission;
    } catch (e) {
      console.error('Failed to load submission.json:', e);
      return null;
    }
  },

  // Saved Listings operations.
  //
  // The server is the record of truth - /v1/saved, per user, and it survives a
  // re-login. localStorage only mirrors it so the heart icons are right on the
  // first paint and the list still renders if the network blinks.
  readSavedCache() {
    const raw = localStorage.getItem(savedCacheKey(Auth.getUser()?.email));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map(item => typeof item === 'string' ? item : (item.listing_id || item.id)).filter(Boolean)
        : [];
    } catch (e) {
      return [];
    }
  },

  writeSavedCache(ids) {
    localStorage.setItem(savedCacheKey(Auth.getUser()?.email), JSON.stringify(ids));
  },

  async getSavedListings() {
    const token = await Auth.getValidToken();
    if (!token) return this.readSavedCache();

    try {
      const res = await fetch(`${BASE_URL}/v1/saved`, {
        headers: {
          'X-API-Key': DEFAULT_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        const ids = results.map(item => typeof item === 'string' ? item : (item.listing_id || item.id)).filter(Boolean);
        this.writeSavedCache(ids);
        return ids;
      }
    } catch (err) {
      console.warn('API getSaved error, using fallback:', err);
    }
    return this.readSavedCache();
  },

  async saveListing(listingId) {
    const token = await Auth.getValidToken();
    // Update local cache first
    const current = await this.getSavedListings();
    if (!current.includes(listingId)) {
      this.writeSavedCache([...current, listingId]);
    }

    if (token) {
      try {
        await fetch(`${BASE_URL}/v1/saved`, {
          method: 'POST',
          headers: {
            'X-API-Key': DEFAULT_API_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ listing_id: listingId })
        });
      } catch (err) {
        console.warn('API saveListing error:', err);
      }
    }
    return true;
  },

  async removeSavedListing(listingId) {
    const token = await Auth.getValidToken();
    const current = await this.getSavedListings();
    this.writeSavedCache(current.filter(id => id !== listingId));

    if (token) {
      try {
        await fetch(`${BASE_URL}/v1/saved/${listingId}`, {
          method: 'DELETE',
          headers: {
            'X-API-Key': DEFAULT_API_KEY,
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.warn('API removeSavedListing error:', err);
      }
    }
    return true;
  }
};
