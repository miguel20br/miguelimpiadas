-- PIN-based auth (substitui magic-link)
-- - master PIN para Miguel (admin total)
-- - PIN por atleta (highlight do próprio nome)
-- Tudo via SECURITY DEFINER RPCs com bcrypt no Postgres.

create extension if not exists pgcrypto;

-- Remove escritas diretas (agora só via RPCs)
drop policy if exists "scores writable by authenticated" on scores;
drop policy if exists "config writable by authenticated" on config;

-- Coluna para PIN dos atletas (bcrypt hash, nunca consultada do client)
alter table scores add column if not exists pin_hash text;

-- Master PIN começa null (primeira pessoa a clicar 🔑 reivindica)
insert into config (k, v) values ('master_pin_hash', 'null'::jsonb)
  on conflict (k) do nothing;

-- =============================================================
-- HELPERS
-- =============================================================

-- Master PIN já foi definido?
create or replace function master_pin_is_set()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((v #>> '{}') is not null, false)
  from config where k = 'master_pin_hash';
$$;

-- Validar master PIN
create or replace function check_master(pin_in text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((v #>> '{}') = crypt(pin_in, v #>> '{}'), false)
  from config where k = 'master_pin_hash';
$$;

-- Validar PIN de atleta
create or replace function check_athlete(sid uuid, pin_in text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(pin_hash = crypt(pin_in, pin_hash), false)
  from scores where id = sid;
$$;

-- Atleta tem PIN definido?
create or replace function athlete_pin_is_set(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(pin_hash is not null, false) from scores where id = sid;
$$;

-- =============================================================
-- SET PIN (claim na 1ª vez, change com PIN antigo depois)
-- =============================================================

create or replace function set_master_pin(old_pin text, new_pin text)
returns boolean language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  if length(new_pin) < 4 then raise exception 'PIN deve ter no mínimo 4 caracteres'; end if;
  select v #>> '{}' into cur from config where k = 'master_pin_hash';
  if cur is null then
    update config set v = to_jsonb(crypt(new_pin, gen_salt('bf', 8))::text), updated_at = now()
      where k = 'master_pin_hash';
    return true;
  elsif cur = crypt(old_pin, cur) then
    update config set v = to_jsonb(crypt(new_pin, gen_salt('bf', 8))::text), updated_at = now()
      where k = 'master_pin_hash';
    return true;
  else
    return false;
  end if;
end $$;

create or replace function set_athlete_pin(sid uuid, old_pin text, new_pin text)
returns boolean language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  if length(new_pin) < 4 then raise exception 'PIN deve ter no mínimo 4 caracteres'; end if;
  select pin_hash into cur from scores where id = sid;
  if cur is null then
    update scores set pin_hash = crypt(new_pin, gen_salt('bf', 8)), updated_at = now() where id = sid;
    return true;
  elsif cur = crypt(old_pin, cur) then
    update scores set pin_hash = crypt(new_pin, gen_salt('bf', 8)), updated_at = now() where id = sid;
    return true;
  else
    return false;
  end if;
end $$;

-- =============================================================
-- ADMIN ACTIONS (validam master PIN antes)
-- =============================================================

create or replace function admin_update_score(pin_in text, sid uuid, p_pontos int, p_moedas int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not check_master(pin_in) then raise exception 'master_pin_invalid'; end if;
  update scores set pontos = p_pontos, moedas = greatest(0, p_moedas), updated_at = now()
    where id = sid;
end $$;

create or replace function admin_add_athlete(pin_in text, nome_in text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; new_ordem int;
begin
  if not check_master(pin_in) then raise exception 'master_pin_invalid'; end if;
  select coalesce(max(ordem), -1) + 1 into new_ordem from scores;
  insert into scores (nome, ordem) values (trim(nome_in), new_ordem) returning id into new_id;
  return new_id;
end $$;

create or replace function admin_delete_athlete(pin_in text, sid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not check_master(pin_in) then raise exception 'master_pin_invalid'; end if;
  delete from scores where id = sid;
end $$;

create or replace function admin_set_config(pin_in text, k_in text, v_in jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not check_master(pin_in) then raise exception 'master_pin_invalid'; end if;
  update config set v = v_in, updated_at = now() where k = k_in;
end $$;

create or replace function admin_reset(pin_in text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not check_master(pin_in) then raise exception 'master_pin_invalid'; end if;
  update scores set pontos = 0, moedas = 3, updated_at = now();
end $$;

-- =============================================================
-- GRANTS (anon e authenticated podem executar)
-- =============================================================

grant execute on function master_pin_is_set() to anon, authenticated;
grant execute on function check_master(text) to anon, authenticated;
grant execute on function check_athlete(uuid, text) to anon, authenticated;
grant execute on function athlete_pin_is_set(uuid) to anon, authenticated;
grant execute on function set_master_pin(text, text) to anon, authenticated;
grant execute on function set_athlete_pin(uuid, text, text) to anon, authenticated;
grant execute on function admin_update_score(text, uuid, int, int) to anon, authenticated;
grant execute on function admin_add_athlete(text, text) to anon, authenticated;
grant execute on function admin_delete_athlete(text, uuid) to anon, authenticated;
grant execute on function admin_set_config(text, text, jsonb) to anon, authenticated;
grant execute on function admin_reset(text) to anon, authenticated;
