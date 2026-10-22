// ============================================
// EMM RAPPORTS — LOGIQUE PRINCIPALE v3
// ============================================

var currentUser = null;
var pdfRapportActuel = null;

function showSplash() {
  showScreen('splashScreen');
  setTimeout(function() {
    var sess = DB.get('session');
    if (sess) { currentUser = sess; appliquerSession(); showScreen('mainScreen'); }
    else { showScreen('loginScreen'); var inp = document.getElementById('loginUsername'); if (inp) inp.focus(); }
  }, 2500);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); s.style.display = 'none'; });
  var el = document.getElementById(id);
  el.classList.add('active');
  el.style.display = (id === 'splashScreen' || id === 'loginScreen') ? 'flex' : 'block';
  window.scrollTo(0, 0);
}

function toggleMenu() {
  document.getElementById('sideMenu').classList.toggle('open');
  document.getElementById('menuOverlay').classList.toggle('active');
}

function switchModule(module) {
  document.querySelectorAll('.main-tab-content').forEach(function(c) { c.classList.remove('active'); });
  document.getElementById('module-' + module).classList.add('active');
  toggleMenu();
  if (module === 'diffusion') { afficherDashboardDiffusion(); switchTabDiffusion('accueil'); }
  if (module === 'numerique') { afficherDashboardNum(); switchTabNumerique('accueil'); }
}

function switchTabDiffusion(tab) {
  document.querySelectorAll('#module-diffusion .sub-tab').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById('diff-' + tab).classList.add('active');
  toggleMenu();
}

function switchTabNumerique(tab) {
  document.querySelectorAll('#module-numerique .sub-tab').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById('num-' + tab).classList.add('active');
  toggleMenu();
}

function login() {
  var nom = document.getElementById('loginUsername').value.trim().toLowerCase();
  var pass = document.getElementById('loginPassword').value.trim();
  var errBox = document.getElementById('loginError');
  if (!nom || !pass) { errBox.textContent = '❌ Entrez le nom et le mot de passe'; return; }
  var users = DB.get('users', []);
  var user = users.find(function(u) { return u.nom.toLowerCase() === nom && u.pass === pass; });
  if (!user) { errBox.textContent = '❌ Nom ou mot de passe incorrect'; return; }
  currentUser = user;
  DB.set('session', user);
  errBox.textContent = '';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  appliquerSession();
  showScreen('mainScreen');
}

function logout() {
  if (!confirm('Voulez-vous vraiment vous déconnecter ?')) return;
  currentUser = null;
  DB.set('session', null);
  showScreen('loginScreen');
  setTimeout(function() { var inp = document.getElementById('loginUsername'); if (inp) inp.focus(); }, 200);
}

