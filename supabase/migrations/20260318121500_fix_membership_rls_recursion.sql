create or replace function public.is_gym_role(p_gym_id uuid, p_roles membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select public.is_gym_role(
    p_gym_id,
    array['owner','staff','member']::membership_role[]
  );
$$;

create or replace function public.is_gym_staff(p_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_gym_role(
    p_gym_id,
    array['owner','staff']::membership_role[]
  );
$$;

create or replace function public.is_gym_owner(p_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_gym_role(
    p_gym_id,
    array['owner']::membership_role[]
  );
$$;

create or replace function public.is_network_role(p_network_id uuid, p_roles network_role[])
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select public.is_network_role(
    p_network_id,
    array['owner','admin']::network_role[]
  );
$$;
