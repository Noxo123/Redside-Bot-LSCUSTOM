const api=(u,o)=>fetch(u,o).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur');return d});
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const fmt=n=>Number(n||0).toLocaleString('fr-FR');
const ms=n=>Math.round(Number(n||0))+' ms';
const pct=n=>Math.max(0,Math.min(100,Number(n||0))).toFixed(1)+'%';
const card=(label,value,detail,accent='')=>'<article class="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div class="text-[10px] font-bold tracking-[.2em] text-zinc-600">'+label+'</div><div class="mt-3 text-3xl font-bold tracking-tight '+accent+'">'+value+'</div><div class="mt-1 text-xs text-zinc-600">'+detail+'</div></article>';
function status(ok,label){return '<span class="inline-flex items-center gap-2 rounded-full border '+(ok?'border-emerald-900/60 bg-emerald-950/20 text-emerald-300':'border-red-900/60 bg-red-950/20 text-red-300')+' px-2.5 py-1 text-xs"><i class="h-1.5 w-1.5 rounded-full '+(ok?'bg-emerald-400':'bg-red-400')+'"></i>'+label+'</span>'}
function render(d){
 const s=d.server,b=d.discord,traffic=d.traffic,r=d.resources;
 document.querySelector('#app').innerHTML=
 '<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">'+
 card('SERVEUR',s.online?'ONLINE':'OFFLINE',s.uptime,'text-white')+
 card('LATENCE SERVEUR',ms(s.latency),s.latency<100?'Réponse normale':s.latency<250?'Réponse élevée':'Réponse lente',s.latency<100?'text-emerald-300':'text-amber-300')+
 card('VISITEURS ACTIFS',fmt(traffic.activeVisitors),'activité observée sur les dernières minutes','text-white')+
 card('REQUÊTES / MIN',fmt(traffic.requestsPerMinute),'trafic HTTP récent','text-white')+
 '</section>'+
 '<section class="mt-4 grid gap-4 xl:grid-cols-3">'+
 '<article class="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 xl:col-span-2"><div class="flex items-center justify-between"><div><div class="text-[10px] font-bold tracking-[.2em] text-zinc-600">SYSTÈME</div><h2 class="mt-1 text-lg font-semibold text-white">Santé de l’application</h2></div>'+status(s.online,'Node.js '+esc(s.node))+'</div><div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">'+
 '<div class="rounded-xl border border-zinc-800 bg-[#080808] p-4"><span class="text-xs text-zinc-600">Uptime</span><b class="mt-2 block text-white">'+esc(s.uptime)+'</b></div>'+
 '<div class="rounded-xl border border-zinc-800 bg-[#080808] p-4"><span class="text-xs text-zinc-600">Mémoire</span><b class="mt-2 block text-white">'+fmt(r.memoryUsedMb)+' / '+fmt(r.memoryTotalMb)+' MB</b><small class="text-zinc-600">'+pct(r.memoryPercent)+'</small></div>'+
 '<div class="rounded-xl border border-zinc-800 bg-[#080808] p-4"><span class="text-xs text-zinc-600">CPU process</span><b class="mt-2 block text-white">'+pct(r.cpuPercent)+'</b></div>'+
 '<div class="rounded-xl border border-zinc-800 bg-[#080808] p-4"><span class="text-xs text-zinc-600">PID</span><b class="mt-2 block font-mono text-white">'+s.pid+'</b></div>'+
 '</div></article>'+
 '<article class="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div class="text-[10px] font-bold tracking-[.2em] text-zinc-600">DISCORD</div><h2 class="mt-1 text-lg font-semibold text-white">Bot & connexion</h2><div class="mt-5 space-y-3">'+
 '<div class="flex items-center justify-between border-b border-zinc-900 pb-3"><span class="text-sm text-zinc-500">État</span>'+status(b.ready,'Connecté')+'</div>'+
 '<div class="flex justify-between border-b border-zinc-900 pb-3 text-sm"><span class="text-zinc-500">Ping</span><b class="text-white">'+ms(b.latency)+'</b></div>'+
 '<div class="flex justify-between border-b border-zinc-900 pb-3 text-sm"><span class="text-zinc-500">Serveurs</span><b class="text-white">'+fmt(b.guilds)+'</b></div>'+
 '<div class="flex justify-between text-sm"><span class="text-zinc-500">Membres visibles</span><b class="text-white">'+fmt(b.members)+'</b></div>'+
 '</div></article></section>'+
 '<section class="mt-4 grid gap-4 xl:grid-cols-2">'+
 '<article class="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div class="flex justify-between"><div><div class="text-[10px] font-bold tracking-[.2em] text-zinc-600">TRAFIC</div><h2 class="mt-1 text-lg font-semibold text-white">Activité du site</h2></div><span class="font-mono text-xs text-zinc-600">LIVE</span></div><div class="mt-5 space-y-4">'+
 '<div><div class="mb-2 flex justify-between text-xs"><span class="text-zinc-500">Visiteurs actifs</span><b class="text-white">'+fmt(traffic.activeVisitors)+'</b></div><div class="h-2 overflow-hidden rounded-full bg-zinc-900"><div class="h-full rounded-full bg-white" style="width:'+Math.min(100,traffic.activeVisitors*10)+'%"></div></div></div>'+
 '<div class="grid grid-cols-2 gap-3"><div class="rounded-xl border border-zinc-800 p-4"><span class="text-xs text-zinc-600">Requêtes totales</span><b class="mt-1 block text-xl text-white">'+fmt(traffic.totalRequests)+'</b></div><div class="rounded-xl border border-zinc-800 p-4"><span class="text-xs text-zinc-600">Dernière minute</span><b class="mt-1 block text-xl text-white">'+fmt(traffic.requestsPerMinute)+'</b></div></div></div></article>'+
 '<article class="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div class="text-[10px] font-bold tracking-[.2em] text-zinc-600">ENDPOINT</div><h2 class="mt-1 text-lg font-semibold text-white">État des services</h2><div class="mt-5 divide-y divide-zinc-900">'+
 '<div class="flex items-center justify-between py-3"><div><b class="text-sm text-white">HTTP / Express</b><div class="text-xs text-zinc-600">Serveur web principal</div></div>'+status(true,'Opérationnel')+'</div>'+
 '<div class="flex items-center justify-between py-3"><div><b class="text-sm text-white">SQLite</b><div class="text-xs text-zinc-600">Base de données locale</div></div>'+status(s.database,'Opérationnel')+'</div>'+
 '<div class="flex items-center justify-between py-3"><div><b class="text-sm text-white">Discord Gateway</b><div class="text-xs text-zinc-600">Connexion bot</div></div>'+status(b.ready,b.ready?'Opérationnel':'Déconnecté')+'</div>'+
 '</div></article></section>'+
 '<section class="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><div class="text-[10px] font-bold tracking-[.2em] text-zinc-600">DIAGNOSTIC</div><h2 class="mt-1 text-lg font-semibold text-white">Informations runtime</h2></div><button onclick="load()" class="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-white">↻ Actualiser</button></div><div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs"><div><span class="text-zinc-600">Node</span><b class="mt-1 block font-mono text-zinc-300">'+esc(s.node)+'</b></div><div><span class="text-zinc-600">Plateforme</span><b class="mt-1 block font-mono text-zinc-300">'+esc(s.platform)+'</b></div><div><span class="text-zinc-600">Architecture</span><b class="mt-1 block font-mono text-zinc-300">'+esc(s.arch)+'</b></div><div><span class="text-zinc-600">PID</span><b class="mt-1 block font-mono text-zinc-300">'+s.pid+'</b></div></div></section>';
}
async function load(){
 try{const d=await api('/api/developer/monitoring');render(d);document.querySelector('#live').textContent='● LIVE';document.querySelector('#live').className='rounded-full border border-emerald-900/60 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300';document.querySelector('#updated').textContent=new Date().toLocaleTimeString('fr-FR')}catch(e){document.querySelector('#error').textContent=e.message;document.querySelector('#error').classList.remove('hidden');document.querySelector('#live').textContent='● ERREUR'}}
document.querySelector('#logout').onclick=async()=>{await api('/auth/player/logout',{method:'POST'});location.href='/connexion'};
load();setInterval(load,2000);