function appliquerSession() {
  if (!currentUser) return;
  var label = document.getElementById('userRoleLabel');
  if (label) label.textContent = (currentUser.role === 'admin' ? '👑 Admin' : '👤 ' + currentUser.nom);
  var wb = document.getElementById('welcomeBox');
  if (wb) wb.innerHTML = '<p>Connecté : <strong>' + echapper(currentUser.nom) + '</strong></p>';
  var wbn = document.getElementById('welcomeBoxNum');
  if (wbn) wbn.innerHTML = '<p>Connecté : <strong>' + echapper(currentUser.nom) + '</strong></p>';
  refreshAll();
  afficherDashboardDiffusion();
  afficherDashboardNum();
  afficherAnnonces();
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function fmtDate(d) { if (!d) return ''; return new Date(d).toLocaleDateString('fr-FR'); }
function echapper(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function isAdmin() { return currentUser && currentUser.role === 'admin'; }
function filtrerListe(list, filtre) {
  if (filtre === 'archive') return list.filter(function(x) { return x.archived === true; });
  if (filtre === 'tous') return list;
  return list.filter(function(x) { return !x.archived; });
}

// ============================================================
// MODULE 1 : RAPPORT DIFFUSION
// ============================================================

function ajouterEntite() {
  var type = document.getElementById('jTypeEntite').value;
  var nom = document.getElementById('jNomEntite').value.trim().toUpperCase();
  var resp = document.getElementById('jResponsable').value.trim();
  if (!nom || !resp) return alert('Remplissez tous les champs');
  var entites = DB.get('entites', []);
  if (entites.find(function(e) { return e.nom === nom && !e.archived; })) return alert('Cette entité existe déjà');
  entites.push({ id: uid(), type: type, nom: nom, responsable: resp, archived: false });
  DB.set('entites', entites); reinitialiserFormEntite(); refreshAll(); alert('✅ Entité ajoutée');
}
function reinitialiserFormEntite() {
  document.getElementById('jNomEntite').value = '';
  document.getElementById('jResponsable').value = '';
  document.getElementById('jTypeEntite').selectedIndex = 0;
}
function rafraichirEntites() {
  var entites = DB.get('entites', []).filter(function(e) { return !e.archived; });
  ['jEntiteSelect', 'mEntite'].forEach(function(id) {
    var sel = document.getElementById(id); if (!sel) return;
    var val = sel.value; var opts = '';
    entites.forEach(function(e) { opts += '<option value="' + e.id + '">' + e.type + ' - ' + e.nom + '</option>'; });
    sel.innerHTML = opts; if (val) sel.value = val;
  });
}
function getEntiteNom(id) {
  var e = DB.get('entites', []).find(function(x) { return x.id === id; });
  return e ? e.type + ' - ' + e.nom : 'Inconnu';
}
function afficherListeEntites() {
  var filtre = document.getElementById('filtreEntites') ? document.getElementById('filtreEntites').value : 'actif';
  var search = (document.getElementById('searchEntiteListe') ? document.getElementById('searchEntiteListe').value : '').toUpperCase();
  var entites = filtrerListe(DB.get('entites', []), filtre);
  if (search) entites = entites.filter(function(e) { return e.nom.indexOf(search) !== -1; });
  var box = document.getElementById('listeEntites'); if (!box) return;
  if (!entites.length) { box.innerHTML = '<p>Aucune entité.</p>'; return; }
  var html = '';
  entites.forEach(function(e) {
    html += '<div class="item-list" style="padding:12px' + (e.archived ? ';opacity:0.7;background:#f0f0f0' : '') + '">';
    html += '<div style="font-size:14px;color:#0a6e2c;font-weight:600;margin-bottom:4px">🏛️ ' + echapper(e.type) + ' - ' + echapper(e.nom) + (e.archived ? ' <span class="badge badge-archive">📦</span>' : '') + '</div>';
    html += '<div style="font-size:12px;color:#666;margin-bottom:8px">👤 ' + echapper(e.responsable) + '</div>';
    html += '<div class="no-print">';
    html += '<button class="btn-mini orange" onclick="modifierEntite(\'' + e.id + '\')">✏️</button> ';
    html += '<button class="btn-mini ' + (e.archived ? 'blue' : 'gray') + '" onclick="archiverEntite(\'' + e.id + '\')">' + (e.archived ? '↩️' : '📦') + '</button> ';
    html += '<button class="btn-mini danger" onclick="supprimerEntite(\'' + e.id + '\')">🗑️</button>';
    html += '</div></div>';
  });
  box.innerHTML = html;
}
function modifierEntite(id) {
  var list = DB.get('entites', []); var e = list.find(function(x) { return x.id === id; }); if (!e) return;
  var nom = prompt('Nom :', e.nom); if (nom === null) return;
  var resp = prompt('Responsable :', e.responsable); if (resp === null) return;
  e.nom = nom.trim().toUpperCase(); e.responsable = resp.trim();
  DB.set('entites', list); refreshAll(); alert('✅ Modifiée');
}
function archiverEntite(id) {
  var list = DB.get('entites', []); var e = list.find(function(x) { return x.id === id; }); if (!e) return;
  e.archived = !e.archived; DB.set('entites', list); refreshAll();
}
function supprimerEntite(id) {
  if (!confirm('Supprimer ?')) return;
  DB.set('entites', DB.get('entites', []).filter(function(x) { return x.id !== id; }));
  refreshAll();
}
function enregistrerParticipation() {
  var entiteId = document.getElementById('jEntiteSelect').value;
  var date = document.getElementById('jDate').value;
  if (!entiteId || !date) return alert('Choisissez une entité et une date');
  var list = DB.get('participations', []);
  list.push({ id: uid(), entiteId: entiteId, date: date, m: parseInt(document.getElementById('jMembres').value) || 0, s: parseInt(document.getElementById('jSympathisants').value) || 0, n: parseInt(document.getElementById('jNouveaux').value) || 0, archived: false });
  DB.set('participations', list); afficherJournaliere(); alert('✅ Enregistrée');
}
function reinitialiserFormParticipation() {
  document.getElementById('jDate').value = '';
  document.getElementById('jMembres').value = 0;
  document.getElementById('jSympathisants').value = 0;
  document.getElementById('jNouveaux').value = 0;
}
function afficherJournaliere() {
  var filtre = document.getElementById('filtreParticipations') ? document.getElementById('filtreParticipations').value : 'actif';
  var parts = filtrerListe(DB.get('participations', []), filtre);
  var box = document.getElementById('listeJournaliere'); if (!box) return;
  if (!parts.length) { box.innerHTML = '<p>Aucune donnée.</p>'; return; }
  var parEntite = {};
  parts.forEach(function(p) { if (!parEntite[p.entiteId]) parEntite[p.entiteId] = []; parEntite[p.entiteId].push(p); });
  var html = '';
  Object.keys(parEntite).forEach(function(eid) {
    var lignes = parEntite[eid].slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    html += '<div class="entity-block"><h4>📍 ' + echapper(getEntiteNom(eid)) + '</h4>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>M</th><th>S</th><th>NV</th><th class="no-print">Actions</th></tr></thead><tbody>';
    lignes.forEach(function(p) {
      html += '<tr><td>' + fmtDate(p.date) + '</td><td>' + p.m + '</td><td>' + p.s + '</td><td>' + p.n + '</td>';
      html += '<td class="no-print"><button class="btn-mini orange" onclick="modifierParticipation(\'' + p.id + '\')">✏️</button> <button class="btn-mini ' + (p.archived ? 'blue' : 'gray') + '" onclick="archiverParticipation(\'' + p.id + '\')">' + (p.archived ? '↩️' : '📦') + '</button> <button class="btn-mini danger" onclick="supprimerParticipation(\'' + p.id + '\')">🗑️</button></td></tr>';
    });
    html += '</tbody></table></div></div>';
  });
  box.innerHTML = html;
}
function modifierParticipation(id) {
  var list = DB.get('participations', []); var p = list.find(function(x) { return x.id === id; }); if (!p) return;
  var m = prompt('Membres :', p.m); if (m === null) return; p.m = parseInt(m) || 0;
  DB.set('participations', list); afficherJournaliere();
}
function archiverParticipation(id) {
  var list = DB.get('participations', []); var p = list.find(function(x) { return x.id === id; }); if (!p) return;
  p.archived = !p.archived; DB.set('participations', list); afficherJournaliere();
}
function supprimerParticipation(id) {
  if (!confirm('Supprimer ?')) return;
  DB.set('participations', DB.get('participations', []).filter(function(x) { return x.id !== id; })); afficherJournaliere();
}
function enregistrerFicheMensuelle() {
  var numericIds = ['mEncadreurs','mMembresActifs','mSympathisants','mFMembres','mFSympathisants','mFNouveaux','mFoyersLumiere','mAvecGoshintai','mSansGoshintai','mFoyersSymp','mFleurs','mPotagers','mTotalPotagers','mMaisonsOuvertes','mTemoignages','mCandGoshintai','mConfInit','mConfReinit','mConfShoku','mConfKannon','mConfMitamaya','mAssistMembres','mAssistSymp','mConcessions','mTerrains','mCampagnes','mCoursEns','mCoursFleurs'];
  var f = {
    id: uid(), entiteId: document.getElementById('mEntite').value, mois: document.getElementById('mMois').value, annee: document.getElementById('mAnnee').value,
    responsable: document.getElementById('mResponsable').value, themes: document.getElementById('mThemes').value, graces: document.getElementById('mGraces').value,
    points: document.getElementById('mPoints').value, solutions: document.getElementById('mSolutions').value, objectifs: document.getElementById('mObjectifs').value, actions: document.getElementById('mActions').value,
    archived: false
  };
  numericIds.forEach(function(id) { var el = document.getElementById(id); f[id] = el ? (parseInt(el.value) || 0) : 0; });
  if (!f.entiteId) return alert('⚠️ Enregistrez d\'abord une entité');
  var list = DB.get('fichesMensuelles', []); list.push(f); DB.set('fichesMensuelles', list); alert('✅ Fiche enregistrée');
}
function reinitialiserFormFiche() {
  var ids = ['mResponsable','mThemes','mGraces','mPoints','mSolutions','mObjectifs','mActions'];
  ids.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
  var nums = ['mEncadreurs','mMembresActifs','mSympathisants','mFMembres','mFSympathisants','mFNouveaux','mFoyersLumiere','mAvecGoshintai','mSansGoshintai','mFoyersSymp','mFleurs','mPotagers','mTotalPotagers','mMaisonsOuvertes','mTemoignages','mCandGoshintai','mConfInit','mConfReinit','mConfShoku','mConfKannon','mConfMitamaya','mAssistMembres','mAssistSymp','mConcessions','mTerrains','mCampagnes','mCoursEns','mCoursFleurs'];
  nums.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = 0; });
}
function tableFicheMensuelle(f) {
  var h = '<div class="entity-block"' + (f.archived ? ' style="opacity:0.7;background:#f0f0f0"' : '') + '>';
  h += '<h4>📍 ' + echapper(getEntiteNom(f.entiteId)) + ' — ' + f.mois + ' ' + f.annee + '</h4>';
  h += '<div class="no-print" style="margin:10px 0;padding:10px;background:#fff;border-radius:8px;border:1px dashed #0a6e2c">';
  h += '<button class="btn-mini orange" onclick="modifierFiche(\'' + f.id + '\')">✏️ Modifier</button> ';
  h += '<button class="btn-mini ' + (f.archived ? 'blue' : 'gray') + '" onclick="archiverFiche(\'' + f.id + '\')">' + (f.archived ? '↩️ Désarchiver' : '📦 Archiver') + '</button> ';
  h += '<button class="btn-mini danger" onclick="supprimerFiche(\'' + f.id + '\')">🗑️ Supprimer</button>';
  h += '</div>';
  h += '<div class="table-wrapper"><table class="data-table"><tbody>';
  h += '<tr><td>Responsable</td><td>' + echapper(f.responsable) + '</td></tr>';
  h += '<tr><td>Encadreurs</td><td>' + (f.mEncadreurs || 0) + '</td></tr>';
  h += '<tr><td>Membres actifs</td><td>' + (f.mMembresActifs || 0) + '</td></tr>';
  h += '<tr><td>Sympathisants</td><td>' + (f.mSympathisants || 0) + '</td></tr>';
  h += '<tr><td>Membres (culte)</td><td>' + (f.mFMembres || 0) + '</td></tr>';
  h += '<tr><td>Symp. (culte)</td><td>' + (f.mFSympathisants || 0) + '</td></tr>';
  h += '<tr><td>Nouv. venus</td><td>' + (f.mFNouveaux || 0) + '</td></tr>';
  h += '<tr><td>Thèmes</td><td>' + echapper(f.themes) + '</td></tr>';
  h += '<tr><td>Grâces</td><td>' + echapper(f.graces) + '</td></tr>';
  h += '<tr><td>Points</td><td>' + echapper(f.points) + '</td></tr>';
  h += '<tr><td>Solutions</td><td>' + echapper(f.solutions) + '</td></tr>';
  h += '<tr><td>Objectifs</td><td>' + echapper(f.objectifs) + '</td></tr>';
  h += '<tr><td>Actions</td><td>' + echapper(f.actions) + '</td></tr>';
  h += '</tbody></table></div></div>';
  return h;
}
function modifierFiche(id) {
  var list = DB.get('fichesMensuelles', []); var f = list.find(function(x) { return x.id === id; }); if (!f) return;
  var resp = prompt('Responsable :', f.responsable); if (resp === null) return; f.responsable = resp;
  DB.set('fichesMensuelles', list); alert('✅ Modifiée'); rechercherFreqAvance();
}
function archiverFiche(id) {
  var list = DB.get('fichesMensuelles', []); var f = list.find(function(x) { return x.id === id; }); if (!f) return;
  f.archived = !f.archived; DB.set('fichesMensuelles', list); alert(f.archived ? '📦 Archivée' : '↩️ Restaurée'); rechercherFreqAvance();
}
function supprimerFiche(id) {
  if (!confirm('Supprimer ?')) return;
  DB.set('fichesMensuelles', DB.get('fichesMensuelles', []).filter(function(x) { return x.id !== id; })); alert('✅ Supprimée'); rechercherFreqAvance();
}
function rechercherFreqAvance() {
  var q = (document.getElementById('searchFreq').value || '').toUpperCase().trim();
  var annee = (document.getElementById('searchFreqAnnee').value || '').trim();
  var mois = document.getElementById('searchFreqMois').value;
  var statut = document.getElementById('searchFreqStatut').value;
  var fiches = filtrerListe(DB.get('fichesMensuelles', []), statut);
  fiches = fiches.filter(function(f) {
    var nom = getEntiteNom(f.entiteId).toUpperCase();
    return (!q || nom.indexOf(q) !== -1) && (!annee || String(f.annee) === annee) && (!mois || f.mois === mois);
  });
  var html = '<h3>Résultats (' + fiches.length + ')</h3>';
  if (!fiches.length) html += '<p>Aucun résultat.</p>';
  else fiches.forEach(function(f) { html += tableFicheMensuelle(f); });
  document.getElementById('rapportFreqBox').innerHTML = html;
}
function reinitialiserRechercheFreq() {
  document.getElementById('searchFreq').value = '';
  document.getElementById('searchFreqAnnee').value = '';
  document.getElementById('searchFreqMois').selectedIndex = 0;
  document.getElementById('searchFreqStatut').selectedIndex = 0;
  document.getElementById('rapportFreqBox').innerHTML = '';
}

