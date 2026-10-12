/* ============================================================
   EMM-FREQUENCE - Application complète (sans gestion financière)
   ============================================================ */

const DB_NAME = 'EMM_FREQUENCE_DB';
const DB_VERSION = 2;
let db = null;
let currentUser = null;

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_SEMAINE = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

/* ---------- BASE DE DONNÉES ---------- */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('users')) d.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('entites')) d.createObjectStore('entites', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('freqJournaliere')) d.createObjectStore('freqJournaliere', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('freqMensuelle')) d.createObjectStore('freqMensuelle', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e);
  });
}
function tx(store, mode = 'readonly') { return db.transaction(store, mode).objectStore(store); }
function dbAdd(store, data) {
  return new Promise((res, rej) => {
    const r = tx(store, 'readwrite').add(data);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
function dbPut(store, data) {
  return new Promise((res, rej) => {
    const r = tx(store, 'readwrite').put(data);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
function dbGetAll(store) {
  return new Promise((res, rej) => {
    const r = tx(store).getAll();
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
function dbGet(store, id) {
  return new Promise((res, rej) => {
    const r = tx(store).get(id);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
function dbDelete(store, id) {
  return new Promise((res, rej) => {
    const r = tx(store, 'readwrite').delete(id);
    r.onsuccess = () => res(); r.onerror = () => rej(r.error);
  });
}

/* ---------- DÉMARRAGE ---------- */
window.addEventListener('load', async () => {
  await openDB();
  await seedAdmin();
  initEmailJS();
  setTimeout(() => {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('loginScreen').classList.remove('hidden');
  }, 2800);
});

async function seedAdmin() {
  const users = await dbGetAll('users');
  if (users.length === 0) {
    await dbAdd('users', { username: 'admin', password: 'admin123', nom: 'Administrateur Provincial', role: 'admin', actif: true });
    await dbAdd('users', { username: 'user1', password: 'user123', nom: 'Utilisateur Test', role: 'user', actif: true });
    const demo = [
      { type: 'Johrei Center', nom: 'BIANCKYA', responsable: 'Resp. Bianckya' },
      { type: 'Unité religieuse', nom: 'KELE-KELE', responsable: 'Resp. Kele-Kele' },
      { type: 'Unité religieuse', nom: 'KANYUKA', responsable: 'Resp. Kanyuka' },
      { type: 'Unité religieuse', nom: 'NGANZA', responsable: 'Resp. Nganza' },
      { type: 'Unité religieuse', nom: 'MATAMBA', responsable: 'Resp. Matamba' },
      { type: 'Foyer de lumière', nom: 'Foyer Lukonga', responsable: 'Resp. Lukonga' }
    ];
    for (const e of demo) await dbAdd('entites', e);
  }
}

/* ---------- LOGIN / LOGOUT ---------- */
async function login() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const users = await dbGetAll('users');
  const found = users.find(x => x.username === u && x.password === p && x.actif);
  if (!found) { document.getElementById('loginError').textContent = 'Identifiants incorrects'; return; }
  currentUser = found;
  sessionStorage.setItem('emm_user', JSON.stringify(found));
  enterApp();
}
function enterApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('currentUserName').textContent = currentUser.nom;
  document.getElementById('currentUserRole').textContent = currentUser.role === 'admin' ? 'Administrateur Provincial' : 'Utilisateur';
  if (currentUser.role !== 'admin') document.getElementById('menuUsers').style.display = 'none';
  showPage('home');
}
function logout() {
  currentUser = null; sessionStorage.removeItem('emm_user'); location.reload();
}
function toggleMenu() { document.getElementById('sidebar').classList.toggle('open'); }

/* ---------- NAVIGATION ---------- */
const pages = {};
function showPage(name) {
  document.getElementById('sidebar').classList.remove('open');
  if (pages[name]) pages[name]();
}

/* ---------- HELPERS ---------- */
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function openModal(html) { document.getElementById('modalBody').innerHTML = html; document.getElementById('modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

/* ---------- CONFIG ---------- */
const CONFIG_KEY = 'emm_config';
function getConfig() { return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); }
function setConfig(cfg) { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); }
function initEmailJS() {
  const cfg = getConfig();
  if (cfg.emailjsPublicKey && window.emailjs) { emailjs.init(cfg.emailjsPublicKey); return true; }
  return false;
}

/* ============================================================
   PAGE ACCUEIL
   ============================================================ */
pages.home = async () => {
  const entites = await dbGetAll('entites');
  const fj = await dbGetAll('freqJournaliere');
  const fm = await dbGetAll('freqMensuelle');
  document.getElementById('main').innerHTML = `
    <div class="card"><h3>Bienvenue, ${esc(currentUser.nom)}</h3><p>Tableau de bord général - EMM-FREQUENCE</p></div>
    <div class="grid">
      <div class="stat-card"><div class="num">${entites.length}</div><div class="label">Entités</div></div>
      <div class="stat-card"><div class="num">${fj.length}</div><div class="label">Fréq. Journalières</div></div>
      <div class="stat-card"><div class="num">${fm.length}</div><div class="label">Fréq. Mensuelles</div></div>
    </div>
    <div class="card" style="margin-top:15px">
      <h3>Actions rapides</h3>
      <button class="btn btn-primary" onclick="showPage('freqJournaliere')">📅 Nouvelle fréq. journalière</button>
      <button class="btn btn-success" onclick="showPage('freqMensuelle')">📊 Nouvelle fréq. mensuelle</button>
    </div>
  `;
};

/* ============================================================
   ENTITÉS
   ============================================================ */
pages.entites = async () => {
  const list = await dbGetAll('entites');
  document.getElementById('main').innerHTML = `
    <div class="card">
      <h3>🏛️ Gestion des entités</h3>
      ${currentUser.role === 'admin' ? `
      <div class="grid">
        <div><label>Type</label>
          <select id="entType"><option>Johrei Center</option><option>Unité religieuse</option><option>Foyer de lumière</option></select>
        </div>
        <div><label>Nom</label><input id="entNom" placeholder="Ex: KELE-KELE"></div>
        <div><label>Responsable</label><input id="entResp" placeholder="Nom"></div>
      </div>
      <button class="btn btn-primary" onclick="saveEntite()">➕ Ajouter</button>
      ` : '<p><em>Seul l\'administrateur peut gérer les entités.</em></p>'}
    </div>
    <div class="card">
      <h3>Liste (${list.length})</h3>
      <table>
        <thead><tr><th>Type</th><th>Nom</th><th>Responsable</th>${currentUser.role==='admin'?'<th>Action</th>':''}</tr></thead>
        <tbody>${list.map(e => `<tr>
          <td>${esc(e.type)}</td><td>${esc(e.nom)}</td><td>${esc(e.responsable)}</td>
          ${currentUser.role==='admin'?`<td><button class="btn btn-danger" style="padding:5px 10px" onclick="deleteEntite(${e.id})">🗑</button></td>`:''}
        </tr>`).join('') || '<tr><td colspan="4">Aucune entité</td></tr>'}</tbody>
      </table>
    </div>
  `;
};
async function saveEntite() {
  const type = document.getElementById('entType').value;
  const nom = document.getElementById('entNom').value.trim();
  const responsable = document.getElementById('entResp').value.trim();
  if (!nom) return alert('Nom requis');
  await dbAdd('entites', { type, nom, responsable });
  pages.entites();
}
async function deleteEntite(id) {
  if (!confirm('Supprimer ?')) return;
  await dbDelete('entites', id); pages.entites();
}

/* ============================================================
   FRÉQUENCE JOURNALIÈRE
   ============================================================ */
pages.freqJournaliere = async () => {
  const entites = await dbGetAll('entites');
  const list = await dbGetAll('freqJournaliere');
  document.getElementById('main').innerHTML = `
    <div class="card">
      <h3>📅 Enregistrer une fréquence journalière</h3>
      <div class="grid">
        <div><label>Entité</label>
          <select id="fjEntite">${entites.map(e=>`<option value="${e.id}">${esc(e.type)} - ${esc(e.nom)}</option>`).join('')}</select>
        </div>
        <div><label>Jour</label>
          <select id="fjJour">${JOURS_SEMAINE.map(j=>`<option>${j}</option>`).join('')}</select>
        </div>
        <div><label>Date</label><input type="date" id="fjDate" value="${todayISO()}"></div>
        <div><label>Membres</label><input type="number" id="fjMembres" min="0" value="0"></div>
        <div><label>Sympathisants</label><input type="number" id="fjSymp" min="0" value="0"></div>
        <div><label>Nouveaux venus</label><input type="number" id="fjNouveaux" min="0" value="0"></div>
      </div>
      <button class="btn btn-primary" onclick="saveFJ()">💾 Enregistrer</button>
    </div>
    <div class="card"><div id="rapportHebdo"></div></div>
    <div class="card">
      <h3>Historique (${list.length})</h3>
      <table>
        <thead><tr><th>Date</th><th>Jour</th><th>Entité</th><th>Memb.</th><th>Symp.</th><th>Nouv.</th><th>Total</th><th></th></tr></thead>
        <tbody>${list.slice().reverse().map(r => {
          const e = entites.find(x=>x.id===r.entiteId);
          const total = (r.membres||0)+(r.sympathisants||0)+(r.nouveaux||0);
          return `<tr><td>${esc(r.date)}</td><td>${esc(r.jour)}</td><td>${esc(e?e.nom:'?')}</td>
            <td>${r.membres}</td><td>${r.sympathisants}</td><td>${r.nouveaux}</td><td><strong>${total}</strong></td>
            <td><button class="btn btn-danger" style="padding:4px 8px" onclick="deleteFJ(${r.id})">🗑</button></td></tr>`;
        }).join('') || '<tr><td colspan="8">Aucun enregistrement</td></tr>'}</tbody>
      </table>
    </div>
  `;
  renderRapportHebdo();
};
async function saveFJ() {
  await dbAdd('freqJournaliere', {
    entiteId: +document.getElementById('fjEntite').value,
    jour: document.getElementById('fjJour').value,
    date: document.getElementById('fjDate').value,
    membres: +document.getElementById('fjMembres').value || 0,
    sympathisants: +document.getElementById('fjSymp').value || 0,
    nouveaux: +document.getElementById('fjNouveaux').value || 0,
    user: currentUser.nom
  });
  pages.freqJournaliere();
}
async function deleteFJ(id) { if (!confirm('Supprimer ?')) return; await dbDelete('freqJournaliere', id); pages.freqJournaliere(); }

async function renderRapportHebdo() {
  const list = await dbGetAll('freqJournaliere');
  const entites = await dbGetAll('entites');
  const parEntite = {};
  list.forEach(r => {
    if (!parEntite[r.entiteId]) parEntite[r.entiteId] = { m:0, s:0, n:0 };
    parEntite[r.entiteId].m += r.membres;
    parEntite[r.entiteId].s += r.sympathisants;
    parEntite[r.entiteId].n += r.nouveaux;
  });
  let html = '<h3>Rapport hebdomadaire automatique</h3>';
  html += '<table><thead><tr><th>Entité</th><th>Membres</th><th>Sympathisants</th><th>Nouveaux</th><th>Total</th></tr></thead><tbody>';
  for (const [id, v] of Object.entries(parEntite)) {
    const e = entites.find(x => x.id === +id);
    html += `<tr><td>${esc(e?e.nom:'?')}</td><td>${v.m}</td><td>${v.s}</td><td>${v.n}</td><td><strong>${v.m+v.s+v.n}</strong></td></tr>`;
  }
  html += '</tbody></table>';
  html += barreExportHTML('rapportHebdoInner', 'Rapport Hebdomadaire');
  document.getElementById('rapportHebdo').innerHTML = `<div id="rapportHebdoInner">${html}</div>`;
}

/* ============================================================
   FRÉQUENCE MENSUELLE
   ============================================================ */
pages.freqMensuelle = async () => {
  const entites = await dbGetAll('entites');
  const list = await dbGetAll('freqMensuelle');
  document.getElementById('main').innerHTML = `
    <div class="card">
      <h3>📊 Fréquence Mensuelle</h3>
      <button class="btn btn-primary" onclick="formFM()">➕ Nouvelle fiche mensuelle</button>
      <button class="btn btn-outline" onclick="rapportFMGlo()">📄 Rapport global</button>
    </div>
    <div class="card">
      <h3>Fiches enregistrées (${list.length})</h3>
      <input id="searchFM" placeholder="🔎 Rechercher une entité..." oninput="filterFM()" style="margin-bottom:10px">
      <table id="tblFM">
        <thead><tr><th>Mois/Année</th><th>Entité</th><th>Responsable</th><th>Actions</th></tr></thead>
        <tbody>${list.slice().reverse().map(f => {
          const e = entites.find(x=>x.id===f.entiteId);
          return `<tr data-search="${esc((e?e.nom:'')+' '+f.mois+' '+f.annee)}">
            <td>${esc(f.mois)} ${esc(f.annee)}</td><td>${esc(e?e.nom:'?')}</td><td>${esc(f.responsable||'-')}</td>
            <td>
              <button class="btn btn-primary" style="padding:4px 8px" onclick="viewFM(${f.id})">👁</button>
              <button class="btn btn-danger" style="padding:4px 8px" onclick="delFM(${f.id})">🗑</button>
            </td></tr>`;
        }).join('') || '<tr><td colspan="4">Aucune fiche</td></tr>'}</tbody>
      </table>
    </div>
  `;
};
function filterFM() {
  const q = document.getElementById('searchFM').value.toLowerCase();
  document.querySelectorAll('#tblFM tbody tr').forEach(tr => {
    tr.style.display = (tr.dataset.search || '').toLowerCase().includes(q) ? '' : 'none';
  });
}

async function formFM() {
  const entites = await dbGetAll('entites');
  const annee = new Date().getFullYear();
  openModal(`
    <h3>Nouvelle fiche mensuelle</h3>
    <label>Entité</label>
    <select id="fmEntite">${entites.map(e=>`<option value="${e.id}">${esc(e.type)} - ${esc(e.nom)}</option>`).join('')}</select>
    <label>Mois</label><select id="fmMois">${MOIS.map(m=>`<option>${m}</option>`).join('')}</select>
    <label>Année</label><input type="number" id="fmAnnee" value="${annee}">
    <label>Responsable</label><input id="fmResp">
    <hr style="margin:15px 0"><h4>Présentation</h4>
    <label>Nombre d'encadreurs</label><input type="number" id="fmEnc" value="0">
    <label>Jour réunion d'évaluation</label>
    <select id="fmJourEval">${JOURS_SEMAINE.map(j=>`<option>${j}</option>`).join('')}</select>
    <label>Membres actifs</label><input type="number" id="fmMembActifs" value="0">
    <label>Sympathisants</label><input type="number" id="fmSymp" value="0">
    <hr style="margin:15px 0"><h4>Fréquentation culte mensuel</h4>
    <label>Membres</label><input type="number" id="fmCulteM" value="0">
    <label>Sympathisants</label><input type="number" id="fmCulteS" value="0">
    <label>Nouveaux venus</label><input type="number" id="fmCulteN" value="0">
    <hr style="margin:15px 0">
    <label>Foyers de lumière accompagnés</label><input type="number" id="fmFoyers" value="0">
    <label>Membres avec Goshintai</label><input type="number" id="fmGosh" value="0">
    <label>Membres sans Goshintai</label><input type="number" id="fmSansGosh" value="0">
    <label>Foyers de sympathisants</label><input type="number" id="fmFamSymp" value="0">
    <label>Fleurs distribuées</label><input type="number" id="fmFleurs" value="0">
    <label>Potagers confectionnés</label><input type="number" id="fmPotagers" value="0">
    <label>Total potagers</label><input type="number" id="fmTotPot" value="0">
    <label>Maisons ouvertes avec distribution fleurs</label><input type="number" id="fmMaisonsOuv" value="0">
    <label>Témoignages recueillis</label><input type="number" id="fmTemoig" value="0">
    <hr style="margin:15px 0"><h4>Unités comptent</h4>
    <label>Maisons des membres</label><input type="number" id="fmMaiM" value="0">
    <label>Maisons des sympathisants</label><input type="number" id="fmMaiS" value="0">
    <h4>Assistance religieuse</h4>
    <label>Maisons membres assistées</label><input type="number" id="fmAssM" value="0">
    <label>Maisons sympathisants assistées</label><input type="number" id="fmAssS" value="0">
    <label>Concessions agricoles église</label><input type="number" id="fmConcEglise" value="0">
    <label>Terrains de l'église</label><input type="number" id="fmTerrEglise" value="0">
    <label>Concessions agricoles suivies</label><input type="number" id="fmConcSuivi" value="0">
    <label>Font l'agriculture naturelle</label><input type="number" id="fmAgriNat" value="0">
    <label>Produits disponibles</label><textarea id="fmProduits"></textarea>
    <label>Campagnes de nettoyage</label><input type="number" id="fmNettoyage" value="0">
    <label>Fleurs distribuées</label><input type="number" id="fmFleursDist" value="0">
    <hr style="margin:15px 0"><h4>Formation</h4>
    <label>Cours d'enseignements réalisés</label><input type="number" id="fmCoursEns" value="0">
    <label>Thèmes exploités</label><textarea id="fmThemes"></textarea>
    <label>Cours de fleurs dans l'unité</label><input type="number" id="fmCoursFleurs" value="0">
    <label>Cours fleurs maisons messianiques</label><input type="number" id="fmFleursMess" value="0">
    <label>Cours fleurs maisons non messianiques</label><input type="number" id="fmFleursNonMess" value="0">
    <hr style="margin:15px 0">
    <label>Grâces reçues</label><textarea id="fmGraces"></textarea>
    <label>Points à améliorer</label><textarea id="fmPoints"></textarea>
    <label>Solutions proposées</label><textarea id="fmSolutions"></textarea>
    <label>Objectifs mois prochain</label><textarea id="fmObjectifs"></textarea>
    <label>Actions à mener</label><textarea id="fmActions"></textarea>
    <br><br>
    <button class="btn btn-success" onclick="saveFM()">💾 Enregistrer</button>
  `);
}

async function saveFM() {
  const v = id => document.getElementById(id).value;
  const n = id => +document.getElementById(id).value || 0;
  const data = {
    entiteId: +v('fmEntite'), mois: v('fmMois'), annee: v('fmAnnee'), responsable: v('fmResp'),
    encadreurs: n('fmEnc'), jourEval: v('fmJourEval'),
    membActifs: n('fmMembActifs'), sympathisants: n('fmSymp'),
    culteM: n('fmCulteM'), culteS: n('fmCulteS'), culteN: n('fmCulteN'),
    foyers: n('fmFoyers'), goshintai: n('fmGosh'), sansGoshintai: n('fmSansGosh'),
    famSymp: n('fmFamSymp'), fleurs: n('fmFleurs'), potagers: n('fmPotagers'),
    totPotagers: n('fmTotPot'), maisonsOuv: n('fmMaisonsOuv'), temoignages: n('fmTemoig'),
    maiM: n('fmMaiM'), maiS: n('fmMaiS'), assM: n('fmAssM'), assS: n('fmAssS'),
    concEglise: n('fmConcEglise'), terrEglise: n('fmTerrEglise'),
    concSuivi: n('fmConcSuivi'), agriNat: n('fmAgriNat'),
    produits: v('fmProduits'), nettoyage: n('fmNettoyage'), fleursDist: n('fmFleursDist'),
    coursEns: n('fmCoursEns'), themes: v('fmThemes'), coursFleurs: n('fmCoursFleurs'),
    fleursMess: n('fmFleursMess'), fleursNonMess: n('fmFleursNonMess'),
    graces: v('fmGraces'), points: v('fmPoints'), solutions: v('fmSolutions'),
    objectifs: v('fmObjectifs'), actions: v('fmActions'),
    user: currentUser.nom, createdAt: Date.now()
  };
  const fj = await dbGetAll('freqJournaliere');
  const moisNum = MOIS.indexOf(data.mois);
  const filtres = fj.filter(r => {
    const d = new Date(r.date);
    return d.getFullYear() == data.annee && d.getMonth() === moisNum && r.entiteId === data.entiteId;
  });
  data.freqM = filtres.reduce((s,r)=>s+r.membres,0);
  data.freqS = filtres.reduce((s,r)=>s+r.sympathisants,0);
  data.freqN = filtres.reduce((s,r)=>s+r.nouveaux,0);
  await dbAdd('freqMensuelle', data);
  closeModal(); pages.freqMensuelle();
}

async function viewFM(id) {
  const f = await dbGet(id, 'freqMensuelle');
  const entites = await dbGetAll('entites');
  const e = entites.find(x=>x.id===f.entiteId);
  openModal(`
    <div id="zoneViewFM">
      <h3>${esc(f.mois)} ${esc(f.annee)} - ${esc(e?e.nom:'?')}</h3>
      <p><strong>Responsable :</strong> ${esc(f.responsable)}</p>
      <p><strong>Encadreurs :</strong> ${f.encadreurs} | <strong>Jour éval :</strong> ${esc(f.jourEval)}</p>
      <p><strong>Membres actifs :</strong> ${f.membActifs} | <strong>Sympathisants :</strong> ${f.sympathisants}</p>
      <h4>Fréquentation culte mensuel</h4>
      <p>Membres: ${f.culteM} | Symp: ${f.culteS} | Nouveaux: ${f.culteN}</p>
      <h4>Fréquence mensuelle auto (depuis journalière)</h4>
      <p>Membres: <b>${f.freqM}</b> | Symp: <b>${f.freqS}</b> | Nouveaux: <b>${f.freqN}</b></p>
      <h4>Détails</h4>
      <p>Foyers accompagnés: ${f.foyers} | Avec Goshintai: ${f.goshintai} | Sans: ${f.sansGoshintai}</p>
      <p>Familles sympathisants: ${f.famSymp} | Fleurs: ${f.fleurs} | Potagers: ${f.potagers} | Total potagers: ${f.totPotagers}</p>
      <p>Maisons ouvertes fleurs: ${f.maisonsOuv} | Témoignages: ${f.temoignages}</p>
      <h4>Assistance religieuse</h4>
      <p>Maisons membres: ${f.maiM} | Maisons symp: ${f.maiS}</p>
      <p>Assistées - Membres: ${f.assM} | Symp: ${f.assS}</p>
      <p>Concessions église: ${f.concEglise} | Terrains: ${f.terrEglise} | Suivies: ${f.concSuivi} | Agri naturelle: ${f.agriNat}</p>
      <p>Produits: ${esc(f.produits)}</p>
      <p>Nettoyage: ${f.nettoyage} | Fleurs distribuées: ${f.fleursDist}</p>
      <h4>Formation</h4>
      <p>Cours enseignements: ${f.coursEns} | Cours fleurs: ${f.coursFleurs}</p>
      <p>Cours fleurs maisons messianiques: ${f.fleursMess} | non messianiques: ${f.fleursNonMess}</p>
      <h4>Thèmes exploités</h4><p>${esc(f.themes)}</p>
      <h4>Grâces reçues</h4><p>${esc(f.graces)}</p>
      <h4>Points à améliorer</h4><p>${esc(f.points)}</p>
      <h4>Solutions proposées</h4><p>${esc(f.solutions)}</p>
      <h4>Objectifs</h4><p>${esc(f.objectifs)}</p>
      <h4>Actions à mener</h4><p>${esc(f.actions)}</p>
      ${barreExportHTML('zoneViewFM', 'Fiche ' + (e?e.nom:'') + ' ' + f.mois + ' ' + f.annee)}
    </div>
  `);
}

async function delFM(id) { if (!confirm('Supprimer ?')) return; await dbDelete('freqMensuelle', id); pages.freqMensuelle(); }

async function rapportFMGlo() {
  const list = await dbGetAll('freqMensuelle');
  const entites = await dbGetAll('entites');
  const tot = { m:0,s:0,n:0 };
  list.forEach(f=>{
    tot.m += f.freqM||0; tot.s += f.freqS||0; tot.n += f.freqN||0;
  });
  openModal(`
    <div id="zoneRapportFM">
      <h3>📊 Rapport global mensuel</h3>
      <div class="grid">
        <div class="stat-card"><div class="num">${tot.m}</div><div class="label">Membres</div></div>
        <div class="stat-card"><div class="num">${tot.s}</div><div class="label">Sympathisants</div></div>
        <div class="stat-card"><div class="num">${tot.n}</div><div class="label">Nouveaux</div></div>
      </div>
      <h4 style="margin-top:15px">Thèmes exploités</h4>
      <ul>${list.map(f=>`<li><b>${esc(entites.find(x=>x.id===f.entiteId)?.nom||'')}</b> : ${esc(f.themes||'')}</li>`).join('')}</ul>
      <h4>Grâces reçues</h4>
      <ul>${list.map(f=>`<li><b>${esc(entites.find(x=>x.id===f.entiteId)?.nom||'')}</b> : ${esc(f.graces||'')}</li>`).join('')}</ul>
      <h4>Points à améliorer</h4>
      <ul>${list.map(f=>`<li><b>${esc(entites.find(x=>x.id===f.entiteId)?.nom||'')}</b> : ${esc(f.points||'')}</li>`).join('')}</ul>
      <h4>Solutions proposées</h4>
      <ul>${list.map(f=>`<li><b>${esc(entites.find(x=>x.id===f.entiteId)?.nom||'')}</b> : ${esc(f.solutions||'')}</li>`).join('')}</ul>
      <h4>Objectifs</h4>
      <ul>${list.map(f=>`<li><b>${esc(entites.find(x=>x.id===f.entiteId)?.nom||'')}</b> : ${esc(f.objectifs||'')}</li>`).join('')}</ul>
      <h4>Actions à mener</h4>
      <ul>${list.map(f=>`<li><b>${esc(entites.find(x=>x.id===f.entiteId)?.nom||'')}</b> : ${esc(f.actions||'')}</li>`).join('')}</ul>
      ${barreExportHTML('zoneRapportFM', 'Rapport Global Mensuel')}
    </div>
  `);
}

/* ============================================================
   UTILISATEURS
   ============================================================ */
pages.utilisateurs = async () => {
  if (currentUser.role !== 'admin') return alert('Accès refusé');
  const users = await dbGetAll('users');
  document.getElementById('main').innerHTML = `
    <div class="card">
      <h3>👥 Gestion utilisateurs</h3>
      <div class="grid">
        <div><label>Nom complet</label><input id="uNom"></div>
        <div><label>Utilisateur</label><input id="uUser"></div>
        <div><label>Mot de passe</label><input id="uPass" type="text"></div>
        <div><label>Rôle</label><select id="uRole"><option value="user">Utilisateur</option><option value="admin">Administrateur</option></select></div>
      </div>
      <button class="btn btn-primary" onclick="saveUser()">➕ Ajouter</button>
    </div>
    <div class="card">
      <h3>Liste</h3>
      <table>
        <thead><tr><th>Nom</th><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Action</th></tr></thead>
        <tbody>${users.map(u=>`<tr>
          <td>${esc(u.nom)}</td><td>${esc(u.username)}</td><td>${u.role}</td>
          <td>${u.actif?'<span class="badge badge-success">Actif</span>':'<span class="badge badge-secondary">Inactif</span>'}</td>
          <td>
            <button class="btn btn-warning" style="padding:4px 8px" onclick="toggleUser(${u.id})">${u.actif?'Désactiver':'Activer'}</button>
            <button class="btn btn-danger" style="padding:4px 8px" onclick="delUser(${u.id})">🗑</button>
          </td></tr>`).join('')}</tbody>
      </table>
    </div>
  `;
};
async function saveUser() {
  const nom = document.getElementById('uNom').value.trim();
  const username = document.getElementById('uUser').value.trim();
  const password = document.getElementById('uPass').value;
  const role = document.getElementById('uRole').value;
  if (!nom || !username || !password) return alert('Tous les champs requis');
  await dbAdd('users', { nom, username, password, role, actif: true });
  pages.utilisateurs();
}
async function toggleUser(id) { const u = await dbGet(id, 'users'); u.actif = !u.actif; await dbPut('users', u); pages.utilisateurs(); }
async function delUser(id) { if (!confirm('Supprimer ?')) return; await dbDelete('users', id); pages.utilisateurs(); }

/* ============================================================
   RAPPORTS
   ============================================================ */
pages.rapports = async () => {
  document.getElementById('main').innerHTML = `
    <div class="card">
      <h3>📄 Rapports & Exports</h3>
      <button class="btn btn-primary" onclick="rapportFMGlo()">📊 Rapport mensuel global</button>
      <button class="btn btn-success" onclick="exportJSON()">💾 Exporter JSON</button>
    </div>
    <div class="card">
      <h3>📧 Destinataires par défaut</h3>
      <label>Email admin</label>
      <input id="adminEmailQuick" value="${esc(getConfig().adminEmail||'')}" placeholder="exemple@email.com">
      <label>WhatsApp (sans +, ex: 243812345678)</label>
      <input id="whatsappQuick" value="${esc(getConfig().whatsapp||'')}" placeholder="243812345678">
      <button class="btn btn-primary" onclick="saveQuickContacts()">💾 Enregistrer</button>
    </div>
  `;
};
function saveQuickContacts() {
  const cfg = getConfig();
  cfg.adminEmail = document.getElementById('adminEmailQuick').value.trim();
  cfg.whatsapp = document.getElementById('whatsappQuick').value.trim();
  setConfig(cfg);
  alert('✅ Contacts enregistrés');
}
async function exportJSON() {
  const data = {
    users: await dbGetAll('users'), entites: await dbGetAll('entites'),
    freqJournaliere: await dbGetAll('freqJournaliere'),
    freqMensuelle: await dbGetAll('freqMensuelle'),
    exportDate: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  saveAs(blob, `EMM-FREQUENCE_export_${todayISO()}.json`);
}

/* ============================================================
   CONFIGURATION
   ============================================================ */
pages.config = () => {
  if (currentUser.role !== 'admin') return alert('Accès administrateur requis');
  const cfg = getConfig();
  document.getElementById('main').innerHTML = `
    <div class="card">
      <h3>⚙️ Configuration EmailJS</h3>
      <p style="font-size:13px;color:#666;margin-bottom:12px">
        Crée un compte gratuit sur <a href="https://www.emailjs.com" target="_blank">emailjs.com</a> et renseigne ces 3 clés.
      </p>
      <label>Public Key</label><input id="cfgPubKey" value="${esc(cfg.emailjsPublicKey||'')}">
      <label>Service ID</label><input id="cfgServiceId" value="${esc(cfg.emailjsServiceId||'')}">
      <label>Template ID</label><input id="cfgTemplateId" value="${esc(cfg.emailjsTemplateId||'')}">
      <button class="btn btn-primary" onclick="saveEmailConfig()">💾 Enregistrer</button>
    </div>
    <div class="card">
      <h3>📧 Email par défaut</h3>
      <input id="cfgAdminEmail" value="${esc(cfg.adminEmail||'')}" placeholder="exemple@email.com">
      <button class="btn btn-primary" onclick="saveAdminEmail()">💾 Enregistrer</button>
    </div>
    <div class="card">
      <h3>💬 WhatsApp par défaut</h3>
      <input id="cfgWhatsApp" value="${esc(cfg.whatsapp||'')}" placeholder="243812345678">
      <button class="btn btn-primary" onclick="saveWhatsApp()">💾 Enregistrer</button>
    </div>
  `;
};
function saveEmailConfig() {
  const cfg = getConfig();
  cfg.emailjsPublicKey = document.getElementById('cfgPubKey').value.trim();
  cfg.emailjsServiceId = document.getElementById('cfgServiceId').value.trim();
  cfg.emailjsTemplateId = document.getElementById('cfgTemplateId').value.trim();
  setConfig(cfg); initEmailJS(); alert('✅ Config EmailJS enregistrée');
}
function saveAdminEmail() { const cfg = getConfig(); cfg.adminEmail = document.getElementById('cfgAdminEmail').value.trim(); setConfig(cfg); alert('✅ Email enregistré'); }
function saveWhatsApp() { const cfg = getConfig(); cfg.whatsapp = document.getElementById('cfgWhatsApp').value.trim(); setConfig(cfg); alert('✅ WhatsApp enregistré'); }

/* ============================================================
   EXPORT PDF / WORD / EMAIL / WHATSAPP
   ============================================================ */
function showLoading(msg = 'Génération en cours...') {
  const ov = document.createElement('div');
  ov.id = 'loadingOverlay'; ov.className = 'loading-overlay';
  ov.innerHTML = `<div class="loader"></div><div>${esc(msg)}</div>`;
  document.body.appendChild(ov);
}
function hideLoading() { const ov = document.getElementById('loadingOverlay'); if (ov) ov.remove(); }

function barreExportHTML(idRapport, titre) {
  return `
    <div class="export-bar">
      <button class="btn-share btn-email" onclick="actionEmail('${idRapport}','${esc(titre)}')">📧 E-mail</button>
      <button class="btn-share btn-whatsapp" onclick="actionWhatsApp('${idRapport}','${esc(titre)}')">💬 WhatsApp</button>
      <button class="btn-share btn-pdf" onclick="actionPDF('${idRapport}','${esc(titre)}')">📄 PDF</button>
      <button class="btn-share btn-word" onclick="actionWord('${idRapport}','${esc(titre)}')">📝 Word</button>
      <button class="btn-share btn-print" onclick="actionPrint('${idRapport}')">🖨️ Imprimer</button>
    </div>
  `;
}

function getRapportHTML(id) {
  const el = document.getElementById(id);
  if (el) return el.innerHTML;
  return '';
}
function actionPDF(id, titre) {
  const html = getRapportHTML(id);
  if (!html) return alert('Rapport introuvable');
  exporterEnPDF(html, titre.replace(/\s+/g, '_'));
}
function actionWord(id, titre) {
  const html = getRapportHTML(id);
  if (!html) return alert('Rapport introuvable');
  exporterEnWord(html, titre.replace(/\s+/g, '_'));
}
function actionEmail(id, titre) {
  const html = getRapportHTML(id);
  if (!html) return alert('Rapport introuvable');
  envoyerEmail(`Rapport EMM-FREQUENCE - ${titre}`, html, titre.replace(/\s+/g, '_'));
}
function actionWhatsApp(id, titre) {
  const el = document.getElementById(id);
  const texte = el ? el.innerText.substring(0, 3000) : '';
  partagerWhatsApp(`EMM-FREQUENCE - ${titre}`, texte);
}
function actionPrint(id) {
  const el = document.getElementById(id);
  if (!el) return alert('Rapport introuvable');
  const w = window.open('', '', 'width=900,height=700');
  w.document.write(`
    <html><head><title>Impression</title><style>
    body{font-family:Arial;padding:20px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #999;padding:6px;font-size:12px}
    th{background:#1a4d8f;color:white}
    h1,h2,h3{color:#1a4d8f}
    </style></head><body>
    <div style="display:flex;align-items:center;gap:15px;border-bottom:3px solid #1a4d8f;padding-bottom:12px;margin-bottom:18px;">
      <img src="logos/logo-entete.png" style="height:60px" onerror="this.src='logos/logo.png'">
      <div><h1 style="color:#1a4d8f;margin:0">EMM-FREQUENCE</h1></div>
    </div>
    ${el.innerHTML}
    <script>setTimeout(()=>{window.print();},400)<\/script></body></html>
  `);
  w.document.close();
}

async function exporterEnPDF(htmlContent, nomFichier = 'rapport') {
  showLoading('Création du PDF...');
  try {
    const { jsPDF } = window.jspdf;
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:white;padding:30px;font-family:Arial,sans-serif;color:#222;';
    const dateStr = new Date().toLocaleDateString('fr-FR');
    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:15px;border-bottom:3px solid #1a4d8f;padding-bottom:12px;margin-bottom:18px;">
        <img src="logos/logo-entete.png" onerror="this.src='logos/logo.png'" style="height:60px">
        <div><h1 style="color:#1a4d8f;font-size:20px;margin:0">EMM-FREQUENCE</h1>
        <div style="font-size:12px;color:#555">Rapport généré le ${dateStr}</div></div>
      </div>
      ${htmlContent}
    `;
    document.body.appendChild(container);
    await new Promise(r => setTimeout(r, 500));
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: 800 });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW - 10;
    const imgH = (canvas.height * imgW) / canvas.width;
    let y = 5;
    let reste = imgH;
    pdf.addImage(imgData, 'JPEG', 5, y, imgW, imgH);
    reste -= (pageH - 10);
    while (reste > 0) {
      pdf.addPage();
      y = -1 * (imgH - reste) + 5;
      pdf.addImage(imgData, 'JPEG', 5, y, imgW, imgH);
      reste -= (pageH - 10);
    }
    pdf.save(`EMM-FREQUENCE_${nomFichier}_${todayISO()}.pdf`);
    document.body.removeChild(container);
    hideLoading();
  } catch (err) {
    hideLoading();
    alert('Erreur PDF : ' + err.message);
  }
}

async function exporterEnWord(htmlContent, nomFichier = 'rapport') {
  showLoading('Création du document Word...');
  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } = window.docx;
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const div = document.createElement('div');
    div.innerHTML = htmlContent;
    const enfants = [];
    enfants.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'EMM-FREQUENCE', bold: true, size: 32, color: '1a4d8f' })], spacing: { after: 100 } }));
    enfants.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Rapport généré le ${dateStr}`, italics: true, size: 18, color: '666666' })], spacing: { after: 300 } }));

    div.querySelectorAll('h1, h2, h3, h4, p, ul, ol, table, div.stat-card').forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (tag.match(/^h[1-4]$/)) {
        const size = tag === 'h1' ? 28 : tag === 'h2' ? 24 : tag === 'h3' ? 22 : 20;
        enfants.push(new Paragraph({
          heading: tag === 'h1' ? HeadingLevel.HEADING_1 : tag === 'h2' ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          children: [new TextRun({ text: el.textContent, bold: true, size, color: '1a4d8f' })],
          spacing: { before: 200, after: 100 }
        }));
      } else if (tag === 'p') {
        enfants.push(new Paragraph({ children: [new TextRun({ text: el.textContent, size: 22 })], spacing: { after: 100 } }));
      } else if (tag === 'ul' || tag === 'ol') {
        el.querySelectorAll('li').forEach(li => {
          enfants.push(new Paragraph({ children: [new TextRun({ text: '• ' + li.textContent, size: 22 })], spacing: { after: 60 } }));
        });
      } else if (tag === 'table') {
        const rows = [];
        el.querySelectorAll('tr').forEach(tr => {
          const cells = [];
          tr.querySelectorAll('th, td').forEach(td => {
            cells.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: td.textContent, size: 20, bold: td.tagName === 'TH' })] })] }));
          });
          rows.push(new TableRow({ children: cells }));
        });
        if (rows.length) {
          enfants.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          enfants.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
        }
      } else if (tag === 'div' && el.classList.contains('stat-card')) {
        const num = el.querySelector('.num')?.textContent || '';
        const label = el.querySelector('.label')?.textContent || '';
        enfants.push(new Paragraph({ children: [new TextRun({ text: `${label} : `, bold: true, size: 22 }), new TextRun({ text: num, size: 22, color: '1a4d8f' })] }));
      }
    });

    const doc = new Document({ creator: 'EMM-FREQUENCE', title: nomFichier, sections: [{ properties: {}, children: enfants }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `EMM-FREQUENCE_${nomFichier}_${todayISO()}.docx`);
    hideLoading();
  } catch (err) {
    hideLoading();
    console.error(err);
    alert('Erreur Word : ' + err.message + '\nFallback .doc utilisé.');
    exporterEnDocHTML(htmlContent, nomFichier);
  }
}

