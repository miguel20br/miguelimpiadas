-- Miguelimpíadas — schema inicial
-- scores: ranking dos atletas
-- config: estado global (placar oculto, fase atual)

create table scores (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  pontos    int  not null default 0,
  moedas    int  not null default 3,
  ordem     int  not null default 0,
  updated_at timestamptz not null default now()
);

create table config (
  k text primary key,
  v jsonb not null,
  updated_at timestamptz not null default now()
);

insert into config (k, v) values
  ('placar_oculto', 'false'::jsonb),
  ('fase',          '"Aguardando início"'::jsonb);

-- Realtime: publicar mudanças nas duas tabelas
alter publication supabase_realtime add table scores, config;

-- RLS
alter table scores enable row level security;
alter table config enable row level security;

-- Leitura pública (qualquer um vê o placar)
create policy "scores readable by anyone"
  on scores for select to anon, authenticated using (true);
create policy "config readable by anyone"
  on config for select to anon, authenticated using (true);

-- Escrita: só usuário autenticado (Miguel logado via magic-link).
-- Como só vai existir 1 conta autenticada, qualquer authenticated = admin.
create policy "scores writable by authenticated"
  on scores for all to authenticated using (true) with check (true);
create policy "config writable by authenticated"
  on config for all to authenticated using (true) with check (true);
