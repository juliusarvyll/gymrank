-- GymRank Supabase schema (no Prisma)
-- Run in Supabase SQL editor or via supabase db push.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Enums
do $$ begin
  create type membership_role as enum ('owner', 'staff', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type membership_status as enum ('active', 'inactive', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checkin_source as enum ('qr', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type challenge_type as enum ('checkins', 'streak', 'class_attendance', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('system', 'challenge', 'reward', 'retention');
exception when duplicate_object then null; end $$;

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email citext unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Gyms and branches
create table if not exists gyms (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users on delete restrict,
  name text not null,
  slug text unique not null,
  timezone text not null default 'UTC',
  address jsonb,
  branding jsonb,
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists active_gym_id uuid references gyms on delete set null;

create table if not exists gym_branches (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms on delete cascade,
  name text not null,
  address jsonb,
  created_at timestamptz not null default now()
);

-- Memberships
create table if not exists gym_memberships (
  gym_id uuid not null references gyms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role membership_role not null default 'member',
  status membership_status not null default 'active',
  tier text,
  joined_at timestamptz not null default now(),
  invited_by uuid references auth.users on delete set null,
  primary key (gym_id, user_id)
);

-- Member stats (denormalized for leaderboards)
create table if not exists member_stats (
  gym_id uuid not null references gyms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  total_xp int not null default 0,
  total_checkins int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_checkin_at timestamptz,
  primary key (gym_id, user_id)
);

create or replace function public.ensure_member_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.member_stats (gym_id, user_id)
  values (new.gym_id, new.user_id)
  on conflict (gym_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_membership_insert on public.gym_memberships;
create trigger on_membership_insert
after insert on public.gym_memberships
for each row execute procedure public.ensure_member_stats();

-- Check-ins
create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  branch_id uuid references gym_branches on delete set null,
  source checkin_source not null default 'manual',
  verified_by_user_id uuid references auth.users on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create or replace function public.apply_checkin_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_date date;
  new_date date;
  next_streak int;
begin
  insert into public.member_stats (gym_id, user_id)
  values (new.gym_id, new.user_id)
  on conflict (gym_id, user_id) do nothing;

  select last_checkin_at::date into last_date
  from public.member_stats
  where gym_id = new.gym_id and user_id = new.user_id;

  new_date := new.created_at::date;

  if last_date is null then
    next_streak := 1;
  elsif last_date = new_date then
    -- same-day check-in doesn't advance streak
    select current_streak into next_streak
    from public.member_stats
    where gym_id = new.gym_id and user_id = new.user_id;
  elsif last_date = new_date - 1 then
    select current_streak + 1 into next_streak
    from public.member_stats
    where gym_id = new.gym_id and user_id = new.user_id;
  else
    next_streak := 1;
  end if;

  update public.member_stats
  set total_checkins = total_checkins + 1,
      current_streak = next_streak,
      longest_streak = greatest(longest_streak, next_streak),
      last_checkin_at = greatest(coalesce(last_checkin_at, new.created_at), new.created_at)
  where gym_id = new.gym_id and user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists on_checkin_insert on public.checkins;
create trigger on_checkin_insert
after insert on public.checkins
for each row execute procedure public.apply_checkin_stats();

create or replace function public.apply_challenge_progress_from_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Increment progress for active check-in challenges
  update public.challenge_participants cp
  set progress_value = progress_value + 1
  from public.challenges c
  where c.id = cp.challenge_id
    and c.gym_id = new.gym_id
    and c.type = 'checkins'
    and new.created_at between c.start_at and c.end_at
    and cp.user_id = new.user_id;

  -- Sync streak challenges with current streak
  update public.challenge_participants cp
  set progress_value = ms.current_streak
  from public.challenges c
  join public.member_stats ms
    on ms.gym_id = new.gym_id and ms.user_id = new.user_id
  where c.id = cp.challenge_id
    and c.gym_id = new.gym_id
    and c.type = 'streak'
    and new.created_at between c.start_at and c.end_at
    and cp.user_id = new.user_id;

  -- Auto-complete when target met
  update public.challenge_participants cp
  set completed_at = now()
  from public.challenges c
  where c.id = cp.challenge_id
    and c.gym_id = new.gym_id
    and c.target_value is not null
    and cp.progress_value >= c.target_value
    and cp.completed_at is null;

  return new;
end;
$$;

drop trigger if exists on_checkin_challenge_progress on public.checkins;
create trigger on_checkin_challenge_progress
after insert on public.checkins
for each row execute procedure public.apply_challenge_progress_from_checkin();

-- Classes and attendance
create table if not exists class_sessions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms on delete cascade,
  branch_id uuid references gym_branches on delete set null,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists class_attendance (
  session_id uuid not null references class_sessions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  checkin_id uuid references checkins on delete set null,
  attended_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create or replace function public.apply_challenge_progress_from_class()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.challenge_participants cp
  set progress_value = progress_value + 1
  from public.challenges c
  join public.class_sessions cs on cs.id = new.session_id
  where c.id = cp.challenge_id
    and c.gym_id = cs.gym_id
    and c.type = 'class_attendance'
    and new.attended_at between c.start_at and c.end_at
    and cp.user_id = new.user_id;

  update public.challenge_participants cp
  set completed_at = now()
  from public.challenges c
  join public.class_sessions cs on cs.id = new.session_id
  where c.id = cp.challenge_id
    and c.gym_id = cs.gym_id
    and c.target_value is not null
    and cp.progress_value >= c.target_value
    and cp.completed_at is null;

  return new;
end;
$$;

drop trigger if exists on_class_challenge_progress on public.class_attendance;
create trigger on_class_challenge_progress
after insert on public.class_attendance
for each row execute procedure public.apply_challenge_progress_from_class();

-- XP Events
create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  points int not null,
  reason text not null,
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create or replace function public.apply_xp_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.member_stats (gym_id, user_id)
  values (new.gym_id, new.user_id)
  on conflict (gym_id, user_id) do nothing;

  update public.member_stats
  set total_xp = total_xp + new.points
  where gym_id = new.gym_id and user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_xp_insert on public.xp_events;
create trigger on_xp_insert
after insert on public.xp_events
for each row execute procedure public.apply_xp_stats();

-- Badges
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms on delete cascade,
  name text not null,
  description text,
  icon text,
  criteria jsonb,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  badge_id uuid not null references badges on delete cascade,
  awarded_at timestamptz not null default now()
);

-- Challenges
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms on delete cascade,
  name text not null,
  description text,
  type challenge_type not null default 'checkins',
  start_at timestamptz not null,
  end_at timestamptz not null,
  target_value int,
  reward_points int default 0,
  reward_badge_id uuid references badges on delete set null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists challenge_participants (
  challenge_id uuid not null references challenges on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  progress_value int not null default 0,
  completed_at timestamptz,
  primary key (challenge_id, user_id)
);

-- Rewards
create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms on delete cascade,
  name text not null,
  description text,
  xp_cost int not null,
  stock int,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms on delete cascade,
  reward_id uuid not null references rewards on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

-- Activity feed
create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms on delete cascade,
  actor_user_id uuid references auth.users on delete set null,
  target_user_id uuid references auth.users on delete set null,
  event_type text not null,
  data jsonb,
  created_at timestamptz not null default now()
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  type notification_type not null default 'system',
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Check-in tokens (for QR)
create table if not exists checkin_tokens (
  token uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now()
);

-- Views for analytics
create or replace view v_gym_member_xp as
select ms.gym_id, ms.user_id, ms.total_xp, ms.total_checkins, ms.current_streak, ms.longest_streak, ms.last_checkin_at
from member_stats ms;

create or replace view v_weekly_attendance as
select
  gym_id,
  date_trunc('week', created_at)::date as week_start,
  count(*) as checkins
from checkins
group by gym_id, date_trunc('week', created_at)::date;

create or replace view v_inactive_members as
select
  gm.gym_id,
  gm.user_id,
  ms.last_checkin_at
from gym_memberships gm
left join member_stats ms on ms.gym_id = gm.gym_id and ms.user_id = gm.user_id
where gm.status = 'active'
  and (ms.last_checkin_at is null or ms.last_checkin_at < now() - interval '14 days');

-- RLS helpers
create or replace function public.is_gym_role(p_gym_id uuid, p_roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.gym_memberships gm
    where gm.gym_id = p_gym_id
      and gm.user_id = auth.uid()
      and gm.status = 'active'
      and gm.role = any (p_roles)
  );
$$;

create or replace function public.is_gym_member(p_gym_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_gym_role(p_gym_id, array['owner','staff','member']);
$$;

create or replace function public.is_gym_staff(p_gym_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_gym_role(p_gym_id, array['owner','staff']);
$$;

create or replace function public.is_gym_owner(p_gym_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_gym_role(p_gym_id, array['owner']);
$$;

-- Enable RLS and policies
alter table profiles enable row level security;
create policy "profiles are readable by self"
on profiles for select
using (auth.uid() = id);
create policy "profiles readable by gym members"
on profiles for select
using (
  exists (
    select 1
    from public.gym_memberships gm
    where gm.user_id = profiles.id
      and public.is_gym_member(gm.gym_id)
  )
);
create policy "profiles updatable by self"
on profiles for update
using (auth.uid() = id);

alter table gyms enable row level security;
create policy "gyms readable by members"
on gyms for select
using (public.is_gym_member(id));
create policy "gyms insert by owner"
on gyms for insert
with check (auth.uid() = owner_user_id);
create policy "gyms update by owner"
on gyms for update
using (public.is_gym_owner(id));

alter table gym_branches enable row level security;
create policy "branches readable by members"
on gym_branches for select
using (public.is_gym_member(gym_id));
create policy "branches write by staff"
on gym_branches for insert
with check (public.is_gym_staff(gym_id));
create policy "branches update by staff"
on gym_branches for update
using (public.is_gym_staff(gym_id));

alter table gym_memberships enable row level security;
create policy "memberships readable by staff"
on gym_memberships for select
using (public.is_gym_staff(gym_id) or auth.uid() = user_id);
create policy "memberships insert by staff or owner"
on gym_memberships for insert
with check (
  public.is_gym_staff(gym_id)
  or (
    auth.uid() = user_id
    and exists (
      select 1 from public.gyms g
      where g.id = gym_id and g.owner_user_id = auth.uid()
    )
  )
);
create policy "memberships update by staff"
on gym_memberships for update
using (public.is_gym_staff(gym_id));

alter table member_stats enable row level security;
create policy "stats readable by members"
on member_stats for select
using (public.is_gym_member(gym_id));

alter table checkins enable row level security;
create policy "checkins readable by members"
on checkins for select
using (public.is_gym_member(gym_id));
create policy "checkins insert by members"
on checkins for insert
with check (public.is_gym_member(gym_id));

alter table class_sessions enable row level security;
create policy "classes readable by members"
on class_sessions for select
using (public.is_gym_member(gym_id));
create policy "classes write by staff"
on class_sessions for insert
with check (public.is_gym_staff(gym_id));
create policy "classes update by staff"
on class_sessions for update
using (public.is_gym_staff(gym_id));

alter table class_attendance enable row level security;
create policy "attendance readable by members"
on class_attendance for select
using (public.is_gym_member((select gym_id from class_sessions cs where cs.id = session_id)));
create policy "attendance insert by staff"
on class_attendance for insert
with check (public.is_gym_staff((select gym_id from class_sessions cs where cs.id = session_id)));

alter table xp_events enable row level security;
create policy "xp readable by members"
on xp_events for select
using (public.is_gym_member(gym_id));
create policy "xp insert by members"
on xp_events for insert
with check (public.is_gym_member(gym_id));

alter table badges enable row level security;
create policy "badges readable by members"
on badges for select
using (public.is_gym_member(gym_id));
create policy "badges write by staff"
on badges for insert
with check (public.is_gym_staff(gym_id));
create policy "badges update by staff"
on badges for update
using (public.is_gym_staff(gym_id));

alter table user_badges enable row level security;
create policy "user badges readable by members"
on user_badges for select
using (public.is_gym_member(gym_id));
create policy "user badges insert by staff"
on user_badges for insert
with check (public.is_gym_staff(gym_id));

alter table challenges enable row level security;
create policy "challenges readable by members"
on challenges for select
using (public.is_gym_member(gym_id));
create policy "challenges write by staff"
on challenges for insert
with check (public.is_gym_staff(gym_id));
create policy "challenges update by staff"
on challenges for update
using (public.is_gym_staff(gym_id));

alter table challenge_participants enable row level security;
create policy "challenge participants readable by members"
on challenge_participants for select
using (public.is_gym_member((select gym_id from challenges c where c.id = challenge_id)));
create policy "challenge participants insert by members"
on challenge_participants for insert
with check (auth.uid() = user_id and public.is_gym_member((select gym_id from challenges c where c.id = challenge_id)));

alter table rewards enable row level security;
create policy "rewards readable by members"
on rewards for select
using (public.is_gym_member(gym_id));
create policy "rewards write by staff"
on rewards for insert
with check (public.is_gym_staff(gym_id));
create policy "rewards update by staff"
on rewards for update
using (public.is_gym_staff(gym_id));

alter table reward_redemptions enable row level security;
create policy "redemptions readable by members"
on reward_redemptions for select
using (public.is_gym_member(gym_id));
create policy "redemptions insert by members"
on reward_redemptions for insert
with check (auth.uid() = user_id and public.is_gym_member(gym_id));
create policy "redemptions update by staff"
on reward_redemptions for update
using (public.is_gym_staff(gym_id));

alter table activity_events enable row level security;
create policy "activity readable by members"
on activity_events for select
using (public.is_gym_member(gym_id));
create policy "activity insert by members"
on activity_events for insert
with check (public.is_gym_member(gym_id));

alter table notifications enable row level security;
create policy "notifications readable by members"
on notifications for select
using (auth.uid() = user_id);
create policy "notifications update by members"
on notifications for update
using (auth.uid() = user_id);

alter table checkin_tokens enable row level security;
create policy "tokens readable by owner"
on checkin_tokens for select
using (auth.uid() = user_id);
create policy "tokens insert by owner"
on checkin_tokens for insert
with check (auth.uid() = user_id and public.is_gym_member(gym_id));
create policy "tokens delete by owner"
on checkin_tokens for delete
using (auth.uid() = user_id);
