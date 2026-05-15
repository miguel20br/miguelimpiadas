-- Admin pode definir/resetar PIN de qualquer atleta (autorizado pelo master PIN)

create or replace function admin_set_athlete_pin(pin_in text, sid uuid, new_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not check_master(pin_in) then raise exception 'master_pin_invalid'; end if;
  if length(new_pin) < 4 then raise exception 'pin_too_short'; end if;
  update scores set pin_hash = crypt(new_pin, gen_salt('bf', 8)), updated_at = now() where id = sid;
end $$;

grant execute on function admin_set_athlete_pin(text, uuid, text) to anon, authenticated;