function rapportFreqGlobal() {
  var fiches = DB.get('fichesMensuelles', []).filter(function(f) { return !f.archived; });
  if (!fiches.length) { document.getElementById('rapportFreqBox').innerHTML = '<p>Aucune fiche active.</p>'; return; }
  var nomFiche = document.getElementById('nomRapportGlobal').value.trim() || 'EMM KASAÏ CENTRAL';
  var totaux = { mEncadreurs:0, mMembresActifs:0, mSympathisants:0, mFMembres:0, mFSympathisants:0, mFNouveaux:0, mFoyersLumiere:0, mAvecGoshintai:0, mSansGoshintai:0, mFoyersSymp:0, mFleurs:0, mPotagers:0, mTotalPotagers:0, mMaisonsOuvertes:0, mTemoignages:0, mCandGoshintai:0, mConfInit:0, mConfReinit:0, mConfShoku:0, mConfKannon:0, mConfMitamaya:0, mAssistMembres:0, mAssistSymp:0, mConcessions:0, mTerrains:0, mCampagnes:0, mCoursEns:0, mCoursFleurs:0 };
  var textes = { themes: [], graces: [], points: [], solutions: [], objectifs: [], actions: [] };
  fiches.forEach(function(f) {
    Object.keys(totaux).forEach(function(k) { totaux[k] += (parseInt(f[k]) || 0); });
    var nomE = getEntiteNom(f.entiteId);
    if (f.themes) textes.themes.push('<b>' + nomE + ' :</b> ' + echapper(f.themes));
    if (f.graces) textes.graces.push('<b>' + nomE + ' :</b> ' + echapper(f.graces));
    if (f.points) textes.points.push('<b>' + nomE + ' :</b> ' + echapper(f.points));
    if (f.solutions) textes.solutions.push('<b>' + nomE + ' :</b> ' + echapper(f.solutions));
    if (f.objectifs) textes.objectifs.push('<b>' + nomE + ' :</b> ' + echapper(f.objectifs));
    if (f.actions) textes.actions.push('<b>' + nomE + ' :</b> ' + echapper(f.actions));
  });
  var html = '<div class="rapport-header"><h3>📊 RAPPORT DIFFUSION ' + echapper(nomFiche).toUpperCase() + '</h3></div>';
  html += '<div class="entity-block"><h4>🌍 TOTAUX GLOBAUX</h4>';
  html += '<div class="table-wrapper"><table class="data-table"><tbody>';
  html += '<tr><td>Encadreurs</td><td class="num">' + totaux.mEncadreurs + '</td></tr>';
  html += '<tr><td>Membres actifs</td><td class="num">' + totaux.mMembresActifs + '</td></tr>';
  html += '<tr><td>Sympathisants</td><td class="num">' + totaux.mSympathisants + '</td></tr>';
  html += '<tr><td>Membres culte</td><td class="num">' + totaux.mFMembres + '</td></tr>';
  html += '<tr><td>Symp. culte</td><td class="num">' + totaux.mFSympathisants + '</td></tr>';
  html += '<tr><td>Nouveaux venus</td><td class="num">' + totaux.mFNouveaux + '</td></tr>';
  html += '<tr><td>Fleurs distribuées</td><td class="num">' + totaux.mFleurs + '</td></tr>';
  html += '<tr><td>Témoignages</td><td class="num">' + totaux.mTemoignages + '</td></tr>';
  html += '</tbody></table></div></div>';
  html += '<div class="entity-block" style="border-left-color:#1976d2;"><h4 style="color:#1976d2;">📝 TEXTES RASSEMBLÉS</h4>';
  html += '<div class="table-wrapper"><table class="data-table"><tbody>';
  html += '<tr><td><b>Thèmes</b></td><td>' + (textes.themes.join('<br><br>') || '-') + '</td></tr>';
  html += '<tr><td><b>Grâces</b></td><td>' + (textes.graces.join('<br><br>') || '-') + '</td></tr>';
  html += '<tr><td><b>Points</b></td><td>' + (textes.points.join('<br><br>') || '-') + '</td></tr>';
  html += '<tr><td><b>Solutions</b></td><td>' + (textes.solutions.join('<br><br>') || '-') + '</td></tr>';
  html += '<tr><td><b>Objectifs</b></td><td>' + (textes.objectifs.join('<br><br>') || '-') + '</td></tr>';
  html += '<tr><td><b>Actions</b></td><td>' + (textes.actions.join('<br><br>') || '-') + '</td></tr>';
  html += '</tbody></table></div></div>';
  document.getElementById('rapportFreqBox').innerHTML = html;
}
function rapportFreqDetaille() {
  var fiches = DB.get('fichesMensuelles', []).filter(function(f) { return !f.archived; });
  var html = '<div class="rapport-header"><h3>📋 RAPPORT DÉTAILLÉ DIFFUSION</h3></div>';
  fiches.forEach(function(f) { html += tableFicheMensuelle(f); });
  document.getElementById('rapportFreqBox').innerHTML = html;
}

