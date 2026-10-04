const api=(u,o)=>fetch(u,o).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(d.error||'Erreur'),{status:r.status,data:d});return d});
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>'$ '+Number(v||0).toLocaleString('fr-FR');
const localDate=()=>{
 const d=new Date(),day=d.getDay()||7;
 d.setHours(12,0,0,0);d.setDate(d.getDate()-day+1);
 const start=d.toLocaleDateString('sv-SE');d.setDate(d.getDate()+6);
 return[start,d.toLocaleDateString('sv-SE')];
};
const formatDateTime=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'medium'})};
let state={access:null,start:'',end:'',rows:[],imports:[]};

function modal(){
 return `<div id="quotaModal" class="quota-modal"><div class="quota-dialog max-w-4xl"><div class="quota-dialog-head"><div><div class="text-[10px] font-bold tracking-[.22em] text-zinc-600">IMPORT RH</div><h2 class="mt-1 text-xl font-bold text-white">Importer les interventions</h2><p class="mt-1 text-xs text-zinc-500">Chaque import est enregistré avec sa période, son contenu et sa date/heure exacte.</p></div><button id="closeQuota" class="quota-btn secondary">Fermer</button></div><div class="quota-dialog-body"><div class="quota-grid"><div><label class="quota-label">Début</label><input id="importStart" type="date" class="w-full p-3"></div><div><label class="quota-label">Fin</label><input id="importEnd" type="date" class="w-full p-3"></div><div class="wide"><label class="quota-label">Relevé complet</label><textarea id="importRaw" rows="15" class="w-full p-3" placeholder="1. José Mendez — Appels: 2 · Réparations: 7 · Mises en fourrière: 40 · Personnalisations: 6 · Montant fourrière: $ 400 000 · ..."></textarea><p class="mt-2 text-xs text-zinc-600">Les indicateurs et les montants sont détectés automatiquement. Le relevé original est conservé en base avec l'heure d'import.</p></div></div><div id="importProgress" class="mt-4 hidden rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300"></div><div id="importError" class="mt-3 text-sm text-red-400"></div><div class="mt-5 flex justify-end gap-2"><button id="cancelQuota" class="quota-btn secondary">Annuler</button><button id="sendQuota" class="quota-btn">Importer et sauvegarder</button></div></div></div></div>`;
}

function renderHistory(){
 const rows=state.imports||[];
 if(!rows.length)return '<section class="mb-6 rounded-2xl border border-zinc-800 bg-[#090909] p-5"><div class="text-[10px] font-bold tracking-[.2em] text-zinc-600">HISTORIQUE RH</div><h2 class="mt-1 text-lg font-semibold text-white">Imports enregistrés</h2><p class="mt-2 text-sm text-zinc-500">Aucun import enregistré pour le moment.</p></section>';
 return '<section class="mb-6 rounded-2xl border border-zinc-800 bg-[#090909] overflow-hidden"><button type="button" id="toggleImportHistory" class="w-full flex flex-wrap items-center justify-between gap-3 p-5 text-left hover:bg-white/[.02] transition-colors"><div><div class="text-[10px] font-bold tracking-[.2em] text-zinc-600">HISTORIQUE RH</div><h2 class="mt-1 text-lg font-semibold text-white">Imports enregistrés</h2><p class="mt-1 text-xs text-zinc-500">La date et l’heure correspondent au moment où l’import a été validé et écrit en base.</p></div><span class="flex items-center gap-3"><span class="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-500">'+rows.length+' import(s)</span><span id="importHistoryChevron" class="grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 text-zinc-400 transition-transform">⌄</span></span></button><div id="importHistoryBody" class="hidden border-t border-zinc-800"><div class="overflow-x-auto"><table class="min-w-full text-left text-sm"><thead><tr class="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-600"><th class="px-3 py-3">Date / heure</th><th class="px-3 py-3">Période</th><th class="px-3 py-3">Par</th><th class="px-3 py-3">Lignes</th><th class="px-3 py-3">Créés</th><th class="px-3 py-3">Statut</th><th class="px-3 py-3"></th></tr></thead><tbody>'+rows.map(x=>'<tr class="border-b border-zinc-900 last:border-0"><td class="px-3 py-3 whitespace-nowrap text-zinc-300">'+esc(formatDateTime(x.imported_at))+'</td><td class="px-3 py-3 whitespace-nowrap text-zinc-400">'+esc(x.period_start)+' → '+esc(x.period_end)+'</td><td class="px-3 py-3 text-zinc-400">'+esc(x.imported_by_name||x.imported_by||'—')+'</td><td class="px-3 py-3 text-zinc-300">'+Number(x.imported_count||0)+'</td><td class="px-3 py-3 text-zinc-400">'+Number(x.created_count||0)+'</td><td class="px-3 py-3"><span class="rounded-full border border-emerald-900/60 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-400">'+esc(x.status||'completed')+'</span></td><td class="px-3 py-3 text-right"><button class="quota-btn secondary text-xs" data-import-period="'+esc(x.period_start)+'|'+esc(x.period_end)+'">Charger</button></td></tr>').join('')+'</tbody></table></div></div></section>';
}

