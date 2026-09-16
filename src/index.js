import 'dotenv/config';
import { startBot } from './bot.js';
import { startDashboard } from './dashboard.js';

for (const key of ['DISCORD_TOKEN','DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET']) if (!process.env[key]) console.warn(`⚠️ Variable ${key} absente`);
startDashboard();
startBot().catch(err=>{console.error('❌ Bot Discord:',err);process.exitCode=1;});