// ============================================================
// MODULE 2 : RAPPORT NUMÉRIQUE
// ============================================================

function ajouterEntiteNum() {
  var type = document.getElementById('nTypeEntite').value;
  var nom = document.getElementById('nNomEntite').value.trim().toUpperCase();
  var resp = document.getElementById('nResponsable').value.trim();
  if (!nom || !resp) return alert('Remplissez tous les champs');
  var entites = DB.get('entitesNum', []);
  if (entites.find(function(e) { return e.nom === nom && !e.archived; })) return alert('Cette entité existe déjà');
  entites.push({ id: uid(), type: type, nom: nom, responsable: resp, archived: false });
  DB.set('entitesNum', entites); reinitialiserFormEntiteNum(); refreshAll(); alert('✅ Entité ajoutée');
}
function reinitialiserFormEntiteNum() {
  document.getElementById('nNomEntite').value = '';
  document.getElementById('nResponsable').value = '';
  document.getElementById('nTypeEntite').selectedIndex = 0;
}
function rafraichirEntitesNum() {
  var entites = DB.get('entitesNum', []).filter(function(e) { return !e.archived; });
  var sel = document.getElementById('nEntite'); if (!sel) return;
  var val = sel.value; var opts = '';
  entites.forEach(function(e) { opts += '<option value="' + e.id + '">' + e.type + ' - ' + e.nom + '</option>'; });
  sel.innerHTML = opts; if (val) sel.value = val;
}
function getEntiteNomNum(id) {
  var e = DB.get('entitesNum', []).find(function(x) { return x.id === id; });
  return e ? e.type + ' - ' + e.nom : 'Inconnu';
}
function afficherListeEntitesNum() {
  var filtre = document.getElementById('filtreEntitesNum') ? document.getElementById('filtreEntitesNum').value : 'actif';
  var search = (document.getElementById('searchEntiteListeNum') ? document.getElementById('searchEntiteListeNum').value : '').toUpperCase();
  var entites = filtrerListe(DB.get('entitesNum', []), filtre);
  if (search) entites = entites.filter(function(e) { return e.nom.indexOf(search) !== -1; });
  var box = document.getElementById('listeEntitesNum'); if (!box) return;
  if (!entites.length) { box.innerHTML = '<p>Aucune entité.</p>'; return; }
  var html = '';
  entites.forEach(function(e) {
    html += '<div class="item-list" style="padding:12px' + (e.archived ? ';opacity:0.7;background:#f0f0f0' : '') + '">';
    html += '<div style="font-size:14px;color:#0a6e2c;font-weight:600;margin-bottom:4px">🏛️ ' + echapper(e.type) + ' - ' + echapper(e.nom) + (e.archived ? ' <span class="badge badge-archive">📦</span>' : '') + '</div>';
    html += '<div style="font-size:12px;color:#666;margin-bottom:8px">👤 ' + echapper(e.responsable) + '</div>';
    html += '<div class="no-print">';
    html += '<button class="btn-mini orange" onclick="modifierEntiteNum(\'' + e.id + '\')">✏️</button> ';
    html += '<button class="btn-mini ' + (e.archived ? 'blue' : 'gray') + '" onclick="archiverEntiteNum(\'' + e.id + '\')">' + (e.archived ? '↩️' : '📦') + '</button> ';
    html += '<button class="btn-mini danger" onclick="supprimerEntiteNum(\'' + e.id + '\')">🗑️</button>';
    html += '</div></div>';
  });
  box.innerHTML = html;
}
function modifierEntiteNum(id) {
  var list = DB.get('entitesNum', []); var e = list.find(function(x) { return x.id === id; }); if (!e) return;
  var nom = prompt('Nom :', e.nom); if (nom === null) return;
  e.nom = nom.trim().toUpperCase();
  DB.set('entitesNum', list); refreshAll(); alert('✅ Modifiée');
}
function archiverEntiteNum(id) {
  var list = DB.get('entitesNum', []); var e = list.find(function(x) { return x.id === id; }); if (!e) return;
  e.archived = !e.archived; DB.set('entitesNum', list); refreshAll();
}
function supprimerEntiteNum(id) {
  if (!confirm('Supprimer ?')) return;
  DB.set('entitesNum', DB.get('entitesNum', []).filter(function(x) { return x.id !== id; }));
  refreshAll();
}
function enregistrerFicheNumerique() {
  var f = {
    id: uid(), entiteId: document.getElementById('nEntite').value, mois: document.getElementById('nMois').value, annee: document.getElementById('nAnnee').value,
    responsable: document.getElementById('nResponsableFiche').value, observation: document.getElementById('nObservation').value, archived: false
  };
  var numericIds = ['nBaptises','nMembresActifs','nMembresInactifs','nInities','nMembresEntres','nMembresSortis','nMembresRecuperes','nMembresDecedes','nFreqMembres','nFreqSymp','nFreqNouveaux','nAcheminees','nAchemineesRestees','nNouveauxRestes','nCulteMembres','nCulteSymp','nCulteNouveaux','nFamillesJohrei','nElevesSanguetsu','nFleursDist','nChampsUnite','nChampsFloral','nAgriculteurs','nAnciensPotagers','nNouveauxPotagers','nAutelsFamilles','nMitamaya','nSoreiSaishi','nShinreiSaichi','nAssistMembres','nAssistSymp','nNettoyageMembres','nNettoyageSymp'];
  numericIds.forEach(function(id) { var el = document.getElementById(id); f[id] = el ? (parseInt(el.value) || 0) : 0; });
  if (!f.entiteId) return alert('⚠️ Enregistrez d\'abord une entité');
  var list = DB.get('fichesNumeriques', []); list.push(f); DB.set('fichesNumeriques', list); alert('✅ Fiche numérique enregistrée');
}
function reinitialiserFormFicheNum() {
  var ids = ['nResponsableFiche','nObservation'];
  ids.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
  var nums = ['nBaptises','nMembresActifs','nMembresInactifs','nInities','nMembresEntres','nMembresSortis','nMembresRecuperes','nMembresDecedes','nFreqMembres','nFreqSymp','nFreqNouveaux','nAcheminees','nAchemineesRestees','nNouveauxRestes','nCulteMembres','nCulteSymp','nCulteNouveaux','nFamillesJohrei','nElevesSanguetsu','nFleursDist','nChampsUnite','nChampsFloral','nAgriculteurs','nAnciensPotagers','nNouveauxPotagers','nAutelsFamilles','nMitamaya','nSoreiSaishi','nShinreiSaichi','nAssistMembres','nAssistSymp','nNettoyageMembres','nNettoyageSymp'];
  nums.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = 0; });
}
function tableFicheNumerique(f) {
  var h = '<div class="entity-block"' + (f.archived ? ' style="opacity:0.7;background:#f0f0f0"' : '') + '>';
  h += '<h4>📍 ' + echapper(getEntiteNomNum(f.entiteId)) + ' — ' + f.mois + ' ' + f.annee + '</h4>';
  h += '<div class="no-print" style="margin:10px 0;padding:10px;background:#fff;border-radius:8px;border:1px dashed #0a6e2c">';
  h += '<button class="btn-mini orange" onclick="modifierFicheNum(\'' + f.id + '\')">✏️ Modifier</button> ';
  h += '<button class="btn-mini ' + (f.archived ? 'blue' : 'gray') + '" onclick="archiverFicheNum(\'' + f.id + '\')">' + (f.archived ? '↩️ Désarchiver' : '📦 Archiver') + '</button> ';
  h += '<button class="btn-mini danger" onclick="supprimerFicheNum(\'' + f.id + '\')">🗑️ Supprimer</button>';
  h += '</div>';
  h += '<div class="table-wrapper"><table class="data-table"><tbody>';
  h += '<tr><td>Responsable</td><td>' + echapper(f.responsable) + '</td></tr>';
  h += '<tr><th colspan="2" style="background:#4caf50;">Membres</th></tr>';
  h += '<tr><td>Baptisés</td><td>' + (f.nBaptises || 0) + '</td></tr>';
  h += '<tr><td>Actifs</td><td>' + (f.nMembresActifs || 0) + '</td></tr>';
  h += '<tr><td>Inactifs</td><td>' + (f.nMembresInactifs || 0) + '</td></tr>';
  h += '<tr><td>Initiés</td><td>' + (f.nInities || 0) + '</td></tr>';
  h += '<tr><td>Entrés</td><td>' + (f.nMembresEntres || 0) + '</td></tr>';
  h += '<tr><td>Sortis du pays</td><td>' + (f.nMembresSortis || 0) + '</td></tr>';
  h += '<tr><td>Récupérés</td><td>' + (f.nMembresRecuperes || 0) + '</td></tr>';
  h += '<tr><td>Décédés</td><td>' + (f.nMembresDecedes || 0) + '</td></tr>';
  h += '<tr><th colspan="2" style="background:#4caf50;">Fréquentation Mensuelle</th></tr>';
  h += '<tr><td>Membres</td><td>' + (f.nFreqMembres || 0) + '</td></tr>';
  h += '<tr><td>Sympathisants</td><td>' + (f.nFreqSymp || 0) + '</td></tr>';
  h += '<tr><td>Nouveaux venus</td><td>' + (f.nFreqNouveaux || 0) + '</td></tr>';
  h += '<tr><td>Acheminées</td><td>' + (f.nAcheminees || 0) + '</td></tr>';
  h += '<tr><td>Acheminées restées</td><td>' + (f.nAchemineesRestees || 0) + '</td></tr>';
  h += '<tr><td>Nouveaux venus restés</td><td>' + (f.nNouveauxRestes || 0) + '</td></tr>';
  h += '<tr><th colspan="2" style="background:#4caf50;">Culte Mensuel</th></tr>';
  h += '<tr><td>Membres</td><td>' + (f.nCulteMembres || 0) + '</td></tr>';
  h += '<tr><td>Sympathisants</td><td>' + (f.nCulteSymp || 0) + '</td></tr>';
  h += '<tr><td>Nouveaux venus</td><td>' + (f.nCulteNouveaux || 0) + '</td></tr>';
  h += '<tr><th colspan="2" style="background:#4caf50;">Activités Religieuses</th></tr>';
  h += '<tr><td>Familles Johrei</td><td>' + (f.nFamillesJohrei || 0) + '</td></tr>';
  h += '<tr><td>Élèves Sanguetsu</td><td>' + (f.nElevesSanguetsu || 0) + '</td></tr>';
  h += '<tr><td>Fleurs distribuées</td><td>' + (f.nFleursDist || 0) + '</td></tr>';
  h += '<tr><td>Champs d\'unité</td><td>' + (f.nChampsUnite || 0) + '</td></tr>';
  h += '<tr><td>Champs floral</td><td>' + (f.nChampsFloral || 0) + '</td></tr>';
  h += '<tr><td>Agriculteurs</td><td>' + (f.nAgriculteurs || 0) + '</td></tr>';
  h += '<tr><td>Anciens potagers</td><td>' + (f.nAnciensPotagers || 0) + '</td></tr>';
  h += '<tr><td>Nouveaux potagers</td><td>' + (f.nNouveauxPotagers || 0) + '</td></tr>';
  h += '<tr><td>Autels de familles</td><td>' + (f.nAutelsFamilles || 0) + '</td></tr>';
  h += '<tr><td>Mitamaya</td><td>' + (f.nMitamaya || 0) + '</td></tr>';
  h += '<tr><td>Sorei Saishi</td><td>' + (f.nSoreiSaishi || 0) + '</td></tr>';
  h += '<tr><td>Shinrei Saichi</td><td>' + (f.nShinreiSaichi || 0) + '</td></tr>';
  h += '<tr><th colspan="2" style="background:#4caf50;">Assistance Religieuse</th></tr>';
  h += '<tr><td>Membres</td><td>' + (f.nAssistMembres || 0) + '</td></tr>';
  h += '<tr><td>Sympathisants</td><td>' + (f.nAssistSymp || 0) + '</td></tr>';
  h += '<tr><th colspan="2" style="background:#4caf50;">Nettoyage des Maisons</th></tr>';
  h += '<tr><td>Membres</td><td>' + (f.nNettoyageMembres || 0) + '</td></tr>';
  h += '<tr><td>Sympathisants</td><td>' + (f.nNettoyageSymp || 0) + '</td></tr>';
  if (f.observation) h += '<tr><td>Observation</td><td>' + echapper(f.observation) + '</td></tr>';
  h += '</tbody></table></div></div>';
  return h;
}
function modifierFicheNum(id) {
  var list = DB.get('fichesNumeriques', []); var f = list.find(function(x) { return x.id === id; }); if (!f) return;
  var resp = prompt('Responsable :', f.responsable); if (resp === null) return; f.responsable = resp;
  var obs = prompt('Observation :', f.observation); if (obs === null) return; f.observation = obs;
  DB.set('fichesNumeriques', list); alert('✅ Modifiée'); rechercherNumAvance();
}
function archiverFicheNum(id) {
  var list = DB.get('fichesNumeriques', []); var f = list.find(function(x) { return x.id === id; }); if (!f) return;
  f.archived = !f.archived; DB.set('fichesNumeriques', list); alert(f.archived ? '📦 Archivée' : '↩️ Restaurée'); rechercherNumAvance();
}
function supprimerFicheNum(id) {
  if (!confirm('Supprimer ?')) return;
  DB.set('fichesNumeriques', DB.get('fichesNumeriques', []).filter(function(x) { return x.id !== id; })); alert('✅ Supprimée'); rechercherNumAvance();
}
function rechercherNumAvance() {
  var q = (document.getElementById('searchNum').value || '').toUpperCase().trim();
  var annee = (document.getElementById('searchNumAnnee').value || '').trim();
  var mois = document.getElementById('searchNumMois').value;
  var statut = document.getElementById('searchNumStatut').value;
  var fiches = filtrerListe(DB.get('fichesNumeriques', []), statut);
  fiches = fiches.filter(function(f) {
    var nom = getEntiteNomNum(f.entiteId).toUpperCase();
    return (!q || nom.indexOf(q) !== -1) && (!annee || String(f.annee) === annee) && (!mois || f.mois === mois);
  });
  var html = '<h3>Résultats (' + fiches.length + ')</h3>';
  if (!fiches.length) html += '<p>Aucun résultat.</p>';
  else fiches.forEach(function(f) { html += tableFicheNumerique(f); });
  document.getElementById('rapportNumBox').innerHTML = html;
}
function reinitialiserRechercheNum() {
  document.getElementById('searchNum').value = '';
  document.getElementById('searchNumAnnee').value = '';
  document.getElementById('searchNumMois').selectedIndex = 0;
  document.getElementById('searchNumStatut').selectedIndex = 0;
  document.getElementById('rapportNumBox').innerHTML = '';
}

