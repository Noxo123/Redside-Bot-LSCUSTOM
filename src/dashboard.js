import express from 'express';
import session from 'express-session';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { getRecruitments, createRecruitment, getApplications, updateApplication, getSetting, setSetting, stats, audit } from './db.js';
import { publishFromDashboard } from './bot.js';

const app=express();
const uploadDir=path.resolve('data/uploads');
fs.mkdirSync(uploadDir,{recursive:true});
const upload=multer({
 storage:multer.diskStorage({
  destination:uploadDir,
  filename:(req,file,cb)=>cb(null,`${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
 }),
 limits:{fileSize:8*1024*1024},
 fileFilter:(req,file,cb)=>cb(null,/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype))
});

app.use(express.json({limit:'1mb'}));
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'));
app.use('/uploads',express.static(uploadDir));
app.use(session({secret:process.env.SESSION_SECRET||'dev-secret',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:86400000}}));

function auth(req,res,next){if(!req.session.user)return res.status(401).json({error:'unauthorized'});next();}
function allowed(req,id){return(req.session.guilds||[]).some(g=>g.id===id);}

app.get('/auth/login',(req,res)=>{
 const p=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,response_type:'code',redirect_uri:process.env.DISCORD_REDIRECT_URI,scope:'identify guilds'});
 res.redirect('https://discord.com/oauth2/authorize?'+p);
});

app.get('/auth/callback',async(req,res)=>{try{
 const body=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code:req.query.code,redirect_uri:process.env.DISCORD_REDIRECT_URI});
 const tokenResponse=await fetch('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
 const token=await tokenResponse.json();
 if(!tokenResponse.ok||!token.access_token)throw Error(token.error_description||'OAuth token absent');
 const headers={Authorization:`Bearer ${token.access_token}`};
 const[user,guilds]=await Promise.all([
  fetch('https://discord.com/api/users/@me',{headers}).then(r=>r.json()),
  fetch('https://discord.com/api/users/@me/guilds',{headers}).then(r=>r.json())
 ]);
 req.session.user={id:user.id,username:user.username,avatar:user.avatar};
 req.session.guilds=Array.isArray(guilds)?guilds.filter(g=>{const p=BigInt(g.permissions||0);return (p&0x20n)!==0n||(p&0x8n)!==0n;}):[];
 res.redirect('/');
}catch(e){res.status(500).send('OAuth Discord échoué : '+e.message);}});

app.post('/auth/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/me',auth,(req,res)=>res.json({user:req.session.user,guilds:req.session.guilds||[]}));

app.get('/api/guilds/:guildId/stats',auth,(req,res)=>allowed(req,req.params.guildId)?res.json(stats(req.params.guildId)):res.sendStatus(403));
app.get('/api/guilds/:guildId/recruitments',auth,(req,res)=>allowed(req,req.params.guildId)?res.json(getRecruitments(req.params.guildId,req.query.status||null)):res.sendStatus(403));
app.get('/api/guilds/:guildId/applications',auth,(req,res)=>allowed(req,req.params.guildId)?res.json(getApplications(req.params.guildId,req.query.status||null)):res.sendStatus(403));

app.post('/api/guilds/:guildId/recruitments',auth,upload.single('image'),async(req,res)=>{
 let created=false;
 try{
  const guildId=req.params.guildId;
  if(!allowed(req,guildId))return res.sendStatus(403);
  const title=String(req.body.title||'').trim();
  const description=String(req.body.description||'').trim();
  const imageUrl=String(req.body.imageUrl||'').trim();
  if(!title||!description)return res.status(400).json({error:'Titre et description obligatoires'});
  if(imageUrl && !/^https:\/\//i.test(imageUrl))return res.status(400).json({error:'L’URL image doit utiliser HTTPS'});
  const r=createRecruitment({guildId,title,description,imageUrl:imageUrl||null,imagePath:req.file?.path,createdBy:req.session.user.id});
  created=true;
  audit(guildId,req.session.user.id,'dashboard.recruitment.created',String(r.id));
  if(req.body.publish==='true'){
   try{
    await publishFromDashboard(guildId,r);
    audit(guildId,req.session.user.id,'dashboard.recruitment.published',String(r.id));
   }catch(e){
    return res.status(503).json({error:e.message,recruitment:r,published:false});
   }
  }
  return res.status(201).json({...r,published:req.body.publish==='true'});
 }catch(e){
  if(!created&&req.file)fs.rmSync(req.file.path,{force:true});
  console.error('Création recrutement:',e);
  return res.status(500).json({error:e.message||'Erreur serveur'});
 }
});

app.post('/api/guilds/:guildId/recruitments/:id/publish',auth,async(req,res)=>{try{
 const guildId=req.params.guildId;
 if(!allowed(req,guildId))return res.sendStatus(403);
 const r=getRecruitments(guildId).find(x=>x.id===Number(req.params.id));
 if(!r)return res.status(404).json({error:'Recrutement introuvable'});
 const message=await publishFromDashboard(guildId,r);
 audit(guildId,req.session.user.id,'dashboard.recruitment.published',String(r.id));
 return res.json({ok:true,messageId:message.id,recruitmentId:r.id});
}catch(e){console.error('Publication dashboard:',e);return res.status(503).json({error:e.message||'Publication Discord impossible'});}});

app.post('/api/guilds/:guildId/applications/:id/status',auth,(req,res)=>{
 const guildId=req.params.guildId;
 if(!allowed(req,guildId))return res.sendStatus(403);
 if(!['pending','accepted','rejected'].includes(req.body.status))return res.status(400).json({error:'invalid status'});
 const r=updateApplication(Number(req.params.id),guildId,req.body.status,req.session.user.id);
 if(!r)return res.status(404).json({error:'Candidature introuvable'});
 audit(guildId,req.session.user.id,'application.status',`${r.id}:${req.body.status}`);
 res.json(r);
});

app.post('/api/guilds/:guildId/settings',auth,(req,res)=>{
 const guildId=req.params.guildId;
 if(!allowed(req,guildId))return res.sendStatus(403);
 for(const[k,v]of Object.entries(req.body))if(['recruitment_channel','logs_channel'].includes(k))setSetting(guildId,k,String(v||''));
 res.json({ok:true});
});
app.get('/api/guilds/:guildId/settings',auth,(req,res)=>allowed(req,req.params.guildId)?res.json({recruitment_channel:getSetting(req.params.guildId,'recruitment_channel',''),logs_channel:getSetting(req.params.guildId,'logs_channel','')}):res.sendStatus(403));

app.get(/.*/,(req,res)=>res.sendFile(path.resolve('public/index.html')));
export function startDashboard(){app.listen(Number(process.env.PORT||3000),()=>console.log(`🌐 Dashboard : ${process.env.BASE_URL||`http://localhost:${process.env.PORT||3000}`}`));}
