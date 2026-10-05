const api=(u,o)=>fetch(u,o).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur');return d});
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const app=document.querySelector('#app');let state=null;let timer=null;

function login(){
  if(!app)return;
  app.innerHTML='<div class="login"><div class="eyebrow">LS CUSTOM · ESPACE PARTENAIRE</div><h1>Votre espace partenariat</h1><p>Accédez à votre partenariat et échangez directement avec l’équipe LS CUSTOM depuis votre ticket Discord.</p><a class="btn gold" href="/auth/partnership/login'+location.search+'">Continuer avec Discord</a></div>';
}
function formatDate(v){try{return new Date(v).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'})}catch{return ''}}
function attachmentHtml(a){
 const type=String(a.contentType||'').toLowerCase(),name=esc(a.name||'Pièce jointe');
 if(type.startsWith('image/'))return '<a class="client-attachment image" href="'+esc(a.url)+'" target="_blank" rel="noreferrer"><span class="client-attachment-loader"><span></span></span><img src="'+esc(a.url)+'" alt="'+name+'" loading="lazy" onload="this.previousElementSibling.remove()"><small>Ouvrir l’image ↗</small></a>';
 if(type==='application/pdf'||/\\.pdf$/i.test(a.name||''))return '<a class="client-attachment file" href="'+esc(a.url)+'" target="_blank" rel="noreferrer"><b>PDF</b><span>'+name+'</span><small>Ouvrir ↗</small></a>';
 return '<a class="client-attachment file" href="'+esc(a.url)+'" target="_blank" rel="noreferrer"><b>FILE</b><span>'+name+'</span><small>Ouvrir ↗</small></a>';
}
function proposalMessageHtml(m){
 const p=m.proposal||{},status=p.status||'proposed';
 const actions=status==='proposed'?'<div class="proposal-actions"><button class="btn gold" id="acceptProposal">✓ Accepter la proposition</button><button class="btn danger" id="declineProposal">Refuser</button></div><div id="decisionError" class="send-error" hidden></div>':status==='client_accepted'?'<div class="proposal-confirmed"><b>✓ Proposition acceptée</b><span>Votre accord est enregistré. LS CUSTOM doit maintenant confirmer définitivement le partenariat.</span></div>':status==='accepted'?'<div class="proposal-confirmed"><b>✓ Accord finalisé</b><span>Les deux parties ont accepté la proposition. Le partenariat est actif.</span></div>':'<div class="proposal-confirmed declined"><b>Proposition refusée</b><span>Une nouvelle proposition pourra vous être envoyée par LS CUSTOM.</span></div>';
 return '<div class="msg proposal-msg"><div class="avatar-fallback">LS</div><div class="proposal-chat"><div class="proposal-badge">'+(status==='proposed'?'À VOTRE ATTENTION':status==='client_accepted'?'EN ATTENTE DE LS CUSTOM':status==='accepted'?'✓ PARTENARIAT FINALISÉ':'PROPOSITION REFUSÉE')+'</div><h3>Proposition de partenariat</h3><p>Une offre préparée spécialement pour votre entreprise par LS CUSTOM.</p><strong class="proposal-chat-price">'+(p.price!=null?Number(p.price).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'—')+'</strong><div class="proposal-chat-period"><span>PÉRIODE</span><b>'+esc(p.start_date||'—')+' → '+esc(p.end_date||'—')+'</b></div><div class="proposal-chat-offer"><span>OFFRE & CONDITIONS</span><p>'+esc(p.offer||'Aucune condition renseignée.')+'</p></div>'+actions+'</div></div>';
}
function renderMessages(d){
 const box=document.querySelector('#messages');if(!box)return;
 const current=box.scrollHeight-box.scrollTop-box.clientHeight<80;
 box.innerHTML=d.messages?.length?d.messages.map(m=>m.proposal?proposalMessageHtml(m):'<div class="msg '+(d.user&&m.author===d.user.global_name?'mine':'')+'">'+(m.avatar?'<img src="'+esc(m.avatar)+'">':'<div class="avatar-fallback">LS</div>')+'<div><div class="who">'+esc(m.author)+'<time>'+formatDate(m.createdAt)+'</time></div>'+(m.content?'<div class="text">'+esc(m.content)+'</div>':'')+((m.attachments||[]).length?'<div class="client-attachments">'+m.attachments.map(attachmentHtml).join('')+'</div>':'')+'</div></div>').join(''):'<div class="muted">Aucun échange pour le moment. Vous pouvez envoyer le premier message.</div>';
 if(current)box.scrollTop=box.scrollHeight;
}
function proposalPanel(d){
 const p=d.partnership;
 if(!p.proposal_status||p.proposal_status==='pending')return '<section class="proposal-card proposal-prep"><div class="proposal-badge">PARTENARIAT</div><div><h2>Une proposition arrive</h2><p>LS CUSTOM prépare actuellement les conditions de votre partenariat.</p></div></section>';
 const status=p.proposal_status;
 const statusLabel=status==='proposed'?'À VOTRE ATTENTION':status==='client_accepted'?'EN ATTENTE DE LS CUSTOM':'PROPOSITION REFUSÉE';
 const statusClass=status==='proposed'?'waiting':status==='client_accepted'?'accepted':'declined';
 return '<section class="proposal-card '+statusClass+'"><div class="proposal-top"><div><div class="proposal-badge">'+statusLabel+'</div><h2>Proposition de partenariat</h2><p>Une offre préparée spécialement pour votre entreprise par LS CUSTOM.</p></div><div class="proposal-price">'+(p.price!=null?Number(p.price).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'—')+'</div></div><div class="proposal-details"><div><span>PÉRIODE</span><b>'+esc(p.start_date||'—')+' → '+esc(p.end_date||'—')+'</b></div><div class="proposal-offer"><span>OFFRE & CONDITIONS</span><p>'+esc(p.offer||'Aucune condition renseignée.')+'</p></div></div>'+(status==='proposed'?'<div class="proposal-actions"><button class="btn gold" id="acceptProposal">✓ Accepter la proposition</button><button class="btn danger" id="declineProposal">Refuser</button></div><div class="proposal-note">Vous pourrez ensuite attendre la validation finale de LS CUSTOM.</div><div id="decisionError" class="send-error" hidden></div>':status==='client_accepted'?'<div class="proposal-confirmed"><b>✓ Proposition acceptée</b><span>Votre accord est enregistré. LS CUSTOM doit maintenant confirmer définitivement le partenariat.</span></div>':status==='accepted'?'<div class="proposal-confirmed"><b>✓ Accord finalisé</b><span>Les deux parties ont accepté la proposition. Le partenariat est actif.</span></div>':'<div class="proposal-confirmed declined"><b>Proposition refusée</b><span>Une nouvelle proposition pourra vous être envoyée par LS CUSTOM.</span></div>')+'</section>';
}
function paymentPanel(d){
 const p=d.partnership;
 if(p.proposal_status!=='accepted')return '';
 const proof=p.payment_proof_path;
 const preview=proof?(String(p.payment_proof_mime||'').startsWith('image/')?'<img src="/api/client/partnership/payment-proof" alt="Preuve de paiement" class="payment-proof payment-proof-image">':'<iframe src="/api/client/partnership/payment-proof" title="Preuve de paiement" class="payment-proof payment-proof-frame"></iframe>'):'';
 return '<section class="panel"><div class="payment-head"><div><h2>💳 Paiement</h2><div class="muted payment-status">'+esc(p.payment_status==='paid'?'Paiement effectué':'Paiement en attente')+'</div></div><strong class="payment-price">'+(p.price!=null?Number(p.price).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'À définir')+'</strong></div>'
 +(proof?'<div class="payment-proof-card">'+preview+'<div class="payment-proof-meta"><span class="muted">Envoyée le '+esc(formatDate(p.payment_proof_uploaded_at))+' par '+esc(p.payment_proof_uploader_name||'—')+'</span><a class="btn" target="_blank" rel="noreferrer" href="/api/client/partnership/payment-proof">👁 Consulter la preuve</a></div></div>':'<div class="payment-proof-empty">Aucune preuve de paiement enregistrée pour le moment.</div>')
 +'</section>';
}
function render(d){
 state=d;
 const p=d.partnership,t=d.ticket;
 app.innerHTML='<div class="client-top"><div><div class="eyebrow">LS CUSTOM · PARTENARIAT</div><h1>'+esc(p.company)+'</h1><p>Conversation directe avec l’équipe LS CUSTOM · ticket synchronisé avec Discord</p></div><div class="status">'+esc(p.status==='active'?'PARTENARIAT ACTIF':String(p.status||'EN ATTENTE').toUpperCase())+'</div></div>'+
 '<div class="body"><section class="panel"><h2>Votre partenariat</h2><div class="partnership-details"><div><div class="muted">Contact</div><div class="detail-value">'+esc(p.contact||'—')+'</div></div><div><div class="muted">Période</div><div class="detail-value">'+esc(p.start_date||'—')+' → '+esc(p.end_date||'—')+'</div></div><div><div class="muted">Prix du partenariat</div><div class="detail-price">'+(p.price!=null?Number(p.price).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'À définir')+'</div></div><div><div class="muted">Offre / conditions</div><div class="detail-value detail-multiline">'+esc(p.offer||'Aucune information renseignée.')+'</div></div><div><div class="muted">Site</div><div class="detail-site">'+(p.website?'<a class="btn" target="_blank" rel="noreferrer" href="'+esc(p.website)+'">Ouvrir le site ↗</a>':'<span class="detail-empty">—</span>')+'</div></div></div></section>'+
paymentPanel(d)+'<section class="panel"><h2>Ticket Discord</h2><p class="muted ticket-subject">'+(t?esc(t.subject):'Aucun ticket associé.')+'</p><div class="ticket-actions">'+(t&&t.discord_channel_id?'<a class="btn" target="_blank" rel="noreferrer" href="https://discord.com/channels/'+encodeURIComponent(p.guild_id)+'/'+encodeURIComponent(t.discord_channel_id)+'">Ouvrir Discord ↗</a>':'')+'<button class="btn" id="logout">Se déconnecter</button></div></section>'+
 '<section class="panel conversation"><div class="conversation-head"><div><h2>Conversation</h2><div class="muted conversation-subtitle">Les messages envoyés ici arrivent directement dans votre ticket Discord.</div></div><span class="muted" id="count">'+(d.messages?.length||0)+' message(s)</span></div><div class="messages" id="messages"></div><div id="sendError" class="send-error" hidden></div><form class="composer" id="composer"><textarea id="message" maxlength="2000" placeholder="Écrire un message à l’équipe LS CUSTOM…"></textarea><button class="btn gold" type="submit">Envoyer</button></form></section></div>';
 renderMessages(d);
 const logout=document.querySelector('#logout');
 if(logout)logout.onclick=async()=>{await api('/auth/partnership/logout',{method:'POST'});location.reload()};
 document.querySelector('#acceptProposal')?.addEventListener('click',()=>decide('accept'));
 document.querySelector('#declineProposal')?.addEventListener('click',()=>decide('decline'));
 const composer=document.querySelector('#composer');
 if(composer)composer.onsubmit=async e=>{e.preventDefault();const input=document.querySelector('#message'),btn=e.currentTarget.querySelector('button'),err=document.querySelector('#sendError'),count=document.querySelector('#count');const content=input?.value.trim();if(!content||!btn)return;btn.disabled=true;if(err)err.hidden=true;try{const x=await api('/api/client/partnership/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content})});state.messages=Array.isArray(x.messages)?x.messages:[];if(input)input.value='';renderMessages(state);if(count)count.textContent=state.messages.length+' message(s)'}catch(e){if(err){err.textContent=e.message;err.hidden=false}}finally{btn.disabled=false}};
async function refresh(){try{const d=await api('/api/client/partnership');if(!state)render(d);else{state=d;renderMessages(d);const count=document.querySelector('#count');if(count)count.textContent=(d.messages?.length||0)+' message(s)'}}catch(e){if(!state&&e.message==='Lien partenaire requis.')login();else if(!state)app.innerHTML='<div class="error"><b>Accès impossible</b><div style="margin-top:7px">'+esc(e.message)+'</div></div>'}}
async function main(){await refresh();timer=setInterval(refresh,5000)}
main();