function rapportNumGlobal() {
  var fiches = DB.get('fichesNumeriques', []).filter(function(f) { return !f.archived; });
  if (!fiches.length) { document.getElementById('rapportNumBox').innerHTML = '<p>Aucune fiche active.</p>'; return; }
  var nomFiche = document.getElementById('nomRapportNumGlobal').value.trim() || 'EMM KASAÏ CENTRAL';
  var totaux = {};
  var numericIds = ['nBaptises','nMembresActifs','nMembresInactifs','nInities','nMembresEntres','nMembresSortis','nMembresRecuperes','nMembresDecedes','nFreqMembres','nFreqSymp','nFreqNouveaux','nAcheminees','nAchemineesRestees','nNouveauxRestes','nCulteMembres','nCulteSymp','nCulteNouveaux','nFamillesJohrei','nElevesSanguetsu','nFleursDist','nChampsUnite','nChampsFloral','nAgriculteurs','nAnciensPotagers','nNouveauxPotagers','nAutelsFamilles','nMitamaya','nSoreiSaishi','nShinreiSaichi','nAssistMembres','nAssistSymp','nNettoyageMembres','nNettoyageSymp'];
  numericIds.forEach(function(id) { totaux[id] = 0; });
  var observations = [];
  fiches.forEach(function(f) {
    numericIds.forEach(function(k) { totaux[k] += (parseInt(f[k]) || 0); });
    if (f.observation && f.observation.trim()) observations.push('<b>' + getEntiteNomNum(f.entiteId) + ' :</b> ' + echapper(f.observation));
  });
  var html = '<div class="rapport-header"><h3>🔢 RAPPORT NUMÉRIQUE ' + echapper(nomFiche).toUpperCase() + '</h3></div>';
  html += '<div class="entity-block"><h4>🌍 TOTAUX GLOBAUX</h4>';
  html += '<div class="table-wrapper"><table class="data-table"><tbody>';
  html += '<tr><th colspan="2" style="background:#4caf50;">Membres</th></tr>';
  html += '<tr><td>Baptisés</td><td class="num">' + totaux.nBaptises + '</td></tr>';
  html += '<tr><td>Actifs</td><td class="num">' + totaux.nMembresActifs + '</td></tr>';
  html += '<tr><td>Inactifs</td><td class="num">' + totaux.nMembresInactifs + '</td></tr>';
  html += '<tr><td>Initiés</td><td class="num">' + totaux.nInities + '</td></tr>';
  html += '<tr><td>Entrés</td><td class="num">' + totaux.nMembresEntres + '</td></tr>';
  html += '<tr><td>Sortis du pays</td><td class="num">' + totaux.nMembresSortis + '</td></tr>';
  html += '<tr><td>Récupérés</td><td class="num">' + totaux.nMembresRecuperes + '</td></tr>';
  html += '<tr><td>Décédés</td><td class="num">' + totaux.nMembresDecedes + '</td></tr>';
  html += '<tr><th colspan="2" style="background:#4caf50;">Fréquentation Mensuelle</th></tr>';
  html += '<tr><td>Membres</td><td class="num">' + totaux.nFreqMembres + '</td></tr>';
  html += '<tr><td>Sympathisants</td><td class="num">' + totaux.nFreqSymp + '</td></tr>';
  html += '<tr><td>Nouveaux venus</td><td class="num">' + totaux.nFreqNouveaux + '</td></tr>';
  html += '<tr><td>Acheminées</td><td class="num">' + totaux.nAcheminees + '</td></tr>';
  html += '<tr><td>Acheminées restées</td><td class="num">' + totaux.nAchemineesRestees + '</td></tr>';
  html += '<tr><td>Nouveaux venus restés</td><td class="num">' + totaux.nNouveauxRestes + '</td></tr>';
  html += '<tr><th colspan="2" style="background:#4caf50;">Culte Mensuel</th></tr>';
  html += '<tr><td>Membres</td><td class="num">' + totaux.nCulteMembres + '</td></tr>';
  html += '<tr><td>Sympathisants</td><td class="num">' + totaux.nCulteSymp + '</td></tr>';
  html += '<tr><td>Nouveaux venus</td><td class="num">' + totaux.nCulteNouveaux + '</td></tr>';
  html += '<tr><th colspan="2" style="background:#4caf50;">Activités Religieuses</th></tr>';
  html += '<tr><td>Familles Johrei</td><td class="num">' + totaux.nFamillesJohrei + '</td></tr>';
  html += '<tr><td>Élèves Sanguetsu</td><td class="num">' + totaux.nElevesSanguetsu + '</td></tr>';
  html += '<tr><td>Fleurs distribuées</td><td class="num">' + totaux.nFleursDist + '</td></tr>';
  html += '<tr><td>Champs d\'unité</td><td class="num">' + totaux.nChampsUnite + '</td></tr>';
  html += '<tr><td>Champs floral</td><td class="num">' + totaux.nChampsFloral + '</td></tr>';
  html += '<tr><td>Agriculteurs</td><td class="num">' + totaux.nAgriculteurs + '</td></tr>';
  html += '<tr><td>Anciens potagers</td><td class="num">' + totaux.nAnciensPotagers + '</td></tr>';
  html += '<tr><td>Nouveaux potagers</td><td class="num">' + totaux.nNouveauxPotagers + '</td></tr>';
  html += '<tr><td>Autels de familles</td><td class="num">' + totaux.nAutelsFamilles + '</td></tr>';
  html += '<tr><td>Mitamaya</td><td class="num">' + totaux.nMitamaya + '</td></tr>';
  html += '<tr><td>Sorei Saishi</td><td class="num">' + totaux.nSoreiSaishi + '</td></tr>';
  html += '<tr><td>Shinrei Saichi</td><td class="num">' + totaux.nShinreiSaichi + '</td></tr>';
  html += '<tr><th colspan="2" style="background:#4caf50;">Assistance Religieuse</th></tr>';
  html += '<tr><td>Membres</td><td class="num">' + totaux.nAssistMembres + '</td></tr>';
  html += '<tr><td>Sympathisants</td><td class="num">' + totaux.nAssistSymp + '</td></tr>';
  html += '<tr><th colspan="2" style="background:#4caf50;">Nettoyage des Maisons</th></tr>';
  html += '<tr><td>Membres</td><td class="num">' + totaux.nNettoyageMembres + '</td></tr>';
  html += '<tr><td>Sympathisants</td><td class="num">' + totaux.nNettoyageSymp + '</td></tr>';
  html += '</tbody></table></div></div>';
  if (observations.length) {
    html += '<div class="entity-block" style="border-left-color:#1976d2;"><h4 style="color:#1976d2;">📝 OBSERVATIONS</h4>';
    html += '<div class="table-wrapper"><table class="data-table"><tbody>';
    observations.forEach(function(o) { html += '<tr><td>' + o + '</td></tr>'; });
    html += '</tbody></table></div></div>';
  }
  document.getElementById('rapportNumBox').innerHTML = html;
}
function rapportNumDetaille() {
  var fiches = DB.get('fichesNumeriques', []).filter(function(f) { return !f.archived; });
  var html = '<div class="rapport-header"><h3>📋 RAPPORT DÉTAILLÉ NUMÉRIQUE</h3></div>';
  fiches.forEach(function(f) { html += tableFicheNumerique(f); });
  document.getElementById('rapportNumBox').innerHTML = html;
}