function exporterEnDocHTML(htmlContent, nomFichier) {
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><style>
      body{font-family:Arial;font-size:11pt}
      h1,h2,h3{color:#1a4d8f}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #999;padding:5px}
      th{background:#1a4d8f;color:white}
    </style></head><body>
      <div style="display:flex;align-items:center;gap:15px;border-bottom:3px solid #1a4d8f;padding-bottom:12px">
        <img src="logos/logo-entete.png" style="height:60px" onerror="this.src='logos/logo.png'">
        <div><h1 style="color:#1a4d8f;margin:0">EMM-FREQUENCE</h1>
        <div style="font-size:10pt;color:#666">Rapport généré le ${dateStr}</div></div>
      </div>
      ${htmlContent}
    </body></html>
  `;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  saveAs(blob, `EMM-FREQUENCE_${nomFichier}_${todayISO()}.doc`);
}

function partagerWhatsApp(titre, texteResume) {
  const cfg = getConfig();
  const num = cfg.whatsapp || '';
  const msg = encodeURIComponent(`*${titre}*\n\n${texteResume}\n\n— EMM-FREQUENCE`);
  const url = num ? `https://wa.me/${num}?text=${msg}` : `https://wa.me/?text=${msg}`;
  window.open(url, '_blank');
}

async function envoyerEmail(titre, htmlContent, nomFichier = 'rapport') {
  const cfg = getConfig();
  if (!cfg.emailjsPublicKey || !cfg.emailjsServiceId || !cfg.emailjsTemplateId) {
    const email = cfg.adminEmail || prompt('Email destinataire :', '');
    if (!email) return;
    const txt = htmlContent.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n');
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(titre)}&body=${encodeURIComponent(txt.substring(0, 1800))}`;
    return;
  }
  showLoading('Envoi de l\'email...');
  try {
    initEmailJS();
    const email = cfg.adminEmail || prompt('Email destinataire :', '');
    if (!email) { hideLoading(); return; }
    const pdfBase64 = await genererPDFBase64(htmlContent);
    await emailjs.send(cfg.emailjsServiceId, cfg.emailjsTemplateId, {
      to_email: email, subject: titre,
      message: `Rapport EMM-FREQUENCE. Voir PDF en pièce jointe.`,
      attachment: pdfBase64,
      filename: `EMM-FREQUENCE_${nomFichier}_${todayISO()}.pdf`
    });
    hideLoading();
    alert('✅ Email envoyé !');
  } catch (err) {
    hideLoading();
    console.error(err);
    alert('Erreur envoi : ' + (err.text || err.message || 'inconnue') + '\nFallback mailto...');
    const email = cfg.adminEmail || prompt('Email destinataire :', '');
    if (email) {
      const txt = htmlContent.replace(/<[^>]+>/g, '').substring(0, 1800);
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(titre)}&body=${encodeURIComponent(txt)}`;
    }
  }
}

