import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
fs.mkdirSync('data',{recursive:true});
const db=new Database(path.join('data','redside.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS guilds (id TEXT PRIMARY KEY,name TEXT,recruitment_channel_id TEXT,log_channel_id TEXT,applications_channel_id TEXT,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recruitments (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,image_url TEXT,image_path TEXT,status TEXT NOT NULL DEFAULT 'open',created_by TEXT NOT NULL,created_at TEXT NOT NULL,closed_at TEXT,questions_json TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT,recruitment_id INTEGER NOT NULL,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,username TEXT NOT NULL,answers_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',reviewer_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,ticket_channel_id TEXT,ticket_message_id TEXT,reviewed_at TEXT,attachments_json TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,type TEXT NOT NULL,user_id TEXT,username TEXT NOT NULL,subject TEXT NOT NULL,details_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',discord_channel_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,closed_at TEXT,attachments_json TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS settings (guild_id TEXT NOT NULL,key TEXT NOT NULL,value TEXT,PRIMARY KEY(guild_id,key));
CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,actor_id TEXT,action TEXT NOT NULL,details TEXT,created_at TEXT NOT NULL);\nCREATE TABLE IF NOT EXISTS login_codes (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,code_hash TEXT NOT NULL,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL);\nCREATE INDEX IF NOT EXISTS idx_login_codes_hash ON login_codes(code_hash);\n\nCREATE TABLE IF NOT EXISTS absences (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,username TEXT NOT NULL,start_date TEXT NOT NULL,end_date TEXT NOT NULL,type TEXT NOT NULL DEFAULT 'indisponible',reason TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);\nCREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(guild_id,start_date,end_date);
`);
for(const sql of [
 'ALTER TABLE recruitments ADD COLUMN image_path TEXT',
 'ALTER TABLE recruitments ADD COLUMN questions_json TEXT NOT NULL DEFAULT \'[]\'',
 'ALTER TABLE applications ADD COLUMN ticket_channel_id TEXT',
 'ALTER TABLE applications ADD COLUMN ticket_message_id TEXT',
 'ALTER TABLE applications ADD COLUMN reviewed_at TEXT',
 'ALTER TABLE applications ADD COLUMN attachments_json TEXT NOT NULL DEFAULT \'[]\'',
 'ALTER TABLE tickets ADD COLUMN attachments_json TEXT NOT NULL DEFAULT \'[]\''
]){try{db.exec(sql)}catch(e){if(!String(e.message).toLowerCase().includes('duplicate column'))throw e}}

export function upsertGuild(g){db.prepare(`INSERT INTO guilds(id,name,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at`).run(g.id,g.name,new Date().toISOString())}
export function getRecruitments(guildId,status=null){return status?db.prepare('SELECT * FROM recruitments WHERE guild_id=? AND status=? ORDER BY id DESC').all(guildId,status):db.prepare('SELECT * FROM recruitments WHERE guild_id=? ORDER BY id DESC').all(guildId)}
export function getRecruitment(id,guildId){return db.prepare('SELECT * FROM recruitments WHERE id=? AND guild_id=?').get(id,guildId)}
export function createRecruitment(d){const r=db.prepare('INSERT INTO recruitments(guild_id,title,description,image_url,image_path,status,created_by,created_at,questions_json) VALUES(?,?,?,?,?,?,?,?,?)').run(d.guildId,d.title,d.description,d.imageUrl||null,d.imagePath||null,'open',d.createdBy,new Date().toISOString(),JSON.stringify(d.questions||[]));return getRecruitment(r.lastInsertRowid,d.guildId)}
export function setRecruitmentStatus(id,guildId,status){db.prepare('UPDATE recruitments SET status=?,closed_at=CASE WHEN ?="closed" THEN ? ELSE closed_at END WHERE id=? AND guild_id=?').run(status,status,new Date().toISOString(),id,guildId);return getRecruitment(id,guildId)}
export function createApplication(d){const now=new Date().toISOString();const r=db.prepare('INSERT INTO applications(recruitment_id,guild_id,user_id,username,answers_json,status,created_at,updated_at,attachments_json) VALUES(?,?,?,?,?,?,?,?,?)').run(d.recruitmentId,d.guildId,d.userId,d.username,JSON.stringify(d.answers||{}),'pending',now,now,JSON.stringify(d.attachments||[]));return getApplication(r.lastInsertRowid,d.guildId)}
export function hasRecentApplication(recruitmentId,identity,minutes=10){return !!db.prepare(`SELECT id FROM applications WHERE recruitment_id=? AND user_id=? AND datetime(created_at) >= datetime('now','-' || ? || ' minutes') LIMIT 1`).get(recruitmentId,identity,minutes)}
export function getApplication(id,guildId){return db.prepare('SELECT * FROM applications WHERE id=? AND guild_id=?').get(id,guildId)}
export function getApplications(guildId,status=null){return status?db.prepare('SELECT * FROM applications WHERE guild_id=? AND status=? ORDER BY id DESC').all(guildId,status):db.prepare('SELECT * FROM applications WHERE guild_id=? ORDER BY id DESC').all(guildId)}
export function getApplicationsForUser(guildId,userId){return db.prepare('SELECT a.*,r.title AS recruitment_title FROM applications a LEFT JOIN recruitments r ON r.id=a.recruitment_id WHERE a.guild_id=? AND a.user_id=? ORDER BY a.id DESC').all(guildId,userId)}
export function updateApplication(id,guildId,status,reviewerId){db.prepare('UPDATE applications SET status=?,reviewer_id=?,reviewed_at=?,updated_at=? WHERE id=? AND guild_id=?').run(status,reviewerId,new Date().toISOString(),new Date().toISOString(),id,guildId);return getApplication(id,guildId)}
export function createTicket(d){const now=new Date().toISOString();const r=db.prepare('INSERT INTO tickets(guild_id,type,user_id,username,subject,details_json,status,created_at,updated_at,attachments_json) VALUES(?,?,?,?,?,?,?,?,?,?)').run(d.guildId,d.type,d.userId||null,d.username||'Visiteur',d.subject,d.details?JSON.stringify(d.details):'{}','open',now,now,JSON.stringify(d.attachments||[]));return getTicket(r.lastInsertRowid,d.guildId)}
export function getTickets(guildId,status=null){return status?db.prepare('SELECT * FROM tickets WHERE guild_id=? AND status=? ORDER BY id DESC').all(guildId,status):db.prepare('SELECT * FROM tickets WHERE guild_id=? ORDER BY id DESC').all(guildId)}
export function getTicket(id,guildId){return db.prepare('SELECT * FROM tickets WHERE id=? AND guild_id=?').get(id,guildId)}
export function getTicketsForUser(guildId,userId){return db.prepare('SELECT * FROM tickets WHERE guild_id=? AND user_id=? ORDER BY id DESC').all(guildId,userId)}
export function setTicketStatus(id,guildId,status){db.prepare('UPDATE tickets SET status=?,closed_at=CASE WHEN ?="closed" THEN ? ELSE closed_at END,updated_at=? WHERE id=? AND guild_id=?').run(status,status,new Date().toISOString(),new Date().toISOString(),id,guildId);return getTicket(id,guildId)}
export function setTicketDiscordChannel(id,guildId,channelId){db.prepare('UPDATE tickets SET discord_channel_id=?,updated_at=? WHERE id=? AND guild_id=?').run(channelId||null,new Date().toISOString(),id,guildId);return getTicket(id,guildId)}
export function getSetting(guildId,key,fallback=null){return db.prepare('SELECT value FROM settings WHERE guild_id=? AND key=?').get(guildId,key)?.value??fallback}
export function setSetting(guildId,key,value){db.prepare('INSERT INTO settings(guild_id,key,value) VALUES(?,?,?) ON CONFLICT(guild_id,key) DO UPDATE SET value=excluded.value').run(guildId,key,String(value))}
export function getAuditLogs(guildId,limit=100){return db.prepare('SELECT * FROM audit_logs WHERE guild_id=? ORDER BY id DESC LIMIT ?').all(guildId,Math.min(Math.max(Number(limit)||100,1),500))}
export function audit(guildId,actorId,action,details=''){db.prepare('INSERT INTO audit_logs(guild_id,actor_id,action,details,created_at) VALUES(?,?,?,?,?)').run(guildId,actorId,action,details,new Date().toISOString())}
export function stats(guildId){return{recruitments:getRecruitments(guildId).length,open:getRecruitments(guildId,'open').length,applications:getApplications(guildId).length,pending:getApplications(guildId,'pending').length,accepted:getApplications(guildId,'accepted').length,rejected:getApplications(guildId,'rejected').length,tickets:getTickets(guildId).length,openTickets:getTickets(guildId,'open').length}}
export default db;

export function createLoginCode(d){const now=new Date();const r=db.prepare('INSERT INTO login_codes(guild_id,user_id,username,code_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)').run(d.guildId,d.userId,d.username||'',d.codeHash,d.expiresAt,now.toISOString());return db.prepare('SELECT * FROM login_codes WHERE id=?').get(r.lastInsertRowid)}
export function consumeLoginCode(codeHash){const row=db.prepare("SELECT * FROM login_codes WHERE code_hash=? AND used_at IS NULL AND datetime(expires_at)>datetime('now') ORDER BY id DESC LIMIT 1").get(codeHash);if(!row)return null;db.prepare('UPDATE login_codes SET used_at=? WHERE id=?').run(new Date().toISOString(),row.id);return row}
export function invalidateLoginCodes(userId,guildId){db.prepare('UPDATE login_codes SET used_at=? WHERE user_id=? AND guild_id=? AND used_at IS NULL').run(new Date().toISOString(),userId,guildId)}
try{db.exec("ALTER TABLE login_codes ADD COLUMN username TEXT NOT NULL DEFAULT ''")}catch(e){if(!String(e.message).toLowerCase().includes('duplicate column'))throw e}\n\nexport function createAbsence(d){const now=new Date().toISOString();const r=db.prepare('INSERT INTO absences(guild_id,user_id,username,start_date,end_date,type,reason,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(d.guildId,d.userId,d.username,d.startDate,d.endDate,d.type||'indisponible',d.reason||'',now,now);return getAbsence(r.lastInsertRowid,d.guildId)}
export function getAbsence(id,guildId){return db.prepare('SELECT * FROM absences WHERE id=? AND guild_id=?').get(id,guildId)}
export function getAbsences(guildId,startDate,endDate){if(startDate&&endDate)return db.prepare('SELECT * FROM absences WHERE guild_id=? AND start_date<=? AND end_date>=? ORDER BY start_date ASC,end_date ASC,username ASC').all(guildId,endDate,startDate);return db.prepare('SELECT * FROM absences WHERE guild_id=? ORDER BY start_date ASC,end_date ASC,username ASC').all(guildId)}
export function getAbsencesForUser(guildId,userId){return db.prepare('SELECT * FROM absences WHERE guild_id=? AND user_id=? ORDER BY start_date DESC,end_date DESC').all(guildId,userId)}
export function deleteAbsence(id,guildId,userId=null){const r=userId?db.prepare('DELETE FROM absences WHERE id=? AND guild_id=? AND user_id=?').run(id,guildId,userId):db.prepare('DELETE FROM absences WHERE id=? AND guild_id=?').run(id,guildId);return r.changes>0}