function render(){
 const rows=(state.rows||[]).slice().sort((a,b)=>{const av=Number(a.montant_personnalisations)||0,bv=Number(b.montant_personnalisations)||0;return bv-av||String(a.display_name||a.username||'').localeCompare(String(b.display_name||b.username||''),'fr')});
 const totals=['appels','reparations','fourrieres','personnalisations','factures','montant_fourrieres','montant_personnalisations','montant_factures'].reduce((o,k)=>{o[k]=rows.reduce((n,x)=>n+(Number(x[k])||0),0);return o},{});
 const totalActions=totals.appels+totals.reparations+totals.fourrieres+totals.personnalisations+totals.factures;
 const guildId=state.access?.guildId||'';
 const podiumUrl=location.origin+'/podium?guild_id='+encodeURIComponent(guildId)+'&embed=1';
 const iframeCode='<iframe src="'+podiumUrl+'" width="100%" height="520" style="border:0;border-radius:12px;overflow:hidden" loading="lazy" title="Podium LS CUSTOM"></iframe>';
 const quotaPct=Math.min(100,Math.round((totals.montant_personnalisations/20000000/Math.max(rows.length,1))*100));
 const cards='<section class="quota-command-center">'+
 '<div class="quota-kpi quota-kpi-hero"><small>QUOTA ARGENT</small><strong>'+money(totals.montant_personnalisations)+'</strong><span>Personnalisations réalisées sur la période</span><div class="quota-kpi-progress"><i style="width:'+quotaPct+'%"></i></div></div>'+
 '<div class="quota-kpi quota-kpi-large"><small>FOURRIÈRE</small><strong>'+money(totals.montant_fourrieres)+'</strong><span>'+totals.fourrieres+' mise(s) en fourrière</span></div>'+
 '<div class="quota-kpi"><small>RÉPARATIONS</small><strong>'+totals.reparations+'</strong><span>interventions</span></div>'+
 '<div class="quota-kpi"><small>APPELS</small><strong>'+totals.appels+'</strong><span>appels traités</span></div>'+
 '<div class="quota-kpi"><small>PERSONNALISATIONS</small><strong>'+totals.personnalisations+'</strong><span>prestations</span></div>'+
 '<div class="quota-kpi"><small>FACTURES</small><strong>'+money(totals.montant_factures)+'</strong><span>'+totals.factures+' facture(s)</span></div>'+
 '<div class="quota-kpi quota-kpi-muted"><small>EMPLOYÉS</small><strong>'+rows.length+'</strong><span>profils affichés</span></div>'+
 '<div class="quota-kpi quota-kpi-muted"><small>TOTAL INTERVENTIONS</small><strong>'+totalActions+'</strong><span>actions enregistrées</span></div></section>';
 const rowsHtml=rows.map(row=>{
  const target=20000000,pct=Math.min(100,Math.round((Number(row.montant_personnalisations)||0)/target*100));
  const total=(Number(row.montant_fourrieres)||0)+(Number(row.montant_personnalisations)||0)+(Number(row.montant_factures)||0);
  return '<tr data-name="'+esc((row.display_name||row.username)+' '+(row.role_name||''))+'">'+
   '<td><span class="quota-name">'+esc(row.display_name||row.username)+'</span><span class="quota-role">'+esc(row.role_name||'Sans rôle')+'</span></td>'+
   '<td><span class="quota-badge">$ '+Number(row.montant_personnalisations||0).toLocaleString('fr-FR')+' / $ 20 000 000</span><div class="quota-progress"><i style="width:'+pct+'%"></i></div></td>'+
   '<td class="quota-money quota-money-priority">'+money(row.montant_fourrieres)+'</td>'+
   '<td class="quota-money">'+money(row.montant_personnalisations)+'</td>'+
   '<td class="quota-money">'+money(row.montant_factures)+'</td>'+
   '<td class="quota-num quota-num-priority">'+(row.fourrieres||0)+'</td>'+
   '<td class="quota-num">'+(row.reparations||0)+'</td>'+
   '<td class="quota-num">'+(row.appels||0)+'</td>'+
   '<td class="quota-num">'+(row.personnalisations||0)+'</td>'+
   '<td class="quota-num">'+(row.factures||0)+'</td>'+
   '<td class="quota-money">'+money(total)+'</td></tr>';
 }).join('');
 const totalRow='<tr class="quota-total"><td>TOTAL ÉQUIPE</td><td></td>'+
  '<td class="quota-money quota-money-priority">'+money(totals.montant_fourrieres)+'</td>'+
  '<td class="quota-money">'+money(totals.montant_personnalisations)+'</td>'+
  '<td class="quota-money">'+money(totals.montant_factures)+'</td>'+
  '<td class="quota-num quota-num-priority">'+totals.fourrieres+'</td>'+
  '<td class="quota-num">'+totals.reparations+'</td>'+
  '<td class="quota-num">'+totals.appels+'</td>'+
  '<td class="quota-num">'+totals.personnalisations+'</td>'+
  '<td class="quota-num">'+totals.factures+'</td>'+
  '<td class="quota-money">'+money(totals.montant_fourrieres+totals.montant_personnalisations+totals.montant_factures)+'</td></tr>';
 $('#content').innerHTML=renderHistory()+
 '<section class="podium-workspace"><div class="podium-workspace-head"><div><div class="text-[10px] tracking-[.2em] text-zinc-600">WIDGET PUBLIC</div><h2 class="mt-1 text-xl">🏆 Podium de la semaine</h2><p class="mt-1 text-xs text-zinc-500">Les 3 employés avec le plus d\'actions sur la période sélectionnée.</p></div><div class="flex flex-wrap items-center gap-2"><button id="copyPodium" class="quota-btn secondary">Copier l\'iframe</button><button id="imagePodium" class="quota-btn secondary">🖼️ Convertir en image</button></div></div><div class="podium-preview"><iframe src="'+podiumUrl+'" title="Podium LS CUSTOM" loading="lazy"></iframe></div><details class="podium-embed"><summary>Code iframe · à intégrer sur un site</summary><textarea readonly>'+esc(iframeCode)+'</textarea><p>Pour Discord, les iframes ne sont pas exécutées dans les messages. Partage plutôt le lien public du podium : <b>'+esc(podiumUrl)+'</b>.</p></details></section>'+
 cards+
 '<div class="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div class="text-xs uppercase tracking-[.16em] text-zinc-600">PÉRIODE</div><div class="mt-1 text-sm text-zinc-400">'+state.start+' → '+state.end+'</div></div><input id="quotaSearch" class="w-full max-w-[300px] p-3" placeholder="Rechercher un employé..."></div>'+
 '<div class="quota-table-wrap"><table class="quota-table"><thead><tr><th>Employé</th><th>Quota argent</th><th>Montant fourrière</th><th>Montant personnalisations</th><th>Montant factures</th><th>Fourrières</th><th>Réparations</th><th>Appels</th><th>Personnalisations</th><th>Factures</th><th>Total $</th></tr></thead><tbody>'+rowsHtml+totalRow+'</tbody></table></div>';
 $('#quotaSearch').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.quota-table tbody tr[data-name]').forEach(tr=>tr.style.display=tr.dataset.name.toLowerCase().includes(q)?'':'none')};
 const historyToggle=$('#toggleImportHistory'),historyBody=$('#importHistoryBody'),historyChevron=$('#importHistoryChevron');if(historyToggle&&historyBody)historyToggle.onclick=()=>{const open=historyBody.classList.toggle('hidden');if(historyChevron)historyChevron.style.transform=open?'rotate(0deg)':'rotate(180deg)'};
 document.querySelectorAll('[data-import-period]').forEach(btn=>btn.onclick=()=>{const [start,end]=btn.dataset.importPeriod.split('|');load(start,end)});
 $('#copyPodium').onclick=async()=>{try{await navigator.clipboard.writeText(iframeCode);$('#copyPodium').textContent='✓ Iframe copié';setTimeout(()=>$('#copyPodium').textContent='Copier l\'iframe',1800)}catch{alert('Impossible de copier automatiquement. Utilise le code affiché ci-dessous.')}};
 $('#imagePodium').onclick=async()=>{
   const btn=$('#imagePodium'),frame=document.querySelector('.podium-preview iframe');
   if(!frame)return;
   btn.disabled=true;btn.textContent='⏳ Génération...';
   try{
     if(!window.html2canvas){
       await new Promise((resolve,reject)=>{
         const sc=document.createElement('script');
         sc.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
         sc.onload=resolve;sc.onerror=reject;document.head.appendChild(sc);
       });
     }
     await new Promise((resolve,reject)=>{
       if(frame.contentDocument?.readyState==='complete')return resolve();
       frame.addEventListener('load',resolve,{once:true});
       setTimeout(()=>reject(new Error('Le podium met trop de temps à charger.')),10000);
     });
     const target=frame.contentDocument?.body;
     if(!target)throw new Error('Impossible d\'accéder au contenu du podium.');
     const canvas=await window.html2canvas(target,{backgroundColor:'#050505',scale:2,useCORS:true,logging:false,windowWidth:target.scrollWidth,windowHeight:target.scrollHeight});
     const link=document.createElement('a');
     link.download='ls-custom-podium-'+new Date().toISOString().slice(0,10)+'.png';
     link.href=canvas.toDataURL('image/png');
     link.click();
     btn.textContent='✓ Image téléchargée';
     setTimeout(()=>btn.textContent='🖼️ Convertir en image',2200);
   }catch(e){
     console.error('Conversion podium en image:',e);
     alert('Impossible de convertir le podium en image. Vérifie que le widget est chargé puis réessaie.');
     btn.textContent='🖼️ Convertir en image';
   }finally{btn.disabled=false}
 };
}
function openImport(){
 document.body.insertAdjacentHTML('beforeend',modal());
 const [s,e]=localDate();
 $('#importStart').value=state.start||s;$('#importEnd').value=state.end||e;
 const close=()=>$('#quotaModal')?.remove();
 $('#closeQuota').onclick=close;$('#cancelQuota').onclick=close;
 $('#sendQuota').onclick=async()=>{
   const err=$('#importError'),progress=$('#importProgress'),btn=$('#sendQuota');
   err.textContent='';progress.classList.remove('hidden');progress.textContent='Analyse du relevé…';btn.disabled=true;btn.textContent='Analyse…';
   try{
     const periodStart=$('#importStart').value,periodEnd=$('#importEnd').value,raw=$('#importRaw').value;
     if(!periodStart||!periodEnd||periodStart>periodEnd)throw Error('La période sélectionnée est invalide.');
     if(raw.trim().length<20)throw Error('Le relevé est trop court.');
     progress.textContent='Enregistrement en base et sauvegarde de la date/heure…';btn.textContent='Sauvegarde…';
     const r=await api('/api/employee/quotas/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({period_start:periodStart,period_end:periodEnd,text:raw})});
     progress.textContent='Import sauvegardé le '+formatDateTime(r.import?.imported_at)+' ✓';
     btn.textContent='Terminé ✓';
     await new Promise(resolve=>setTimeout(resolve,500));
     close();await load(periodStart,periodEnd);
     alert(r.count+' ligne(s) importée(s). Import enregistré le '+formatDateTime(r.import?.imported_at)+(r.created?.length?' · '+r.created.length+' personne(s) créée(s).':'')+(r.errors?.length?' · '+r.errors.length+' ligne(s) ignorée(s).':''));
   }catch(e){
     progress.classList.add('hidden');err.textContent=(e.message||'Impossible d’enregistrer l’import.')+(Array.isArray(e.data?.errors)&&e.data.errors.length?' — '+e.data.errors.slice(0,5).map(x=>'ligne '+x.line+': '+x.error).join(' · '):'');btn.disabled=false;btn.textContent='Importer et sauvegarder';
   }
 };
}

async function clearQuotas(){
 const ok=confirm('⚠️ VIDER LES QUOTAS\n\nCette action supprime tous les relevés de quotas et tout l’historique des imports pour ce serveur. Les employés, rôles, comptes et réglages seront conservés.\n\nContinuer ?');
 if(!ok)return;
 const confirmation=prompt('Pour confirmer définitivement, saisis exactement : VIDER_QUOTAS');
 if(confirmation!=='VIDER_QUOTAS')return alert('Action annulée : confirmation incorrecte.');
 const btn=$('#clearQuotaButton');
 try{
  btn.disabled=true;btn.textContent='Suppression…';
  const r=await api('/api/employee/quotas/clear',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmation})});
  btn.textContent='✓ Quotas vidés';
  await load(state.start,state.end);
  alert('Quotas vidés : '+Number(r.result?.quota_entries||0)+' relevé(s) et '+Number(r.result?.quota_imports||0)+' import(s) supprimé(s).');
 }catch(e){btn.disabled=false;btn.textContent='🗑 Vider les quotas';alert(e.message||'Impossible de vider les quotas.');}
}

