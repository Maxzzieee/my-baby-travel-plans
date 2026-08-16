import { haversineKm, SEOUL_CENTER } from "./lib/geo";

// Auto-itinerary. Base camp is Jongno-gu, so days radiate from there: the day
// nearest base comes first (arrival day is light — the airport transfer eats
// the morning), Day 1 opens with that transfer, far ideas become day-trips.
// Each day has a real rhythm — 3 meals + a café, pace-scaled sights, shopping
// only when it's nearby — clustered so a day stays walkable.
export const BASE_JONGNO = { lat: 37.5714, lng: 126.9918 }; // Jongno 3-ga Station

const co = (i) => ({ lat: i.lat, lng: i.lng });
const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const isFood = (i) => i.kind === "food";
const isShop = (i) => i.kind === "shop";

const QUOTAS = {
  relaxed: { food: 3, act: 1, shop: 1 },
  balanced: { food: 3, act: 2, shop: 1 },
  packed: { food: 4, act: 3, shop: 1 },
  extreme: { food: 4, act: 4, shop: 2 },
};
const FOOD_TIMES = ["09:00", "12:30", "15:30", "18:30"]; // breakfast, lunch, café, dinner
const ACT_TIMES = ["10:45", "14:00", "16:45", "20:00", "11:30", "17:30"];

function scheduleDay(stops, trip) {
  if (trip) return [{ ...stops[0], _time: "10:00", _trip: true }];
  const foods = stops.filter(isFood).slice(0, 4);
  const others = stops.filter((s) => !isFood(s));
  const timed = [];
  foods.forEach((s, i) => timed.push({ ...s, _time: FOOD_TIMES[i] || "18:30" }));
  others.forEach((s, i) => timed.push({ ...s, _time: ACT_TIMES[i] || "17:00" }));
  timed.sort((a, b) => a._time.localeCompare(b._time));
  return timed;
}

export function buildAutoPlan(ideas, pace = "balanced", totalDays = 8, base = BASE_JONGNO) {
  const q = QUOTAS[pace] || QUOTAS.balanced;
  const withC = ideas.filter((i) => i.lat != null && i.lng != null);
  const isTrip = (i) => haversineKm(SEOUL_CENTER, co(i)) > 25; // >25km = day-trip
  const trips = withC.filter(isTrip).sort((a, b) => haversineKm(SEOUL_CENTER, co(a)) - haversineKm(SEOUL_CENTER, co(b)));
  let pool = withC.filter((i) => !isTrip(i));

  const tripDays = Math.min(trips.length, 3);
  const cityBudget = Math.max(1, totalDays - tripDays);
  const cityDays = [];
  for (let d = 0; d < cityBudget && pool.length; d++) {
    // seed from the edges so each cluster stays tight
    pool.sort((a, b) => haversineKm(SEOUL_CENTER, co(b)) - haversineKm(SEOUL_CENTER, co(a)));
    const seed = pool[0];
    const cands = [...pool].sort((a, b) => haversineKm(co(seed), co(a)) - haversineKm(co(seed), co(b))).slice(0, 16);
    const chosen = [];
    const take = (test, cap) => { let n = 0; for (const c of cands) { if (n >= cap) break; if (!chosen.includes(c) && test(c)) { chosen.push(c); n++; } } };
    take(isFood, q.food);
    take((c) => !isFood(c) && !isShop(c), q.act); // sights/activities
    take(isShop, q.shop);
    if (!chosen.length) break;
    chosen.forEach((c) => pool.splice(pool.indexOf(c), 1));
    cityDays.push({ stops: scheduleDay(chosen), cx: avg(chosen.map((c) => c.lng)), cy: avg(chosen.map((c) => c.lat)) });
  }

  // radiate from base camp — the day nearest Jongno comes first
  cityDays.sort((a, b) => haversineKm(base, { lat: a.cy, lng: a.cx }) - haversineKm(base, { lat: b.cy, lng: b.cx }));
  const days = cityDays.map((c) => c.stops);
  if (days[0]) {
    days[0].unshift({ title: "✈️ Arrive: Incheon → Jongno base", kind: "stay", _time: "", lat: base.lat, lng: base.lng, location: "Jongno-gu · base camp", _arrival: true });
  }
  for (let t = 0; t < tripDays; t++) days.push(scheduleDay([trips[t]], true)); // day-trips last
  return days;
}
