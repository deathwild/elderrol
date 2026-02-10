(()=> {
  "use strict";

  // =========================
  // Config
  // =========================
  const URL_KEY = "ELDERROL_WEB_APP_URL";
  let WEB_APP_URL = localStorage.getItem(URL_KEY) || "https://script.google.com/macros/s/AKfycbxhQDbT_tIDPNF3jKpANN8_dAbSTDh9hsFmivpkBorY9XY0r8bTO6T9oRS3tw8AQTGNiw/exec";

  const IMGBB_API_KEY = "05d83387b53dda1991a18490ac86430a";
  const ADMIN_PASSWORD = "Elderrol";
  const ADMIN_KEY = "elderrol_admin";

  const DEFAULT_TREES = [
    {key:'Blade', label:'Blade Skills', group:'Weapon', icon:'BL'},
    {key:'Shot', label:'Shot Skills', group:'Weapon', icon:'SH'},
    {key:'Magic', label:'Magic Skills', group:'Weapon', icon:'MG'},
    {key:'Martial', label:'Martial Skills', group:'Weapon', icon:'MR'},
    {key:'DualSword', label:'DualSword Skills', group:'Weapon', icon:'DS'},
    {key:'Halberd', label:'Halberd Skills', group:'Weapon', icon:'HB'},
    {key:'Mononofu', label:'Mononofu Skills', group:'Weapon', icon:'MN'},
    {key:'Barehand', label:'Barehand Skills', group:'Weapon', icon:'BH'},
    {key:'Crusher', label:'Crusher Skills', group:'Weapon', icon:'CR'},
    {key:'Sprite', label:'Sprite Skills', group:'Weapon', icon:'SP'},

    {key:'Guard', label:'Guard Skills', group:'Buff', icon:'GD'},
    {key:'Shield', label:'Shield Skills', group:'Buff', icon:'SD'},
    {key:'Dagger', label:'Dagger Skills', group:'Buff', icon:'DG'},
    {key:'Knight', label:'Knight Skills', group:'Buff', icon:'KN'},
    {key:'Priest', label:'Priest Skills', group:'Buff', icon:'PR'},
    {key:'Assassin', label:'Assassin Skills', group:'Buff', icon:'AS'},
    {key:'Wizard', label:'Wizard Skills', group:'Buff', icon:'WZ'},
    {key:'Hunter', label:'Hunter Skills', group:'Buff', icon:'HT'},
    {key:'DarkPower', label:'DarkPower Skills', group:'Buff', icon:'DP'},
    {key:'MagicBlade', label:'MagicBlade Skills', group:'Buff', icon:'MB'},
    {key:'Ninja', label:'Ninja Skills', group:'Buff', icon:'NJ'},
    {key:'Partisan', label:'Partisan Skills', group:'Buff', icon:'PT'},
    {key:'Necromancer', label:'Necromancer Skills', group:'Buff', icon:'NC'},

    {key:'Survival', label:'Survival Skills', group:'Assist', icon:'SV'},
    {key:'Support', label:'Support Skills', group:'Assist', icon:'SU'},
    {key:'Minstrel', label:'Minstrel Skills', group:'Assist', icon:'MS'},
    {key:'Dancer', label:'Dancer Skills', group:'Assist', icon:'DC'},
    {key:'Battle', label:'Battle Skills', group:'Assist', icon:'BT'},
    {key:'Golem', label:'Golem Skills', group:'Assist', icon:'GL'},

    {key:'Smith', label:'Smith Skills', group:'Other', icon:'SM'},
    {key:'Alchemy', label:'Alchemy Skills', group:'Other', icon:'AL'},
    {key:'Tamer', label:'Tamer Skills', group:'Other', icon:'TM'},
    {key:'Scroll', label:'Scroll Skills', group:'Other', icon:'SC'},
  ];

  const WEAPONS = [
    {key:'1HS', label:'One-Hand Sword'},
    {key:'2HS', label:'Two-Hand Sword'},
    {key:'DS',  label:'Dual Swords'},
    {key:'BW',  label:'Bow'},
    {key:'BG',  label:'Bowgun'},
    {key:'ST',  label:'Staff'},
    {key:'MD',  label:'Magic Device'},
    {key:'KN',  label:'Knuckle'},
    {key:'HB',  label:'Halberd'},
    {key:'KT',  label:'Katana'},
    {key:'BH',  label:'Barehand'},
    {key:'SH',  label:'Shield'},
    {key:'DG',  label:'Dagger'},
  ];

  // DOM
  const $ = (id)=>document.getElementById(id);

  function escapeHtml(t){
    const d = document.createElement("div");
    d.textContent = String(t==null ? "" : t);
    return d.innerHTML;
  }

  function fmt(ts){
    try{
      return new Date(Number(ts)).toLocaleString("id-ID",{
        day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
      });
    }catch(e){ return "-"; }
  }

  function alertBox(target,msg,type){
    const cls = type==="ok" ? "ok" : (type==="err" ? "err" : "info");
    const el = $(target);
    if(!el) return;
    el.innerHTML = '<div class="alert '+cls+'">'+escapeHtml(msg)+'</div>';
    setTimeout(()=>{ if(el) el.innerHTML=""; }, 3500);
  }

  function setBusy(btn, busy, labelBusy){
    if(!btn) return;
    if(busy){
      btn.dataset._old = btn.textContent;
      btn.disabled = true;
      btn.innerHTML = '<span class="spin"></span>' + escapeHtml(labelBusy || "Memproses…");
    }else{
      btn.disabled = false;
      btn.textContent = btn.dataset._old || btn.textContent;
    }
  }

  function normalizeGroup(g){
    const ok = ["Weapon","Buff","Assist","Other"];
    return ok.indexOf(g)>=0 ? g : "Other";
  }

  function makeTreeIcon(name){
    const s = String(name||"").trim();
    if(!s) return "TR";
    const words = s.split(" ").filter(Boolean);
    const a = (words[0] && words[0][0]) ? words[0][0] : (s[0] || "T");
    const b = (words[1] && words[1][0]) ? words[1][0] : (s[1] || "R");
    return String(a+b).toUpperCase();
  }

  function makeTreeKey(name, trees){
    const base = String(name||"").trim().replace(/[^a-z0-9]+/gi,"").slice(0,16) || "Tree";
    const existing = new Set((trees||[]).map(t=>t.key));
    if(!existing.has(base)) return base;
    let i=2;
    while(existing.has(base+i)) i++;
    return base+i;
  }

  function weaponLabel(k){
    const w = WEAPONS.find(x=>x.key===k);
    return w ? w.label : k;
  }

  function weaponLabelList(keys){
    const arr = Array.isArray(keys) ? keys.filter(Boolean) : [];
    if(arr.length===0) return "Semua Senjata";
    return arr.map(weaponLabel).join(", ");
  }

  function kindLabel(k){
    return (k==="Passive") ? "Pasif" : (k==="Extra" ? "Extra" : "Aktif");
  }

  // =========================
  // JSONP API (Apps Script)
  // =========================
  function toB64(str){
    try{ return btoa(unescape(encodeURIComponent(String(str)))); }catch(e){ return ""; }
  }

  function apiJsonp(action, payload){
    return new Promise((resolve, reject)=>{
      if(!WEB_APP_URL) return reject(new Error("WEB_APP_URL belum diisi. Klik ⚙ URL."));
      const cb = "__elderrol_cb_" + Math.random().toString(16).slice(2);
      let script = null;

      const timer = setTimeout(()=>{
        cleanup();
        reject(new Error("Timeout memanggil Apps Script"));
      }, 15000);

      function cleanup(){
        clearTimeout(timer);
        try{ delete window[cb]; }catch(e){ window[cb]=undefined; }
        if(script && script.parentNode) script.parentNode.removeChild(script);
      }

      window[cb] = (data)=>{ cleanup(); resolve(data); };

      const sep = WEB_APP_URL.indexOf("?")>=0 ? "&" : "?";
      const q = [
        "action=" + encodeURIComponent(action),
        "callback=" + encodeURIComponent(cb),
        "payload=" + encodeURIComponent(toB64(JSON.stringify(payload || {})))
      ];

      script = document.createElement("script");
      script.async = true;
      script.src = WEB_APP_URL + sep + q.join("&");
      script.onerror = ()=>{ cleanup(); reject(new Error("Gagal load JSONP (cek URL WebApp / akses publik)")); };
      document.body.appendChild(script);
    });
  }

  async function apiCall(action, payload){
    const res = await apiJsonp(action, payload);
    if(!res || res.ok===false) throw new Error((res && res.error) ? res.error : "API error");
    return res;
  }

  async function neura(endpoint){
    const r = await apiCall("neura_proxy", { endpoint: String(endpoint||"").trim() });
    return r.data;
  }

  // =========================
  // Cleaning
  // =========================
  function cleanTreeObj(t){
    const key = String(t.key||"").trim();
    const label = String(t.label||t.name||"").trim();
    const group = normalizeGroup(String(t.group||"Other").trim());
    const icon = String(t.icon||"").trim() || makeTreeIcon(label);
    return {key,label,group,icon};
  }

  function cleanSkillObj(s){
    const id = String(s.id||"").trim() || ("s"+Math.random().toString(16).slice(2));
    const type = String(s.type||s.tree||"").trim();
    const kind = String(s.kind||"Active").trim() || "Active";
    const name = String(s.name||"").trim();
    const level = String(s.level||"").trim();
    const desc = String(s.desc||"").trim();

    const weapons = Array.isArray(s.weapons)
      ? s.weapons.map(x=>String(x).trim()).filter(Boolean)
      : String(s.weapons||"").split(",").map(x=>x.trim()).filter(Boolean);

    const mpRaw = s.mp;
    const mpNum = Number(mpRaw);
    const mp = (mpRaw==="" || mpRaw==null || Number.isNaN(mpNum)) ? "" : mpNum;

    const updatedAt = Number(s.updatedAt || Date.now());
    return {id,type,kind,weapons,name,level,mp,desc,updatedAt};
  }

  function cleanMemberObj(m){
    const id = String(m.id||"").trim() || ("m"+Math.random().toString(16).slice(2));
    const ign = String(m.ign||"").trim();
    const name = String(m.name||"").trim();
    const phone = String(m.phone||"").trim();
    const timestamp = Number(m.timestamp || Date.now());
    return {id, ign, name, phone, timestamp};
  }

  function cleanQuestObj(q){
    const id = String(q.id||"").trim() || ("q"+Math.random().toString(16).slice(2));
    const ign = String(q.ign||"").trim();
    const screenshotUrl = String(q.screenshotUrl||q.url||"").trim();
    const timestamp = Number(q.timestamp || Date.now());
    return {id, ign, screenshotUrl, timestamp};
  }

  // =========================
  // State
  // =========================
  let TREES = DEFAULT_TREES.slice();
  let skills = [];
  let members = [];
  let quests = [];

  let isAdmin = sessionStorage.getItem(ADMIN_KEY) === "true";
  let selectedTree = "";
  let editingSkillId = "";
  let editingTreeKey = "";

  function canManage(){ return !!isAdmin; }
  function applyAdminVisibility(){ document.body.classList.toggle("is-admin", !!isAdmin); }

  // =========================
  // Render
  // =========================
  function renderMembers(){
    const showPrivate = !!isAdmin;
    const list = members.slice().sort((a,b)=>Number(b.timestamp)-Number(a.timestamp));

    const rows = list.map(m=>{
      const actions = showPrivate
        ? '<button class="btn btn-danger" data-action="member-delete" data-id="'+escapeHtml(m.id)+'">Hapus</button>'
        : "";

      const privateLine = showPrivate
        ? '<div class="imeta">Nama: '+escapeHtml(m.name||"-")+' | HP: '+escapeHtml(m.phone||"-")+'</div>'
        : "";

      return (
        '<div class="item-card">'
        + '<div class="item-top">'
        +   '<div>'
        +     '<div class="iname">'+escapeHtml(m.ign)+'</div>'
        +     '<div class="imeta">'+escapeHtml(fmt(m.timestamp))+'</div>'
        +     privateLine
        +   '</div>'
        +   actions
        + '</div>'
        + '</div>'
      );
    }).join("");

    $("mList").innerHTML = rows || '<div class="note">Belum ada anggota.</div>';
  }

  function renderQuests(){
    const showActions = !!isAdmin;
    const list = quests.slice().sort((a,b)=>Number(b.timestamp)-Number(a.timestamp));

    const rows = list.map(q=>{
      const actions = showActions
        ? '<button class="btn btn-danger" data-action="quest-delete" data-id="'+escapeHtml(q.id)+'">Hapus</button>'
        : "";

      const img = q.screenshotUrl
        ? '<a href="'+escapeHtml(q.screenshotUrl)+'" target="_blank" rel="noopener">'
          + '<img class="qimg small" loading="lazy" src="'+escapeHtml(q.screenshotUrl)+'" alt="screenshot" />'
          + "</a>"
        : '<div class="note" style="padding:0">(Tanpa gambar)</div>';

      return (
        '<div class="item-card">'
        + '<div class="item-top">'
        +   '<div>'
        +     '<div class="iname">IGN: '+escapeHtml(q.ign)+'</div>'
        +     '<div class="imeta">'+escapeHtml(fmt(q.timestamp))+'</div>'
        +   '</div>'
        +   actions
        + '</div>'
        + '<div style="margin-top:10px">'+img+'</div>'
        + '</div>'
      );
    }).join("");

    $("qList").innerHTML = rows || '<div class="note">Belum ada pengumpulan quest.</div>';
  }

  function treeLabelByKey(key){
    const t = TREES.find(x=>String(x.key)===String(key));
    return t ? t.label : String(key||"");
  }

  function renderTreeMenu(){
    const groups = {Weapon:[], Buff:[], Assist:[], Other:[]};
    TREES.forEach(t=>{ groups[normalizeGroup(t.group)].push(t); });

    function tileHtml(t){
      const active = (t.key===selectedTree) ? " active" : "";
      return (
        '<div class="tile'+active+'" data-tree="'+escapeHtml(t.key)+'">'
        + '<div class="icon">'+escapeHtml(t.icon||makeTreeIcon(t.label))+'</div>'
        + '<div>'
        +   '<div class="tname">'+escapeHtml(t.label)+'</div>'
        +   '<div class="tsub">'+escapeHtml(t.group)+'</div>'
        + '</div>'
        + '</div>'
      );
    }

    $("gWeapon").innerHTML = groups.Weapon.map(tileHtml).join("") || '<div class="note">-</div>';
    $("gBuff").innerHTML   = groups.Buff.map(tileHtml).join("")   || '<div class="note">-</div>';
    $("gAssist").innerHTML = groups.Assist.map(tileHtml).join("") || '<div class="note">-</div>';
    $("gOther").innerHTML  = groups.Other.map(tileHtml).join("")  || '<div class="note">-</div>';

    // drawer trees
    const drawerHtml = ["Weapon","Buff","Assist","Other"].map(g=>{
      const items = groups[g].map(tileHtml).join("") || '<div class="note">-</div>';
      return '<h3 style="margin:12px 0 8px">'+escapeHtml(g)+'</h3>' + items;
    }).join("");
    $("drawerTrees").innerHTML = drawerHtml;

    // handlers
    document.querySelectorAll(".tile[data-tree]").forEach(tile=>{
      tile.onclick = ()=>{
        selectedTree = tile.dataset.tree || "";
        syncSelectedTreeUI();
        closeTreeDrawer();
      };
    });

    // selects
    $("smTree").innerHTML = TREES.map(t=>'<option value="'+escapeHtml(t.key)+'">'+escapeHtml(t.label)+'</option>').join("");
    $("mobileTreeSelect").innerHTML = TREES.map(t=>'<option value="'+escapeHtml(t.key)+'">'+escapeHtml(t.label)+'</option>').join("");
    if(selectedTree) $("mobileTreeSelect").value = selectedTree;
  }

  function syncSkillActions(){
    const showActions = (!!selectedTree && canManage());
    $("skillActions").style.display = showActions ? "" : "none";

    $("treeTitle").textContent = selectedTree ? treeLabelByKey(selectedTree) : "Belum memilih tree";
    $("treeMeta").textContent = selectedTree ? "Pilih skill di tree ini." : "Pilih tree untuk menampilkan daftar skill.";
  }

  function renderSkillRight(){
    if(!selectedTree){
      $("skillList").innerHTML = '<div class="note">Pilih tree untuk menampilkan daftar skill.</div>';
      return;
    }

    const q = $("skillSearch").value.trim().toLowerCase();
    const list = skills
      .filter(s=>String(s.type||"")===String(selectedTree))
      .filter(s=>{
        if(!q) return true;
        const hay = (String(s.name||"")+" "+String(s.desc||"")+" "+String(s.level||"")+" "+String(s.kind||"")).toLowerCase();
        return hay.indexOf(q)>=0;
      })
      .slice()
      .sort((a,b)=>Number(b.updatedAt)-Number(a.updatedAt));

    if(list.length===0){
      $("skillList").innerHTML = '<div class="note">Belum ada skill di tree ini.</div>';
      return;
    }

    const can = canManage();

    function skillCard(s){
      const mpTxt = (s.mp==="" || s.mp==null) ? "" : (" | MP: "+escapeHtml(s.mp));
      const meta = kindLabel(s.kind||"Active")
        + " | Senjata: " + escapeHtml(weaponLabelList(s.weapons))
        + (s.level ? (" | "+escapeHtml(s.level)) : "")
        + mpTxt
        + " | Update: " + escapeHtml(fmt(s.updatedAt));

      const actions = can
        ? (
          '<div class="toolbar">'
          + '<button class="btn btn-ghost" data-action="skill-edit" data-id="'+escapeHtml(s.id)+'">Edit</button>'
          + '<button class="btn btn-danger" data-action="skill-delete" data-id="'+escapeHtml(s.id)+'">Hapus</button>'
          + '</div>'
        )
        : "";

      return (
        '<div class="item-card">'
        + '<div class="item-top">'
        +   '<div>'
        +     '<div class="iname">'+escapeHtml(s.name)+'</div>'
        +     '<div class="imeta">'+meta+'</div>'
        +   '</div>'
        +   actions
        + '</div>'
        + '<div class="idesc">'+escapeHtml(s.desc||"-")+'</div>'
        + '</div>'
      );
    }

    const grouped = {Active:[], Passive:[], Extra:[]};
    list.forEach(s=>{
      const k = (s.kind==="Passive" || s.kind==="Extra") ? s.kind : "Active";
      grouped[k].push(s);
    });

    let html = "";
    ["Active","Passive","Extra"].forEach(k=>{
      if(grouped[k].length===0) return;
      html += '<div style="margin-top:6px"><h3 style="margin:10px 0 8px;color:#cfd6e6;font-size:13px">'+escapeHtml(kindLabel(k))+'</h3></div>';
      html += grouped[k].map(skillCard).join("");
    });

    $("skillList").innerHTML = html;
  }

  function syncSelectedTreeUI(){
    renderTreeMenu();
    syncSkillActions();
    renderSkillRight();
    if(selectedTree) $("mobileTreeSelect").value = selectedTree;
  }

  // =========================
  // Modals
  // =========================
  const adminModal = $("adminModal");
  const skillModal = $("skillModal");
  const treeModal = $("treeModal");
  const treeDrawer = $("treeDrawer");
  const settingsModal = $("settingsModal");

  function openAdminModal(){
    adminModal.classList.add("show");
    $("adminPass").value="";
    $("adminPass").focus();
  }
  function closeAdminModal(){ adminModal.classList.remove("show"); }

  function openTreeDrawer(){ treeDrawer.classList.add("show"); }
  function closeTreeDrawer(){ treeDrawer.classList.remove("show"); }

  function openSettings(){
    $("settingsUrl").value = WEB_APP_URL;
    settingsModal.classList.add("show");
  }
  function closeSettings(){ settingsModal.classList.remove("show"); }

  function buildWeaponChecks(selectedKeys){
    const set = new Set(Array.isArray(selectedKeys) ? selectedKeys : []);
    $("smWeapons").innerHTML = WEAPONS.map(w=>{
      const checked = set.has(w.key) ? " checked" : "";
      return (
        '<label class="wItem">'
        + '<input type="checkbox" value="'+escapeHtml(w.key)+'"'+checked+' />'
        + "<span>"+escapeHtml(w.label)+"</span>"
        + "</label>"
      );
    }).join("");
  }

  function openSkillModal(mode, data){
    if(!canManage()){ alertBox("skillsAlert","Hanya admin yang bisa tambah/edit skill","err"); return; }
    editingSkillId = (mode==="edit" && data) ? String(data.id) : "";
    $("skillModalTitle").textContent = (editingSkillId ? "Edit Skill" : "Tambah Skill");

    const defaultTree = selectedTree || (TREES[0] ? TREES[0].key : "");
    $("smTree").value  = String((data && data.type) ? data.type : defaultTree);
    $("smKind").value  = String((data && data.kind) ? data.kind : "Active");
    $("smName").value  = String((data && data.name) ? data.name : "");
    $("smLevel").value = String((data && data.level) ? data.level : "");
    $("smMp").value    = (data && data.mp!=="" && data.mp!=null) ? String(data.mp) : "";
    $("smDesc").value  = String((data && data.desc) ? data.desc : "");

    buildWeaponChecks(data ? data.weapons : []);
    $("skillModalAlert").innerHTML = "";
    skillModal.classList.add("show");
  }

  function closeSkillModal(){ skillModal.classList.remove("show"); }

  function isDefaultTreeKey(key){ return DEFAULT_TREES.some(t=>t.key===key); }

  function openTreeModal(mode, data){
    if(!canManage()){ alertBox("skillsAlert","Hanya admin yang bisa tambah/edit tree","err"); return; }
    editingTreeKey = (mode==="edit" && data) ? String(data.key) : "";

    $("treeModalTitle").textContent = editingTreeKey ? "Edit Skill Tree" : "Tambah Skill Tree";
    $("tmGroup").value = data ? normalizeGroup(String(data.group||"Other")) : "Weapon";
    $("tmName").value  = data ? String(data.label||"") : "";

    $("tmDelete").style.display = (editingTreeKey && !isDefaultTreeKey(editingTreeKey)) ? "" : "none";
    treeModal.classList.add("show");
  }

  function closeTreeModal(){ treeModal.classList.remove("show"); }

  // =========================
  // ImgBB upload
  // =========================
  async function uploadToImgBB(file){
    if(!file) throw new Error("File tidak ada");
    const fd = new FormData();
    fd.append("image", file);
    const url = "https://api.imgbb.com/1/upload?key=" + encodeURIComponent(IMGBB_API_KEY);
    const res = await fetch(url, { method:"POST", body: fd });
    const j = await res.json();
    if(!j || !j.success) throw new Error((j && j.error && j.error.message) ? j.error.message : "Upload ImgBB gagal");
    return (j.data && j.data.url) ? j.data.url : ((j.data && j.data.display_url) ? j.data.display_url : "");
  }

  // =========================
  // Live refresh
  // =========================
  async function liveRefreshAll(){
    let r1 = { data: [] };
    try { r1 = await apiCall("trees_list", {}); } catch(e) { r1 = { data: [] }; }

    const r2 = await apiCall("skills_list", {});
    const r3 = await apiCall("members_list", {});
    const r4 = await apiCall("quests_list", {});

    const byKey = new Map(DEFAULT_TREES.map(t=>[t.key,{...t}]));
    (Array.isArray(r1.data)?r1.data:[]).map(cleanTreeObj).forEach(t=>{ if(t.key && t.label) byKey.set(t.key,t); });

    TREES = Array.from(byKey.values());
    skills  = (Array.isArray(r2.data)?r2.data:[]).map(cleanSkillObj).filter(s=>s.type && s.name);
    members = (Array.isArray(r3.data)?r3.data:[]).map(cleanMemberObj).filter(m=>m.ign);
    quests  = (Array.isArray(r4.data)?r4.data:[]).map(cleanQuestObj).filter(q=>q.ign);

    if(!selectedTree && TREES[0]) selectedTree = TREES[0].key;
  }

  // Neura helpers
  function normalizeTextBlock(s){
    return String(s||"").replace(/\r\n/g,"\n").replace(/\n/g,"\n");
  }

  function renderBuffList(items){
    const arr = Array.isArray(items) ? items : [];
    if(arr.length===0) return '<div class="note">Data buff kosong.</div>';
    return arr.slice(0,80).map(b=>{
      const name = b && b.name ? String(b.name) : "-";
      const code = normalizeTextBlock(b && b.code ? b.code : "");
      return (
        '<details style="margin-bottom:10px">'
        + '<summary><b>'+escapeHtml(name)+'</b> <span class="muted" style="font-size:12px">(klik)</span></summary>'
        + '<div class="pre" style="margin-top:8px">'+escapeHtml(code || "-")+'</div>'
        + '</details>'
      );
    }).join("") + (arr.length>80 ? '<div class="note">Menampilkan 80 item pertama.</div>' : "");
  }

  // =========================
  // Boot / UI
  // =========================
  async function boot(){
    $("statusText").textContent = WEB_APP_URL ? "Menghubungkan ke spreadsheet…" : "Set URL dulu (klik ⚙ URL)";
    try{
      if(WEB_APP_URL) await liveRefreshAll();
      $("statusText").textContent = WEB_APP_URL ? "Terhubung ✅" : "Set URL dulu (klik ⚙ URL)";
    }catch(e){
      $("statusText").textContent = "Gagal konek: " + e.message;
    }
    syncAllUI();
  }

  function syncAllUI(){
    applyAdminVisibility();
    $("modePill").textContent = WEB_APP_URL ? "Live" : "No URL";
    $("adminBtn").textContent = isAdmin ? "👤 Admin (Logout)" : "🔐 Login Admin";
    renderMembers();
    renderQuests();
    renderTreeMenu();
    syncSkillActions();
    renderSkillRight();
  }

  // =========================
  // Events - Tabs
  // =========================
  document.querySelectorAll(".tab").forEach(tab=>{
    tab.addEventListener("click", ()=>{
      document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
      tab.classList.add("active");
      const key = tab.dataset.tab;
      document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
      $(key).classList.add("active");
    });
  });

  $("refreshAll").addEventListener("click", async ()=>{
    setBusy($("refreshAll"), true, "Refresh…");
    await boot();
    setBusy($("refreshAll"), false);
  });

  // Settings
  $("settingsBtn").addEventListener("click", openSettings);
  $("settingsClose").addEventListener("click", closeSettings);
  settingsModal.addEventListener("click", (e)=>{ if(e.target===settingsModal) closeSettings(); });

  $("settingsSave").addEventListener("click", ()=>{
    WEB_APP_URL = $("settingsUrl").value.trim();
    localStorage.setItem(URL_KEY, WEB_APP_URL);
    alertBox("settingsAlert","Tersimpan","ok");
    closeSettings();
    boot();
  });
  $("settingsClear").addEventListener("click", ()=>{
    WEB_APP_URL = "";
    localStorage.removeItem(URL_KEY);
    $("settingsUrl").value = "";
    alertBox("settingsAlert","Dikosongkan","ok");
    closeSettings();
    boot();
  });

  // Admin
  $("adminBtn").addEventListener("click", ()=>{
    if(isAdmin){
      if(confirm("Logout admin?")){
        isAdmin=false;
        sessionStorage.removeItem(ADMIN_KEY);
        syncAllUI();
        alertBox("adminAlert","Logout berhasil","ok");
      }
      return;
    }
    openAdminModal();
  });
  $("adminCancel").addEventListener("click", closeAdminModal);
  adminModal.addEventListener("click", (e)=>{ if(e.target===adminModal) closeAdminModal(); });
  $("adminLogin").addEventListener("click", ()=>{
    const pass = $("adminPass").value;
    if(pass !== ADMIN_PASSWORD){ alertBox("adminAlert","Password salah","err"); return; }
    isAdmin = true;
    sessionStorage.setItem(ADMIN_KEY,"true");
    closeAdminModal();
    syncAllUI();
    alertBox("skillsAlert","Login admin berhasil","ok");
  });
  $("adminPass").addEventListener("keydown", (e)=>{ if(e.key==="Enter") $("adminLogin").click(); });

  // Tree drawer
  $("openTreeDrawer").addEventListener("click", openTreeDrawer);
  $("closeTreeDrawer").addEventListener("click", closeTreeDrawer);
  treeDrawer.addEventListener("click", (e)=>{ if(e.target===treeDrawer) closeTreeDrawer(); });

  $("mobileTreeSelect").addEventListener("change", ()=>{
    selectedTree = $("mobileTreeSelect").value;
    syncSelectedTreeUI();
  });

  // Members
  $("mAdd").addEventListener("click", async ()=>{
    const btn = $("mAdd");
    const ign = $("mIgn").value.trim();
    if(!ign){ alertBox("membersAlert","IGN wajib diisi","err"); return; }

    const rec = {
      id: "m"+Math.random().toString(16).slice(2),
      ign,
      name: $("mName").value.trim(),
      phone: $("mPhone").value.trim(),
      timestamp: Date.now()
    };

    // optimistic
    members.unshift(rec);
    renderMembers();

    try{
      setBusy(btn, true, "Kirim…");
      await apiCall("members_upsert", {member: rec});
      await liveRefreshAll();
      renderMembers();
      alertBox("membersAlert","Terkirim","ok");
    }catch(err){
      members = members.filter(x=>x.id!==rec.id);
      renderMembers();
      alertBox("membersAlert","Gagal kirim: "+err.message,"err");
    }finally{
      setBusy(btn, false);
    }
  });

  $("mReset").addEventListener("click", ()=>{
    $("mName").value=""; $("mIgn").value=""; $("mPhone").value="";
  });

  $("mRefresh").addEventListener("click", async ()=>{
    setBusy($("mRefresh"), true, "Refresh…");
    await boot();
    setBusy($("mRefresh"), false);
    alertBox("membersAlert","Refreshed","info");
  });

  $("mList").addEventListener("click", async (e)=>{
    const btn = e.target.closest('button[data-action="member-delete"]');
    if(!btn) return;
    if(!isAdmin){ alertBox("membersAlert","Hanya admin","err"); return; }

    const id = btn.dataset.id;
    if(!confirm("Hapus anggota ini?")) return;

    const backup = members.slice();
    members = members.filter(x=>x.id!==id);
    renderMembers();

    try{
      await apiCall("members_delete", {pass: ADMIN_PASSWORD, id});
      await liveRefreshAll();
      renderMembers();
      alertBox("membersAlert","Dihapus","ok");
    }catch(err){
      members = backup;
      renderMembers();
      alertBox("membersAlert","Gagal hapus: "+err.message,"err");
    }
  });

  // Skills
  $("skillSearch").addEventListener("input", ()=>renderSkillRight());

  $("skillList").addEventListener("click", async (e)=>{
    const edit = e.target.closest('button[data-action="skill-edit"]');
    const del  = e.target.closest('button[data-action="skill-delete"]');

    if(edit){
      if(!canManage()){ alertBox("skillsAlert","Hanya admin","err"); return; }
      const id = edit.dataset.id;
      const s = skills.find(x=>x.id===id);
      if(!s){ alertBox("skillsAlert","Skill tidak ditemukan","err"); return; }
      openSkillModal("edit", s);
      return;
    }

    if(del){
      if(!canManage()){ alertBox("skillsAlert","Hanya admin","err"); return; }
      const id = del.dataset.id;
      if(!confirm("Hapus skill ini?")) return;

      const backup = skills.slice();
      skills = skills.filter(x=>x.id!==id);
      renderSkillRight();

      try{
        await apiCall("skills_delete", {pass: ADMIN_PASSWORD, id});
        await liveRefreshAll();
        renderSkillRight();
        alertBox("skillsAlert","Skill dihapus","ok");
      }catch(err){
        skills = backup;
        renderSkillRight();
        alertBox("skillsAlert","Gagal hapus: "+err.message,"err");
      }
    }
  });

  $("addSkill").addEventListener("click", ()=>openSkillModal("add"));
  $("addTreeBtn").addEventListener("click", ()=>openTreeModal("add"));

  $("editTree").addEventListener("click", ()=>{
    const t = TREES.find(x=>x.key===selectedTree);
    if(!t){ alertBox("skillsAlert","Tree tidak ditemukan","err"); return; }
    openTreeModal("edit", t);
  });

  $("smCancel").addEventListener("click", closeSkillModal);
  skillModal.addEventListener("click", (e)=>{ if(e.target===skillModal) closeSkillModal(); });

  $("smSave").addEventListener("click", async ()=>{
    if(!canManage()) return;
    const btn = $("smSave");

    const type = $("smTree").value;
    const kind = $("smKind").value;
    const name = $("smName").value.trim();
    if(!name){ alertBox("skillModalAlert","Nama skill wajib diisi","err"); return; }

    const level = $("smLevel").value.trim();
    const desc  = $("smDesc").value.trim();

    const weaponKeys = Array.from($("smWeapons").querySelectorAll('input[type="checkbox"]'))
      .filter(x=>x.checked)
      .map(x=>x.value);

    const mpRaw = $("smMp").value.trim();
    const mp = (mpRaw==="") ? "" : Number(mpRaw);
    if(mpRaw!=="" && Number.isNaN(mp)){
      alertBox("skillModalAlert","MP harus angka","err");
      return;
    }

    const rec = {
      id: editingSkillId || ("s"+Math.random().toString(16).slice(2)),
      type, kind,
      weapons: weaponKeys,
      name, level, mp, desc,
      updatedAt: Date.now()
    };

    const backup = skills.slice();
    const idx = skills.findIndex(x=>x.id===rec.id);
    if(idx>=0) skills[idx]=rec; else skills.unshift(rec);

    selectedTree = type;
    syncSelectedTreeUI();

    try{
      setBusy(btn, true, "Simpan…");
      await apiCall("skills_upsert", {pass: ADMIN_PASSWORD, skill: rec});
      await liveRefreshAll();
      syncSelectedTreeUI();
      alertBox("skillsAlert","Skill tersimpan","ok");
      closeSkillModal();
    }catch(err){
      skills = backup;
      syncSelectedTreeUI();
      alertBox("skillModalAlert","Gagal simpan: "+err.message,"err");
    }finally{
      setBusy(btn, false);
    }
  });

  // Tree modal
  $("tmCancel").addEventListener("click", closeTreeModal);
  treeModal.addEventListener("click", (e)=>{ if(e.target===treeModal) closeTreeModal(); });

  $("tmSave").addEventListener("click", async ()=>{
    if(!canManage()) return;
    const btn = $("tmSave");

    const group = normalizeGroup($("tmGroup").value);
    const label = $("tmName").value.trim();
    if(!label){ alertBox("treesAlert","Nama tree wajib diisi","err"); return; }

    const key  = editingTreeKey || makeTreeKey(label, TREES);
    const icon = makeTreeIcon(label);
    const rec = {key,label,group,icon};

    const backup = TREES.slice();
    const byKey = new Map(TREES.map(t=>[t.key,t]));
    byKey.set(key, rec);
    TREES = Array.from(byKey.values());
    selectedTree = key;
    syncSelectedTreeUI();

    try{
      setBusy(btn, true, "Simpan…");
      await apiCall("trees_upsert", {pass: ADMIN_PASSWORD, tree: rec});
      await liveRefreshAll();
      syncSelectedTreeUI();
      alertBox("skillsAlert","Tree tersimpan","ok");
      closeTreeModal();
    }catch(err){
      TREES = backup;
      syncSelectedTreeUI();
      alertBox("treesAlert","Gagal simpan tree: "+err.message,"err");
    }finally{
      setBusy(btn, false);
    }
  });

  $("tmDelete").addEventListener("click", async ()=>{
    if(!editingTreeKey) return;
    if(isDefaultTreeKey(editingTreeKey)){ alertBox("treesAlert","Default tree tidak boleh dihapus","err"); return; }
    if(!confirm("Hapus tree ini? (Skill di tree ini juga akan hilang)")) return;

    const backupTrees = TREES.slice();
    const backupSkills = skills.slice();

    TREES = TREES.filter(t=>t.key!==editingTreeKey);
    skills = skills.filter(s=>String(s.type)!==String(editingTreeKey));
    if(selectedTree===editingTreeKey) selectedTree="";
    syncSelectedTreeUI();

    try{
      await apiCall("trees_delete", {pass: ADMIN_PASSWORD, key: editingTreeKey});
      await liveRefreshAll();
      syncSelectedTreeUI();
      alertBox("skillsAlert","Tree dihapus","ok");
      closeTreeModal();
    }catch(err){
      TREES = backupTrees;
      skills = backupSkills;
      syncSelectedTreeUI();
      alertBox("treesAlert","Gagal hapus tree: "+err.message,"err");
    }
  });

  // Quests
  $("qFile").addEventListener("change", ()=>{
    const f = $("qFile").files && $("qFile").files[0];
    if(!f){ $("qPreviewWrap").style.display="none"; return; }
    const url = URL.createObjectURL(f);
    $("qPreview").src = url;
    $("qPreviewWrap").style.display="block";
  });

  $("qSubmit").addEventListener("click", async ()=>{
    const btn = $("qSubmit");
    const ign = $("qIgn").value.trim();
    if(!ign){ alertBox("questsAlert","IGN wajib diisi","err"); return; }
    const file = $("qFile").files && $("qFile").files[0];
    if(!file){ alertBox("questsAlert","Pilih gambar screenshot dulu","err"); return; }

    let url = "";
    try{
      setBusy(btn, true, "Upload…");
      url = await uploadToImgBB(file);
    }catch(err){
      setBusy(btn, false);
      alertBox("questsAlert","Upload gagal: "+err.message,"err");
      return;
    }

    const rec = {
      id:"q"+Math.random().toString(16).slice(2),
      ign,
      screenshotUrl: url,
      timestamp: Date.now()
    };

    const backup = quests.slice();
    quests.unshift(rec);
    renderQuests();

    try{
      setBusy(btn, true, "Kirim…");
      await apiCall("quests_upsert", {quest: rec});
      $("qFile").value="";
      $("qPreviewWrap").style.display="none";
      await liveRefreshAll();
      renderQuests();
      alertBox("questsAlert","Terkirim","ok");
    }catch(err){
      quests = backup;
      renderQuests();
      alertBox("questsAlert","Gagal kirim: "+err.message,"err");
    }finally{
      setBusy(btn, false);
    }
  });

  $("qRefresh").addEventListener("click", async ()=>{
    setBusy($("qRefresh"), true, "Refresh…");
    await boot();
    setBusy($("qRefresh"), false);
    alertBox("questsAlert","Refreshed","info");
  });

  $("qList").addEventListener("click", async (e)=>{
    const btn = e.target.closest('button[data-action="quest-delete"]');
    if(!btn) return;
    if(!isAdmin){ alertBox("questsAlert","Hanya admin","err"); return; }

    const id = btn.dataset.id;
    if(!confirm("Hapus data quest ini?")) return;

    const backup = quests.slice();
    quests = quests.filter(x=>x.id!==id);
    renderQuests();

    try{
      await apiCall("quests_delete", {pass: ADMIN_PASSWORD, id});
      await liveRefreshAll();
      renderQuests();
      alertBox("questsAlert","Dihapus","ok");
    }catch(err){
      quests = backup;
      renderQuests();
      alertBox("questsAlert","Gagal hapus: "+err.message,"err");
    }
  });

  // Info / Neura
  $("loadBanner").addEventListener("click", async ()=>{
    const btn = $("loadBanner");
    try{
      setBusy(btn, true, "Load…");
      const data = await neura("bannerava");
      if(Array.isArray(data)){
        $("bannerBox").innerHTML = data.slice(0,10).map(x=>(
          '<div class="item-card"><div class="iname">'+escapeHtml(String(x.title||x.name||x.id||"Banner"))+'</div>'
          + (x.url ? '<div class="imeta"><a href="'+escapeHtml(x.url)+'" target="_blank" rel="noopener">Open</a></div>' : "")
          + "</div>"
        )).join("") || '<div class="note">Kosong</div>';
      }else{
        $("bannerBox").innerHTML = '<div class="pre">'+escapeHtml(JSON.stringify(data,null,2))+'</div>';
      }
    }catch(err){
      $("bannerBox").innerHTML = '<div class="alert err">Gagal: '+escapeHtml(err.message)+'</div>';
    }finally{
      setBusy(btn, false);
    }
  });

  $("loadBuff").addEventListener("click", async ()=>{
    const btn = $("loadBuff");
    try{
      setBusy(btn, true, "Load…");
      const data = await neura("buff");
      const list = (data && data.result) ? data.result : data;
      $("buffBox").innerHTML = renderBuffList(list);
    }catch(err){
      $("buffBox").innerHTML = '<div class="alert err">Gagal: '+escapeHtml(err.message)+'</div>';
    }finally{
      setBusy(btn, false);
    }
  });

  $("searchBuff").addEventListener("click", async ()=>{
    const btn = $("searchBuff");
    const q = $("buffQuery").value.trim();
    if(!q){ $("buffBox").innerHTML = '<div class="alert err">Isi kata kunci dulu</div>'; return; }
    try{
      setBusy(btn, true, "Cari…");
      const data = await neura("buff/idname=" + encodeURIComponent(q));
      const list = (data && data.result) ? data.result : data;
      $("buffBox").innerHTML = renderBuffList(list);
    }catch(err){
      $("buffBox").innerHTML = '<div class="alert err">Gagal: '+escapeHtml(err.message)+'</div>';
    }finally{
      setBusy(btn, false);
    }
  });

  $("loadLv").addEventListener("click", async ()=>{
    const btn = $("loadLv");
    const cur = $("lvCurrent").value.trim();
    const rng = $("lvRange").value.trim();
    if(!cur || !rng){ $("lvBox").innerHTML = '<div class="alert err">Isi current & range</div>'; return; }
    try{
      setBusy(btn, true, "Cari…");
      const data = await neura("lv/current=" + encodeURIComponent(cur) + "&range=" + encodeURIComponent(rng));
      const txt = (data && data.result) ? data.result : data;
      if(typeof txt === "string"){
        $("lvBox").innerHTML = '<div class="pre">'+escapeHtml(normalizeTextBlock(txt))+'</div>';
      }else{
        $("lvBox").innerHTML = '<div class="pre">'+escapeHtml(JSON.stringify(txt,null,2))+'</div>';
      }
    }catch(err){
      $("lvBox").innerHTML = '<div class="alert err">Gagal: '+escapeHtml(err.message)+'</div>';
    }finally{
      setBusy(btn, false);
    }
  });

  $("neuraTest").addEventListener("click", async ()=>{
    const btn = $("neuraTest");
    const ep = $("neuraEndpoint").value.trim();
    if(!ep){ $("neuraOut").innerHTML = '<div class="alert err">Isi endpoint dulu</div>'; return; }
    try{
      setBusy(btn, true, "Test…");
      const data = await neura(ep);
      const list = (data && typeof data==="object" && ("result" in data)) ? data.result : null;
      if(Array.isArray(list)){
        $("neuraOut").innerHTML =
          '<div class="note">Result array: '+escapeHtml(String(list.length))+' item.</div>'
          + '<div class="pre">'+escapeHtml(JSON.stringify(list.slice(0,15),null,2))+'</div>'
          + '<div class="note">(Menampilkan 15 pertama)</div>';
      }else{
        $("neuraOut").innerHTML = '<div class="pre">'+escapeHtml(JSON.stringify(data,null,2))+'</div>';
      }
    }catch(err){
      $("neuraOut").innerHTML = '<div class="alert err">Gagal: '+escapeHtml(err.message)+'</div>';
    }finally{
      setBusy(btn, false);
    }
  });

  // =========================
  // Boot
  // =========================
  boot();
})();
