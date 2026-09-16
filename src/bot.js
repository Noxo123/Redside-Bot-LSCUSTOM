import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } from 'discord.js';
import { upsertGuild, createRecruitment, getRecruitment, setRecruitmentStatus, createApplication, updateApplication, getApplications, getSetting, setSetting, audit } from './db.js';

export const client = new Client({ intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const commands=[
 new SlashCommandBuilder().setName('recrutement').setDescription('Gérer les recrutements').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addSubcommand(s=>s.setName('ouvrir').setDescription('Ouvrir un recrutement').addStringOption(o=>o.setName('titre').setDescription('Titre').setRequired(true)).addStringOption(o=>o.setName('description').setDescription('Description').setRequired(true)).addStringOption(o=>o.setName('image').setDescription('URL de l’image').setRequired(false))).addSubcommand(s=>s.setName('fermer').setDescription('Fermer un recrutement').addIntegerOption(o=>o.setName('id').setDescription('ID').setRequired(true))),
 new SlashCommandBuilder().setName('config').setDescription('Configurer le bot').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addStringOption(o=>o.setName('recrutement-channel').setDescription('Salon de publication').setRequired(false)).addStringOption(o=>o.setName('logs-channel').setDescription('Salon des logs').setRequired(false)),
 new SlashCommandBuilder().setName('candidatures').setDescription('Voir les candidatures').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(x=>x.toJSON());

async function publishRecruitment(guild, r) {
 const channelId=getSetting(guild.id,'recruitment_channel');
 const channel=channelId ? guild.channels.cache.get(channelId) : null;
 if(!channel?.isTextBased()) return null;
 const embed=new EmbedBuilder().setTitle(`📋 ${r.title}`).setDescription(r.description).setColor(0x5865f2).setFooter({text:`Recrutement #${r.id} • Redside`}).setTimestamp(new Date(r.created_at));
 if(r.image_url) embed.setImage(r.image_url);
 const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`apply:${r.id}`).setLabel('Postuler').setStyle(ButtonStyle.Primary));
 return channel.send({embeds:[embed],components:[row]});
}

client.once('ready',()=>console.log(`🤖 Connecté : ${client.user.tag}`));
client.on('guildCreate',g=>upsertGuild(g));
client.on('interactionCreate',async i=>{
 try {
  if(i.isChatInputCommand()) {
   upsertGuild(i.guild);
   if(i.commandName==='config') { const rc=i.options.getString('recrutement-channel'); const lc=i.options.getString('logs-channel'); if(rc)setSetting(i.guildId,'recruitment_channel',rc); if(lc)setSetting(i.guildId,'logs_channel',lc); return i.reply({content:'✅ Configuration enregistrée.',ephemeral:true}); }
   if(i.commandName==='recrutement') {
    if(i.options.getSubcommand()==='ouvrir') { const r=createRecruitment({guildId:i.guildId,title:i.options.getString('titre'),description:i.options.getString('description'),imageUrl:i.options.getString('image'),createdBy:i.user.id}); const msg=await publishRecruitment(i.guild,r); audit(i.guildId,i.user.id,'recruitment.created',String(r.id)); return i.reply({content:msg?`✅ Recrutement #${r.id} publié.`:`✅ Recrutement #${r.id} créé. Configure le salon avec /config.`,ephemeral:true}); }
    const id=i.options.getInteger('id'); const r=setRecruitmentStatus(id,i.guildId,'closed'); return i.reply({content:r?`🔒 Recrutement #${id} fermé.`:'❌ Recrutement introuvable.',ephemeral:true});
   }
   if(i.commandName==='candidatures') { const apps=getApplications(i.guildId,'pending').slice(0,10); return i.reply({content:apps.length?apps.map(a=>`**#${a.id}** — <@${a.user_id}> — recrutement #${a.recruitment_id}`).join('\n'):'Aucune candidature en attente.',ephemeral:true}); }
  }
  if(i.isButton() && i.customId.startsWith('apply:')) {
   const id=Number(i.customId.split(':')[1]); const r=getRecruitment(id,i.guildId); if(!r||r.status!=='open') return i.reply({content:'❌ Ce recrutement est fermé.',ephemeral:true});
   const modal=new ModalBuilder().setCustomId(`application:${id}`).setTitle(`Candidature — ${r.title}`);
   const motivation=new TextInputBuilder().setCustomId('motivation').setLabel('Pourquoi vous ?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000);
   const experience=new TextInputBuilder().setCustomId('experience').setLabel('Expérience / présentation').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000);
   modal.addComponents(new ActionRowBuilder().addComponents(motivation),new ActionRowBuilder().addComponents(experience)); return i.showModal(modal);
  }
  if(i.isModalSubmit() && i.customId.startsWith('application:')) { const id=Number(i.customId.split(':')[1]); const r=getRecruitment(id,i.guildId); const a=createApplication({recruitmentId:id,guildId:i.guildId,userId:i.user.id,username:i.user.username,answers:{motivation:i.fields.getTextInputValue('motivation'),experience:i.fields.getTextInputValue('experience')}}); audit(i.guildId,i.user.id,'application.created',String(a.id)); const logId=getSetting(i.guildId,'logs_channel'); const ch=logId?i.guild.channels.cache.get(logId):null; if(ch?.isTextBased()) await ch.send({embeds:[new EmbedBuilder().setTitle('📨 Nouvelle candidature').setDescription(`<@${i.user.id}> a postulé à **${r.title}** (#${r.id}).`).addFields({name:'Motivation',value:a.answers_json.slice(0,1024)}).setColor(0xf1c40f).setTimestamp()]}); return i.reply({content:'✅ Candidature envoyée. Merci !',ephemeral:true}); }
 } catch(e){console.error(e); if(!i.replied&&!i.deferred) await i.reply({content:'❌ Une erreur est survenue.',ephemeral:true});}
});

export async function startBot(){ const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN); await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),{body:commands}); await client.login(process.env.DISCORD_TOKEN); }
