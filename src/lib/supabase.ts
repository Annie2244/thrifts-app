import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabase = Boolean(supabaseUrl && supabaseKey);

const createSupabaseClient = () => createClient(supabaseUrl, supabaseKey);

// Avoid throwing during build/prerender when env vars are missing.
export const supabase = hasSupabase
  ? createSupabaseClient()
  : (new Proxy(
      {},
      {
        get() {
          throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        },
      }
    ) as ReturnType<typeof createClient>);

if (process.env.NODE_ENV !== "production" && !hasSupabase) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Falling back to local mock data."
  );
}
