-- Admin login throttling: each login try is logged by hashed IP so one
-- address gets only a handful of guesses per window.
-- Run once in the Supabase SQL Editor, before deploying the code that uses it.

create table login_attempt (
  id          bigint generated always as identity primary key,
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);

create index login_attempt_ip_hash_created_at on login_attempt (ip_hash, created_at);

alter table login_attempt enable row level security;
-- No policies and no grants for anon/authenticated: the public key can't touch it.
grant select, insert, delete on table login_attempt to service_role;

-- Logs one try and returns how many this IP has made in the window,
-- counting this one. The lock makes tries from one IP take turns (it's held
-- until each call's transaction commits), so simultaneous tries can't all
-- count the same rows and slip in under the limit together.
-- Also prunes rows older than the window, so the table stays small.
create function record_login_attempt(p_ip_hash text, p_window_seconds integer)
returns integer
language sql
as $$
  select pg_advisory_xact_lock(hashtext('login_attempt:' || p_ip_hash));
  delete from login_attempt where created_at < now() - make_interval(secs => p_window_seconds);
  insert into login_attempt (ip_hash) values (p_ip_hash);
  select count(*)::integer from login_attempt
  where ip_hash = p_ip_hash and created_at >= now() - make_interval(secs => p_window_seconds);
$$;

-- Functions are callable by everyone by default, which would let the public
-- key call this one through the Data API. Only the server may.
revoke execute on function record_login_attempt(text, integer) from public, anon, authenticated;
grant execute on function record_login_attempt(text, integer) to service_role;