// ============================================================
// DASHBOARDS
// ============================================================
function afficherDashboardDiffusion() {
  var box = document.getElementById('dashboardDiffusionBox'); if (!box) return;
  var entites = DB.get('entites', []).filter(function(e) { return !e.archived; }).length;
  var fiches = DB.get('fichesMensuelles', []).filter(function(f) { return !f.archived; }).length;
  var html = '<div class="table-wrapper"><table class="data-table"><tbody>';
  html += '<tr><td>Entités actives</td><td class="num">' + entites + '</td></tr>';
  html += '<tr><td>Fiches mensuelles</td><td class="num">' + fiches + '</td></tr>';
  html += '</tbody></table></div>';
  box.innerHTML = html;
}
function afficherDashboardNum() {
  var box = document.getElementById('dashboardNumBox'); if (!box) return;
  var entites = DB.get('entitesNum', []).filter(function(e) { return !e.archived; }).length;
  var fiches = DB.get('fichesNumeriques', []).filter(function(f) { return !f.archived; }).length;
  var html = '<div class="table-wrapper"><table class="data-table"><tbody>';
  html += '<tr><td>Entités actives</td><td class="num">' + entites + '</td></tr>';
  html += '<tr><td>Fiches numériques</td><td class="num">' + fiches + '</td></tr>';
  html += '</tbody></table></div>';
  box.innerHTML = html;
}

