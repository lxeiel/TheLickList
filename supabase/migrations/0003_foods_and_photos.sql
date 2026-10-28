-- Phase 4: Food tried and food pics.
-- Run once in the Supabase SQL Editor.

-- Food tried: an ordered list of { name, must_try } on each restaurant.
alter table restaurant add column foods jsonb not null default '[]'::jsonb;

-- Food pics: a public bucket (readable without policies). Uploads only happen
-- through signed upload URLs that the admin's server actions issue.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restaurant-photos', 'restaurant-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
