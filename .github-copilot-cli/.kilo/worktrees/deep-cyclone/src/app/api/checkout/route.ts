import Mailgun from "mailgun.js";
import formData from "form-data";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";

type CheckoutLineItem = {
  productId: string;
  quantity: number;
  size: string;
  color: string;
  notes: string;
  productName: string;
  category: string;
  unitPrice: number | null;
};

function normalizeCart(rawItems: unknown) {
  if (!Array.isArray(rawItems)) {
    return [] as Array<{ productId: string; quantity: number; size: string; color: string; notes: string }>;
  }

  return rawItems.flatMap((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as { productId?: unknown }).productId !== "string" ||
      typeof (item as { size?: unknown }).size !== "string" ||
      typeof (item as { color?: unknown }).color !== "string"
    ) {
      return [];
    }

    const quantity = Number((item as { quantity?: unknown }).quantity ?? 1);
    const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;

    return [{
      productId: (item as { productId: string }).productId,
      quantity: normalizedQuantity,
      size: (item as { size: string }).size,
      color: (item as { color: string }).color,
      notes: String((item as { notes?: unknown }).notes ?? ""),
    }];
  });
}

function getOrderType(items: Array<{ category: string }>) {
  const categories = new Set(items.map((item) => item.category));

  if (categories.has("bespoke-custom-mesh")) return "custom";
  if (categories.has("wholesale-blanks")) return "wholesale";
  return "retail";
}

function toCurrency(value: number) {
  return Number(value || 0).toFixed(2);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const escaped: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };
    return escaped[character];
  });
}

function buildEmailHtml({
  orderId,
  email,
  items,
  total,
}: {
  orderId: string;
  email: string;
  items: Array<{ productName: string; quantity: number; size: string; color: string; lineTotal: number }>;
  total: number;
}) {
  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #dfe5e2;">${escapeHtml(item.productName)}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #dfe5e2; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #dfe5e2; text-align: center;">${escapeHtml(item.size)}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #dfe5e2; text-align: center;">${escapeHtml(item.color)}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #dfe5e2; text-align: right;">$${toCurrency(item.lineTotal)}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; background: #eef1ef; padding: 24px; color: #202a2b;">
      <div style="max-width: 640px; margin: 0 auto; background: #f8faf8; border: 1px solid #c3ccca; padding: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div style="font-family: 'Segoe UI', sans-serif; font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 800; letter-spacing: -0.07em;">tees<span style="font-weight: 400;">tale</span><span style="color: #ef6738;">.</span></div>
          <div style="font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #465253;">Order confirmation</div>
        </div>
        <h1 style="margin: 0 0 12px; font-family: 'Segoe UI', sans-serif; font-size: clamp(1.9rem, 2.5vw, 2.7rem); letter-spacing: -0.05em;">Thanks for your order</h1>
        <p style="margin: 0 0 24px; color: #465253;">Order #${escapeHtml(orderId.slice(0, 8))} is in our queue. We have saved your request for ${escapeHtml(email)}.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="color: #465253; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">
              <th style="text-align: left; padding: 0 0 8px;">Item</th>
              <th style="text-align: center; padding: 0 0 8px;">Qty</th>
              <th style="text-align: center; padding: 0 0 8px;">Size</th>
              <th style="text-align: center; padding: 0 0 8px;">Color</th>
              <th style="text-align: right; padding: 0 0 8px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="padding-top: 12px; border-top: 1px solid #dfe5e2; display: flex; justify-content: space-between; align-items: center; font-weight: 700;">
          <span>Order total</span>
          <span>$${toCurrency(total)}</span>
        </div>
      </div>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cart = normalizeCart(body.cart);
    const email = String(body.email ?? "").trim();
    const notes = String(body.notes ?? "").trim();
    const customerName = String(body.name ?? "").trim();

    if (!email || cart.length === 0) {
      return NextResponse.json({ error: "Please add an item and valid email before checkout." }, { status: 400 });
    }

    const supabase = await createServerSupabase();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured yet." }, { status: 500 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in before placing your order." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server checkout is not configured yet." }, { status: 500 });
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const productIds = [...new Set(cart.map((item) => item.productId))];
    const { data: catalogRows, error: catalogError } = await adminSupabase
      .from("products")
      .select("id, name, category, retail_price, wholesale_price")
      .in("id", productIds);

    if (catalogError) {
      console.error("Failed to load catalog products for checkout.", catalogError);
      return NextResponse.json({ error: "The current catalog could not be loaded." }, { status: 500 });
    }

    const productsById = new Map(catalogRows.map((product) => [product.id, product]));
    const lineItems: CheckoutLineItem[] = cart.flatMap((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        return [];
      }

      const price = product.category === "wholesale-blanks"
        ? product.wholesale_price ?? product.retail_price
        : product.retail_price ?? product.wholesale_price;

      return [{
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        notes: item.notes,
        productName: product.name,
        category: product.category,
        unitPrice: price === null ? null : Number(price),
      }];
    });

    if (lineItems.length === 0) {
      return NextResponse.json({ error: "No valid cart items were found." }, { status: 400 });
    }

    if (lineItems.some((item) => item.unitPrice === null)) {
      return NextResponse.json(
        { error: "Checkout is unavailable until catalog prices are confirmed." },
        { status: 409 },
      );
    }

    const pricedLineItems = lineItems.filter(
      (item): item is CheckoutLineItem & { unitPrice: number } => item.unitPrice !== null,
    );
    const total = pricedLineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const orderType = getOrderType(pricedLineItems);

    const { data: order, error: orderError } = await adminSupabase
      .from("orders")
      .insert([
        {
          user_id: user.id,
          order_type: orderType,
          status: "pending",
          total,
          notes: notes || `${customerName ? `${customerName} — ` : ""}Customer requested: ${pricedLineItems.map((item) => `${item.productName} (${item.color}, ${item.size})`).join("; ")}`,
          customer_email: email,
        },
      ])
      .select()
      .single();

    if (orderError || !order) {
      console.error("Failed to save order.", orderError);
      return NextResponse.json({ error: "The order could not be saved." }, { status: 500 });
    }

    const orderItems = pricedLineItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      qty: item.quantity,
      size: item.size,
      color: item.color,
      unit_price: item.unitPrice,
    }));

    const { error: itemError } = await adminSupabase.from("order_items").insert(orderItems);

    if (itemError) {
      console.error("Failed to save order items.", itemError);
      return NextResponse.json({ error: "The order items could not be saved." }, { status: 500 });
    }

    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;
    const mailgunFrom = process.env.MAILGUN_FROM;

    if (mailgunApiKey && mailgunDomain && mailgunFrom) {
      try {
        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({ username: "api", key: mailgunApiKey });

        await mg.messages.create(mailgunDomain, {
          from: mailgunFrom,
          to: [email],
          subject: `TeesTale order confirmation #${order.id.slice(0, 8)}`,
          html: buildEmailHtml({
            orderId: order.id,
            email,
            items: pricedLineItems.map((item) => ({
              productName: item.productName,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
              lineTotal: item.unitPrice * item.quantity,
            })),
            total,
          }),
        });
      } catch (error) {
        console.error("Mailgun confirmation email failed, but the order was saved.", error);
      }
    } else {
      console.info("Mailgun is not configured. Checkout order is saved without sending a confirmation email.");
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      message: "Order placed successfully.",
    });
  } catch (error) {
    console.error("Checkout failed.", error);
    return NextResponse.json({ error: "The checkout request could not be processed." }, { status: 500 });
  }
}
