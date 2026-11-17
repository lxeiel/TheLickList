-- Recommend Licks: visitor restaurant recommendations waiting in Lex's inbox.
-- Run once in the Supabase SQL Editor.

create table recommendation (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 100),
  maps_url    text check (maps_url is null or (char_length(maps_url) <= 500 and maps_url ~* '^https?://')),
  notes       text check (notes is null or char_length(notes) <= 1000),
  from_name   text check (from_name is null or char_length(from_name) <= 50),
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);

create index recommendation_ip_hash_created_at on recommendation (ip_hash, created_at);

alter table recommendation enable row level security;
-- No policies and no grants for anon/authenticated: the public key can't touch it.
grant select, insert, delete on table recommendation to service_role;