async function genererPDFBase64(htmlContent) {
  const { jsPDF } = window.jspdf;
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:white;padding:30px;font-family:Arial;color:#222;';
  const dateStr = new Date().toLocaleDateString('fr-FR');
  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:15px;border-bottom:3px solid #1a4d8f;padding-bottom:12px;margin-bottom:18px;">
      <img src="logos/logo-entete.png" onerror="this.src='logos/logo.png'" style="height:60px">
      <div><h1 style="color:#1a4d8f;font-size:20px;margin:0">EMM-FREQUENCE</h1>
      <div style="font-size:12px;color:#555">Rapport du ${dateStr}</div></div>
    </div>
    ${htmlContent}
  `;
  document.body.appendChild(container);
  await new Promise(r => setTimeout(r, 400));
  const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#fff' });
  const imgData = canvas.toDataURL('image/jpeg', 0.9);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW - 10;
  const imgH = (canvas.height * imgW) / canvas.width;
  let reste = imgH, y = 5;
  pdf.addImage(imgData, 'JPEG', 5, y, imgW, imgH);
  reste -= (pageH - 10);
  while (reste > 0) {
    pdf.addPage();
    y = -1 * (imgH - reste) + 5;
    pdf.addImage(imgData, 'JPEG', 5, y, imgW, imgH);
    reste -= (pageH - 10);
  }
  document.body.removeChild(container);
  return pdf.output('datauristring').split(',')[1];
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}