/**
 * Vercel Serverless Function: GET /api/flights?to=<destId>
 *
 * Returns the top-5 cheapest SIN → city round-trips for the trip dates via the
 * Amadeus Self-Service API (free key). Works only when AMADEUS_KEY/SECRET are set
 * — otherwise responds { configured: false } and the UI shows the Google Flights
 * deep-link instead (which needs no key).
 *
 * Env:
 *   AMADEUS_KEY, AMADEUS_SECRET   (from developers.amadeus.com)
 *   AMADEUS_ENV = "test" | "production"  (default "test")
 */

export const config = { maxDuration: 20 };

const CITY_IATA = { sapporo: "CTS", seoul: "ICN", tokyo: "TYO", taipei: "TPE", fukuoka: "FUK", sydney: "SYD" };
const ORIGIN = "SIN";
const DEPART = "2026-11-27";
const RETURN = "2026-12-04";

const BASE = () => (process.env.AMADEUS_ENV === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com");

let tokenCache = { token: null, exp: 0 };
async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token;
  const r = await fetch(BASE() + "/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: process.env.AMADEUS_KEY, client_secret: process.env.AMADEUS_SECRET }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(j.error_description || "Amadeus auth failed");
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return tokenCache.token;
}

function shapeOffers(j) {
  const carriers = (j.dictionaries && j.dictionaries.carriers) || {};
  return (j.data || [])
    .map((o) => {
      const out = o.itineraries[0];
      const back = o.itineraries[1];
      const segs = out.segments;
      const bagInfo = o.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags;
      const bags = bagInfo
        ? bagInfo.quantity != null
          ? `${bagInfo.quantity} bag${bagInfo.quantity !== 1 ? "s" : ""}`
          : bagInfo.weight
            ? `${bagInfo.weight}${bagInfo.weightUnit || "kg"}`
            : "included"
        : "none / add-on";
      const codes = [...new Set(segs.map((s) => s.carrierCode))];
      const dur = (d) => (d || "").replace("PT", "").replace("H", "h ").replace("M", "m").toLowerCase().trim();
      return {
        price: Number(o.price.grandTotal),
        currency: o.price.currency || "SGD",
        airlines: codes.map((c) => carriers[c] || c),
        outStops: segs.length - 1,
        outDur: dur(out.duration),
        backStops: back ? back.segments.length - 1 : null,
        depTime: segs[0].departure.at,
        bags,
      };
    })
    .sort((a, b) => a.price - b.price)
    .slice(0, 5);
}

export default async function handler(req, res) {
  const to = String(req.query?.to || "").toLowerCase();
  const dest = CITY_IATA[to];
  if (!dest) return res.status(400).json({ error: "unknown destination" });
  if (!process.env.AMADEUS_KEY || !process.env.AMADEUS_SECRET) return res.status(200).json({ configured: false, dest });
  try {
    const token = await getToken();
    const url = `${BASE()}/v2/shopping/flight-offers?originLocationCode=${ORIGIN}&destinationLocationCode=${dest}&departureDate=${DEPART}&returnDate=${RETURN}&adults=1&currencyCode=SGD&max=15`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (j.errors) return res.status(200).json({ configured: true, offers: [], note: j.errors[0]?.detail || "no offers for these dates" });
    return res.status(200).json({ configured: true, offers: shapeOffers(j) });
  } catch (err) {
    console.error("flights error:", err?.message || err);
    return res.status(200).json({ configured: true, offers: [], note: err?.message || "lookup failed" });
  }
}
