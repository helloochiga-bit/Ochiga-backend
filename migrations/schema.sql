-- Estates
create table if not exists estates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text,
  created_at timestamptz default now()
);

-- Users (residents / estate owners / facility managers / admin)
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  username text,
  password_hash text,
  role text not null default 'resident', -- 'estate', 'resident', 'admin'
  estate_id uuid references estates(id) on delete set null,
  created_at timestamptz default now()
);

-- Devices
create table if not exists devices (
  id uuid default gen_random_uuid() primary key,
  estate_id uuid references estates(id) on delete cascade,
  name text not null,
  type text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

---------------------------------------------------------------------
-- 🚀 NEW — Tours (Estate Tour & Resident Tour)
---------------------------------------------------------------------

create table if not exists tours (
  id uuid default gen_random_uuid() primary key,
  name text not null,                     -- e.g. 'estate_onboarding', 'resident_onboarding'
  role text not null,                     -- which role should receive this tour
  is_active boolean default true,
  created_at timestamptz default now()
);

---------------------------------------------------------------------
-- 🚀 NEW — Tour Steps (Each step inside a tour)
---------------------------------------------------------------------

create table if not exists tour_steps (
  id uuid default gen_random_uuid() primary key,
  tour_id uuid references tours(id) on delete cascade,
  step_number int not null,
  title text not null,
  description text,
  action_required text,                   -- e.g. "connect_device", "set_gate_rule", "complete_profile"
  metadata jsonb default '{}'::jsonb,     -- UI instructions, icons, animations, etc.
  created_at timestamptz default now()
);

create index if not exists idx_tour_steps_tour on tour_steps(tour_id);

---------------------------------------------------------------------
-- 🚀 NEW — Track User Progress in Tours
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
-- Indexes
---------------------------------------------------------------------

create index if not exists idx_users_estate on users(estate_id);
