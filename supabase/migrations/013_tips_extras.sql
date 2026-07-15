begin;

create or replace function public.ensure_match_bonus_candidates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare target_game_id uuid;
begin
  for target_game_id in
    select id from public.bonus_games
    where tournament_id = new.tournament_id
      and code in ('goal-rich','goal-poor')
  loop
    insert into public.bonus_candidates
      (bonus_game_id,candidate_type,reference_id,label,display_order,metadata,is_active)
    values
      (target_game_id,'match',new.id,new.home_team || ' – ' || new.away_team,
       coalesce(new.match_order,0),
       jsonb_build_object('home_team',new.home_team,'away_team',new.away_team,'kickoff_at',new.kickoff_at),
       true)
    on conflict (bonus_game_id,candidate_type,label)
    do update set reference_id=excluded.reference_id,
                  display_order=excluded.display_order,
                  metadata=excluded.metadata,
                  is_active=true;
  end loop;
  return new;
end;
$$;

drop trigger if exists matches_create_bonus_candidates on public.matches;
create trigger matches_create_bonus_candidates
after insert or update of home_team,away_team,kickoff_at,match_order
on public.matches
for each row execute procedure public.ensure_match_bonus_candidates();

insert into public.bonus_candidates
  (bonus_game_id,candidate_type,reference_id,label,display_order,metadata,is_active)
select bg.id,'match',m.id,m.home_team || ' – ' || m.away_team,
       coalesce(m.match_order,0),
       jsonb_build_object('home_team',m.home_team,'away_team',m.away_team,'kickoff_at',m.kickoff_at),
       true
from public.bonus_games bg
join public.matches m on m.tournament_id=bg.tournament_id
where bg.code in ('goal-rich','goal-poor')
on conflict (bonus_game_id,candidate_type,label)
do update set reference_id=excluded.reference_id,
              display_order=excluded.display_order,
              metadata=excluded.metadata,
              is_active=true;

create or replace function public.get_my_match_bonus_picks(target_tournament_id uuid)
returns table(match_id uuid, bonus_code text)
language sql stable security definer set search_path=public
as $$
  select bc.reference_id,bg.code
  from public.bonus_entries be
  join public.players p on p.id=be.player_id
  join public.bonus_games bg on bg.id=be.bonus_game_id
  join public.bonus_candidates bc on bc.id=be.candidate_id
  where be.tournament_id=target_tournament_id
    and p.auth_user_id=auth.uid()
    and bg.code in ('goal-rich','goal-poor')
    and be.stake>0;
$$;

grant execute on function public.get_my_match_bonus_picks(uuid) to authenticated;

create or replace function public.set_match_bonus_pick(
  target_match_id uuid,
  target_bonus_code text,
  should_select boolean
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  target_match public.matches;
  target_game public.bonus_games;
  target_candidate_id uuid;
  target_player_id uuid;
  current_count integer;
  opposite_code text;
begin
  if auth.uid() is null then raise exception 'Du må være logget inn.'; end if;
  if target_bonus_code not in ('goal-rich','goal-poor') then
    raise exception 'Ugyldig kampbonus.';
  end if;

  select * into target_match from public.matches where id=target_match_id;
  if target_match.id is null then raise exception 'Kampen finnes ikke.'; end if;
  if now() >= coalesce(target_match.tipping_closes_at,target_match.kickoff_at) then
    raise exception 'Tipsfristen for kampen er utløpt.';
  end if;

  select * into target_game
  from public.bonus_games
  where tournament_id=target_match.tournament_id
    and code=target_bonus_code
    and is_active=true
  limit 1;
  if target_game.id is null then raise exception 'Bonusspillet er ikke aktivt.'; end if;

  select id into target_candidate_id
  from public.bonus_candidates
  where bonus_game_id=target_game.id
    and reference_id=target_match_id
    and candidate_type='match'
  limit 1;
  if target_candidate_id is null then raise exception 'Kampen mangler bonuskandidat.'; end if;

  select id into target_player_id from public.players where auth_user_id=auth.uid() limit 1;
  if target_player_id is null then raise exception 'Fant ingen spiller koblet til kontoen.'; end if;

  if should_select then
    select count(*) into current_count
    from public.bonus_entries
    where bonus_game_id=target_game.id and player_id=target_player_id and stake>0;

    if not exists(
      select 1 from public.bonus_entries
      where bonus_game_id=target_game.id
        and player_id=target_player_id
        and candidate_id=target_candidate_id
    ) and current_count >= coalesce(target_game.max_selections,5) then
      raise exception 'Du kan bare velge % kamper.',coalesce(target_game.max_selections,5);
    end if;

    opposite_code := case when target_bonus_code='goal-rich' then 'goal-poor' else 'goal-rich' end;

    delete from public.bonus_entries be
    using public.bonus_games og, public.bonus_candidates oc
    where og.tournament_id=target_match.tournament_id
      and og.code=opposite_code
      and oc.bonus_game_id=og.id
      and oc.reference_id=target_match_id
      and be.bonus_game_id=og.id
      and be.candidate_id=oc.id
      and be.player_id=target_player_id;

    insert into public.bonus_entries
      (tournament_id,bonus_game_id,player_id,candidate_id,stake,submitted_at,updated_at)
    values
      (target_match.tournament_id,target_game.id,target_player_id,target_candidate_id,1,now(),now())
    on conflict (bonus_game_id,player_id,candidate_id)
    do update set stake=1,updated_at=now();
  else
    delete from public.bonus_entries
    where bonus_game_id=target_game.id
      and player_id=target_player_id
      and candidate_id=target_candidate_id;
  end if;
end;
$$;

grant execute on function public.set_match_bonus_pick(uuid,text,boolean) to authenticated;

commit;
notify pgrst,'reload schema';
