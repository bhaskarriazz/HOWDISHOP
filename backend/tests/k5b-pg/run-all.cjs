#!/usr/bin/env node
'use strict';
require('dotenv').config({path:require('node:path').join(__dirname,'../../.env')});
const {Pool}=require('pg'),{spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const base=process.env.DATABASE_URL;if(!base){console.error('DATABASE_URL is required.');process.exit(2);}
const withDb=n=>{const u=new URL(base);u.pathname='/'+n;return u.toString();};
(async()=>{const name='howdi_k5b_smoke_'+Date.now().toString(36),admin=new Pool({connectionString:withDb('postgres')});let passed=0,failed=0,dropped=false;try{await admin.query(`CREATE DATABASE "${name}"`);for(const f of fs.readdirSync(__dirname).filter(x=>/^\d\d-.*\.cjs$/.test(x)).sort()){const child=spawn(process.execPath,[path.join(__dirname,f)],{env:{...process.env,K5B_PG_URL:withDb(name)},stdio:'inherit'});const code=await new Promise(ok=>child.on('close',ok));if(code===0)passed++;else failed++;}}finally{try{await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);dropped=true;}finally{await admin.end();console.log(`K5B PG suites: ${passed} passed, ${failed} failed`);console.log(`Scratch DB dropped: ${dropped?'yes':'no'}`);}}process.exit(failed?1:0);})().catch(e=>{console.error(e.message);process.exit(1)});
