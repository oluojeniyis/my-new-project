"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { createClientSideSupabase, getSupabaseConfig } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function SiteHeader() {
  const { itemCount } = useCart();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(() => getSupabaseConfig().configured);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClientSideSupabase();
    if (!supabase) {
      return;
    }

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    const supabase = createClientSideSupabase();
    if (!supabase) {
      setAuthMessage(
        "Google sign-in is not configured. Add your Supabase URL and anon key to .env.local, then restart the app.",
      );
      return;
    }

    const redirect = new URL("/auth/callback", window.location.origin).toString();
    setAuthMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirect,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("Google sign-in could not be started.", error);
        setAuthMessage("Google sign-in could not be started. Check the Supabase Google provider settings.");
      }
    } catch (error) {
      console.error("Google sign-in could not be started.", error);
      setAuthMessage("Google sign-in could not be started. Please try again.");
    }
  };

  const handleSignOut = async () => {
    const supabase = createClientSideSupabase();
    if (!supabase) {
      setAuthMessage("Sign-out is unavailable because Supabase is not configured.");
      return;
    }

    setAuthMessage(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Unable to sign out.", error);
      setAuthMessage("Unable to sign out. Please try again.");
      return;
    }
    setUser(null);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <Link aria-label="TeesTale home" className="wordmark" href="/">
          TEESTALE
        </Link>
        <nav aria-label="Main navigation" className="main-nav">
          <Link href="/shop">Shop all</Link>
          <Link href="/shop?category=wholesale-blanks">Wholesale</Link>
          <Link href="/shop?category=retail-polos">Polos</Link>
          <Link href="/shop?category=bespoke-custom-mesh">Custom mesh</Link>
          {user && <Link href="/admin/products">Catalog editor</Link>}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <Link className="text-link" href="/orders">My orders</Link>
              <button className="header-auth-action" onClick={handleSignOut} type="button">
                {isLoading ? "Loading..." : "Sign out"}
              </button>
            </>
          ) : (
            <button className="header-auth-action" onClick={handleSignIn} type="button">
              {isLoading ? "Loading..." : "Sign in with Google"}
            </button>
          )}
          <Link aria-label={`Cart, ${itemCount} items`} className="cart-link" href="/cart">
            <span>Bag</span>
            <span aria-live="polite" className="cart-count">{itemCount}</span>
          </Link>
        </div>
      </header>
      {authMessage && (
        <p aria-live="polite" className="auth-message" role="status">
          {authMessage}
        </p>
      )}
    </>
  );
}
