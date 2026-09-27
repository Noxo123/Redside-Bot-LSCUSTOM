const api=(u,o)=>fetch(u,o).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur');return d});
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=v=>'$ '+Number(v||0).toLocaleString('fr-FR');
const week=()=>{const d=new Date();d.setHours(12,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);const s=d.toISOString().slice(0,10);d.setDate(d.getDate()+6);return[s,d.toISOString().slice(0,10)]};
const roleLabel=r=>r?.role_name||r?.roleKey||'Sans rôle';
const statusLabel=s=>({active:'Actif',trial:'Période d’essai',leave:'En absence',inactive:'Inactif'}[s]||s||'Actif');
const stat=(label,value,detail,icon)=>`<article class="dash-stat"><div class="dash-stat-icon">${icon}</div><div><span>${label}</span><strong>${value}</strong><small>${detail}</small></div></article>`;
const empty=(title,text)=>`<div class="dash-empty"><strong>${title}</strong><span>${text}</span></div>`;

function render(data){
 const {overview,rows,team,partnerships,absences}=data;
 const totals=['appels','reparations','fourrieres','personnalisations','factures','montant_fourrieres','montant_personnalisations','montant_factures'].reduce((o,k)=>{o[k]=(rows||[]).reduce((n,r)=>n+(Number(r[k])||0),0);return o},{});
 const actions=totals.appels+totals.reparations+totals.fourrieres+totals.personnalisations+totals.factures;
 const target=20000000;
 const customPct=Math.min(100,Math.round(totals.montant_personnalisations/target*100));
 const activityTotal=r=>Number(r.appels||0)+Number(r.reparations||0)+Number(r.fourrieres||0)+Number(r.personnalisations||0)+Number(r.factures||0);
 const ranked=[...(rows||[])].sort((a,b)=>(Number(b.montant_personnalisations)||0)-(Number(a.montant_personnalisations)||0)||activityTotal(b)-activityTotal(a)).slice(0,6);
 const teamRows=(team||[]).filter(x=>x.status!=='inactive').slice(0,8);
 const activePartners=(partnerships||[]).filter(x=>x.status==='active');
 const pendingPartners=(partnerships||[]).filter(x=>x.status==='pending');
 const today=new Date().toISOString().slice(0,10);
 const upcoming=(absences||[]).filter(x=>x.end_date>=today).slice(0,6);

 $('#content').innerHTML=`
 <section class="dash-grid dash-grid-kpi">
 ${stat('Employés actifs',overview?.employees??(team||[]).length,'sur '+(overview?.allEmployees??(team||[]).length)+' profils','01')}
 ${stat('Actions cette semaine',actions,'appels · réparations · fourrières','02')}
 ${stat('CA personnalisations',money(totals.montant_personnalisations),'objectif équipe : '+money(target),'03')}
 ${stat('Partenariats actifs',overview?.partnerships??activePartners.length,pendingPartners.length+' en attente','04')}
 </section>

 <section class="dash-grid dash-grid-main">
 <article class="dash-card dash-card-wide">
  <div class="dash-card-head"><div><span class="dash-label">PERFORMANCE ÉQUIPE</span><h2>Quotas & activité</h2></div><a href="/activite" class="dash-link">Voir le détail →</a></div>
  <div class="quota-overview">
   <div class="quota-overview-top"><div><b>${money(totals.montant_personnalisations)}</b><span>réalisé sur la période</span></div><div class="quota-big">${customPct}%</div></div>
   <div class="quota-track"><i style="width:${customPct}%"></i></div>
   <div class="quota-overview-foot"><span>Objectif collectif</span><strong>${money(target)}</strong></div>
  </div>
  <div class="metric-grid">
   <div><span>Appels</span><b>${totals.appels}</b></div><div><span>Réparations</span><b>${totals.reparations}</b></div><div><span>Fourrières</span><b>${totals.fourrieres}</b></div><div><span>Personnalisations</span><b>${totals.personnalisations}</b></div><div><span>Factures</span><b>${totals.factures}</b></div><div><span>Facturation totale</span><b>${money(totals.montant_fourrieres+totals.montant_personnalisations+totals.montant_factures)}</b></div>
  </div>
 </article>

 <article class="dash-card">
  <div class="dash-card-head"><div><span class="dash-label">CLASSEMENT</span><h2>Top performance</h2></div><a href="/activite" class="dash-link">Tout voir →</a></div>
  <div class="rank-list">${ranked.length?ranked.map((r,i)=>`<div class="rank-row"><span class="rank-num">${String(i+1).padStart(2,'0')}</span><div><b>${esc(r.display_name||r.username)}</b><small>${esc(roleLabel(r))}</small></div><strong>${money(r.montant_personnalisations)}</strong></div>`).join(''):empty('Aucune activité','Importe les quotas pour alimenter le classement.')}</div>
 </article>
 </section>

 <section class="dash-grid dash-grid-triple">
 <article class="dash-card"><div class="dash-card-head"><div><span class="dash-label">RESSOURCES HUMAINES</span><h2>État de l’équipe</h2></div><a href="/equipe" class="dash-link">Gérer →</a></div>
 <div class="team-mini">${teamRows.length?teamRows.map(e=>`<div class="team-row"><span class="avatar-mini">${esc((e.display_name||e.username||'?').slice(0,1).toUpperCase())}</span><div><b>${esc(e.display_name||e.username)}</b><small>${esc(roleLabel(e))}</small></div><span class="team-status ${esc(e.status||'active')}">${statusLabel(e.status)}</span></div>`).join(''):empty('Aucun profil','Les employés apparaîtront ici.')}</div></article>

 <article class="dash-card"><div class="dash-card-head"><div><span class="dash-label">PARTENARIATS</span><h2>Relations entreprise</h2></div><a href="/partenariats" class="dash-link">Gérer →</a></div>
 <div class="partner-summary"><div class="partner-big"><b>${activePartners.length}</b><span>partenariats actifs</span></div><div class="partner-line"><span>En attente</span><strong>${pendingPartners.length}</strong></div><div class="partner-line"><span>Total enregistré</span><strong>${(partnerships||[]).length}</strong></div></div>
 <div class="partner-list">${activePartners.slice(0,4).map(p=>`<div><b>${esc(p.company)}</b><span>${esc(p.contact||'Contact non défini')}</span></div>`).join('')}</div></article>

 <article class="dash-card"><div class="dash-card-head"><div><span class="dash-label">AGENDA RH</span><h2>Absences à venir</h2></div><a href="/agenda" class="dash-link">Ouvrir →</a></div>
 <div class="absence-list">${upcoming.length?upcoming.map(a=>`<div class="absence-row"><div><b>${esc(a.username||'Employé')}</b><small>${esc(a.type||'Indisponibilité')}</small></div><span>${esc(a.start_date)} → ${esc(a.end_date)}</span></div>`).join(''):empty('Aucune absence','Aucune absence enregistrée sur la période.')}</div></article>
 </section>

 <section class="dash-card dash-actions"><div class="dash-card-head"><div><span class="dash-label">ACCÈS RAPIDES</span><h2>Actions opérationnelles</h2></div></div>
 <div class="action-grid">
  <a href="/activite"><b>Importer les quotas</b><span>Mettre à jour les statistiques de la semaine</span><i>→</i></a>
  <a href="/equipe"><b>Gérer l’équipe</b><span>Employés, rôles, statuts et informations</span><i>→</i></a>
  <a href="/partenariats"><b>Suivre les partenariats</b><span>Tickets, entreprises et collaborations</span><i>→</i></a>
  <a href="/podium?embed=1" target="_blank"><b>Podium public</b><span>Classement hebdomadaire à partager</span><i>↗</i></a>
 </div></section>`;
}

