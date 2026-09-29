const api=(u,o)=>fetch(u,o).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur');return d});
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const labels={conges:'Congés',maladie:'Maladie',etudes:'Études',personnel:'Personnel',indisponible:'Indisponible',autre:'Autre'};
const icons={conges:'☀',maladie:'✚',etudes:'◆',personnel:'●',indisponible:'—',autre:'•'};
let state={rows:[],canManage:false,filter:'all',month:''};
function dateLabel(s){if(!s)return'—';return new Date(s+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}
function status(a){const today=new Date().toISOString().slice(0,10);if(a.end_date<today)return'past';if(a.start_date>today)return'upcoming';return'current'}
function render(){
 const rows=state.rows.filter(a=>state.filter==='all'||a.type===state.filter).filter(a=>!state.month||a.start_date.startsWith(state.month));
 const today=new Date().toISOString().slice(0,10);
 const active=state.rows.filter(a=>a.start_date<=today&&a.end_date>=today).length;
 const upcoming=state.rows.filter(a=>a.start_date>today).length;
 $('#stats').innerHTML='<div><span>En cours</span><b>'+active+'</b></div><div><span>À venir</span><b>'+upcoming+'</b></div><div><span>Total affiché</span><b>'+rows.length+'</b></div>';
 $('#calendar').innerHTML=rows.length?rows.map(a=>{
  const st=status(a), canDelete=state.canManage||a.user_id===window.__meId;
  return '<article class="absence-card '+st+'"><div class="absence-calendar"><strong>'+esc(new Date(a.start_date+'T12:00:00').getDate())+'</strong><span>'+esc(new Date(a.start_date+'T12:00:00').toLocaleDateString('fr-FR',{month:'short'}).toUpperCase())+'</span></div><div class="absence-main"><div class="absence-top"><div><span class="absence-badge">'+esc(icons[a.type]||'•')+' '+esc(labels[a.type]||a.type||'Absence')+'</span><h3>'+esc(a.username||'Employé')+'</h3></div><span class="absence-status '+st+'">'+(st==='current'?'EN COURS':st==='upcoming'?'À VENIR':'TERMINÉE')+'</span></div><div class="absence-period">'+esc(dateLabel(a.start_date))+' <b>→</b> '+esc(dateLabel(a.end_date))+'</div><p>'+esc(a.reason||'Aucun motif renseigné')+'</p></div>'+(canDelete?'<button class="absence-delete" data-id="'+a.id+'" title="'+(state.canManage?'Supprimer cette absence':'Supprimer ma propre absence')+'">×</button>':'')+'</article>'
 }).join(''):'<div class="agenda-empty"><div class="empty-icon">✓</div><strong>Aucune absence</strong><span>Aucune absence ne correspond aux filtres sélectionnés.</span></div>';
 document.querySelectorAll('.absence-delete').forEach(btn=>btn.onclick=()=>remove(btn.dataset.id));
}
function setLoading(active=true,message='Chargement de l’agenda RH…'){
 const calendar=$('#calendar'),stats=$('#stats');
 if(!calendar||!stats)return;
 if(active){
  stats.innerHTML='<div class="agenda-skeleton agenda-skeleton-stat"></div><div class="agenda-skeleton agenda-skeleton-stat"></div><div class="agenda-skeleton agenda-skeleton-stat"></div>';
  calendar.innerHTML='<div class="agenda-loading-state"><div class="agenda-spinner"></div><strong>'+esc(message)+'</strong><span>Récupération des absences et des droits.</span></div>';
 }
}
async function load(){
 setLoading(true);
 try{
  const r=await api('/api/employee/agenda');state.rows=Array.isArray(r)?r:(r.rows||[]);state.canManage=Boolean(r.canManage);window.__meId=window.__meId||'';
  const me=await api('/api/employee/me').catch(()=>({user:{}}));window.__meId=me.user?.id||'';
  render();const period=$('#period');if(period)period.textContent='Mis à jour à '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
 }catch(e){const calendar=$('#calendar');if(calendar)calendar.innerHTML='<div class="agenda-empty"><div class="empty-icon">!</div><strong>Impossible de charger l’agenda</strong><span>'+esc(e.message)+'</span><button class="agenda-btn" type="button" onclick="load()">Réessayer</button></div>'}
}
async function remove(id){
 const mine=state.rows.find(a=>String(a.id)===String(id));if(!mine)return;
 if(!confirm((state.canManage?'Supprimer cette absence de l’agenda RH ?':'Supprimer votre absence ?')+'\n\n'+mine.username+' · '+dateLabel(mine.start_date)+' → '+dateLabel(mine.end_date)))return;
 try{await api('/api/employee/absences/'+encodeURIComponent(id),{method:'DELETE'});await load()}catch(e){alert(e.message)}
}
$('#absenceForm').onsubmit=async e=>{
 e.preventDefault();const formError=$('#formError'),submit=e.target.querySelector('.agenda-submit');if(formError)formError.textContent='';if(submit){submit.classList.add('is-loading');submit.textContent='Enregistrement…';}
 const fd=Object.fromEntries(new FormData(e.target));
 try{await api('/api/employee/absences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fd)});e.target.reset();await load();document.querySelector('.agenda-side').classList.add('saved');setTimeout(()=>document.querySelector('.agenda-side').classList.remove('saved'),900)}catch(x){if(formError)formError.textContent=x.message}finally{if(submit){submit.classList.remove('is-loading');submit.textContent='Enregistrer mon absence'}}
};
$('#newAbsence').onclick=()=>document.querySelector('.agenda-side').scrollIntoView({behavior:'smooth',block:'center'});
$('#filter').onchange=e=>{state.filter=e.target.value;render()};
$('#month').onchange=e=>{state.month=e.target.value;render()};
$('#clearFilters').onclick=()=>{state.filter='all';state.month='';$('#filter').value='all';$('#month').value='';render()};
load();