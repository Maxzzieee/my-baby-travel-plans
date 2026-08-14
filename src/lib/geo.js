// ---------------------------------------------------------------------------
// Geocoding + distance helpers for the trip planner map.
// Keyless: OpenStreetMap Nominatim for place -> {lat, lng}, haversine for
// straight-line distance between stops. Biased to Seoul (the confirmed trip).
// If we later want best-in-Korea data, swap geocodePlace for the Kakao Local
// API behind a serverless function — nothing else here changes.
// ---------------------------------------------------------------------------

// Seoul bounding box (lon/lat) to bias + constrain results to the city.
const SEOUL_VIEWBOX = "126.734,37.701,127.269,37.413"; // left,top,right,bottom
export const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

// Nominatim asks for max ~1 request/second + an identifying UA/email. We queue
// lookups so a burst of new stops geocodes politely one at a time.
let chain = Promise.resolve();
const cache = new Map(); // query -> {lat,lng} | null

function raw(query) {
  // Server endpoint does Kakao Local (best in Korea) with an OSM fallback.
  return fetch("/api/geocode?q=" + encodeURIComponent(query))
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d || d.lat == null || d.lng == null) return null;
      const lat = +d.lat, lng = +d.lng;
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    })
    .catch(() => null);
}

// Geocode a place name/address to coordinates (queued, cached).
export function geocodePlace(query) {
  const key = String(query || "").trim().toLowerCase();
  if (!key) return Promise.resolve(null);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  const run = chain.then(async () => {
    if (cache.has(key)) return cache.get(key);
    const res = await raw(query);
    cache.set(key, res);
    // small gap between lookups (Kakao is generous; keep it polite)
    await new Promise((r) => setTimeout(r, 300));
    return res;
  });
  // keep the chain alive even if one lookup throws
  chain = run.catch(() => {});
  return run;
}

// Straight-line distance between two {lat,lng} points, in km.
export function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// A friendly distance + rough walk time label for a leg between two stops.
export function legLabel(a, b) {
  const km = haversineKm(a, b);
  if (km == null) return null;
  const dist = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  const walkMin = Math.round((km / 4.8) * 60); // ~4.8 km/h walking
  const time = km <= 2.5 ? `~${walkMin} min walk` : "farther — transit";
  return `${dist} · ${time}`;
}
