(() => {
  "use strict";

  // =========================
  // KONFIG
  // =========================
  // Isi URL Web App Apps Script kamu:
  // contoh: https://script.google.com/macros/s/XXXX/exec
  const WEB_APP_URL = ""; // <-- tempel URL Web App (deploy as: Anyone)

  const ADMIN_PASSWORD = "Elderrol";
  const ADMIN_KEY = "elderrol_admin";

  // =========================
  // DATA STATIS
  // (karena kamu minta 1 spreadsheet = 3 sheet, jadi trees TIDAK disimpan di sheet)
  // =========================
  const DEFAULT_TREES = [
    // Weapon
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

    // Buff
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

    // Assist
    {key:'Survival', label:'Survival Skills', group:'Assist', icon:'SV'},
    {key:'Support', label:'Support Skills', group:'Assist', icon:'SU'},
    {key:'Minstrel', label:'Minstrel Skills', group:'Assist', icon:'MS'},
    {key:'Dancer', label:'Dancer Skills', group:'Assist', icon:'DC'},
    {key:'Battle', label:'Battle Skills', group:'Assist', icon:'BT'},
    {key:'Golem', label:'Golem Skills', group:'Assist', icon:'GL'},

    // Other
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

  // =========================
  // DOM + util
  // =========================
  const $ = (id)=>document.getElementById(id);

  function escapeHtml(t){
    const d = document.createElement("div");
    d.textContent = String(t == null ? "" : t);
    return d.innerHTML;
  }

  function fmt(ts){
    try{
      return new Date(Number(ts)).toLocaleString("id-ID",{
        day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
      });
    }catch(_){
      return "-";
    }
  }

  function alertBox(target,msg,type){
    const cls = type==="ok" ? "ok" : type==="err" ? "err" : "info";
    const el = $(target);
    if(!el) return;
    el.innerHTML = `<div class="alert ${cls}">${escapeHtml(msg)}</div>`;
    setTimeout(()=>{ if(el) el.innerHTML=""; }, 3500);
  }

  function normalizeGroup(g){
    const ok = ["Weapon","Buff","Assist","Other"];
    return ok.includes(g) ? g : "Other";
  }

  function kindLabel(k){
    return (k==="Passive") ? "Pasif" : (k==="Extra" ? "Extra" : "Aktif");
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

  function makeTreeIcon(label){
    const s = String(label||"").trim();
    if(!s) return "TR";
    const words = s.split(" ").filter(Boolean);
    const a = (words[0] && words[0][0]) ? words[0][0] : (s[0] || "T");
    const b = (words[1] && words[1][0]) ? words[1][0] : (s[1] || "R");
    return String(a+b).toUpperCase();
  }

  // =========================
  // JSONP API (Apps Script)
  // =========================
  function toB64(str){
    try{ return btoa(unescape(encodeURIComponent(String(str)))); }catch(_){ return ""; }
  }

  function apiJsonp(action, payload){
    return new Promise((resolve, reject)=>{
      if(!WEB_APP_URL) return reject(new Error("WEB_APP_URL belum diisi"));

      const cb = "__elderrol_cb_" + Math.random().toString(16).slice(2);
      let script = null;

      const timer = setTimeout(()=>{
        cleanup();
        reject(new Error("Timeout memanggil Apps Script"));
      }, 15000);

      function cleanup(){
        clearTimeout(timer);
        try{ delete window[cb]; }catch(_){ window[cb] = undefined; }
        if(script && script.parentNode) script.parentNode.removeChild(script);
      }

      window[cb] = (data)=>{ cleanup(); resolve(data); };

      const sep = WEB_APP_URL.includes("?") ? "&" : "?";
      const q = [
        "action=" + encodeURIComponent(action),
        "callback=" + encodeURIComponent(cb),
        "payload=" + encodeURIComponent(toB64(JSON.stringify(payload || {}))),
        "_=" + Date.now()
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
        ? `<button class="btn btn-danger" data-action="member-delete" data-id="${escapeHtml(m.id)}">Hapus</button>`
        : "";

      const privateLine = showPrivate
        ? `<div class="smeta">Nama: ${escapeHtml(m.name||"-")} | HP: ${escapeHtml(m.phone||"-")}</div>`
        : "";

      return (
        `<div class="skill-card">
          <div class="skill-card-top">
            <div>
              <div class="sname">${escapeHtml(m.ign)}</div>
              <div class="smeta">${escapeHtml(fmt(m.timestamp))}</div>
              ${privateLine}
            </div>
            ${actions}
          </div>
        </div>`
      );
    }).join("");

    $("mList").innerHTML = rows || `<div class="note">Belum ada anggota.</div>`;
  }

  function renderQuests(){
    const showActions = !!isAdmin;
    const list = quests.slice().sort((a,b)=>Number(b.timestamp)-Number(a.timestamp));

    const rows = list.map(q=>{
      const actions = showActions
        ? `<button class="btn btn-danger" data-action="quest-delete" data-id="${escapeHtml(q.id)}">Hapus</button>`
        : "";

      const urlLine = q.screenshotUrl
        ? `<div class="smeta">URL: <a href="${escapeHtml(q.screenshotUrl)}" target="_blank" rel="noopener">Buka</a></div>`
        : `<div class="smeta">URL: -</div>`;

      return (
        `<div class="skill-card">
          <div class="skill-card-top">
            <div>
              <div class="sname">IGN: ${escapeHtml(q.ign)}</div>
              <div class="smeta">${escapeHtml(fmt(q.timestamp))}</div>
              ${urlLine}
            </div>
            ${actions}
          </div>
        </div>`
      );
    }).join("");

    $("qList").innerHTML = rows || `<div class="note">Belum ada pengumpulan quest.</div>`;
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
      const icon = t.icon || makeTreeIcon(t.label);
      return (
        `<div class="tile${active}" data-tree="${escapeHtml(t.key)}">
          <div class="icon">${escapeHtml(icon)}</div>
          <div>
            <div class="tname">${escapeHtml(t.label)}</div>
            <div class="tsub">${escapeHtml(t.group)}</div>
          </div>
        </div>`
      );
    }

    $("gWeapon").innerHTML = groups.Weapon.map(tileHtml).join("") || `<div class="note">-</div>`;
    $("gBuff").innerHTML   = groups.Buff.map(tileHtml).join("")   || `<div class="note">-</div>`;
    $("gAssist").innerHTML = groups.Assist.map(tileHtml).join("") || `<div class="note">-</div>`;
    $("gOther").innerHTML  = groups.Other.map(tileHtml).join("")  || `<div class="note">-</div>`;

    document.querySelectorAll(".tile[data-tree]").forEach(tile=>{
      tile.onclick = ()=>{
        selectedTree = tile.dataset.tree || "";
        renderTreeMenu();
        syncSkillActions();
        renderSkillRight();
      };
    });

    // dropdown modal skill
    $("smTree").innerHTML = TREES.map(t=>`<option value="${escapeHtml(t.key)}">${escapeHtml(t.label)}</option>`).join("");
  }

  function syncSkillActions(){
    const showActions = (!!selectedTree && canManage());
    $("skillActions").style.display = showActions ? "" : "none";
    $("treeTitle").textContent = selectedTree ? treeLabelByKey(selectedTree) : "Belum memilih tree";
    $("treeMeta").textContent = selectedTree ? "Pilih skill di tree ini." : "Klik salah satu tree di panel kiri.";
  }

  function renderSkillRight(){
    if(!selectedTree){
      $("skillList").innerHTML = `<div class="note">Pilih tree untuk menampilkan daftar skill.</div>`;
      return;
    }

    const q = $("skillSearch").value.trim().toLowerCase();
    const list = skills
      .filter(s=>String(s.type||"")===String(selectedTree))
      .filter(s=>{
        if(!q) return true;
        const hay = (String(s.name||"")+" "+String(s.desc||"")+" "+String(s.level||"")+" "+String(s.kind||"")).toLowerCase();
        return hay.includes(q);
      })
      .slice()
      .sort((a,b)=>Number(b.updatedAt)-Number(a.updatedAt));

    if(list.length===0){
      $("skillList").innerHTML = `<div class="note">Belum ada skill di tree ini.</div>`;
      return;
    }

    const can = canManage();

    function skillCard(s){
      const mpTxt = (s.mp==="" || s.mp==null) ? "" : (` | MP: ${escapeHtml(s.mp)}`);
      const meta = `${kindLabel(s.kind||"Active")} | Senjata: ${escapeHtml(weaponLabelList(s.weapons))}`
        + (s.level ? ` | ${escapeHtml(s.level)}` : "")
        + mpTxt
        + ` | Update: ${escapeHtml(fmt(s.updatedAt))}`;

      const actions = can ? (
        `<div class="toolbar">
          <button class="btn btn-ghost" data-action="skill-edit" data-id="${escapeHtml(s.id)}">Edit</button>
          <button class="btn btn-danger" data-action="skill-delete" data-id="${escapeHtml(s.id)}">Hapus</button>
        </div>`
      ) : "";

      return (
        `<div class="skill-card">
          <div class="skill-card-top">
            <div>
              <div class="sname">${escapeHtml(s.name)}</div>
              <div class="smeta">${meta}</div>
            </div>
            ${actions}
          </div>
          <div class="sdesc">${escapeHtml(s.desc||"-")}</div>
        </div>`
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
      html += `<div class="group" style="margin-top:6px"><h3>${escapeHtml(kindLabel(k))}</h3></div>`;
      html += grouped[k].map(skillCard).join("");
    });

    $("skillList").innerHTML = html;
  }

  // =========================
  // Modals
  // =========================
  const adminModal = $("adminModal");
  const skillModal = $("skillModal");

  function openAdminModal(){
    adminModal.classList.add("show");
    $("adminPass").value = "";
    $("adminPass").focus();
  }
  function closeAdminModal(){ adminModal.classList.remove("show"); }

  function buildWeaponChecks(selectedKeys){
    const set = new Set(Array.isArray(selectedKeys) ? selectedKeys : []);
    $("smWeapons").innerHTML = WEAPONS.map(w=>{
      const checked = set.has(w.key) ? " checked" : "";
      return (
        `<label class="wItem">
          <input type="checkbox" value="${escapeHtml(w.key)}"${checked} />
          <span>${escapeHtml(w.label)}</span>
        </label>`
      );
    }).join("");
  }

  function openSkillModal(mode, data){
    if(!canManage()){
      alertBox("skillsAlert","Hanya admin yang bisa tambah/edit skill","err");
      return;
    }

    editingSkillId = (mode==="edit" && data) ? String(data.id) : "";
    $("skillModalTitle").textContent = editingSkillId ? "Edit Skill" : "Tambah Skill";

    const defaultTree = selectedTree || (TREES[0] ? TREES[0].key : "");
    $("smTree").value  = String((data && data.type) ? data.type : defaultTree);
    $("smKind").value  = String((data && data.kind) ? data.kind : "Active");
    $("smName").value  = String((data && data.name) ? data.name : "");
    $("smLevel").value = String((data && data.level) ? data.level : "");
    $("smMp").value    = (data && data.mp!=="" && data.mp!=null) ? String(data.mp) : "";
    $("smDesc").value  = String((data && data.desc) ? data.desc : "");

    buildWeaponChecks(data ? data.weapons : []);
    skillModal.classList.add("show");
  }

  function closeSkillModal(){ skillModal.classList.remove("show"); }

  // =========================
  // Live refresh
  // =========================
  async function liveRefreshAll(){
    const [rSkills, rMembers, rQuests] = await Promise.all([
      apiCall("skills_list", {}),
      apiCall("members_list", {}),
      apiCall("quests_list", {}),
    ]);

    skills  = (Array.isArray(rSkills.data)?rSkills.data:[]).map(cleanSkillObj).filter(s=>s.type && s.name);
    members = (Array.isArray(rMembers.data)?rMembers.data:[]).map(cleanMemberObj).filter(m=>m.ign);
    quests  = (Array.isArray(rQuests.data)?rQuests.data:[]).map(cleanQuestObj).filter(q=>q.ign);

    if(!selectedTree && TREES[0]) selectedTree = TREES[0].key;
  }

  function cleanSkillObj(s){
    const id = String(s.id||"").trim() || ("s"+Math.random().toString(16).slice(2));
    const type = String(s.type||"").trim();
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
  // Boot
  // =========================
  function syncAllUI(){
    applyAdminVisibility();

    $("adminBtn").textContent = isAdmin ? "👤 Admin (Logout)" : "🔐 Login Admin";

    renderTreeMenu();
    syncSkillActions();

    renderMembers();
    renderSkillRight();
    renderQuests();
  }

  async function boot(silent){
    if(!WEB_APP_URL){
      $("statusText").textContent = "WEB_APP_URL belum diisi (tab tetap bisa diklik)";
      if(!selectedTree && TREES[0]) selectedTree = TREES[0].key;
      syncAllUI();
      if(!silent) alertBox("skillsAlert","Isi WEB_APP_URL di app.js agar data bisa muncul", "info");
      return;
    }

    try{
      $("statusText").textContent = "Sinkronisasi…";
      await liveRefreshAll();
      syncAllUI();
      $("statusText").textContent = "Terhubung ✓";
      if(!silent) alertBox("skillsAlert","Data berhasil dimuat","ok");
    }catch(err){
      syncAllUI();
      $("statusText").textContent = "Gagal terhubung";
      if(!silent) alertBox("skillsAlert","Error: "+err.message,"err");
    }
  }

  // =========================
  // Events (klik tab + tombol)
  // =========================
  document.querySelectorAll(".tab").forEach(tab=>{
    tab.addEventListener("click", ()=>{
      document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
      tab.classList.add("active");

      const key = tab.dataset.tab;
      document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));

      const sec = document.getElementById(key);
      if(sec) sec.classList.add("active");
    });
  });

  $("refreshAll").addEventListener("click", async ()=>{ await boot(true); });

  $("adminBtn").addEventListener("click", ()=>{
    if(isAdmin){
      if(confirm("Logout admin?")){
        isAdmin = false;
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
    if(pass !== ADMIN_PASSWORD){
      alertBox("adminAlert","Password salah","err");
      return;
    }
    isAdmin = true;
    sessionStorage.setItem(ADMIN_KEY,"true");
    closeAdminModal();
    syncAllUI();
    alertBox("skillsAlert","Login admin berhasil","ok");
  });

  // Members
  $("mAdd").addEventListener("click", async ()=>{
    const ign = $("mIgn").value.trim();
    if(!ign){ alertBox("membersAlert","IGN wajib diisi","err"); return; }

    const rec = {
      id: "m"+Math.random().toString(16).slice(2),
      ign,
      name: $("mName").value.trim(),
      phone: $("mPhone").value.trim(),
      timestamp: Date.now()
    };

    try{
      await apiCall("members_upsert", {member: rec});
      await liveRefreshAll();
      renderMembers();
      alertBox("membersAlert","Terkirim","ok");
    }catch(err){
      alertBox("membersAlert","Gagal kirim: "+err.message,"err");
    }
  });

  $("mReset").addEventListener("click", ()=>{
    $("mName").value="";
    $("mIgn").value="";
    $("mPhone").value="";
  });

  $("mRefresh").addEventListener("click", async ()=>{
    await boot(true);
    alertBox("membersAlert","Refreshed","info");
  });

  $("mList").addEventListener("click", async (e)=>{
    const btn = e.target.closest('button[data-action="member-delete"]');
    if(!btn) return;
    if(!isAdmin){ alertBox("membersAlert","Hanya admin","err"); return; }

    const id = btn.dataset.id;
    if(!confirm("Hapus anggota ini?")) return;

    try{
      await apiCall("members_delete", {pass: ADMIN_PASSWORD, id});
      await liveRefreshAll();
      renderMembers();
      alertBox("membersAlert","Dihapus","ok");
    }catch(err){
      alertBox("membersAlert","Gagal hapus: "+err.message,"err");
    }
  });

  // Quests
  $("qSubmit").addEventListener("click", async ()=>{
    const ign = $("qIgn").value.trim();
    if(!ign){ alertBox("questsAlert","IGN wajib diisi","err"); return; }

    const rec = {
      id:"q"+Math.random().toString(16).slice(2),
      ign,
      screenshotUrl: $("qUrl").value.trim(),
      timestamp: Date.now()
    };

    try{
      await apiCall("quests_upsert", {quest: rec});
      $("qUrl").value="";
      await liveRefreshAll();
      renderQuests();
      alertBox("questsAlert","Terkirim","ok");
    }catch(err){
      alertBox("questsAlert","Gagal kirim: "+err.message,"err");
    }
  });

  $("qRefresh").addEventListener("click", async ()=>{
    await boot(true);
    alertBox("questsAlert","Refreshed","info");
  });

  $("qList").addEventListener("click", async (e)=>{
    const btn = e.target.closest('button[data-action="quest-delete"]');
    if(!btn) return;
    if(!isAdmin){ alertBox("questsAlert","Hanya admin","err"); return; }

    const id = btn.dataset.id;
    if(!confirm("Hapus data quest ini?")) return;

    try{
      await apiCall("quests_delete", {pass: ADMIN_PASSWORD, id});
      await liveRefreshAll();
      renderQuests();
      alertBox("questsAlert","Dihapus","ok");
    }catch(err){
      alertBox("questsAlert","Gagal hapus: "+err.message,"err");
    }
  });

  // Skills
  $("skillSearch").addEventListener("input", ()=>renderSkillRight());

  $("addSkill").addEventListener("click", ()=>openSkillModal("add"));

  $("smCancel").addEventListener("click", closeSkillModal);
  skillModal.addEventListener("click", (e)=>{ if(e.target===skillModal) closeSkillModal(); });

  $("smSave").addEventListener("click", async ()=>{
    if(!canManage()) return;
    if(!WEB_APP_URL){ alertBox("skillsAlert","WEB_APP_URL belum diisi","err"); return; }

    const type = $("smTree").value;
    const kind = $("smKind").value;
    const name = $("smName").value.trim();
    if(!name){ alertBox("skillsAlert","Nama skill wajib diisi","err"); return; }

    const level = $("smLevel").value.trim();
    const desc  = $("smDesc").value.trim();

    const weaponKeys = Array.from($("smWeapons").querySelectorAll('input[type="checkbox"]'))
      .filter(x=>x.checked)
      .map(x=>x.value);

    const mpRaw = $("smMp").value.trim();
    const mp = (mpRaw==="") ? "" : Number(mpRaw);
    if(mpRaw!=="" && Number.isNaN(mp)){
      alertBox("skillsAlert","MP harus angka","err");
      return;
    }

    const rec = {
      id: editingSkillId || ("s"+Math.random().toString(16).slice(2)),
      type, kind,
      weapons: weaponKeys,
      name, level, mp, desc,
      updatedAt: Date.now()
    };

    try{
      await apiCall("skills_upsert", {pass: ADMIN_PASSWORD, skill: rec});
      await liveRefreshAll();
      selectedTree = type;
      closeSkillModal();
      renderTreeMenu();
      syncSkillActions();
      renderSkillRight();
      alertBox("skillsAlert","Skill tersimpan","ok");
    }catch(err){
      alertBox("skillsAlert","Gagal simpan: "+err.message,"err");
    }
  });

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

      try{
        await apiCall("skills_delete", {pass: ADMIN_PASSWORD, id});
        await liveRefreshAll();
        renderSkillRight();
        alertBox("skillsAlert","Skill dihapus","ok");
      }catch(err){
        alertBox("skillsAlert","Gagal hapus: "+err.message,"err");
      }
    }
  });

  // Init
  // default selected tree supaya panel kanan nggak kosong total
  if(!selectedTree && TREES[0]) selectedTree = TREES[0].key;
  syncAllUI();
  boot(true);
})();