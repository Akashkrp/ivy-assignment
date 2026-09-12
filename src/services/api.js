// Ivy Homes API Client & Data Normalizer Service
const BASE_URL = 'https://solve.ivy.homes';
export const DEFAULT_API_KEY = 'IVY26-AD650B779304';
export const ASSIGNED_LOCALITY = 'bellandur';
export const CITY = 'Bangalore';

// Demo Credentials for quick-fill
export const DEMO_USERS = [
  { email: 'demo1@ivy.homes', role: 'Primary Demo' },
  { email: 'demo2@ivy.homes', role: 'Reviewer Account' },
  { email: 'demo3@ivy.homes', role: 'Auditor Account' },
];
export const DEMO_PASSWORD = 'c42d10ad7b';

// Session Storage Keys
const TOKEN_KEY = 'ivy_access_token';
const REFRESH_KEY = 'ivy_refresh_token';
const USER_KEY = 'ivy_user';
const EXPIRES_AT_KEY = 'ivy_token_expires_at';
const SAVED_CACHE_KEY = 'ivy_saved_listings_cache';

// In-memory cached full datasets for instantaneous browsing & resilient filtering
let cachedListings = null;
let cachedRentals = null;
let cachedProjects = null;
let cachedSubmission = null;

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

// Data Normalization Utilities
export function normalizeListing(l) {
  // Check if carpet_area is reported in square meters (< 300) on magichomes
  const isSqMeters = l.website === 'magichomes' && l.carpet_area < 300;
  const carpetAreaSqft = isSqMeters ? Math.round(l.carpet_area * 10.7639) : l.carpet_area;

  // Anomaly checks
  const isNegativePrice = l.price < 0;
  const isFakePrice = l.price > 0 && l.price < 50000;
  const isFloorAnomaly = l.total_floors > 0 && l.floor > l.total_floors;
  const isAreaAnomaly = l.carpet_area > l.super_built_up_area;
  const isCoordsAnomaly = l.latitude > 50 && l.longitude < 20;
  const isZeroBhkAnomaly = l.bedroom <= 0 && l.property_type !== 'plot';
  const isFutureDate = l.posted_at > '2026-09-10T00:00:00';

  const isCorrupt = isNegativePrice || isFloorAnomaly || isAreaAnomaly || isCoordsAnomaly || isZeroBhkAnomaly;
  const isFake = isFakePrice;

  return {
    ...l,
    raw_carpet_area: l.carpet_area,
    carpet_area: carpetAreaSqft,
    is_area_converted: isSqMeters,
    is_corrupt: isCorrupt,
    is_fake: isFake,
    is_future_dated: isFutureDate,
    price_per_sqft: (carpetAreaSqft > 0 && l.price > 0) ? Math.round(l.price / carpetAreaSqft) : null
  };
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
      cachedListings = data.map(normalizeListing);
      return cachedListings;
    } catch (e) {
      console.error('Failed to load listings cache:', e);
      return [];
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

  // Saved Listings operations
  async getSavedListings() {
    const token = await Auth.getValidToken();
    if (!token) {
      const local = localStorage.getItem(SAVED_CACHE_KEY);
      return local ? JSON.parse(local) : [];
    }

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
        localStorage.setItem(SAVED_CACHE_KEY, JSON.stringify(results));
        return results;
      }
    } catch (err) {
      console.warn('API getSaved error, using fallback:', err);
    }
    const local = localStorage.getItem(SAVED_CACHE_KEY);
    return local ? JSON.parse(local) : [];
  },

  async saveListing(listingId) {
    const token = await Auth.getValidToken();
    // Update local cache first
    const current = await this.getSavedListings();
    if (!current.includes(listingId)) {
      const updated = [...current, listingId];
      localStorage.setItem(SAVED_CACHE_KEY, JSON.stringify(updated));
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
    const updated = current.filter(id => id !== listingId);
    localStorage.setItem(SAVED_CACHE_KEY, JSON.stringify(updated));

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
