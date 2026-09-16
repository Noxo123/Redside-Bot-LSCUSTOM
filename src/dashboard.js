import express from 'express';
import session from 'express-session';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import db,{getRecruitments,getRecruitment,createRecruitment,createApplication,hasRecentApplication,getApplications,getApplicationsForUser,updateApplication,getSetting,setSetting,stats,audit,getAuditLogs,createTicket,getTickets,getTicketsForUser,setTicketStatus,setRecruitmentStatus} from './db.js';

app.get('/api/guilds/:guildId/applications',auth,(req,res)=>allowed(req,req.params.guildId)?res.json(getApplications(req.params.guildId,req.query.status||null).map(a=>({...a,answers:parseJson(a.answers_json,{}),attachments:parseJson(a.attachments_json,[]}))):res.sendStatus(403));
