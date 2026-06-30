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
