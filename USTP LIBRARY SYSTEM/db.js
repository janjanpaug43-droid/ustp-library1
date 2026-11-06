var SB_URL = "https://abcdxyz.supabase.co";
var SB_KEY = "https://teovxqzrlxsiqgkwamqs.supabase.co";

(function () {
  var SB_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
  var SB_KEY = "PASTE_YOUR_ANON_PUBLIC_KEY_HERE";

  var KEYS = { "ustp-lib": "state", "ustp-cov": "covers" };
  var setRaw = Storage.prototype.setItem;
  var ready = false,
    seen = {},
    lastJson = {},
    timers = {};

  function H(extra) {
    var h = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };
    for (var k in extra) h[k] = extra[k];
    return h;
  }
  function configured() {
    return SB_URL.indexOf("PASTE_") < 0 && SB_KEY.indexOf("PASTE_") < 0;
  }
  function strip(id, obj) {
    if (id === "state" && obj) {
      obj = JSON.parse(JSON.stringify(obj));
      delete obj.u;
      delete obj.rem;
    }
    return obj;
  }
  function localObj(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (e) {
      return null;
    }
  }

  function push(key) {
    var id = KEYS[key],
      obj = strip(id, localObj(key));
    if (!obj) return;
    var json = JSON.stringify(obj);
    if (json === lastJson[id]) return;
    var ts = new Date().toISOString();
    lastJson[id] = json;
    seen[id] = ts;
    fetch(SB_URL + "/rest/v1/library_state?on_conflict=id", {
      method: "POST",
      headers: H({
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      }),
      body: JSON.stringify({ id: id, data: obj, updated_at: ts }),
    }).catch(function () {});
  }
  function schedule(key) {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(function () {
      push(key);
    }, 400);
  }

  Storage.prototype.setItem = function (k, v) {
    setRaw.call(this, k, v);
    if (this === window.localStorage && KEYS[k] && ready) schedule(k);
  };

  function apply(row) {
    var key = row.id === "state" ? "ustp-lib" : "ustp-cov";
    var obj = row.data || {};
    lastJson[row.id] = JSON.stringify(strip(row.id, obj));
    if (row.id === "state") {
      var mine = localObj("ustp-lib") || {};
      if (mine.u) obj.u = mine.u;
      if (mine.rem !== undefined) obj.rem = mine.rem;
    }
    setRaw.call(localStorage, key, JSON.stringify(obj));
    seen[row.id] = row.updated_at;
  }

  function pull(onlyIfSafe) {
    return fetch(SB_URL + "/rest/v1/library_state?select=*", { headers: H({}) })
      .then(function (r) {
        if (!r.ok) throw new Error("db");
        return r.json();
      })
      .then(function (rows) {
        var fresh = rows.filter(function (row) {
          return seen[row.id] !== row.updated_at;
        });
        if (!fresh.length) return { changed: false, rows: rows };
        if (onlyIfSafe && !safe()) return { changed: false, rows: rows };
        fresh.forEach(apply);
        return { changed: true, rows: rows };
      });
  }

  function safe() {
    var a = document.activeElement,
      md = document.getElementById("md");
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return false;
    if (md && md.className === "on") return false;
    return true;
  }

  function loadApp() {
    ["qr.js", "java.js"].forEach(function (src) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false;
      document.body.appendChild(s);
    });
  }

  function start() {
    if (!configured()) {
      console.warn("db.js: paste your Supabase URL and key. Running offline.");
      ready = false;
      loadApp();
      return;
    }
    pull(false)
      .then(function (res) {
        ready = true;
        var hasCov = res.rows.some(function (r) {
          return r.id === "covers";
        });
        if (!hasCov && localObj("ustp-cov")) push("ustp-cov");
        loadApp();
        setInterval(function () {
          pull(true)
            .then(function (r) {
              if (r.changed) location.reload();
            })
            .catch(function () {});
        }, 6000);
      })
      .catch(function () {
        ready = true;
        loadApp();
      });
  }
  start();
})();
