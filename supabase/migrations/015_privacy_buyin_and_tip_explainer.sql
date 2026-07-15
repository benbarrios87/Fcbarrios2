begin;
alter table public.tournaments
  add column if not exists buy_in_enabled boolean not null default false,
  add column if not exists buy_in_options integer[] not null default array[200,400,600,800],
  add column if not exists currency_code text not null default 'NOK';
alter table public.tournament_members
  add column if not exists buy_in_tier integer,
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','waived')),
  add column if not exists paid_amount integer not null default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_note text;
create index if not exists tournament_members_payment_idx
  on public.tournament_members (tournament_id,payment_status,buy_in_tier);
create or replace function public.update_member_payment(
  target_tournament_id uuid,
  target_player_id uuid,
  target_buy_in_tier integer,
  target_payment_status text,
  target_paid_amount integer default 0,
  target_payment_note text default null
)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_tournament_admin(target_tournament_id) then
    raise exception 'Du har ikke tilgang til å endre betaling.';
  end if;
  if target_payment_status not in ('pending','paid','waived') then
    raise exception 'Ugyldig betalingsstatus.';
  end if;
  update public.tournament_members
  set buy_in_tier=target_buy_in_tier,
      payment_status=target_payment_status,
      paid_amount=greatest(target_paid_amount,0),
      paid_at=case when target_payment_status='paid' then coalesce(paid_at,now()) else null end,
      payment_note=nullif(trim(target_payment_note),'')
  where tournament_id=target_tournament_id and player_id=target_player_id;
  if not found then raise exception 'Fant ikke spilleren i turneringen.'; end if;
end;$$;
grant execute on function public.update_member_payment(uuid,uuid,integer,text,integer,text) to authenticated;
create or replace function public.get_admin_payment_overview(target_tournament_id uuid)
returns table(player_id uuid,display_name text,avatar_url text,buy_in_tier integer,payment_status text,paid_amount integer,paid_at timestamptz,payment_note text)
language sql stable security definer set search_path=public as $$
  select p.id,p.display_name,p.avatar_url,tm.buy_in_tier,tm.payment_status,tm.paid_amount,tm.paid_at,tm.payment_note
  from public.tournament_members tm join public.players p on p.id=tm.player_id
  where tm.tournament_id=target_tournament_id and public.is_tournament_admin(target_tournament_id)
  order by p.display_name;
$$;
grant execute on function public.get_admin_payment_overview(uuid) to authenticated;
create or replace view public.player_payment_badge_view as
select tournament_id,player_id,(payment_status='paid') as is_paid from public.tournament_members;
create or replace function public.get_my_payment_status(target_tournament_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('buy_in_tier',tm.buy_in_tier,'payment_status',tm.payment_status,'paid_amount',tm.paid_amount,'paid_at',tm.paid_at,'payment_note',tm.payment_note)
  from public.tournament_members tm join public.players p on p.id=tm.player_id
  where tm.tournament_id=target_tournament_id and p.auth_user_id=auth.uid() limit 1;
$$;
grant execute on function public.get_my_payment_status(uuid) to authenticated;
create or replace function public.get_buy_in_pools(target_tournament_id uuid)
returns table(buy_in_tier integer,paid_players integer,prize_pool integer)
language sql stable security definer set search_path=public as $$
  select tm.buy_in_tier,count(*)::integer,sum(tm.paid_amount)::integer
  from public.tournament_members tm
  where tm.tournament_id=target_tournament_id and tm.payment_status='paid' and tm.buy_in_tier is not null
  group by tm.buy_in_tier order by tm.buy_in_tier;
$$;
grant execute on function public.get_buy_in_pools(uuid) to anon,authenticated;
create or replace function public.get_community_predictions(target_tournament_id uuid,max_matches integer default 4)
returns table(match_id uuid,home_team text,away_team text,kickoff_at timestamptz,home_count integer,draw_count integer,away_count integer,total_count integer,home_pct numeric,draw_pct numeric,away_pct numeric,common_score text,is_visible boolean)
language sql stable security definer set search_path=public as $$
with a as (
  select m.id match_id,m.home_team,m.away_team,m.kickoff_at,m.tipping_closes_at,m.status,
    count(pr.id)::integer total_count,
    count(pr.id) filter(where pr.home_score>pr.away_score)::integer home_count,
    count(pr.id) filter(where pr.home_score=pr.away_score)::integer draw_count,
    count(pr.id) filter(where pr.home_score<pr.away_score)::integer away_count,
    mode() within group(order by pr.home_score::text||'–'||pr.away_score::text) common_score
  from public.matches m left join public.predictions pr on pr.match_id=m.id
  where m.tournament_id=target_tournament_id
  group by m.id,m.home_team,m.away_team,m.kickoff_at,m.tipping_closes_at,m.status
), b as (
  select a.*,(now()>=coalesce(tipping_closes_at,kickoff_at) or status in ('live','finished')) visible from a
)
select match_id,home_team,away_team,kickoff_at,
  case when visible then home_count else 0 end,
  case when visible then draw_count else 0 end,
  case when visible then away_count else 0 end,
  case when visible then total_count else 0 end,
  case when visible and total_count>0 then round(100.0*home_count/total_count,0) else 0 end,
  case when visible and total_count>0 then round(100.0*draw_count/total_count,0) else 0 end,
  case when visible and total_count>0 then round(100.0*away_count/total_count,0) else 0 end,
  case when visible then common_score else null end,visible
from b order by kickoff_at limit greatest(1,least(max_matches,12));
$$;
grant execute on function public.get_community_predictions(uuid,integer) to anon,authenticated;
commit;
notify pgrst,'reload schema';
