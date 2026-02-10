(function(){
  "use strict";

  // =========================
  // CONFIG
  // =========================
  // WAJIB: isi URL Web App Apps Script kamu di sini
  // Contoh: https://script.google.com/macros/s/XXXX/exec
  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxhQDbT_tIDPNF3jKpANN8_dAbSTDh9hsFmivpkBorY9XY0r8bTO6T9oRS3tw8AQTGNiw/exec"; // <-- tempel URL kamu

  // Admin
  const ADMIN_PASSWORD = "Elderrol";
  const ADMIN_KEY = "elderrol_admin";

  // ImgBB (untuk Quest screenshot)
  // Catatan: karena GitHub Pages itu publik, API key ini juga akan terlihat di source.
  // Kalau kamu punya cara server-side, API key bisa disembunyikan. Tapi untuk sekarang ini yang paling stabil.
  const IMGBB_API_KEY = "05d83387b53dda1991a18490ac86430a";

  // Neura API
  const NEURA_BASE = "https://dev-neura.vercel.app/api";

  // Default Trees (fixed, tidak disimpan ke spreadsheet)
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
  // DOM + utils
  // =========================
  const $ = (id)=>document.getElementById(id);

  function escapeHtml(t){
    const d = document.createElement('div');
    d.textContent = String(t == null ? '' : t);
    return d.innerHTML;
  }

  function fmt(ts){
    try{
      return new Date(Number(ts)).toLocaleString('id-ID',{
        day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'
      });
    }catch(e){
      return '-';
    }
  }

  function alertBox(target,msg,type){
    const cls = type==='ok'?'ok': type==='err'?'err':'info';
    const el = $(target);
    if(!el) return;
    el.innerHTML = '<div class="alert '+cls+'">'+escapeHtml(msg)+'</div>';
    setTimeout(()=>{ if(el) el.innerHTML=''; }, 3500);
  }

  function normalizeGroup(g){
    const ok = ['Weapon','Buff','Assist','Other'];
    return ok.indexOf(g)>=0 ? g : 'Other';
  }

  function makeTreeIcon(name){
    const s = String(name||'').trim();
    if(!s) return 'TR';
    const words = s.split(' ').filter(Boolean);
    const a = (words[0] && words[0][0]) ? words[0][0] : (s[0] || 'T');
    const b = (words[1] && words[1][0]) ? words[1][0] : (s[1] || 'R');
    return String(a+b).toUpperCase();
  }

  function weaponLabel(k){
    const w = WEAPONS.find(x=>x.key===k);
    return w ? w.label : k;
  }

  function weaponLabelList(keys){
    const arr = Array.isArray(keys) ? keys.filter(Boolean) : [];
    if(arr.length===0) return 'Semua Senjata';
    return arr.map(weaponLabel).join(', ');
  }

  function kindLabel(k){
    return (k==='Passive') ? 'Pasif' : (k==='Extra' ? 'Extra' : 'Aktif');
  }

  function setStatus(text, isOk){
    const el = $('statusText');
    if(!el) return;
    el.textContent = text;
    el.style.color = isOk ? 'var(--ok)' : '';
  }

  function setModePill(text){
    const el = $('modePill');
    if(el) el.textContent = text;
  }

  // =========================
  // JSONP API (Apps Script)
  // =========================
  function toB64(str){
    try{ return btoa(unescape(encodeURIComponent(String(str)))); }catch(e){ return ''; }
  }

  function apiJsonp(action, payload){
    return new Promise((resolve, reject)=>{
      if(!WEB_APP_URL) return reject(new Error('WEB_APP_URL belum diisi'));
      const cb = '__elderrol_cb_' + Math.random().toString(16).slice(2);
      let script = null;

      const timer = setTimeout(()=>{
        cleanup();
        reject(new Error('Timeout memanggil Apps Script'));
      }, 15000);

      function cleanup(){
        clearTimeout(timer);
        try{ delete window[cb]; }catch(e){ window[cb]=undefined; }
        if(script && script.parentNode) script.parentNode.removeChild(script);
      }

      window[cb] = (data)=>{ cleanup(); resolve(data); };

      const sep = WEB_APP_URL.indexOf('?')>=0 ? '&' : '?';
      const q = [
        'action=' + encodeURIComponent(action),
        'callback=' + encodeURIComponent(cb),
        'payload=' + encodeURIComponent(toB64(JSON.stringify(payload || {})))
      ];

      script = document.createElement('script');
      script.async = true;
      script.src = WEB_APP_URL + sep + q.join('&');
      script.onerror = ()=>{ cleanup(); reject(new Error('Gagal load JSONP (cek URL WebApp / akses publik)')); };
      document.body.appendChild(script);
    });
  }

  async function apiCall(action, payload){
    const res = await apiJsonp(action, payload);
    if(!res || res.ok===false) throw new Error((res && res.error) ? res.error : 'API error');
    return res;
  }

  // =========================
  // Fetch helper
  // =========================
  async function fetchJson(url, opts){
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 15000);
    try{
      const res = await fetch(url, { ...(opts||{}), signal: ctrl.signal });
      const txt = await res.text();
      let js = null;
      try{ js = JSON.parse(txt); }catch(e){ js = { raw: txt }; }
      if(!res.ok) throw new Error((js && js.message) ? js.message : ('HTTP '+res.status));
      return js;
    } finally {
      clearTimeout(t);
    }
  }

  // =========================
  // ImgBB upload (Quest)
  // =========================
  async function uploadToImgBB(file){
    if(!file) return "";
    const form = new FormData();
    form.append("image", file);
    form.append("name", "elderrol_" + Date.now());
    const url = "https://api.imgbb.com/1/upload?key=" + encodeURIComponent(IMGBB_API_KEY);
    const js = await fetchJson(url, { method: "POST", body: form });
    if(!js || js.success !== true) throw new Error((js && js.error && js.error.message) ? js.error.message : "Upload ImgBB gagal");
    // imgbb biasanya punya data.display_url / data.url
    const u = (js.data && (js.data.display_url || js.data.url)) ? (js.data.display_url || js.data.url) : "";
    if(!u) throw new Error("Upload berhasil tapi URL kosong");
    return u;
  }

  // =========================
  // State
  // =========================
  let TREES = DEFAULT_TREES.slice();
  let skills = [];
  let members = [];
  let quests = [];

  let isAdmin = sessionStorage.getItem(ADMIN_KEY) === 'true';
  let selectedTree = '';

  function canManage(){ return !!isAdmin; }
  function applyAdminVisibility(){ document.body.classList.toggle('is-admin', !!isAdmin); }

  // =========================
  // Renderers
  // =========================
  function renderMembers(){
    const showPrivate = !!isAdmin;
    const list = members.slice().sort((a,b)=>Number(b.timestamp)-Number(a.timestamp));

    const rows = list.map(m=>{
      const actions = showPrivate
        ? '<button class="btn btn-danger" data-action="member-delete" data-id="'+escapeHtml(m.id)+'">Hapus</button>'
        : '';

      const privateLine = showPrivate
        ? '<div class="smeta">Nama: '+escapeHtml(m.name||'-')+' | HP: '+escapeHtml(m.phone||'-')+'</div>'
        : '';

      return (
        '<div class="skill-card">'
        + '<div class="skill-card-top">'
        +   '<div>'
        +     '<div class="sname">'+escapeHtml(m.ign)+'</div>'
        +     '<div class="smeta">'+escapeHtml(fmt(m.timestamp))+'</div>'
        +     privateLine
        +   '</div>'
        +   actions
        + '</div>'
        + '</div>'
      );
    }).join('');

    $('mList').innerHTML = rows || '<div class="note">Belum ada anggota.</div>';
  }

  function renderQuests(){
    const showActions = !!isAdmin;
    const list = quests.slice().sort((a,b)=>Number(b.timestamp)-Number(a.timestamp));

    const rows = list.map(q=>{
      const actions = showActions
        ? '<button class="btn btn-danger" data-action="quest-delete" data-id="'+escapeHtml(q.id)+'">Hapus</button>'
        : '';

      const img = q.screenshotUrl
        ? '<a href="'+escapeHtml(q.screenshotUrl)+'" target="_blank" rel="noopener"><img class="qImg" src="'+escapeHtml(q.screenshotUrl)+'" alt="screenshot" loading="lazy"/></a>'
        : '<div class="note">Screenshot: -</div>';

      return (
        '<div class="skill-card">'
        + '<div class="skill-card-top">'
        +   '<div>'
        +     '<div class="sname">IGN: '+escapeHtml(q.ign)+'</div>'
        +     '<div class="qMeta">'+escapeHtml(fmt(q.timestamp))+'</div>'
        +   '</div>'
        +   actions
        + '</div>'
        + '<div class="mt10">'+img+'</div>'
        + '</div>'
      );
    }).join('');

    $('qList').innerHTML = rows || '<div class="note">Belum ada pengumpulan quest.</div>';
  }

  function treeLabelByKey(key){
    const t = TREES.find(x=>String(x.key)===String(key));
    return t ? t.label : String(key||'');
  }

  function renderTreeMenu(){
    const groups = {Weapon:[], Buff:[], Assist:[], Other:[]};
    TREES.forEach(t=>{ groups[normalizeGroup(t.group)].push(t); });

    function tileHtml(t){
      const active = (t.key===selectedTree) ? ' active' : '';
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

    $('gWeapon').innerHTML = groups.Weapon.map(tileHtml).join('') || '<div class="note">-</div>';
    $('gBuff').innerHTML   = groups.Buff.map(tileHtml).join('')   || '<div class="note">-</div>';
    $('gAssist').innerHTML = groups.Assist.map(tileHtml).join('') || '<div class="note">-</div>';
    $('gOther').innerHTML  = groups.Other.map(tileHtml).join('')  || '<div class="note">-</div>';

    // desktop click
    document.querySelectorAll('.tile[data-tree]').forEach(tile=>{
      tile.onclick = ()=>{
        selectedTree = tile.dataset.tree || '';
        syncSkillActions();
        renderTreeMenu();
        renderSkillRight();
        syncMobileTreeSelect();
      };
    });

    // modal select options
    $('smTree').innerHTML = TREES.map(t=>'<option value="'+escapeHtml(t.key)+'">'+escapeHtml(t.label)+'</option>').join('');

    // mobile select options
    syncMobileTreeSelect();
  }

  function syncMobileTreeSelect(){
    const sel = $('treeSelectMobile');
    if(!sel) return;
    sel.innerHTML = TREES.map(t=>'<option value="'+escapeHtml(t.key)+'">'+escapeHtml(t.label)+'</option>').join('');
    sel.value = selectedTree || (TREES[0] ? TREES[0].key : '');
  }

  function syncSkillActions(){
    const showActions = (!!selectedTree && canManage());
    $('skillActions').style.display = showActions ? '' : 'none';

    $('treeTitle').textContent = selectedTree ? treeLabelByKey(selectedTree) : 'Belum memilih tree';
    $('treeMeta').textContent = selectedTree ? 'Pilih skill di tree ini.' : 'Pilih tree untuk menampilkan daftar skill.';
  }

  function renderSkillRight(){
    if(!selectedTree){
      $('skillList').innerHTML = '<div class="note">Pilih tree untuk menampilkan daftar skill.</div>';
      return;
    }

    const q = $('skillSearch').value.trim().toLowerCase();
    const list = skills
      .filter(s=>String(s.type||'')===String(selectedTree))
      .filter(s=>{
        if(!q) return true;
        const hay = (String(s.name||'')+' '+String(s.desc||'')+' '+String(s.level||'')+' '+String(s.kind||'')).toLowerCase();
        return hay.indexOf(q)>=0;
      })
      .slice()
      .sort((a,b)=>Number(b.updatedAt)-Number(a.updatedAt));

    if(list.length===0){
      $('skillList').innerHTML = '<div class="note">Belum ada skill di tree ini.</div>';
      return;
    }

    const can = canManage();

    function skillCard(s){
      const mpTxt = (s.mp==='' || s.mp==null) ? '' : (' | MP: '+escapeHtml(s.mp));
      const meta = kindLabel(s.kind||'Active')
        + ' | Senjata: ' + escapeHtml(weaponLabelList(s.weapons))
        + (s.level ? (' | '+escapeHtml(s.level)) : '')
        + mpTxt
        + ' | Update: ' + escapeHtml(fmt(s.updatedAt));

      const actions = can
        ? (
          '<div class="toolbar">'
          + '<button class="btn btn-ghost" data-action="skill-edit" data-id="'+escapeHtml(s.id)+'">Edit</button>'
          + '<button class="btn btn-danger" data-action="skill-delete" data-id="'+escapeHtml(s.id)+'">Hapus</button>'
          + '</div>'
        )
        : '';

      return (
        '<div class="skill-card">'
        + '<div class="skill-card-top">'
        +   '<div>'
        +     '<div class="sname">'+escapeHtml(s.name)+'</div>'
        +     '<div class="smeta">'+meta+'</div>'
        +   '</div>'
        +   actions
        + '</div>'
        + '<div class="sdesc">'+escapeHtml(s.desc||'-')+'</div>'
        + '</div>'
      );
    }

    const grouped = {Active:[], Passive:[], Extra:[]};
    list.forEach(s=>{
      const k = (s.kind==='Passive' || s.kind==='Extra') ? s.kind : 'Active';
      grouped[k].push(s);
    });

    let html = '';
    ['Active','Passive','Extra'].forEach(k=>{
      if(grouped[k].length===0) return;
      html += '<div class="group" style="margin-top:6px"><h3>'+escapeHtml(kindLabel(k))+'</h3></div>';
      html += grouped[k].map(skillCard).join('');
    });

    $('skillList').innerHTML = html;
  }

  // =========================
  // Skill Modal
  // =========================
  const skillModal = $('skillModal');
  let editingSkillId = '';

  function buildWeaponChecks(selectedKeys){
    const set = new Set(Array.isArray(selectedKeys) ? selectedKeys : []);
    $('smWeapons').innerHTML = WEAPONS.map(w=>{
      const checked = set.has(w.key) ? ' checked' : '';
      return (
        '<label class="wItem">'
        + '<input type="checkbox" value="'+escapeHtml(w.key)+'"'+checked+' />'
        + '<span>'+escapeHtml(w.label)+'</span>'
        + '</label>'
      );
    }).join('');
  }

  function openSkillModal(mode, data){
    if(!canManage()){ alertBox('skillsAlert','Hanya admin yang bisa tambah/edit skill','err'); return; }
    editingSkillId = (mode==='edit' && data) ? String(data.id) : '';
    $('skillModalTitle').textContent = (editingSkillId ? 'Edit Skill' : 'Tambah Skill');

    const defaultTree = selectedTree || (TREES[0] ? TREES[0].key : '');
    $('smTree').value  = String((data && data.type) ? data.type : defaultTree);
    $('smKind').value  = String((data && data.kind) ? data.kind : 'Active');
    $('smName').value  = String((data && data.name) ? data.name : '');
    $('smLevel').value = String((data && data.level) ? data.level : '');
    $('smMp').value    = (data && data.mp!=='' && data.mp!=null) ? String(data.mp) : '';
    $('smDesc').value  = String((data && data.desc) ? data.desc : '');

    buildWeaponChecks(data ? data.weapons : []);
    skillModal.classList.add('show');
  }

  function closeSkillModal(){ skillModal.classList.remove('show'); }

  // =========================
  // Neura Info render helpers
  // =========================
  function renderAnyJson(targetId, data){
    const el = $(targetId);
    if(!el) return;
    el.innerHTML = '<div class="pre">'+escapeHtml(JSON.stringify(data, null, 2))+'</div>';
  }

  async function loadBannerAva(){
    try{
      const js = await fetchJson(NEURA_BASE + "/bannerava");
      // coba tampilkan lebih bagus jika ada array gambar
      const box = $('bannerBox');
      if(Array.isArray(js)){
        box.innerHTML = js.map(x=>'<div class="skill-card"><div class="pre">'+escapeHtml(JSON.stringify(x,null,2))+'</div></div>').join('');
      }else{
        renderAnyJson('bannerBox', js);
      }
    }catch(err){
      $('bannerBox').innerHTML = '<div class="alert err">'+escapeHtml(err.message)+'</div>';
    }
  }

  async function loadBuffAll(){
    try{
      const js = await fetchJson(NEURA_BASE + "/buff");
      renderAnyJson('buffBox', js);
    }catch(err){
      $('buffBox').innerHTML = '<div class="alert err">'+escapeHtml(err.message)+'</div>';
    }
  }

  async function searchBuff(){
    const q = $('buffQuery').value.trim();
    if(!q){ alertBox('buffBox','Isi kata kunci buff dulu','err'); return; }
    try{
      const js = await fetchJson(NEURA_BASE + "/buff/idname=" + encodeURIComponent(q));
      renderAnyJson('buffBox', js);
    }catch(err){
      $('buffBox').innerHTML = '<div class="alert err">'+escapeHtml(err.message)+'</div>';
    }
  }

  async function loadLevelDefault(){
    // tidak ada default, cuma kasih hint
    $('levelBox').innerHTML = '<div class="note">Isi Current Level & Range, lalu klik Cari Spot.</div>';
  }

  async function searchLevel(){
    const cur = $('lvCurrent').value.trim();
    const range = $('lvRange').value.trim();
    if(!cur || !range){
      alertBox('levelBox','Isi Current Level dan Range','err');
      return;
    }
    try{
      const js = await fetchJson(NEURA_BASE + "/lv/current=" + encodeURIComponent(cur) + "&range=" + encodeURIComponent(range));
      renderAnyJson('levelBox', js);
    }catch(err){
      $('levelBox').innerHTML = '<div class="alert err">'+escapeHtml(err.message)+'</div>';
    }
  }

  async function tryCustom(){
    const p = $('customPath').value.trim();
    if(!p){ alertBox('customBox','Isi path endpoint dulu','err'); return; }
    const path = p.startsWith('/') ? p : ('/' + p);
    try{
      const js = await fetchJson(NEURA_BASE + path);
      renderAnyJson('customBox', js);
    }catch(err){
      $('customBox').innerHTML = '<div class="alert err">'+escapeHtml(err.message)+'</div>';
    }
  }

  // =========================
  // Live refresh
  // =========================
  function cleanSkillObj(s){
    const id = String(s.id||'').trim() || ('s'+Math.random().toString(16).slice(2));
    const type = String(s.type||s.tree||'').trim();
    const kind = String(s.kind||'Active').trim() || 'Active';
    const name = String(s.name||'').trim();
    const level = String(s.level||'').trim();
    const desc = String(s.desc||'').trim();

    const weapons = Array.isArray(s.weapons)
      ? s.weapons.map(x=>String(x).trim()).filter(Boolean)
      : String(s.weapons||'').split(',').map(x=>x.trim()).filter(Boolean);

    const mpRaw = s.mp;
    const mpNum = Number(mpRaw);
    const mp = (mpRaw==='' || mpRaw==null || Number.isNaN(mpNum)) ? '' : mpNum;

    const updatedAt = Number(s.updatedAt || Date.now());
    return {id,type,kind,weapons,name,level,mp,desc,updatedAt};
  }

  function cleanMemberObj(m){
    const id = String(m.id||'').trim() || ('m'+Math.random().toString(16).slice(2));
    const ign = String(m.ign||'').trim();
    const name = String(m.name||'').trim();
    const phone = String(m.phone||'').trim();
    const timestamp = Number(m.timestamp || Date.now());
    return {id, ign, name, phone, timestamp};
  }

  function cleanQuestObj(q){
    const id = String(q.id||'').trim() || ('q'+Math.random().toString(16).slice(2));
    const ign = String(q.ign||'').trim();
    const screenshotUrl = String(q.screenshotUrl||q.url||'').trim();
    const timestamp = Number(q.timestamp || Date.now());
    return {id, ign, screenshotUrl, timestamp};
  }

  async function liveRefreshAll(){
    const pass = isAdmin ? ADMIN_PASSWORD : "";
    const r2 = await apiCall('skills_list', {pass});
    const r3 = await apiCall('members_list', {pass});
    const r4 = await apiCall('quests_list', {pass});

    skills  = (Array.isArray(r2.data)?r2.data:[]).map(cleanSkillObj).filter(s=>s.type && s.name);
    members = (Array.isArray(r3.data)?r3.data:[]).map(cleanMemberObj).filter(m=>m.ign);
    quests  = (Array.isArray(r4.data)?r4.data:[]).map(cleanQuestObj).filter(q=>q.ign);

    if(!selectedTree && TREES[0]) selectedTree = TREES[0].key;
  }

  // =========================
  // UI sync
  // =========================
  function syncAllUI(){
    applyAdminVisibility();
    $('adminBtn').textContent = isAdmin ? '👤 Admin (Logout)' : '🔐 Login Admin';

    renderTreeMenu();
    syncSkillActions();
    renderSkillRight();

    renderMembers();
    renderQuests();

    // info defaults
    loadLevelDefault();
  }

  // =========================
  // Boot
  // =========================
  async function boot(force){
    setStatus("Menghubungkan ke spreadsheet…", false);

    if(!WEB_APP_URL){
      setModePill("Preview");
      setStatus("Preview: WEB_APP_URL belum diisi (data tidak sinkron).", false);
      // kosongkan data, tapi UI tetap bisa dibuka
      skills = [];
      members = [];
      quests = [];
      if(!selectedTree && TREES[0]) selectedTree = TREES[0].key;
      syncAllUI();
      return;
    }

    setModePill("Live");

    try{
      await liveRefreshAll();
      setStatus("Terhubung (Live) ✅", true);
      syncAllUI();
    }catch(err){
      setStatus("Gagal terhubung: " + err.message, false);
      syncAllUI();
    }
  }

  // =========================
  // Events
  // =========================
  // Tabs
  document.querySelectorAll('.tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      tab.classList.add('active');
      const key = tab.dataset.tab;
      document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
      $(key).classList.add('active');

      // lazy load for info tab
      if(key === "info"){
        // no auto load, user can click
      }
    });
  });

  $('refreshAll').addEventListener('click', async ()=>{
    await boot(true);
    alertBox('skillsAlert','Refreshed','ok');
  });

  // Admin modal
  const adminModal = $('adminModal');
  function openAdminModal(){
    adminModal.classList.add('show');
    $('adminPass').value='';
    $('adminPass').focus();
  }
  function closeAdminModal(){ adminModal.classList.remove('show'); }

  $('adminBtn').addEventListener('click', ()=>{
    if(isAdmin){
      if(confirm('Logout admin?')){
        isAdmin=false;
        sessionStorage.removeItem(ADMIN_KEY);
        boot(true);
        alertBox('adminAlert','Logout berhasil','ok');
      }
      return;
    }
    openAdminModal();
  });

  $('adminCancel').addEventListener('click', closeAdminModal);
  adminModal.addEventListener('click', (e)=>{ if(e.target===adminModal) closeAdminModal(); });

  $('adminLogin').addEventListener('click', async ()=>{
    const pass = $('adminPass').value;
    if(pass !== ADMIN_PASSWORD){
      alertBox('adminAlert','Password salah','err');
      return;
    }
    isAdmin = true;
    sessionStorage.setItem(ADMIN_KEY,'true');
    closeAdminModal();
    await boot(true);
    alertBox('skillsAlert','Login admin berhasil','ok');
  });

  // Members
  $('mAdd').addEventListener('click', async ()=>{
    const ign = $('mIgn').value.trim();
    if(!ign){ alertBox('membersAlert','IGN wajib diisi','err'); return; }

    const rec = {
      id: 'm'+Math.random().toString(16).slice(2),
      ign,
      name: $('mName').value.trim(),
      phone: $('mPhone').value.trim(),
      timestamp: Date.now()
    };

    try{
      await apiCall('members_upsert', {member: rec});
      await liveRefreshAll();
      renderMembers();
      alertBox('membersAlert','Terkirim','ok');
    }catch(err){
      alertBox('membersAlert','Gagal kirim: '+err.message,'err');
    }
  });

  $('mReset').addEventListener('click', ()=>{
    $('mName').value='';
    $('mIgn').value='';
    $('mPhone').value='';
  });

  $('mRefresh').addEventListener('click', async ()=>{
    await boot(true);
    alertBox('membersAlert','Refreshed','info');
  });

  $('mList').addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-action="member-delete"]');
    if(!btn) return;
    if(!isAdmin){ alertBox('membersAlert','Hanya admin','err'); return; }

    const id = btn.dataset.id;
    if(!confirm('Hapus anggota ini?')) return;

    try{
      await apiCall('members_delete', {pass: ADMIN_PASSWORD, id});
      await liveRefreshAll();
      renderMembers();
      alertBox('membersAlert','Dihapus','ok');
    }catch(err){
      alertBox('membersAlert','Gagal hapus: '+err.message,'err');
    }
  });

  // Skills search
  $('skillSearch').addEventListener('input', ()=>renderSkillRight());

  // Mobile tree select
  $('treeSelectMobile').addEventListener('change', ()=>{
    selectedTree = $('treeSelectMobile').value;
    syncSkillActions();
    renderTreeMenu();
    renderSkillRight();
  });

  // Skill list actions (edit/delete)
  $('skillList').addEventListener('click', async (e)=>{
    const edit = e.target.closest('button[data-action="skill-edit"]');
    const del  = e.target.closest('button[data-action="skill-delete"]');

    if(edit){
      if(!canManage()){ alertBox('skillsAlert','Hanya admin','err'); return; }
      const id = edit.dataset.id;
      const s = skills.find(x=>x.id===id);
      if(!s){ alertBox('skillsAlert','Skill tidak ditemukan','err'); return; }
      openSkillModal('edit', s);
      return;
    }

    if(del){
      if(!canManage()){ alertBox('skillsAlert','Hanya admin','err'); return; }
      const id = del.dataset.id;
      if(!confirm('Hapus skill ini?')) return;

      try{
        await apiCall('skills_delete', {pass: ADMIN_PASSWORD, id});
        await liveRefreshAll();
        renderSkillRight();
        alertBox('skillsAlert','Skill dihapus','ok');
      }catch(err){
        alertBox('skillsAlert','Gagal hapus: '+err.message,'err');
      }
    }
  });

  $('addSkill').addEventListener('click', ()=>openSkillModal('add'));
  $('smCancel').addEventListener('click', closeSkillModal);
  skillModal.addEventListener('click', (e)=>{ if(e.target===skillModal) closeSkillModal(); });

  $('smSave').addEventListener('click', async ()=>{
    if(!canManage()) return;

    const type = $('smTree').value;
    const kind = $('smKind').value;
    const name = $('smName').value.trim();
    if(!name){ alertBox('skillsAlert','Nama skill wajib diisi','err'); return; }

    const level = $('smLevel').value.trim();
    const desc  = $('smDesc').value.trim();

    const weaponKeys = Array.from($('smWeapons').querySelectorAll('input[type="checkbox"]'))
      .filter(x=>x.checked)
      .map(x=>x.value);

    const mpRaw = $('smMp').value.trim();
    const mp = (mpRaw==='') ? '' : Number(mpRaw);
    if(mpRaw!=='' && Number.isNaN(mp)){
      alertBox('skillsAlert','MP harus angka','err');
      return;
    }

    const rec = {
      id: editingSkillId || ('s'+Math.random().toString(16).slice(2)),
      type, kind,
      weapons: weaponKeys,
      name, level, mp, desc,
      updatedAt: Date.now()
    };

    try{
      await apiCall('skills_upsert', {pass: ADMIN_PASSWORD, skill: rec});
      await liveRefreshAll();
      selectedTree = type;
      closeSkillModal();
      renderTreeMenu();
      syncSkillActions();
      renderSkillRight();
      alertBox('skillsAlert','Skill tersimpan','ok');
    }catch(err){
      alertBox('skillsAlert','Gagal simpan: '+err.message,'err');
    }
  });

  // Quests
  $('qFile').addEventListener('change', ()=>{
    const file = $('qFile').files && $('qFile').files[0] ? $('qFile').files[0] : null;
    const box = $('qPreview');
    box.innerHTML = '';
    if(!file) return;
    const url = URL.createObjectURL(file);
    box.innerHTML = '<img src="'+escapeHtml(url)+'" alt="preview" />';
  });

  $('qSubmit').addEventListener('click', async ()=>{
    const ign = $('qIgn').value.trim();
    if(!ign){ alertBox('questsAlert','IGN wajib diisi','err'); return; }

    const file = $('qFile').files && $('qFile').files[0] ? $('qFile').files[0] : null;
    if(!file){ alertBox('questsAlert','Pilih screenshot dulu','err'); return; }

    const btn = $('qSubmit');
    btn.disabled = true;
    btn.textContent = 'Uploading…';

    try{
      const url = await uploadToImgBB(file);

      const rec = {
        id:'q'+Math.random().toString(16).slice(2),
        ign,
        screenshotUrl: url,
        timestamp: Date.now()
      };

      await apiCall('quests_upsert', {quest: rec});
      $('qFile').value = '';
      $('qPreview').innerHTML = '';
      await liveRefreshAll();
      renderQuests();
      alertBox('questsAlert','Terkirim','ok');
    }catch(err){
      alertBox('questsAlert','Gagal: '+err.message,'err');
    }finally{
      btn.disabled = false;
      btn.textContent = 'Kirim';
    }
  });

  $('qRefresh').addEventListener('click', async ()=>{
    await boot(true);
    alertBox('questsAlert','Refreshed','info');
  });

  $('qList').addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-action="quest-delete"]');
    if(!btn) return;
    if(!isAdmin){ alertBox('questsAlert','Hanya admin','err'); return; }

    const id = btn.dataset.id;
    if(!confirm('Hapus data quest ini?')) return;

    try{
      await apiCall('quests_delete', {pass: ADMIN_PASSWORD, id});
      await liveRefreshAll();
      renderQuests();
      alertBox('questsAlert','Dihapus','ok');
    }catch(err){
      alertBox('questsAlert','Gagal hapus: '+err.message,'err');
    }
  });

  // Info (Neura)
  $('loadBanner').addEventListener('click', loadBannerAva);
  $('loadBuff').addEventListener('click', loadBuffAll);
  $('searchBuff').addEventListener('click', searchBuff);
  $('loadLevel').addEventListener('click', loadLevelDefault);
  $('searchLevel').addEventListener('click', searchLevel);
  $('tryCustom').addEventListener('click', tryCustom);

  // Init weapon checks once
  buildWeaponChecks([]);

  // Boot
  if(!selectedTree && TREES[0]) selectedTree = TREES[0].key;
  boot(false);
})();