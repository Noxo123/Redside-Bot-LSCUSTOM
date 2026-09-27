const api=(u,o)=>fetch(u,o).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur');return d});
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
async function main(){
 try{
  const a=await api('/api/session/access');
  if(!(a.access.isAdmin||a.access.permissions.includes('partnerships')||a.access.permissions.includes('all'))){document.querySelector('#content').innerHTML='<div class="rounded-2xl border border-red-900/50 bg-red-950/20 p-6 text-red-200">Accès refusé pour ce rôle Discord.</div>';return}
  document.querySelector('#user').innerHTML='<div class="font-semibold text-white">'+esc(a.user.global_name||a.user.username)+'</div><div class="text-xs text-zinc-500 mt-1">'+(a.access.isAdmin?'Administration':'Partenariats')+'</div>';
  document.querySelector('#logout').onclick=async()=>{await api('/auth/player/logout',{method:'POST'});location.href='/connexion'};
  const [ps,tickets]=await Promise.all([api('/api/employee/partnerships'),api('/api/guilds/'+a.access.guildId+'/partnership-tickets')]);
  const content=document.querySelector('#content');
  content.innerHTML='';
  const hero=document.createElement('div');
  hero.className='mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between';
  hero.innerHTML='<div><div class="text-[11px] font-bold tracking-[.25em] text-zinc-500">RELATIONS EXTERNES</div><h1 class="mt-2 text-3xl font-bold tracking-tight text-white">Partenariats</h1><p class="mt-2 text-sm text-zinc-500">Tickets Ticket Tool et partenaires suivis depuis un seul espace.</p></div><div class="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300"><span class="text-white font-semibold">'+tickets.length+'</span> ticket(s) · <span class="text-white font-semibold">'+ps.length+'</span> partenaire(s)</div>';
  content.appendChild(hero);
  const grid=document.createElement('div');grid.className='grid gap-6 xl:grid-cols-[1.15fr_.85fr]';
  const panel=document.createElement('section');panel.className='rounded-2xl border border-zinc-800 bg-zinc-950/80 shadow-2xl overflow-hidden';
  panel.innerHTML='<div class="border-b border-zinc-800 p-5"><div class="flex items-center justify-between"><div><h2 class="text-lg font-semibold text-white">🎫 Tickets partenariat</h2><p class="mt-1 text-xs text-zinc-500">Catégorie Ticket Tool : 1549137158919430255</p></div><span class="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">'+tickets.length+'</span></div></div>';
  const list=document.createElement('div');list.className='divide-y divide-zinc-800';
  for(const t of tickets){
   const div=document.createElement('div');div.className='p-5 hover:bg-zinc-900/50 transition';
   div.innerHTML='<div class="flex gap-4"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-lg">🎫</div><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h3 class="font-semibold text-white">'+esc(t.name)+'</h3><span class="text-xs text-zinc-500">'+esc(t.creatorName||'Demandeur')+'</span></div><p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">'+esc(t.message||'Aucun message texte récupérable dans ce ticket.')+'</p><div class="mt-4 flex flex-wrap gap-2"><a class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800" target="_blank" rel="noreferrer" href="'+esc(t.url)+'">Ouvrir Discord ↗</a><button class="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black hover:bg-zinc-200" data-id="'+esc(t.id)+'">Convertir en partenaire</button></div></div></div>';
   div.querySelector('button').onclick=async()=>{const b=div.querySelector('button');b.disabled=true;b.textContent='Conversion…';try{await api('/api/employee/partnerships/import-ticket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel_id:t.id})});location.reload()}catch(e){b.disabled=false;b.textContent='Convertir en partenaire';alert(e.message)}};
   list.appendChild(div);
  }
  if(!tickets.length)list.innerHTML='<div class="p-8 text-center text-sm text-zinc-500">Aucun ticket de partenariat ouvert.</div>';
  panel.appendChild(list);
  const partners=document.createElement('section');partners.className='rounded-2xl border border-zinc-800 bg-zinc-950/80 shadow-2xl overflow-hidden';
  partners.innerHTML='<div class="border-b border-zinc-800 p-5"><h2 class="text-lg font-semibold text-white">🤝 Partenariats enregistrés</h2><p class="mt-1 text-xs text-zinc-500">Suivi des relations actives et en attente.</p></div>';
  const pl=document.createElement('div');pl.className='divide-y divide-zinc-800';
  for(const p of ps){const d=document.createElement('div');d.className='p-5 hover:bg-zinc-900/50 transition';const status=p.status==='active'?'Actif':p.status==='pending'?'En attente':p.status==='paused'?'En pause':'Terminé';d.innerHTML='<div class="flex items-center gap-4"><div class="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900">🤝</div><div class="min-w-0 flex-1"><div class="font-semibold text-white truncate">'+esc(p.company)+'</div><div class="mt-1 text-sm text-zinc-500">'+esc(p.contact||'Aucun contact')+'</div></div><span class="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">'+status+'</span></div>';pl.appendChild(d)}
  if(!ps.length)pl.innerHTML='<div class="p-8 text-center text-sm text-zinc-500">Aucun partenariat enregistré.</div>';
  partners.appendChild(pl);grid.append(panel,partners);content.appendChild(grid);
 }catch(e){document.querySelector('#content').innerHTML='<div class="rounded-2xl border border-red-900/50 bg-red-950/20 p-6"><div class="font-semibold text-red-200">Impossible de charger les partenariats</div><div class="mt-2 text-sm text-red-300/80">'+esc(e.message)+'</div></div>'}
}
main();