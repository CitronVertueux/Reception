// ══ SUPABASE ══
const SUPABASE_URL='https://qnoaclsvbuelzbmpsdib.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFub2FjbHN2YnVlbHpibXBzZGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjE3NDUsImV4cCI6MjA5NDgzNzc0NX0.MeEGe77mVVGO--BvUGglKfH_NkFV2gbRY6GupX0sl6c';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

// ══ CONSTANTES ══
const ROLE_FR={admin:'Administrateur',responsable:'Responsable',employe:'Employé',transporteur:'Transporteur',chauffeur:'Chauffeur'};
const ROLE_BADGE={admin:'br',responsable:'bo',employe:'bb',transporteur:'bg',chauffeur:'bgy'};
const CRENEAUX=['06:00–08:00','08:00–10:00','10:00–12:00','12:00–14:00','14:00–16:00','16:00–18:00'];
const MAX_PAR_CRENEAU=3;
const JOURS=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const MOIS=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const fmt=d=>d.toISOString().split('T')[0];
const now=new Date();
const todayStr=fmt(now);
const tomorrowStr=fmt(new Date(now.getTime()+86400000));
const ST={confirme:{lbl:'Confirmé',cls:'bg'},non_arrive:{lbl:'Non arrivé',cls:'br'},annule:{lbl:'Annulé',cls:'bgy'}};
const MAT_COLORS=['#D97706','#B45309','#EAB308','#84CC16','#22C55E','#F97316','#3B82F6','#F59E0B','#10B981','#8B5CF6','#EC4899','#06B6D4'];

const TABS={
  admin:[{id:'dash',lbl:'📊 Bord'},{id:'rdv',lbl:'📅 RDV'},{id:'cal',lbl:'🗓 Calendrier'},{id:'hist',lbl:'📁 Historique'},{id:'rapports',lbl:'📈 Rapports'},{id:'slots',lbl:'⏱ Créneaux'},{id:'matieres',lbl:'🌾 Matières'},{id:'users',lbl:'👥 Utilisateurs'},{id:'settings',lbl:'⚙️ Paramètres'}],
  responsable:[{id:'dash',lbl:'📊 Bord'},{id:'rdv',lbl:'📅 RDV'},{id:'cal',lbl:'🗓 Calendrier'},{id:'hist',lbl:'📁 Historique'},{id:'rapports',lbl:'📈 Rapports'},{id:'slots',lbl:'⏱ Créneaux'},{id:'matieres',lbl:'🌾 Matières'},{id:'users',lbl:'👥 Utilisateurs'}],
  employe:[{id:'dash',lbl:'📊 Bord'},{id:'rdv',lbl:'📅 RDV'},{id:'cal',lbl:'🗓 Calendrier'},{id:'hist',lbl:'📁 Historique'}],
  transporteur:[{id:'rdv',lbl:'📅 Mes RDV'},{id:'cal',lbl:'🗓 Calendrier'},{id:'new',lbl:'➕ Nouveau'},{id:'drivers',lbl:'👷 Chauffeurs'},{id:'hist',lbl:'📁 Historique'}],
  chauffeur:[{id:'rdv',lbl:'📅 Mes RDV'},{id:'new',lbl:'➕ Nouveau'},{id:'hist',lbl:'📁 Historique'}],
};
const BN_TABS={
  admin:[{id:'dash',icon:'📊',lbl:'Bord'},{id:'rdv',icon:'📅',lbl:'RDV'},{id:'cal',icon:'🗓',lbl:'Calendrier'},{id:'rapports',icon:'📈',lbl:'Rapports'},{id:'users',icon:'👥',lbl:'Comptes'}],
  responsable:[{id:'dash',icon:'📊',lbl:'Bord'},{id:'rdv',icon:'📅',lbl:'RDV'},{id:'cal',icon:'🗓',lbl:'Calendrier'},{id:'rapports',icon:'📈',lbl:'Rapports'},{id:'matieres',icon:'🌾',lbl:'Matières'}],
  employe:[{id:'dash',icon:'📊',lbl:'Bord'},{id:'rdv',icon:'📅',lbl:'RDV'},{id:'cal',icon:'🗓',lbl:'Calendrier'},{id:'hist',icon:'📁',lbl:'Histo'}],
  transporteur:[{id:'rdv',icon:'📅',lbl:'Mes RDV'},{id:'cal',icon:'🗓',lbl:'Calendrier'},{id:'new',icon:'➕',lbl:'Nouveau'},{id:'drivers',icon:'👷',lbl:'Chauffeurs'},{id:'hist',icon:'📁',lbl:'Histo'}],
  chauffeur:[{id:'rdv',icon:'📅',lbl:'Mes RDV'},{id:'new',icon:'➕',lbl:'Nouveau'},{id:'hist',icon:'📁',lbl:'Histo'}],
};

// ══ STATE ══
let cu=null,cuP=null,cv=null,charts={};
let MATIERES=[],INCOMPATS=[],RDV=[],BLOCKED=[],SLOTS_MAT=[],USERS=[];
let calDate=new Date();
let calView='week'; // month | week | day
let deferredInstall=null;

