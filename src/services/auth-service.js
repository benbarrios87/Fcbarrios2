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

  supabase.auth.onAuthStateChange((_event, session) => {
    currentSession = session;

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

function cleanEmail(email) {
  const value = String(email || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error("Skriv inn en gyldig e-postadresse.");
  }

  return value;
}

function validatePassword(password) {
  const value = String(password || "");

  if (value.length < 8) {
    throw new Error("Passordet må ha minst 8 tegn.");
  }

  return value;
}

export async function signInWithPassword(email, password) {
  if (!supabase) throw new Error("Supabase er ikke koblet til.");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail(email),
    password: validatePassword(password)
  });

  if (error) {
    if (error.message.toLowerCase().includes("invalid login")) {
      throw new Error("Feil e-post eller passord.");
    }

    throw new Error(error.message);
  }

  currentSession = data.session;
  await loadIdentity();
  notify();

  return data;
}

export async function signUpWithPassword(email, password, displayName = "") {
  if (!supabase) throw new Error("Supabase er ikke koblet til.");

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail(email),
    password: validatePassword(password),
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: {
        display_name: String(displayName || "").trim()
      }
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function requestPasswordReset(email) {
  if (!supabase) throw new Error("Supabase er ikke koblet til.");

  const { error } = await supabase.auth.resetPasswordForEmail(
    cleanEmail(email),
    {
      redirectTo: `${window.location.origin}/reset-password`
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePassword(newPassword) {
  if (!supabase) throw new Error("Supabase er ikke koblet til.");

  const { error } = await supabase.auth.updateUser({
    password: validatePassword(newPassword)
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendMagicLink(email, displayName = "") {
  if (!supabase) {
    throw new Error("Supabase er ikke koblet til.");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail(email),
    options: {
      emailRedirectTo: `${window.location.origin}/`,
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
