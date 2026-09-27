(()=>{const path=location.pathname;const publicPage=['/connexion','/','/podium'].includes(path)||path.startsWith('/recrutement/');if(publicPage)return;
const api=(u,o)=>fetch(u,o).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur');return d});
const links=[['/dashboard','⌂','Tableau de bord'],['/equipe','♙','Équipe'],['/activite','▦','Activité & quotas'],['/agenda','□','Agenda RH'],['/partenariats','◇','Partenariats'],['/developpeur','⚙','Développeur']];
const perms={'/equipe':'team','/partenariats':'partnerships','/developpeur':'developer'};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function shell(access,user){
 const oldAside=document.querySelector('body > div > aside'),root=oldAside?.parentElement;if(!root)return;
 root.classList.add('ls-shell');oldAside?.remove();
 const aside=document.createElement('aside');aside.className='ls-app-sidebar';
 aside.innerHTML='<div class="ls-sidebar-inner"><div class="ls-brand-block"><div class="ls-logo-mark">LS</div><div><div class="ls-brand">LS CUSTOM</div><div class="ls-subbrand">REDSIDE RP · MANAGEMENT</div></div></div><nav class="ls-sidebar-nav">'+links.map(([href,icon,label])=>{const p=perms[href];if(p==='developer'&&!access?.isAdmin)return '';if(p&&p!=='developer'&&!access?.isAdmin&&!access?.permissions?.includes(p)&&!access?.permissions?.includes('all'))return '';return '<a href="'+href+'" class="'+(path===href?'is-active':'')+'"><span class="nav-icon">'+icon+'</span><span>'+label+'</span></a>'}).join('')+'</nav><button id="logout" type="button">Déconnexion</button></div>';
 root.prepend(aside);
 const main=root.querySelector(':scope > main');if(!main)return;
 main.querySelector(':scope > .ls-topbar')?.remove();
 const avatar=user.avatar_url||user.avatar||'',name=user.global_name||user.display_name||user.username||'Utilisateur',role=(access.roles||[]).map(r=>r.name||r.key).filter(Boolean).join(' · ')||'Membre LS Custom';
 const top=document.createElement('div');top.className='ls-topbar';
 top.innerHTML='<div></div><div class="ls-profile-wrap"><button class="ls-profile-trigger" id="profileTrigger" type="button" aria-expanded="false" aria-label="Profil utilisateur">'+(avatar?'<img src="'+esc(avatar)+'" alt="">':'<span>'+esc(name.slice(0,1).toUpperCase())+'</span>')+'</button><div class="ls-profile-overlay" id="profileOverlay" hidden><div class="ls-profile-menu" id="profileMenu" role="dialog" aria-modal="true"><div class="ls-profile-head">'+(avatar?'<img class="ls-profile-photo" src="'+esc(avatar)+'" alt="">':'<div class="ls-profile-photo ls-profile-fallback">'+esc(name.slice(0,1).toUpperCase())+'</div>')+'<div><strong>'+esc(name)+'</strong><small>'+esc(user.username||'')+'</small></div></div><div class="ls-profile-details"><div><span>Nom / prénom</span><b>'+esc(name)+'</b></div><div><span>Rôle</span><b>'+esc(role)+'</b></div><div><span>Discord</span><b>'+esc(user.username||'—')+'</b></div></div><button class="ls-profile-logout" id="profileLogout" type="button">Déconnexion</button></div></div>';
 main.prepend(top);
 const trigger=top.querySelector('#profileTrigger'),overlay=top.querySelector('#profileOverlay'),menu=top.querySelector('#profileMenu');
 const close=()=>{if(overlay.hasAttribute('hidden'))return;overlay.classList.remove('is-open');trigger.setAttribute('aria-expanded','false');setTimeout(()=>{if(!overlay.classList.contains('is-open'))overlay.setAttribute('hidden','')},170)};
 const open=()=>{overlay.removeAttribute('hidden');requestAnimationFrame(()=>overlay.classList.add('is-open'));trigger.setAttribute('aria-expanded','true')};
 trigger.onclick=()=>{overlay.hasAttribute('hidden')?open():close()};
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hasAttribute('hidden'))close()});
 const logout=()=>api('/auth/player/logout',{method:'POST'}).finally(()=>location.href='/connexion');top.querySelector('#profileLogout').onclick=logout;
}
async function init(){try{const r=await api('/api/session/access');window.__LS_ACCESS=r.access;shell(r.access,r.user||{});document.documentElement.classList.add('ls-ready')}catch(e){if(path!=='/connexion')location.href='/connexion'}}init()})();
/* Global LS CUSTOM UX enhancements */
window.LSUI=window.LSUI||{};
window.LSUI.toast=(message,type='success',title=type==='error'?'Erreur':'LS CUSTOM')=>{
 let stack=document.querySelector('.ls-toast-stack');
 if(!stack){stack=document.createElement('div');stack.className='ls-toast-stack';document.body.appendChild(stack)}
 const el=document.createElement('div');el.className='ls-toast '+type;
 el.innerHTML='<div><b>'+esc(title)+'</b><span>'+esc(message)+'</span></div><button class="ls-toast-close" type="button">×</button>';
 el.querySelector('button').onclick=()=>el.remove();stack.appendChild(el);
 setTimeout(()=>{if(el.isConnected)el.remove()},4200);
};
function enhance(){
 if(!document.querySelector('.ls-page-progress')){const p=document.createElement('div');p.className='ls-page-progress';document.body.appendChild(p);requestAnimationFrame(()=>p.style.width='100%');setTimeout(()=>{p.style.opacity='0'},450)}
 document.querySelectorAll('button:not([data-ls-enhanced]),a:not([data-ls-enhanced])').forEach(el=>{
   el.dataset.lsEnhanced='1';
   if(el.tagName==='BUTTON'&&el.type==='submit')el.addEventListener('click',()=>{if(!el.disabled&&!el.dataset.keepText){el.dataset.originalText=el.innerHTML;setTimeout(()=>{if(el.disabled)el.innerHTML='Chargement…'},30)}});
 });
 document.querySelectorAll('input,textarea,select').forEach(el=>{
   if(el.dataset.lsField)return;el.dataset.lsField='1';
   el.addEventListener('input',()=>el.classList.toggle('has-value',!!el.value));
 });
}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(enhance,50);new MutationObserver(()=>enhance()).observe(document.body,{childList:true,subtree:true})});
