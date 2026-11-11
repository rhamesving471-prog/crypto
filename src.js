import { createClient } from '@supabase/supabase-js';
import './style.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const configured = Boolean(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('YOUR_PROJECT'));
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const markets = [
  {symbol:'BTC',name:'Bitcoin',price:68420.50,change:2.41,color:'#f7931a'},
  {symbol:'ETH',name:'Ethereum',price:3542.18,change:1.28,color:'#8b9cff'},
  {symbol:'SOL',name:'Solana',price:168.42,change:4.82,color:'#9b87f5'},
  {symbol:'BNB',name:'BNB',price:592.30,change:-0.74,color:'#f3ba2f'},
  {symbol:'XRP',name:'XRP',price:0.6241,change:0.91,color:'#aeb8c7'},
  {symbol:'ADA',name:'Cardano',price:0.4512,change:-1.13,color:'#2875ca'},
  {symbol:'DOGE',name:'Dogecoin',price:0.1648,change:3.06,color:'#c2a633'}
];
let selected='BTC', side='buy', user=null, profile=null, wallet=3, holdings=[], trades=[], admin=false;

const $ = s => document.querySelector(s);
const money = n => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' USDT';
const qty = n => Number(n||0).toLocaleString('en-US',{maximumFractionDigits:8});
const current = () => markets.find(m=>m.symbol===selected);
function shell(content){ $('#app').innerHTML=content; }
function marketRows(){return markets.map(m=>`<button class="market-row ${m.symbol===selected?'active':''}" data-symbol="${m.symbol}">
  <span class="coin-icon" style="--coin:${m.color}">${m.symbol.slice(0,1)}</span><span class="coin-name"><b>${m.symbol}/USDT</b><small>${m.name}</small></span>
  <span class="coin-price"><b>${money(m.price)}</b><small class="${m.change>=0?'up':'down'}">${m.change>=0?'+':''}${m.change}%</small></span></button>`).join('')}
