do $$ begin
  create type network_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null; end $$;

create table if not exists public.gym_networks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_by uuid not null references auth.users on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists active_network_id uuid references public.gym_networks on delete set null;

create table if not exists public.network_memberships (
  network_id uuid not null references public.gym_networks on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role network_role not null default 'member',
  status membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  primary key (network_id, user_id)
);

create table if not exists public.network_gyms (
  network_id uuid not null references public.gym_networks on delete cascade,
  gym_id uuid not null references public.gyms on delete cascade,
  added_by uuid references auth.users on delete set null,
  joined_at timestamptz not null default now(),
  primary key (network_id, gym_id)
);

create table if not exists public.network_challenges (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.gym_networks on delete cascade,
  name text not null,
  description text,
  type challenge_type not null default 'checkins',
  start_at timestamptz not null,
  end_at timestamptz not null,
  target_value int,
  reward_points int default 0,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.network_challenge_participants (
  challenge_id uuid not null references public.network_challenges on delete cascade,
  gym_id uuid not null references public.gyms on delete cascade,
  joined_at timestamptz not null default now(),
  progress_value int not null default 0,
  completed_at timestamptz,
  primary key (challenge_id, gym_id)
);

create or replace function public.apply_network_challenge_progress_from_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.network_challenge_participants ncp
  set progress_value = progress_value + 1
  from public.network_challenges nc
  join public.network_gyms ng on ng.network_id = nc.network_id
  where ncp.challenge_id = nc.id
    and ncp.gym_id = ng.gym_id
    and ng.gym_id = new.gym_id
    and nc.type = 'checkins'
    and new.created_at between nc.start_at and nc.end_at;

  update public.network_challenge_participants ncp
  set completed_at = now()
  from public.network_challenges nc
  where ncp.challenge_id = nc.id
    and ncp.gym_id = new.gym_id
    and nc.target_value is not null
    and ncp.progress_value >= nc.target_value
    and ncp.completed_at is null;

  return new;
end;
$$;

drop trigger if exists on_network_checkin_challenge_progress on public.checkins;
create trigger on_network_checkin_challenge_progress
after insert on public.checkins
for each row execute procedure public.apply_network_challenge_progress_from_checkin();

create or replace function public.apply_network_challenge_progress_from_class()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  class_gym_id uuid;
begin
  select cs.gym_id into class_gym_id
  from public.class_sessions cs
  where cs.id = new.session_id;

  if class_gym_id is null then
    return new;
  end if;

  update public.network_challenge_participants ncp
  set progress_value = progress_value + 1
  from public.network_challenges nc
  join public.network_gyms ng on ng.network_id = nc.network_id
  where ncp.challenge_id = nc.id
    and ncp.gym_id = ng.gym_id
    and ng.gym_id = class_gym_id
    and nc.type = 'class_attendance'
    and new.attended_at between nc.start_at and nc.end_at;

  update public.network_challenge_participants ncp
  set completed_at = now()
  from public.network_challenges nc
  where ncp.challenge_id = nc.id
    and ncp.gym_id = class_gym_id
    and nc.target_value is not null
    and ncp.progress_value >= nc.target_value
    and ncp.completed_at is null;

  return new;
end;
$$;

drop trigger if exists on_network_class_challenge_progress on public.class_attendance;
create trigger on_network_class_challenge_progress
after insert on public.class_attendance
for each row execute procedure public.apply_network_challenge_progress_from_class();

create or replace function public.is_network_role(p_network_id uuid, p_roles network_role[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.network_memberships nm
    where nm.network_id = p_network_id
      and nm.user_id = auth.uid()
      and nm.status = 'active'
      and nm.role = any (p_roles)
  );
$$;

create or replace function public.is_network_member(p_network_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_network_role(
    p_network_id,
    array['owner','admin','member']::network_role[]
  );
$$;

create or replace function public.is_network_admin(p_network_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_network_role(
    p_network_id,
    array['owner','admin']::network_role[]
  );
$$;

create or replace function public.is_gym_in_network(p_gym_id uuid, p_network_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.network_gyms ng
    where ng.gym_id = p_gym_id
      and ng.network_id = p_network_id
  );
$$;

alter table public.gym_networks enable row level security;
alter table public.network_memberships enable row level security;
alter table public.network_gyms enable row level security;
alter table public.network_challenges enable row level security;
alter table public.network_challenge_participants enable row level security;

drop policy if exists "networks readable by members" on public.gym_networks;
create policy "networks readable by members"
on public.gym_networks for select
using (public.is_network_member(id));

drop policy if exists "networks insert by creator" on public.gym_networks;
create policy "networks insert by creator"
on public.gym_networks for insert
with check (auth.uid() = created_by);

drop policy if exists "networks update by admin" on public.gym_networks;
create policy "networks update by admin"
on public.gym_networks for update
using (public.is_network_admin(id));

drop policy if exists "network memberships readable" on public.network_memberships;
create policy "network memberships readable"
on public.network_memberships for select
using (public.is_network_admin(network_id) or auth.uid() = user_id);

drop policy if exists "network memberships insert by admin" on public.network_memberships;
create policy "network memberships insert by admin"
on public.network_memberships for insert
with check (public.is_network_admin(network_id));

drop policy if exists "network memberships update by admin" on public.network_memberships;
create policy "network memberships update by admin"
on public.network_memberships for update
using (public.is_network_admin(network_id));

drop policy if exists "network gyms readable" on public.network_gyms;
create policy "network gyms readable"
on public.network_gyms for select
using (public.is_network_member(network_id));

drop policy if exists "network gyms insert by admin" on public.network_gyms;
create policy "network gyms insert by admin"
on public.network_gyms for insert
with check (public.is_network_admin(network_id));

drop policy if exists "network gyms delete by admin" on public.network_gyms;
create policy "network gyms delete by admin"
on public.network_gyms for delete
using (public.is_network_admin(network_id));

drop policy if exists "network challenges readable" on public.network_challenges;
create policy "network challenges readable"
on public.network_challenges for select
using (public.is_network_member(network_id));

drop policy if exists "network challenges insert by admin" on public.network_challenges;
create policy "network challenges insert by admin"
on public.network_challenges for insert
with check (public.is_network_admin(network_id));

drop policy if exists "network challenges update by admin" on public.network_challenges;
create policy "network challenges update by admin"
on public.network_challenges for update
using (public.is_network_admin(network_id));

drop policy if exists "network challenge participants readable" on public.network_challenge_participants;
create policy "network challenge participants readable"
on public.network_challenge_participants for select
using (
  public.is_network_member(
    (select nc.network_id from public.network_challenges nc where nc.id = challenge_id)
  )
);

drop policy if exists "network challenge participants insert by gym staff" on public.network_challenge_participants;
create policy "network challenge participants insert by gym staff"
on public.network_challenge_participants for insert
with check (
  public.is_gym_staff(gym_id)
  and public.is_gym_in_network(
    gym_id,
    (select nc.network_id from public.network_challenges nc where nc.id = challenge_id)
  )
);
