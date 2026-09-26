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
`);

export function getHierarchy(guildId){return db.prepare("SELECT h.*,COALESCE(rp.permissions_json,'[]') AS permissions_json FROM hierarchy_roles h LEFT JOIN role_permissions rp ON rp.guild_id=h.guild_id AND rp.role_key=h.role_key WHERE h.guild_id=? ORDER BY h.level DESC,h.id ASC").all(guildId)}
export function getRolePermissions(guildId,roleKey){const r=db.prepare('SELECT permissions_json FROM role_permissions WHERE guild_id=? AND role_key=?').get(guildId,roleKey);try{return JSON.parse(r?.permissions_json||'[]')}catch{return[]}}
export function setRolePermissions(guildId,roleKey,permissions=[]){db.prepare("INSERT INTO role_permissions(guild_id,role_key,permissions_json) VALUES(?,?,?) ON CONFLICT(guild_id,role_key) DO UPDATE SET permissions_json=excluded.permissions_json").run(guildId,roleKey,JSON.stringify([...new Set(permissions)]));return getRolePermissions(guildId,roleKey)}
export function getPermissionsForDiscordRoles(guildId,discordRoleIds=[]){const rows=db.prepare("SELECT h.role_key,h.name,h.level,h.discord_role_id,COALESCE(rp.permissions_json,'[]') AS permissions_json FROM hierarchy_roles h LEFT JOIN role_permissions rp ON rp.guild_id=h.guild_id AND rp.role_key=h.role_key WHERE h.guild_id=? AND h.discord_role_id IS NOT NULL").all(guildId);const ids=new Set((discordRoleIds||[]).map(String));const matched=rows.filter(r=>ids.has(String(r.discord_role_id))).sort((a,b)=>b.level-a.level);const permissions=new Set();for(const r of matched){try{for(const p of JSON.parse(r.permissions_json||'[]'))permissions.add(p)}catch{}const n=String(r.name||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();if(/chef|rh|drh|direction|gerant|developpeur/.test(n)){permissions.add('team');permissions.add('activity_all')}if(/direction|gerant|developpeur|drh|partenariat/.test(n))permissions.add('partnerships')}return{roles:matched.map(r=>({key:r.role_key,name:r.name,level:r.level,discordRoleId:r.discord_role_id})),permissions:[...permissions]}}


for(const sql of [
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

export function createAbsence(d){const now=new Date().toISOString();const r=db.prepare('INSERT INTO absences(guild_id,user_id,username,start_date,end_date,type,reason,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(d.guildId,d.userId,d.username,d.startDate,d.endDate,d.type||'indisponible',d.reason||'',now,now);return getAbsence(r.lastInsertRowid,d.guildId)}
export function getAbsence(id,guildId){return db.prepare('SELECT * FROM absences WHERE id=? AND guild_id=?').get(id,guildId)}
export function getAbsences(guildId,startDate,endDate){if(startDate&&endDate)return db.prepare('SELECT * FROM absences WHERE guild_id=? AND start_date<=? AND end_date>=? ORDER BY start_date ASC,end_date ASC,username ASC').all(guildId,endDate,startDate);return db.prepare('SELECT * FROM absences WHERE guild_id=? ORDER BY start_date ASC,end_date ASC,username ASC').all(guildId)}
export function getAbsencesForUser(guildId,userId){return db.prepare('SELECT * FROM absences WHERE guild_id=? AND user_id=? ORDER BY start_date DESC,end_date DESC').all(guildId,userId)}
export function deleteAbsence(id,guildId,userId=null){const r=userId?db.prepare('DELETE FROM absences WHERE id=? AND guild_id=? AND user_id=?').run(id,guildId,userId):db.prepare('DELETE FROM absences WHERE id=? AND guild_id=?').run(id,guildId);return r.changes>0}

export function getHierarchy(guildId){return db.prepare('SELECT * FROM hierarchy_roles WHERE guild_id=? ORDER BY level DESC,id ASC').all(guildId)}
export function getHierarchyRole(id,guildId){return db.prepare('SELECT * FROM hierarchy_roles WHERE id=? AND guild_id=?').get(id,guildId)}
export function upsertHierarchyRole(d){const now=new Date().toISOString();const existing=db.prepare('SELECT id FROM hierarchy_roles WHERE guild_id=? AND role_key=?').get(d.guildId,d.roleKey);if(existing){db.prepare('UPDATE hierarchy_roles SET name=?,level=?,discord_role_id=?,color=?,description=? WHERE id=? AND guild_id=?').run(d.name,d.level||0,d.discordRoleId||null,d.color||null,d.description||'',existing.id);return getHierarchyRole(existing.id,d.guildId)}const r=db.prepare('INSERT INTO hierarchy_roles(guild_id,role_key,name,level,discord_role_id,color,description) VALUES(?,?,?,?,?,?,?)').run(d.guildId,d.roleKey,d.name,d.level||0,d.discordRoleId||null,d.color||null,d.description||'');return getHierarchyRole(r.lastInsertRowid,d.guildId)}
export function deleteHierarchyRole(id,guildId){const r=db.prepare('DELETE FROM hierarchy_roles WHERE id=? AND guild_id=?').run(id,guildId);return r.changes>0}

export function getEmployees(guildId,status=null){return status?db.prepare('SELECT e.*,h.name AS role_name,h.level AS role_level,h.discord_role_id,h.color AS role_color FROM employees e LEFT JOIN hierarchy_roles h ON h.guild_id=e.guild_id AND h.role_key=e.role_key WHERE e.guild_id=? AND e.status=? ORDER BY COALESCE(h.level,-1) DESC,e.display_name,e.username').all(guildId,status):db.prepare('SELECT e.*,h.name AS role_name,h.level AS role_level,h.discord_role_id,h.color AS role_color FROM employees e LEFT JOIN hierarchy_roles h ON h.guild_id=e.guild_id AND h.role_key=e.role_key WHERE e.guild_id=? ORDER BY COALESCE(h.level,-1) DESC,e.display_name,e.username').all(guildId)}
export function getEmployee(id,guildId){return db.prepare('SELECT e.*,h.name AS role_name,h.level AS role_level,h.discord_role_id,h.color AS role_color FROM employees e LEFT JOIN hierarchy_roles h ON h.guild_id=e.guild_id AND h.role_key=e.role_key WHERE e.id=? AND e.guild_id=?').get(id,guildId)}
export function upsertEmployee(d){const now=new Date().toISOString();const existing=db.prepare('SELECT id FROM employees WHERE guild_id=? AND user_id=?').get(d.guildId,d.userId);if(existing){db.prepare('UPDATE employees SET username=?,display_name=?,role_key=?,status=?,joined_at=?,quota_enabled=?,quota_target=?,notes=?,updated_at=? WHERE id=? AND guild_id=?').run(d.username,d.displayName||d.username,d.roleKey||null,d.status||'active',d.joinedAt||null,d.quotaEnabled===false?0:1,Number(d.quotaTarget)||0,d.notes||'',now,existing.id,d.guildId);return getEmployee(existing.id,d.guildId)}const r=db.prepare('INSERT INTO employees(guild_id,user_id,username,display_name,role_key,status,joined_at,quota_enabled,quota_target,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(d.guildId,d.userId,d.username,d.displayName||d.username,d.roleKey||null,d.status||'active',d.joinedAt||null,d.quotaEnabled===false?0:1,Number(d.quotaTarget)||0,d.notes||'',now,now);return getEmployee(r.lastInsertRowid,d.guildId)}
export function deleteEmployee(id,guildId){const r=db.prepare('DELETE FROM employees WHERE id=? AND guild_id=?').run(id,guildId);return r.changes>0}
export function getQuotaEntries(guildId,startDate,endDate){const rows=db.prepare('SELECT q.*,e.user_id,e.username,e.display_name,e.role_key,h.name AS role_name,h.level AS role_level,e.quota_target,e.quota_enabled FROM quota_entries q JOIN employees e ON e.id=q.employee_id LEFT JOIN hierarchy_roles h ON h.guild_id=e.guild_id AND h.role_key=e.role_key WHERE q.guild_id=? AND q.period_start=? AND q.period_end=? ORDER BY COALESCE(h.level,-1) DESC,e.display_name,e.username').all(guildId,startDate,endDate);return rows}
export function upsertQuota(d){const now=new Date().toISOString();const values=[Number(d.appels)||0,Number(d.reparations)||0,Number(d.fourrieres)||0,Number(d.personnalisations)||0,Number(d.factures)||0,Number(d.montantFourrieres)||0,Number(d.montantPersonnalisations)||0,Number(d.montantFactures)||0,d.note||''];const existing=db.prepare('SELECT id FROM quota_entries WHERE employee_id=? AND period_start=? AND period_end=?').get(d.employeeId,d.periodStart,d.periodEnd);if(existing){db.prepare('UPDATE quota_entries SET appels=?,reparations=?,fourrieres=?,personnalisations=?,factures=?,montant_fourrieres=?,montant_personnalisations=?,montant_factures=?,note=?,updated_at=? WHERE id=?').run(...values,now,existing.id);return getQuotaEntry(existing.id,d.guildId)}const r=db.prepare('INSERT INTO quota_entries(guild_id,employee_id,period_start,period_end,appels,reparations,fourrieres,personnalisations,factures,montant_fourrieres,montant_personnalisations,montant_factures,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(d.guildId,d.employeeId,d.periodStart,d.periodEnd,...values,now,now);return getQuotaEntry(r.lastInsertRowid,d.guildId)}
export function getQuotaEntry(id,guildId){return db.prepare('SELECT q.*,e.username,e.display_name,e.role_key,h.name AS role_name,e.quota_target,e.quota_enabled FROM quota_entries q JOIN employees e ON e.id=q.employee_id LEFT JOIN hierarchy_roles h ON h.guild_id=e.guild_id AND h.role_key=e.role_key WHERE q.id=? AND q.guild_id=?').get(id,guildId)}

export function getPartnerships(guildId,status=null){return status?db.prepare('SELECT * FROM partnerships WHERE guild_id=? AND status=? ORDER BY COALESCE(start_date,created_at) DESC,id DESC').all(guildId,status):db.prepare('SELECT * FROM partnerships WHERE guild_id=? ORDER BY COALESCE(start_date,created_at) DESC,id DESC').all(guildId)}
export function getPartnership(id,guildId){return db.prepare('SELECT * FROM partnerships WHERE id=? AND guild_id=?').get(id,guildId)}
export function upsertPartnership(d){const now=new Date().toISOString();if(d.id){db.prepare('UPDATE partnerships SET company=?,contact=?,discord=?,website=?,status=?,start_date=?,end_date=?,offer=?,notes=?,ticket_id=?,discord_channel_id=?,updated_at=? WHERE id=? AND guild_id=?').run(d.company,d.contact||'',d.discord||'',d.website||'',d.status||'active',d.startDate||null,d.endDate||null,d.offer||'',d.notes||'',d.ticketId||null,d.discordChannelId||null,now,d.id,d.guildId);return getPartnership(d.id,d.guildId)}const r=db.prepare('INSERT INTO partnerships(guild_id,company,contact,discord,website,status,start_date,end_date,offer,notes,ticket_id,discord_channel_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(d.guildId,d.company,d.contact||'',d.discord||'',d.website||'',d.status||'active',d.startDate||null,d.endDate||null,d.offer||'',d.notes||'',d.ticketId||null,d.discordChannelId||null,now,now);return getPartnership(r.lastInsertRowid,d.guildId)}
export function getPartnershipByDiscordChannel(guildId,channelId){return db.prepare('SELECT * FROM partnerships WHERE guild_id=? AND discord_channel_id=?').get(guildId,channelId)}
export function deletePartnership(id,guildId){const r=db.prepare('DELETE FROM partnerships WHERE id=? AND guild_id=?').run(id,guildId);return r.changes>0}

export function organisationStats(guildId){const employees=getEmployees(guildId);const active=employees.filter(x=>x.status==='active');const partnerships=getPartnerships(guildId);const now=new Date().toISOString().slice(0,10);const current=partnerships.filter(x=>x.status==='active'&&(!x.end_date||x.end_date>=now));return{employees:active.length,allEmployees:employees.length,roles:getHierarchy(guildId).length,partnerships:current.length,allPartnerships:partnerships.length,absences:getAbsences(guildId).filter(x=>x.end_date>=now).length,quotaTracked:active.filter(x=>x.quota_enabled).length}}