async function main(){
 try{
  const r=await api('/api/session/access');
  const access=r.access;
  const userEl=$('#user'); if(userEl) userEl.textContent=(r.user.global_name||r.user.username)+' — '+(access.isAdmin?'Gérant légal / Développeur':(access.roles||[]).map(x=>x.name).join(' • ')||'Employé');
  document.querySelectorAll('[data-permission]').forEach(a=>{if(!(access.isAdmin||access.permissions.includes(a.dataset.permission)||access.permissions.includes('all')))a.remove()});
  if(access.isAdmin)$('#developerNav').classList.remove('hidden');
  $('#logout').onclick=async()=>{await api('/auth/player/logout',{method:'POST'});location.href='/connexion'};
  const [start,end]=week();
  const periodEl=$('#periodLabel'); if(periodEl) periodEl.textContent=start+' → '+end;
  const results=await Promise.all([
   api('/api/employee/overview'),
   api('/api/employee/activity?start='+start+'&end='+end),
   (access.isAdmin||access.permissions.includes('team')||access.permissions.includes('all'))?api('/api/employee/team'):Promise.resolve([]),
   (access.isAdmin||access.permissions.includes('partnerships')||access.permissions.includes('all'))?api('/api/employee/partnerships'):Promise.resolve([]),
   api('/api/employee/agenda')
  ]);
  render({overview:results[0],rows:results[1].rows||[],team:results[2]||[],partnerships:results[3]||[],absences:results[4]||[]});
  const refreshEl=$('#refreshLabel'); if(refreshEl) refreshEl.textContent='Mis à jour à '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
 }catch(e){$('#content').innerHTML='<div class="dash-error">'+esc(e.message)+'</div>'}
}
main();