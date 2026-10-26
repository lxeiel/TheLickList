create type restaurant_status as enum ('wishlist', 'tried');

create table restaurant (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  maps_url      text,
  lat           double precision,
  lng           double precision,
  links         jsonb not null default '[]'::jsonb,
  cuisine_tags  text[] not null default '{}',
  price_range   text,
  status        restaurant_status not null default 'wishlist',
  rating        integer,
  notes         text,
  photo_urls    text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table dish (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurant(id) on delete cascade,
  name          text not null,
  rating        integer,
  notes         text,
  photo_urls    text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table restaurant enable row level security;
alter table dish enable row level security;

create policy "public can read restaurants" on restaurant for select using (true);
create policy "public can read dishes" on dish for select using (true);

-- "Automatically expose new tables" was left off when the Supabase project
-- was created, so new tables get no default grants for any Data API role —
-- not even service_role, which otherwise bypasses RLS but still needs a
-- base table grant. Without these, every request (including service_role
-- ones) fails with "permission denied for table restaurant/dish".
grant select, insert, update, delete on table restaurant to service_role;
grant select, insert, update, delete on table dish to service_role;
grant select on table restaurant to anon, authenticated;
grant select on table dish to anon, authenticated;
