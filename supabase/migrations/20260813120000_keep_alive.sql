-- Keep-alive: brání uspání Supabase free-tier projektu po 7 dnech neaktivity.
-- Cron (GitHub Actions / app route) volá RPC public.keep_alive_ping(),
-- které zapíše aktuální čas do public.keep_alive.

create table if not exists public.keep_alive (
  id        bigserial primary key,
  pinged_at timestamptz not null default now(),
  source    text        not null default 'unknown'
);

create index if not exists keep_alive_pinged_at_idx
  on public.keep_alive (pinged_at desc);

alter table public.keep_alive enable row level security;

-- Anon nemá na tabulku žádnou policy → přímý zápis/čtení přes REST je zavřený.
-- Přihlášení uživatelé si můžou historii pingů přečíst (např. v /nastaveni).
drop policy if exists "Authenticated can read keep_alive" on public.keep_alive;
create policy "Authenticated can read keep_alive"
  on public.keep_alive
  for select
  to authenticated
  using (true);

-- Jediná cesta, jak zapsat ping. SECURITY DEFINER → obejde RLS,
-- ale umí jen tenhle jeden zápis, nic víc.
create or replace function public.keep_alive_ping(p_source text default 'cron')
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
  v_new  timestamptz;
begin
  select max(k.pinged_at) into v_last from public.keep_alive k;

  -- Rate limit: max jeden zápis za hodinu, ať tabulka nebobtná.
  if v_last is not null and v_last > now() - interval '1 hour' then
    return v_last;
  end if;

  insert into public.keep_alive (pinged_at, source)
  values (now(), coalesce(p_source, 'cron'))
  returning pinged_at into v_new;

  -- Úklid: držíme jen posledních 90 dní.
  delete from public.keep_alive where pinged_at < now() - interval '90 days';

  return v_new;
end;
$$;

revoke all on function public.keep_alive_ping(text) from public;
grant execute on function public.keep_alive_ping(text) to anon, authenticated, service_role;
