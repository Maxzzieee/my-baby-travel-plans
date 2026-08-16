import { haversineKm, SEOUL_CENTER } from "./lib/geo";

// Auto-itinerary. Base camp is Jongno-gu, so days radiate from there: the day
// nearest base comes first (arrival day is light — the airport transfer eats
// the morning), Day 1 opens with that transfer, far ideas become day-trips.
// Each day has a real rhythm — 3 meals + a café, pace-scaled sights, shopping
// only when it's nearby — clustered so a day stays walkable.
//
// Day-trips are treated as HALF a day: the far spot lands at midday, so there's
// room for a morning bite and an afternoon activity/meal (the gap-nudge fills
// those near the spot). Day-trips that sit close together (e.g. Nami Island +
// Garden of Morning Calm, both in Gapyeong) are merged into a single day.
export const BASE_JONGNO = { lat: 37.5714, lng: 126.9918 }; // Jongno 3-ga Station
const TRIP_KM = 25;         // >25km from Seoul center = a day-trip
const TRIP_CLUSTER_KM = 30; // day-trips within 30km of EACH OTHER share a day

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
// Day-trip day: later start (travel eats the morning), the far spot sits midday.
const TRIP_FOOD_TIMES = ["11:00", "18:00"]; // brunch near/at the spot, dinner
const TRIP_ACT_TIMES = ["12:30", "15:00", "16:30", "10:00"];

function scheduleDay(stops, mode = "city") {
  const trip = mode === "trip";
  const fTimes = trip ? TRIP_FOOD_TIMES : FOOD_TIMES;
  const aTimes = trip ? TRIP_ACT_TIMES : ACT_TIMES;
  const foods = stops.filter(isFood).slice(0, fTimes.length + 1);
  const others = stops.filter((s) => !isFood(s));
  const timed = [];
  foods.forEach((s, i) => timed.push({ ...s, _time: fTimes[i] || fTimes[fTimes.length - 1] }));
  others.forEach((s, i) => timed.push({ ...s, _time: aTimes[i] || "17:00", _trip: trip }));
  timed.sort((a, b) => a._time.localeCompare(b._time));
  return timed;
}

// Single-linkage clustering (union-find): groups day-trips that are within
// thresholdKm of any other member, so a chain of nearby spots becomes one day.
function clusterByProximity(items, thresholdKm) {
  const n = items.length;
  const parent = items.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (haversineKm(co(items[i]), co(items[j])) <= thresholdKm) parent[find(i)] = find(j);
  const groups = {};
  for (let i = 0; i < n; i++) { const r = find(i); (groups[r] ||= []).push(items[i]); }
  return Object.values(groups);
}

export function buildAutoPlan(ideas, pace = "balanced", totalDays = 8, base = BASE_JONGNO) {
  const q = QUOTAS[pace] || QUOTAS.balanced;
  const withC = ideas.filter((i) => i.lat != null && i.lng != null);
  const isTrip = (i) => haversineKm(SEOUL_CENTER, co(i)) > TRIP_KM;

  // Day-trips → clustered into shared days, nearest cluster to base scheduled first.
  const nearBase = (cl) => Math.min(...cl.map((m) => haversineKm(base, co(m))));
  const clusters = clusterByProximity(withC.filter(isTrip), TRIP_CLUSTER_KM)
    .sort((a, b) => nearBase(a) - nearBase(b));
  const tripClusters = clusters.slice(0, 3); // at most 3 day-trip days
  let pool = withC.filter((i) => !isTrip(i));

  const cityBudget = Math.max(1, totalDays - tripClusters.length);
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
  // day-trips last — each cluster is one half-day-anchored day
  for (const cl of tripClusters) days.push(scheduleDay(cl, "trip"));
  return days;
}
