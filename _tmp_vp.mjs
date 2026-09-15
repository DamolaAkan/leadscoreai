import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
const env=Object.fromEntries(readFileSync(".env.local","utf8").split("\n").filter(l=>l.includes("=")&&!l.trim().startsWith("#")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim()]}));
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
const BASE="https://app.leadscoreai.com";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const {data:org}=await sb.from("organizations").select("id,created_at").eq("slug","jasonenergies").single();
const pass="Verify"+Math.floor(Math.random()*9000+1000);
await sb.from("org_members").upsert({organization_id:org.id,full_name:"Verify Bot",username:"verifybot",password_hash:await bcrypt.hash(pass,10),role:"superadmin",is_active:true},{onConflict:"organization_id,username"});
const loginBot=async()=>{const r=await fetch(BASE+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orgSlug:"jasonenergies",username:"verifybot",password:pass})});return (await r.json()).session_id;};
const billing=async sid=>{const r=await fetch(BASE+"/api/dashboard/billing",{headers:{Authorization:"Bearer "+sid}});return r.json();};
let sid,b,ok=false;
for(let i=0;i<40;i++){sid=await loginBot();b=await billing(sid);if(b&&b.leadLimit!==undefined){ok=true;break;}process.stdout.write(".");await sleep(6000);}
if(!ok){console.log("\nDEPLOY NOT DETECTED. last:",JSON.stringify(b));}
else{
 console.log("\nDEPLOY LIVE ✓");
 console.log("Jason normal:",JSON.stringify({locked:b.locked,reason:b.reason,leadsUsed:b.leadsUsed,leadLimit:b.leadLimit,trialEndsAt:b.trialEndsAt}));
 await sb.from("organizations").update({created_at:new Date(Date.now()-40*864e5).toISOString()}).eq("id",org.id);
 const b2=await billing(await loginBot()); console.log("Jason forced 40d-old:",JSON.stringify({locked:b2.locked,reason:b2.reason}));
 await sb.from("organizations").update({created_at:org.created_at}).eq("id",org.id);
 const b3=await billing(await loginBot()); console.log("Jason reverted:",JSON.stringify({locked:b3.locked,reason:b3.reason}));
 console.log("RESULT:",(b.locked===false&&b2.locked===true&&b3.locked===false)?"ALL PASS ✓":"CHECK FAILED");
}
await sb.from("org_members").delete().eq("organization_id",org.id).eq("username","verifybot");
await sb.from("org_sessions").delete().eq("organization_id",org.id).is("member_id",null);
console.log("cleaned up");
