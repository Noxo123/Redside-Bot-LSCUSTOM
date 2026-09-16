import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, AttachmentBuilder } from 'discord.js';
import { upsertGuild, createRecruitment, getRecruitment, setRecruitmentStatus, getApplications, getSetting, setSetting, audit } from './db.js';
import fs from 'node:fs';

export const client = new Client({ intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const commands=[
 new SlashCommandBuilder().setName('recrutement').setDescription('Gérer les recrutements').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(s=>s.setName('ouvrir').setDescription('Ouvrir un recrutement').addStringOption(o=>o.setName('titre').setDescription('Titre').setRequired(true)).addStringOption(o=>o.setName('description').setDescription('Description').setRequired(true)).addStringOption(o=>o.setName('image').setDescription('URL de l’image').setRequired(false)))
  .addSubcommand(s=>s.setName('fermer').setDescription('Fermer un recrutement').addIntegerOption(o=>o.setName('id').setDescription('ID').setRequired(true))),
 new SlashCommandBuilder().setName('config').setDescription('Configurer la liaison site/Discord').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption(o=>o.setName('recrutement-channel').setDescription('Salon de publication').setRequired(false))
  .addStringOption(o=>o.setName('logs-channel').setDescription('Salon des logs').setRequired(false))
  .addStringOption(o=>o.setName('tickets-channel').setDescription('Salon de liaison des tickets').setRequired(false)),
 new SlashCommandBuilder().setName('candidatures').setDescription('Voir les candidatures').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(x=>x.toJSON());

let readyPromise;
function waitForReady(timeout=15000){
 if(client.isReady()) return Promise.resolve();
 if(!readyPromise){
  readyPromise=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Le bot Discord est encore en cours de connexion. Réessaie dans quelques secondes.')),timeout);
   client.once('ready',()=>{clearTimeout(timer);resolve();});
  }).finally(()=>{readyPromise=null;});
 }
 return readyPromise;
}

async function fetchTextChannel(guild,id){
 if(!id)return null;
 const ch=await guild.channels.fetch(id).catch(()=>null);
 return ch?.isTextBased()?ch:null;
}

function websiteUrl(pathname=''){const base=(process.env.BASE_URL||'http://localhost:3000').replace(/\/$/,'');return `${base}${pathname}`}

async function publishRecruitment(guild,r){
 const channelId=getSetting(guild.id,'recruitment_channel');
 if(!channelId) throw new Error('Aucun salon de recrutement configuré. Utilise /config ou le dashboard.');
 const channel=await fetchTextChannel(guild,channelId);
 if(!channel) throw new Error('Le salon de recrutement configuré est introuvable ou non textuel.');
 const url=websiteUrl(`/recrutement/${r.id}`);
 const embed=new EmbedBuilder().setTitle(`📋 ${r.title}`).setDescription(`${r.description}\n\n**Candidature uniquement sur le site LS CUSTOM**\n[👉 Accéder au recrutement](${url})`).setColor(0xf5a623).setFooter({text:`LS CUSTOM • Recrutement #${r.id}`}).setTimestamp(new Date(r.created_at));
 const files=[];
 if(r.image_path && fs.existsSync(r.image_path)){
  const name=`recruitment-${r.id}-${Date.now()}.png`;
  files.push(new AttachmentBuilder(r.image_path,{name}));
  embed.setImage(`attachment://${name}`);
 }else if(r.image_url) embed.setImage(r.image_url);
 const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Postuler sur le site').setStyle(ButtonStyle.Link).setURL(url));
 return channel.send({embeds:[embed],files,components:[row]});
}

export async function publishFromDashboard(guildId,r){
 await waitForReady();
 const guild=client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(()=>null);
 if(!guild) throw new Error('Le bot Discord n’est pas présent sur ce serveur ou n’est pas encore connecté.');
 return publishRecruitment(guild,r);
}

export async function notifyWebsiteApplication(application,recruitment){
 await waitForReady();
 const guild=client.guilds.cache.get(application.guild_id) || await client.guilds.fetch(application.guild_id).catch(()=>null);
 if(!guild)return null;
 const channel=await fetchTextChannel(guild,getSetting(guild.id,'logs_channel')||getSetting(guild.id,'tickets_channel'));
 if(!channel)return null;
 let answers={}; try{answers=JSON.parse(application.answers_json||'{}')}catch{}
 const embed=new EmbedBuilder().setTitle('📨 Nouvelle candidature — site web').setColor(0xf5a623).setDescription(`**${recruitment?.title||`Recrutement #${application.recruitment_id}`}**`)
  .addFields(
   {name:'Référence',value:`LSC-${String(application.id).padStart(5,'0')}`,inline:true},
   {name:'Nom',value:String(answers.nom||'—'),inline:true},
   {name:'Prénom',value:String(answers.prenom||'—'),inline:true},
   {name:'RP ID',value:String(answers.rp_id||'—'),inline:true},
   {name:'Âge',value:String(answers.age||'—'),inline:true},
   {name:'Discord',value:String(answers.discord_id||'—'),inline:true},
   {name:'Motivation',value:String(answers.motivation||'—').slice(0,1024)},
   {name:'Expérience',value:String(answers.experience||'—').slice(0,1024)}
  ).setTimestamp();
 return channel.send({embeds:[embed]});
}

export async function notifyWebsiteTicket(ticket){
 await waitForReady();
 const guild=client.guilds.cache.get(ticket.guild_id) || await client.guilds.fetch(ticket.guild_id).catch(()=>null);
 if(!guild)return null;
 const channel=await fetchTextChannel(guild,getSetting(guild.id,'tickets_channel')||getSetting(guild.id,'logs_channel'));
 if(!channel)return null;
 let details={}; try{details=JSON.parse(ticket.details_json||'{}')}catch{}
 const labels={partnership:'🤝 Partenariat entreprise',vip:'⭐ VIP LIST',support:'🛠️ Support'};
 const lines=Object.entries(details).filter(([,v])=>v).slice(0,12).map(([k,v])=>({name:k.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()),value:String(v).slice(0,1024)}));
 const embed=new EmbedBuilder().setTitle(`${labels[ticket.type]||'🎫 Ticket'} — ${ticket.subject}`).setColor(0xf5a623).addFields(
  {name:'Référence',value:`LSC-T-${String(ticket.id).padStart(5,'0')}`,inline:true},
  {name:'Demandeur',value:String(ticket.username||'Visiteur'),inline:true},
  ...lines
 ).setTimestamp();
 return channel.send({embeds:[embed]});
}

client.once('ready',()=>{
 console.log(`🤖 Connecté : ${client.user.tag} | ${client.guilds.cache.size} serveur(s)`);
 for(const guild of client.guilds.cache.values()) upsertGuild(guild);
});
client.on('guildCreate',g=>upsertGuild(g));

client.on('interactionCreate',async i=>{try{
 if(i.isChatInputCommand()){
  upsertGuild(i.guild);
  if(i.commandName==='config'){
   const rc=i.options.getString('recrutement-channel'); const lc=i.options.getString('logs-channel'); const tc=i.options.getString('tickets-channel');
   if(rc)setSetting(i.guildId,'recruitment_channel',rc); if(lc)setSetting(i.guildId,'logs_channel',lc); if(tc)setSetting(i.guildId,'tickets_channel',tc);
   return i.reply({content:'✅ Configuration de la liaison enregistrée.',ephemeral:true});
  }
  if(i.commandName==='recrutement'){
   if(i.options.getSubcommand()==='ouvrir'){
    const r=createRecruitment({guildId:i.guildId,title:i.options.getString('titre'),description:i.options.getString('description'),imageUrl:i.options.getString('image'),createdBy:i.user.id});
    let msg=null; try{msg=await publishRecruitment(i.guild,r);}catch(e){console.error('Publication recrutement:',e.message);}
    audit(i.guildId,i.user.id,'recruitment.created',String(r.id));
    return i.reply({content:msg?`✅ Recrutement #${r.id} publié. Les candidatures se font sur le site.`:`✅ Recrutement #${r.id} créé. Configure le salon avec /config puis publie-le depuis le dashboard.`,ephemeral:true});
   }
   const id=i.options.getInteger('id'); const r=setRecruitmentStatus(id,i.guildId,'closed');
   return i.reply({content:r?`🔒 Recrutement #${id} fermé.`:'❌ Recrutement introuvable.',ephemeral:true});
  }
  if(i.commandName==='candidatures'){
   const apps=getApplications(i.guildId,'pending').slice(0,10);
   return i.reply({content:apps.length?apps.map(a=>`**#${a.id}** — ${a.username} — recrutement #${a.recruitment_id}`).join('\n'):'Aucune candidature en attente.',ephemeral:true});
  }
 }
}catch(e){console.error(e);if(!i.replied&&!i.deferred)await i.reply({content:'❌ Une erreur est survenue.',ephemeral:true});}});

export async function startBot(){
 if(!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN manquant');
 if(!process.env.DISCORD_CLIENT_ID) throw new Error('DISCORD_CLIENT_ID manquant');
 const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
 await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),{body:commands});
 await client.login(process.env.DISCORD_TOKEN);
}
