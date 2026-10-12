"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { CheckoutSummary } from "@/components/checkout-summary";
import { useCart } from "@/components/cart-provider";
import { createClientSideSupabase } from "@/lib/supabase";
import type { Product } from "@/lib/products";
import type { User } from "@supabase/supabase-js";

export function CheckoutPageClient({ products }: { products: Product[] }) {
  const { items, clearCart } = useCart();
  const hasUnpricedItems = items.some((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    if (!product) return true;
    return product.category === "wholesale-blanks"
      ? product.wholesalePrice === null && product.retailPrice === null
      : product.retailPrice === null && product.wholesalePrice === null;
  });
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClientSideSupabase();
    if (!supabase) {
      return;
    }

    const loadUser = async () => {
      const {
        data: { user: activeUser },
      } = await supabase.auth.getUser();
      setUser(activeUser);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;

    if (items.length === 0) {
      setStatus({ tone: "error", message: "Add at least one item before checking out." });
      return;
    }

    if (!user) {
      setStatus({ tone: "error", message: "Please sign in with Google before placing your order." });
      return;
    }

    const form = new FormData(formElement);
    const payload = {
      email: String(form.get("email") ?? "").trim(),
      name: String(form.get("name") ?? "").trim(),
      notes: String(form.get("notes") ?? "").trim(),
      cart: items,
    };

    if (!payload.email) {
      setStatus({ tone: "error", message: "Add the email address for this order." });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as { error?: string; message?: string; orderId?: string } | null;

      if (!response.ok || !result || !result.orderId) {
        setStatus({ tone: "error", message: result?.error ?? "Checkout could not be completed." });
        return;
      }

      setStatus({ tone: "success", message: `Order ${result.orderId.slice(0, 8)} was saved successfully.` });
      clearCart();
      formElement.reset();
    } catch {
      setStatus({ tone: "error", message: "Something went wrong while placing your order." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const supabase = createClientSideSupabase();
    if (!supabase) {
      setStatus({
        tone: "error",
        message: "Supabase is not configured yet. Add the public URL and anon key to finish setup.",
      });
      return;
    }

    const redirect = new URL("/auth/callback", window.location.origin).toString();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirect,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };

  return (
    <main className="checkout-page section-wrap" id="main-content">
      <div className="page-title-line">
        <div>
          <h1>Checkout.</h1>
          <p>Review your pull slip and place the order when you are ready.</p>
        </div>
        <Link className="text-link" href="/cart">← Back to pull slip</Link>
      </div>

      {!user && (
        <div className="checkout-notice" role="note">
          <span aria-hidden="true">!</span>
          <p>Sign in with Google to place this order and save it to your account.</p>
        </div>
      )}

      {hasUnpricedItems && (
        <div className="checkout-notice" role="note">
          <span aria-hidden="true">!</span>
          <p>Checkout is paused until prices for every item are confirmed. No order or email will be sent yet.</p>
        </div>
      )}

      {status && (
        <div className="checkout-notice" role="status" style={{ borderColor: status.tone === "success" ? "#374151" : "#111827" }}>
          <span aria-hidden="true">{status.tone === "success" ? "✓" : "!"}</span>
          <p>{status.message}</p>
        </div>
      )}

      <div className="checkout-layout">
        <form aria-label="Checkout details" className="checkout-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend><span>01</span> Contact details</legend>
            <label htmlFor="checkout-email">Email address</label>
            <input autoComplete="email" defaultValue={user?.email ?? ""} id="checkout-email" name="email" placeholder="you@example.com" required type="email" />
          </fieldset>
          <fieldset>
            <legend><span>02</span> Delivery details</legend>
            <div className="checkout-field-grid">
              <div className="checkout-field-full">
                <label htmlFor="checkout-name">Full name</label>
                <input autoComplete="name" id="checkout-name" name="name" placeholder="Name for the delivery" type="text" />
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend><span>03</span> Order notes</legend>
            <label htmlFor="checkout-notes">Anything else to share? <span>Optional</span></label>
            <textarea id="checkout-notes" name="notes" placeholder="Delivery or custom-order notes" rows={4} />
          </fieldset>

          {user ? (
            <button className="button button-primary" disabled={isSubmitting || items.length === 0 || hasUnpricedItems} type="submit">
              {isSubmitting ? "Placing order..." : hasUnpricedItems ? "Prices needed before checkout" : "Place order"} <span aria-hidden="true">↗</span>
            </button>
          ) : (
            <button className="button button-dark" onClick={handleGoogleSignIn} type="button">
              Sign in with Google <span aria-hidden="true">↗</span>
            </button>
          )}

          <p className="checkout-disabled-note">Orders are saved to Supabase and confirmed by email after the catalog prices are set and the required services are configured.</p>
        </form>
        <CheckoutSummary products={products} />
      </div>
    </main>
  );
}
