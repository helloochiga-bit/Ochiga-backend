---------------------------------------------------------------------
-- 1. Estates
---------------------------------------------------------------------
create table if not exists estates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text,
  lat numeric,
  lng numeric,
  created_at timestamptz default now()
);

---------------------------------------------------------------------
-- 2. Homes (without resident_id yet)
---------------------------------------------------------------------
create table if not exists homes (
  id uuid default gen_random_uuid() primary key,
  estate_id uuid references estates(id) on delete cascade,
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

---------------------------------------------------------------------
-- 3. Users
---------------------------------------------------------------------
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  username text,
  full_name text,
  password text,
  role text not null default 'resident',
  estate_id uuid references estates(id) on delete set null,
  home_id uuid references homes(id) on delete set null,
  isResident boolean default false,
  isEstateOwner boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_users_estate on users(estate_id);
create index if not exists idx_users_home on users(home_id);

---------------------------------------------------------------------
-- 4. Add resident_id to homes
---------------------------------------------------------------------
alter table homes
add column if not exists resident_id uuid references users(id) on delete set null;

create index if not exists idx_homes_resident on homes(resident_id);

---------------------------------------------------------------------
-- 5. Rooms
---------------------------------------------------------------------
create table if not exists rooms (
  id uuid default gen_random_uuid() primary key,
  estate_id uuid references estates(id) on delete cascade,
  home_id uuid references homes(id) on delete cascade,
  name text not null,
  type text,
  floor int,
  ai_profile jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_rooms_estate on rooms(estate_id);
create index if not exists idx_rooms_home on rooms(home_id);

---------------------------------------------------------------------
-- 6. Room Assignments
---------------------------------------------------------------------
create table if not exists room_assignments (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade,
  resident_id uuid references users(id) on delete cascade,
  role text,
  permissions jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_room_assignments_room on room_assignments(room_id);
create index if not exists idx_room_assignments_resident on room_assignments(resident_id);

---------------------------------------------------------------------
-- 7. Room Rules
---------------------------------------------------------------------
create table if not exists room_rules (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade,
  trigger jsonb,
  condition jsonb,
  action jsonb,
  enabled boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_room_rules_room on room_rules(room_id);
create index if not exists idx_room_rules_enabled on room_rules(enabled);

---------------------------------------------------------------------
-- 8. Devices
---------------------------------------------------------------------
create table if not exists devices (
  id uuid default gen_random_uuid() primary key,
  estate_id uuid references estates(id) on delete cascade,
  home_id uuid references homes(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
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
-- 9. Suggestions
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
-- 10. Visitors
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
-- 11. Notifications
---------------------------------------------------------------------
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  payload jsonb default '{}'::jsonb,
  status text default 'unread',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_notifications_status on notifications(status);

---------------------------------------------------------------------
-- 12. Wallets
---------------------------------------------------------------------
create table if not exists wallets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  balance numeric default 0,
  currency text default 'NGN',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_wallets_user on wallets(user_id);

---------------------------------------------------------------------
-- 13. Wallet Transactions
---------------------------------------------------------------------
create table if not exists wallet_transactions (
  id uuid default gen_random_uuid() primary key,
  wallet_id uuid references wallets(id) on delete cascade,
  type text not null,
  amount numeric not null,
  reference text,
  status text default 'pending',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_wallet_tx_wallet on wallet_transactions(wallet_id);
create index if not exists idx_wallet_tx_status on wallet_transactions(status);

---------------------------------------------------------------------
-- 14. Estate Services
---------------------------------------------------------------------
create table if not exists estate_services (
  id uuid default gen_random_uuid() primary key,
  estate_id uuid references estates(id) on delete cascade,
  name text not null,
  unit_cost numeric,
  created_at timestamptz default now()
);

create index if not exists idx_estate_services_estate on estate_services(estate_id);

---------------------------------------------------------------------
-- 15. Maintenance Requests
---------------------------------------------------------------------
create table if not exists maintenance_requests (
  id uuid default gen_random_uuid() primary key,
  estate_id uuid references estates(id) on delete cascade,
  home_id uuid references homes(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
  resident_id uuid references users(id) on delete cascade,
  title text not null,
  description text,
  status text default 'open',
  assigned_to text,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_maintenance_estate on maintenance_requests(estate_id);
create index if not exists idx_maintenance_resident on maintenance_requests(resident_id);
create index if not exists idx_maintenance_status on maintenance_requests(status);
