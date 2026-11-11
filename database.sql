-- CRYPTO GATE schema. Run in Supabase SQL Editor.
-- This is a virtual-money learning simulator, NOT a real exchange.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  code text primary key,
  is_admin_invite boolean not null default false,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- A one-time private setup code for the first owner. Run the SELECT below and
-- keep the returned code private. It is consumed by the first successful signup.
insert into public.invite_codes(code,is_admin_invite)
select 'CG-OWNER-' || upper(encode(gen_random_bytes(6),'hex')), true
where not exists (select 1 from public.profiles)
  and not exists (select 1 from public.invite_codes where is_admin_invite and used_by is null);

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(20,2) not null default 3.00 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy','sell')),
  quantity numeric(24,8) not null check (quantity > 0),
  price numeric(20,8) not null check (price > 0),
  total numeric(20,2) not null check (total > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.holdings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  quantity numeric(24,8) not null default 0 check (quantity >= 0),
  average_price numeric(20,8) not null default 0,
  primary key (user_id, symbol)
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(new.raw_user_meta_data->>'invite_code','')));
  v_admin_invite boolean;
  v_used_by uuid;
  v_count integer;
begin
  if v_code = '' then raise exception 'An invitation code is required to join CRYPTO GATE'; end if;
  select is_admin_invite, used_by into v_admin_invite, v_used_by
    from public.invite_codes where code = v_code for update;
  if not found or v_used_by is not null then raise exception 'Invalid or already-used invitation code'; end if;
  select count(*) into v_count from public.profiles;
  if v_count >= 101 then raise exception 'CRYPTO GATE has reached its 101-account limit'; end if;

  insert into public.profiles(id,email,display_name,role)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name','Trader'),
    case when v_admin_invite then 'admin' else 'user' end);
  insert into public.wallets(user_id,balance) values(new.id,3.00);
  update public.invite_codes set used_by=new.id, used_at=now() where code=v_code;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.wallets enable row level security;
alter table public.trades enable row level security;
alter table public.holdings enable row level security;

drop policy if exists "read own profile or admin" on public.profiles;
create policy "read own profile or admin" on public.profiles for select
using (id = auth.uid() or public.is_admin());
drop policy if exists "admin updates profiles" on public.profiles;
create policy "admin updates profiles" on public.profiles for update
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read own wallet or admin" on public.wallets;
create policy "read own wallet or admin" on public.wallets for select
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "read own trades or admin" on public.trades;
create policy "read own trades or admin" on public.trades for select
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "read own holdings or admin" on public.holdings;
create policy "read own holdings or admin" on public.holdings for select
using (user_id = auth.uid() or public.is_admin());

-- The app passes a practice price from its displayed market feed.
-- No real assets or money are involved. Do not reuse this for a real exchange.
create or replace function public.place_practice_trade(
  p_symbol text, p_side text, p_quantity numeric, p_price numeric
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_total numeric(20,2);
  v_balance numeric(20,2);
  v_old_qty numeric(24,8);
  v_old_avg numeric(20,8);
  v_new_qty numeric(24,8);
  v_new_avg numeric(20,8);
begin
  if v_user is null then raise exception 'Please sign in'; end if;
  if p_symbol not in ('BTC','ETH','SOL','BNB','XRP','ADA','DOGE') then raise exception 'Unsupported market'; end if;
  if p_side not in ('buy','sell') then raise exception 'Invalid order side'; end if;
  if p_quantity <= 0 or p_quantity > 1000000 or p_price <= 0 or p_price > 100000000 then
    raise exception 'Invalid order size or price';
  end if;
  v_total := round(p_quantity * p_price, 2);

  select balance into v_balance from public.wallets where user_id = v_user for update;
  if not found then raise exception 'Practice wallet not found'; end if;
  select quantity, average_price into v_old_qty, v_old_avg
    from public.holdings where user_id = v_user and symbol = p_symbol for update;
  v_old_qty := coalesce(v_old_qty,0);
  v_old_avg := coalesce(v_old_avg,0);

  if p_side = 'buy' then
    if v_balance < v_total then raise exception 'Insufficient virtual USDT balance'; end if;
    update public.wallets set balance = balance - v_total, updated_at = now() where user_id = v_user;
    v_new_qty := v_old_qty + p_quantity;
    if v_new_qty > 0 then
      v_new_avg := ((v_old_qty * v_old_avg) + (p_quantity * p_price)) / v_new_qty;
    else v_new_avg := p_price; end if;
  else
    if v_old_qty < p_quantity then raise exception 'Not enough coins to sell'; end if;
    update public.wallets set balance = balance + v_total, updated_at = now() where user_id = v_user;
    v_new_qty := v_old_qty - p_quantity;
    v_new_avg := case when v_new_qty = 0 then 0 else v_old_avg end;
  end if;

  insert into public.holdings(user_id,symbol,quantity,average_price)
  values(v_user,p_symbol,v_new_qty,v_new_avg)
  on conflict(user_id,symbol) do update
  set quantity = excluded.quantity, average_price = excluded.average_price;

  insert into public.trades(user_id,symbol,side,quantity,price,total)
  values(v_user,p_symbol,p_side,p_quantity,p_price,v_total);

  return jsonb_build_object('ok',true,'balance',
    (select balance from public.wallets where user_id = v_user));
end;
$$;

-- Admin-only user list. User roles are never editable by ordinary users.
create or replace function public.admin_user_overview()
returns table(user_id uuid,email text,display_name text,role text,balance numeric,joined_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query
    select p.id,p.email,p.display_name,p.role,w.balance,p.created_at
    from public.profiles p left join public.wallets w on w.user_id=p.id
    order by p.created_at desc;
end;
$$;

create or replace function public.create_invite_code()
returns text language plpgsql security definer set search_path = public
as $$
declare v_code text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if (select count(*) from public.profiles) +
     (select count(*) from public.invite_codes where used_by is null and not is_admin_invite) >= 101 then
    raise exception 'All 100 friend places are already used or reserved';
  end if;
  v_code := 'CG-' || upper(encode(gen_random_bytes(6),'hex'));
  insert into public.invite_codes(code) values(v_code);
  return v_code;
end;
$$;

create or replace function public.admin_invite_overview()
returns table(code text, used boolean, created_at timestamptz, used_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query select i.code, (i.used_by is not null), i.created_at, i.used_at
    from public.invite_codes i where not i.is_admin_invite order by i.created_at desc;
end;
$$;

grant execute on function public.place_practice_trade(text,text,numeric,numeric) to authenticated;
grant execute on function public.admin_user_overview() to authenticated;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.create_invite_code() from public, anon;
revoke all on function public.admin_invite_overview() from public, anon;
grant execute on function public.create_invite_code() to authenticated;
grant execute on function public.admin_invite_overview() to authenticated;
