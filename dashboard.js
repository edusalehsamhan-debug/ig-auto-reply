/** dashboard.js — the /admin web editor (single self-contained HTML page). */
export function dashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Instagram Auto-Reply — Dashboard</title>
<style>
  :root{--bg:#0f1216;--card:#171c22;--line:#2a323c;--ink:#e8edf2;--mut:#93a1b0;--acc:#4f8cff;--good:#2ecc71;--bad:#ff5c5c}
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--ink)}
  header{position:sticky;top:0;background:#12161b;border-bottom:1px solid var(--line);padding:14px 20px;display:flex;align-items:center;gap:14px;z-index:5}
  header h1{font-size:16px;margin:0;font-weight:650}
  header .sp{flex:1}
  main{max-width:900px;margin:0 auto;padding:20px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px;margin:0 0 16px}
  h2{font-size:15px;margin:0 0 4px}
  .hint{color:var(--mut);font-size:13px;margin:0 0 14px}
  label{display:block;font-size:12px;color:var(--mut);margin:10px 0 4px}
  input,textarea,select{width:100%;background:#0e1216;border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:9px 11px;font-size:14px;font-family:inherit}
  textarea{min-height:58px;resize:vertical}
  button{background:var(--acc);color:#fff;border:0;border-radius:8px;padding:9px 15px;font-size:14px;font-weight:600;cursor:pointer}
  button.ghost{background:transparent;border:1px solid var(--line);color:var(--ink)}
  button.sm{padding:5px 10px;font-size:12px}
  button.danger{background:transparent;border:1px solid #5b2b2b;color:var(--bad)}
  .rule{border:1px solid var(--line);border-radius:10px;padding:12px;margin:10px 0;background:#12171d}
  .row{display:flex;gap:10px;flex-wrap:wrap}
  .row>*{flex:1;min-width:180px}
  .tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
  .tabs button{background:#12171d;border:1px solid var(--line);color:var(--mut)}
  .tabs button.on{background:var(--acc);color:#fff;border-color:var(--acc)}
  .save-bar{position:sticky;bottom:0;background:#12161b;border-top:1px solid var(--line);padding:12px 20px;display:flex;align-items:center;gap:12px}
  .toast{font-size:13px}
  .toast.ok{color:var(--good)} .toast.err{color:var(--bad)}
  .post{display:flex;gap:12px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:10px;margin:8px 0;background:#12171d}
  .post img{width:64px;height:64px;object-fit:cover;border-radius:8px;background:#222}
  .post .cap{flex:1;font-size:13px;color:var(--mut);overflow:hidden;max-height:48px}
  .post select{max-width:220px}
  .center{max-width:380px;margin:12vh auto;text-align:center}
  code{background:#0e1216;padding:2px 6px;border-radius:5px;font-size:12px}
  a{color:var(--acc)}
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
function toast(msg,ok=true){const t=$('#toast');if(t){t.textContent=msg;t.className='toast '+(ok?'ok':'err');}}

// ---------- Login ----------
function renderLogin(msg=''){
  document.getElementById('app').innerHTML=\`
   <div class="center">
     <div class="card">
       <h2>Instagram Auto-Reply</h2>
       <p class="hint">Enter your dashboard password.</p>
       <input id="pw" type="password" placeholder="Password" onkeydown="if(event.key==='Enter')doLogin()">
       <div style="height:10px"></div>
       <button onclick="doLogin()">Log in</button>
       <p class="toast err" id="lmsg">\${msg}</p>
     </div>
   </div>\`;
}
async function doLogin(){
  const r = await fetch('/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('#pw').value})});
  const j = await r.json();
  if(j.ok){boot();} else {$('#lmsg').textContent=j.error||'Wrong password';}
}
async function logout(){await fetch('/admin/logout',{method:'POST'});renderLogin('Logged out.');}

// ---------- Boot ----------
async function boot(){
  try{ RULES = await api('/admin/rules'); }catch(e){return;}
  RULES.defaultCommentRules ||= []; RULES.defaultDmRules ||= [];
  RULES.categories ||= {}; RULES.postAssignments ||= {};
  renderApp();
}

function renderApp(){
  document.getElementById('app').innerHTML=\`
    <header>
      <h1>💬 Auto-Reply Dashboard</h1><div class="sp"></div>
      <button class="ghost sm" onclick="logout()">Log out</button>
    </header>
    <main>
      <div class="tabs">
        <button data-t="comments">Default comment replies</button>
        <button data-t="dms">DM replies</button>
        <button data-t="categories">Categories</button>
        <button data-t="posts">Assign per video</button>
      </div>
      <div id="panel"></div>
    </main>
    <div class="save-bar"><button onclick="save()">💾 Save changes</button><span id="toast" class="toast"></span>
      <div class="sp"></div><span class="hint">Changes go live within a few seconds of saving.</span></div>\`;
  document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{TAB=b.dataset.t;paint();});
  paint();
}

function paint(){
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===TAB));
  const p=$('#panel');
  if(TAB==='comments') p.innerHTML=commentRulesUI(RULES.defaultCommentRules,'defaultCommentRules','Default comment replies','Used on any post that has no category or custom rule assigned.');
  else if(TAB==='dms') p.innerHTML=dmRulesUI();
  else if(TAB==='categories') p.innerHTML=categoriesUI();
  else p.innerHTML=postsUI();
  if(TAB==='posts') loadMedia();
}

// ---------- Comment rules editor (reused for default + categories) ----------
function commentRulesUI(list, path, title, hint){
  return \`<div class="card"><h2>\${title}</h2><p class="hint">\${hint}</p>
    <div id="rules_\${path}">\${list.map((r,i)=>ruleRow(r,i,path)).join('')}</div>
    <button class="ghost sm" onclick="addRule('\${path}')">+ Add rule</button></div>\`;
}
function ruleRow(r,i,path){
  return \`<div class="rule">
    <label>Rule name</label><input value="\${esc(r.name||'')}" oninput="upd('\${path}',\${i},'name',this.value)">
    <label>Trigger keywords (comma-separated — leave empty to match every comment)</label>
    <input value="\${esc((r.keywords||[]).join(', '))}" oninput="updKw('\${path}',\${i},this.value)">
    <label>Public replies (one per line — a random one is posted under the comment)</label>
    <textarea oninput="updLines('\${path}',\${i},'publicReplies',this.value)">\${esc((r.publicReplies||[]).join('\\n'))}</textarea>
    <label>Private DM to the commenter (leave empty to send no DM)</label>
    <textarea oninput="upd('\${path}',\${i},'dm',this.value)">\${esc(r.dm||'')}</textarea>
    <div style="height:8px"></div><button class="danger sm" onclick="delRule('\${path}',\${i})">Delete rule</button>
  </div>\`;
}
function listByPath(path){
  if(path==='defaultCommentRules') return RULES.defaultCommentRules;
  if(path.startsWith('cat:')) return RULES.categories[path.slice(4)].commentRules;
  return [];
}
function upd(path,i,k,v){listByPath(path)[i][k]=v;}
function updKw(path,i,v){listByPath(path)[i].keywords=v.split(',').map(s=>s.trim()).filter(Boolean);}
function updLines(path,i,k,v){listByPath(path)[i][k]=v.split('\\n').map(s=>s.trim()).filter(Boolean);}
function addRule(path){listByPath(path).push({name:'new-rule',keywords:[],publicReplies:[],dm:''});paint();}
function delRule(path,i){listByPath(path).splice(i,1);paint();}

// ---------- DM rules ----------
function dmRulesUI(){
  const L=RULES.defaultDmRules;
  return \`<div class="card"><h2>DM replies</h2><p class="hint">Auto-answers when someone sends your account a direct message.</p>
    <div>\${L.map((r,i)=>\`<div class="rule">
      <label>Rule name</label><input value="\${esc(r.name||'')}" oninput="RULES.defaultDmRules[\${i}].name=this.value">
      <label>Trigger keywords (comma-separated — empty matches all)</label>
      <input value="\${esc((r.keywords||[]).join(', '))}" oninput="RULES.defaultDmRules[\${i}].keywords=this.value.split(',').map(s=>s.trim()).filter(Boolean)">
      <label>Reply</label><textarea oninput="RULES.defaultDmRules[\${i}].reply=this.value">\${esc(r.reply||'')}</textarea>
      <div style="height:8px"></div><button class="danger sm" onclick="RULES.defaultDmRules.splice(\${i},1);paint()">Delete</button>
    </div>\`).join('')}</div>
    <button class="ghost sm" onclick="RULES.defaultDmRules.push({name:'new',keywords:[],reply:''});paint()">+ Add DM rule</button>
    <label style="margin-top:16px">Fallback reply (sent when no DM rule matches — empty = stay silent)</label>
    <textarea oninput="RULES.dmFallback=this.value">\${esc(RULES.dmFallback||'')}</textarea>
  </div>\`;
}

// ---------- Categories ----------
function categoriesUI(){
  const names=Object.keys(RULES.categories);
  return \`<div class="card"><h2>Categories</h2>
    <p class="hint">A category is a named set of comment replies (e.g. "fitness-videos"). Create them here, then assign your posts to them in the "Assign per video" tab.</p>
    <div class="row"><input id="newcat" placeholder="New category name, e.g. cooking-videos">
    <button class="sm" style="flex:0" onclick="addCat()">+ Create</button></div></div>
    \${names.map(n=>\`<div class="card"><div class="row"><h2 style="flex:1">📁 \${esc(n)}</h2>
      <button class="danger sm" style="flex:0" onclick="delCat('\${esc(n)}')">Delete category</button></div>
      \${commentRulesUI(RULES.categories[n].commentRules,'cat:'+n,'Replies for this category','')}</div>\`).join('')}\`;
}
function addCat(){const n=$('#newcat').value.trim();if(!n)return;if(!RULES.categories[n])RULES.categories[n]={commentRules:[]};paint();}
function delCat(n){if(confirm('Delete category '+n+'?')){delete RULES.categories[n];
  Object.keys(RULES.postAssignments).forEach(k=>{if(RULES.postAssignments[k].category===n)delete RULES.postAssignments[k];});paint();}}

// ---------- Posts assignment ----------
function postsUI(){
  return \`<div class="card"><h2>Assign a category to each video</h2>
    <p class="hint">Pick which category's replies each post/reel should use. Posts left as "Default" use the default comment replies.</p>
    <div id="posts">Loading your recent posts…</div></div>\`;
}
async function loadMedia(){
  try{const j=await api('/admin/media');MEDIA=j.media||[];}catch(e){return;}
  const cats=Object.keys(RULES.categories);
  const box=$('#posts'); if(!box)return;
  if(!MEDIA.length){box.innerHTML='<p class="hint">No posts found (or the account has no media yet).</p>';return;}
  box.innerHTML=MEDIA.map(m=>{
    const cur=RULES.postAssignments[m.id]?.category||'';
    const thumb=m.thumbnail_url||m.media_url||'';
    return \`<div class="post">
      <img src="\${thumb}" onerror="this.style.visibility='hidden'">
      <div class="cap">\${esc((m.caption||'(no caption)').slice(0,120))}</div>
      <select onchange="assign('\${m.id}',this.value)">
        <option value="">Default replies</option>
        \${cats.map(c=>\`<option value="\${esc(c)}" \${c===cur?'selected':''}>\${esc(c)}</option>\`).join('')}
      </select></div>\`;
  }).join('');
}
function assign(id,cat){ if(cat) RULES.postAssignments[id]={category:cat}; else delete RULES.postAssignments[id]; }

// ---------- Save ----------
async function save(){
  try{const j=await api('/admin/rules',{method:'POST',body:JSON.stringify(RULES)});
    if(j.ok)toast('Saved ✔ Changes are live.');else toast(j.error||'Save failed',false);
  }catch(e){toast('Save failed: '+e.message,false);}
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ---------- Start ----------
boot().catch(()=>renderLogin());
</script>
</body></html>`;
}