// ============================================================
// ANNONCES / UTILISATEURS / EXPORT
// ============================================================
function afficherAnnonces() {
  var list = DB.get('annonces', []);
  var box = document.getElementById('announcementsBox');
  if (!box) return;
  if (!list.length) { box.innerHTML = '<p>Aucune annonce.</p>'; return; }
  var html = '';
  list.slice().reverse().forEach(function(a) {
    html += '<div class="item-list"><strong>📢 ' + a.date + '</strong><br>' + echapper(a.texte);
    if (isAdmin()) html += '<div class="no-print" style="margin-top:6px"><button class="btn-mini danger" onclick="supprimerAnnonce(\'' + a.id + '\')">🗑️</button></div>';
    html += '</div>';
  });
  box.innerHTML = html;
}
function publierAnnonce() {
  if (!isAdmin()) return alert('Réservé admin');
  var texte = document.getElementById('annonceText').value.trim();
  if (!texte) return alert('Écrivez une annonce');
  var list = DB.get('annonces', []);
  list.push({ id: uid(), texte: texte, date: new Date().toLocaleDateString('fr-FR'), auteur: currentUser.nom });
  DB.set('annonces', list); document.getElementById('annonceText').value = ''; afficherAnnonces(); alert('✅ Publiée');
}
function reinitialiserFormAnnonce() { document.getElementById('annonceText').value = ''; }
function supprimerAnnonce(id) { if (!confirm('Supprimer ?')) return; DB.set('annonces', DB.get('annonces', []).filter(function(a) { return a.id !== id; })); afficherAnnonces(); }

function ajouterUtilisateur() {
  if (!isAdmin()) return alert('Réservé admin');
  var nom = document.getElementById('uNom').value.trim().toLowerCase();
  var pass = document.getElementById('uPass').value.trim();
  if (!nom || !pass) return alert('Remplissez tous les champs');
  var users = DB.get('users', []);
  if (users.find(function(u) { return u.nom === nom; })) return alert('Ce nom existe déjà');
  users.push({ id: uid(), nom: nom, pass: pass, role: document.getElementById('uRole').value });
  DB.set('users', users); reinitialiserFormUtilisateur(); afficherUtilisateurs(); alert('✅ Utilisateur ajouté');
}
function reinitialiserFormUtilisateur() {
  document.getElementById('uNom').value = '';
  document.getElementById('uPass').value = '';
  document.getElementById('uRole').selectedIndex = 0;
}
function afficherUtilisateurs() {
  var users = DB.get('users', []);
  var box = document.getElementById('listeUtilisateurs'); if (!box) return;
  var html = '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Nom</th><th>Rôle</th><th class="no-print">Actions</th></tr></thead><tbody>';
  users.forEach(function(u) {
    html += '<tr><td>' + echapper(u.nom) + '</td><td>' + (u.role === 'admin' ? '👑 Admin' : '👤 Utilisateur') + '</td>';
    html += '<td class="no-print">';
    if (u.nom !== 'admin') html += '<button class="btn-mini danger" onclick="supprimerUtilisateur(\'' + u.id + '\')">🗑️</button>';
    html += '</td></tr>';
  });
  html += '</tbody></table></div>';
  box.innerHTML = html;
}
function supprimerUtilisateur(id) { if (!isAdmin()) return alert('Réservé admin'); if (!confirm('Supprimer ?')) return; DB.set('users', DB.get('users', []).filter(function(u) { return u.id !== id; })); afficherUtilisateurs(); }

