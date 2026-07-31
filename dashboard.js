/** dashboard.js — the /admin web editor (single self-contained HTML page). */
export function dashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Auto-Reply Studio</title>
<style>
  :root{
    --bg:#f5f6f8; --surface:#ffffff; --surface-2:#fafbfc;
    --line:#e7e9ee; --line-2:#dfe2e8;
    --ink:#14161a; --body:#3d434d; --muted:#6b7280;
    --brand:#6d5df6; --brand-600:#5b48f0; --brand-tint:#f1effe; --brand-ring:rgba(109,93,246,.28);
    --good:#0f9d58; --good-tint:#e7f6ee; --danger:#e0484d; --danger-tint:#fdecec;
    --shadow-sm:0 1px 2px rgba(20,22,26,.05);
    --shadow-md:0 6px 24px -8px rgba(20,22,26,.12);
    --z-header:100; --z-savebar:100;
    --r-lg:16px; --r-md:11px; --r-sm:9px;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0;background:var(--bg);color:var(--body);
    font-family:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
  h1,h2,h3{color:var(--ink);margin:0;letter-spacing:-.01em;text-wrap:balance}
  a{color:var(--brand-600);text-decoration:none} a:hover{text-decoration:underline}
  .logo{width:34px;height:34px;border-radius:10px;flex:none;display:grid;place-items:center;color:#fff;font-size:17px;
    background:linear-gradient(135deg,#7c3aed 0%,#d6357f 55%,#f5871f 100%);box-shadow:var(--shadow-sm)}

  /* header */
  header{position:sticky;top:0;z-index:var(--z-header);background:rgba(255,255,255,.9);backdrop-filter:saturate(1.4) blur(8px);
    border-bottom:1px solid var(--line);padding:12px 22px;display:flex;align-items:center;gap:12px}
  header h1{font-size:16px;font-weight:650}
  header .brandwrap{display:flex;align-items:center;gap:11px}
  header .sub{color:var(--muted);font-size:12.5px;font-weight:500;margin-top:1px}
  .sp{flex:1}

  main{max-width:920px;margin:0 auto;padding:26px 22px 120px}

  /* tabs */
  .tabs{display:flex;gap:4px;padding:5px;background:var(--surface);border:1px solid var(--line);
    border-radius:var(--r-md);margin:0 0 22px;box-shadow:var(--shadow-sm);overflow-x:auto}
  .tabs button{flex:1;min-width:max-content;background:transparent;border:0;color:var(--muted);font:inherit;font-weight:600;
    font-size:13.5px;padding:9px 14px;border-radius:8px;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}
  .tabs button:hover{color:var(--ink);background:var(--surface-2)}
  .tabs button.on{background:var(--brand);color:#fff;box-shadow:var(--shadow-sm)}

  /* cards */
  .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);
    padding:22px;margin:0 0 18px;box-shadow:var(--shadow-sm)}
  .card h2{font-size:16.5px;font-weight:650}
  .hint{color:var(--muted);font-size:13.5px;margin:5px 0 18px;max-width:70ch}
  .hint b{color:var(--body);font-weight:600}

  label{display:block;font-size:12px;font-weight:600;color:var(--ink);margin:14px 0 5px;letter-spacing:.005em}
  input,textarea,select{width:100%;background:var(--surface);border:1px solid var(--line-2);color:var(--ink);
    border-radius:var(--r-sm);padding:10px 12px;font:inherit;font-size:14px;transition:border-color .15s,box-shadow .15s}
  input::placeholder,textarea::placeholder{color:#9aa1ac}
  input:focus,textarea:focus,select:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-ring)}
  textarea{min-height:62px;resize:vertical;line-height:1.5}
  select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8.5 1.5 4h9z'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 11px center;padding-right:30px;cursor:pointer}

  button{font:inherit;font-weight:600;font-size:14px;border-radius:var(--r-sm);padding:10px 16px;cursor:pointer;
    border:1px solid transparent;transition:background .15s,border-color .15s,transform .06s,box-shadow .15s}
  button:active{transform:translateY(1px)}
  .btn{background:var(--brand);color:#fff;box-shadow:var(--shadow-sm)} .btn:hover{background:var(--brand-600)}
  .ghost{background:var(--surface);border-color:var(--line-2);color:var(--ink)} .ghost:hover{background:var(--surface-2);border-color:var(--muted)}
  .danger{background:transparent;border-color:var(--danger);color:var(--danger)} .danger:hover{background:var(--danger-tint)}
  .sm{padding:7px 12px;font-size:13px;border-radius:8px}

  .toggle{display:flex;align-items:center;gap:14px;padding:15px 16px;border:1px solid var(--line);border-radius:var(--r-md);background:var(--surface-2);margin:0 0 16px}
  .toggle .tl{flex:1;min-width:0} .toggle .tl b{display:block;color:var(--ink);font-size:14px;font-weight:650}
  .toggle .tl span{color:var(--muted);font-size:12.5px}
  .toggle .state{font-size:12px;font-weight:700;color:var(--muted);min-width:26px;text-align:right}
  .switch{position:relative;width:46px;height:27px;flex:none}
  .switch input{position:absolute;opacity:0;width:0;height:0}
  .switch .track{position:absolute;inset:0;background:#c9ced8;border-radius:999px;transition:background .18s;cursor:pointer}
  .switch .track:before{content:'';position:absolute;top:3px;left:3px;width:21px;height:21px;background:#fff;border-radius:50%;box-shadow:var(--shadow-sm);transition:transform .18s}
  .switch input:checked + .track{background:var(--good)}
  .switch input:checked + .track:before{transform:translateX(19px)}
  .switch input:focus-visible + .track{box-shadow:0 0 0 3px var(--brand-ring)}
  .rule{border:1px solid var(--line);border-radius:var(--r-md);padding:16px;margin:12px 0;background:var(--surface-2)}
  .rule label:first-child{margin-top:0}
  .row{display:flex;gap:10px;flex-wrap:wrap} .row>*{flex:1;min-width:200px}

  /* save bar */
  .save-bar{position:fixed;bottom:0;left:0;right:0;z-index:var(--z-savebar);background:rgba(255,255,255,.92);
    backdrop-filter:blur(8px);border-top:1px solid var(--line);padding:12px 22px;display:flex;align-items:center;gap:14px}
  .save-bar .inner{max-width:920px;margin:0 auto;width:100%;display:flex;align-items:center;gap:14px}
  .toast{font-size:13px;font-weight:600;opacity:0;transition:opacity .2s}
  .toast.show{opacity:1} .toast.ok{color:var(--good)} .toast.err{color:var(--danger)}
  .save-note{color:var(--muted);font-size:12.5px}

  /* posts */
  .post{border:1px solid var(--line);border-radius:var(--r-md);padding:14px;margin:10px 0;background:var(--surface)}
  .post .head{display:flex;gap:14px;align-items:center}
  .post img{width:60px;height:60px;object-fit:cover;border-radius:9px;background:#eceef2;flex:none}
  .post .cap{flex:1;font-size:13.5px;color:var(--body);line-height:1.4;max-height:42px;overflow:hidden}
  .post select{max-width:210px;flex:none}
  .post .custom{margin-top:14px;border-top:1px solid var(--line);padding-top:14px}
  .badge{display:inline-block;font-size:11px;font-weight:700;color:var(--brand-600);background:var(--brand-tint);
    padding:2px 8px;border-radius:999px;margin-left:8px;vertical-align:middle}

  /* login */
  .center{min-height:100dvh;display:grid;place-items:center;padding:24px}
  .login{width:100%;max-width:380px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);
    padding:30px;box-shadow:var(--shadow-md);text-align:center}
  .login .logo{width:46px;height:46px;font-size:22px;border-radius:13px;margin:0 auto 16px}
  .login h2{font-size:19px;font-weight:680} .login p{color:var(--muted);font-size:13.5px;margin:6px 0 20px}
  .login input{text-align:center} .login .btn{width:100%;margin-top:12px;padding:11px}
  .login .msg{color:var(--danger);font-size:13px;font-weight:600;margin-top:12px;min-height:18px}

  @media (max-width:560px){
    .post .head{flex-wrap:wrap} .post select{max-width:none;width:100%}
    main{padding:18px 16px 120px} header{padding:12px 16px} .save-bar{padding:12px 16px}
  }
  @media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<div id="app"></div>
<script>
const $ = (s,el=document)=>el.querySelector(s);
let RULES=null, MEDIA=[], TAB='comments';

async function api(path, opts={}){
  const r = await fetch(path,{headers:{'Content-Type':'application/json'},...opts});
  if(r.status===401){renderLogin('Please log in.');throw new Error('401');}
  return r.json();
}
function toast(msg,ok=true){const t=$('#toast');if(t){t.textContent=msg;t.className='toast show '+(ok?'ok':'err');}}

// ---------- Login ----------
function renderLogin(msg=''){
  document.getElementById('app').innerHTML=\`
   <div class="center">
     <div class="login">
       <div class="logo">💬</div>
       <h2>Auto-Reply Studio</h2>
       <p>Sign in to manage your Instagram replies.</p>
       <input id="pw" type="password" placeholder="Dashboard password" onkeydown="if(event.key==='Enter')doLogin()">
       <button class="btn" onclick="doLogin()">Log in</button>
       <div class="msg" id="lmsg">\${msg}</div>
     </div>
   </div>\`;
  const p=$('#pw'); if(p) p.focus();
}
async function doLogin(){
  const r = await fetch('/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('#pw').value})});
  const j = await r.json();
  if(j.ok){boot();} else {$('#lmsg').textContent=j.error||'Wrong password';}
}
async function logout(){await fetch('/admin/logout',{method:'POST'});renderLogin('You have been logged out.');}

// ---------- Boot ----------
async function boot(){
  try{ RULES = await api('/admin/rules'); }catch(e){return;}
  RULES.defaultCommentRules ||= []; RULES.defaultDmRules ||= [];
  RULES.categories ||= {}; RULES.postAssignments ||= {};
  renderApp();
}

const TABS=[['comments','Comment replies'],['dms','DM replies'],['categories','Categories'],['posts','Per-video replies']];
function renderApp(){
  document.getElementById('app').innerHTML=\`
    <header>
      <div class="brandwrap"><div class="logo">💬</div>
        <div><h1>Auto-Reply Studio</h1><div class="sub">Instagram comment &amp; DM automation</div></div></div>
      <div class="sp"></div>
      <button class="ghost sm" onclick="logout()">Log out</button>
    </header>
    <main>
      <div class="tabs">\${TABS.map(([t,l])=>\`<button data-t="\${t}">\${l}</button>\`).join('')}</div>
      <div id="panel"></div>
    </main>
    <div class="save-bar"><div class="inner">
      <button class="btn" onclick="save()">Save changes</button>
      <span id="toast" class="toast"></span>
      <div class="sp"></div><span class="save-note">Live within a few seconds of saving</span>
    </div></div>\`;
  document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{TAB=b.dataset.t;paint();});
  paint();
}

function toggleRow(field,deflt,label,sub){
  const on = RULES[field]===undefined?deflt:!!RULES[field];
  return \`<div class="toggle"><div class="tl"><b>\${label}</b><span>\${sub}</span></div>
    <span class="state">\${on?'ON':'OFF'}</span>
    <label class="switch"><input type="checkbox" \${on?'checked':''} onchange="RULES.\${field}=this.checked;paint()"><span class="track"></span></label></div>\`;
}
function paint(){
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===TAB));
  const p=$('#panel');
  if(TAB==='comments') p.innerHTML=toggleRow('commentsEnabled',true,'Comment auto-replies','Master switch. When off, the bot ignores all comments.')+commentRulesUI(RULES.defaultCommentRules,'defaultCommentRules','Default comment replies','Used on any post that has no category or custom rule assigned.');
  else if(TAB==='dms') p.innerHTML=dmRulesUI();
  else if(TAB==='categories') p.innerHTML=categoriesUI();
  else p.innerHTML=postsUI();
  if(TAB==='posts') loadMedia();
}

// ---------- Comment rules editor (reused for default + categories) ----------
function commentRulesUI(list, path, title, hint){
  return \`<div class="card"><h2>\${title}</h2>\${hint?\`<p class="hint">\${hint}</p>\`:'<div style="height:12px"></div>'}
    <div id="rules_\${path}">\${list.map((r,i)=>ruleRow(r,i,path)).join('')}</div>
    <button class="ghost sm" onclick="addRule('\${path}')">+ Add rule</button></div>\`;
}
function ruleRow(r,i,path){
  return \`<div class="rule">
    <label>Rule name</label><input value="\${esc(r.name||'')}" oninput="upd('\${path}',\${i},'name',this.value)">
    <label>Trigger keywords <span style="color:var(--muted);font-weight:500">(comma-separated, or leave empty to match every comment)</span></label>
    <input value="\${esc((r.keywords||[]).join(', '))}" oninput="updKw('\${path}',\${i},this.value)" placeholder="price, cost, how much">
    <label>Public replies <span style="color:var(--muted);font-weight:500">(one per line, a random one is posted under the comment)</span></label>
    <textarea oninput="updLines('\${path}',\${i},'publicReplies',this.value)" placeholder="Check your DMs! ✨">\${esc((r.publicReplies||[]).join('\\n'))}</textarea>
    <label>Private DM to the commenter <span style="color:var(--muted);font-weight:500">(leave empty to send no DM)</span></label>
    <textarea oninput="upd('\${path}',\${i},'dm',this.value)" placeholder="Here are the details you asked for…">\${esc(r.dm||'')}</textarea>
    <div style="height:12px"></div><button class="danger sm" onclick="delRule('\${path}',\${i})">Delete rule</button>
  </div>\`;
}
function listByPath(path){
  if(path==='defaultCommentRules') return RULES.defaultCommentRules;
  if(path.startsWith('cat:')) return RULES.categories[path.slice(4)].commentRules;
  if(path.startsWith('post:')){ const id=path.slice(5); RULES.postAssignments[id]=RULES.postAssignments[id]||{}; RULES.postAssignments[id].commentRules=RULES.postAssignments[id].commentRules||[]; return RULES.postAssignments[id].commentRules; }
  return [];
}
function upd(path,i,k,v){listByPath(path)[i][k]=v;}
function updKw(path,i,v){listByPath(path)[i].keywords=v.split(',').map(s=>s.trim()).filter(Boolean);}
function updLines(path,i,k,v){listByPath(path)[i][k]=v.split('\\n').map(s=>s.trim()).filter(Boolean);}
function addRule(path){listByPath(path).push({name:'new rule',keywords:[],publicReplies:[],dm:''});paint();}
function delRule(path,i){listByPath(path).splice(i,1);paint();}

// ---------- DM rules ----------
function dmRulesUI(){
  const L=RULES.defaultDmRules;
  return \`\${toggleRow('dmEnabled',true,'DM auto-replies','Master switch. When off, the bot never replies to direct messages.')}
    <div class="card"><h2>DM replies</h2><p class="hint">Auto-answers when someone sends your account a direct message.</p>
    <div>\${L.map((r,i)=>\`<div class="rule">
      <label>Rule name</label><input value="\${esc(r.name||'')}" oninput="RULES.defaultDmRules[\${i}].name=this.value">
      <label>Trigger keywords <span style="color:var(--muted);font-weight:500">(comma-separated, empty matches all)</span></label>
      <input value="\${esc((r.keywords||[]).join(', '))}" oninput="RULES.defaultDmRules[\${i}].keywords=this.value.split(',').map(s=>s.trim()).filter(Boolean)" placeholder="hi, hello, price">
      <label>Reply</label><textarea oninput="RULES.defaultDmRules[\${i}].reply=this.value" placeholder="Hey! How can I help?">\${esc(r.reply||'')}</textarea>
      <div style="height:12px"></div><button class="danger sm" onclick="RULES.defaultDmRules.splice(\${i},1);paint()">Delete</button>
    </div>\`).join('')}</div>
    <button class="ghost sm" onclick="RULES.defaultDmRules.push({name:'new',keywords:[],reply:''});paint()">+ Add DM rule</button>
    </div>
    \${toggleRow('dmFallbackEnabled',false,'Reply to messages that don\\'t match any keyword','Off = the bot only replies to the keywords above. On = it also sends the fallback below to everyone else.')}
    \${(RULES.dmFallbackEnabled)?\`<div class="card"><label style="margin-top:0">Fallback reply</label>
      <textarea oninput="RULES.dmFallback=this.value" placeholder="Thanks for your message! We'll reply shortly.">\${esc(RULES.dmFallback||'')}</textarea></div>\`:''}\`;
}

// ---------- Categories ----------
function categoriesUI(){
  const names=Object.keys(RULES.categories);
  return \`<div class="card"><h2>Categories</h2>
    <p class="hint">A category is a named set of comment replies (e.g. "fitness"). Create them here, then apply them to posts in the "Per-video replies" tab.</p>
    <div class="row"><input id="newcat" placeholder="New category name, e.g. cooking" onkeydown="if(event.key==='Enter')addCat()">
    <button class="btn sm" style="flex:0;white-space:nowrap" onclick="addCat()">+ Create category</button></div></div>
    \${names.length?names.map(n=>\`<div class="card"><div class="row" style="align-items:center;margin-bottom:4px">
      <h2 style="flex:1">\${esc(n)}</h2>
      <button class="danger sm" style="flex:0;white-space:nowrap" onclick="delCat('\${esc(n)}')">Delete</button></div>
      \${commentRulesUI(RULES.categories[n].commentRules,'cat:'+n,'','')}</div>\`).join('')
      :'<div class="card"><p class="hint" style="margin:0">No categories yet. Create one above to reuse the same replies across similar videos.</p></div>'}\`;
}
function addCat(){const el=$('#newcat');const n=(el?el.value:'').trim();if(!n)return;if(!RULES.categories[n])RULES.categories[n]={commentRules:[]};paint();}
function delCat(n){if(confirm('Delete category "'+n+'"?')){delete RULES.categories[n];
  Object.keys(RULES.postAssignments).forEach(k=>{if(RULES.postAssignments[k].category===n)delete RULES.postAssignments[k];});paint();}}

// ---------- Per-video replies ----------
function postsUI(){
  return \`<div class="card"><h2>Set replies for each video</h2>
    <p class="hint">Choose what happens when someone comments on each post or reel: use your <b>Default</b> replies, apply a <b>category</b>, or write <b>custom keywords and a reply just for that video</b>.</p>
    <div id="posts"><p class="hint" style="margin:0">Loading your posts…</p></div></div>\`;
}
async function loadMedia(){
  try{const j=await api('/admin/media');MEDIA=j.media||[];}catch(e){return;}
  const box=$('#posts'); if(!box)return;
  if(!MEDIA.length){box.innerHTML='<p class="hint" style="margin:0">No posts found yet. If your account has media, click Save once and reopen this tab.</p>';return;}
  box.innerHTML=MEDIA.map(m=>postCard(m)).join('');
}
function postMode(id){ const a=RULES.postAssignments[id]; if(a&&Array.isArray(a.commentRules)) return 'custom'; if(a&&a.category) return 'cat:'+a.category; return ''; }
function postCard(m){
  const cats=Object.keys(RULES.categories);
  const mode=postMode(m.id);
  const thumb=m.thumbnail_url||m.media_url||'';
  const cap=esc((m.caption||'(no caption)').slice(0,90));
  const link=m.permalink?\` <a href="\${esc(m.permalink)}" target="_blank" rel="noopener">view</a>\`:'';
  const tag=mode==='custom'?'<span class="badge">custom</span>':(mode.startsWith('cat:')?'<span class="badge">'+esc(mode.slice(4))+'</span>':'');
  return \`<div class="post">
    <div class="head">
      <img src="\${thumb}" alt="" onerror="this.style.visibility='hidden'">
      <div class="cap">\${cap}\${link}\${tag}</div>
      <select onchange="setPostMode('\${m.id}',this.value)">
        <option value="" \${mode===''?'selected':''}>Default replies</option>
        <option value="custom" \${mode==='custom'?'selected':''}>Custom for this video</option>
        \${cats.map(c=>\`<option value="cat:\${esc(c)}" \${mode==='cat:'+c?'selected':''}>Category: \${esc(c)}</option>\`).join('')}
      </select>
    </div>
    \${mode==='custom'?\`<div class="custom">
      <div id="rules_post:\${m.id}">\${(RULES.postAssignments[m.id].commentRules||[]).map((r,i)=>ruleRow(r,i,'post:'+m.id)).join('')}</div>
      <button class="ghost sm" onclick="addRule('post:\${m.id}')">+ Add a keyword &amp; reply for this video</button>
    </div>\`:''}
  </div>\`;
}
function setPostMode(id,val){
  if(val==='custom'){ RULES.postAssignments[id]={commentRules:(RULES.postAssignments[id]&&RULES.postAssignments[id].commentRules)||[{name:'rule',keywords:[],publicReplies:[],dm:''}]}; }
  else if(val.startsWith('cat:')){ RULES.postAssignments[id]={category:val.slice(4)}; }
  else { delete RULES.postAssignments[id]; }
  loadMedia();
}

// ---------- Save ----------
async function save(){
  try{const j=await api('/admin/rules',{method:'POST',body:JSON.stringify(RULES)});
    if(j.ok)toast('Saved. Your changes are live.');else toast(j.error||'Save failed',false);
  }catch(e){toast('Save failed: '+e.message,false);}
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ---------- Start ----------
boot().catch(()=>renderLogin());
</script>
</body></html>`;
}
