import { supabase, hasSupabaseConfig } from "./supabase-client.js";

let currentSession = null;
let currentPlayer = null;
let currentMembership = null;
const listeners = new Set();

function notify() {
  const snapshot = getAuthSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

async function loadIdentity() {
  if (!supabase || !currentSession?.user) {
    currentPlayer = null;
    currentMembership = null;
    return;
  }

  const [playerResult, membershipResult] = await Promise.all([
    supabase.rpc("current_player"),
    supabase.rpc("current_tournament_membership", {
      target_tournament_slug:
        import.meta.env.VITE_ACTIVE_TOURNAMENT_SLUG || "euro-2028"
    })
  ]);

  if (playerResult.error) {
    console.error("Kunne ikke hente spiller:", playerResult.error);
  }

  if (membershipResult.error) {
    console.error("Kunne ikke hente medlemskap:", membershipResult.error);
  }

  currentPlayer = playerResult.data?.[0] ?? null;
  currentMembership = membershipResult.data?.[0] ?? null;
}

export async function initializeAuth() {
  if (!hasSupabaseConfig) {
    notify();
    return;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Kunne ikke lese innloggingen: ${error.message}`);
  }

  currentSession = data.session;
  await loadIdentity();
  notify();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentSession = session;

    // Avoid doing database work synchronously inside the auth callback.
    window.setTimeout(async () => {
      await loadIdentity();
      notify();
    }, 0);
  });
}

export function subscribeToAuth(listener) {
  listeners.add(listener);
  listener(getAuthSnapshot());

  return () => listeners.delete(listener);
}

export function getAuthSnapshot() {
  return {
    configured: hasSupabaseConfig,
    session: currentSession,
    user: currentSession?.user ?? null,
    player: currentPlayer,
    membership: currentMembership,
    isAuthenticated: Boolean(currentSession?.user),
    isAdmin: ["admin", "owner"].includes(currentMembership?.role)
  };
}

export async function sendMagicLink(email, displayName = "") {
  if (!supabase) {
    throw new Error("Supabase er ikke koblet til.");
  }

  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error("Skriv inn en gyldig e-postadresse.");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      emailRedirectTo: `${window.location.origin}/profile`,
      data: {
        display_name: String(displayName || "").trim()
      }
    }
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut() {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function refreshIdentity() {
  await loadIdentity();
  notify();
}
