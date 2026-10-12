create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null check (
    category in (
      'wholesale-blanks',
      'retail-polos',
      'bespoke-custom-mesh',
      'accessories',
      'streetwear'
    )
  ),
  description text not null default '',
  image_url text,
  retail_price numeric(10, 2) check (retail_price is null or retail_price >= 0),
  wholesale_price numeric(10, 2) check (
    wholesale_price is null or wholesale_price >= 0
  ),
  min_wholesale_qty integer check (
    min_wholesale_qty is null or min_wholesale_qty > 0
  ),
  sizes text[] not null default '{}',
  colors jsonb not null default '[]'::jsonb check (jsonb_typeof(colors) = 'array'),
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_type text not null check (order_type in ('retail', 'wholesale', 'custom')),
  status text not null default 'pending',
  total numeric(10, 2) not null default 0 check (total >= 0),
  notes text,
  customer_email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  qty integer not null check (qty > 0),
  size text not null,
  color text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0)
);

create index if not exists orders_user_created_at_idx
  on public.orders (user_id, created_at desc);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Products are readable by everyone" on public.products;
create policy "Products are readable by everyone"
  on public.products
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can read their own orders" on public.orders;
create policy "Users can read their own orders"
  on public.orders
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own order items" on public.order_items;
create policy "Users can read their own order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = (select auth.uid())
    )
  );
