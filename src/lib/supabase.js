import { createClient } from "@supabase/supabase-js";

/**
 * Shared realtime sync for "My Baby Travel Plans".
 *
 * Stores the whole app state (votes + plans) as a single JSON row so both
 * partners see the same board live. No login — fine for a 2-person private app.
 * If the env vars aren't set, everything silently falls back to localStorage.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && key);
export const supabase = hasSupabase ? createClient(url, key) : null;

const ROW_ID = "shared";
export const clientId =
  (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
  Math.random().toString(36).slice(2);

// Read the shared state once on load. Returns { votes, plans } or null.
export async function loadState() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("trip_state")
      .select("votes,plans")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (error) {
      console.warn("[supabase] loadState:", error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn("[supabase] loadState failed:", e?.message || e);
    return null;
  }
}

// Upsert the shared state. last_client lets clients ignore their own echoes.
export async function saveState(votes, plans) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("trip_state").upsert({
      id: ROW_ID,
      votes,
      plans,
      last_client: clientId,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn("[supabase] saveState:", error.message);
  } catch (e) {
    console.warn("[supabase] saveState failed:", e?.message || e);
  }
}

// Subscribe to remote changes made by the *other* device. Returns an unsubscribe fn.
export function subscribe(onRemote) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("trip_state_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "trip_state", filter: `id=eq.${ROW_ID}` },
      (payload) => {
        const row = payload.new;
        if (!row || row.last_client === clientId) return; // ignore our own writes
        onRemote({ votes: row.votes, plans: row.plans });
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ---------------------------------------------------------------------------
// Photos & Memes wall — images live in Supabase Storage, metadata in `gallery`
// ---------------------------------------------------------------------------
const BUCKET = "memes";

export async function loadGallery() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("gallery")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.warn("[supabase] loadGallery:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn("[supabase] loadGallery failed:", e?.message || e);
    return [];
  }
}

export async function postImage(file, who, caption) {
  if (!supabase) throw new Error("Sync not configured");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
  if (up.error) throw up.error;
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const ins = await supabase
    .from("gallery")
    .insert({ url: pub.publicUrl, path, who, caption })
    .select()
    .single();
  if (ins.error) throw ins.error;
  return ins.data;
}

// Upload an image to storage and return its public URL (for attaching to ideas).
export async function uploadImage(file) {
  if (!supabase) return null;
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `ideas/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
  if (up.error) throw up.error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteImage(item) {
  if (!supabase) return;
  try {
    if (item.path) await supabase.storage.from(BUCKET).remove([item.path]);
    await supabase.from("gallery").delete().eq("id", item.id);
  } catch (e) {
    console.warn("[supabase] deleteImage failed:", e?.message || e);
  }
}

export function subscribeGallery(onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("gallery_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "gallery" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ---------------------------------------------------------------------------
// Editable site copy — shared for everyone. Stored as its own trip_state row
// (id="site_copy") in the generic `plans` jsonb column, so no schema change.
// ---------------------------------------------------------------------------
const COPY_ID = "site_copy";

export async function loadCopy() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("trip_state").select("plans").eq("id", COPY_ID).maybeSingle();
    if (error) { console.warn("[supabase] loadCopy:", error.message); return null; }
    return data?.plans || null;
  } catch (e) {
    console.warn("[supabase] loadCopy failed:", e?.message || e);
    return null;
  }
}

export async function saveCopy(copy) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("trip_state").upsert({
      id: COPY_ID, plans: copy, last_client: clientId, updated_at: new Date().toISOString(),
    });
    if (error) console.warn("[supabase] saveCopy:", error.message);
  } catch (e) {
    console.warn("[supabase] saveCopy failed:", e?.message || e);
  }
}

export function subscribeCopy(onRemote) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("copy_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "trip_state", filter: `id=eq.${COPY_ID}` }, (payload) => {
      const row = payload.new;
      if (!row || row.last_client === clientId) return;
      onRemote(row.plans || {});
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ---------------------------------------------------------------------------
// Per-destination live chat — append-only `messages` table, realtime
// ---------------------------------------------------------------------------
export async function loadMessages(dest) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("dest", dest)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) { console.warn("[supabase] loadMessages:", error.message); return []; }
    return data || [];
  } catch (e) {
    console.warn("[supabase] loadMessages failed:", e?.message || e);
    return [];
  }
}

export async function postMessage({ dest, who, body }) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("messages").insert({ dest, who, body });
    if (error) console.warn("[supabase] postMessage:", error.message);
  } catch (e) {
    console.warn("[supabase] postMessage failed:", e?.message || e);
  }
}

export function subscribeMessages(dest, onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`messages_${dest}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `dest=eq.${dest}` }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// Message counts per destination (for unread badges), + a global subscription.
export async function loadMessageCounts() {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase.from("messages").select("dest").limit(5000);
    if (error) { console.warn("[supabase] loadMessageCounts:", error.message); return {}; }
    const counts = {};
    for (const r of data || []) counts[r.dest] = (counts[r.dest] || 0) + 1;
    return counts;
  } catch (e) {
    console.warn("[supabase] loadMessageCounts failed:", e?.message || e);
    return {};
  }
}

export function subscribeAllMessages(onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("all_messages")
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ---------------------------------------------------------------------------
// Itinerary — per-destination, day-by-day timed items (realtime)
// ---------------------------------------------------------------------------
export async function loadItinerary(dest) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("itinerary")
      .select("*")
      .eq("dest", dest)
      .order("day", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true })
      .order("position", { ascending: true });
    if (error) { console.warn("[supabase] loadItinerary:", error.message); return []; }
    return data || [];
  } catch (e) {
    console.warn("[supabase] loadItinerary failed:", e?.message || e);
    return [];
  }
}

export async function addItineraryItem(row) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("itinerary").insert(row).select().single();
    if (error) { console.warn("[supabase] addItineraryItem:", error.message); return null; }
    return data;
  } catch (e) {
    console.warn("[supabase] addItineraryItem failed:", e?.message || e);
    return null;
  }
}

export async function updateItineraryItem(id, patch) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("itinerary").update(patch).eq("id", id);
    if (error) console.warn("[supabase] updateItineraryItem:", error.message);
  } catch (e) {
    console.warn("[supabase] updateItineraryItem failed:", e?.message || e);
  }
}

export async function deleteItineraryItem(id) {
  if (!supabase) return;
  try {
    await supabase.from("itinerary").delete().eq("id", id);
  } catch (e) {
    console.warn("[supabase] deleteItineraryItem failed:", e?.message || e);
  }
}

// ---------------------------------------------------------------------------
// Live room — presence (who's online), typing + floating-reaction broadcasts
// ---------------------------------------------------------------------------
export function joinRoom(me, handlers) {
  handlers = handlers || {};
  if (!supabase) return { setTyping: function () {}, sendReaction: function () {}, leave: function () {} };
  var ch = supabase.channel("room-1", { config: { presence: { key: clientId } } });
  ch.on("presence", { event: "sync" }, function () {
    var st = ch.presenceState();
    var whos = {};
    Object.keys(st).forEach(function (k) { (st[k] || []).forEach(function (m) { if (m && m.who) whos[m.who] = true; }); });
    if (handlers.onPresence) handlers.onPresence(Object.keys(whos));
  });
  ch.on("broadcast", { event: "reaction" }, function (m) { if (handlers.onReaction) handlers.onReaction(m.payload || {}); });
  ch.on("broadcast", { event: "typing" }, function (m) { if (handlers.onTyping) handlers.onTyping(m.payload || {}); });
  ch.subscribe(function (status) { if (status === "SUBSCRIBED") ch.track({ who: me, at: Date.now() }); });
  return {
    setTyping: function (dest, on) { try { ch.send({ type: "broadcast", event: "typing", payload: { who: me, dest: dest, on: !!on } }); } catch (e) {} },
    sendReaction: function (emoji) { try { ch.send({ type: "broadcast", event: "reaction", payload: { who: me, emoji: emoji } }); } catch (e) {} },
    leave: function () { try { supabase.removeChannel(ch); } catch (e) {} },
  };
}

export function subscribeItinerary(dest, onChange) {
  if (!supabase) return () => {};
  // No dest filter: Supabase DELETE events only carry the primary key, so a
  // dest filter silently drops them and deletions never reach the other device.
  const channel = supabase
    .channel(`itinerary_${dest}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "itinerary" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}
