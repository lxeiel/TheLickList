-- Multiple locations tag, and removal of the unused dish table.
-- Run once in the Supabase SQL Editor, before deploying the code that uses it.

-- True for a spot with more than one outlet; shown as a tag on the site.
alter table restaurant add column multiple_locations boolean not null default false;

-- Dishes were replaced by Food tried (0003); no code reads or writes this
-- table. Its read policy and grants go with it.
drop table if exists dish;
