-- Optional seed data. Replace <USER_ID> with a real auth.users id.
-- Example:
-- select id, email from auth.users;

-- Gym
insert into gyms (id, owner_user_id, name, slug, timezone)
values (gen_random_uuid(), '<USER_ID>', 'Demo Gym', 'demo-gym', 'Asia/Manila');

-- Membership
insert into gym_memberships (gym_id, user_id, role, status)
select g.id, '<USER_ID>', 'owner', 'active'
from gyms g
where g.slug = 'demo-gym';

-- Branch
insert into gym_branches (gym_id, name)
select g.id, 'Main Branch'
from gyms g
where g.slug = 'demo-gym';
