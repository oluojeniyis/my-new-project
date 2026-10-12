import "server-only";

import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";

export async function getAdminAccess() {
  const allowedEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  if (!allowedEmails.size) {
    return { status: "allowlist-missing" } as const;
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return { status: "supabase-unconfigured" } as const;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error?.name === "AuthSessionMissingError") {
    return { status: "unauthenticated" } as const;
  }

  if (error) {
    console.error("Unable to verify the admin session.", error);
    return { status: "auth-error" } as const;
  }

  if (!user) {
    return { status: "unauthenticated" } as const;
  }

  if (!user.email || !allowedEmails.has(user.email.trim().toLowerCase())) {
    return { status: "forbidden" } as const;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: "service-role-missing" } as const;
  }

  return { status: "authorized", user } as const;
}

export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
