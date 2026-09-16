import express from 'express';
import session from 'express-session';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { getRecruitments, createRecruitment, getApplications, updateApplication, getSetting, setSetting, stats, audit } from './db.js';
import { publishFromDashboard } from './bot.js';

const app=express();
const uploadDir=path.resolve('data/uploads'); fs.mkdirSync(uploadDir,{recursive:true});
const upload=multer({dest:uploadDir,limits:{fileSize:8*1024*1024},fileFilter:(req,file,cb)=>cb(null,/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype))});
app.use(express.json({limit:'1mb'})); app.use(express.urlencoded({extended:true})); app.use(express.static('public'));
app.use('/uploads',express.static(uploadDir));
app.use(session({secret:process.env.SESSION_SECRET||'dev-secret',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:86400000}}));

function auth(req,res,next){ if(!req.session.user) return res.status(401).json({error:'unauthorized'}); next(); }
async function discord(pathname,options={}){ const r=await fetch(`https://discord.com/api/v10${pathname}`,options); if(!r.ok) throw new Error(`Discord API ${r.status}`); return r.json(); }
app.get('/auth/login',(req,res)=>{ const p=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,response_type:'code',redirect_uri:process.env.DISCORD_REDIRECT_URI,scope:'identify guilds'}); res.redirect('https://discord.com/oauth2/authorize?'+p); });
app.get('/auth/callback',async(req,res)=>{ try{ const body=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code:req.query.code,redirect_uri:process.env.DISCORD_REDIRECT_URI}); const token=await fetch('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body}).then(r=>r.json()); const headers={Authorization:`Bearer ${token.access_token}`}; const [user,guilds]=await Promise.all([fetch('https://discord.com/api/users/@me',{headers}).then(r=>r.json()),fetch('https://discord.com/api/users/@me/guilds',{headers}).then(r=>r.json())]); req.session.user={id:user.id,username:user.username,avatar:user.avatar}; req.session.guilds=guilds.filter(g=>(BigInt(g.permissions||0)&BigInt(0x20))!==0n); res.redirect('/'); }catch(e){res.status(500).send('OAuth Discord échoué : '+e.message);} });
app.post('/auth/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/me',auth,(req,res)=>res.json({user:req.session.user,guilds:req.session.guilds||[]}));
app.get('/api/guilds/:guildId/stats',auth,(req,res)=>res.json(stats(req.params.guildId)));
app.get('/api/guilds/:guildId/recruitments',auth,(req,res)=>res.json(getRecruitments(req.params.guildId,req.query.status||null)));
app.get('/api/guilds/:guildId/applications',auth,(req,res)=>res.json(getApplications(req.params.guildId,req.query.status||null)));
app.post('/api/guilds/:guildId/recruitments',auth,upload.single('image'),async(req,res)=>{ try{ const guildId=req.params.guildId; const allowed=(req.session.guilds||[]).some(g=>g.id===guildId); if(!allowed)return res.status(403).json({error:'forbidden'}); const r=createRecruitment({guildId,title:req.body.title,description:req.body.description,imageUrl:req.body.imageUrl,createdBy:req.session.user.id}); if(req.file) r.image_path=req.file.path; if(req.body.publish==='true') await publishFromDashboard(guildId,r); audit(guildId,req.session.user.id,'dashboard.recruitment.created',String(r.id)); res.json(r); }catch(e){res.status(500).json({error:e.message});} });
app.post('/api/guilds/:guildId/recruitments/:id/publish',auth,async(req,res)=>{try{const guildId=req.params.guildId;if(!(req.session.guilds||[]).some(g=>g.id===guildId))return res.sendStatus(403);const r=getRecruitments(guildId).find(x=>x.id===Number(req.params.id));if(!r)return res.sendStatus(404);await publishFromDashboard(guildId,r);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/guilds/:guildId/applications/:id/status',auth,(req,res)=>{const guildId=req.params.guildId;if(!(req.session.guilds||[]).some(g=>g.id===guildId))return res.sendStatus(403);const r=updateApplication(Number(req.params.id),guildId,req.body.status,req.session.user.id);audit(guildId,req.session.user.id,'application.status',`${r?.id}:${req.body.status}`);res.json(r||{});});
app.post('/api/guilds/:guildId/settings',auth,(req,res)=>{const guildId=req.params.guildId;if(!(req.session.guilds||[]).some(g=>g.id===guildId))return res.sendStatus(403);for(const [k,v] of Object.entries(req.body))setSetting(guildId,k,v);res.json({ok:true});});
app.get('/api/guilds/:guildId/settings',auth,(req,res)=>res.json({recruitment_channel:getSetting(req.params.guildId,'recruitment_channel',''),logs_channel:getSetting(req.params.guildId,'logs_channel','')}));
app.get('*',(req,res)=>res.sendFile(path.resolve('public/index.html')));
export function startDashboard(){ app.listen(Number(process.env.PORT||3000),()=>console.log(`🌐 Dashboard : ${process.env.BASE_URL||`http://localhost:${process.env.PORT||3000}`}`)); }