function exporterDonnees() {
  var data = {};
  ['users','entites','participations','fichesMensuelles','entitesNum','fichesNumeriques','annonces'].forEach(function(k) { data[k] = DB.get(k, []); });
  var json = JSON.stringify(data, null, 2);
  try { var blob = new Blob([json], { type: 'application/json' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'emm_rapports_' + Date.now() + '.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function() { URL.revokeObjectURL(url); }, 1000); } catch (e) { alert('Erreur export'); }
}
function restaurerTexte() {
  var txt = document.getElementById('importText').value.trim();
  if (!txt) return alert('Collez d\'abord un JSON');
  try { var data = JSON.parse(txt); Object.keys(data).forEach(function(k) { DB.set(k, data[k]); }); alert('✅ Restauré'); refreshAll(); afficherDashboardDiffusion(); afficherDashboardNum(); } catch (e) { alert('❌ JSON invalide'); }
}
function importerDonnees(ev) {
  var file = ev.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) { try { var data = JSON.parse(e.target.result); Object.keys(data).forEach(function(k) { DB.set(k, data[k]); }); alert('✅ Restauré'); refreshAll(); } catch (err) { alert('❌ Fichier invalide'); } };
  reader.readAsText(file);
}
function toutEffacer() {
  if (!isAdmin()) return alert('Réservé admin');
  if (!confirm('⚠️ Effacer TOUTES les données (sauf utilisateurs) ?')) return;
  var users = DB.get('users', []); localStorage.clear(); DB.set('users', users); initDB(); alert('✅ Effacé'); location.reload();
}

// ============================================================
// IMPRESSION / EXPORT
// ============================================================
function imprimerRapportFreq() { imprimerBox('rapportFreqBox'); }
function imprimerRapportNum() { imprimerBox('rapportNumBox'); }
function imprimerBox(boxId) {
  var c = document.getElementById(boxId).innerHTML;
  if (!c) return alert('Rapport vide');
  var w = window.open('', '_blank');
  w.document.write('<html><head><meta charset="UTF-8"><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#0a6e2c;color:white;padding:8px}td{padding:7px;border-bottom:1px solid #ddd}.no-print{display:none !important}</style></head><body><h1 style="text-align:center;color:#0a6e2c">EMM RAPPORTS</h1><hr>'+c+'</body></html>');
  w.document.close(); setTimeout(function() { w.print(); }, 600);
}
function exporterWordFreq() { exporterWordBox('rapportFreqBox','Diffusion'); }
function exporterWordNum() { exporterWordBox('rapportNumBox','Numerique'); }
function exporterWordBox(boxId, nom) {
  var contenu = document.getElementById(boxId).innerHTML;
  if (!contenu) return alert('Rapport vide');
  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="UTF-8"><style>.no-print{display:none !important}</style></head><body><h1>EMM RAPPORTS</h1><hr>' + contenu + '</body></html>';
  var blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = 'Rapport_' + nom + '_' + Date.now() + '.doc';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function exporterPDFFreq() { ouvrirPdfModal('rapportFreqBox'); }
function exporterPDFNum() { ouvrirPdfModal('rapportNumBox'); }

function ouvrirPdfModal(boxId) {
  var contenu = document.getElementById(boxId).innerHTML;
  if (!contenu) return alert('Rapport vide');
  pdfRapportActuel = contenu;
  var prefs = JSON.parse(localStorage.getItem('emmPdfPrefs') || '{}');
  document.getElementById('pdfPolice').value = prefs.police || 'Arial';
  document.getElementById('pdfTaille').value = prefs.taille || '11';
  document.getElementById('pdfStyle').value = prefs.style || 'normal';
  document.getElementById('pdfInterligne').value = prefs.interligne || '1.4';
  document.getElementById('pdfOptionsModal').style.display = 'flex';
}
function closePdfModal() {
  document.getElementById('pdfOptionsModal').style.display = 'none';
  pdfRapportActuel = null;
}
function genererPDFAvecOptions() {
  if (!pdfRapportActuel) return;
  var police = document.getElementById('pdfPolice').value;
  var taille = document.getElementById('pdfTaille').value;
  var style = document.getElementById('pdfStyle').value;
  var interligne = document.getElementById('pdfInterligne').value;
  localStorage.setItem('emmPdfPrefs', JSON.stringify({ police: police, taille: taille, style: style, interligne: interligne }));
  var fontWeight = style === 'bold' ? 'bold' : 'normal';
  var w = window.open('', '_blank');
  w.document.write(
    '<html><head><meta charset="UTF-8"><style>' +
    'body { font-family: "' + police + '", serif; padding: 20px; font-size: ' + taille + 'pt; font-weight: ' + fontWeight + '; line-height: ' + interligne + '; }' +
    'h1, h2, h3, h4 { color: #0a6e2c; margin: 6px 0; font-weight: bold; }' +
    'h1 { font-size: ' + (parseInt(taille) + 6) + 'pt; text-align: center; }' +
    'h3 { font-size: ' + (parseInt(taille) + 2) + 'pt; }' +
    'h4 { font-size: ' + (parseInt(taille) + 1) + 'pt; }' +
    'table { width: 100%; border-collapse: collapse; font-size: ' + taille + 'pt; font-weight: ' + fontWeight + '; }' +
    'th { background: #0a6e2c; color: white; padding: 5px; text-align: left; font-size: ' + taille + 'pt; }' +
    'td { padding: 4px 5px; border-bottom: 1px solid #ddd; }' +
    'td.num { text-align: right; }' +
    '.no-print { display: none !important; }' +
    '.entity-block { border: 1px solid #ccc; padding: 8px; margin-bottom: 10px; page-break-inside: avoid; }' +
    '.rapport-header { border-bottom: 2px solid #0a6e2c; padding-bottom: 8px; margin-bottom: 10px; text-align: center; }' +
    '@media print { body { padding: 10px; } }' +
    '</style></head><body>' +
    '<h1>EMM RAPPORTS</h1>' +
    '<hr>' +
    pdfRapportActuel +
    '</body></html>'
  );
  w.document.close();
  setTimeout(function() { w.print(); }, 500);
  closePdfModal();
}

function partagerRapportFreq() { partagerBox('rapportFreqBox','Diffusion'); }
function partagerRapportNum() { partagerBox('rapportNumBox','Numérique'); }
function partagerBox(boxId, nom) {
  var contenu = document.getElementById(boxId).innerHTML;
  if (!contenu) return alert('Rapport vide');
  var div = document.createElement('div'); div.innerHTML = contenu;
  var texte = div.innerText.substring(0, 2000);
  var msg = 'EMM RAPPORTS — ' + nom + '\n\n' + texte;
  var email = prompt('📧 Email (vide = WhatsApp) :', '');
  if (email === null) return;
  if (email.trim()) window.location.href = 'mailto:' + email.trim() + '?subject=Rapport ' + nom + '&body=' + encodeURIComponent(msg);
  else window.location.href = 'https://wa.me/?text=' + encodeURIComponent(msg);
}

var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) { e.preventDefault(); deferredPrompt = e; var btn = document.getElementById('installBtn'); if (btn) btn.style.display = 'block'; });
function installApp() {
  if (!deferredPrompt) return alert('Menu navigateur → "Ajouter à l\'écran d\'accueil"');
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(function() { deferredPrompt = null; var btn = document.getElementById('installBtn'); if (btn) btn.style.display = 'none'; });
}

function refreshAll() {
  rafraichirEntites(); afficherListeEntites(); afficherJournaliere();
  rafraichirEntitesNum(); afficherListeEntitesNum();
  afficherUtilisateurs();
}

window.addEventListener('load', function() { showSplash(); });
