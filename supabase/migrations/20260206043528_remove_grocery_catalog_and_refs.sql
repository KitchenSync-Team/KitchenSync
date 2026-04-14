alter table public.items drop constraint if exists items_grocery_product_id_fkey;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'items'
      and column_name = 'grocery_product_id'
  ) then
    alter table public.items drop column grocery_product_id;
  end if;
end $$;

drop table if exists public.grocery_products;

delete from public.recipe_cache where cache_key like 'groceries:%';
;
