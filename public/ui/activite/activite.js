const api=(u,o)=>fetch(u,{credentials:'same-origin',cache:'no-store',...o,headers:{'Cache-Control':'no-cache',...(o?.headers||{})}}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(d.error||'Erreur'),{status:r.status,data:d});return d});
const $=s=>document.querySelector(s);
const setText=(s,v)=>{const el=$(s);if(el)el.textContent=String(v??'');return el};
const toast=(message,type='info',title='Activité')=>window.LSUI?.toast?window.LSUI.toast(message,type,title):console.warn('[LS CUSTOM]',message);
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
 return `
<div id="quotaModal" class="quota-modal" role="dialog" aria-modal="true" aria-labelledby="quotaModalTitle">
  <div class="quota-dialog quota-import-dialog">
    <div class="quota-dialog-glow"></div>
    <header class="quota-dialog-head">
      <div class="quota-modal-title-wrap">
        <span class="quota-modal-icon" aria-hidden="true">↑</span>
        <div>
          <div class="quota-modal-eyebrow">RH · IMPORT INTERVENTIONS</div>
          <h2 id="quotaModalTitle">Importer les interventions</h2>
          <p>Ajoute le relevé de la semaine. Les données seront analysées puis enregistrées dans l’historique RH.</p>
        </div>
      </div>
      <button type="button" id="closeQuota" class="quota-modal-close" aria-label="Fermer le modal">×</button>
    </header>

    <div class="quota-import-steps" aria-label="Étapes de l’import">
      <div class="quota-import-step is-active" data-step="1"><b>01</b><span>Relevé</span></div>
      <i></i>
      <div class="quota-import-step" data-step="2"><b>02</b><span>Analyse</span></div>
      <i></i>
      <div class="quota-import-step" data-step="3"><b>03</b><span>Enregistrement</span></div>
    </div>

    <div class="quota-dialog-body">
      <div id="importFormState" class="quota-import-state">
        <div class="quota-import-period">
          <div class="quota-import-field">
            <label class="quota-label" for="importStart">Début de période</label>
            <div class="quota-input-wrap"><span>CAL</span><input id="importStart" type="date" autocomplete="off"></div>
          </div>
          <div class="quota-import-field">
            <label class="quota-label" for="importEnd">Fin de période</label>
            <div class="quota-input-wrap"><span>CAL</span><input id="importEnd" type="date" autocomplete="off"></div>
          </div>
        </div>

        <div class="quota-import-field">
          <div class="quota-field-head">
            <label class="quota-label" for="importRaw">Relevé complet</label>
            <span id="importCharCount">0 caractère</span>
          </div>
          <textarea id="importRaw" rows="15" spellcheck="false" placeholder="1. José Mendez — Appels: 2 · Réparations: 7 · Mises en fourrière: 40 · Personnalisations: 6 · Montant fourrière: $ 400 000 · ..."></textarea>
          <div class="quota-import-help">
            <span>i</span>
            <p>Colle le relevé brut fourni par Discord. Les employés, interventions et montants sont détectés automatiquement. Le texte original reste conservé pour l’historique.</p>
          </div>
        </div>

        <div id="importError" class="quota-import-error" role="alert" aria-live="polite"></div>

        <footer class="quota-import-footer">
          <div class="quota-import-secure"><span>●</span> Enregistrement sécurisé · horodatage automatique</div>
          <div class="quota-modal-actions">
            <button type="button" id="cancelQuota" class="quota-btn secondary">Annuler</button>
            <button type="button" id="sendQuota" class="quota-btn quota-btn-primary">Continuer <span>→</span></button>
          </div>
        </footer>
      </div>

      <div id="importLoadingState" class="quota-import-state quota-import-loading hidden" aria-live="polite">
        <div class="quota-import-orbit"><span></span><i></i></div>
        <div class="quota-import-loading-copy">
          <div class="quota-modal-eyebrow">TRAITEMENT EN COURS</div>
          <h3 id="importProgressTitle">Analyse du relevé…</h3>
          <p id="importProgress">Lecture des interventions et vérification des données.</p>
        </div>
        <div class="quota-import-loading-bar"><i id="importProgressBar"></i></div>
        <div class="quota-import-checks">
          <span id="importCheckParse">○ Analyse du relevé</span>
          <span id="importCheckValidate">○ Validation de la période</span>
          <span id="importCheckSave">○ Enregistrement en base</span>
        </div>
      </div>

      <div id="importSuccessState" class="quota-import-state quota-import-result hidden" aria-live="polite">
        <div class="quota-result-icon">✓</div>
        <div class="quota-modal-eyebrow">IMPORT TERMINÉ</div>
        <h3>Les interventions sont enregistrées</h3>
        <p id="importSuccessText">L’import a été sauvegardé dans l’historique RH.</p>
        <div class="quota-result-meta">
          <div><span>LIGNES IMPORTÉES</span><strong id="importSuccessCount">0</strong></div>
          <div><span>DATE / HEURE</span><strong id="importSuccessDate">—</strong></div>
        </div>
        <button type="button" id="finishQuota" class="quota-btn quota-btn-primary">Fermer <span>✓</span></button>
      </div>
    </div>
  </div>
</div>`;
}
function renderHistory(){
 const rows=state.imports||[];
 if(!rows.length)return '<section class="mb-6 rounded-2xl border border-zinc-800 bg-[#090909] p-5"><div class="text-[10px] font-bold tracking-[.2em] text-zinc-600">HISTORIQUE RH</div><h2 class="mt-1 text-lg font-semibold text-white">Imports enregistrés</h2><p class="mt-2 text-sm text-zinc-500">Aucun import enregistré pour le moment.</p></section>';
 return '<section class="mb-6 rounded-2xl border border-zinc-800 bg-[#090909] overflow-hidden"><button type="button" id="toggleImportHistory" class="w-full flex flex-wrap items-center justify-between gap-3 p-5 text-left hover:bg-white/[.02] transition-colors"><div><div class="text-[10px] font-bold tracking-[.2em] text-zinc-600">HISTORIQUE RH</div><h2 class="mt-1 text-lg font-semibold text-white">Imports enregistrés</h2><p class="mt-1 text-xs text-zinc-500">La date et l’heure correspondent au moment où l’import a été validé et écrit en base.</p></div><span class="flex items-center gap-3"><span class="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-500">'+rows.length+' import(s)</span><span id="importHistoryChevron" class="grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 text-zinc-400 transition-transform">⌄</span></span></button><div id="importHistoryBody" class="hidden border-t border-zinc-800"><div class="overflow-x-auto"><table class="min-w-full text-left text-sm"><thead><tr class="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-600"><th class="px-3 py-3">Date / heure</th><th class="px-3 py-3">Période</th><th class="px-3 py-3">Par</th><th class="px-3 py-3">Lignes</th><th class="px-3 py-3">Créés</th><th class="px-3 py-3">Statut</th><th class="px-3 py-3"></th></tr></thead><tbody>'+rows.map(x=>'<tr class="border-b border-zinc-900 last:border-0"><td class="px-3 py-3 whitespace-nowrap text-zinc-300">'+esc(formatDateTime(x.imported_at))+'</td><td class="px-3 py-3 whitespace-nowrap text-zinc-400">'+esc(x.period_start)+' → '+esc(x.period_end)+'</td><td class="px-3 py-3 text-zinc-400">'+esc(x.imported_by_name||x.imported_by||'—')+'</td><td class="px-3 py-3 text-zinc-300">'+Number(x.imported_count||0)+'</td><td class="px-3 py-3 text-zinc-400">'+Number(x.created_count||0)+'</td><td class="px-3 py-3"><span class="rounded-full border border-emerald-900/60 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-400">'+esc(x.status||'completed')+'</span></td><td class="px-3 py-3 text-right"><button class="quota-btn secondary text-xs" data-import-id="'+Number(x.id)+'" data-import-period="'+esc(x.period_start)+'|'+esc(x.period_end)+'">Restaurer</button></td></tr>').join('')+'</tbody></table></div></div></section>';
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
 document.querySelectorAll('[data-import-id]').forEach(btn=>btn.onclick=async()=>{
  const id=Number(btn.dataset.importId);if(!id)return;
  const original=btn.textContent;btn.disabled=true;btn.textContent='Restauration…';
  try{
    const r=await api('/api/employee/quotas/imports/'+id+'/activate',{method:'POST'});
    const start=r.import?.period_start,end=r.import?.period_end;
    if(!start||!end)throw Error('Période restaurée introuvable.');
    await load(start,end);
  }catch(e){window.LSUI?.toast(e.message||'Impossible de restaurer cette sauvegarde.','error','Restauration');}
  finally{btn.disabled=false;btn.textContent=original}
});
 $('#copyPodium').onclick=async()=>{try{await navigator.clipboard.writeText(iframeCode);$('#copyPodium').textContent='✓ Iframe copié';setTimeout(()=>$('#copyPodium').textContent='Copier l\'iframe',1800)}catch{window.LSUI?.toast('Impossible de copier automatiquement. Utilise le code affiché ci-dessous.','error','Copie')}};
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
     window.LSUI?.toast('Impossible de convertir le podium en image. Vérifie que le widget est chargé puis réessaie.','error','Conversion');
     btn.textContent='🖼️ Convertir en image';
   }finally{btn.disabled=false}
 };
}
function openImport(){
 document.querySelector('#quotaModal')?.remove();
 document.body.insertAdjacentHTML('beforeend',modal());

 const root=$('#quotaModal');
 const form=$('#importFormState'),loading=$('#importLoadingState'),success=$('#importSuccessState');
 const startInput=$('#importStart'),endInput=$('#importEnd'),rawInput=$('#importRaw');
 const send=$('#sendQuota'),closeBtn=$('#closeQuota'),cancel=$('#cancelQuota'),finish=$('#finishQuota');
 const [s,e]=localDate();
 startInput.value=state.start||s;
 endInput.value=state.end||e;
 rawInput.focus();

 const close=()=>{
   if(send?.disabled)return;
   root?.classList.add('is-closing');
   setTimeout(()=>root?.remove(),150);
 };
 const setStep=n=>{
   root?.querySelectorAll('.quota-import-step').forEach(step=>{
     const value=Number(step.dataset.step);
     step.classList.toggle('is-active',value===n);
     step.classList.toggle('is-done',value<n);
   });
   root?.querySelectorAll('.quota-import-steps>i').forEach((line,index)=>line.classList.toggle('is-done',index<n-1));
 };
 const setCheck=(id,done)=>{const el=$(id);if(el){el.textContent=(done?'✓ ':'○ ')+el.textContent.replace(/^[✓○]\s*/,'');el.classList.toggle('is-done',done)}};
 const updateCount=()=>{
   const count=rawInput.value.length;
   const el=$('#importCharCount');
   if(el)el.textContent=count.toLocaleString('fr-FR')+' caractère'+(count>1?'s':'');
   rawInput.classList.toggle('is-ready',count>=20);
 };
 const onKey=e=>{
   if(e.key==='Escape'&&!send.disabled)close();
 };
 rawInput.addEventListener('input',updateCount);
 document.addEventListener('keydown',onKey);
 closeBtn.onclick=close;
 cancel.onclick=close;
 finish.onclick=()=>{document.removeEventListener('keydown',onKey);root?.remove()};
 root.addEventListener('click',e=>{if(e.target===root&&!send.disabled)close()});\n window.requestAnimationFrame(()=>root?.classList.add('is-ready'));
 updateCount();

 send.onclick=async()=>{
   const err=$('#importError');
   const periodStart=startInput.value,periodEnd=endInput.value,raw=rawInput.value.trim();
   err.textContent='';
   if(!periodStart||!periodEnd||periodStart>periodEnd){
     err.textContent='La période sélectionnée est invalide. Vérifie les deux dates.';
     startInput.focus();return;
   }
   if(raw.length<20){
     err.textContent='Le relevé est trop court. Colle le relevé complet avant de continuer.';
     rawInput.focus();return;
   }

   send.disabled=true;
   setStep(2);
   form.classList.add('hidden');
   loading.classList.remove('hidden');
   $('#importProgressTitle').textContent='Analyse du relevé…';
   $('#importProgress').textContent='Lecture des interventions et vérification des données.';
   $('#importProgressBar').style.width='28%';
   setCheck('importCheckParse',true);

   try{
     await new Promise(resolve=>setTimeout(resolve,250));
     $('#importProgress').textContent='Validation de la période et des informations reçues.';
     $('#importProgressBar').style.width='55%';
     setCheck('importCheckValidate',true);

     const r=await api('/api/employee/quotas/import',{
       method:'POST',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({period_start:periodStart,period_end:periodEnd,text:raw})
     });

     setStep(3);
     $('#importProgressTitle').textContent='Enregistrement terminé';
     $('#importProgress').textContent='Écriture de l’import et de son horodatage dans la base.';
     $('#importProgressBar').style.width='100%';
     setCheck('importCheckSave',true);
     await new Promise(resolve=>setTimeout(resolve,350));

     loading.classList.add('hidden');
     success.classList.remove('hidden');
     $('#importSuccessCount').textContent=Number(r.count||0).toLocaleString('fr-FR');
     $('#importSuccessDate').textContent=formatDateTime(r.import?.imported_at||new Date().toISOString());
     $('#importSuccessText').textContent='La période '+periodStart+' → '+periodEnd+' est maintenant disponible dans l’historique RH.';
     finish.focus();

     await load(periodStart,periodEnd);
     toast(Number(r.count||0)+' ligne(s) importée(s) · import enregistré avec succès.','success','Import RH');
   }catch(e){
     loading.classList.add('hidden');
     form.classList.remove('hidden');
     setStep(1);
     send.disabled=false;
     const details=Array.isArray(e.data?.errors)&&e.data.errors.length
       ?' '+e.data.errors.slice(0,5).map(x=>'Ligne '+x.line+': '+x.error).join(' · ')
       :'';
     err.textContent=(e.message||'Impossible d’enregistrer l’import.')+details;
     rawInput.focus();
   }
 };
}
async function clearQuotas(){
 const ok=confirm('⚠️ VIDER LES QUOTAS\n\nCette action supprime tous les relevés de quotas et tout l’historique des imports pour ce serveur. Les employés, rôles, comptes et réglages seront conservés.\n\nContinuer ?');
 if(!ok)return;
 const confirmation=prompt('Pour confirmer définitivement, saisis exactement : VIDER_QUOTAS');
 if(confirmation!=='VIDER_QUOTAS')return window.LSUI?.toast('Action annulée : confirmation incorrecte.','warning','Confirmation');
 const btn=$('#clearQuotaButton');
 try{
  btn.disabled=true;btn.textContent='Suppression…';
  const r=await api('/api/employee/quotas/clear',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmation})});
  btn.textContent='✓ Quotas vidés';
  await load(state.start,state.end);
  window.LSUI?.toast('Quotas vidés : '+Number(r.result?.quota_entries||0)+' relevé(s) et '+Number(r.result?.quota_imports||0)+' import(s) supprimé(s).','success','Quotas');
  }catch(e){btn.disabled=false;btn.textContent='🗑 Vider les quotas';window.LSUI?.toast(e.message||'Impossible de vider les quotas.','error','Quotas');}
}

