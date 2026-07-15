begin;

-- FC Barrios homepage data. Uses the current 250 / 500 / 800 staircase model.
create or replace function public.get_home_participants(target_tournament_id uuid)
returns table (
  player_id uuid,
  display_name text,
  avatar_url text,
  leaderboard_rank integer,
  points numeric,
  buy_in_tier integer,
  is_paid boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    lv.rank::integer,
    coalesce(lv.points, 0),
    tm.buy_in_tier,
    tm.payment_status = 'paid'
  from public.tournament_members tm
  join public.players p on p.id = tm.player_id
  left join public.leaderboard_view lv
    on lv.tournament_id = tm.tournament_id
   and lv.id = tm.player_id
  where tm.tournament_id = target_tournament_id
    and p.is_active = true
  order by
    case when tm.payment_status = 'paid' then 0 else 1 end,
    coalesce(lv.rank, 999999),
    p.display_name;
$$;

grant execute on function public.get_home_participants(uuid)
to anon, authenticated;

create or replace function public.get_home_prize_pools(target_tournament_id uuid)
returns table (
  pool_code text,
  pool_name text,
  minimum_tier integer,
  eligible_paid_players integer,
  prize_pool integer,
  first_prize integer,
  second_prize integer,
  third_prize integer
)
language sql
stable
security definer
set search_path = public
as $$
  with pool_settings as (
    select * from (
      values
        ('gold'::text, 'Gull'::text, 800, 300),
        ('silver'::text, 'Sølv'::text, 500, 250),
        ('bronze'::text, 'Bronse'::text, 250, 250)
    ) as settings(pool_code, pool_name, minimum_tier, contribution)
  ), calculated as (
    select
      settings.pool_code,
      settings.pool_name,
      settings.minimum_tier,
      count(tm.player_id)::integer as eligible_paid_players,
      (count(tm.player_id) * settings.contribution)::integer as prize_pool
    from pool_settings settings
    left join public.tournament_members tm
      on tm.tournament_id = target_tournament_id
     and tm.payment_status = 'paid'
     and tm.buy_in_tier >= settings.minimum_tier
    group by
      settings.pool_code,
      settings.pool_name,
      settings.minimum_tier,
      settings.contribution
  )
  select
    pool_code,
    pool_name,
    minimum_tier,
    eligible_paid_players,
    prize_pool,
    round(prize_pool * 0.60)::integer,
    round(prize_pool * 0.25)::integer,
    (prize_pool - round(prize_pool * 0.60) - round(prize_pool * 0.25))::integer
  from calculated
  order by minimum_tier desc;
$$;

grant execute on function public.get_home_prize_pools(uuid)
to anon, authenticated;

commit;
notify pgrst, 'reload schema';
