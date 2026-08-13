begin;

create table if not exists public.score_models (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  tier_count integer not null default 4 check (tier_count between 1 and 10),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, name)
);

alter table public.score_rules add column if not exists model_id uuid references public.score_models(id) on delete cascade;
alter table public.matches add column if not exists scoring_stage text not null default 'group' check (scoring_stage in ('group','knockout'));

alter table public.score_rules drop constraint if exists score_rules_tournament_id_stage_result_type_tier_difference_selection_type_key;
create unique index if not exists score_rules_model_row_unique_idx
on public.score_rules(model_id,stage,result_type,tier_difference,selection_type)
where model_id is not null;
create unique index if not exists score_models_one_active_per_tournament_idx
on public.score_models(tournament_id) where is_active = true;

alter table public.score_models enable row level security;
create policy "Authenticated users can read score models" on public.score_models for select to authenticated using (true);
create policy "Admins manage score models" on public.score_models for all to authenticated
using (public.is_tournament_admin(tournament_id)) with check (public.is_tournament_admin(tournament_id));
create policy "Authenticated users can read score rules" on public.score_rules for select to authenticated using (true);

with t as (select id from public.tournaments where slug='euro-2028' limit 1)
insert into public.score_models(tournament_id,name,tier_count,is_active)
select id,'EM 2028 standard',5,true from t
where not exists(select 1 from public.score_models sm where sm.tournament_id=t.id);

update public.score_rules sr set model_id=sm.id
from public.score_models sm
where sr.tournament_id=sm.tournament_id and sm.is_active=true and sr.model_id is null;

create or replace function public.set_active_score_model(target_model_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare tid uuid;
begin
  select tournament_id into tid from public.score_models where id=target_model_id;
  if tid is null then raise exception 'Scoremodellen finnes ikke.'; end if;
  if not public.is_tournament_admin(tid) then raise exception 'Ingen tilgang.'; end if;
  update public.score_models set is_active=false,updated_at=now() where tournament_id=tid;
  update public.score_models set is_active=true,updated_at=now() where id=target_model_id;
end; $$;
grant execute on function public.set_active_score_model(uuid) to authenticated;

create or replace function public.create_score_model(target_tournament_id uuid,model_name text,model_tier_count integer,copy_from_model_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
  if not public.is_tournament_admin(target_tournament_id) then raise exception 'Ingen tilgang.'; end if;
  insert into public.score_models(tournament_id,name,tier_count,is_active)
  values(target_tournament_id,trim(model_name),model_tier_count,false) returning id into new_id;
  if copy_from_model_id is not null then
    insert into public.score_rules(tournament_id,model_id,stage,result_type,tier_difference,selection_type,points)
    select target_tournament_id,new_id,stage,result_type,tier_difference,selection_type,points
    from public.score_rules where model_id=copy_from_model_id and tier_difference<model_tier_count;
  end if;
  return new_id;
end; $$;
grant execute on function public.create_score_model(uuid,text,integer,uuid) to authenticated;

create or replace function public.save_score_model_rows(target_model_id uuid,rows_json jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare tid uuid; n integer;
begin
  select tournament_id into tid from public.score_models where id=target_model_id;
  if tid is null then raise exception 'Scoremodellen finnes ikke.'; end if;
  if not public.is_tournament_admin(tid) then raise exception 'Ingen tilgang.'; end if;
  insert into public.score_rules(tournament_id,model_id,stage,result_type,tier_difference,selection_type,points)
  select tid,target_model_id,r.stage,r.result_type,r.tier_difference,r.selection_type,r.points
  from jsonb_to_recordset(rows_json) as r(stage text,result_type text,tier_difference integer,selection_type text,points numeric)
  on conflict(model_id,stage,result_type,tier_difference,selection_type) where model_id is not null
  do update set points=excluded.points;
  get diagnostics n=row_count; return n;
end; $$;
grant execute on function public.save_score_model_rows(uuid,jsonb) to authenticated;

create or replace function public.calculate_prediction_points(target_prediction_id uuid)
returns table(points numeric,score_type text)
language plpgsql stable security definer set search_path=public as $$
declare p public.predictions; m public.matches; mid uuid; tip_out text; actual_out text; sel text; diff integer; kind text;
begin
  select * into p from public.predictions where id=target_prediction_id;
  select * into m from public.matches where id=p.match_id;
  if m.home_score is null or m.away_score is null then return query select 0::numeric,null::text; return; end if;
  select id into mid from public.score_models where tournament_id=p.tournament_id and is_active=true limit 1;
  tip_out:=case when p.home_score>p.away_score then 'home' when p.home_score<p.away_score then 'away' else 'draw' end;
  actual_out:=case when m.home_score>m.away_score then 'home' when m.home_score<m.away_score then 'away' else 'draw' end;
  if tip_out<>actual_out then return query select 0::numeric,null::text; return; end if;
  diff:=abs(coalesce(m.home_tier,4)-coalesce(m.away_tier,4));
  sel:=case when actual_out='draw' then 'draw'
    when actual_out='home' and coalesce(m.home_tier,4)<=coalesce(m.away_tier,4) then 'favorite'
    when actual_out='away' and coalesce(m.away_tier,4)<=coalesce(m.home_tier,4) then 'favorite'
    else 'underdog' end;
  kind:=case when p.home_score=m.home_score and p.away_score=m.away_score then 'exact'
    when (p.home_score-p.away_score)=(m.home_score-m.away_score) then 'difference' else 'outcome' end;
  return query
  select coalesce(sr.points,0),kind from public.score_rules sr
  where sr.model_id=mid and sr.stage=m.scoring_stage and sr.result_type=kind
    and sr.tier_difference=diff and sr.selection_type=sel limit 1;
end; $$;

create or replace function public.score_match(target_match_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare tid uuid; pr record; sc record; n integer:=0;
begin
  select tournament_id into tid from public.matches where id=target_match_id;
  if not public.is_tournament_admin(tid) then raise exception 'Ingen tilgang.'; end if;
  for pr in select id,tournament_id,player_id from public.predictions where match_id=target_match_id loop
    select * into sc from public.calculate_prediction_points(pr.id);
    insert into public.prediction_scores(prediction_id,tournament_id,player_id,points,score_type,calculated_at)
    values(pr.id,pr.tournament_id,pr.player_id,coalesce(sc.points,0),sc.score_type,now())
    on conflict(prediction_id) do update set points=excluded.points,score_type=excluded.score_type,calculated_at=now();
    n:=n+1;
  end loop;
  return n;
end; $$;
grant execute on function public.score_match(uuid) to authenticated;

commit;