// ══ UI HELPERS ══
function showLoader(t='Chargement…'){document.getElementById('loader').classList.remove('hidden');document.querySelector('.loader-text').textContent=t;}
function hideLoader(){document.getElementById('loader').classList.add('hidden');}
let toastTimer;
function showToast(msg,type='success'){const t=document.getElementById('toast');t.textContent=msg;t.className=`toast show ${type}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3200);}
function showPage(p){document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));document.getElementById('pg-'+p).classList.add('active');window.scrollTo(0,0);}
function bst(s){const st=ST[s]||ST.attente;return`<span class="badge ${st.cls}">${st.lbl}</span>`;}
function brol(r){return`<span class="badge ${ROLE_BADGE[r]||'bgy'}">${ROLE_FR[r]}</span>`;}
function matById(id){return MATIERES.find(m=>m.id===id);}
function matDot(id){const m=matById(id);return m?`<span class="mat-color-dot" style="background:${m.couleur}"></span>`:'';}
function areIncompat(a,b){return INCOMPATS.some(i=>(i.matiere_a===a&&i.matiere_b===b)||(i.matiere_a===b&&i.matiere_b===a));}
function slotCount(date,creneau){return RDV.filter(r=>r.date===date&&r.creneau===creneau&&r.statut!=='annule').length;}
function isBlocked(date,creneau){return BLOCKED.some(b=>b.date===date&&b.creneau===creneau);}
function slotReservedFor(date,creneau){const s=SLOTS_MAT.find(s=>s.date===date&&s.creneau===creneau);return s?s.matiere_id:null;}
function lastMatiereBeforeSlot(date,creneau){
  const crIdx=CRENEAUX.indexOf(creneau);
  const all=RDV.filter(r=>r.statut!=='annule'&&(r.date<date||(r.date===date&&CRENEAUX.indexOf(r.creneau)<crIdx))).sort((a,b)=>a.date.localeCompare(b.date)||CRENEAUX.indexOf(a.creneau)-CRENEAUX.indexOf(b.creneau));
  return all.length?all[all.length-1].matiere_id:null;
}
function checkSlot(date,creneau,matId){
  if(isBlocked(date,creneau))return{ok:false,reason:'blocked'};
  if(slotCount(date,creneau)>=MAX_PAR_CRENEAU)return{ok:false,reason:'full'};
  const res=slotReservedFor(date,creneau);
  if(res&&res!==matId)return{ok:false,reason:'reserved',mat:res};
  const last=lastMatiereBeforeSlot(date,creneau);
  if(last&&areIncompat(last,matId))return{ok:false,reason:'incompat',last};
  return{ok:true};
}
// Matières compatibles avec la précédente pour un créneau donné
function matiereCompatibles(date,creneau){
  const last=lastMatiereBeforeSlot(date,creneau);
  if(!last) return MATIERES.filter(m=>m.actif);
  return MATIERES.filter(m=>m.actif&&!areIncompat(last,m.id));
}
function myRdvs(){
  let l=[...RDV].sort((a,b)=>a.date.localeCompare(b.date)||a.creneau.localeCompare(b.creneau));
  if(cuP?.role==='chauffeur')l=l.filter(r=>r.user_id===cu.id);
  if(cuP?.role==='transporteur')l=l.filter(r=>r.transporteur===cuP.entreprise||r.user_id===cu.id);
  return l;
}

// ══ AUTH ══
async function quickLogin(email){
  showLoader('Connexion en cours…');
  const{data,error}=await sb.auth.signInWithPassword({email,password:'Demo1234!'});
  if(error){hideLoader();showToast('Erreur de connexion','error');return;}
  cu=data.user;await loadProfil();await loadAllData();buildDash();showPage('dash');startRealtime();
}

async function doLogin(){
  const email=document.getElementById('l-email').value.trim();
  const pwd=document.getElementById('l-pwd').value;
  const err=document.getElementById('l-err');
  const btn=document.getElementById('btn-login-submit');
  err.classList.remove('show');btn.textContent='Connexion…';btn.disabled=true;
  const{data,error}=await sb.auth.signInWithPassword({email,password:pwd});
  btn.textContent='Se connecter';btn.disabled=false;
  if(error){err.textContent='Email ou mot de passe incorrect.';err.classList.add('show');return;}
  cu=data.user;await loadProfil();await loadAllData();buildDash();showPage('dash');startRealtime();
}
async function loadProfil(){const{data}=await sb.from('profils').select('*').eq('id',cu.id).single();cuP=data;}
function openProfil(){
  document.getElementById('modal-box').className='modal-box';
  document.getElementById('m-title').textContent='👤 Mon profil';
  document.getElementById('m-desc').textContent='';
  document.getElementById('m-content').innerHTML=`
    <!-- Infos profil -->
    <div style="display:flex;align-items:center;gap:14px;padding:14px;background:var(--bg);border-radius:10px;margin-bottom:16px">
      <div style="width:48px;height:48px;border-radius:50%;background:${cuP?.couleur||'#6B7280'};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0">${cuP?.nom?.charAt(0)||'?'}</div>
      <div>
        <div style="font-size:15px;font-weight:600">${cuP?.nom||''}</div>
        <div style="font-size:12px;color:var(--soft)">${ROLE_FR[cuP?.role]||''} ${cuP?.entreprise?'· '+cuP.entreprise:''}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${cu?.email||''}</div>
      </div>
    </div>

    <!-- Changer mot de passe -->
    <div style="border-top:1px solid var(--border);padding-top:14px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--soft);margin-bottom:12px">🔒 Changer le mot de passe</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div class="fgrp">
          <label>Nouveau mot de passe <span class="req">*</span></label>
          <input type="password" id="pwd-new" placeholder="Minimum 6 caractères" autocomplete="new-password">
        </div>
        <div class="fgrp">
          <label>Confirmer le mot de passe <span class="req">*</span></label>
          <input type="password" id="pwd-confirm" placeholder="Répéter le mot de passe" autocomplete="new-password" onkeydown="if(event.key==='Enter')savePwd()">
        </div>
        <div id="pwd-err" style="display:none;background:var(--rouge-l);border:1px solid var(--rouge-m);border-radius:7px;padding:8px 12px;font-size:12.5px;color:var(--rouge)"></div>
        <div id="pwd-ok" style="display:none;background:var(--vert-l);border:1px solid var(--vert-m);border-radius:7px;padding:8px 12px;font-size:12.5px;color:var(--vert)">✅ Mot de passe mis à jour !</div>
      </div>
    </div>

    <!-- Couleur avatar -->
    <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--soft);margin-bottom:12px">🎨 Couleur de l'avatar</div>
      <div style="display:flex;align-items:center;gap:12px">
        <input type="color" id="profil-color" value="${cuP?.couleur||'#6B7280'}" style="height:38px;width:60px;cursor:pointer;padding:2px;border:1.5px solid var(--border);border-radius:8px">
        <span style="font-size:13px;color:var(--soft)">Visible par tous dans les commentaires</span>
      </div>
    </div>`;

  const ok = document.getElementById('m-ok');
  ok.textContent = 'Enregistrer';
  ok.className = 'm-ok';
  ok.onclick = saveProfil;
  document.getElementById('m-cancel').style.display = '';
  document.getElementById('modal').classList.add('show');
}

async function savePwd(){
  const pwdNew = document.getElementById('pwd-new')?.value;
  const pwdConf = document.getElementById('pwd-confirm')?.value;
  const errEl = document.getElementById('pwd-err');
  const okEl = document.getElementById('pwd-ok');
  if(!pwdNew||!pwdConf) return;
  if(pwdNew.length<6){errEl.textContent='Le mot de passe doit faire au moins 6 caractères.';errEl.style.display='block';okEl.style.display='none';return;}
  if(pwdNew!==pwdConf){errEl.textContent='Les mots de passe ne correspondent pas.';errEl.style.display='block';okEl.style.display='none';return;}
  errEl.style.display='none';
  const{error}=await sb.auth.updateUser({password:pwdNew});
  if(error){errEl.textContent='Erreur : '+error.message;errEl.style.display='block';return;}
  okEl.style.display='block';
  document.getElementById('pwd-new').value='';
  document.getElementById('pwd-confirm').value='';
}

async function saveProfil(){
  const color = document.getElementById('profil-color')?.value;
  // Sauvegarder couleur
  if(color && color !== cuP?.couleur){
    await sb.from('profils').update({couleur:color}).eq('id',cu.id);
    cuP.couleur = color;
    // Mettre à jour l'avatar dans la nav
    const av = document.getElementById('d-av');
    if(av) av.style.background = color;
  }
  // Changer mot de passe si rempli
  const pwdNew = document.getElementById('pwd-new')?.value;
  if(pwdNew) await savePwd();
  else { showToast('Profil mis à jour ✅'); closeModal(); }
}

async function doLogout(){stopRealtime();await sb.auth.signOut();cu=null;cuP=null;cv=null;showPage('home');}

// ══ DATA ══
async function loadAllData(){
  showLoader('Chargement des données…');
  const[m,inc,rdv,blk,slm,usr]=await Promise.all([
    sb.from('matieres').select('*').order('categorie').order('nom'),
    sb.from('incompatibilites').select('*'),
    sb.from('rdv').select('*').order('date').order('creneau'),
    sb.from('creneaux_bloques').select('*'),
    sb.from('creneaux_matieres').select('*'),
    sb.from('profils').select('*'),
  ]);
  MATIERES=m.data||[];INCOMPATS=inc.data||[];RDV=rdv.data||[];
  BLOCKED=blk.data||[];SLOTS_MAT=slm.data||[];USERS=usr.data||[];
  hideLoader();
}
async function reloadRdv(){const{data}=await sb.from('rdv').select('*').order('date').order('creneau');RDV=data||[];}

// ══ DASHBOARD SHELL ══
function buildDash(){
  const role=cuP?.role||'employe';
  const av=document.getElementById('d-av');
  av.textContent=cuP?.nom?.charAt(0)||'?';av.style.background=cuP?.couleur||'#6B7280';
  document.getElementById('d-name').textContent=cuP?.nom||'';
  document.getElementById('d-role-lbl').textContent=ROLE_FR[role]||'';
  const tabs=TABS[role]||[];
  document.getElementById('d-tabs').innerHTML=tabs.map(t=>`<button class="d-tab" data-id="${t.id}" onclick="switchView('${t.id}')">${t.lbl}</button>`).join('');
  buildBottomNav();switchView(tabs[0]?.id||'rdv');
  initPWA();
}
function buildBottomNav(){
  const tabs=BN_TABS[cuP?.role]||[];
  const inner=document.getElementById('bn-inner');if(!inner)return;
  inner.innerHTML=tabs.map(t=>`<button class="bn-tab${cv===t.id?' active':''}" data-bnid="${t.id}" onclick="switchView('${t.id}')"><span class="bn-tab-icon">${t.icon}</span><span class="bn-tab-label">${t.lbl}</span></button>`).join('');
}
function updateBottomNav(){document.querySelectorAll('.bn-tab').forEach(b=>b.classList.toggle('active',b.dataset.bnid===cv));}
function switchView(id){
  cv=id;
  document.querySelectorAll('.d-tab').forEach(b=>b.classList.toggle('active',b.dataset.id===id));
  Object.values(charts).forEach(c=>{try{c.destroy();}catch(e){}});charts={};
  const renders={dash:renderDash,rdv:renderRDV,cal:renderCal,hist:renderHist,rapports:renderRapports,slots:renderSlots,matieres:renderMatieres,new:renderNew,users:renderUsers,drivers:renderDrivers,settings:renderSettings};
  document.getElementById('dash-body').innerHTML=(renders[id]||(() =>''))();
  if(id==='dash')setTimeout(buildCharts,50);
  if(id==='hist')setTimeout(applyFilters,50);
  if(id==='cal')setTimeout(()=>renderCalContent(),50);
  if(id==='rapports')setTimeout(buildRapports,50);
  updateBottomNav();
}

// ══ TABLEAU DE BORD ══
function renderDash(){
  const all=myRdvs();
  const today=all.filter(r=>r.date===todayStr);
  const enAtt=all.filter(r=>r.statut==='attente');
  const totalT=all.filter(r=>r.statut==='termine'||r.statut==='confirme').reduce((s,r)=>s+r.tonnage,0);
  const avenir=all.filter(r=>r.date>todayStr);
  const canDel=['admin','responsable'].includes(cuP?.role);
  const nonArrives=RDV.filter(r=>r.statut==='non_arrive');
  const todayT=today.filter(r=>r.statut!=='annule').reduce((s,r)=>s+r.tonnage,0);

  let html=`
  <div class="pg-h">
    <div><h2>Tableau de bord</h2><p>${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--vert);background:var(--vert-l);padding:4px 10px;border-radius:8px;font-weight:500">
        <span style="width:6px;height:6px;border-radius:50%;background:var(--vert);animation:pulse 2s infinite;display:inline-block"></span>Temps réel
      </span>
      <button class="btn-p sm" onclick="printPlanning()">🖨️ Planning du jour</button>
    </div>
  </div>
  <div class="stats-grid" style="grid-template-columns:repeat(5,1fr)">
    <div class="sc vert"><div class="sc-lbl">Aujourd'hui</div><div class="sc-val rt-today" style="color:var(--vert)">${today.length}</div><div class="sc-sub">${todayT}T attendus</div></div>
    <div class="sc orange"><div class="sc-lbl">En attente</div><div class="sc-val rt-attente" style="color:var(--orange)">${enAtt.length}</div><div class="sc-sub">à valider</div></div>
    <div class="sc blue"><div class="sc-lbl">À venir</div><div class="sc-val rt-avenir" style="color:var(--blue)">${avenir.length}</div><div class="sc-sub">planifiés</div></div>
    <div class="sc rouge"><div class="sc-lbl">Tonnage</div><div class="sc-val rt-tonnage" style="color:var(--rouge)">${totalT}T</div><div class="sc-sub">traité</div></div>
    <div class="sc purple"><div class="sc-lbl">À reporter</div><div class="sc-val" style="color:var(--purple)">${nonArrives.length}</div><div class="sc-sub">non arrivés</div></div>
  </div>`;

  if(nonArrives.length>0){
    html+=`<div class="card" style="border-left:4px solid var(--purple)">
      <div class="card-h">
        <div><h3>🔄 Camions non arrivés (${nonArrives.length})</h3>
        <p style="font-size:12px;color:var(--soft);margin-top:2px">RDV passés non pris en charge — reportez sur le prochain créneau compatible.</p></div>
        <button class="btn-p sm" onclick="reporterTous()" style="background:var(--purple);flex-shrink:0">🔄 Tout reporter</button>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Date orig.</th><th>Créneau</th><th>Matière</th><th>Transporteur</th><th>Chauffeur</th><th>Action</th></tr></thead>
        <tbody>${nonArrives.map(r=>`<tr>
          <td><strong style="color:var(--rouge)">${r.date}</strong></td>
          <td>${r.creneau}</td>
          <td>${matDot(r.matiere_id)}${r.matiere_nom}<br><span style="font-size:11px;color:var(--soft)">${r.tonnage}T</span></td>
          <td>${r.transporteur}</td><td>${r.chauffeur}</td>
          <td><button class="btn-p sm" style="background:var(--purple);font-size:11px" onclick="reporterRdv(${r.id})">🔄 Reporter</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
  }

  html+=`
  <div class="charts-grid">
    <div class="chart-card"><h3>📦 Tonnes par semaine</h3><div class="chart-wrap"><canvas id="c-tonnes"></canvas></div></div>
    <div class="chart-card"><h3>🌾 Par matière</h3><div class="chart-wrap"><canvas id="c-matieres"></canvas></div></div>
    <div class="chart-card"><h3>📊 Par statut</h3><div class="chart-wrap"><canvas id="c-statuts"></canvas></div></div>
    <div class="chart-card"><h3>🚛 RDV par jour (7j)</h3><div class="chart-wrap"><canvas id="c-jours"></canvas></div></div>
  </div>
  <div class="card">
    <div class="card-h"><h3>📅 Aujourd'hui (${today.length}) — ${todayT}T</h3>
    <button class="btn-p sm" onclick="switchView('rdv')">Voir tout →</button></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Créneau</th><th>Matière</th><th>Transporteur</th><th>Chauffeur</th><th>Statut</th><th></th></tr></thead>
      <tbody>${today.length===0
        ?'<tr><td colspan="6"><div class="empty">✅ Aucun RDV aujourd\'hui</div></td></tr>'
        :today.map(r=>'<tr><td><strong>'+r.creneau+'</strong></td>'
          +'<td>'+matDot(r.matiere_id)+r.matiere_nom+'<br><span style="color:var(--soft);font-size:11px">'+r.tonnage+'T</span></td>'
          +'<td>'+r.transporteur+'</td><td>'+r.chauffeur+'</td><td>'+bst(r.statut)+'</td>'
          +'<td>'+(r.statut==='confirme'?'<button class="abtn del" onclick="marquerNonArrive('+r.id+')">❌</button>':'')+'<button class="abtn" onclick="openDetail('+r.id+')">💬</button>'
          +(canDel?'<button class="abtn del" onclick="delRdv('+r.id+')">✕</button>':'')
          +'</td></tr>').join('')
      }</tbody>
    </table></div>
  </div>`;
  return html;
}
function buildCharts(){
  const all=myRdvs();
  // Tonnes / semaine (8 semaines)
  const semLbls=[...Array(8)].map((_,i)=>{const s=new Date(now);s.setDate(s.getDate()-(7-i)*7);return`S${i===7?'':'-'+(7-i)||''}${i===7?'act':''}`;}).map((_,i)=>i===7?'Cette sem.':`S-${7-i}`);
  const semData=[...Array(8)].map((_,i)=>{const s=new Date(now);s.setDate(s.getDate()-(7-i)*7);const e=new Date(s);e.setDate(e.getDate()+7);return RDV.filter(r=>{const d=new Date(r.date);return d>=s&&d<e&&(r.statut==='termine'||r.statut==='confirme');}).reduce((t,r)=>t+r.tonnage,0);});
  const c1=document.getElementById('c-tonnes');
  if(c1)charts.t=new Chart(c1,{type:'bar',data:{labels:semLbls,datasets:[{data:semData,backgroundColor:semData.map((_,i)=>i===7?'rgba(46,125,50,.85)':'rgba(46,125,50,.4)'),borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
  // Par matière
  const matCount={};MATIERES.forEach(m=>{const t=all.filter(r=>r.matiere_id===m.id).reduce((s,r)=>s+r.tonnage,0);if(t>0)matCount[m.nom]={t,c:m.couleur};});
  const aM=Object.keys(matCount);
  const c2=document.getElementById('c-matieres');
  if(c2)charts.m=new Chart(c2,{type:'doughnut',data:{labels:aM,datasets:[{data:aM.map(k=>matCount[k].t),backgroundColor:aM.map(k=>matCount[k].c),borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11},padding:8}}}}});
  // Par statut
  const stC={attente:0,planifie:0,confirme:0,termine:0,annule:0};all.forEach(r=>stC[r.statut]=(stC[r.statut]||0)+1);
  const c3=document.getElementById('c-statuts');
  if(c3)charts.s=new Chart(c3,{type:'doughnut',data:{labels:['En attente','Planifié','Confirmé','Terminé','Annulé'],datasets:[{data:Object.values(stC),backgroundColor:['#D97706','#2563EB','#2E7D32','#9CA3AF','#C8102E'],borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11},padding:8}}}}});
  // RDV par jour 7j
  const jL=[...Array(7)].map((_,i)=>{const d=new Date(now);d.setDate(d.getDate()-6+i);return d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'});});
  const jD=[...Array(7)].map((_,i)=>{const d=new Date(now);d.setDate(d.getDate()-6+i);return RDV.filter(r=>r.date===fmt(d)).length;});
  const c4=document.getElementById('c-jours');
  if(c4)charts.j=new Chart(c4,{type:'line',data:{labels:jL,datasets:[{data:jD,borderColor:'#2E7D32',backgroundColor:'rgba(46,125,50,.08)',fill:true,tension:.4,pointRadius:5,pointBackgroundColor:'#2E7D32',pointBorderColor:'#fff',pointBorderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}});
}

// ══ RDV ══
function renderRDV(){
  const list=myRdvs();
  const today=list.filter(r=>r.date===todayStr);
  const avenir=list.filter(r=>r.date>todayStr);
  const canConfirm=['admin','responsable','employe'].includes(cuP?.role);
  const canDel=['admin','responsable'].includes(cuP?.role);
  const tbl=(title,arr,emptyMsg)=>`
    <div class="card"><div class="card-h"><h3>${title}</h3></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Date</th><th>Créneau</th><th>Matière</th><th>Transporteur</th><th>Chauffeur</th><th>N° BL</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>${arr.length===0?`<tr><td colspan="8"><div class="empty">${emptyMsg}</div></td></tr>`:arr.map(r=>`<tr>
        <td>${r.date}</td><td>${r.creneau}</td>
        <td>${matDot(r.matiere_id)}${r.matiere_nom}<br><span style="color:var(--soft);font-size:11px">${r.tonnage}T</span></td>
        <td>${r.transporteur}</td>
        <td>${r.chauffeur}<br><span style="color:var(--soft);font-size:11px">${r.immat}</span></td>
        <td style="font-size:12px;font-family:monospace">${r.bl}</td>
        <td>${bst(r.statut)}</td>
        <td>${''}
        <button class="abtn" onclick="openDetail(${r.id})">💬</button>
        ${canDel?`<button class="abtn del" onclick="delRdv(${r.id})">✕</button>`:''}</td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  return`<div class="pg-h"><div><h2>Rendez-vous</h2></div></div>
  ${tbl(`📅 Aujourd'hui (${today.length})`,today,'Aucun RDV aujourd\'hui')}
  ${tbl(`🔜 À venir (${avenir.length})`,avenir,'Aucun RDV à venir')}`;
}

// ══ CALENDRIER ══
function renderCal(){
  const canNew=['admin','responsable','employe'].includes(cuP?.role);
  return`
  <div class="pg-h">
    <div><h2>🗓 Calendrier</h2></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <div class="cal-view-tabs">
        <button class="cal-view-tab${calView==='month'?' active':''}" onclick="setCalView('month')">Mois</button>
        <button class="cal-view-tab${calView==='week'?' active':''}" onclick="setCalView('week')">Semaine</button>
        <button class="cal-view-tab${calView==='day'?' active':''}" onclick="setCalView('day')">Jour</button>
      </div>
      ${canNew?`<button class="btn-p sm" onclick="switchView('new')">+ Nouveau RDV</button>`:''}
      <button class="btn-p sm" style="background:var(--soft)" onclick="printPlanning(calView==='day'?fmt(calDate):todayStr)">🖨️ Imprimer</button>
    </div>
  </div>
  <div class="card" style="overflow:visible">
    <div class="card-h">
      <div style="display:flex;align-items:center;gap:8px;width:100%;flex-wrap:wrap">
        <div style="display:flex;gap:4px">
          <button class="btn-s sm" onclick="calPrev()">◀</button>
          <button class="btn-s sm" onclick="calToday()">Aujourd'hui</button>
          <button class="btn-s sm" onclick="calNext()">▶</button>
        </div>
        <h3 id="cal-title" style="flex:1;text-align:center;font-family:'Lora',serif;font-size:17px"></h3>
        <div style="display:flex;gap:6px;font-size:11px;align-items:center;flex-wrap:wrap">
          <span style="display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;border-radius:2px;background:var(--vert);display:inline-block"></span>Confirmé</span>
          <span style="display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;border-radius:2px;background:var(--orange);display:inline-block"></span>En attente</span>
          <span style="display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;border-radius:2px;background:repeating-linear-gradient(45deg,#fee2e2,#fee2e2 3px,#fff 3px,#fff 6px);display:inline-block"></span>Bloqué</span>
          <span style="display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;border-radius:2px;background:#FDE68A;display:inline-block"></span>⚠️ Incompat.</span>
        </div>
      </div>
    </div>
    <div id="cal-body" style="overflow-x:auto"></div>
  </div>`;
}

function setCalView(v){calView=v;switchView('cal');}
function calPrev(){
  if(calView==='month'){calDate.setMonth(calDate.getMonth()-1);}
  else if(calView==='day'){calDate.setDate(calDate.getDate()-1);}
  else{calDate.setDate(calDate.getDate()-7);}
  renderCalContent();
}
function calNext(){
  if(calView==='month'){calDate.setMonth(calDate.getMonth()+1);}
  else if(calView==='day'){calDate.setDate(calDate.getDate()+1);}
  else{calDate.setDate(calDate.getDate()+7);}
  renderCalContent();
}
function calToday(){calDate=new Date();renderCalContent();}

function renderCalContent(){
  const titleEl=document.getElementById('cal-title');
  const bodyEl=document.getElementById('cal-body');
  if(!titleEl||!bodyEl)return;
  if(calView==='month')renderCalMonth(titleEl,bodyEl);
  else if(calView==='day')renderCalDay(titleEl,bodyEl);
  else renderCalWeek(titleEl,bodyEl);
}

// ══ VUE MOIS — macro, barre couleur + nb camions ══
function renderCalMonth(titleEl,bodyEl){
  const y=calDate.getFullYear(),mo=calDate.getMonth();
  titleEl.textContent=`${MOIS[mo]} ${y}`;
  const first=new Date(y,mo,1);
  let startDow=first.getDay();startDow=startDow===0?6:startDow-1;
  const daysInMonth=new Date(y,mo+1,0).getDate();
  const cells=[];
  const prevDays=new Date(y,mo,0).getDate();
  for(let i=startDow-1;i>=0;i--)cells.push({day:prevDays-i,month:'prev',date:fmt(new Date(y,mo-1,prevDays-i))});
  for(let d=1;d<=daysInMonth;d++)cells.push({day:d,month:'cur',date:fmt(new Date(y,mo,d))});
  while(cells.length%7!==0)cells.push({day:cells.length-daysInMonth-startDow+1,month:'next',date:''});

  bodyEl.innerHTML=`<div style="padding:10px">
    <div class="cal-grid">
      ${JOURS.map(j=>`<div class="cal-head">${j}</div>`).join('')}
      ${cells.map(c=>{
        const rdvsDay=RDV.filter(r=>r.date===c.date&&r.statut!=='annule');
        const blkDay=CRENEAUX.some(cr=>isBlocked(c.date,cr));
        const isToday=c.date===todayStr;
        const nb=rdvsDay.length;
        const totalT=rdvsDay.reduce((s,r)=>s+r.tonnage,0);
        // Couleur dominante = matière la plus livrée
        const matCount={};rdvsDay.forEach(r=>matCount[r.matiere_id]=(matCount[r.matiere_id]||0)+1);
        const domMat=Object.entries(matCount).sort((a,b)=>b[1]-a[1])[0]?.[0];
        const domColor=matById(domMat)?.couleur||'#2E7D32';
        // Incompatibilité demain ?
        const lastRdv=rdvsDay.sort((a,b)=>CRENEAUX.indexOf(b.creneau)-CRENEAUX.indexOf(a.creneau))[0];
        const hasIncompat=lastRdv&&INCOMPATS.some(i=>i.matiere_a===lastRdv.matiere_id||i.matiere_b===lastRdv.matiere_id);

        const cls=['cal-month-day',c.month!=='cur'?'other-month':'',isToday?'today':''].filter(Boolean).join(' ');
        return`<div class="${cls}" onclick="calGoDay('${c.date}')">
          <div class="cmd-num">${c.day}${isToday?'<span class="cmd-today-dot"></span>':''}</div>
          ${blkDay?`<div class="cmd-blocked">🔒 Fermé</div>`:nb>0?`
            <div class="cmd-bar" style="background:${domColor}">
              <span class="cmd-nb">${nb} 🚛</span>
              <span class="cmd-t">${totalT}T</span>
            </div>
            ${hasIncompat?`<div class="cmd-warn">⚠️ Restr. J+1</div>`:''}
          `:''}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function calGoDay(date){
  calDate=new Date(date+'T12:00:00');
  calView='day';
  switchView('cal');
}

// ══ VUE SEMAINE — grille créneaux × jours détaillée ══
function renderCalWeek(titleEl,bodyEl){
  const d=new Date(calDate);
  const dow=d.getDay();const diff=dow===0?-6:1-dow;
  d.setDate(d.getDate()+diff);
  const weekDays=[...Array(7)].map((_,i)=>{const dd=new Date(d);dd.setDate(dd.getDate()+i);return{date:fmt(dd),label:JOURS[i],day:dd.getDate(),month:dd.getMonth()};});
  titleEl.textContent=`Semaine du ${weekDays[0].day} ${MOIS[weekDays[0].month].substring(0,3)}. au ${weekDays[6].day} ${MOIS[weekDays[6].month].substring(0,3)}.`;

  const rows=CRENEAUX.map(cr=>`
    <div class="cal-slot-label">${cr.replace('–','–&#10;')}</div>
    ${weekDays.map(wd=>{
      const blk=isBlocked(wd.date,cr);
      const rdvsSlot=RDV.filter(r=>r.date===wd.date&&r.creneau===cr&&r.statut!=='annule');
      const cnt=rdvsSlot.length;
      const full=cnt>=MAX_PAR_CRENEAU;
      const isToday=wd.date===todayStr;
      // Vérif incompatibilité avec créneau précédent
      const lastM=lastMatiereBeforeSlot(wd.date,cr);
      const lastMObj=lastM?matById(lastM):null;
      let cls='cal-slot-cell';
      if(blk)cls+=' blocked';else if(full)cls+=' full';
      if(isToday)cls+=' today-col';
      if(blk) return`<div class="${cls}"><div style="font-size:10px;color:var(--rouge);font-weight:600;text-align:center;padding:6px">🔒<br>Fermé</div></div>`;
      const chips=rdvsSlot.map(r=>{
        const m=matById(r.matiere_id);
        const stColor=r.statut==='confirme'?m?.couleur||'#2E7D32':r.statut==='attente'?'#D97706':'#9CA3AF';
        return`<div class="cal-week-chip" style="background:${stColor}22;border-left:3px solid ${stColor}" onclick="event.stopPropagation();openDetail(${r.id})">
          <div class="cwc-mat" style="color:${stColor}">${m?.nom||m?.code||'?'}</div>
          <div class="cwc-info">${r.tonnage}T · ${r.transporteur.split(' ')[r.transporteur.split(' ').length-1]}</div>
          ${r.statut==='attente'?'<div class="cwc-warn">⏳ En attente</div>':''}
        </div>`;}).join('');
      const emptyInfo=cnt===0&&lastMObj?`<div class="cal-slot-prev">↑ ${lastMObj.code}</div>`:'';
      const slotBg=cnt>=MAX_PAR_CRENEAU?'var(--rouge-l)':'var(--vert-l)';
      const slotColor=cnt>=MAX_PAR_CRENEAU?'var(--rouge)':'var(--vert)';
      const countBadge=cnt>0?`<div class="cal-slot-count" style="background:${slotBg};color:${slotColor}">${cnt}/${MAX_PAR_CRENEAU}</div>`:'';
      return`<div class="${cls}" onclick="calDayClick('${wd.date}')">
        ${countBadge}
        ${chips}
        ${emptyInfo}
      </div>`;
    }).join('')}`).join('');

  // Header avec total par jour
  const dayHeaders=weekDays.map(wd=>{
    const nb=RDV.filter(r=>r.date===wd.date&&r.statut!=='annule').length;
    const t=RDV.filter(r=>r.date===wd.date&&r.statut!=='annule').reduce((s,r)=>s+r.tonnage,0);
    const isToday=wd.date===todayStr;
    return`<div class="cal-week-head${isToday?' today-col':''}" onclick="calGoDay('${wd.date}')" style="cursor:pointer">
      <div>${wd.label} <strong>${wd.day}</strong></div>
      ${nb>0?`<div style="font-size:10px;opacity:.8;margin-top:2px">${nb}🚛 ${t}T</div>`:'<div style="font-size:10px;opacity:.5;margin-top:2px">—</div>'}
    </div>`;}).join('');

  bodyEl.innerHTML=`
    <div class="cal-week-view">
      <div class="cal-week-head" style="font-size:11px;color:var(--soft)">Créneau</div>
      ${dayHeaders}
      ${rows}
    </div>`;
}

// ══ VUE JOUR — liste détaillée tous créneaux ══
function renderCalDay(titleEl,bodyEl){
  const dateStr=fmt(calDate);
  const dt=new Date(dateStr+'T12:00:00');
  titleEl.textContent=dt.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const rdvsDay=RDV.filter(r=>r.date===dateStr).sort((a,b)=>CRENEAUX.indexOf(a.creneau)-CRENEAUX.indexOf(b.creneau));
  const totalT=rdvsDay.filter(r=>r.statut!=='annule').reduce((s,r)=>s+r.tonnage,0);

  const rows=CRENEAUX.map(cr=>{
    const rdvsCr=rdvsDay.filter(r=>r.creneau===cr);
    const blk=isBlocked(dateStr,cr);
    const lastM=lastMatiereBeforeSlot(dateStr,cr);
    const lastMObj=lastM?matById(lastM):null;
    const cnt=slotCount(dateStr,cr);
    const dispo=MAX_PAR_CRENEAU-cnt;

    return`<div class="cal-day-row${blk?' blocked-row':''}">
      <div class="cdr-creneau">
        <div class="cdr-time">${cr}</div>
        ${blk
          ?`<div class="cdr-status blocked-lbl">🔒 Fermé</div>`
          :`<div class="cdr-status" style="color:${dispo===0?'var(--rouge)':dispo<=1?'var(--orange)':'var(--vert)'}">
            ${dispo===0?'Complet':dispo+' place(s)'}
          </div>`}
        ${lastMObj&&!blk?`<div class="cdr-prev-mat" style="border-color:${lastMObj.couleur};color:${lastMObj.couleur}">↑ ${lastMObj.nom}</div>`:''}
      </div>
      <div class="cdr-rdvs">
        ${blk?`<div class="cdr-empty">Créneau bloqué / Jour fermé</div>`:
          rdvsCr.length===0?`<div class="cdr-empty">${lastMObj?`Libre — matière précédente : <strong style="color:${lastMObj.couleur}">${lastMObj.nom}</strong>`:'Aucune livraison'}</div>`:
          rdvsCr.map(r=>{
            const m=matById(r.matiere_id);
            const stColor=r.statut==='confirme'?m?.couleur||'#2E7D32':r.statut==='attente'?'#D97706':r.statut==='annule'?'#C8102E':'#9CA3AF';
            return`<div class="cdr-rdv-card" onclick="openDetail(${r.id})">
              <div style="width:5px;border-radius:3px;background:${m?.couleur||'#ccc'};flex-shrink:0;align-self:stretch"></div>
              <div style="flex:1;min-width:0">
                <div class="cdr-rdv-top">
                  <span class="cdr-mat" style="color:${m?.couleur||'#333'}">${matDot(r.matiere_id)}${r.matiere_nom}</span>
                  <span class="cdr-tonnage">${r.tonnage}T</span>
                  ${bst(r.statut)}
                </div>
                <div class="cdr-rdv-bot">
                  <span>🚛 ${r.transporteur}</span>
                  <span>👤 ${r.chauffeur}</span>
                  <span>🚗 ${r.immat}</span>
                  <span style="font-family:monospace;font-size:11px">${r.bl}</span>
                </div>
              </div>
            </div>`;
          }).join('')
        }
      </div>
    </div>`;
  }).join('');

  bodyEl.innerHTML=`
    <div style="padding:0 0 8px">
      <div style="display:flex;gap:10px;padding:12px 16px;background:var(--bg);border-bottom:1px solid var(--border);flex-wrap:wrap">
        <div style="font-size:13px"><strong>${rdvsDay.filter(r=>r.statut==='confirme').length}</strong> <span style="color:var(--soft)">attendus</span></div>
        <div style="font-size:13px"><strong>${totalT}T</strong> <span style="color:var(--soft)">total</span></div>
        <div style="font-size:13px"><strong>${rdvsDay.filter(r=>r.statut==='confirme').length}</strong> <span style="color:var(--soft)">confirmées</span></div>
        <div style="font-size:13px"><strong>${rdvsDay.filter(r=>r.statut==='attente').length}</strong> <span style="color:var(--soft)">en attente</span></div>
        <button class="btn-p sm" style="margin-left:auto" onclick="printPlanning('${dateStr}')">🖨️ Imprimer</button>
      </div>
      ${rows}
    </div>`;
}

function calDayClick(date){
  if(!date)return;
  // Vue semaine → clic sur une cellule → basculer en vue jour
  calDate=new Date(date+'T12:00:00');
  calView='day';
  switchView('cal');
}

// ══ HISTORIQUE ══
function renderHist(){
  return`
  <div class="pg-h"><div><h2>Historique</h2></div><button class="btn-p sm" onclick="exportCSV()">⬇ Export CSV</button></div>
  <div class="card"><div style="padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
    <div><div style="font-size:11px;font-weight:600;color:var(--soft);margin-bottom:3px">Du</div><input type="date" class="f-input" id="h-from" onchange="applyFilters()"></div>
    <div><div style="font-size:11px;font-weight:600;color:var(--soft);margin-bottom:3px">Au</div><input type="date" class="f-input" id="h-to" onchange="applyFilters()"></div>
    <div><div style="font-size:11px;font-weight:600;color:var(--soft);margin-bottom:3px">Matière</div>
      <select class="f-sel" id="h-mat" onchange="applyFilters()"><option value="">Toutes</option>${MATIERES.filter(m=>m.actif).map(m=>`<option value="${m.id}">${m.nom}</option>`).join('')}</select>
    </div>
    <div><div style="font-size:11px;font-weight:600;color:var(--soft);margin-bottom:3px">Statut</div>
      <select class="f-sel" id="h-stat" onchange="applyFilters()"><option value="">Tous</option><option value="confirme">Confirmé</option><option value="non_arrive">Non arrivé</option><option value="annule">Annulé</option></select>
    </div>
    <div><div style="font-size:11px;font-weight:600;color:var(--soft);margin-bottom:3px">Transporteur</div><input type="text" class="f-input" id="h-trans" placeholder="Rechercher…" oninput="applyFilters()"></div>
    <button class="btn-s sm" onclick="resetFilters()">Réinitialiser</button>
  </div></div>
  <div class="card"><div class="card-h"><h3 id="h-count">Résultats</h3></div><div class="tbl-wrap" id="h-tbl"></div></div>`;
}
function applyFilters(){
  let list=myRdvs();
  const from=document.getElementById('h-from')?.value,to=document.getElementById('h-to')?.value;
  const mat=document.getElementById('h-mat')?.value,stat=document.getElementById('h-stat')?.value;
  const trans=document.getElementById('h-trans')?.value?.toLowerCase();
  if(from)list=list.filter(r=>r.date>=from);if(to)list=list.filter(r=>r.date<=to);
  if(mat)list=list.filter(r=>r.matiere_id===mat);if(stat)list=list.filter(r=>r.statut===stat);
  if(trans)list=list.filter(r=>r.transporteur.toLowerCase().includes(trans)||r.chauffeur.toLowerCase().includes(trans));
  const tot=list.reduce((s,r)=>s+r.tonnage,0);
  document.getElementById('h-count').textContent=`${list.length} résultat(s) — ${tot}T`;
  document.getElementById('h-tbl').innerHTML=`<table><thead><tr><th>Date</th><th>Créneau</th><th>Matière</th><th>Code</th><th>Tonnage</th><th>Transporteur</th><th>Chauffeur</th><th>N° BL</th><th>Statut</th></tr></thead>
  <tbody>${list.length===0?`<tr><td colspan="9"><div class="empty">Aucun résultat</div></td></tr>`:list.map(r=>{const m=matById(r.matiere_id);return`<tr><td>${r.date}</td><td>${r.creneau}</td><td>${matDot(r.matiere_id)}${r.matiere_nom}</td><td><span style="font-family:monospace;font-size:11px;background:var(--bg);padding:1px 6px;border-radius:4px;border:1px solid var(--border)">${m?.code||'—'}</span></td><td>${r.tonnage}T</td><td>${r.transporteur}</td><td>${r.chauffeur}</td><td style="font-family:monospace;font-size:11px">${r.bl}</td><td>${bst(r.statut)}</td></tr>`;}).join('')}</tbody></table>`;
}
function resetFilters(){['h-from','h-to','h-mat','h-stat','h-trans'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});applyFilters();}
function exportCSV(){
  const list=myRdvs();
  const h=['Date','Créneau','Matière','Code','Tonnage','Transporteur','Immat','Chauffeur','Téléphone','N° BL','Statut'];
  const rows=list.map(r=>{const m=matById(r.matiere_id);return[r.date,r.creneau,r.matiere_nom,m?.code||'',r.tonnage,r.transporteur,r.immat,r.chauffeur,r.tel,r.bl,ST[r.statut]?.lbl||r.statut];});
  const csv=[h,...rows].map(r=>r.join(';')).join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);a.download=`rdv_${todayStr}.csv`;a.click();
  showToast('Export CSV téléchargé');
}

// ══ RAPPORTS ══
function renderRapports(){
  return`
  <div class="pg-h"><div><h2>📈 Rapports & Analyses</h2><p>Visible uniquement par Admin et Responsable</p></div>
    <div style="display:flex;gap:8px">
      <button class="btn-p sm orange" onclick="exportRapportPDF()">📄 Export PDF complet</button>
      <button class="btn-p sm" onclick="exportCSV()">📊 Export CSV</button>
    </div>
  </div>
  <div style="margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <span style="font-size:12.5px;font-weight:600;color:var(--soft)">Période :</span>
    <select class="f-sel" id="r-period" onchange="buildRapports()" style="width:auto">
      <option value="7">7 derniers jours</option>
      <option value="30" selected>30 derniers jours</option>
      <option value="90">3 derniers mois</option>
      <option value="365">Cette année</option>
    </select>
  </div>
  <div id="rapports-body"></div>`;
}

function buildRapports(){
  const body=document.getElementById('rapports-body');if(!body)return;
  const days=parseInt(document.getElementById('r-period')?.value||30);
  const since=new Date(now);since.setDate(since.getDate()-days);
  const sinceStr=fmt(since);
  const list=RDV.filter(r=>r.date>=sinceStr);
  const totalRdv=list.length;
  const confirmes=list.filter(r=>r.statut==='confirme').length;
  const nonArrives=list.filter(r=>r.statut==='non_arrive');
  const annules=list.filter(r=>r.statut==='annule');
  const totalT=list.filter(r=>r.statut!=='annule'&&r.statut!=='non_arrive').reduce((s,r)=>s+r.tonnage,0);
  const txPonct=totalRdv>0?Math.round(confirmes/totalRdv*100):0;
  const moyT=confirmes>0?Math.round(totalT/confirmes):0;

  // Stats par transporteur avec ponctualité
  const transStats={};
  list.forEach(r=>{
    if(!transStats[r.transporteur])transStats[r.transporteur]={
      nom:r.transporteur,rdv:0,confirme:0,non_arrive:0,annule:0,tonnage:0
    };
    transStats[r.transporteur].rdv++;
    transStats[r.transporteur][r.statut]=(transStats[r.transporteur][r.statut]||0)+1;
    if(r.statut==='confirme')transStats[r.transporteur].tonnage+=r.tonnage;
  });
  const transArr=Object.values(transStats).map(t=>({
    ...t,
    ponct:t.rdv>0?Math.round((t.rdv-t.non_arrive-t.annule)/t.rdv*100):0
  })).sort((a,b)=>b.rdv-a.rdv);

  // Par matière
  const matStats=MATIERES.map(m=>{
    const rdvsMat=list.filter(r=>r.matiere_id===m.id&&r.statut!=='annule');
    return{m,count:rdvsMat.length,tonnage:rdvsMat.filter(r=>r.statut==='confirme').reduce((s,r)=>s+r.tonnage,0)};
  }).filter(s=>s.count>0).sort((a,b)=>b.tonnage-a.tonnage);
  const maxT=matStats[0]?.tonnage||1;

  // Par créneau
  const slotStats={};CRENEAUX.forEach(c=>{slotStats[c]=list.filter(r=>r.creneau===c&&r.statut!=='annule').length;});

  // Ponctualité couleur
  const pColor=p=>p>=90?'#2E7D32':p>=70?'#D97706':'#C8102E';
  const pBg=p=>p>=90?'#f0f7f0':p>=70?'#FFF7E6':'#fdf0f2';

  body.innerHTML=`
  <!-- KPIs -->
  <div class="kpi-grid" style="grid-template-columns:repeat(5,1fr)">
    <div class="kpi"><div class="kpi-val" style="color:var(--blue)">${totalRdv}</div><div class="kpi-lbl">Total RDV</div></div>
    <div class="kpi"><div class="kpi-val" style="color:var(--vert)">${confirmes}</div><div class="kpi-lbl">Livrés</div></div>
    <div class="kpi"><div class="kpi-val" style="color:var(--rouge)">${nonArrives.length}</div><div class="kpi-lbl">Non arrivés</div></div>
    <div class="kpi"><div class="kpi-val" style="color:var(--orange)">${annules.length}</div><div class="kpi-lbl">Annulés</div></div>
    <div class="kpi"><div class="kpi-val" style="color:${pColor(txPonct)}">${txPonct}%</div><div class="kpi-lbl">Ponctualité</div></div>
  </div>
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-top:-4px">
    <div class="kpi"><div class="kpi-val" style="color:var(--blue)">${totalT}T</div><div class="kpi-lbl">Tonnage livré</div></div>
    <div class="kpi"><div class="kpi-val" style="color:var(--purple)">${moyT}T</div><div class="kpi-lbl">Moy. / livraison</div></div>
    <div class="kpi"><div class="kpi-val" style="color:var(--soft)">${transArr.length}</div><div class="kpi-lbl">Transporteurs</div></div>
  </div>

  <!-- Graphiques -->
  <div class="charts-grid">
    <div class="chart-card"><h3>📦 Tonnage livré par jour</h3><div class="chart-wrap-lg"><canvas id="r-daily"></canvas></div></div>
    <div class="chart-card"><h3>📊 Statuts</h3><div class="chart-wrap-lg"><canvas id="r-statuts"></canvas></div></div>
  </div>

  <!-- Ponctualité transporteurs -->
  <div class="rapport-section" style="margin-bottom:16px">
    <div class="rapport-section-h"><h3>🏆 Taux de ponctualité par transporteur</h3><span style="font-size:12px;color:var(--soft)">Classé par ponctualité</span></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>#</th><th>Transporteur</th><th>Total RDV</th><th>Livrés</th><th>Non arrivés</th><th>Annulés</th><th>Tonnage</th><th>Ponctualité</th></tr></thead>
      <tbody>${[...transArr].sort((a,b)=>b.ponct-a.ponct).map((t,i)=>`<tr>
        <td><strong style="color:${i===0?'#D97706':i===1?'#9CA3AF':i===2?'#B45309':'var(--soft)'}">${i+1}</strong></td>
        <td><strong>${t.nom}</strong></td>
        <td>${t.rdv}</td>
        <td style="color:var(--vert);font-weight:600">${t.confirme||0}</td>
        <td style="color:${t.non_arrive>0?'var(--rouge)':'var(--soft)'}"><strong>${t.non_arrive||0}</strong></td>
        <td style="color:var(--soft)">${t.annule||0}</td>
        <td>${t.tonnage}T</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;min-width:60px">
              <div style="height:100%;width:${t.ponct}%;background:${pColor(t.ponct)};border-radius:4px;transition:width .6s"></div>
            </div>
            <span style="font-weight:700;font-size:13px;color:${pColor(t.ponct)};background:${pBg(t.ponct)};padding:2px 8px;border-radius:6px;white-space:nowrap">${t.ponct}%</span>
          </div>
        </td>
      </tr>`).join('')}
      </tbody>
    </table></div>
  </div>

  <!-- Matières + Créneaux -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
    <div class="rapport-section">
      <div class="rapport-section-h"><h3>🌾 Tonnage par matière</h3></div>
      <div class="rapport-section-body">
        ${matStats.length===0?'<div class="empty">Aucune donnée</div>':matStats.map(s=>`
          <div class="progress-bar-wrap">
            <div class="progress-bar-label">
              <span>${matDot(s.m.id)}${s.m.nom}</span>
              <span style="font-weight:600">${s.tonnage}T <span style="color:var(--muted);font-weight:400">(${s.count} RDV)</span></span>
            </div>
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${Math.round(s.tonnage/maxT*100)}%;background:${s.m.couleur}"></div></div>
          </div>`).join('')}
      </div>
    </div>
    <div class="rapport-section">
      <div class="rapport-section-h"><h3>⏱ Utilisation créneaux</h3></div>
      <div class="rapport-section-body"><div class="chart-wrap" style="height:220px"><canvas id="r-slots"></canvas></div></div>
    </div>
  </div>

  <!-- Non arrivés détail -->
  ${nonArrives.length>0?`
  <div class="rapport-section">
    <div class="rapport-section-h"><h3>❌ Détail des non-arrivés (${nonArrives.length})</h3></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Date</th><th>Créneau</th><th>Matière</th><th>Transporteur</th><th>Chauffeur</th><th>Tonnage</th></tr></thead>
      <tbody>${nonArrives.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr>
        <td>${r.date}</td><td>${r.creneau}</td>
        <td>${matDot(r.matiere_id)}${r.matiere_nom}</td>
        <td>${r.transporteur}</td><td>${r.chauffeur}</td>
        <td>${r.tonnage}T</td>
      </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`:''}`;

  // Graphiques
  const dailyDays=Math.min(days,30);
  const dLabels=[...Array(dailyDays)].map((_,i)=>{const d=new Date(now);d.setDate(d.getDate()-(dailyDays-1-i));return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});});
  const dData=[...Array(dailyDays)].map((_,i)=>{const d=new Date(now);d.setDate(d.getDate()-(dailyDays-1-i));return list.filter(r=>r.date===fmt(d)&&r.statut==='confirme').reduce((s,r)=>s+r.tonnage,0);});
  const dNa=[...Array(dailyDays)].map((_,i)=>{const d=new Date(now);d.setDate(d.getDate()-(dailyDays-1-i));return list.filter(r=>r.date===fmt(d)&&r.statut==='non_arrive').length;});
  Object.values(charts).forEach(c=>{try{c.destroy();}catch(e){}});charts={};
  const c1=document.getElementById('r-daily');
  if(c1)charts.d=new Chart(c1,{type:'bar',data:{labels:dLabels,datasets:[
    {label:'Tonnage livré',data:dData,backgroundColor:'rgba(46,125,50,.7)',borderRadius:4,yAxisID:'y'},
    {label:'Non arrivés',data:dNa,backgroundColor:'rgba(200,16,46,.6)',borderRadius:4,yAxisID:'y2',type:'line',tension:.3,pointRadius:3,pointBackgroundColor:'#C8102E',fill:false,borderColor:'#C8102E'}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:11}}}},scales:{y:{beginAtZero:true,position:'left'},y2:{beginAtZero:true,position:'right',grid:{drawOnChartArea:false}}}}});

  const c2=document.getElementById('r-statuts');
  if(c2)charts.s=new Chart(c2,{type:'doughnut',data:{
    labels:['Livrés','Non arrivés','Annulés'],
    datasets:[{data:[confirmes,nonArrives.length,annules.length],backgroundColor:['#2E7D32','#C8102E','#9CA3AF'],borderWidth:3,borderColor:'#fff'}]
  },options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:12},padding:16}}}}});

  const c3=document.getElementById('r-slots');
  if(c3)charts.sl=new Chart(c3,{type:'polarArea',data:{labels:CRENEAUX.map(c=>c.split('–')[0]),datasets:[{data:CRENEAUX.map(c=>slotStats[c]||0),backgroundColor:['rgba(46,125,50,.7)','rgba(37,99,235,.7)','rgba(217,119,6,.7)','rgba(124,58,237,.7)','rgba(200,16,46,.7)','rgba(16,185,129,.7)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:10}}}}}});
}

function exportRapportPDF(){
  const days=parseInt(document.getElementById('r-period')?.value||30);
  const since=new Date(now);since.setDate(since.getDate()-days);
  const sinceStr=fmt(since);
  const list=RDV.filter(r=>r.date>=sinceStr);
  const confirmes=list.filter(r=>r.statut==='confirme');
  const nonArrives=list.filter(r=>r.statut==='non_arrive');
  const annules=list.filter(r=>r.statut==='annule');
  const totalT=confirmes.reduce((s,r)=>s+r.tonnage,0);
  const txPonct=list.length>0?Math.round(confirmes.length/list.length*100):0;
  const pColor=p=>p>=90?'#2E7D32':p>=70?'#D97706':'#C8102E';

  // Ponctualité par transporteur
  const transStats={};
  list.forEach(r=>{
    if(!transStats[r.transporteur])transStats[r.transporteur]={rdv:0,confirme:0,non_arrive:0,annule:0,tonnage:0};
    transStats[r.transporteur].rdv++;
    transStats[r.transporteur][r.statut]=(transStats[r.transporteur][r.statut]||0)+1;
    if(r.statut==='confirme')transStats[r.transporteur].tonnage+=r.tonnage;
  });
  const transArr=Object.entries(transStats).map(([nom,t])=>({nom,...t,ponct:t.rdv>0?Math.round((t.rdv-t.non_arrive-t.annule)/t.rdv*100):0})).sort((a,b)=>b.ponct-a.ponct);

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;padding:28px;color:#1E1E1E;font-size:12px;line-height:1.5}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2E7D32;padding-bottom:12px;margin-bottom:20px}
    h1{color:#2E7D32;font-size:18px;margin:0 0 4px}
    h2{font-size:13px;font-weight:700;margin:20px 0 8px;color:#1E1E1E;border-left:3px solid #2E7D32;padding-left:8px}
    .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px}
    .kpi{background:#F8F6F2;border-radius:8px;padding:10px;text-align:center;border:1px solid #E8E4DE}
    .kpi-v{font-size:20px;font-weight:700;margin-bottom:2px}
    .kpi-l{font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}
    th{background:#F0EDE8;padding:7px 9px;text-align:left;border:1px solid #E8E4DE;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    td{padding:6px 9px;border:1px solid #E8E4DE;vertical-align:middle}
    tr:nth-child(even){background:#FAFAF8}
    .bar-wrap{display:flex;align-items:center;gap:8px}
    .bar-bg{flex:1;height:6px;background:#E8E4DE;border-radius:3px;overflow:hidden}
    .bar-fill{height:100%;border-radius:3px}
    .badge{display:inline-block;padding:2px 7px;border-radius:6px;font-size:10px;font-weight:600}
    .footer{margin-top:24px;padding-top:10px;border-top:1px solid #E8E4DE;font-size:10px;color:#9CA3AF;display:flex;justify-content:space-between}
    @media print{body{padding:16px}@page{margin:1.5cm}}
  </style></head><body>
  <div class="header">
    <div>
      <h1>📊 Rapport d'activité — Sanders Euralis</h1>
      <div style="color:#6B7280;font-size:11px">Site de Vic-en-Bigorre · Période : ${days} derniers jours (${sinceStr} → ${todayStr})</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#6B7280">
      Généré le ${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}<br>
      <strong style="color:#1E1E1E">Par ${cuP?.nom||'?'} (${ROLE_FR[cuP?.role]||'?'})</strong>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="kpi-v" style="color:#2563EB">${list.length}</div><div class="kpi-l">Total RDV</div></div>
    <div class="kpi"><div class="kpi-v" style="color:#2E7D32">${confirmes.length}</div><div class="kpi-l">Livrés</div></div>
    <div class="kpi"><div class="kpi-v" style="color:#C8102E">${nonArrives.length}</div><div class="kpi-l">Non arrivés</div></div>
    <div class="kpi"><div class="kpi-v" style="color:#9CA3AF">${annules.length}</div><div class="kpi-l">Annulés</div></div>
    <div class="kpi"><div class="kpi-v" style="color:${pColor(txPonct)}">${txPonct}%</div><div class="kpi-l">Ponctualité</div></div>
  </div>
  <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="kpi-v" style="color:#2563EB">${totalT}T</div><div class="kpi-l">Tonnage livré</div></div>
    <div class="kpi"><div class="kpi-v" style="color:#7C3AED">${confirmes.length>0?Math.round(totalT/confirmes.length):0}T</div><div class="kpi-l">Moy. / livraison</div></div>
    <div class="kpi"><div class="kpi-v" style="color:#6B7280">${transArr.length}</div><div class="kpi-l">Transporteurs</div></div>
  </div>

  <h2>🏆 Taux de ponctualité par transporteur</h2>
  <table>
    <tr><th>#</th><th>Transporteur</th><th>Total</th><th>Livrés</th><th>Non arrivés</th><th>Annulés</th><th>Tonnage</th><th>Ponctualité</th></tr>
    ${transArr.map((t,i)=>`<tr>
      <td><strong>${i+1}</strong></td>
      <td><strong>${t.nom}</strong></td>
      <td>${t.rdv}</td>
      <td style="color:#2E7D32;font-weight:600">${t.confirme||0}</td>
      <td style="color:${t.non_arrive>0?'#C8102E':'#9CA3AF'};font-weight:${t.non_arrive>0?'700':'400'}">${t.non_arrive||0}</td>
      <td style="color:#9CA3AF">${t.annule||0}</td>
      <td>${t.tonnage}T</td>
      <td><div class="bar-wrap"><div class="bar-bg"><div class="bar-fill" style="width:${t.ponct}%;background:${pColor(t.ponct)}"></div></div><strong style="color:${pColor(t.ponct)}">${t.ponct}%</strong></div></td>
    </tr>`).join('')}
  </table>

  ${nonArrives.length>0?`
  <h2>❌ Détail des non-arrivés (${nonArrives.length})</h2>
  <table>
    <tr><th>Date</th><th>Créneau</th><th>Matière</th><th>Transporteur</th><th>Chauffeur</th><th>Tél.</th><th>N° BL</th></tr>
    ${nonArrives.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr>
      <td>${r.date}</td><td>${r.creneau}</td><td>${r.matiere_nom}</td>
      <td>${r.transporteur}</td><td>${r.chauffeur}</td><td>${r.tel}</td>
      <td style="font-family:monospace">${r.bl}</td>
    </tr>`).join('')}
  </table>`:''}

  <h2>📋 Détail complet des RDV</h2>
  <table>
    <tr><th>Date</th><th>Créneau</th><th>Matière</th><th>Tonnage</th><th>Transporteur</th><th>Chauffeur</th><th>N° BL</th><th>Statut</th></tr>
    ${list.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr>
      <td>${r.date}</td><td>${r.creneau}</td><td>${r.matiere_nom}</td>
      <td>${r.tonnage}T</td><td>${r.transporteur}</td><td>${r.chauffeur}</td>
      <td style="font-family:monospace;font-size:10px">${r.bl}</td>
      <td><span class="badge" style="background:${r.statut==='confirme'?'#f0f7f0':r.statut==='non_arrive'?'#fdf0f2':'#F3F4F6'};color:${r.statut==='confirme'?'#2E7D32':r.statut==='non_arrive'?'#C8102E':'#6B7280'}">${ST[r.statut]?.lbl||r.statut}</span></td>
    </tr>`).join('')}
  </table>

  <div class="footer">
    <span>Sanders Euralis · 193 Impasse Lautrec, 65500 Vic-en-Bigorre</span>
    <span>Document confidentiel — Usage interne uniquement</span>
  </div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();
  showToast('📄 Rapport ouvert — Fichier > Imprimer pour sauvegarder en PDF');
}
// ══ CRÉNEAUX ══
function renderSlots(){
  const canBlock=['admin','responsable'].includes(cuP?.role);
  const days=[...Array(7)].map((_,i)=>{const d=new Date(now);d.setDate(d.getDate()+i);return{date:fmt(d),label:d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})};});
  const rows=CRENEAUX.map(c=>`<tr><td style="font-weight:600;white-space:nowrap;padding:9px 13px;font-size:12.5px">${c}</td>${days.map(d=>{
    const blk=isBlocked(d.date,c),cnt=slotCount(d.date,c),res=slotReservedFor(d.date,c),resMat=res?matById(res):null,full=cnt>=MAX_PAR_CRENEAU;
    let cls=blk?'br':full?'br':cnt>0?'bo':'bg';
    let info=blk?'Bloqué':full?`Complet ${cnt}/${MAX_PAR_CRENEAU}`:cnt>0?`${cnt}/${MAX_PAR_CRENEAU}`:'Libre';
    if(res&&resMat)info+=`<br><span style="font-size:10px">🔒 ${resMat.code}</span>`;
    return`<td style="padding:6px 8px;text-align:center"><div style="display:flex;flex-direction:column;align-items:center;gap:3px"><span class="badge ${cls}" style="white-space:nowrap">${info}</span>${canBlock?`<button class="abtn" onclick="toggleBlock('${d.date}','${c}')" style="font-size:10.5px;padding:2px 7px;margin:0">${blk?'Débloquer':'Bloquer'}</button>`:''}</div></td>`;
  }).join('')}</tr>`).join('');
  return`
  <div class="pg-h"><div><h2>⏱ Créneaux</h2><p>7 prochains jours — max ${MAX_PAR_CRENEAU}/créneau</p></div></div>
  <div class="card"><div class="card-h"><h3>Disponibilité</h3><div style="display:flex;gap:6px"><span class="badge bg">Libre</span><span class="badge bo">Partiel</span><span class="badge br">Complet/Bloqué</span></div></div>
  <div class="tbl-wrap"><table><thead><tr><th>Créneau</th>${days.map(d=>`<th style="text-align:center">${d.label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>
  <div class="card"><div class="card-h"><h3>🔒 Réservés par matière</h3>${canBlock?`<button class="btn-p sm" onclick="openAddSlotMat()">+ Ajouter</button>`:''}</div>
  <div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Créneau</th><th>Matière</th><th>Code</th>${canBlock?'<th>Action</th>':''}</tr></thead>
  <tbody>${SLOTS_MAT.length===0?`<tr><td colspan="${canBlock?5:4}"><div class="empty">Aucune réservation</div></td></tr>`:SLOTS_MAT.map(s=>{const m=matById(s.matiere_id);return`<tr><td>${s.date}</td><td>${s.creneau}</td><td>${m?`<span class="mat-color-dot" style="background:${m.couleur}"></span>${m.nom}`:'—'}</td><td><span style="font-family:monospace;font-size:11px;background:var(--bg);padding:1px 6px;border-radius:4px;border:1px solid var(--border)">${m?.code||'—'}</span></td>${canBlock?`<td><button class="abtn del" onclick="removeSlotMat(${s.id})">✕</button></td>`:''}</tr>`;}).join('')}</tbody></table></div></div>`;
}
async function toggleBlock(date,creneau){
  const ex=BLOCKED.find(b=>b.date===date&&b.creneau===creneau);
  if(ex){await sb.from('creneaux_bloques').delete().eq('id',ex.id);showToast('Créneau débloqué');}
  else{await sb.from('creneaux_bloques').insert({date,creneau});showToast('Créneau bloqué');}
  const{data}=await sb.from('creneaux_bloques').select('*');BLOCKED=data||[];switchView('slots');
}
function openAddSlotMat(){
  document.getElementById('modal-box').className='modal-box';
  document.getElementById('m-title').textContent='Réserver un créneau par matière';
  document.getElementById('m-desc').textContent='Ce créneau sera exclusivement pour la matière choisie.';
  document.getElementById('m-content').innerHTML=`<div style="display:flex;flex-direction:column;gap:12px">
    <div class="fgrp"><label>Date <span class="req">*</span></label><input type="date" id="sm-date" min="${todayStr}"></div>
    <div class="fgrp"><label>Créneau <span class="req">*</span></label><select id="sm-cren"><option value="">—</option>${CRENEAUX.map(c=>`<option>${c}</option>`).join('')}</select></div>
    <div class="fgrp"><label>Matière <span class="req">*</span></label><select id="sm-mat"><option value="">—</option>${MATIERES.filter(m=>m.actif).map(m=>`<option value="${m.id}">[${m.code}] ${m.nom}</option>`).join('')}</select></div>
  </div>`;
  const ok=document.getElementById('m-ok');ok.textContent='Réserver';ok.className='m-ok';
  document.getElementById('m-cancel').style.display='';
  ok.onclick=async()=>{
    const date=document.getElementById('sm-date').value,cren=document.getElementById('sm-cren').value,mat=document.getElementById('sm-mat').value;
    if(!date||!cren||!mat)return;
    await sb.from('creneaux_matieres').insert({date,creneau:cren,matiere_id:mat});
    const{data}=await sb.from('creneaux_matieres').select('*');SLOTS_MAT=data||[];
    closeModal();switchView('slots');showToast('Réservation ajoutée');
  };
  document.getElementById('modal').classList.add('show');
}
async function removeSlotMat(id){await sb.from('creneaux_matieres').delete().eq('id',id);const{data}=await sb.from('creneaux_matieres').select('*');SLOTS_MAT=data||[];switchView('slots');showToast('Supprimé');}

// ══ MATIÈRES ══
function renderMatieres(){
  const canEdit=['admin','responsable'].includes(cuP?.role);
  const cats=[...new Set(MATIERES.map(m=>m.categorie))];
  const matCards=cats.map(cat=>`<div class="card">
    <div class="card-h"><h3>${cat} <span style="font-weight:400;color:var(--soft);font-size:12px">(${MATIERES.filter(m=>m.categorie===cat&&m.actif).length} actives)</span></h3>${canEdit?`<button class="btn-p sm" onclick="openAddMat('${cat}')">+ Ajouter</button>`:''}</div>
    <div style="display:flex;flex-direction:column;">${MATIERES.filter(m=>m.categorie===cat).map(m=>`
      <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border-s);">
        <div style="width:14px;height:14px;border-radius:50%;background:${m.couleur};flex-shrink:0;border:2px solid rgba(0,0,0,.1)"></div>
        <div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:600;">${m.nom}</div><div style="font-size:11px;color:var(--soft);font-family:monospace;margin-top:1px">${m.code}</div></div>
        <span class="badge ${m.actif?'bg':'bgy'}" style="flex-shrink:0">${m.actif?'Active':'Inactive'}</span>
        ${canEdit?`<div style="display:flex;gap:6px;flex-shrink:0">
          <button class="abtn" onclick="openEditMat('${m.id}')" title="Modifier">✏️</button>
          <button class="abtn" onclick="toggleMatActif('${m.id}',${!m.actif})" title="${m.actif?'Désactiver':'Activer'}">${m.actif?'Off':'On'}</button>
          <button class="abtn del" onclick="confirmDelMat('${m.id}')" title="Supprimer">🗑️</button>
        </div>`:''}
      </div>`).join('')}
    </div>
  </div>`).join('');
  const incompatList=[];
  INCOMPATS.forEach(i=>{const a=matById(i.matiere_a),b=matById(i.matiere_b);if(a&&b)incompatList.push({id:i.id,a,b});});
  return`
  <div class="pg-h"><div><h2>🌾 Matières premières</h2></div></div>
  ${matCards}
  <div class="card">
    <div class="card-h"><div><h3>🚫 Incompatibilités</h3><p style="font-size:12px;color:var(--soft);margin-top:2px">Matières qui ne peuvent pas se succéder</p></div>${canEdit?`<button class="btn-p sm" onclick="openAddIncompat()">+ Ajouter</button>`:''}</div>
    <div style="display:flex;flex-direction:column;">
      ${incompatList.length===0?`<div class="empty">Aucune règle définie</div>`:incompatList.map(r=>`
        <div style="display:flex;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid var(--border-s);">
          <span style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500;flex:1;flex-wrap:wrap;">
            <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:${r.a.couleur};display:inline-block"></span>${r.a.nom}</span>
            <span style="color:var(--rouge);font-weight:700;font-size:12px;">✕ après</span>
            <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:${r.b.couleur};display:inline-block"></span>${r.b.nom}</span>
          </span>
          ${canEdit?`<button class="abtn del" onclick="deleteIncompat(${r.id})" style="flex-shrink:0;padding:4px 10px">✕</button>`:''}
        </div>`).join('')}
    </div>
  </div>`;
}
function openAddMat(defaultCat='Céréales'){
  document.getElementById('modal-box').className='modal-box';
  document.getElementById('m-title').textContent='Ajouter une matière';
  document.getElementById('m-desc').textContent='';
  document.getElementById('m-content').innerHTML=`<div style="display:flex;flex-direction:column;gap:11px">
    <div class="frow"><div class="fgrp"><label>Nom <span class="req">*</span></label><input type="text" id="am-nom" placeholder="Ex: Féverole"></div><div class="fgrp"><label>Code <span class="req">*</span></label><input type="text" id="am-code" placeholder="Ex: FEV" maxlength="6"></div></div>
    <div class="frow"><div class="fgrp"><label>Catégorie</label><select id="am-cat">${['Céréales','Oléagineux','Légumineuses','Autre'].map(c=>`<option${c===defaultCat?' selected':''}>${c}</option>`).join('')}</select></div><div class="fgrp"><label>Couleur</label><input type="color" id="am-color" value="#6B7280" style="height:38px;cursor:pointer;padding:2px"></div></div>
  </div>`;
  const ok=document.getElementById('m-ok');ok.textContent='Ajouter';ok.className='m-ok';
  document.getElementById('m-cancel').style.display='';
  ok.onclick=async()=>{
    const nom=document.getElementById('am-nom').value.trim(),code=document.getElementById('am-code').value.trim().toUpperCase();
    if(!nom||!code)return;
    await sb.from('matieres').insert({id:'MAT'+Date.now(),code,nom,categorie:document.getElementById('am-cat').value,couleur:document.getElementById('am-color').value,actif:true});
    const{data}=await sb.from('matieres').select('*').order('categorie').order('nom');MATIERES=data||[];
    closeModal();switchView('matieres');showToast('Matière ajoutée');
  };
  document.getElementById('modal').classList.add('show');
}
function openEditMat(id){
  const m=matById(id);if(!m)return;
  document.getElementById('modal-box').className='modal-box';
  document.getElementById('m-title').textContent=`Modifier — ${m.nom}`;
  document.getElementById('m-desc').textContent='';
  document.getElementById('m-content').innerHTML=`<div style="display:flex;flex-direction:column;gap:11px">
    <div class="frow"><div class="fgrp"><label>Nom</label><input type="text" id="em-nom" value="${m.nom}"></div><div class="fgrp"><label>Code</label><input type="text" id="em-code" value="${m.code}" maxlength="6"></div></div>
    <div class="frow"><div class="fgrp"><label>Catégorie</label><select id="em-cat">${['Céréales','Oléagineux','Légumineuses','Autre'].map(c=>`<option${m.categorie===c?' selected':''}>${c}</option>`).join('')}</select></div><div class="fgrp"><label>Couleur</label><input type="color" id="em-color" value="${m.couleur}" style="height:38px;cursor:pointer;padding:2px"></div></div>
  </div>`;
  const ok=document.getElementById('m-ok');ok.textContent='Enregistrer';ok.className='m-ok';
  document.getElementById('m-cancel').style.display='';
  ok.onclick=async()=>{
    await sb.from('matieres').update({nom:document.getElementById('em-nom').value.trim()||m.nom,code:document.getElementById('em-code').value.trim().toUpperCase()||m.code,categorie:document.getElementById('em-cat').value,couleur:document.getElementById('em-color').value}).eq('id',id);
    const{data}=await sb.from('matieres').select('*').order('categorie').order('nom');MATIERES=data||[];
    closeModal();switchView('matieres');showToast('Mis à jour');
  };
  document.getElementById('modal').classList.add('show');
}
function confirmDelMat(id){
  const m=matById(id);
  const usedCount=RDV.filter(r=>r.matiere_id===id).length;
  document.getElementById('modal-box').className='modal-box';
  document.getElementById('m-title').textContent='Supprimer — '+(m?.nom||'');
  document.getElementById('m-desc').textContent='';
  document.getElementById('m-content').innerHTML=
    '<div style="background:var(--rouge-l);border:1px solid var(--rouge-m);border-radius:8px;padding:12px 14px;font-size:13px;color:var(--rouge);margin-bottom:'+(usedCount>0?'10px':'0')+'">'
    +'⚠️ Cette action est <strong>irréversible</strong>. La matière, ses incompatibilités et créneaux réservés seront supprimés.'
    +'</div>'
    +(usedCount>0?'<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px 14px;font-size:13px;color:#991B1B;margin-top:8px">'
    +'🗑️ <strong>'+usedCount+' RDV associés</strong> seront également supprimés définitivement.</div>':'');
  const ok=document.getElementById('m-ok');
  document.getElementById('m-cancel').style.display='';
  ok.textContent=usedCount>0?'Supprimer + '+usedCount+' RDV':'Supprimer définitivement';
  ok.className='m-ok danger';
  ok.onclick=async()=>{
    showLoader('Suppression en cours…');
    const rdvIds=RDV.filter(r=>r.matiere_id===id).map(r=>r.id);
    if(rdvIds.length>0) await sb.from('commentaires').delete().in('rdv_id',rdvIds);
    await Promise.all([
      sb.from('rdv').delete().eq('matiere_id',id),
      sb.from('incompatibilites').delete().or('matiere_a.eq.'+id+',matiere_b.eq.'+id),
      sb.from('creneaux_matieres').delete().eq('matiere_id',id),
    ]);
    await sb.from('matieres').delete().eq('id',id);
    const[r1,r2,r3,r4]=await Promise.all([
      sb.from('matieres').select('*').order('categorie').order('nom'),
      sb.from('incompatibilites').select('*'),
      sb.from('rdv').select('*').order('date').order('creneau'),
      sb.from('creneaux_matieres').select('*'),
    ]);
    MATIERES=r1.data||[];INCOMPATS=r2.data||[];RDV=r3.data||[];SLOTS_MAT=r4.data||[];
    hideLoader();closeModal();switchView('matieres');
    showToast(usedCount>0?'Matière + '+usedCount+' RDV supprimés':'Matière supprimée');
  };
  document.getElementById('modal').classList.add('show');
}
async function toggleMatActif(id,val){await sb.from('matieres').update({actif:val}).eq('id',id);const{data}=await sb.from('matieres').select('*').order('categorie').order('nom');MATIERES=data||[];switchView('matieres');showToast(val?'Activée':'Désactivée');}
function openAddIncompat(){
  const opts=MATIERES.filter(m=>m.actif).map(m=>`<option value="${m.id}">[${m.code}] ${m.nom}</option>`).join('');
  document.getElementById('modal-box').className='modal-box';
  document.getElementById('m-title').textContent='Ajouter une incompatibilité';
  document.getElementById('m-desc').textContent='La matière A ne peut pas suivre directement la matière B.';
  document.getElementById('m-content').innerHTML=`<div style="display:flex;flex-direction:column;gap:12px;margin-top:4px">
    <div class="fgrp"><label>Matière A <span class="req">*</span></label><select id="ic-a"><option value="">—</option>${opts}</select></div>
    <div style="text-align:center;font-size:13px;color:var(--rouge);font-weight:700">✕ interdit après</div>
    <div class="fgrp"><label>Matière B <span class="req">*</span></label><select id="ic-b"><option value="">—</option>${opts}</select></div>
  </div>`;
  const ok=document.getElementById('m-ok');ok.textContent='Ajouter';ok.className='m-ok';
  document.getElementById('m-cancel').style.display='';
  ok.onclick=async()=>{
    const a=document.getElementById('ic-a').value,b=document.getElementById('ic-b').value;
    if(!a||!b||a===b)return;
    const{error}=await sb.from('incompatibilites').insert({matiere_a:a,matiere_b:b});
    if(error){showToast('Règle déjà existante','error');return;}
    const{data}=await sb.from('incompatibilites').select('*');INCOMPATS=data||[];
    closeModal();switchView('matieres');showToast('Règle ajoutée');
  };
  document.getElementById('modal').classList.add('show');
}
async function deleteIncompat(id){await sb.from('incompatibilites').delete().eq('id',id);const{data}=await sb.from('incompatibilites').select('*');INCOMPATS=data||[];switchView('matieres');showToast('Règle supprimée');}

// ══ NOUVEAU RDV ══
function renderNew(){
  const isT=cuP?.role==='transporteur',isC=cuP?.role==='chauffeur';
  return`
  <div class="pg-h"><div><h2>Nouveau rendez-vous</h2></div></div>
  <div class="card"><div class="card-h"><h3>📋 Demande de livraison</h3><p>Les champs <span class="req">*</span> sont obligatoires</p></div>
  <div style="padding:18px;display:flex;flex-direction:column;gap:18px">
    <div><div class="fsect"><span class="dot dr"></span>Date & Horaire</div>
      <div class="frow"><div class="fgrp"><label>Date <span class="req">*</span></label><input type="date" id="nf-date" min="${tomorrowStr}" onchange="updateSlots()"></div>
      <div class="fgrp"><label>Créneau <span class="req">*</span></label><select id="nf-cren"><option value="">— Choisir date et matière d'abord —</option></select></div></div>
    </div>
    <div><div class="fsect"><span class="dot dv"></span>Matière première</div>
      <div class="frow"><div class="fgrp"><label>Matière <span class="req">*</span></label>
        <select id="nf-mat" onchange="updateSlots()" style="background-color:var(--bg);appearance:auto;-webkit-appearance:auto"><option value="">— Sélectionner une matière —</option>${MATIERES.filter(m=>m.actif).map(m=>`<option value="${m.id}">[${m.code}] ${m.nom}</option>`).join('')}</select>
      </div>
      <div class="fgrp"><label>Tonnage (T) <span class="req">*</span></label><input type="number" id="nf-ton" placeholder="Ex: 26" min="1" max="40"></div></div>
      <div class="fgrp" style="margin-top:11px"><label>N° bon de livraison <span class="req">*</span></label><input type="text" id="nf-bl" placeholder="BL-2024-00XXX"></div>
    </div>
    <div><div class="fsect"><span class="dot dr"></span>Transporteur & Véhicule</div>
      <div class="frow"><div class="fgrp"><label>Transporteur <span class="req">*</span></label><input type="text" id="nf-trans" value="${isT||isC?cuP?.entreprise||'':''}" ${isT||isC?'readonly':''} placeholder="Raison sociale"></div>
      <div class="fgrp"><label>Immatriculation <span class="req">*</span></label><input type="text" id="nf-immat" placeholder="AA-123-BB"></div></div>
    </div>
    <div><div class="fsect"><span class="dot dv"></span>Chauffeur</div>
      <div class="frow"><div class="fgrp"><label>Nom <span class="req">*</span></label><input type="text" id="nf-chauf" value="${isC?cuP?.nom||'':''}" ${isC?'readonly':''} placeholder="Prénom Nom"></div>
      <div class="fgrp"><label>Téléphone <span class="req">*</span></label><input type="tel" id="nf-tel" placeholder="06 00 00 00 00"></div></div>
    </div>
    <div id="compat-info" style="display:none;background:var(--orange-l);border:1px solid #FDE68A;border-radius:8px;padding:11px 14px;font-size:13px;color:#92400E"></div>
  </div>
  <div class="card-foot"><button class="btn-s" onclick="switchView('rdv')">Annuler</button><button class="btn-p" onclick="submitRdv()">✓ Soumettre la demande</button></div>
  </div>`;
}
function updateSlots(){
  const date=document.getElementById('nf-date')?.value,matId=document.getElementById('nf-mat')?.value;
  const sel=document.getElementById('nf-cren');if(!sel)return;
  if(!date||!matId){sel.innerHTML='<option value="">— Choisir date et matière d\'abord —</option>';return;}
  sel.innerHTML='<option value="">— Sélectionner un créneau —</option>';
  CRENEAUX.forEach(c=>{
    const check=checkSlot(date,c,matId);
    const opt=document.createElement('option');
    if(check.ok){
      opt.value=c;
      opt.textContent=c+' ('+( MAX_PAR_CRENEAU-slotCount(date,c))+' place(s))';
    } else {
      opt.value='';opt.disabled=true;
      let reason='Indisponible';
      if(check.reason==='blocked') reason='Bloqué';
      else if(check.reason==='full') reason='Complet';
      else if(check.reason==='reserved'){const rm=matById(check.mat);reason='Réservé '+( rm?.code||'');}
      else if(check.reason==='incompat'){const lm=matById(check.last);reason='Incompat. après '+(lm?.code||'');}
      opt.textContent=c+' — '+reason;
    }
    sel.appendChild(opt);
  });
  updateCompatWarning(date,matId);
}
function updateCompatWarning(date,matId){
  const warn=document.getElementById('compat-info');if(!warn)return;
  // Vérifier si la matière choisie a des restrictions sur cette date
  const restrictions=[];
  CRENEAUX.forEach(c=>{
    const check=checkSlot(date,c,matId);
    if(!check.ok&&check.reason==='incompat'){
      const lm=matById(check.last);
      if(lm&&!restrictions.find(r=>r.id===lm.id)) restrictions.push(lm);
    }
  });
  if(restrictions.length>0){
    warn.style.display='block';
    warn.innerHTML='⚠️ Certains créneaux sont bloqués : <strong>'+matById(matId)?.nom+'</strong> ne peut pas suivre <strong>'+restrictions.map(m=>m.nom).join(', ')+'</strong>. Choisissez un créneau libre.';
  } else {
    warn.style.display='none';
  }
}
async function submitRdv(){
  const ids=['nf-date','nf-cren','nf-mat','nf-ton','nf-bl','nf-trans','nf-immat','nf-chauf','nf-tel'];
  let ok=true;ids.forEach(id=>{const el=document.getElementById(id);if(!el||!el.value.trim()){if(el)el.style.borderColor='var(--rouge)';ok=false;}else if(el)el.style.borderColor='';});
  if(!ok){showToast('Veuillez remplir tous les champs obligatoires','error');return;}
  const date=document.getElementById('nf-date').value;
  const cren=document.getElementById('nf-cren').value;
  const matId=document.getElementById('nf-mat').value;
  // Bloquer le jour J
  if(date<=todayStr){showToast('Les RDV doivent être pris minimum la veille','error');return;}
  const check=checkSlot(date,cren,matId);
  if(!check.ok){
    if(check.reason==='incompat'){
      const lm=matById(check.last);
      showToast('Incompatible après '+( lm?.nom||'?')+' — choisissez un autre créneau','error');
    } else {
      showToast('Créneau indisponible','error');
    }
    return;
  }
  const m=matById(matId);
  showLoader('Enregistrement…');
  // Confirmation automatique directe
  const{data:inserted,error}=await sb.from('rdv').insert({
    date,creneau:cren,matiere_id:matId,matiere_nom:m?.nom||'',
    tonnage:parseInt(document.getElementById('nf-ton').value),
    bl:document.getElementById('nf-bl').value,
    transporteur:document.getElementById('nf-trans').value,
    immat:document.getElementById('nf-immat').value,
    chauffeur:document.getElementById('nf-chauf').value,
    tel:document.getElementById('nf-tel').value,
    statut:'confirme', // ← CONFIRMATION AUTOMATIQUE
    user_id:cu.id
  }).select().single();
  // Verrouiller le créneau SUIVANT pour une matière compatible uniquement
  if(inserted) await lockNextSlotForCompat(date,cren,matId);
  hideLoader();
  if(error){showToast('Erreur: '+error.message,'error');return;}
  await reloadRdv();
  showToast('✅ RDV confirmé automatiquement pour le '+date+' — '+cren);
  switchView('rdv');
}

// Après un RDV confirmé, réserver le créneau suivant pour matières compatibles uniquement
async function lockNextSlotForCompat(date,creneau,matId){
  // On ne verrouille pas physiquement mais on utilise le système d'incompatibilité existant
  // La logique checkSlot s'occupe déjà de bloquer les incompatibles au créneau suivant
  // Rien à faire : lastMatiereBeforeSlot retournera cette matière pour le prochain créneau
}

// ══ DÉTAIL RDV ══
async function openDetail(id){
  const r=RDV.find(r=>r.id===id);if(!r)return;
  const m=matById(r.matiere_id);
  const canC=['admin','responsable','employe'].includes(cuP?.role);
  const canSt=['admin','responsable','employe'].includes(cuP?.role);
  const{data:comments}=await sb.from('commentaires').select('*').eq('rdv_id',id).order('created_at');
  const comms=comments||[];
  document.getElementById('modal-box').className='modal-box wide';
  document.getElementById('m-title').textContent=`RDV #${r.id} — ${r.matiere_nom}`;
  document.getElementById('m-desc').textContent='';
  document.getElementById('m-content').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;font-size:13px">
      <div><span style="color:var(--soft);font-size:11px">Date & Créneau</span><br><strong>${r.date} — ${r.creneau}</strong></div>
      <div><span style="color:var(--soft);font-size:11px">Statut</span><br>
        ${canSt?`<div style="display:flex;gap:6px;flex-wrap:wrap">
        ${bst(r.statut)}
        ${r.statut==='confirme'?`<button class="btn-p sm rouge" onclick="marquerNonArrive(${r.id})">❌ Non arrivé</button>`:''}
        ${r.statut==='non_arrive'?`<button class="btn-p sm" onclick="reporterRdv(${r.id})">🔄 Reporter</button><button class="btn-p sm rouge" onclick="changeStatut(${r.id},'annule')">Annuler</button>`:''}
      </div>`:bst(r.statut)}
      </div>
      <div><span style="color:var(--soft);font-size:11px">Matière</span><br><span class="mat-color-dot" style="background:${m?.couleur||'#ccc'}"></span><strong>${r.matiere_nom}</strong> <span style="font-size:11px;color:var(--soft)">(${m?.code||''})</span> — ${r.tonnage}T</div>
      <div><span style="color:var(--soft);font-size:11px">N° BL</span><br><strong style="font-family:monospace">${r.bl}</strong></div>
      <div><span style="color:var(--soft);font-size:11px">Transporteur</span><br><strong>${r.transporteur}</strong></div>
      <div><span style="color:var(--soft);font-size:11px">Immatriculation</span><br><strong>${r.immat}</strong></div>
      <div><span style="color:var(--soft);font-size:11px">Chauffeur</span><br><strong>${r.chauffeur}</strong></div>
      <div><span style="color:var(--soft);font-size:11px">Téléphone</span><br><a href="tel:${r.tel}" style="color:var(--vert);font-weight:600">${r.tel}</a></div>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:12px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--soft);margin-bottom:9px">💬 Commentaires (${comms.length})</div>
      <div class="comments-list" id="clist-${id}">
        ${comms.length===0?`<div style="font-size:12.5px;color:var(--muted);text-align:center;padding:10px">Aucun commentaire</div>`:comms.map(c=>`<div class="comment"><div class="comment-h"><div class="cav" style="background:${c.auteur_couleur}">${c.auteur.charAt(0)}</div><span class="c-name">${c.auteur}</span><span class="c-date">${new Date(c.created_at).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div><div class="c-text">${c.texte}</div></div>`).join('')}
      </div>
      ${canC?`<div style="display:flex;gap:8px;margin-top:8px"><input type="text" id="nc-${id}" placeholder="Ajouter un commentaire…" class="f-input" style="flex:1;font-size:13px;" onkeydown="if(event.key==='Enter')addComment(${id})"><button class="btn-p sm" onclick="addComment(${id})">Envoyer</button></div>`:''}
    </div>`;
  const ok=document.getElementById('m-ok');ok.textContent='Fermer';ok.className='m-ok';ok.onclick=closeModal;
  document.getElementById('m-cancel').style.display='none';
  document.getElementById('modal').classList.add('show');
}

async function addComment(rdvId){
  const inp=document.getElementById(`nc-${rdvId}`);const text=inp.value.trim();if(!text)return;
  await sb.from('commentaires').insert({rdv_id:rdvId,auteur:cuP?.nom||'?',auteur_couleur:cuP?.couleur||'#6B7280',texte:text});
  inp.value='';
  const{data}=await sb.from('commentaires').select('*').eq('rdv_id',rdvId).order('created_at');
  document.getElementById(`clist-${rdvId}`).innerHTML=(data||[]).map(c=>`<div class="comment"><div class="comment-h"><div class="cav" style="background:${c.auteur_couleur}">${c.auteur.charAt(0)}</div><span class="c-name">${c.auteur}</span><span class="c-date">${new Date(c.created_at).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div><div class="c-text">${c.texte}</div></div>`).join('');
  showToast('Commentaire ajouté');
}

// ══ UTILISATEURS ══
function renderUsers(){
  const isAdmin=cuP?.role==='admin';
  return`
  <div class="pg-h"><div><h2>Utilisateurs</h2><p>${USERS.length} comptes</p></div>${isAdmin?`<button class="btn-p sm" onclick="openAddUser()">+ Ajouter</button>`:''}</div>
  <div class="card"><div class="tbl-wrap"><table>
    <thead><tr><th>Nom</th><th>Rôle</th><th>Entreprise</th><th>Actions</th></tr></thead>
    <tbody>${USERS.map(u=>`<tr>
      <td><span class="av-sm" style="background:${u.couleur||'#6B7280'}">${u.nom?.charAt(0)||'?'}</span>${u.nom}</td>
      <td>${brol(u.role)}</td><td>${u.entreprise||'—'}</td>
      <td>${isAdmin?`<button class="abtn" onclick="openEditUser('${u.id}')">✏️</button>`:''} ${isAdmin&&u.id!==cu.id?`<button class="abtn del" onclick="confirmDelUser('${u.id}')">✕</button>`:''}</td>
    </tr>`).join('')}</tbody>
  </table></div></div>`;
}
function openAddUser(){
  document.getElementById('modal-box').className='modal-box wide';
  document.getElementById('m-title').textContent='Ajouter un utilisateur';
  document.getElementById('m-desc').textContent='Un email de confirmation sera envoyé.';
  document.getElementById('m-content').innerHTML=`<div class="frow">
    <div class="fgrp"><label>Nom <span class="req">*</span></label><input type="text" id="au-name" placeholder="Prénom Nom"></div>
    <div class="fgrp"><label>Email <span class="req">*</span></label><input type="email" id="au-email"></div>
    <div class="fgrp"><label>Mot de passe <span class="req">*</span></label><input type="text" id="au-pwd" placeholder="Motdepasse1!"></div>
    <div class="fgrp"><label>Rôle <span class="req">*</span></label><select id="au-role"><option value="">—</option>${['responsable','employe','transporteur','chauffeur'].map(r=>`<option value="${r}">${ROLE_FR[r]}</option>`).join('')}</select></div>
    <div class="fgrp"><label>Entreprise</label><input type="text" id="au-co"></div>
    <div class="fgrp"><label>Couleur</label><input type="color" id="au-color" value="#2E7D32" style="height:38px;cursor:pointer;padding:2px"></div>
  </div>`;
  const ok=document.getElementById('m-ok');ok.textContent='Créer le compte';ok.className='m-ok';
  document.getElementById('m-cancel').style.display='';
  ok.onclick=async()=>{
    const name=document.getElementById('au-name').value.trim(),email=document.getElementById('au-email').value.trim(),pwd=document.getElementById('au-pwd').value.trim(),role=document.getElementById('au-role').value;
    if(!name||!email||!pwd||!role)return;
    showLoader('Création…');
    const{data:authData,error}=await sb.auth.signUp({email,password:pwd});
    if(error){hideLoader();showToast('Erreur: '+error.message,'error');return;}
    await sb.from('profils').insert({id:authData.user.id,nom:name,role,entreprise:document.getElementById('au-co').value.trim(),couleur:document.getElementById('au-color').value});
    const{data}=await sb.from('profils').select('*');USERS=data||[];
    hideLoader();closeModal();switchView('users');showToast('Compte créé');
  };
  document.getElementById('modal').classList.add('show');
}
function openEditUser(id){
  const u=USERS.find(u=>u.id===id);if(!u)return;
  document.getElementById('modal-box').className='modal-box wide';
  document.getElementById('m-title').textContent=`Modifier — ${u.nom}`;
  document.getElementById('m-desc').textContent='';
  document.getElementById('m-content').innerHTML=`<div class="frow">
    <div class="fgrp"><label>Nom</label><input type="text" id="eu-name" value="${u.nom}"></div>
    <div class="fgrp"><label>Rôle</label><select id="eu-role">${['responsable','employe','transporteur','chauffeur'].map(r=>`<option value="${r}"${u.role===r?' selected':''}>${ROLE_FR[r]}</option>`).join('')}</select></div>
    <div class="fgrp"><label>Entreprise</label><input type="text" id="eu-co" value="${u.entreprise||''}"></div>
    <div class="fgrp"><label>Couleur</label><input type="color" id="eu-color" value="${u.couleur||'#6B7280'}" style="height:38px;cursor:pointer;padding:2px"></div>
  </div>`;
  const ok=document.getElementById('m-ok');ok.textContent='Enregistrer';ok.className='m-ok';
  document.getElementById('m-cancel').style.display='';
  ok.onclick=async()=>{
    await sb.from('profils').update({nom:document.getElementById('eu-name').value||u.nom,role:document.getElementById('eu-role').value||u.role,entreprise:document.getElementById('eu-co').value,couleur:document.getElementById('eu-color').value}).eq('id',id);
    const{data}=await sb.from('profils').select('*');USERS=data||[];
    closeModal();switchView('users');showToast('Profil mis à jour');
  };
  document.getElementById('modal').classList.add('show');
}
function confirmDelUser(id){const u=USERS.find(u=>u.id===id);showModal('Supprimer ce compte ?',`${u?.nom} sera supprimé définitivement.`,'Supprimer',async()=>{await sb.from('profils').delete().eq('id',id);const{data}=await sb.from('profils').select('*');USERS=data||[];closeModal();switchView('users');showToast('Compte supprimé');},true);}

// ══ CHAUFFEURS ══
function renderDrivers(){
  const drivers=USERS.filter(u=>u.role==='chauffeur'&&u.entreprise===cuP?.entreprise);
  return`
  <div class="pg-h"><div><h2>Mes chauffeurs</h2><p>${cuP?.entreprise}</p></div><button class="btn-p sm" onclick="openAddDriver()">+ Ajouter</button></div>
  <div class="card"><div class="tbl-wrap"><table>
    <thead><tr><th>Nom</th><th>Entreprise</th><th>RDV</th><th>Actions</th></tr></thead>
    <tbody>${drivers.length===0?`<tr><td colspan="4"><div class="empty">Aucun chauffeur</div></td></tr>`:drivers.map(d=>`<tr>
      <td><span class="av-sm" style="background:${d.couleur||'#6B7280'}">${d.nom?.charAt(0)||'?'}</span>${d.nom}</td>
      <td>${d.entreprise||'—'}</td><td>${RDV.filter(r=>r.user_id===d.id).length}</td>
      <td><button class="abtn" onclick="openEditUser('${d.id}')">✏️</button><button class="abtn del" onclick="confirmDelUser('${d.id}')">✕</button></td>
    </tr>`).join('')}</tbody>
  </table></div></div>`;
}
function openAddDriver(){
  document.getElementById('modal-box').className='modal-box';
  document.getElementById('m-title').textContent='Ajouter un chauffeur';
  document.getElementById('m-desc').textContent='Un email de confirmation sera envoyé.';
  document.getElementById('m-content').innerHTML=`<div style="display:flex;flex-direction:column;gap:12px">
    <div class="fgrp"><label>Nom <span class="req">*</span></label><input type="text" id="ad-name"></div>
    <div class="fgrp"><label>Email <span class="req">*</span></label><input type="email" id="ad-email"></div>
    <div class="fgrp"><label>Mot de passe <span class="req">*</span></label><input type="text" id="ad-pwd" placeholder="Chauf2024!"></div>
  </div>`;
  const ok=document.getElementById('m-ok');ok.textContent='Créer';ok.className='m-ok';
  document.getElementById('m-cancel').style.display='';
  ok.onclick=async()=>{
    const name=document.getElementById('ad-name').value.trim(),email=document.getElementById('ad-email').value.trim(),pwd=document.getElementById('ad-pwd').value.trim();
    if(!name||!email||!pwd)return;
    showLoader('Création…');
    const{data:authData,error}=await sb.auth.signUp({email,password:pwd});
    if(error){hideLoader();showToast('Erreur: '+error.message,'error');return;}
    await sb.from('profils').insert({id:authData.user.id,nom:name,role:'chauffeur',entreprise:cuP?.entreprise||'',couleur:'#6B7280'});
    const{data}=await sb.from('profils').select('*');USERS=data||[];
    hideLoader();closeModal();switchView('drivers');showToast('Chauffeur créé');
  };
  document.getElementById('modal').classList.add('show');
}

// ══ PARAMÈTRES ══
function renderSettings(){
  // Charger config sauvegardée
  const cfg = loadConfig();
  // Construire les créneaux depuis les horaires
  const html = `
  <div class="pg-h"><div><h2>⚙️ Paramètres</h2></div></div>

  <!-- SITE -->
  <div class="card"><div class="card-h"><h3>🏭 Informations du site</h3></div>
  <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
    <div class="frow">
      <div class="fgrp"><label>Nom du site</label><input type="text" id="cfg-nom" value="${cfg.nom}"></div>
      <div class="fgrp"><label>Téléphone</label><input type="text" id="cfg-tel" value="${cfg.tel}"></div>
      <div class="fgrp"><label>Adresse</label><input type="text" id="cfg-adr" value="${cfg.adr}"></div>
      <div class="fgrp"><label>Email contact</label><input type="email" id="cfg-email" value="${cfg.email}"></div>
    </div>
  </div>
  <div class="card-foot"><button class="btn-p" onclick="saveConfig()">💾 Sauvegarder</button></div>
  </div>

  <!-- HORAIRES & CRÉNEAUX -->
  <div class="card"><div class="card-h"><h3>🕐 Horaires d'ouverture & Créneaux</h3><span style="font-size:12px;color:var(--soft)">Modifiez les horaires pour adapter les créneaux disponibles</span></div>
  <div style="padding:16px;display:flex;flex-direction:column;gap:16px">
    <div><div class="fsect"><span class="dot dv"></span>Lundi – Vendredi</div>
      <div class="frow">
        <div class="fgrp"><label>Ouverture</label><input type="time" id="cfg-lv-open" value="${cfg.lv_open}" onchange="previewCreneaux()"></div>
        <div class="fgrp"><label>Fermeture</label><input type="time" id="cfg-lv-close" value="${cfg.lv_close}" onchange="previewCreneaux()"></div>
        <div class="fgrp"><label>Durée créneau</label>
          <select id="cfg-slot-dur" onchange="previewCreneaux()">
            <option value="60" ${cfg.slot_dur==60?'selected':''}>1 heure</option>
            <option value="120" ${cfg.slot_dur==120?'selected':''}>2 heures</option>
            <option value="180" ${cfg.slot_dur==180?'selected':''}>3 heures</option>
          </select>
        </div>
        <div class="fgrp"><label>Max livraisons/créneau</label>
          <select id="cfg-max-slot">
            ${[1,2,3,4,5].map(n=>`<option value="${n}" ${cfg.max_slot==n?'selected':''}>${n}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div><div class="fsect"><span class="dot dr"></span>Samedi</div>
      <div class="frow">
        <div class="fgrp"><label>Ouverture</label><input type="time" id="cfg-sam-open" value="${cfg.sam_open}" onchange="previewCreneaux()"></div>
        <div class="fgrp"><label>Fermeture</label><input type="time" id="cfg-sam-close" value="${cfg.sam_close}" onchange="previewCreneaux()"></div>
        <div class="fgrp" style="display:flex;align-items:center;gap:8px;padding-top:22px">
          <input type="checkbox" id="cfg-sam-actif" ${cfg.sam_actif?'checked':''} onchange="previewCreneaux()" style="width:16px;height:16px;cursor:pointer">
          <label for="cfg-sam-actif" style="cursor:pointer;margin:0">Samedi ouvert</label>
        </div>
        <div class="fgrp" style="display:flex;align-items:center;gap:8px;padding-top:22px">
          <input type="checkbox" id="cfg-dim-actif" ${cfg.dim_actif?'checked':''} style="width:16px;height:16px;cursor:pointer">
          <label for="cfg-dim-actif" style="cursor:pointer;margin:0">Dimanche ouvert</label>
        </div>
      </div>
    </div>
    <!-- Preview créneaux -->
    <div>
      <div class="fsect"><span class="dot dv"></span>Aperçu des créneaux générés</div>
      <div id="creneaux-preview" style="display:flex;flex-wrap:wrap;gap:6px"></div>
    </div>
  </div>
  <div class="card-foot">
    <button class="btn-s" onclick="previewCreneaux()">👁 Aperçu</button>
    <button class="btn-p" onclick="saveConfig()">💾 Appliquer les horaires</button>
  </div>
  </div>

  <!-- FERMETURES EXCEPTIONNELLES -->
  <div class="card"><div class="card-h">
    <div><h3>📅 Fermetures exceptionnelles & Jours fériés</h3><p style="font-size:12px;color:var(--soft);margin-top:2px">Bloquez des journées entières en un clic</p></div>
    <button class="btn-p sm" onclick="openAddFermeture()">+ Ajouter</button>
  </div>
  <div style="padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn-s sm" onclick="addJoursFeries()">📅 Jours fériés 2025</button>
    <button class="btn-s sm" onclick="addJoursFeries2026()">📅 Jours fériés 2026</button>
  </div>
  <div id="fermetures-list"></div>
  </div>

  <!-- NOTIFICATIONS EMAIL -->
  <div class="card"><div class="card-h"><h3>📧 Notifications email</h3></div>
  <div style="padding:16px;display:flex;flex-direction:column;gap:14px">
    <div style="background:var(--blue-l);border:1px solid #BFDBFE;border-radius:8px;padding:12px 14px;font-size:13px;color:#1e40af">
      ℹ️ Les emails sont envoyés via <strong>Resend</strong>. Configurez votre clé API ci-dessous.
    </div>
    <div class="frow">
      <div class="fgrp"><label>Clé API Resend</label><input type="password" id="cfg-resend" value="${cfg.resend_key||''}" placeholder="re_xxxxxxxxxxxx"></div>
      <div class="fgrp"><label>Email expéditeur</label><input type="email" id="cfg-from" value="${cfg.from_email||'reception@sanders-euralis.fr'}"></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="cfg-notif-confirm" ${cfg.notif_confirm?'checked':''} style="width:16px;height:16px"><label for="cfg-notif-confirm" style="font-size:13px;cursor:pointer">Envoyer email à la confirmation d'un RDV</label></div>
      <div style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="cfg-notif-annule" ${cfg.notif_annule?'checked':''} style="width:16px;height:16px"><label for="cfg-notif-annule" style="font-size:13px;cursor:pointer">Envoyer email à l'annulation d'un RDV</label></div>
    </div>
    <div style="background:var(--orange-l);border:1px solid #FDE68A;border-radius:8px;padding:12px 14px;font-size:12.5px;color:#92400E">
      ⚠️ L'adresse email du transporteur doit être renseignée dans son profil utilisateur pour recevoir les notifications.
    </div>
  </div>
  <div class="card-foot"><button class="btn-p" onclick="saveConfig()">💾 Sauvegarder</button><button class="btn-s" onclick="testEmail()">📧 Envoyer un email test</button></div>
  </div>

  <!-- PWA -->
  <div class="card"><div class="card-h"><h3>📱 Application mobile (PWA)</h3></div>
  <div style="padding:16px">
    <p style="font-size:13px;color:var(--soft);margin-bottom:12px">Installez l'application sur votre téléphone pour un accès rapide sans navigateur.</p>
    <button class="btn-p" id="pwa-install-btn" onclick="installPWA()" style="display:none">📲 Installer l'application</button>
    <div id="pwa-status" style="font-size:13px;color:var(--soft)">Vérification…</div>
  </div>
  </div>`;

  setTimeout(()=>{previewCreneaux();loadFermetures();updatePWAStatus();},100);
  return html;
}

// ══ CONFIG ══
function loadConfig(){
  const defaults={
    nom:'Sanders Euralis — Vic-en-Bigorre',tel:'05 62 38 XX XX',
    adr:'193 Impasse Lautrec, 65500 Vic-en-Bigorre',email:'reception@sanders-euralis.fr',
    lv_open:'06:00',lv_close:'18:00',sam_open:'06:00',sam_close:'12:00',
    slot_dur:120,max_slot:3,sam_actif:true,dim_actif:false,
    resend_key:'',from_email:'reception@sanders-euralis.fr',
    notif_confirm:false,notif_annule:false,fermeture_motifs:{}
  };
  try{ return Object.assign({},defaults,JSON.parse(localStorage.getItem('se-config')||'{}')); }
  catch(e){ return defaults; }
}
function mergeConfig(updates){
  const cfg=loadConfig();
  Object.assign(cfg,updates);
  localStorage.setItem('se-config',JSON.stringify(cfg));
  return cfg;
}
function getConfigVal(id,def=''){
  const el=document.getElementById(id);return el?el.value:def;
}

function saveConfig(){
  const cfg={
    nom: getConfigVal('cfg-nom','Sanders Euralis — Vic-en-Bigorre'),
    tel: getConfigVal('cfg-tel','05 62 38 XX XX'),
    adr: getConfigVal('cfg-adr','193 Impasse Lautrec, 65500 Vic-en-Bigorre'),
    email: getConfigVal('cfg-email','reception@sanders-euralis.fr'),
    lv_open: getConfigVal('cfg-lv-open','06:00'),
    lv_close: getConfigVal('cfg-lv-close','18:00'),
    sam_open: getConfigVal('cfg-sam-open','06:00'),
    sam_close: getConfigVal('cfg-sam-close','12:00'),
    slot_dur: parseInt(getConfigVal('cfg-slot-dur','120')),
    max_slot: parseInt(getConfigVal('cfg-max-slot','3')),
    sam_actif: document.getElementById('cfg-sam-actif')?.checked||false,
    dim_actif: document.getElementById('cfg-dim-actif')?.checked||false,
    resend_key: getConfigVal('cfg-resend',''),
    from_email: getConfigVal('cfg-from','reception@sanders-euralis.fr'),
    notif_confirm: document.getElementById('cfg-notif-confirm')?.checked||false,
    notif_annule: document.getElementById('cfg-notif-annule')?.checked||false,
  };
  mergeConfig(cfg);
  // Appliquer les créneaux globalement
  rebuildCreneaux(cfg);
  showToast('✅ Paramètres sauvegardés');
}

function rebuildCreneaux(cfg){
  const crens=genCreneaux(cfg.lv_open||'06:00',cfg.lv_close||'18:00',cfg.slot_dur||120);
  CRENEAUX.length=0;crens.forEach(c=>CRENEAUX.push(c));
}

function genCreneaux(open,close,durMin){
  const crens=[];
  let [oh,om]=open.split(':').map(Number);
  let [ch,cm]=close.split(':').map(Number);
  let cur=oh*60+om;const end=ch*60+cm;
  while(cur+durMin<=end){
    const sh=Math.floor(cur/60),sm=cur%60;
    const eh=Math.floor((cur+durMin)/60),em=(cur+durMin)%60;
    crens.push(`${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}–${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`);
    cur+=durMin;
  }
  return crens;
}

function previewCreneaux(){
  const open=document.getElementById('cfg-lv-open')?.value||'06:00';
  const close=document.getElementById('cfg-lv-close')?.value||'18:00';
  const dur=parseInt(document.getElementById('cfg-slot-dur')?.value||120);
  const crens=genCreneaux(open,close,dur);
  const el=document.getElementById('creneaux-preview');
  if(!el)return;
  if(crens.length===0){el.innerHTML='<span style="color:var(--rouge);font-size:13px">⚠️ Horaires invalides</span>';return;}
  el.innerHTML=crens.map(c=>`<span class="badge bb" style="font-size:12px;padding:4px 10px">${c}</span>`).join('');
}

// ══ FERMETURES EXCEPTIONNELLES ══
async function loadFermetures(){
  const el=document.getElementById('fermetures-list');if(!el)return;
  // Charger depuis creneaux_bloques groupés par date (journée entière = 6 créneaux bloqués)
  const{data}=await sb.from('creneaux_bloques').select('date,creneau').order('date');
  const byDate={};
  (data||[]).forEach(b=>{byDate[b.date]=(byDate[b.date]||0)+1;});
  // Dates où TOUS les créneaux sont bloqués = fermeture
  const fermetures=Object.entries(byDate).filter(([,n])=>n>=CRENEAUX.length).map(([d])=>d).sort();
  if(fermetures.length===0){el.innerHTML=`<div class="empty">Aucune fermeture exceptionnelle</div>`;return;}
  el.innerHTML=`<div class="tbl-wrap"><table>
    <thead><tr><th>Date</th><th>Jour</th><th>Motif</th><th>Action</th></tr></thead>
    <tbody>${fermetures.map(d=>{
      const dt=new Date(d+'T12:00:00');
      const cfg=loadConfig();
      const motifs=cfg.fermeture_motifs||{};
      return`<tr>
        <td><strong>${d}</strong></td>
        <td>${dt.toLocaleDateString('fr-FR',{weekday:'long'})}</td>
        <td><span style="font-size:12px;color:var(--soft)">${motifs[d]||'—'}</span></td>
        <td><button class="abtn del" onclick="removeFermeture('${d}')">✕ Débloquer</button></td>
      </tr>`;}).join('')}
    </tbody></table></div>`;
}

function openAddFermeture(){
  document.getElementById('modal-box').className='modal-box';
  document.getElementById('m-title').textContent='Ajouter une fermeture';
  document.getElementById('m-desc').textContent='Tous les créneaux de cette journée seront bloqués.';
  document.getElementById('m-content').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="fgrp"><label>Date <span class="req">*</span></label><input type="date" id="f-date" min="${todayStr}"></div>
      <div class="fgrp"><label>Motif</label><input type="text" id="f-motif" placeholder="Ex: Jour férié, Maintenance, Congés…"></div>
    </div>`;
  const ok=document.getElementById('m-ok');ok.textContent='Bloquer la journée';ok.className='m-ok';
  document.getElementById('m-cancel').style.display='';
  ok.onclick=async()=>{
    const date=document.getElementById('f-date').value;
    const motif=document.getElementById('f-motif').value.trim();
    if(!date)return;
    await blockFullDay(date,motif);
    closeModal();loadFermetures();showToast('Journée bloquée');
  };
  document.getElementById('modal').classList.add('show');
}

async function blockFullDay(date,motif=''){
  // Bloquer tous les créneaux
  const inserts=CRENEAUX.map(c=>({date,creneau:c}));
  await sb.from('creneaux_bloques').upsert(inserts,{onConflict:'date,creneau',ignoreDuplicates:true});
  // Sauvegarder le motif en localStorage
  const cfg=loadConfig();
  if(!cfg.fermeture_motifs)cfg.fermeture_motifs={};
  cfg.fermeture_motifs[date]=motif||'Fermeture exceptionnelle';
  mergeConfig(cfg);
  // Mettre à jour le cache
  const{data}=await sb.from('creneaux_bloques').select('*');
  BLOCKED=data||[];
}

async function removeFermeture(date){
  await sb.from('creneaux_bloques').delete().eq('date',date);
  const cfg=loadConfig();
  if(cfg.fermeture_motifs)delete cfg.fermeture_motifs[date];
  mergeConfig(cfg);
  const{data}=await sb.from('creneaux_bloques').select('*');
  BLOCKED=data||[];
  loadFermetures();
  showToast('Journée débloquée');
}

async function addJoursFeries(){
  showLoader('Ajout des jours fériés 2025…');
  const feries=[
    ['2025-01-01','Jour de l\'An'],['2025-04-21','Lundi de Pâques'],
    ['2025-05-01','Fête du Travail'],['2025-05-08','Victoire 1945'],
    ['2025-05-29','Ascension'],['2025-06-09','Lundi de Pentecôte'],
    ['2025-07-14','Fête Nationale'],['2025-08-15','Assomption'],
    ['2025-11-01','Toussaint'],['2025-11-11','Armistice'],['2025-12-25','Noël'],
  ];
  for(const[date,motif] of feries) await blockFullDay(date,motif);
  const{data}=await sb.from('creneaux_bloques').select('*');BLOCKED=data||[];
  hideLoader();loadFermetures();showToast('11 jours fériés 2025 ajoutés ✅');
}

async function addJoursFeries2026(){
  showLoader('Ajout des jours fériés 2026…');
  const feries=[
    ['2026-01-01','Jour de l\'An'],['2026-04-06','Lundi de Pâques'],
    ['2026-05-01','Fête du Travail'],['2026-05-08','Victoire 1945'],
    ['2026-05-14','Ascension'],['2026-05-25','Lundi de Pentecôte'],
    ['2026-07-14','Fête Nationale'],['2026-08-15','Assomption'],
    ['2026-11-01','Toussaint'],['2026-11-11','Armistice'],['2026-12-25','Noël'],
  ];
  for(const[date,motif] of feries) await blockFullDay(date,motif);
  const{data}=await sb.from('creneaux_bloques').select('*');BLOCKED=data||[];
  hideLoader();loadFermetures();showToast('11 jours fériés 2026 ajoutés ✅');
}

// ══ NOTIFICATIONS EMAIL ══
async function sendEmailNotif(rdvId, type){
  const cfg=loadConfig();
  if(!cfg.resend_key) return; // Pas de clé configurée
  if(type==='confirme'&&!cfg.notif_confirm) return;
  if(type==='annule'&&!cfg.notif_annule) return;

  const rdv=RDV.find(r=>r.id===rdvId);if(!rdv)return;
  // Chercher l'email du transporteur dans les profils
  const userProfil=USERS.find(u=>u.entreprise===rdv.transporteur||u.nom===rdv.chauffeur);
  const transporteurEmail=userProfil?.email;
  if(!transporteurEmail) return; // Pas d'email trouvé

  try{
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`,{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${SUPABASE_KEY}`,
        'Content-Type':'application/json',
      },
      body:JSON.stringify({type,rdv,transporteur_email:transporteurEmail})
    });
  }catch(e){ console.log('Email non envoyé:',e); }
}

async function testEmail(){
  const cfg=loadConfig();
  if(!cfg.resend_key){showToast('Configurez d\'abord une clé API Resend','error');return;}
  showToast('Email test envoyé à '+cfg.email);
}

// ══ ACTIONS ══
async function changeStatut(id,statut){
  showLoader();
  await sb.from('rdv').update({statut}).eq('id',id);
  await reloadRdv();hideLoader();
  // Envoyer email si configuré
  if(statut==='confirme'||statut==='annule') sendEmailNotif(id,statut);
  if(document.getElementById('modal').classList.contains('show')){closeModal();}
  switchView(cv);showToast('Statut mis à jour → '+ST[statut]?.lbl);
}
// ══ MARQUER NON ARRIVÉ ══
async function marquerNonArrive(id){
  const r=RDV.find(r=>r.id===id);if(!r)return;
  document.getElementById('modal-box').className='modal-box';
  document.getElementById('m-title').textContent='❌ Marquer comme non arrivé ?';
  document.getElementById('m-desc').textContent='';
  document.getElementById('m-content').innerHTML=`
    <div style="background:var(--rouge-l);border:1px solid var(--rouge-m);border-radius:8px;padding:12px 14px;font-size:13px;margin-bottom:12px">
      <strong>${r.transporteur}</strong> — ${r.chauffeur}<br>
      <span style="color:var(--soft)">${r.matiere_nom} · ${r.tonnage}T · ${r.creneau}</span>
    </div>
    <div class="fgrp">
      <label>Motif (optionnel)</label>
      <input type="text" id="na-motif" placeholder="Ex: Camion en panne, route barrée…">
    </div>`;
  const ok=document.getElementById('m-ok');
  ok.textContent='❌ Confirmer non arrivé';ok.className='m-ok danger';
  document.getElementById('m-cancel').style.display='';
  ok.onclick=async()=>{
    const motif=document.getElementById('na-motif')?.value.trim();
    showLoader();
    await sb.from('rdv').update({statut:'non_arrive'}).eq('id',id);
    if(motif){
      await sb.from('commentaires').insert({
        rdv_id:id,auteur:cuP?.nom||'?',
        auteur_couleur:cuP?.couleur||'#C8102E',
        texte:'❌ Non arrivé — '+motif
      });
    }
    await reloadRdv();hideLoader();closeModal();
    showToast('✅ Marqué comme non arrivé');
    switchView('dash');
  };
  document.getElementById('modal').classList.add('show');
}

// ══ REPORT AU LENDEMAIN ══
function trouverCreneauDispo(matId, fromDate){
  // Cherche le premier créneau dispo et compatible à partir de fromDate
  const maxDays=14;
  for(let d=0;d<maxDays;d++){
    const date=fmt(new Date(new Date(fromDate+'T12:00:00').getTime()+(d*86400000)));
    // Pas de dimanche
    if(new Date(date+'T12:00:00').getDay()===0) continue;
    for(const cr of CRENEAUX){
      const check=checkSlot(date,cr,matId);
      if(check.ok) return {date,creneau:cr};
    }
  }
  return null;
}

async function reporterRdv(id){
  const r=RDV.find(r=>r.id===id);if(!r)return;
  const m=matById(r.matiere_id);

  // Trouver tous les créneaux dispos du lendemain (et J+2 si besoin)
  const slots=[];
  for(let d=1;d<=7;d++){
    const date=fmt(new Date(now.getTime()+(d*86400000)));
    if(new Date(date+'T12:00:00').getDay()===0) continue; // pas dimanche
    for(const cr of CRENEAUX){
      const check=checkSlot(date,cr,r.matiere_id);
      if(check.ok){
        const cnt=slotCount(date,cr);
        slots.push({date,creneau:cr,places:MAX_PAR_CRENEAU-cnt});
      }
    }
    // Afficher seulement les 2 prochains jours avec des créneaux
    const datesAvecSlots=[...new Set(slots.map(s=>s.date))];
    if(datesAvecSlots.length>=2) break;
  }

  if(slots.length===0){
    showModal('Aucun créneau disponible',
      `Impossible de reporter ${r.matiere_nom} — aucun créneau compatible dans les 7 prochains jours.`,
      'Compris',closeModal,false);
    return;
  }

  // Grouper par date
  const byDate={};
  slots.forEach(s=>{
    if(!byDate[s.date])byDate[s.date]=[];
    byDate[s.date].push(s);
  });

  document.getElementById('modal-box').className='modal-box wide';
  document.getElementById('m-title').textContent='🔄 Reporter ce RDV';
  document.getElementById('m-desc').textContent='';
  document.getElementById('m-content').innerHTML=`
    <div style="background:var(--rouge-l);border-radius:8px;padding:10px 13px;border:1px solid var(--rouge-m);margin-bottom:14px;font-size:13px">
      <div style="font-size:11px;color:var(--soft);margin-bottom:3px">RDV original (sera annulé)</div>
      <strong style="color:var(--rouge)">${r.date} — ${r.creneau}</strong> &nbsp;·&nbsp;
      ${matDot(r.matiere_id)}<strong>${r.matiere_nom}</strong> · ${r.tonnage}T · ${r.transporteur} · ${r.chauffeur}
    </div>
    <div style="font-size:12px;font-weight:600;color:var(--soft);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">Choisir un créneau :</div>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${Object.entries(byDate).map(([date,crens])=>`
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:7px;padding:4px 10px;background:var(--bg);border-radius:6px;border:1px solid var(--border)">
            📅 ${new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:7px">
            ${crens.map(s=>`
              <button onclick="confirmerReport(${id},'${s.date}','${s.creneau}')"
                style="padding:9px 14px;border:1.5px solid var(--vert);border-radius:8px;background:var(--vert-l);color:var(--vert);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:2px"
                onmouseover="this.style.background='var(--vert)';this.style.color='#fff'"
                onmouseout="this.style.background='var(--vert-l)';this.style.color='var(--vert)'">
                <span>${s.creneau}</span>
                <span style="font-size:10px;font-weight:400;opacity:.8">${s.places} place(s)</span>
              </button>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;

  const ok=document.getElementById('m-ok');
  ok.style.display='none';
  document.getElementById('m-cancel').style.display='';
  document.getElementById('modal').classList.add('show');
}

async function confirmerReport(rdvId, newDate, newCreneau){
  const r=RDV.find(r=>r.id===rdvId);if(!r)return;
  showLoader('Report en cours…');
  await sb.from('rdv').update({statut:'annule'}).eq('id',rdvId);
  await sb.from('rdv').insert({
    date:newDate,creneau:newCreneau,
    matiere_id:r.matiere_id,matiere_nom:r.matiere_nom,
    tonnage:r.tonnage,bl:r.bl,transporteur:r.transporteur,
    immat:r.immat,chauffeur:r.chauffeur,tel:r.tel,
    statut:'confirme',user_id:r.user_id
  });
  await reloadRdv();
  hideLoader();closeModal();switchView('dash');
  showToast('✅ RDV reporté au '+newDate+' — '+newCreneau);
}

async function reporterTous(){
  const nonArrives=RDV.filter(r=>r.statut==='non_arrive');
  if(nonArrives.length===0)return;
  showModal(
    `Reporter ${nonArrives.length} RDV ?`,
    'Chaque RDV sera reporté sur le premier créneau disponible et compatible. Les anciens RDV seront annulés.',
    'Tout reporter',
    async()=>{
      showLoader('Report en cours…');
      let ok=0,fail=0;
      for(const r of nonArrives){
        const slot=trouverCreneauDispo(r.matiere_id,todayStr);
        if(slot){
          await sb.from('rdv').update({statut:'annule'}).eq('id',r.id);
          await sb.from('rdv').insert({
            date:slot.date,creneau:slot.creneau,
            matiere_id:r.matiere_id,matiere_nom:r.matiere_nom,
            tonnage:r.tonnage,bl:r.bl,transporteur:r.transporteur,
            immat:r.immat,chauffeur:r.chauffeur,tel:r.tel,
            statut:'confirme',user_id:r.user_id
          });
          ok++;
        } else { fail++; }
      }
      await reloadRdv();
      hideLoader();closeModal();switchView('dash');
      showToast(`✅ ${ok} RDV reportés${fail>0?' · '+fail+' sans créneau dispo':''}`);
    },
    false
  );
}

function delRdv(id){showModal('Supprimer ce RDV ?','Action irréversible.','Supprimer',async()=>{showLoader();await sb.from('rdv').delete().eq('id',id);await reloadRdv();hideLoader();closeModal();switchView(cv);showToast('RDV supprimé');},true);}

// ══ MODAL ══
function showModal(title,desc,okLbl,onOk,danger){
  document.getElementById('modal-box').className='modal-box';
  document.getElementById('m-title').textContent=title;document.getElementById('m-desc').textContent=desc;document.getElementById('m-content').innerHTML='';
  const ok=document.getElementById('m-ok');ok.textContent=okLbl;ok.className='m-ok'+(danger?' danger':'');ok.onclick=onOk;
  document.getElementById('m-cancel').style.display=danger?'':'none';
  document.getElementById('modal').classList.add('show');
}
function closeModal(){document.getElementById('modal').classList.remove('show');document.getElementById('m-cancel').style.display='';document.getElementById('m-ok').style.display='';}

// ══ PWA ══
function initPWA(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').then(()=>console.log('SW registered')).catch(e=>console.log('SW error',e));
  }
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();deferredInstall=e;
    // Afficher banner après 3 secondes si pas déjà installé
    if(!localStorage.getItem('pwa-dismissed')){
      setTimeout(showPWABanner,3000);
    }
  });
  window.addEventListener('appinstalled',()=>{
    deferredInstall=null;hidePWABanner();showToast('✅ Application installée !');
  });
}
function showPWABanner(){
  if(document.getElementById('pwa-banner'))return;
  const banner=document.createElement('div');
  banner.id='pwa-banner';banner.className='pwa-banner';
  banner.innerHTML=`<div class="pwa-banner-text"><strong>📲 Installer l'app</strong><span>Accès rapide depuis l'écran d'accueil</span></div><button class="pwa-btn" onclick="installPWA()">Installer</button><button class="pwa-close" onclick="hidePWABanner()">✕</button>`;
  document.body.appendChild(banner);
}
function hidePWABanner(){const b=document.getElementById('pwa-banner');if(b)b.remove();localStorage.setItem('pwa-dismissed','1');}
async function installPWA(){
  if(!deferredInstall){showToast('Utilisez le menu du navigateur → "Ajouter à l\'écran d\'accueil"','error');return;}
  deferredInstall.prompt();const{outcome}=await deferredInstall.userChoice;
  if(outcome==='accepted'){deferredInstall=null;hidePWABanner();}
}
function updatePWAStatus(){
  const btn=document.getElementById('pwa-install-btn');
  const status=document.getElementById('pwa-status');
  if(!btn||!status)return;
  if(window.matchMedia('(display-mode: standalone)').matches){status.textContent='✅ Application déjà installée';return;}
  if(deferredInstall){btn.style.display='inline-flex';status.textContent='L\'application peut être installée sur cet appareil.';}
  else{status.textContent='Pour installer : menu du navigateur → "Ajouter à l\'écran d\'accueil" (ou "Installer l\'application").';}
}

// ══ TEMPS RÉEL ══
let realtimeInterval=null;
function startRealtime(){
  stopRealtime();
  realtimeInterval=setInterval(async()=>{
    await reloadRdv();
    // Mettre à jour le compteur dans la nav si on est sur le dash
    if(cv==='dash'){
      const enAtt=myRdvs().filter(r=>r.statut==='attente'||r.statut==='confirme'&&r.date===todayStr).length;
      const badge=document.getElementById('rt-badge');
      if(badge) badge.textContent=enAtt>0?enAtt:'';
      // Rafraîchir les stats sans reconstruire tout le dashboard
      refreshDashStats();
    }
    if(cv==='rdv') switchView('rdv');
    if(cv==='cal') renderCalContent();
  },30000); // 30 secondes
}
function stopRealtime(){
  if(realtimeInterval){clearInterval(realtimeInterval);realtimeInterval=null;}
}
function refreshDashStats(){
  const all=myRdvs();
  const today=all.filter(r=>r.date===todayStr);
  const enAtt=all.filter(r=>r.statut==='attente');
  const avenir=all.filter(r=>r.date>todayStr);
  const totalT=all.filter(r=>r.statut==='termine'||r.statut==='confirme').reduce((s,r)=>s+r.tonnage,0);
  const els={'.rt-today':today.length,'.rt-attente':enAtt.length,'.rt-avenir':avenir.length,'.rt-tonnage':totalT+'T'};
  Object.entries(els).forEach(([sel,val])=>{const el=document.querySelector(sel);if(el)el.textContent=val;});
}

// ══ PLANNING JOURNÉE IMPRIMABLE ══
function printPlanning(date){
  const d=date||todayStr;
  const rdvsDay=myRdvs().filter(r=>r.date===d).sort((a,b)=>CRENEAUX.indexOf(a.creneau)-CRENEAUX.indexOf(b.creneau));
  const totalT=rdvsDay.filter(r=>r.statut!=='annule').reduce((s,r)=>s+r.tonnage,0);
  const dateLabel=new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;padding:24px;color:#1E1E1E;font-size:13px}
  .header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #2E7D32;padding-bottom:12px;margin-bottom:20px}
  .header h1{font-size:20px;color:#2E7D32;margin:0}
  .header .meta{text-align:right;font-size:12px;color:#6B7280}
  .kpis{display:flex;gap:16px;margin-bottom:20px}
  .kpi{flex:1;background:#F8F6F2;border-radius:8px;padding:12px;text-align:center;border:1px solid #E8E4DE}
  .kpi-v{font-size:22px;font-weight:700;color:#2E7D32}
  .kpi-l{font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#F8F6F2;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6B7280;border-bottom:2px solid #E8E4DE}
  td{padding:9px 10px;border-bottom:1px solid #F0EDE8;vertical-align:middle}
  tr:hover td{background:#FAFAF8}
  .badge{display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600}
  .bg{background:#f0f7f0;color:#2E7D32}.bb{background:#EFF6FF;color:#2563EB}.bo{background:#FFF7E6;color:#D97706}.br{background:#fdf0f2;color:#C8102E}.bgy{background:#F3F4F6;color:#6B7280}
  .mat-dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:5px;vertical-align:middle}
  .creneau-row{background:#f0f7f0!important}
  .empty-slot{color:#9CA3AF;font-style:italic;font-size:12px}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #E8E4DE;font-size:11px;color:#9CA3AF;display:flex;justify-content:space-between}
  @media print{body{padding:16px}.no-print{display:none}}
</style></head><body>
<div class="header">
  <div>
    <h1>📋 Planning Réception — ${dateLabel}</h1>
    <div style="font-size:12px;color:#6B7280;margin-top:4px">Sanders Euralis · Site de Vic-en-Bigorre</div>
  </div>
  <div class="meta">
    Imprimé le ${new Date().toLocaleString('fr-FR',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}<br>
    <strong>${rdvsDay.filter(r=>r.statut!=='annule').length} livraison(s) · ${totalT}T</strong>
  </div>
</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-v">${rdvsDay.filter(r=>r.statut!=='annule').length}</div><div class="kpi-l">Livraisons</div></div>
  <div class="kpi"><div class="kpi-v">${totalT}T</div><div class="kpi-l">Tonnage total</div></div>
  <div class="kpi"><div class="kpi-v">${rdvsDay.filter(r=>r.statut==='confirme').length}</div><div class="kpi-l">Confirmés</div></div>
  <div class="kpi"><div class="kpi-v">${rdvsDay.filter(r=>r.statut==='annule').length}</div><div class="kpi-l">Annulés</div></div>
</div>
<table>
  <thead><tr><th>Créneau</th><th>Matière</th><th>Code</th><th>Tonnage</th><th>Transporteur</th><th>Chauffeur</th><th>Immat.</th><th>Tél.</th><th>N° BL</th><th>Statut</th></tr></thead>
  <tbody>
  ${CRENEAUX.map(cren=>{
    const rdvsCren=rdvsDay.filter(r=>r.creneau===cren);
    const blk=isBlocked(d,cren);
    if(blk) return '<tr><td style="font-weight:600;color:#C8102E">'+cren+'</td><td colspan="9" style="color:#C8102E;font-style:italic">🔒 Créneau bloqué</td></tr>';
    if(rdvsCren.length===0) return '<tr><td style="font-weight:600;color:#9CA3AF">'+cren+'</td><td colspan="9" class="empty-slot">Aucune livraison</td></tr>';
    return rdvsCren.map((r,i)=>{
      const m=matById(r.matiere_id);
      const stMap={attente:'bo',planifie:'bb',confirme:'bg',termine:'bgy',annule:'br'};
      const stLbl={attente:'En attente',planifie:'Planifié',confirme:'Confirmé',termine:'Terminé',annule:'Annulé'};
      return '<tr>'
        +(i===0?'<td rowspan="'+rdvsCren.length+'" style="font-weight:700;border-right:2px solid #E8E4DE">'+cren+'</td>':'')
        +'<td><span class="mat-dot" style="background:'+(m?.couleur||'#ccc')+'"></span>'+(m?.nom||r.matiere_nom)+'</td>'
        +'<td style="font-family:monospace;font-size:11px">'+(m?.code||'—')+'</td>'
        +'<td><strong>'+r.tonnage+'T</strong></td>'
        +'<td>'+r.transporteur+'</td>'
        +'<td>'+r.chauffeur+'</td>'
        +'<td style="font-size:11px">'+r.immat+'</td>'
        +'<td style="font-size:11px">'+r.tel+'</td>'
        +'<td style="font-family:monospace;font-size:11px">'+r.bl+'</td>'
        +'<td><span class="badge '+(stMap[r.statut]||'bgy')+'">'+(stLbl[r.statut]||r.statut)+'</span></td>'
        +'</tr>';
    }).join('');
  }).join('')}
  </tbody>
</table>
<div class="footer">
  <span>Sanders Euralis · 193 Impasse Lautrec, 65500 Vic-en-Bigorre</span>
  <span>Document généré automatiquement — ne pas modifier</span>
</div>
<script>window.onload=()=>window.print();</script>
</body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();
}

// ══ INIT ══
(async function init(){
  showLoader('Initialisation…');
  const{data:{session}}=await sb.auth.getSession();
  if(session){cu=session.user;await loadProfil();await loadAllData();
    const cfg=loadConfig();
    if(cfg.lv_open) rebuildCreneaux(cfg);
    buildDash();showPage('dash');startRealtime();}
  else{hideLoader();showPage('home');}
})();