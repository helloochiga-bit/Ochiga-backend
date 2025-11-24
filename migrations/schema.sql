---------------------------------------------------------------------
-- Estates
---------------------------------------------------------------------
create table if not exists estates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text,
  lat numeric,         -- latitude for geolocation
  lng numeric,         -- longitude for geolocation
  created_at timestamptz default now()
);

---------------------------------------------------------------------
-- Users (residents / estate owners / facility managers / admin)
---------------------------------------------------------------------
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  username text,
  full_name text,
  password text,
  role text not null default 'resident', -- 'estate', 'resident', 'admin'
  estate_id uuid references estates(id) on delete set null,
  home_id uuid references homes(id) on delete set null,
  isResident boolean default false,
  isEstateOwner boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_users_estate on users(estate_id);
create index if not exists idx_users_home on users(home_id);

---------------------------------------------------------------------
-- Homes
---------------------------------------------------------------------
create table if not exists homes (
  id uuid default gen_random_uuid() primary key,
  estate_id uuid references estates(id) on delete cascade,
  resident_id uuid references users(id) on delete set null,
  name text not null,
  unit text,
  block text,
  description text,
  electricityMeter text,
  waterMeter text,
  internetId text,
  gateCode text,
  lat numeric,
  lng numeric,
  created_at timestamptz default now()
);

create index if not exists idx_homes_estate on homes(estate_id);
create index if not exists idx_homes_resident on homes(resident_id);

---------------------------------------------------------------------
-- Rooms
---------------------------------------------------------------------
create table if not exists rooms (
  id uuid default gen_random_uuid() primary key,
  estate_id uuid references estates(id) on delete cascade,
  home_id uuid references homes(id) on delete cascade,
  name text not null,                     -- "Master Bedroom", "Kitchen", etc.
  type text,                              -- "bedroom", "living", "kitchen"
  floor int,
  ai_profile jsonb default '{}'::jsonb,  -- AI room automation settings
  created_at timestamptz default now()
);

create index if not exists idx_rooms_estate on rooms(estate_id);
create index if not exists idx_rooms_home on rooms(home_id);

---------------------------------------------------------------------
-- Room Assignments
---------------------------------------------------------------------
create table if not exists room_assignments (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade,
  resident_id uuid references users(id) on delete cascade,
  role text,                               -- "owner", "child", "guest"
  permissions jsonb default '{}'::jsonb,  -- e.g. { control: true, thermostat: true }
  created_at timestamptz default now()
);

create index if not exists idx_room_assignments_room on room_assignments(room_id);
create index if not exists idx_room_assignments_resident on room_assignments(resident_id);

---------------------------------------------------------------------
-- Room Rules (per-room automation)
---------------------------------------------------------------------
create table if not exists room_rules (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade,
  trigger jsonb,    -- { event: "motion_detected" }
  condition jsonb,  -- { after: "18:00", user_present: true }
  action jsonb,     -- { device: "light-01", state: "on" }
  enabled boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_room_rules_room on room_rules(room_id);
create index if not exists idx_room_rules_enabled on room_rules(enabled);

---------------------------------------------------------------------
-- Devices
---------------------------------------------------------------------
create table if not exists devices (
  id uuid default gen_random_uuid() primary key,
  estate_id uuid references estates(id) on delete cascade,
  home_id uuid references homes(id) on delete set null,
  room_id uuid references rooms(id) on delete set null, -- optional
  name text not null,
  type text,
  external_id text,
  status text default 'offline',
  metadata jsonb default '{}'::jsonb,
  lat numeric,
  lng numeric,
  icon text,
  created_at timestamptz default now()
);

create index if not exists idx_devices_estate on devices(estate_id);
create index if not exists idx_devices_home on devices(home_id);
create index if not exists idx_devices_room on devices(room_id);

---------------------------------------------------------------------
-- Suggestions (AI decisions waiting for user action)
---------------------------------------------------------------------
create table if not exists suggestions (
  id uuid default gen_random_uuid() primary key,
  estate_id uuid references estates(id) on delete cascade,
  device_id uuid references devices(id) on delete cascade,
  rule_id text,
  message text not null,
  action text not null,
  payload jsonb default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index if not exists idx_suggestions_estate on suggestions(estate_id);
create index if not exists idx_suggestions_device on suggestions(device_id);
create index if not exists idx_suggestions_status on suggestions(status);

---------------------------------------------------------------------
-- Visitors
---------------------------------------------------------------------
create table if not exists visitors (
  id uuid default gen_random_uuid() primary key,
  full_name text,
  email text,
  phone text,
  estate_id uuid references estates(id) on delete cascade,
  home_id uuid references homes(id) on delete set null,
  current_lat numeric,
  current_lng numeric,
  status text default 'idle',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_visitors_estate on visitors(estate_id);
create index if not exists idx_visitors_home on visitors(home_id);

---------------------------------------------------------------------
-- Tours
---------------------------------------------------------------------
create table if not exists tours (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

---------------------------------------------------------------------
-- Tour Steps
---------------------------------------------------------------------
create table if not exists tour_steps (
  id uuid default gen_random_uuid() primary key,
  tour_id uuid references tours(id) on delete cascade,
  step_number int not null,
  title text not null,
  description text,
  action_required text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_tour_steps_tour on tour_steps(tour_id);

---------------------------------------------------------------------
-- Track User Progress in Tours
---------------------------------------------------------------------
create table if not exists user_tour_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  tour_id uuid references tours(id) on delete cascade,
  current_step int default 1,
  is_completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_tour on user_tour_progress(user_id);
create index if not exists idx_user_tour_tour on user_tour_progress(tour_id);

---------------------------------------------------------------------
-- Onboarding tokens
---------------------------------------------------------------------
create table if not exists onboarding_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  token text not null,
  used boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_onboarding_tokens_user on onboarding_tokens(user_id);
