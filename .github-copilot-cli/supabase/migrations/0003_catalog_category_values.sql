alter table public.products
  drop constraint if exists products_category_check;

alter table public.products
  add constraint products_category_check
  check (
    category in (
      'wholesale-blanks',
      'retail-polos',
      'bespoke-custom-mesh',
      'accessories',
      'streetwear',
      'Wholesale Blanks',
      'Retail Polos',
      'Bespoke/Custom Mesh',
      'Bespoke / Custom Mesh',
      'Accessories',
      'Streetwear'
    )
  );
