const DB = {
  get: function(key, def) {
    try {
      const v = localStorage.getItem('emmrapport_' + key);
      return v ? JSON.parse(v) : (def !== undefined ? def : null);
    } catch(e) { return def; }
  },
  set: function(key, val) {
    localStorage.setItem('emmrapport_' + key, JSON.stringify(val));
  },
  remove: function(key) {
    localStorage.removeItem('emmrapport_' + key);
  }
};

function initDB() {
  if (!DB.get('users')) {
    DB.set('users', [
      { id: 'u1', nom: 'admin', pass: 'admin123', role: 'admin' },
      { id: 'u2', nom: 'utilisateur', pass: 'user123', role: 'user' }
    ]);
  }
  if (!DB.get('session')) DB.set('session', null);
  if (!DB.get('entites')) DB.set('entites', []);
  if (!DB.get('participations')) DB.set('participations', []);
  if (!DB.get('fichesMensuelles')) DB.set('fichesMensuelles', []);
  if (!DB.get('entitesNum')) DB.set('entitesNum', []);
  if (!DB.get('fichesNumeriques')) DB.set('fichesNumeriques', []);
  if (!DB.get('annonces')) DB.set('annonces', []);

  ['entites','participations','fichesMensuelles','entitesNum','fichesNumeriques'].forEach(function(key) {
    var list = DB.get(key, []);
    var modifie = false;
    list.forEach(function(item) {
      if (item.archived === undefined) { item.archived = false; modifie = true; }
    });
    if (modifie) DB.set(key, list);
  });
}
initDB();
