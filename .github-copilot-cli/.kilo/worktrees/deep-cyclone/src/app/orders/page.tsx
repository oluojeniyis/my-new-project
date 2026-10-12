import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";

export default async function OrdersPage() {
  const supabase = await createServerSupabase();

  if (!supabase) {
    redirect("/shop");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/shop");
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, created_at, status, total, notes, customer_email, order_items(id, product_name, qty, size, color, unit_price)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="section-wrap" id="main-content" style={{ padding: "32px 0 80px" }}>
      <div className="page-title-line">
        <div>
          <h1>My orders.</h1>
          <p>See the orders tied to your TeesTale account.</p>
        </div>
        <Link className="text-link" href="/shop">← Keep browsing</Link>
      </div>

      {!orders || orders.length === 0 ? (
        <section className="cart-empty" style={{ marginTop: 24 }}>
          <span aria-hidden="true" className="empty-slip-mark">TT / —</span>
          <h2>No orders yet.</h2>
          <p>Your finished orders will appear here after checkout.</p>
          <Link className="button button-primary" href="/shop">Browse the shop <span aria-hidden="true">↗</span></Link>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 24, marginTop: 32 }}>
          {orders.map((order) => {
            const items = Array.isArray(order.order_items) ? order.order_items : [];
            const createdAt = new Date(order.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <article key={order.id} style={{ border: "1px solid #c3ccca", background: "#f8faf8", padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                  <div>
                    <p className="product-category-mark">Order #{order.id.slice(0, 8)}</p>
                    <h2 style={{ marginBottom: 8 }}>{createdAt}</h2>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="product-category-mark">Status</p>
                    <strong>{order.status}</strong>
                  </div>
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                  {items.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid #dfe5e2", paddingTop: 12 }}>
                      <div>
                        <strong>{item.product_name}</strong>
                        <div style={{ color: "#465253", fontSize: 13 }}>
                          {item.qty} × {item.size} / {item.color}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700 }}>${Number(item.unit_price ?? 0).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderTop: "1px solid #dfe5e2", paddingTop: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#465253" }}>Customer email</div>
                    <div>{order.customer_email}</div>
                  </div>
                  <strong style={{ fontSize: 24 }}>Total ${Number(order.total ?? 0).toFixed(2)}</strong>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