async function load(start,end){
 state.start=start;state.end=end;
 const [activity,history]=await Promise.all([api('/api/employee/activity?start='+encodeURIComponent(start)+'&end='+encodeURIComponent(end)),api('/api/employee/quotas/imports')]);
 state.rows=Array.isArray(activity.rows)?activity.rows:[];state.imports=Array.isArray(history.rows)?history.rows:[];
 render();
 const content=$('#content');if(content)content.setAttribute('aria-busy','false');
}

async function main(){
 try{
  const a=await api('/api/session/access');state.access=a.access;
  const userName=a.user.global_name||a.user.username||'Membre';
  const userRole=(a.access.roles||[]).map(x=>x.name).filter(Boolean).join(' • ')||'Employé';
  const userBox=$('#user');if(userBox)userBox.innerHTML='<span class="ls-sidebar-avatar" aria-hidden="true">'+esc(userName.slice(0,2).toUpperCase())+'</span><span class="ls-sidebar-user-copy"><strong>'+esc(userName)+'</strong><small>'+esc(userRole)+'</small></span>';
  const logout=$('#logout');
  if(logout){logout.onclick=async()=>{await api('/auth/player/logout',{method:'POST'});location.href='/connexion'}};
  if(a.access.isAdmin)$('#developerNav')?.classList.remove('hidden');
  const [fallbackStart,fallbackEnd]=localDate();
  let s=fallbackStart,e=fallbackEnd;
  try{
    const saved=JSON.parse(localStorage.getItem('lscustom.quota.activePeriod')||'null');
    if(saved?.start&&saved?.end){s=saved.start;e=saved.end;}
  }catch{}
  try{
    const active=await api('/api/employee/quotas/active');
    if(active.import?.period_start&&active.import?.period_end){s=active.import.period_start;e=active.import.period_end;}
  }catch{}
  state.start=s;state.end=e;
  setText('#periodBadge','PÉRIODE ACTIVE · '+s+' → '+e);setText('#periodBadgeHero',s+' → '+e);
  const canImport=a.access.isAdmin||a.access.permissions.includes('activity_all')||a.access.permissions.includes('all');
  const actions=$('#actions');
  if(actions){
    actions.innerHTML=canImport
      ? '<div class="flex flex-wrap gap-2"><button type="button" id="importButton" class="quota-btn" data-quota-action="import">＋ Importer les interventions</button><button type="button" id="clearQuotaButton" class="quota-btn secondary border-red-900/60 text-zinc-200" data-quota-action="clear">🗑 Vider les quotas</button></div>'
      : '';
    actions.onclick=e=>{
      const btn=e.target.closest('[data-quota-action]');
      if(!btn)return;
      e.preventDefault();
      if(btn.dataset.quotaAction==='import')openImport();
      if(btn.dataset.quotaAction==='clear')clearQuotas();
    };
  }
  await load(s,e);
 }catch(e){const content=$('#content');if(content){content.setAttribute('aria-busy','false');content.innerHTML='<div class="ui-error"><b>Impossible de charger l’activité.</b><br><span>'+esc(e.message||'Erreur inconnue')+'</span><button type="button" class="quota-btn secondary" id="retryActivity">Réessayer</button></div>'}$('#retryActivity')?.addEventListener('click',()=>location.reload());}
}
main();