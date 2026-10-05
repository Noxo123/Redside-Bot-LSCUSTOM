(()=>{const path=location.pathname;const publicPage=['/connexion','/','/podium'].includes(path)||path.startsWith('/recrutement/');if(publicPage)return;
const api=async(u,o)=>{const r=await fetch(u,{credentials:'same-origin',cache:'no-store',...o,headers:{'Cache-Control':'no-cache',...(o?.headers||{})}});const d=await r.json().catch(()=>({}));if((r.status===401||r.status===403)&&location.pathname!=='/connexion'){location.replace('/connexion');throw Error('Session expirée');}if(!r.ok)throw Error(d.error||'Erreur');return d};
const svg=(d)=>'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="'+d+'"></path></svg>';
const links=[['/dashboard',svg('M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z'),'LS CUSTOM — Tableau de bord'],
 ['/pilotage',svg('M4 19V5h16v14H4Zm3-3h2v-5H7v5Zm4 0h2V7h-2v9Zm4 0h2v-7h-2v7Z'),'LS CUSTOM — Pilotage'],
 ['/equipe',svg('M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20m6-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm5-1a3 3 0 1 0 0-6m4 11v-1.5a4 4 0 0 0-2.5-3.7'),'LS CUSTOM — Équipe'],
 ['/activite',svg('M4 19V5m0 14h16M8 16v-5m4 5V7m4 9v-3'),'LS CUSTOM — Activité & quotas'],
 ['/agenda',svg('M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 8h3m-3 4h6'),'LS CUSTOM — Agenda RH'],
 ['/annonces',svg('M4 5h16v12H8l-4 4V5Zm4 4h8m-8 4h5'),'LS CUSTOM — Annonces'],
 ['/messagerie',svg('M4 5h16v12H8l-4 4V5Zm3 4h10m-10 3h7'),'LS CUSTOM — Messagerie'],
 ['/partenariats',svg('M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1m3.1 5a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1'),'LS CUSTOM — Partenariats'],
 ['/developpeur',svg('M9 3h6l1 3 3 1v6l-3 1-1 3H9l-1-3-3-1V7l3-1 1-3Zm3 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'),'LS CUSTOM — Développeur']];
const perms={'/equipe':'team','/partenariats':'partnerships','/developpeur':'developer'};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function shell(access,user){
 document.body.classList.add('ls-motion-ready');
 const root=document.querySelector('body > .ls-shell')||document.querySelector('body > div.min-h-screen')||document.querySelector('body > div');if(!root)return;const oldAsides=[...root.children].filter(e=>e.tagName==='ASIDE');
 root.classList.add('ls-shell');
 /* Force the shared application shell to be a real desktop 2-column layout.
    Some page-local CSS rules are loaded after the theme, so use inline !important styles here. */
 root.style.setProperty('display','grid','important');
 root.style.setProperty('grid-template-columns','270px minmax(0,1fr)','important');
 root.style.setProperty('grid-template-rows','1fr','important');
 root.style.setProperty('align-items','stretch','important');
 root.style.setProperty('width','100%','important');
 root.style.setProperty('min-height','100vh','important');
 oldAsides.forEach(e=>e.remove());document.querySelectorAll('.ls-app-sidebar,body > div > aside').forEach(e=>e.remove());
 const sidebar=document.createElement('aside');sidebar.className='ls-app-sidebar';sidebar.style.setProperty('display',window.matchMedia('(max-width:900px)').matches?'none':'flex','important');sidebar.style.setProperty('grid-column','1','important');sidebar.style.setProperty('grid-row','1','important');sidebar.style.setProperty('height',window.matchMedia('(max-width:900px)').matches?'0':'100vh','important');sidebar.setAttribute('aria-label','Navigation principale');sidebar.innerHTML='<div class="ls-sidebar-inner"><div class="ls-sidebar-brand"><div class="ls-sidebar-logo">LS</div><div><strong>LS CUSTOM</strong><small>Centre de gestion</small></div><span class="ls-sidebar-status"><i></i> EN LIGNE</span></div><div class="ls-sidebar-section-label">ESPACE DE TRAVAIL</div><nav class="ls-sidebar-nav">'+links.map(([href,icon,label])=>{const p=perms[href],limited=!access?.isAdmin&&(!access?.permissions||access.permissions.length===0);if(limited&&href==='/messagerie')return '';if(p==='developer'&&!access?.isAdmin)return '';if(p&&p!=='developer'&&!access?.isAdmin&&!access?.permissions?.includes(p)&&!access?.permissions?.includes('all'))return '';return '<a href="'+href+'" class="'+(path===href?'is-active':'')+'"><span class="dock-icon">'+icon+'</span><span class="ls-nav-label">'+esc(label)+'</span>'+(path===href?'<b class="ls-nav-active-dot"></b>':'')+'</a>'}).join('')+'</nav><div class="ls-sidebar-spacer"></div><div class="ls-sidebar-section-label">SESSION</div><div class="ls-sidebar-user"><div class="ls-sidebar-avatar">'+esc((user.global_name||user.display_name||user.username||'U').slice(0,1).toUpperCase())+'</div><div class="ls-sidebar-user-copy"><strong>'+esc(user.global_name||user.display_name||user.username||'Utilisateur')+'</strong><small>'+esc((access.roles||[]).map(r=>r.name||r.key).filter(Boolean).join(' · ')||'Membre LS Custom')+'</small></div><span class="ls-sidebar-user-dot"></span></div></div>';
root.insertBefore(sidebar,root.querySelector(':scope > main'));
const mobileLinks=links.map(([href,icon,label])=>{const p=perms[href],limited=!access?.isAdmin&&(!access?.permissions||access.permissions.length===0);if(limited&&href==='/messagerie')return '';if(p==='developer'&&!access?.isAdmin)return '';if(p&&p!=='developer'&&!access?.isAdmin&&!access?.permissions?.includes(p)&&!access?.permissions?.includes('all'))return '';return {href,icon,label,active:path===href}}).filter(Boolean);
 const dock=document.createElement('nav');dock.className='ls-mobile-dock';dock.style.setProperty('display',window.matchMedia('(max-width:900px)').matches?'grid':'none','important');dock.setAttribute('aria-label','Navigation mobile');
 const primary=mobileLinks.slice(0,3);
 dock.innerHTML=primary.map(x=>'<a href="'+x.href+'" class="'+(x.active?'is-active':'')+'"><span class="dock-icon">'+x.icon+'</span><span>'+esc(x.label)+'</span></a>').join('')+'<button type="button" id="lsMobileMore" aria-label="Ouvrir le menu"><span class="dock-icon">☰</span><span>Menu</span></button>';
 document.body.appendChild(dock);
 const sheet=document.createElement('div');sheet.className='ls-mobile-menu';sheet.innerHTML='<div class="ls-mobile-menu-panel"><div class="ls-mobile-menu-handle"></div><div class="ls-mobile-menu-title">Navigation LS CUSTOM</div><div class="ls-mobile-menu-grid">'+mobileLinks.map(x=>'<a href="'+x.href+'" class="'+(x.active?'is-active':'')+'"><span class="dock-icon">'+x.icon+'</span><span>'+esc(x.label)+'</span></a>').join('')+'</div></div>';
 document.body.appendChild(sheet);
 const more=dock.querySelector('#lsMobileMore');const closeMobile=()=>sheet.classList.remove('is-open');more.onclick=()=>sheet.classList.toggle('is-open');sheet.addEventListener('click',e=>{if(e.target===sheet)closeMobile()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobile()});
 const main=root.querySelector(':scope > main');if(!main)return;
 main.style.setProperty('grid-column',window.matchMedia('(max-width:900px)').matches?'1':'2','important');
 main.style.setProperty('grid-row','1','important');
 main.style.setProperty('min-width','0','important');
 main.style.setProperty('width','auto','important');
 main.style.setProperty('margin','0','important');
 main.style.setProperty('padding',window.matchMedia('(max-width:900px)').matches?'0 14px 100px':'0 40px 70px','important');
 main.style.setProperty('display','block','important');
 main.querySelector(':scope > .ls-topbar')?.remove();
  const avatar=user.avatar_url||user.avatar||'',name=user.global_name||user.display_name||user.username||'Utilisateur',role=(access.roles||[]).map(r=>r.name||r.key).filter(Boolean).join(' · ')||'Membre LS Custom';
 const top=document.createElement('div');top.className='ls-topbar';
 top.innerHTML='<div class="ls-context"><span class="ls-server-state"><i></i><b>EN LIGNE</b></span><span class="ls-context-page">'+esc(document.title.replace('LS CUSTOM — ','').replace('LS CUSTOM • ',''))+'</span><span class="ls-context-clock" id="lsClock">--:--</span></div><div class="ls-profile-wrap"><button class="ls-profile-trigger" id="profileTrigger" type="button" aria-expanded="false" aria-label="Profil utilisateur">'+(avatar?'<img src="'+esc(avatar)+'" alt="">':'<span>'+esc(name.slice(0,1).toUpperCase())+'</span>')+'</button><div class="ls-profile-overlay" id="profileOverlay" hidden><div class="ls-profile-menu" id="profileMenu" role="dialog" aria-modal="true"><div class="ls-profile-head">'+(avatar?'<img class="ls-profile-photo" src="'+esc(avatar)+'" alt="">':'<div class="ls-profile-photo ls-profile-fallback">'+esc(name.slice(0,1).toUpperCase())+'</div>')+'<div><strong>'+esc(name)+'</strong><small>'+esc(user.username||'')+'</small></div></div><div class="ls-profile-details"><div><span>Nom / prénom</span><b>'+esc(name)+'</b></div><div><span>Rôle</span><b>'+esc(role)+'</b></div><div><span>Discord</span><b>'+esc(user.username||'—')+'</b></div></div><button class="ls-profile-logout" id="profileLogout" type="button">Déconnexion</button></div></div>';
 main.prepend(top);
 if(window.__LS_IMPERSONATION){const bar=document.createElement('div');bar.className='ls-impersonation-bar';bar.innerHTML='<span>🛡️ <b>Session développeur sécurisée</b> · profil simulé <strong>'+esc(user.global_name||user.username||'utilisateur')+'</strong><small style="display:block;opacity:.72;margin-top:2px">Tu es entré depuis le Centre de contrôle développeur. Aucun compte Discord utilisateur n’est utilisé.</small></span><button type="button" id="stopImpersonation">↩ Revenir à mon compte</button>';document.body.appendChild(bar);bar.querySelector('#stopImpersonation').onclick=async()=>{const b=bar.querySelector('#stopImpersonation');b.disabled=true;b.textContent='Restauration…';try{const r=await fetch('/api/developer/impersonation/stop',{method:'POST',credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Impossible de restaurer la session.');location.href=d.redirect||'/developpeur'}catch(e){b.disabled=false;b.textContent='↩ Revenir à mon compte';alert(e.message)}}}
const clock=top.querySelector('#lsClock');const tick=()=>{if(clock)clock.textContent=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})};tick();setInterval(tick,30000);document.querySelectorAll('a[href^="/"]:not([target="_blank"])').forEach(a=>a.addEventListener('click',()=>{const p=document.querySelector('.ls-page-progress');if(p){p.style.opacity='1';p.style.width='35%'}}));
 const trigger=top.querySelector('#profileTrigger'),overlay=top.querySelector('#profileOverlay'),menu=top.querySelector('#profileMenu');
 const close=()=>{if(overlay.hasAttribute('hidden'))return;overlay.classList.remove('is-open');trigger.setAttribute('aria-expanded','false');setTimeout(()=>{if(!overlay.classList.contains('is-open'))overlay.setAttribute('hidden','')},170)};
 const open=()=>{overlay.removeAttribute('hidden');requestAnimationFrame(()=>overlay.classList.add('is-open'));trigger.setAttribute('aria-expanded','true')};
 trigger.onclick=()=>{overlay.hasAttribute('hidden')?open():close()};
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hasAttribute('hidden'))close()});
 const logout=()=>{if(window.__LS_IMPERSONATION)return fetch('/api/developer/impersonation/stop',{method:'POST',credentials:'same-origin'}).then(()=>location.href='/developpeur');return api('/auth/player/logout',{method:'POST'}).finally(()=>location.href='/connexion')};top.querySelector('#profileLogout').onclick=logout;
}
async function init(){try{const r=await api('/api/session/access');window.__LS_ACCESS=r.access;window.__LS_IMPERSONATION=r.impersonation||null;shell(r.access,r.user||{});document.documentElement.classList.add('ls-ready')}catch(e){if(path!=='/connexion')location.href='/connexion'}}init()})();
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
