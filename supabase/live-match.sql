-- Marcador únic de la Finalíssima, compartit en directe.
create table if not exists public.partit (
  id bigint primary key default 1 check (id = 1),
  fase text not null default 'pre'
    check (fase in ('pre', 'first', 'half', 'second', 'final')),
  minut smallint not null default 0 check (minut between 0 and 130),
  espanya smallint not null default 0 check (espanya between 0 and 20),
  argentina smallint not null default 0 check (argentina between 0 and 20),
  espanya_mitja smallint check (espanya_mitja between 0 and 20),
  argentina_mitja smallint check (argentina_mitja between 0 and 20),
  updated_at timestamptz not null default now()
);

insert into public.partit (id)
values (1)
on conflict (id) do nothing;

alter table public.partit enable row level security;

drop policy if exists "Tothom pot veure el partit" on public.partit;
create policy "Tothom pot veure el partit"
on public.partit
for select
to anon, authenticated
using (true);

drop policy if exists "Nomes admin actualitza el partit" on public.partit;
create policy "Nomes admin actualitza el partit"
on public.partit
for update
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'porra_admin', 'false') = 'true')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'porra_admin', 'false') = 'true');

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'partit'
  ) then
    alter publication supabase_realtime add table public.partit;
  end if;
end
$$;