function chartSvg(){
  const pts=Array.from({length:42},(_,i)=>{let v=100+Math.sin(i*.58)*8+Math.cos(i*.23)*5+i*.28;return `${i*18},${150-v}`}).join(' ');
  return `<svg viewBox="0 0 740 180" preserveAspectRatio="none" class="chart"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#19c78a" stop-opacity=".28"/><stop offset="1" stop-color="#19c78a" stop-opacity="0"/></linearGradient></defs><path d="M ${pts} L 738,180 L 0,180 Z" fill="url(#area)"/><polyline points="${pts}" fill="none" stroke="#19c78a" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`;
}
function render(){
 const m=current();
 shell(`<header><div class="brand"><span class="brand-mark">C</span> CRYPTO<span>GATE</span></div><nav><a class="selected" href="#">Markets</a><a href="#portfolio">Portfolio</a><a href="#history">Trade history</a></nav><div class="header-right"><span class="demo-pill">● PRACTICE MODE</span><button class="user-chip" id="account">${user?escapeHtml(profile?.display_name||user.email):'Sign in / Register'}</button></div></header>
 <main><div class="welcome"><div><div class="eyebrow">YOUR CRYPTO TRAINING FLOOR</div><h1>Trade smarter. <span>Risk nothing.</span></h1><p>Learn the markets with virtual money in a realistic trading environment.</p></div><div class="virtual-label">VIRTUAL FUNDS ONLY</div></div>
 <section class="stats"><article class="stat-card"><small>AVAILABLE USDT</small><strong>${money(wallet)}</strong><em>Practice USDT balance</em></article><article class="stat-card"><small>OPEN POSITIONS</small><strong>${holdings.filter(h=>Number(h.quantity)>0).length}</strong><em>Assets in your wallet</em></article><article class="stat-card"><small>TRADES PLACED</small><strong>${trades.length}</strong><em>Your practice activity</em></article></section>
 <section class="workspace"><aside class="panel markets"><div class="panel-head"><div><h2>Markets</h2><p>Choose an asset to practise</p></div><span class="live-dot">SIMULATED</span></div><div class="market-list">${marketRows()}</div></aside>
 <section class="panel chart-panel"><div class="asset-heading"><div><div class="eyebrow">MARKET OVERVIEW</div><h2>${m.symbol}/USDT <span class="asset-full">${m.name}</span></h2></div><div class="asset-quote"><strong>${money(m.price)}</strong><small class="${m.change>=0?'up':'down'}">${m.change>=0?'+':''}${m.change}% today</small></div></div><div class="chart-meta"><span>Price movement preview</span><span>1D · DEMO DATA</span></div>${chartSvg()}<div class="chart-foot"><span>Market chart is illustrative</span><span>Prices are simulated</span></div>
 <div class="order-box"><div class="order-tabs"><button data-side="buy" class="${side==='buy'?'chosen':''}">Buy</button><button data-side="sell" class="${side==='sell'?'chosen':''}">Sell</button></div><label>Quantity (${m.symbol})</label><input id="quantity" type="number" min="0" step="any" placeholder="0.00"/><div class="order-summary"><span>Estimated total</span><b id="estimate">$0.00</b></div><button class="primary ${side==='sell'?'sell':''}" id="place">${side==='buy'?'Buy':'Sell'} ${m.symbol}</button><small class="disclaimer">Orders use virtual USDT and simulated prices. No real assets are bought or sold.</small></div></section></section>
 <section class="bottom-grid"><article class="panel" id="portfolio"><div class="panel-head"><div><h2>Your portfolio</h2><p>Virtual assets you currently hold</p></div></div><div id="holdings">${holdingRows()}</div></article><article class="panel" id="history"><div class="panel-head"><div><h2>Recent trades</h2><p>Your latest practice orders</p></div></div><div id="trade-history">${tradeRows()}</div></article></section>
 ${admin?`<section class="panel admin-panel"><div class="panel-head"><div><h2>Admin control room</h2><p>Private club · maximum 101 accounts including you</p></div><span class="admin-pill">ADMIN</span></div><button id="make-invite" class="primary">Create friend invitation</button> <button id="load-invites" class="secondary">Load invitations</button><div id="new-invite"></div><div id="invite-list"></div><button id="load-users" class="secondary">Load user overview</button><div id="admin-users"></div></section>`:''}
 <footer>CRYPTO GATE <span>Educational simulator · Virtual funds only · Not financial advice</span></footer></main>
 <div id="toast" class="toast"></div>`);
 bind();
}
function holdingRows(){if(!holdings.length)return '<div class="empty">No assets yet. Place a practice buy order to get started.</div>';return `<div class="table-head"><span>ASSET</span><span>QUANTITY</span><span>AVG. BUY PRICE</span></div>`+holdings.filter(h=>Number(h.quantity)>0).map(h=>`<div class="table-row"><b>${h.symbol}</b><span>${qty(h.quantity)}</span><span>${money(h.average_price)}</span></div>`).join('')}
function tradeRows(){if(!trades.length)return '<div class="empty">Your practice trades will appear here.</div>';return `<div class="table-head"><span>ORDER</span><span>QUANTITY</span><span>TOTAL</span></div>`+trades.slice(0,8).map(t=>`<div class="table-row"><b class="${t.side==='buy'?'up':'down'}">${t.side.toUpperCase()} ${t.symbol}</b><span>${qty(t.quantity)}</span><span>${money(t.total)}</span></div>`).join('')}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(msg){const t=$('#toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}}
function bind(){
 document.querySelectorAll('[data-symbol]').forEach(b=>b.onclick=()=>{selected=b.dataset.symbol;render()});
 document.querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>{side=b.dataset.side;render()});
 $('#quantity').oninput=()=>{$('#estimate').textContent=money(Number($('#quantity').value||0)*current().price)};
 $('#place').onclick=placeTrade;
 $('#account').onclick=()=>user?signOut():authDialog();
 if($('#load-users'))$('#load-users').onclick=loadUsers;
 if($('#make-invite'))$('#make-invite').onclick=createInvite;
 if($('#load-invites'))$('#load-invites').onclick=loadInvites;
}
async function placeTrade(){
 if(!user){authDialog();return}
 const amount=Number($('#quantity').value), m=current();
 if(!Number.isFinite(amount)||amount<=0){toast('Enter a valid quantity.');return}
 const btn=$('#place');btn.disabled=true;btn.textContent='Placing order…';
 try{
  const {data,error}=await supabase.rpc('place_practice_trade',{p_symbol:m.symbol,p_side:side,p_quantity:amount,p_price:m.price});
  if(error)throw error;
  await refreshData();render();toast(`${side.toUpperCase()} order completed using virtual funds.`);
 }catch(e){btn.disabled=false;btn.textContent=`${side==='buy'?'Buy':'Sell'} ${m.symbol}`;toast(e.message||'Order failed.')}
}
function authDialog(){
 const el=document.createElement('div');el.className='modal-backdrop';el.innerHTML=`<div class="modal"><button class="modal-close" id="close">×</button><div class="brand"><span class="brand-mark">C</span> CRYPTO<span>GATE</span></div><h2 id="auth-title">Welcome back</h2><p class="muted">Create an account or sign in to save your practice wallet.</p><form id="auth-form"><div id="name-wrap" class="hidden"><label>Display name</label><input id="display-name" autocomplete="name" placeholder="Your name"/></div><div id="invite-wrap" class="hidden"><label>Invitation code</label><input id="invite-code" autocomplete="off" placeholder="Enter your private invite code" required/></div><label>Email address</label><input id="email" type="email" required autocomplete="email" placeholder="you@example.com"/><label>Password</label><input id="password" type="password" required minlength="8" autocomplete="current-password" placeholder="At least 8 characters"/><button class="primary" id="auth-submit">Sign in</button></form><button class="text-button" id="toggle-auth">New here? Create an account</button><div class="auth-note">Virtual-money practice only. Never enter a banking or exchange password.</div></div></div>`;
 document.body.append(el);let signup=false;
 const close=()=>el.remove();$('#close').onclick=close;$('#toggle-auth').onclick=()=>{signup=!signup;$('#auth-title').textContent=signup?'Create your account':'Welcome back';$('#name-wrap').classList.toggle('hidden',!signup);$('#invite-wrap').classList.toggle('hidden',!signup);$('#invite-code').required=signup;$('#auth-submit').textContent=signup?'Create account':'Sign in';$('#toggle-auth').textContent=signup?'Already registered? Sign in':'New here? Create an account'};
 $('#auth-form').onsubmit=async e=>{e.preventDefault();const btn=$('#auth-submit');btn.disabled=true;try{const email=$('#email').value,password=$('#password').value;let result;if(signup)result=await supabase.auth.signUp({email,password,options:{data:{display_name:$('#display-name').value||'Trader',invite_code:$('#invite-code').value.trim().toUpperCase()}}});else result=await supabase.auth.signInWithPassword({email,password});if(result.error)throw result.error;if(signup&&!result.data.session){toast('Check your email to confirm your account, then sign in.');close();return}close();await init();}catch(err){toast(err.message)}finally{btn.disabled=false}};
}
async function signOut(){await supabase.auth.signOut();user=null;profile=null;wallet=3;holdings=[];trades=[];admin=false;render()}
async function refreshData(){
 const [p,w,h,t]=await Promise.all([
  supabase.from('profiles').select('*').eq('id',user.id).single(),
  supabase.from('wallets').select('*').eq('user_id',user.id).single(),
  supabase.from('holdings').select('*').eq('user_id',user.id).order('symbol'),
  supabase.from('trades').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20)
 ]);
 if(p.error)throw p.error;if(w.error)throw w.error;
 profile=p.data;wallet=Number(w.data.balance);holdings=h.data||[];trades=t.data||[];admin=profile.role==='admin';
}
async function createInvite(){const box=$('#new-invite');box.textContent='Creating…';const {data,error}=await supabase.rpc('create_invite_code');if(error){box.textContent=error.message;return}box.innerHTML=`<p>Share this one-use invitation code with a friend:</p><strong class="invite-code">${escapeHtml(data)}</strong> <button class="secondary" id="copy-invite">Copy code</button>`;$('#copy-invite').onclick=()=>navigator.clipboard.writeText(data).then(()=>toast('Invitation code copied.'));loadInvites()}
async function loadInvites(){const box=$('#invite-list');box.textContent='Loading invitations…';const {data,error}=await supabase.rpc('admin_invite_overview');if(error){box.textContent=error.message;return}box.innerHTML=`<div class="table-head"><span>INVITATION</span><span>STATUS</span><span>CREATED</span></div>`+data.map(i=>`<div class="table-row"><b>${escapeHtml(i.code)}</b><span>${i.used?'Used':'Available'}</span><span>${new Date(i.created_at).toLocaleDateString()}</span></div>`).join('')}
async function loadUsers(){const box=$('#admin-users');box.textContent='Loading…';const {data,error}=await supabase.rpc('admin_user_overview');if(error){box.textContent=error.message;return}box.innerHTML=`<div class="table-head"><span>USER</span><span>ROLE</span><span>VIRTUAL USDT</span></div>`+data.map(u=>`<div class="table-row"><span>${escapeHtml(u.display_name||u.email)}</span><span>${escapeHtml(u.role)}</span><b>${money(u.balance)}</b></div>`).join('')}
async function init(){
 if(!configured){renderSetup();return}
 const {data}=await supabase.auth.getSession();user=data.session?.user||null;
 if(user){try{await refreshData()}catch(e){toast(e.message)}}
 render();
 supabase.auth.onAuthStateChange(async(_event,session)=>{user=session?.user||null;if(user){try{await refreshData()}catch(e){}}else{profile=null;wallet=3;holdings=[];trades=[];admin=false}render()});
}
function renderSetup(){shell(`<div class="setup"><div class="brand"><span class="brand-mark">C</span> CRYPTO<span>GATE</span></div><h1>Your trading simulator is ready to configure.</h1><p>Add your Supabase project URL and public anon/publishable key to the <code>.env</code> file, run the SQL in <code>database.sql</code>, then restart the app.</p><div class="setup-steps"><b>1. Create a Supabase project</b><b>2. Run database.sql in SQL Editor</b><b>3. Copy credentials into .env</b><b>4. Deploy this folder to Vercel</b></div><p class="muted">See README.md for full instructions. Do not put a Supabase service-role key in this website.</p></div>`)}
init();
