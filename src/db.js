import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

fs.mkdirSync('data',{recursive:true});
const db=new Database(path.join('data','redside.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS guilds (id TEXT PRIMARY KEY,name TEXT,recruitment_channel_id TEXT,log_channel_id TEXT,applications_channel_id TEXT,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recruitments (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,image_url TEXT,image_path TEXT,status TEXT NOT NULL DEFAULT 'open',created_by TEXT NOT NULL,created_at TEXT NOT NULL,closed_at TEXT,questions_json TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT,recruitment_id INTEGER NOT NULL,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,username TEXT NOT NULL,answers_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',reviewer_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,ticket_channel_id TEXT,ticket_message_id TEXT,reviewed_at TEXT,attachments_json TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,type TEXT NOT NULL,user_id TEXT,username TEXT NOT NULL,subject TEXT NOT NULL,details_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',discord_channel_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,closed_at TEXT,attachments_json TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS settings (guild_id TEXT NOT NULL,key TEXT NOT NULL,value TEXT,PRIMARY KEY(guild_id,key));
CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,actor_id TEXT,action TEXT NOT NULL,details TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS login_codes (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,code_hash TEXT NOT NULL,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_login_codes_hash ON login_codes(code_hash);
CREATE TABLE IF NOT EXISTS absences (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,username TEXT NOT NULL,start_date TEXT NOT NULL,end_date TEXT NOT NULL,type TEXT NOT NULL DEFAULT 'indisponible',reason TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(guild_id,start_date,end_date);

CREATE TABLE IF NOT EXISTS hierarchy_roles (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 guild_id TEXT NOT NULL,
 role_key TEXT NOT NULL,
 name TEXT NOT NULL,
 level INTEGER NOT NULL DEFAULT 0,
 discord_role_id TEXT,
 color TEXT,
 description TEXT,
 UNIQUE(guild_id,role_key)
);

CREATE TABLE IF NOT EXISTS role_permissions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 guild_id TEXT NOT NULL,
 role_key TEXT NOT NULL,
 permissions_json TEXT NOT NULL DEFAULT '[]',
 UNIQUE(guild_id,role_key)
);
CREATE INDEX IF NOT EXISTS idx_role_permissions_guild ON role_permissions(guild_id);

CREATE TABLE IF NOT EXISTS employees (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 guild_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 username TEXT NOT NULL,
 display_name TEXT,
 role_key TEXT,
 status TEXT NOT NULL DEFAULT 'active',
 joined_at TEXT,
 quota_enabled INTEGER NOT NULL DEFAULT 1,
 quota_target INTEGER NOT NULL DEFAULT 0,
 notes TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(guild_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_employees_guild_status ON employees(guild_id,status);

CREATE TABLE IF NOT EXISTS quota_entries (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 guild_id TEXT NOT NULL,
 employee_id INTEGER NOT NULL,
 period_start TEXT NOT NULL,
 period_end TEXT NOT NULL,
 appels INTEGER NOT NULL DEFAULT 0,
 reparations INTEGER NOT NULL DEFAULT 0,
 fourrieres INTEGER NOT NULL DEFAULT 0,
 personnalisations INTEGER NOT NULL DEFAULT 0,
 factures INTEGER NOT NULL DEFAULT 0,
 montant_fourrieres INTEGER NOT NULL DEFAULT 0,
 montant_personnalisations INTEGER NOT NULL DEFAULT 0,
 montant_factures INTEGER NOT NULL DEFAULT 0,
 note TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(employee_id,period_start,period_end),
 FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_quota_period ON quota_entries(guild_id,period_start,period_end);
CREATE TABLE IF NOT EXISTS quota_imports (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 guild_id TEXT NOT NULL,
 import_uid TEXT NOT NULL UNIQUE,
 source_hash TEXT NOT NULL,
 period_start TEXT NOT NULL,
 period_end TEXT NOT NULL,
 imported_by TEXT,
 imported_by_name TEXT,
 imported_at TEXT NOT NULL,
 source_text TEXT NOT NULL DEFAULT '',
 imported_count INTEGER NOT NULL DEFAULT 0,
 created_count INTEGER NOT NULL DEFAULT 0,
 skipped_count INTEGER NOT NULL DEFAULT 0,
 error_count INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'completed'
);
CREATE INDEX IF NOT EXISTS idx_quota_imports_guild_date ON quota_imports(guild_id,imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_quota_imports_hash ON quota_imports(guild_id,source_hash);


CREATE TABLE IF NOT EXISTS partnerships (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 guild_id TEXT NOT NULL,
 company TEXT NOT NULL,
 contact TEXT,
 discord TEXT,
 website TEXT,
 status TEXT NOT NULL DEFAULT 'active',
 start_date TEXT,
 end_date TEXT,
 offer TEXT,
 notes TEXT,
 ticket_id INTEGER,
 discord_channel_id TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_partnerships_guild_status ON partnerships(guild_id,status);
CREATE TABLE IF NOT EXISTS partnership_access (id INTEGER PRIMARY KEY AUTOINCREMENT,partnership_id INTEGER NOT NULL UNIQUE,token_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,last_used_at TEXT,FOREIGN KEY(partnership_id) REFERENCES partnerships(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS application_security (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,fingerprint_hash TEXT NOT NULL,created_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_application_security ON application_security(guild_id,fingerprint_hash,created_at);
CREATE INDEX IF NOT EXISTS idx_partnership_access_hash ON partnership_access(token_hash);
`);

let hierarchyColumnsReady=false;function ensureHierarchyColumns(){if(hierarchyColumnsReady)return;try{db.exec("CREATE TABLE IF NOT EXISTS hierarchy_roles (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,role_key TEXT NOT NULL,name TEXT NOT NULL,level INTEGER NOT NULL DEFAULT 0,discord_role_id TEXT,color TEXT,description TEXT,UNIQUE(guild_id,role_key))");db.exec("CREATE TABLE IF NOT EXISTS role_permissions (id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL,role_key TEXT NOT NULL,permissions_json TEXT NOT NULL DEFAULT '[]',UNIQUE(guild_id,role_key))");hierarchyColumnsReady=true}catch(e){console.error('Hierarchy DB init:',e.message);throw e}}
export function getHierarchy(guildId){ensureHierarchyColumns();return db.prepare("SELECT h.*,COALESCE(rp.permissions_json,'[]') AS permissions_json FROM hierarchy_roles h LEFT JOIN role_permissions rp ON rp.guild_id=h.guild_id AND rp.role_key=h.role_key WHERE h.guild_id=? ORDER BY h.level DESC,h.id ASC").all(guildId)}
export function getRolePermissions(guildId,roleKey){const r=db.prepare('SELECT permissions_json FROM role_permissions WHERE guild_id=? AND role_key=?').get(guildId,roleKey);try{return JSON.parse(r?.permissions_json||'[]')}catch{return[]}}
export function setRolePermissions(guildId,roleKey,permissions=[]){db.prepare("INSERT INTO role_permissions(guild_id,role_key,permissions_json) VALUES(?,?,?) ON CONFLICT(guild_id,role_key) DO UPDATE SET permissions_json=excluded.permissions_json").run(guildId,roleKey,JSON.stringify([...new Set(permissions)]));return getRolePermissions(guildId,roleKey)}
export function getPermissionsForDiscordRoles(guildId,discordRoleIds=[]){const rows=db.prepare("SELECT h.role_key,h.name,h.level,h.discord_role_id,COALESCE(rp.permissions_json,'[]') AS permissions_json FROM hierarchy_roles h LEFT JOIN role_permissions rp ON rp.guild_id=h.guild_id AND rp.role_key=h.role_key WHERE h.guild_id=? AND h.discord_role_id IS NOT NULL").all(guildId);const ids=new Set((discordRoleIds||[]).map(String));const matched=rows.filter(r=>ids.has(String(r.discord_role_id))).sort((a,b)=>b.level-a.level);const permissions=new Set();for(const r of matched){try{for(const p of JSON.parse(r.permissions_json||'[]'))permissions.add(p)}catch{}const n=String(r.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(/chef|rh|drh|direction|gerant|developpeur|patron/.test(n)){permissions.add('team');permissions.add('activity_all')}if(/direction|gerant|developpeur|drh|rh|chef|patron|partenariat/.test(n))permissions.add('partnerships')}return{roles:matched.map(r=>({key:r.role_key,name:r.name,level:r.level,discordRoleId:r.discord_role_id})),permissions:[...permissions]}}


for(const sql of [
 'ALTER TABLE quota_entries ADD COLUMN import_batch_id INTEGER',
 'ALTER TABLE quota_entries ADD COLUMN imported_at TEXT',

 'ALTER TABLE employees ADD COLUMN discord_username TEXT',
 'ALTER TABLE employees ADD COLUMN discord_display_name TEXT',
 'ALTER TABLE recruitments ADD COLUMN image_path TEXT',
 'ALTER TABLE recruitments ADD COLUMN questions_json TEXT NOT NULL DEFAULT \'[]\'',
 'ALTER TABLE applications ADD COLUMN ticket_channel_id TEXT',
 'ALTER TABLE applications ADD COLUMN ticket_message_id TEXT',
 'ALTER TABLE applications ADD COLUMN reviewed_at TEXT',
 'ALTER TABLE applications ADD COLUMN attachments_json TEXT NOT NULL DEFAULT \'[]\'',
 'ALTER TABLE tickets ADD COLUMN attachments_json TEXT NOT NULL DEFAULT \'[]\'',
 'ALTER TABLE login_codes ADD COLUMN username TEXT NOT NULL DEFAULT \'\'',
 'ALTER TABLE hierarchy_roles ADD COLUMN permissions_json TEXT NOT NULL DEFAULT \'[]\'',
 'ALTER TABLE partnerships ADD COLUMN discord_channel_id TEXT'
]){try{db.exec(sql)}catch(e){if(!String(e.message).toLowerCase().includes('duplicate column'))throw e}}

for(const ticket of db.prepare("SELECT id,guild_id,subject,details_json,created_at FROM tickets WHERE type='partnership'").all()){if(db.prepare('SELECT id FROM partnerships WHERE guild_id=? AND ticket_id=?').get(ticket.guild_id,ticket.id))continue;let d={};try{d=JSON.parse(ticket.details_json||'{}')}catch{}const now=new Date().toISOString();db.prepare('INSERT INTO partnerships(guild_id,company,contact,discord,website,status,start_date,offer,notes,ticket_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(ticket.guild_id,d.company||ticket.subject,d.contact||'',d.discord||'',d.website||'','active',ticket.created_at?.slice(0,10)||now.slice(0,10),d.proposal||'', 'Importé automatiquement depuis le ticket LSC-T-'+String(ticket.id).padStart(5,'0'),ticket.id,now,now)}
export function upsertGuild(g){if(!g?.id)return null;db.prepare(`INSERT INTO guilds(id,name,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at`).run(g.id,g.name||'Serveur Discord',new Date().toISOString());return true}
export function getRecruitments(guildId,status=null){return status?db.prepare('SELECT * FROM recruitments WHERE guild_id=? AND status=? ORDER BY id DESC').all(guildId,status):db.prepare('SELECT * FROM recruitments WHERE guild_id=? ORDER BY id DESC').all(guildId)}
export function getRecruitment(id,guildId){return db.prepare('SELECT * FROM recruitments WHERE id=? AND guild_id=?').get(id,guildId)}
export function createRecruitment(d){const r=db.prepare('INSERT INTO recruitments(guild_id,title,description,image_url,image_path,status,created_by,created_at,questions_json) VALUES(?,?,?,?,?,?,?,?,?)').run(d.guildId,d.title,d.description,d.imageUrl||null,d.imagePath||null,'open',d.createdBy,new Date().toISOString(),JSON.stringify(d.questions||[]));return getRecruitment(r.lastInsertRowid,d.guildId)}
export function updateRecruitment(id,guildId,d){const now=new Date().toISOString();db.prepare('UPDATE recruitments SET title=?,description=?,image_url=?,questions_json=? WHERE id=? AND guild_id=?').run(d.title,d.description,d.imageUrl||null,JSON.stringify(d.questions||[]),id,guildId);return getRecruitment(id,guildId)}
export function countRecentApplicationsByIdentity(guildId,userId,hours=24){return Number(db.prepare("SELECT COUNT(*) AS n FROM applications WHERE guild_id=? AND user_id=? AND datetime(created_at)>=datetime('now','-' || ? || ' hours')").get(guildId,userId,hours)?.n||0)}
export function countSecurityAttempts(guildId,fingerprintHash,minutes=10){return Number(db.prepare("SELECT COUNT(*) AS n FROM application_security WHERE guild_id=? AND fingerprint_hash=? AND datetime(created_at)>=datetime('now','-' || ? || ' minutes')").get(guildId,fingerprintHash,minutes)?.n||0)}
export function recordSecurityAttempt(guildId,fingerprintHash){db.prepare('INSERT INTO application_security(guild_id,fingerprint_hash,created_at) VALUES(?,?,?)').run(guildId,fingerprintHash,new Date().toISOString())}
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
export function getTicketByDiscordChannel(guildId,channelId){return db.prepare('SELECT * FROM tickets WHERE guild_id=? AND discord_channel_id=? ORDER BY id DESC LIMIT 1').get(guildId,channelId)}
export function getTicketsForUser(guildId,userId){return db.prepare('SELECT * FROM tickets WHERE guild_id=? AND user_id=? ORDER BY id DESC').all(guildId,userId)}
export function setTicketStatus(id,guildId,status){db.prepare('UPDATE tickets SET status=?,closed_at=CASE WHEN ?="closed" THEN ? ELSE closed_at END,updated_at=? WHERE id=? AND guild_id=?').run(status,status,new Date().toISOString(),new Date().toISOString(),id,guildId);return getTicket(id,guildId)}
export function setTicketDiscordChannel(id,guildId,channelId){db.prepare('UPDATE tickets SET discord_channel_id=?,updated_at=? WHERE id=? AND guild_id=?').run(channelId||null,new Date().toISOString(),id,guildId);return getTicket(id,guildId)}
export function getSetting(guildId,key,fallback=null){return db.prepare('SELECT value FROM settings WHERE guild_id=? AND key=?').get(guildId,key)?.value??fallback}
export function setSetting(guildId,key,value){db.prepare('INSERT INTO settings(guild_id,key,value) VALUES(?,?,?) ON CONFLICT(guild_id,key) DO UPDATE SET value=excluded.value').run(guildId,key,String(value));return String(value)}
export function getAuditLogs(guildId,limit=100){return db.prepare('SELECT * FROM audit_logs WHERE guild_id=? ORDER BY id DESC LIMIT ?').all(guildId,Math.min(Math.max(Number(limit)||100,1),500))}
export function audit(guildId,actorId,action,details=''){db.prepare('INSERT INTO audit_logs(guild_id,actor_id,action,details,created_at) VALUES(?,?,?,?,?)').run(guildId,actorId,action,details,new Date().toISOString())}
export function stats(guildId){return{recruitments:getRecruitments(guildId).length,open:getRecruitments(guildId,'open').length,applications:getApplications(guildId).length,pending:getApplications(guildId,'pending').length,accepted:getApplications(guildId,'accepted').length,rejected:getApplications(guildId,'rejected').length,tickets:getTickets(guildId).length,openTickets:getTickets(guildId,'open').length}}
export default db;

export function createLoginCode(d){const now=new Date();const r=db.prepare('INSERT INTO login_codes(guild_id,user_id,username,code_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)').run(d.guildId,d.userId,d.username||'',d.codeHash,d.expiresAt,now.toISOString());return db.prepare('SELECT * FROM login_codes WHERE id=?').get(r.lastInsertRowid)}
export function consumeLoginCode(codeHash){const row=db.prepare("SELECT * FROM login_codes WHERE code_hash=? AND used_at IS NULL AND datetime(expires_at)>datetime('now') ORDER BY id DESC LIMIT 1").get(codeHash);if(!row)return null;db.prepare('UPDATE login_codes SET used_at=? WHERE id=?').run(new Date().toISOString(),row.id);return row}
export function invalidateLoginCodes(userId,guildId){db.prepare('UPDATE login_codes SET used_at=? WHERE user_id=? AND guild_id=? AND used_at IS NULL').run(new Date().toISOString(),userId,guildId)}

export function createAbsence(d){const now=new Date().toISOString();const r=db.prepare('INSERT INTO absences(guild_id,user_id,username,start_date,end_date,type,reason,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(d.guildId,d.userId,d.username,d.startDate,d.endDate,d.type||'indisponible',d.reason||'',now,now);return getAbsence(r.lastInsertRowid,d.guildId)}
export function getAbsence(id,guildId){return db.prepare('SELECT * FROM absences WHERE id=? AND guild_id=?').get(id,guildId)}
export function getAbsences(guildId,startDate,endDate){if(startDate&&endDate)return db.prepare('SELECT * FROM absences WHERE guild_id=? AND start_date<=? AND end_date>=? ORDER BY start_date ASC,end_date ASC,username ASC').all(guildId,endDate,startDate);return db.prepare('SELECT * FROM absences WHERE guild_id=? ORDER BY start_date ASC,end_date ASC,username ASC').all(guildId)}
export function getAbsencesForUser(guildId,userId){return db.prepare('SELECT * FROM absences WHERE guild_id=? AND user_id=? ORDER BY start_date DESC,end_date DESC').all(guildId,userId)}
export function deleteAbsence(id,guildId,userId=null){const r=userId?db.prepare('DELETE FROM absences WHERE id=? AND guild_id=? AND user_id=?').run(id,guildId,userId):db.prepare('DELETE FROM absences WHERE id=? AND guild_id=?').run(id,guildId);return r.changes>0}

export function getHierarchyRole(id,guildId){return db.prepare('SELECT * FROM hierarchy_roles WHERE id=? AND guild_id=?').get(id,guildId)}
export function upsertHierarchyRole(d){const now=new Date().toISOString();const existing=db.prepare('SELECT id FROM hierarchy_roles WHERE guild_id=? AND role_key=?').get(d.guildId,d.roleKey);if(existing){db.prepare('UPDATE hierarchy_roles SET name=?,level=?,discord_role_id=?,color=?,description=? WHERE id=? AND guild_id=?').run(d.name,d.level||0,d.discordRoleId||null,d.color||null,d.description||'',existing.id);return getHierarchyRole(existing.id,d.guildId)}const r=db.prepare('INSERT INTO hierarchy_roles(guild_id,role_key,name,level,discord_role_id,color,description) VALUES(?,?,?,?,?,?,?)').run(d.guildId,d.roleKey,d.name,d.level||0,d.discordRoleId||null,d.color||null,d.description||'');return getHierarchyRole(r.lastInsertRowid,d.guildId)}
export function deleteHierarchyRole(id,guildId){const r=db.prepare('DELETE FROM hierarchy_roles WHERE id=? AND guild_id=?').run(id,guildId);return r.changes>0}

export function getEmployees(guildId,status=null){return status?db.prepare('SELECT e.*,h.name AS role_name,h.level AS role_level,h.discord_role_id,h.color AS role_color FROM employees e LEFT JOIN hierarchy_roles h ON h.guild_id=e.guild_id AND h.role_key=e.role_key WHERE e.guild_id=? AND e.status=? ORDER BY COALESCE(h.level,-1) DESC,e.display_name,e.username').all(guildId,status):db.prepare('SELECT e.*,h.name AS role_name,h.level AS role_level,h.discord_role_id,h.color AS role_color FROM employees e LEFT JOIN hierarchy_roles h ON h.guild_id=e.guild_id AND h.role_key=e.role_key WHERE e.guild_id=? ORDER BY COALESCE(h.level,-1) DESC,e.display_name,e.username').all(guildId)}
export function getEmployee(id,guildId){return db.prepare('SELECT e.*,h.name AS role_name,h.level AS role_level,h.discord_role_id,h.color AS role_color FROM employees e LEFT JOIN hierarchy_roles h ON h.guild_id=e.guild_id AND h.role_key=e.role_key WHERE e.id=? AND e.guild_id=?').get(id,guildId)}
export function upsertEmployee(d){const now=new Date().toISOString();const existing=db.prepare('SELECT id,display_name FROM employees WHERE guild_id=? AND user_id=?').get(d.guildId,d.userId);if(existing){db.prepare("UPDATE employees SET username=?,display_name=COALESCE(NULLIF(?,''),display_name),role_key=?,status=?,joined_at=COALESCE(joined_at,?),quota_enabled=?,quota_target=?,notes=?,updated_at=? WHERE id=? AND guild_id=?").run(d.username,d.displayName||'',d.roleKey||null,d.status||'active',d.joinedAt||null,d.quotaEnabled===false?0:1,Number(d.quotaTarget)||0,d.notes||'',now,existing.id,d.guildId);return getEmployee(existing.id,d.guildId)}const r=db.prepare('INSERT INTO employees(guild_id,user_id,username,display_name,role_key,status,joined_at,quota_enabled,quota_target,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(d.guildId,d.userId,d.username,d.displayName||d.username,d.roleKey||null,d.status||'active',d.joinedAt||null,d.quotaEnabled===false?0:1,Number(d.quotaTarget)||0,d.notes||'',now,now);return getEmployee(r.lastInsertRowid,d.guildId)}
export function updateEmployeeProfile(d){const now=new Date().toISOString();db.prepare('UPDATE employees SET display_name=?,role_key=?,status=?,joined_at=?,quota_enabled=?,quota_target=?,notes=?,updated_at=? WHERE id=? AND guild_id=?').run(d.displayName,d.roleKey||null,d.status||'active',d.joinedAt||null,d.quotaEnabled===false?0:1,Number(d.quotaTarget)||0,d.notes||'',now,d.id,d.guildId);return getEmployee(d.id,d.guildId)}
export function syncEmployeeIdentity({guildId,userId,username,displayName}){const now=new Date().toISOString();const existing=db.prepare('SELECT id FROM employees WHERE guild_id=? AND user_id=?').get(guildId,userId);if(existing){db.prepare('UPDATE employees SET discord_username=?,discord_display_name=?,updated_at=? WHERE id=? AND guild_id=?').run(username||'',displayName||username||'',now,existing.id,guildId);return getEmployee(existing.id,guildId)}const normalized=String(displayName||username||'').trim().toLocaleLowerCase('fr-FR');const candidates=db.prepare("SELECT id,display_name,username FROM employees WHERE guild_id=? AND user_id LIKE 'import:%'").all(guildId);const match=candidates.find(e=>String(e.display_name||e.username||'').trim().toLocaleLowerCase('fr-FR')===normalized);if(match){db.prepare('UPDATE employees SET user_id=?,username=?,discord_username=?,discord_display_name=?,updated_at=? WHERE id=? AND guild_id=?').run(userId,match.username||displayName||'',username||'',displayName||username||'',now,match.id,guildId);return getEmployee(match.id,guildId)}return null}
export function linkEmployeeDiscord({id,guildId,userId,username,displayName}){const now=new Date().toISOString();const conflict=db.prepare('SELECT id FROM employees WHERE guild_id=? AND user_id=? AND id<>?').get(guildId,userId,id);if(conflict)throw new Error('Ce compte Discord est déjà lié à une autre personne RP.');db.prepare('UPDATE employees SET user_id=?,discord_username=?,discord_display_name=?,updated_at=? WHERE id=? AND guild_id=?').run(userId,username||'',displayName||username||'',now,id,guildId);return getEmployee(id,guildId)}
export function unlinkEmployeeDiscord({id,guildId}){const now=new Date().toISOString();db.prepare('UPDATE employees SET user_id=?,discord_username=NULL,discord_display_name=NULL,updated_at=? WHERE id=? AND guild_id=?').run('import:'+crypto.randomUUID(),now,id,guildId);return getEmployee(id,guildId)}
export function deleteEmployee(id,guildId){const r=db.prepare('DELETE FROM employees WHERE id=? AND guild_id=?').run(id,guildId);return r.changes>0}
export function getQuotaEntries(guildId,startDate,endDate){const rows=db.prepare('SELECT q.*,e.user_id,e.username,e.display_name,e.role_key,h.name AS role_name,h.level AS role_level,e.quota_target,e.quota_enabled FROM quota_entries q JOIN employees e ON e.id=q.employee_id LEFT JOIN hierarchy_roles h ON h.guild_id=e.guild_id AND h.role_key=e.role_key WHERE q.guild_id=? AND q.period_start=? AND q.period_end=? ORDER BY COALESCE(h.level,-1) DESC,e.display_name,e.username').all(guildId,startDate,endDate);return rows}
export function upsertQuota(d){
 ensureQuotaImportColumns();
 const now=d.importedAt||new Date().toISOString();
 const values=[Number(d.appels)||0,Number(d.reparations)||0,Number(d.fourrieres)||0,Number(d.personnalisations)||0,Number(d.factures)||0,Number(d.montantFourrieres)||0,Number(d.montantPersonnalisations)||0,Number(d.montantFactures)||0,d.note||'',d.importBatchId||null,now];
 const existing=db.prepare('SELECT id FROM quota_entries WHERE employee_id=? AND period_start=? AND period_end=?').get(d.employeeId,d.periodStart,d.periodEnd);
 if(existing){
   db.prepare('UPDATE quota_entries SET appels=?,reparations=?,fourrieres=?,personnalisations=?,factures=?,montant_fourrieres=?,montant_personnalisations=?,montant_factures=?,note=?,import_batch_id=?,imported_at=?,updated_at=? WHERE id=?').run(...values,now,existing.id);
   return getQuotaEntry(existing.id,d.guildId);
 }
 const r=db.prepare('INSERT INTO quota_entries(guild_id,employee_id,period_start,period_end,appels,reparations,fourrieres,personnalisations,factures,montant_fourrieres,montant_personnalisations,montant_factures,note,import_batch_id,imported_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(d.guildId,d.employeeId,d.periodStart,d.periodEnd,...values,now,now);
 return getQuotaEntry(r.lastInsertRowid,d.guildId);
}
function ensureQuotaImportColumns(){
 db.exec(`CREATE TABLE IF NOT EXISTS quota_imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  import_uid TEXT NOT NULL UNIQUE,
  source_hash TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  imported_by TEXT,
  imported_by_name TEXT,
  imported_at TEXT NOT NULL,
  source_text TEXT NOT NULL DEFAULT '',
  imported_count INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed'
 )`);
 db.exec('CREATE INDEX IF NOT EXISTS idx_quota_imports_guild_date ON quota_imports(guild_id,imported_at DESC)');
 db.exec('CREATE INDEX IF NOT EXISTS idx_quota_imports_hash ON quota_imports(guild_id,source_hash)');
 const qcols=db.prepare('PRAGMA table_info(quota_entries)').all().map(x=>x.name);
 if(!qcols.includes('import_batch_id')) db.exec('ALTER TABLE quota_entries ADD COLUMN import_batch_id INTEGER');
 if(!qcols.includes('imported_at')) db.exec('ALTER TABLE quota_entries ADD COLUMN imported_at TEXT');
 const icols=db.prepare('PRAGMA table_info(quota_imports)').all().map(x=>x.name);
 const additions=[['source_text',"TEXT NOT NULL DEFAULT ''"],['imported_count','INTEGER NOT NULL DEFAULT 0'],['created_count','INTEGER NOT NULL DEFAULT 0'],['skipped_count','INTEGER NOT NULL DEFAULT 0'],['error_count','INTEGER NOT NULL DEFAULT 0'],['status',"TEXT NOT NULL DEFAULT 'completed'"]];
 for(const [name,type] of additions) if(!icols.includes(name)) db.exec('ALTER TABLE quota_imports ADD COLUMN '+name+' '+type);
}
ensureQuotaImportColumns();

export function getQuotaImports(guildId,limit=50){
 return db.prepare('SELECT id,import_uid,period_start,period_end,imported_by,imported_by_name,imported_at,imported_count,created_count,skipped_count,error_count,status FROM quota_imports WHERE guild_id=? ORDER BY imported_at DESC,id DESC LIMIT ?').all(guildId,Math.min(Math.max(Number(limit)||50,1),200));
}
export function getQuotaImport(id,guildId){return db.prepare('SELECT * FROM quota_imports WHERE id=? AND guild_id=?').get(id,guildId)}
export function saveQuotaImport(d){
 ensureQuotaImportColumns();
 const importedAt=d.importedAt||new Date().toISOString();
 const sourceText=String(d.sourceText||'');
 const sourceHash=crypto.createHash('sha256').update([d.periodStart,d.periodEnd,sourceText.replace(/\r\n/g,'\n').trim()].join('\n')).digest('hex');
 const duplicate=db.prepare('SELECT * FROM quota_imports WHERE guild_id=? AND source_hash=? ORDER BY id DESC LIMIT 1').get(d.guildId,sourceHash);
 if(duplicate)return {...duplicate,duplicate:true,imported:false,created:[],imported:[],skipped:[],cleaned:[]};
 const normalizeEmployeeName=v=>String(v||'').trim().toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[—–-]+/g,' ').replace(/\s+/g,' ').trim();
 const consolidateDuplicates=(employees)=>{
   if(employees.length<2)return employees[0]||null;
   const ranked=[...employees].sort((a,b)=>{
     const score=e=>(e.role_key?100:0)+(String(e.user_id||'').startsWith('import:')?0:20)+(e.status==='active'?10:0);
     return score(b)-score(a)||Number(b.id)-Number(a.id);
   });
   const keep=ranked[0];
   for(const duplicateEmployee of ranked.slice(1)){
     const quotaRows=db.prepare('SELECT * FROM quota_entries WHERE employee_id=? ORDER BY id ASC').all(duplicateEmployee.id);
     for(const q of quotaRows){
       const existing=db.prepare('SELECT id,imported_at,updated_at,created_at FROM quota_entries WHERE employee_id=? AND period_start=? AND period_end=?').get(keep.id,q.period_start,q.period_end);
       if(!existing){
         db.prepare('UPDATE quota_entries SET employee_id=? WHERE id=?').run(keep.id,q.id);
       }else{
         const qTime=Date.parse(q.imported_at||q.updated_at||q.created_at||'')||0;
         const eTime=Date.parse(existing.imported_at||existing.updated_at||existing.created_at||'')||0;
         if(qTime>eTime){
           db.prepare('DELETE FROM quota_entries WHERE id=?').run(existing.id);
           db.prepare('UPDATE quota_entries SET employee_id=? WHERE id=?').run(keep.id,q.id);
         }else{
           db.prepare('DELETE FROM quota_entries WHERE id=?').run(q.id);
         }
       }
     }
     db.prepare('DELETE FROM employees WHERE id=? AND guild_id=?').run(duplicateEmployee.id,d.guildId);
   }
   return getEmployee(keep.id,d.guildId);
 };
 const importUid=crypto.randomUUID();
 const tx=db.transaction(()=>{
   const batch=db.prepare('INSERT INTO quota_imports(guild_id,import_uid,source_hash,period_start,period_end,imported_by,imported_by_name,imported_at,source_text,status) VALUES(?,?,?,?,?,?,?,?,?,?)').run(d.guildId,importUid,sourceHash,d.periodStart,d.periodEnd,d.importedBy||null,d.importedByName||null,importedAt,sourceText,'processing');
   const batchId=Number(batch.lastInsertRowid);
   const imported=[],skipped=[],cleaned=[];
   const employees=getEmployees(d.guildId);
   const employeeGroups=new Map();
   for(const e of employees){
     const key=normalizeEmployeeName(e.display_name||e.username);
     if(!key)continue;
     if(!employeeGroups.has(key))employeeGroups.set(key,[]);
     employeeGroups.get(key).push(e);
   }
   for(const row of (d.rows||[])){
     const key=normalizeEmployeeName(row.name);
     const candidates=employeeGroups.get(key)||[];
     if(!candidates.length){
       skipped.push({name:row.name,reason:'Aucun employé Discord correspondant. Aucune fiche créée.'});
       continue;
     }
     const before=candidates.length;
     const employee=consolidateDuplicates(candidates);
     if(before>1)cleaned.push({name:row.name,removed:before-1,kept:employee?.display_name||employee?.username,role:employee?.role_name||employee?.role_key||null});
     if(!employee){
       skipped.push({name:row.name,reason:'Employé introuvable.'});
       continue;
     }
     upsertQuota({...row,guildId:d.guildId,employeeId:employee.id,periodStart:d.periodStart,periodEnd:d.periodEnd,importBatchId:batchId,importedAt,note:'Import RH des interventions'});
     imported.push({name:row.name,employeeId:employee.id,role:employee.role_name||employee.role_key||null});
   }
   db.prepare('UPDATE quota_imports SET imported_count=?,created_count=?,skipped_count=?,status=? WHERE id=?').run(imported.length,0,skipped.length,'completed',batchId);
   return {batchId,importUid,imported,created:[],skipped,cleaned};
 });
 const result=tx();
 audit(d.guildId,d.importedBy||null,'quota.import.completed',JSON.stringify({batchId:result.batchId,importUid:result.importUid,periodStart:d.periodStart,periodEnd:d.periodEnd,count:result.imported.length,created:0,skipped:result.skipped.length,cleaned:result.cleaned.length,importedAt}));
 return {...getQuotaImport(result.batchId,d.guildId),...result,duplicate:false,importedAt};
}
export function getQuotaEntry(id,guildId){return db.prepare('SELECT q.*,e.username,e.display_name,e.role_key,h.name AS role_name,e.quota_target,e.quota_enabled FROM quota_entries q JOIN employees e ON e.id=q.employee_id LEFT JOIN hierarchy_roles h ON h.guild_id=e.guild_id AND h.role_key=e.role_key WHERE q.id=? AND q.guild_id=?').get(id,guildId)}

function ensurePartnershipTermsColumns(){
  const cols=db.prepare('PRAGMA table_info(partnerships)').all().map(x=>x.name);
  const add=[
    ['proposal_message_id','TEXT'],['price','REAL'],
    ['proposal_status',"TEXT NOT NULL DEFAULT 'pending'"],
    ['staff_accepted_at','TEXT'],
    ['client_accepted_at','TEXT'],
    ['client_declined_at','TEXT'],['payment_status',"TEXT NOT NULL DEFAULT 'unpaid'"],['payment_proof_path','TEXT'],['payment_proof_uploaded_at','TEXT'],['payment_proof_uploaded_by','TEXT'],['payment_proof_uploader_name','TEXT'],['payment_proof_mime','TEXT'],['payment_proof_original_name','TEXT'],['payment_proof_sha256','TEXT']
  ];
  for(const [name,type] of add)if(!cols.includes(name))db.exec('ALTER TABLE partnerships ADD COLUMN '+name+' '+type);
}
ensurePartnershipTermsColumns();

export function getPartnerships(guildId,status=null){return status?db.prepare('SELECT * FROM partnerships WHERE guild_id=? AND status=? ORDER BY COALESCE(start_date,created_at) DESC,id DESC').all(guildId,status):db.prepare('SELECT * FROM partnerships WHERE guild_id=? ORDER BY COALESCE(start_date,created_at) DESC,id DESC').all(guildId)}
export function getPartnership(id,guildId){return db.prepare('SELECT * FROM partnerships WHERE id=? AND guild_id=?').get(id,guildId)}
export function upsertPartnership(d){ensurePartnershipTermsColumns();const now=new Date().toISOString();if(d.id){const existing=getPartnership(d.id,d.guildId);if(!existing)return null;db.prepare('UPDATE partnerships SET company=?,contact=?,discord=?,website=?,status=?,start_date=?,end_date=?,offer=?,notes=?,ticket_id=?,discord_channel_id=?,proposal_message_id=?,price=?,proposal_status=?,staff_accepted_at=?,client_accepted_at=?,client_declined_at=?,updated_at=? WHERE id=? AND guild_id=?').run(d.company??existing.company,d.contact??existing.contact??'',d.discord??existing.discord??'',d.website??existing.website??'',d.status??existing.status??'pending',d.startDate??existing.start_date??null,d.endDate??existing.end_date??null,d.offer??existing.offer??'',d.notes??existing.notes??'',d.ticketId??existing.ticket_id??null,d.discordChannelId??existing.discord_channel_id??null,d.proposalMessageId??existing.proposal_message_id??null,d.price===undefined?existing.price:(d.price==null?null:Number(d.price)),d.proposalStatus??existing.proposal_status??'pending',d.staffAcceptedAt??existing.staff_accepted_at??null,d.clientAcceptedAt??existing.client_accepted_at??null,d.clientDeclinedAt??existing.client_declined_at??null,now,d.id,d.guildId);return getPartnership(d.id,d.guildId)}const r=db.prepare('INSERT INTO partnerships(guild_id,company,contact,discord,website,status,start_date,end_date,offer,notes,ticket_id,discord_channel_id,proposal_message_id,price,proposal_status,staff_accepted_at,client_accepted_at,client_declined_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(d.guildId,d.company,d.contact||'',d.discord||'',d.website||'',d.status||'pending',d.startDate||null,d.endDate||null,d.offer||'',d.notes||'',d.ticketId||null,d.discordChannelId||null,d.proposalMessageId||null,d.price==null?null:Number(d.price),d.proposalStatus||'pending',d.staffAcceptedAt||null,d.clientAcceptedAt||null,d.clientDeclinedAt||null,now,now);return getPartnership(r.lastInsertRowid,d.guildId)}
export function setPartnershipPaymentProof(id,guildId,d){
  ensurePartnershipTermsColumns();
  const now=d.uploadedAt||new Date().toISOString();
  db.prepare('UPDATE partnerships SET payment_status=?,payment_proof_path=?,payment_proof_uploaded_at=?,payment_proof_uploaded_by=?,payment_proof_uploader_name=?,payment_proof_mime=?,payment_proof_original_name=?,payment_proof_sha256=?,updated_at=? WHERE id=? AND guild_id=?').run('paid',d.path,d.uploadedAt||now,d.uploadedBy||null,d.uploaderName||'Utilisateur',d.mime||null,d.originalName||null,d.sha256||null,now,id,guildId);
  return getPartnership(id,guildId);
}
export function clearPartnershipPaymentProof(id,guildId){
  ensurePartnershipTermsColumns();
  db.prepare('UPDATE partnerships SET payment_status=\'unpaid\',payment_proof_path=NULL,payment_proof_uploaded_at=NULL,payment_proof_uploaded_by=NULL,payment_proof_uploader_name=NULL,payment_proof_mime=NULL,payment_proof_original_name=NULL,payment_proof_sha256=NULL,updated_at=? WHERE id=? AND guild_id=?').run(new Date().toISOString(),id,guildId);
  return getPartnership(id,guildId);
}
export function getPartnershipByDiscordChannel(guildId,channelId){return db.prepare('SELECT * FROM partnerships WHERE guild_id=? AND discord_channel_id=?').get(guildId,channelId)}
export function findMatchingPartnership(guildId,{company='',discord=''}={}){
  const rows=getPartnerships(guildId);
  const norm=v=>String(v||'').trim().toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const companyKey=norm(company);
  const discordKey=String(discord||'').trim();
  return rows
    .filter(p=>(discordKey&&String(p.discord||'').trim()===discordKey)||(companyKey&&norm(p.company)===companyKey))
    .sort((a,b)=>Number(a.status!=='active')-Number(b.status!=='active')||Number(!!b.discord_channel_id)-Number(!!a.discord_channel_id)||Number(b.id)-Number(a.id))[0]||null;
}
export function mergePartnershipRecords(sourceId,targetId,guildId){
  if(Number(sourceId)===Number(targetId))return getPartnership(targetId,guildId);
  const source=getPartnership(sourceId,guildId),target=getPartnership(targetId,guildId);
  if(!source||!target)return target||source||null;
  const access=db.prepare('SELECT * FROM partnership_access WHERE partnership_id=?').get(source.id);
  const existingAccess=db.prepare('SELECT * FROM partnership_access WHERE partnership_id=?').get(target.id);
  const pick=(a,b)=>a!==null&&a!==undefined&&String(a)!==''?a:b;
  const merged={
    company:pick(target.company,source.company),
    contact:pick(target.contact,source.contact),
    discord:pick(target.discord,source.discord),
    website:pick(target.website,source.website),
    status:target.status==='active'||source.status!=='active'?target.status:source.status,
    startDate:pick(target.start_date,source.start_date),
    endDate:pick(target.end_date,source.end_date),
    offer:pick(target.offer,source.offer),
    notes:pick(target.notes,source.notes),
    ticketId:pick(target.ticket_id,source.ticket_id),
    discordChannelId:pick(target.discord_channel_id,source.discord_channel_id),
    price:target.price!=null?target.price:source.price,
    proposalMessageId:pick(target.proposal_message_id,source.proposal_message_id),
    proposalStatus:pick(target.proposal_status,source.proposal_status),
    staffAcceptedAt:pick(target.staff_accepted_at,source.staff_accepted_at),
    clientAcceptedAt:pick(target.client_accepted_at,source.client_accepted_at),
    clientDeclinedAt:pick(target.client_declined_at,source.client_declined_at),
    paymentStatus:(target.payment_status==='paid'||source.payment_status==='paid')?'paid':'unpaid',
    paymentProofPath:pick(target.payment_proof_path,source.payment_proof_path),
    paymentProofUploadedAt:pick(target.payment_proof_uploaded_at,source.payment_proof_uploaded_at),
    paymentProofUploadedBy:pick(target.payment_proof_uploaded_by,source.payment_proof_uploaded_by),
    paymentProofUploaderName:pick(target.payment_proof_uploader_name,source.payment_proof_uploader_name),
    paymentProofMime:pick(target.payment_proof_mime,source.payment_proof_mime),
    paymentProofOriginalName:pick(target.payment_proof_original_name,source.payment_proof_original_name),
    paymentProofSha256:pick(target.payment_proof_sha256,source.payment_proof_sha256)
  };
  const tx=db.transaction(()=>{
    db.prepare('UPDATE partnerships SET company=?,contact=?,discord=?,website=?,status=?,start_date=?,end_date=?,offer=?,notes=?,ticket_id=?,discord_channel_id=?,price=?,proposal_status=?,staff_accepted_at=?,client_accepted_at=?,client_declined_at=?,payment_status=?,payment_proof_path=?,payment_proof_uploaded_at=?,payment_proof_uploaded_by=?,payment_proof_uploader_name=?,payment_proof_mime=?,payment_proof_original_name=?,payment_proof_sha256=?,updated_at=? WHERE id=? AND guild_id=?').run(merged.company,merged.contact,merged.discord,merged.website,merged.status,merged.startDate,merged.endDate,merged.offer,merged.notes,merged.ticketId,merged.discordChannelId,merged.proposalMessageId,merged.price,merged.proposalStatus,merged.staffAcceptedAt,merged.clientAcceptedAt,merged.clientDeclinedAt,merged.paymentStatus,merged.paymentProofPath,merged.paymentProofUploadedAt,merged.paymentProofUploadedBy,merged.paymentProofUploaderName,merged.paymentProofMime,merged.paymentProofOriginalName,merged.paymentProofSha256,new Date().toISOString(),target.id,guildId);
    if(access){
      if(existingAccess)db.prepare('DELETE FROM partnership_access WHERE id=?').run(existingAccess.id);
      db.prepare('UPDATE partnership_access SET partnership_id=? WHERE id=?').run(target.id,access.id);
    }
    db.prepare('DELETE FROM partnerships WHERE id=? AND guild_id=?').run(source.id,guildId);
  });
  tx();
  return getPartnership(target.id,guildId);
}
export function deletePartnership(id,guildId){const r=db.prepare('DELETE FROM partnerships WHERE id=? AND guild_id=?').run(id,guildId);return r.changes>0}
export function createPartnershipAccess(partnershipId,tokenHash){const now=new Date().toISOString();db.prepare('INSERT INTO partnership_access(partnership_id,token_hash,created_at) VALUES(?,?,?) ON CONFLICT(partnership_id) DO UPDATE SET token_hash=excluded.token_hash,created_at=excluded.created_at,last_used_at=NULL').run(partnershipId,tokenHash,now);return db.prepare('SELECT * FROM partnership_access WHERE partnership_id=?').get(partnershipId)}
export function getPartnershipByAccessHash(tokenHash){const r=db.prepare('SELECT p.*,pa.token_hash FROM partnership_access pa JOIN partnerships p ON p.id=pa.partnership_id WHERE pa.token_hash=?').get(tokenHash);if(r)db.prepare('UPDATE partnership_access SET last_used_at=? WHERE partnership_id=?').run(new Date().toISOString(),r.id);return r||null}

export function purgeGuildData(guildId,{partnershipsOnly=false}={}){ensurePartnershipTermsColumns();const tx=db.transaction(()=>{if(partnershipsOnly){db.prepare('DELETE FROM partnership_access WHERE partnership_id IN (SELECT id FROM partnerships WHERE guild_id=?)').run(guildId);const r=db.prepare('DELETE FROM partnerships WHERE guild_id=?').run(guildId);return {partnerships:r.changes}}db.prepare('DELETE FROM partnership_access WHERE partnership_id IN (SELECT id FROM partnerships WHERE guild_id=?)').run(guildId);const counts={partnerships:db.prepare('DELETE FROM partnerships WHERE guild_id=?').run(guildId).changes,quota_entries:db.prepare('DELETE FROM quota_entries WHERE guild_id=?').run(guildId).changes,employees:db.prepare('DELETE FROM employees WHERE guild_id=?').run(guildId).changes,absences:db.prepare('DELETE FROM absences WHERE guild_id=?').run(guildId).changes,applications:db.prepare('DELETE FROM applications WHERE guild_id=?').run(guildId).changes,recruitments:db.prepare('DELETE FROM recruitments WHERE guild_id=?').run(guildId).changes,tickets:db.prepare('DELETE FROM tickets WHERE guild_id=?').run(guildId).changes,login_codes:db.prepare('DELETE FROM login_codes WHERE guild_id=?').run(guildId).changes,application_security:db.prepare('DELETE FROM application_security WHERE guild_id=?').run(guildId).changes};return counts});return tx()}
export function organisationStats(guildId){const employees=getEmployees(guildId);const active=employees.filter(x=>x.status==='active');const partnerships=getPartnerships(guildId);const now=new Date().toISOString().slice(0,10);const current=partnerships.filter(x=>x.status==='active'&&(!x.end_date||x.end_date>=now));return{employees:active.length,allEmployees:employees.length,roles:getHierarchy(guildId).length,partnerships:current.length,allPartnerships:partnerships.length,absences:getAbsences(guildId).filter(x=>x.end_date>=now).length,quotaTracked:active.filter(x=>x.quota_enabled).length}}


/* ─────────────────────────────────────────────────────────────
   ANNONCES & MESSAGERIE PRIVÉE
   ───────────────────────────────────────────────────────────── */
db.exec(`
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'employees',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id TEXT,
  author_name TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_announcements_guild_created ON announcements(guild_id,created_at);
CREATE TABLE IF NOT EXISTS announcement_reads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  announcement_id INTEGER NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  read_at TEXT NOT NULL,
  UNIQUE(announcement_id,recipient_type,recipient_id),
  FOREIGN KEY(announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_recipient ON announcement_reads(recipient_type,recipient_id);
CREATE TABLE IF NOT EXISTS private_mail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  conversation_key TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_private_mail_conversation ON private_mail(guild_id,conversation_key,id);
CREATE INDEX IF NOT EXISTS idx_private_mail_recipient ON private_mail(guild_id,recipient_type,recipient_id,read_at);
`);
const mailPartyKey=(type,id)=>String(type)+':'+String(id);
export function mailConversationKey(aType,aId,bType,bId){return [mailPartyKey(aType,aId),mailPartyKey(bType,bId)].sort().join('|')}
export function createAnnouncement(d){const now=new Date().toISOString();const r=db.prepare('INSERT INTO announcements(guild_id,audience,title,body,author_id,author_name,created_at) VALUES(?,?,?,?,?,?,?)').run(d.guildId,d.audience,d.title,d.body,d.authorId||null,d.authorName||'LS CUSTOM',now);return db.prepare('SELECT * FROM announcements WHERE id=?').get(r.lastInsertRowid)}
export function getAnnouncements(guildId,audience='employee',recipientType=null,recipientId=null,limit=100){
  const allowed=audience==='client'?['client','all']:audience==='employee'?['employees','all']:['employees','client','all'];
  const qs=allowed.map(()=>'?').join(',');
  return db.prepare(`SELECT a.*,CASE WHEN ar.id IS NULL THEN 0 ELSE 1 END AS is_read FROM announcements a LEFT JOIN announcement_reads ar ON ar.announcement_id=a.id AND ar.recipient_type=? AND ar.recipient_id=? WHERE a.guild_id=? AND a.audience IN (${qs}) ORDER BY a.id DESC LIMIT ?`)
    .all(recipientType||audience,recipientId||'',guildId,...allowed,Math.min(Math.max(Number(limit)||100,1),200));
}
export function markAnnouncementRead(id,guildId,recipientType,recipientId){const exists=db.prepare('SELECT id FROM announcements WHERE id=? AND guild_id=?').get(id,guildId);if(!exists)return false;db.prepare('INSERT INTO announcement_reads(announcement_id,recipient_type,recipient_id,read_at) VALUES(?,?,?,?) ON CONFLICT(announcement_id,recipient_type,recipient_id) DO UPDATE SET read_at=excluded.read_at').run(id,recipientType,String(recipientId),new Date().toISOString());return true}
export function deleteAnnouncement(id,guildId){const r=db.prepare('DELETE FROM announcements WHERE id=? AND guild_id=?').run(id,guildId);return r.changes>0}
export function getAnnouncementRecipients(guildId,audience){
  if(audience==='employees')return db.prepare("SELECT user_id AS id,display_name,username FROM employees WHERE guild_id=? AND status!='inactive' ORDER BY display_name,username").all(guildId);
  if(audience==='clients')return db.prepare("SELECT id,company AS display_name,contact AS username,discord FROM partnerships WHERE guild_id=? AND discord IS NOT NULL AND discord!='' ORDER BY company").all(guildId);
  const employees=db.prepare("SELECT user_id AS id,display_name,username FROM employees WHERE guild_id=? AND status!='inactive' ORDER BY display_name,username").all(guildId).map(x=>({...x,type:'employee'}));
  const clients=db.prepare("SELECT id,company AS display_name,contact AS username,discord FROM partnerships WHERE guild_id=? AND discord IS NOT NULL AND discord!='' ORDER BY company").all(guildId).map(x=>({...x,id:String(x.id),type:'client'}));
  return [...employees,...clients];
}
export function getMailContacts(guildId){
  const employees=db.prepare("SELECT user_id AS id,display_name,username,role_key,status FROM employees WHERE guild_id=? AND status!='inactive' ORDER BY display_name,username").all(guildId).map(x=>({type:'employee',id:String(x.id),name:x.display_name||x.username,username:x.username,role:x.role_key}));
  const clients=db.prepare("SELECT id,company AS name,contact,discord,status FROM partnerships WHERE guild_id=? AND discord IS NOT NULL AND discord!='' ORDER BY company").all(guildId).map(x=>({type:'client',id:String(x.id),name:x.name,username:x.contact||'',discord:x.discord,status:x.status}));
  return {employees,clients};
}
export function createPrivateMail(d){const now=new Date().toISOString();const key=mailConversationKey(d.senderType,d.senderId,d.recipientType,d.recipientId);const r=db.prepare('INSERT INTO private_mail(guild_id,conversation_key,sender_type,sender_id,sender_name,recipient_type,recipient_id,recipient_name,subject,body,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(d.guildId,key,d.senderType,String(d.senderId),d.senderName,d.recipientType,String(d.recipientId),d.recipientName,d.subject,d.body,now);return db.prepare('SELECT * FROM private_mail WHERE id=?').get(r.lastInsertRowid)}
export function getMailConversations(guildId,type,id){
  const meType=String(type),meId=String(id);
  const rows=db.prepare('SELECT m.*,(SELECT COUNT(*) FROM private_mail u WHERE u.guild_id=m.guild_id AND u.conversation_key=m.conversation_key AND u.recipient_type=? AND u.recipient_id=? AND u.read_at IS NULL) AS unread_count FROM private_mail m INNER JOIN (SELECT conversation_key,MAX(id) max_id FROM private_mail WHERE guild_id=? GROUP BY conversation_key) x ON x.max_id=m.id WHERE m.guild_id=? AND ((m.sender_type=? AND m.sender_id=?) OR (m.recipient_type=? AND m.recipient_id=?)) ORDER BY m.id DESC').all(meType,meId,guildId,guildId,meType,meId,meType,meId);
  return rows.map(m=>({conversation_key:m.conversation_key,subject:m.subject,preview:m.body.slice(0,180),created_at:m.created_at,unread_count:Number(m.unread_count)||0,other:m.sender_type===meType&&m.sender_id===meId?{type:m.recipient_type,id:m.recipient_id,name:m.recipient_name}:{type:m.sender_type,id:m.sender_id,name:m.sender_name}}));
}
export function getMailMessages(guildId,type,id,conversationKey){const allowed=db.prepare('SELECT 1 FROM private_mail WHERE guild_id=? AND conversation_key=? AND ((sender_type=? AND sender_id=?) OR (recipient_type=? AND recipient_id=?)) LIMIT 1').get(guildId,conversationKey,type,String(id),type,String(id));if(!allowed)return null;return db.prepare('SELECT * FROM private_mail WHERE guild_id=? AND conversation_key=? ORDER BY id ASC').all(guildId,conversationKey)}
export function markMailConversationRead(guildId,type,id,conversationKey){return db.prepare('UPDATE private_mail SET read_at=? WHERE guild_id=? AND conversation_key=? AND recipient_type=? AND recipient_id=? AND read_at IS NULL').run(new Date().toISOString(),guildId,conversationKey,type,String(id)).changes}

export function getLatestMailTargetForRecipient(guildId,type,id){
  const row=db.prepare('SELECT * FROM private_mail WHERE guild_id=? AND recipient_type=? AND recipient_id=? ORDER BY id DESC LIMIT 1').get(guildId,type,String(id));
  return row||null;
}