async function load(start,end){
 state.start=start;state.end=end;
 const [activity,history]=await Promise.all([api('/api/employee/activity?start='+encodeURIComponent(start)+'&end='+encodeURIComponent(end)),api('/api/employee/quotas/imports')]);
 state.rows=Array.isArray(activity.rows)?activity.rows:[];state.imports=Array.isArray(history.rows)?history.rows:[];
 render();
}

async function main(){
 try{
  const a=await api('/api/session/access');state.access=a.access;
  $('#user').textContent=(a.user.global_name||a.user.username)+' — '+((a.access.roles||[]).map(x=>x.name).join(' • ')||'Employé');
  $('#logout').onclick=async()=>{await api('/auth/player/logout',{method:'POST'});location.href='/connexion'};
  if(a.access.isAdmin)$('#developerNav')?.classList.remove('hidden');
  const [s,e]=localDate();state.start=s;state.end=e;
  const canImport=a.access.isAdmin||a.access.permissions.includes('activity_all')||a.access.permissions.includes('all');
  if(canImport){$('#actions').innerHTML='<div class="flex flex-wrap gap-2"><button id="importButton" class="quota-btn">＋ Importer les interventions</button><button id="clearQuotaButton" class="quota-btn secondary border-red-900/60 text-red-300 hover:border-red-700 hover:bg-red-950/30">🗑 Vider les quotas</button></div>';$('#importButton').onclick=openImport;$('#clearQuotaButton').onclick=clearQuotas}
  await load(s,e);
 }catch(e){$('#content').innerHTML='<div class="org-panel p-5 text-red-400">'+esc(e.message)+'</div>'}
}
main();