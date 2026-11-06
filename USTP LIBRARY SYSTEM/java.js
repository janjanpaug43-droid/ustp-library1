(function () {
  var TODAY = new Date();
  TODAY.setHours(0, 0, 0, 0);
  var FINE = 20, // late penalty per book (PHP)
    LOST = 3000; // lost / damaged book (PHP per book)
  var PICKUP = "John Albert Paug"; // librarian na hahanapin pag kukunin ang libro
  var iso = function (d) {
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  };
  var P = function (s) {
    return new Date(s + "T00:00:00");
  };
  var F = function (s) {
    return P(s).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };
  var DAY = 86400000;
  function peso(n) {
    return (
      "PHP " +
      Number(n).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  var S = {
    b: [{ id: "001", d: "2026-11-03", due: "2026-11-05", r: null }],
    rv: [],
  };
  try {
    var raw = localStorage.getItem("ustp-lib");
    if (raw) S = JSON.parse(raw);
  } catch (e) {}
  S.b = S.b || [];
  S.rv = S.rv || []; // reservations: [{id, u, n, d}] isa lang kada libro
  S.cm = S.cm || []; // concerns / complaints ng students para sa librarian
  delete S.rs;
  // ===== 2 LIBRARIAN ACCOUNTS LANG (provided na) =====
  var LIBS = [
    {
      n: "John Albert Paug",
      un: "johnalbert",
      pw: "lib1234",
      role: "Librarian",
    },
    { n: "Maria Santos", un: "librarian2", pw: "lib5678", role: "Librarian" },
  ];
  S.acc = (S.acc || []).filter(function (x) {
    return (
      x.role !== "Librarian" ||
      LIBS.some(function (l) {
        return l.un === x.un;
      })
    );
  });
  LIBS.forEach(function (l) {
    var f = S.acc.filter(function (x) {
      return x.un === l.un;
    })[0];
    if (f) {
      f.role = "Librarian";
      f.n = l.n;
    } else S.acc.push({ n: l.n, un: l.un, pw: l.pw, role: l.role });
  });
  function save() {
    try {
      localStorage.setItem("ustp-lib", JSON.stringify(S));
    } catch (e) {}
  }
  save();
  function $(id) {
    return document.getElementById(id);
  }
  function say(id, t) {
    $(id).textContent = t;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function initials(n) {
    return n
      .split(" ")
      .map(function (w) {
        return w[0];
      })
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  function acct() {
    return S.u
      ? (S.acc || []).filter(function (x) {
          return x.un === S.u.un;
        })[0]
      : null;
  }
  // gawing square 256px ang picture para maliit lang sa storage
  function shrink(file, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var sz = 256,
          c = document.createElement("canvas");
        c.width = c.height = sz;
        var m = Math.min(im.width, im.height),
          sx = (im.width - m) / 2,
          sy = (im.height - m) / 2;
        c.getContext("2d").drawImage(im, sx, sy, m, m, 0, 0, sz, sz);
        cb(c.toDataURL("image/jpeg", 0.85));
      };
      im.onerror = function () {
        toast("Could not read that image.");
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  // book cover: BUONG picture (walang crop), liliitan lang para kasya sa storage
  function shrinkCover(file, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var k = Math.min(1, 480 / Math.max(im.width, im.height)),
          c = document.createElement("canvas");
        c.width = Math.round(im.width * k);
        c.height = Math.round(im.height * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        cb(c.toDataURL("image/jpeg", 0.85));
      };
      im.onerror = function () {
        toast("Could not read that image.");
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function putCover(id, u) {
    COV[id] = u;
    try {
      localStorage.setItem("ustp-cov", JSON.stringify(COV));
    } catch (e) {}
    document
      .querySelectorAll('.cover[data-cid="' + id + '"]')
      .forEach(function (el) {
        var o = el.querySelector("img");
        if (o) o.remove();
        var im = new Image();
        im.alt = "";
        im.onload = function () {
          el.classList.add("has");
          el.style.setProperty("--img", 'url("' + u + '")');
          el.insertBefore(im, el.firstChild);
        };
        im.src = u;
      });
  }
  function showView(v) {
    ["login", "signup", "forgot"].forEach(function (x) {
      $("v-" + x).style.display = x === v ? "block" : "none";
    });
    ["lerr", "serr", "ferr"].forEach(function (x) {
      say(x, "");
    });
  }
  var C = {
    IT: ["#2F6FB5", "#0B1F4B"],
    Mathematics: ["#7B3FA0", "#3B1D54"],
    Science: ["#0F7A73", "#094A46"],
    History: ["#A8512F", "#5E2A14"],
    Filipino: ["#B8394A", "#5F1523"],
    Fiction: ["#1F7A4D", "#0E3F28"],
    Research: ["#4A5F82", "#232F45"],
    Reference: ["#B95C00", "#6A3500"],
  };
  var B = [
    ["001", "Python Crash Course", "Eric Matthes", "IT", "978-1593279288"],
    ["002", "Head First Java", "Kathy Sierra", "IT", "978-0596009205"],
    [
      "003",
      "Database System Concepts",
      "Abraham Silberschatz",
      "IT",
      "978-0078022159",
    ],
    [
      "004",
      "JavaScript: The Good Parts",
      "Douglas Crockford",
      "IT",
      "978-0596517748",
    ],
    [
      "005",
      "Introduction to Algorithms",
      "Thomas H. Cormen",
      "IT",
      "978-0262033848",
    ],
    [
      "006",
      "Calculus: Early Transcendentals",
      "James Stewart",
      "Mathematics",
      "978-1285741550",
    ],
    [
      "007",
      "Discrete Mathematics and Its Applications",
      "Kenneth H. Rosen",
      "Mathematics",
      "978-1259676512",
    ],
    [
      "008",
      "A Brief History of Time",
      "Stephen Hawking",
      "Science",
      "978-0553380163",
    ],
    ["009", "Cosmos", "Carl Sagan", "Science", "978-0345539434"],
    [
      "010",
      "History of the Filipino People",
      "Teodoro Agoncillo",
      "History",
      "",
    ],
    [
      "011",
      "Guns, Germs, and Steel",
      "Jared Diamond",
      "History",
      "978-0393317558",
    ],
    ["012", "Noli Me Tangere", "José Rizal", "Filipino", ""],
    ["013", "El Filibusterismo", "José Rizal", "Filipino", ""],
    [
      "014",
      "The Great Gatsby",
      "F. Scott Fitzgerald",
      "Fiction",
      "978-0743273565",
    ],
    ["015", "To Kill a Mockingbird", "Harper Lee", "Fiction", "978-0061120084"],
    [
      "016",
      "Research Design",
      "John W. Creswell",
      "Research",
      "978-1506386706",
    ],
    [
      "017",
      "Merriam-Webster’s Collegiate Dictionary",
      "Merriam-Webster",
      "Reference",
      "978-0877798095",
    ],
    [
      "018",
      "National Geographic Atlas of the World",
      "National Geographic",
      "Reference",
      "",
    ],
  ];
  var OUT = ["005", "011", "014"];
  (S.x || []).forEach(function (b) {
    B.push(b);
  });
  var ALL = B.slice(); // lahat ng libro (pati removed) para sa history
  B = B.filter(function (b) {
    return (S.rm || []).indexOf(b[0]) < 0;
  });
  var vres = "";
  var pendingWelcome = false;
  var fbSkip = {}; // feedback na "Maybe later" sa session na ito
  var cat = "All",
    q = "",
    avOnly = false; // "Available only" filter sa catalog
  var rd = { id: null, p: 0 },
    det = null; // rd = binabasa, det = book details
  var I = {
    bell: '<path d="M6 17V11a6 6 0 0112 0v6l2 2H4z"/><path d="M10 21h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    book: '<path d="M2 5c3-1 7-1 10 1 3-2 7-2 10-1v14c-3-1-7-1-10 1-3-2-7-2-10-1z"/><path d="M12 6v14"/>',
    borrow:
      '<path d="M4 5h9a3 3 0 013 3v11H7a3 3 0 01-3-3z"/><path d="M17 12h4"/><path d="M19 9l3 3-3 3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    ret: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    mark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    money:
      '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
    mega: '<path d="M3 10v4h4l8 5V5L7 10z"/><path d="M18 9a4 4 0 010 6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5"/><path d="M12 17h.01"/>',
  };
  // 4th item: "L" = librarian only, "S" = student only
  var R = [
    ["dashboard", "Dashboard", "home"],
    ["books", "Book Catalog", "book"],
    ["categories", "Categories", "grid", "S"],
    ["reservations", "Book Reservation", "mark"],
    ["borrowed", "My Borrowed Books", "ret", "S"],
    ["history", "Borrowing History", "clock", "S"],
    ["notifications", "Notifications", "bell"],
    ["announcements", "Announcements", "mega"],
    ["fines", "Fines", "money", "S"],
    ["profile", "My Profile", "user"],
    ["help", "Help", "help", "S"],
    ["lib", "Librarian Panel", "grid", "L"],
    ["loans", "Student Borrowers", "clock", "L"],
    ["manage", "Manage Books", "book", "L"],
    ["addbook", "Add Book", "borrow", "L"],
    ["verify", "Scan QR", "mark", "L"],
  ];
  var T = [
    ["books", "Book Catalog", "Search and borrow books", "#2F6FB5", "book"],
    [
      "reservations",
      "Book Reservation",
      "Reserve a borrowed book",
      "#A8512F",
      "mark",
    ],
    ["borrowed", "My Borrowed Books", "Due dates and QR", "#0F7A73", "ret"],
    ["history", "Borrowing History", "Past transactions", "#4A5F82", "clock"],
    [
      "notifications",
      "Notifications",
      "Replies, reminders and messages",
      "#B95C00",
      "bell",
    ],
    ["categories", "Categories", "Fiction, Science, IT", "#7B3FA0", "grid"],
    ["announcements", "Announcements", "Library news", "#1F7A4D", "mega"],
    ["profile", "My Profile", "Account information", "#B8394A", "user"],
  ];
  // librarian tiles (walang Categories: nasa Book Catalog na ang filter)
  var LIBTILES = [
    "books",
    "reservations",
    "notifications",
    "announcements",
    "profile",
  ];
  var svg = function (k) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + I[k] + "</svg>";
  };
  function find(id) {
    return ALL.filter(function (b) {
      return b[0] === id;
    })[0];
  }
  function isLib() {
    return !!(S.u && S.u.role === "Librarian");
  }
  // lahat ng hindi pa naibabalik (kahit sino ang nanghiram)
  function allActive() {
    return S.b.filter(function (r) {
      return !r.r && r.sc !== false;
    });
  }
  // records ng kasalukuyang student lang (librarian walang borrow)
  function my() {
    if (isLib() || !S.u) return [];
    return S.b.filter(function (r) {
      return r.u === S.u.un;
    });
  }
  function active() {
    return my().filter(function (r) {
      return !r.r;
    });
  }
  function mine(id) {
    return active().filter(function (r) {
      return r.id === id;
    })[0];
  }
  // naka-hiram ba ang libro (loan o naka-set na Not available)
  function isOut(id) {
    return (
      (OUT.indexOf(id) > -1 && (S.av || []).indexOf(id) < 0) ||
      allActive().some(function (r) {
        return r.id === id;
      })
    );
  }
  function status(id) {
    if (mine(id)) return "mine";
    return isOut(id) ? "out" : "in";
  }
  // ===== RESERVATIONS (isang student lang kada libro) =====
  function resOf(id) {
    return (S.rv || []).filter(function (x) {
      return x.id === id;
    })[0];
  }
  function myRes(id) {
    var r = resOf(id);
    return r && S.u && r.u === S.u.un ? r : null;
  }
  // naka-reserve ang libro para sa ibang student?
  function lockedForMe(id) {
    var r = resOf(id);
    return !!(r && !isLib() && S.u && r.u !== S.u.un);
  }
  function myReservations() {
    return (S.rv || []).filter(function (x) {
      return S.u && x.u === S.u.un;
    });
  }
  // automatic message sa student na nag-reserve kapag naibalik na ang libro
  function notifyReserver(id) {
    var r = resOf(id),
      b = find(id);
    if (!r || !b) return;
    msg(
      r.u,
      "Good news! " +
        b[1] +
        " is now available and ready for you. It is reserved for you, so no other student can borrow it. Please go to the library now: press Borrow in the Book Catalog, then show your QR code to " +
        PICKUP +
        ".",
    );
  }
  // students lang ang pwedeng mag-borrow at mag-reserve
  function stuOnly() {
    if (isLib()) {
      toast("Librarians cannot borrow or reserve books. Students only.");
      return true;
    }
    return false;
  }
  // mensahe papunta sa student (to = username o "all")
  function msg(to, m) {
    S.m = S.m || [];
    S.m.push({ to: to, t: iso(TODAY), m: m });
    if (S.m.length > 100) S.m.shift();
    save();
  }
  function inbox() {
    return (S.m || []).filter(function (x) {
      return !S.u || x.to === "all" || x.to === S.u.un;
    });
  }
  // ===== CONCERNS: reklamo / feedback ng student -> Notifications ng librarian =====
  var CTYPES = [
    ["system", "Problem with the system"],
    ["book", "Problem with a book"],
    ["request", "Question about my request"],
    ["suggest", "Suggestion"],
    ["other", "Other"],
  ];
  function ctype(k) {
    var t = CTYPES.filter(function (x) {
      return x[0] === k;
    })[0];
    return t ? t[1] : "Other";
  }
  function concerns() {
    return S.cm || [];
  }
  function openConcerns() {
    return concerns().filter(function (x) {
      return x.st === "open";
    });
  }
  function myConcerns() {
    return concerns().filter(function (x) {
      return S.u && x.u === S.u.un;
    });
  }
  function when(x) {
    return x.ts
      ? new Date(x.ts).toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          hour: "numeric",
          minute: "2-digit",
        })
      : F(x.d);
  }
  // bilang sa gilid ng menu (librarian lang)
  function badge(k, L) {
    var n = 0;
    if (L && k === "reservations") n = pendingAll().length;
    else if (L && k === "notifications") n = openConcerns().length;
    return n
      ? '<span class="badge" aria-label="' + n + ' waiting">' + n + "</span>"
      : "";
  }
  function showReply(i) {
    var x = (S.cm || [])[i];
    if (!x) return;
    var b = x.id && find(x.id);
    dlg(
      '<div class="qrbox" style="align-items:stretch;text-align:left"><h2 style="margin:0">Reply to ' +
        esc(x.n) +
        "</h2>" +
        '<p class="empty" style="padding:0"><strong>' +
        esc(ctype(x.ty)) +
        "</strong>" +
        (b ? " · " + esc(b[1]) : "") +
        "<br>“" +
        esc(x.m) +
        "”</p>" +
        '<textarea id="rp" class="in" rows="4" maxlength="300" aria-label="Your reply" placeholder="Write your reply to the student" style="min-height:96px;padding:10px 12px;resize:vertical"></textarea>' +
        '<div class="racts">' +
        btn("sendreply", i, "Send reply") +
        btn("closemd", "", "Cancel", 1) +
        "</div></div>",
    );
    setTimeout(function () {
      if ($("rp")) $("rp").focus();
    }, 50);
  }
  // pop-up sa librarian kapag may bagong message/reklamo galing sa student
  function checkLibAlert() {
    if (!S.u || !isLib() || $("md").className === "on") return;
    var l = concerns().filter(function (x) {
      return x.st === "open" && !x.seen;
    });
    if (!l.length) return;
    l.forEach(function (x) {
      x.seen = true;
    });
    save();
    var x = l[l.length - 1],
      b = x.id && find(x.id);
    dlg(
      '<div class="qrbox" style="align-items:stretch;text-align:left"><h2 style="margin:0">New message from a student</h2>' +
        '<p style="margin:0"><strong>' +
        esc(x.n) +
        "</strong> · " +
        esc(ctype(x.ty)) +
        (b ? " · " + esc(b[1]) : "") +
        "</p>" +
        '<p style="margin:0;padding:10px 12px;border-radius:10px;background:var(--bg);border:1px solid var(--line);line-height:1.5">“' +
        esc(x.m) +
        "”</p>" +
        (l.length > 1
          ? '<p class="empty" style="padding:0">+ ' +
            (l.length - 1) +
            " more new message(s).</p>"
          : "") +
        '<div class="racts">' +
        btn("gonotif", "", "Open Notifications") +
        btn("closemd", "", "Later", 1) +
        "</div></div>",
    );
  }
  // form ng student + listahan ng mga na-send niyang message
  function studentForm() {
    if (isLib()) return "";
    var opts = CTYPES.map(function (t) {
      return '<option value="' + t[0] + '">' + t[1] + "</option>";
    }).join("");
    var bks = B.map(function (b) {
      return '<option value="' + b[0] + '">' + esc(b[1]) + "</option>";
    }).join("");
    var list = myConcerns()
      .slice()
      .reverse()
      .map(function (x) {
        var b = x.id && find(x.id);
        return (
          '<div class="note"><span class="nd"></span><p><strong>' +
          esc(ctype(x.ty)) +
          "</strong>" +
          (b ? " · " + esc(b[1]) : "") +
          "<small>" +
          F(x.d) +
          "</small><br>“" +
          esc(x.m) +
          "”<br>" +
          (x.st === "open"
            ? '<span class="pill me2">Waiting for the librarian</span>'
            : '<span class="pill ok">Answered</span>' +
              (x.rp
                ? '<br><span style="color:var(--mut)">Librarian: ' +
                  esc(x.rp) +
                  "</span>"
                : "")) +
          "</p></div>"
        );
      })
      .join("");
    return (
      '<div class="box"><h2>Send a message to the librarian</h2><p class="empty" style="padding:0 0 12px">Report a problem with the system or a book, ask about your request, or send a suggestion. The librarian will see it right away.</p>' +
      '<label>What is it about?<select id="ct" class="in">' +
      opts +
      "</select></label>" +
      '<label>Book (required for book problems)<select id="cb" class="in"><option value="">None</option>' +
      bks +
      "</select></label>" +
      '<label>Your message<textarea id="cmsg" class="in" rows="4" maxlength="400" placeholder="Describe what happened or what you need" style="min-height:96px;padding:10px 12px;resize:vertical"></textarea></label>' +
      btn("sendconcern", "", "Send to librarian") +
      "</div>" +
      '<div class="box"><h2>My messages</h2>' +
      (list || '<p class="empty">You have not sent any messages yet.</p>') +
      "</div>"
    );
  }
  function allAnn() {
    return (S.ann || []).concat(ANN);
  }
  // requests ng students (borrow) para sa librarian
  function myPending() {
    return (S.q || []).filter(function (x) {
      return S.u && x.u === S.u.un && x.st === "pending" && x.ty !== "reserve";
    });
  }
  function hasPending(id) {
    return myPending().some(function (x) {
      return x.id === id;
    });
  }
  function pendingAll() {
    return (S.q || []).filter(function (x) {
      return x.st === "pending" && x.ty !== "reserve";
    });
  }
  function dlg(html) {
    $("mdb").innerHTML = html;
    $("md").className = "on";
  }
  function rulesHtml() {
    return (
      '<ul style="margin:0;padding-left:20px;line-height:1.7;text-align:left">' +
      "<li>Return the book in person to the librarian on or before the due date.</li>" +
      "<li>Late return: " +
      peso(FINE) +
      " penalty for each borrowed book.</li>" +
      "<li>Lost or damaged book: you must pay " +
      peso(LOST) +
      " for each book.</li>" +
      "<li>Penalty payments go to the school (school funds and school events).</li></ul>"
    );
  }
  // note sa Book Catalog: sino ang hahanapin pag kukunin ang libro
  function pickupNote() {
    if (isLib()) return "";
    return (
      '<div class="warn"><strong>Where to get your book:</strong> After the librarian approves your request, go to <strong>' +
      PICKUP +
      "</strong> and show your QR code to get your book.</div>"
    );
  }
  // welcome message + guidelines kapag nag-login ang student
  function showWelcome() {
    dlg(
      '<div class="qrbox" style="align-items:stretch;text-align:left"><h2 style="margin:0">Welcome, ' +
        esc(S.u.name) +
        "!</h2>" +
        '<p class="empty" style="padding:0">Thank you for using the USTP Library System. Please read the guidelines first:</p>' +
        '<ul style="margin:0;padding-left:20px;line-height:1.7">' +
        "<li>You can borrow up to <strong>3 books</strong> at a time.</li>" +
        "<li>Loan period is <strong>7 days</strong>.</li>" +
        "<li>Press <strong>Borrow</strong> in the Book Catalog and send a message to the librarian.</li>" +
        "<li>After approval, go to <strong>" +
        PICKUP +
        "</strong> and show your QR code (My Borrowed Books &gt; Show QR).</li>" +
        "<li>If a book is not available, press <strong>Reserve</strong>. When it is returned, you will get a message and only you can borrow it. One student per book.</li>" +
        "<li>Return books in person to the librarian on or before the due date.</li>" +
        "<li>Late return: " +
        peso(FINE) +
        " per book.</li>" +
        "<li>Lost or damaged book: " +
        peso(LOST) +
        " per book.</li>" +
        "<li>Found a problem or want to suggest something? Send a message to the librarian in <strong>Notifications</strong>.</li></ul>" +
        btn("closemd", "", "I understand") +
        "</div>",
    );
  }
  // ===== FEEDBACK + STAR RATING =====
  function stars(n) {
    return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  }
  function dur(ms) {
    var s = Math.max(1, Math.round(ms / 1000));
    if (s < 60) return s + " second" + (s > 1 ? "s" : "");
    var m = Math.floor(s / 60);
    if (m < 60) {
      var r = s % 60;
      return (
        m +
        " minute" +
        (m > 1 ? "s" : "") +
        (r ? " " + r + " second" + (r > 1 ? "s" : "") : "")
      );
    }
    var h = Math.floor(m / 60);
    m = m % 60;
    return (
      h +
      " hour" +
      (h > 1 ? "s" : "") +
      (m ? " " + m + " minute" + (m > 1 ? "s" : "") : "")
    );
  }
  function showFeedback(i) {
    var x = S.q[i],
      b = find(x.id),
      st = "";
    for (var n = 1; n <= 5; n++) {
      st +=
        '<button data-a="star" data-id="' +
        i +
        '" data-n="' +
        n +
        '" aria-label="' +
        n +
        ' star" style="border:0;background:none;cursor:pointer;font-size:44px;line-height:1;padding:4px;min-height:48px;color:#c3cad9">★</button>';
    }
    dlg(
      '<div class="qrbox" style="align-items:stretch;text-align:center"><h2 style="margin:0">Your request was approved!</h2>' +
        '<p style="margin:0">Your request for <strong>' +
        esc(b ? b[1] : x.id) +
        "</strong> was approved in <strong>" +
        dur(x.at - x.ts) +
        "</strong>.</p>" +
        '<p style="margin:0"><strong>How is the system and our fast service to students?</strong></p>' +
        '<div style="display:flex;justify-content:center;gap:2px">' +
        st +
        "</div>" +
        '<p class="empty" style="padding:0;text-align:center">Tap a star to rate: 1 = poor, 5 = excellent</p>' +
        btn("fblater", i, "Maybe later", 1) +
        "</div>",
    );
  }
  // lalabas automatic kapag approved na ang request at wala pa siyang rating
  function checkFeedback() {
    if (!S.u || isLib() || pendingWelcome) return;
    if ($("md").className === "on") return;
    var l = S.q || [];
    for (var i = 0; i < l.length; i++) {
      var x = l[i];
      if (
        x.u === S.u.un &&
        x.ty === "borrow" &&
        x.st === "approved" &&
        x.ts &&
        x.at &&
        !x.fb &&
        !fbSkip[i]
      ) {
        showFeedback(i);
        return;
      }
    }
  }
  function showBorrowBox(id) {
    var b = find(id);
    dlg(
      '<div class="qrbox" style="align-items:stretch;text-align:left"><h2 style="margin:0">Approach message</h2>' +
        '<p class="empty" style="padding:0">Write a message to the librarian for <strong>' +
        esc(b[1]) +
        "</strong>. The librarian will decide if you can borrow it.</p>" +
        '<textarea id="bm" class="in" rows="4" maxlength="300" aria-label="Message to the librarian" placeholder="Example: Good day! I would like to borrow this book for my project." style="min-height:96px;padding:10px 12px;resize:vertical"></textarea>' +
        '<div class="racts">' +
        btn("sendborrow", id, "Send message") +
        btn("closemd", "", "Cancel", 1) +
        "</div></div>",
    );
    setTimeout(function () {
      if ($("bm")) $("bm").focus();
    }, 50);
  }
  function showSent(b) {
    var due = iso(new Date(TODAY.getTime() + 7 * DAY));
    dlg(
      '<div class="qrbox" style="align-items:stretch;text-align:left"><h2 style="margin:0">Message sent to the librarian</h2>' +
        '<p class="empty" style="padding:0">Your request for <strong>' +
        esc(b[1]) +
        "</strong> is waiting for the librarian’s decision. You will get a reply in Notifications.</p>" +
        '<p style="margin:0"><strong>Pick-up:</strong> if approved, go to <strong>' +
        PICKUP +
        "</strong> and show your QR code.</p>" +
        '<p style="margin:0"><strong>Return date:</strong> if the librarian scans your QR today, return it on or before <strong>' +
        F(due) +
        "</strong> (7 days).</p>" +
        '<p style="margin:0"><strong>Rules:</strong></p>' +
        rulesHtml() +
        btn("closemd", "", "I understand") +
        "</div>",
    );
  }
  // QR: transaction code at pop-up na QR lang ang makikita
  function tcode(r) {
    return (
      "TXN-" +
      r.id +
      "-" +
      r.d.replace(/-/g, "") +
      "-" +
      (r.u || "demo").toUpperCase()
    );
  }
  function showQR(r) {
    var b = find(r.id),
      who = r.n || (S.u && S.u.name) || "Student";
    var txt =
      "USTP-LIB|BORROW|" +
      who +
      "|" +
      r.id +
      "|" +
      b[1] +
      "|" +
      r.d +
      "|" +
      r.due +
      "|" +
      tcode(r);
    dlg(
      '<div class="qrbox">' +
        qrSvg(txt, 280) +
        '<button class="btn" data-a="closemd" data-id="">Close</button></div>',
    );
  }
  var COV = {},
    TRY = {};
  try {
    COV = JSON.parse(localStorage.getItem("ustp-cov") || "{}");
  } catch (e) {}
  function cover(b) {
    var c = C[b[3]],
      u = COV[b[0]];
    return (
      '<div class="cover' +
      (u ? " has" : "") +
      '" data-cid="' +
      b[0] +
      '" style="--a:' +
      c[0] +
      ";--b:" +
      c[1] +
      (u ? ";--img:url('" + u + "')" : "") +
      '">' +
      (u
        ? '<img src="' +
          u +
          '" alt="Cover of ' +
          esc(b[1]) +
          '" onerror="this.parentNode.classList.remove(\'has\');this.remove()">'
        : "") +
      "<small>" +
      b[3] +
      "</small><span>" +
      b[1] +
      "</span><em>No. " +
      b[0] +
      "</em></div>"
    );
  }
  function setCov(id, u) {
    document
      .querySelectorAll('.cover[data-cid="' + id + '"]')
      .forEach(function (el) {
        if (el.querySelector("img")) return;
        var im = new Image();
        im.alt = "";
        im.onload = function () {
          el.classList.add("has");
          el.style.setProperty("--img", 'url("' + u + '")');
          el.insertBefore(im, el.firstChild);
        };
        im.src = u;
      });
  }
  function saveCov(id, u) {
    COV[id] = u;
    try {
      localStorage.setItem("ustp-cov", JSON.stringify(COV));
    } catch (e) {}
    setCov(id, u);
  }
  function remote(b) {
    fetch(
      "https://openlibrary.org/search.json?title=" +
        encodeURIComponent(b[1]) +
        "&author=" +
        encodeURIComponent(b[2]) +
        "&limit=1&fields=cover_i",
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        var d = j.docs && j.docs[0];
        if (d && d.cover_i)
          saveCov(
            b[0],
            "https://covers.openlibrary.org/b/id/" +
              d.cover_i +
              "-M.jpg?default=false",
          );
      })
      .catch(function () {});
  }
  function loadCovers() {
    B.forEach(function (b) {
      var id = b[0];
      if (COV[id] || TRY[id]) return;
      TRY[id] = 1;
      var p = "covers/" + id + ".jpg",
        t = new Image();
      t.onload = function () {
        saveCov(id, p);
      };
      t.onerror = function () {
        remote(b);
      };
      t.src = p;
    });
  }
  function btn(a, id, l, g) {
    return (
      '<button class="btn' +
      (g ? " ghost" : "") +
      '" data-a="' +
      a +
      '" data-id="' +
      id +
      '">' +
      l +
      "</button>"
    );
  }
  // maliit na button para sa mga table / listahan ng librarian
  function sbtn(a, id, l, g) {
    return btn(a, id, l, g).replace('class="btn', 'class="sm btn');
  }
  function pill(id) {
    var s = status(id);
    if (s === "in" && lockedForMe(id))
      return '<span class="pill no">Reserved for another student</span>';
    if (s === "in" && myRes(id))
      return '<span class="pill ok">Ready for you</span>';
    return s === "in"
      ? '<span class="pill ok">Available</span>'
      : s === "mine"
        ? mine(id).sc === false
          ? '<span class="pill me2">Approved: show QR to librarian</span>'
          : '<span class="pill me2">Borrowed by you</span>'
        : '<span class="pill no">Not available</span>';
  }
  // Borrow + Reserve buttons nasa card na (student lang)
  function card(b) {
    var id = b[0],
      s = status(id),
      actions;
    if (s === "mine") {
      actions =
        '<div class="acts">' +
        btn("qr", id, "Show QR") +
        '<button class="btn ghost" disabled>' +
        (mine(id).sc === false ? "Pick-up" : "Borrowed") +
        "</button></div>";
    } else {
      var lock = isLib();
      var bor =
        s === "in" && !lock && !lockedForMe(id)
          ? btn("borrow", id, "Borrow")
          : '<button class="btn" disabled>Borrow</button>';
      var res =
        lock || s === "in"
          ? '<button class="btn ghost" disabled>Reserve</button>'
          : myRes(id)
            ? btn("unres", id, "Cancel", 1)
            : resOf(id)
              ? '<button class="btn ghost" disabled>Reserved</button>'
              : btn("res", id, "Reserve", 1);
      actions = '<div class="acts">' + bor + res + "</div>";
    }
    return (
      '<article class="bk"><button class="cb" data-a="view" data-id="' +
      id +
      '" aria-label="View details of ' +
      b[1] +
      '">' +
      cover(b) +
      "</button><h3>" +
      b[1] +
      "</h3><p>" +
      b[2] +
      "</p>" +
      pill(id) +
      actions +
      "</article>"
    );
  }
  function daysLeft(r) {
    return Math.round((P(r.due) - TODAY) / DAY);
  }
  // PHP 20 kada libro kapag late (hindi per day)
  function fine(r) {
    if (r.sc === false) return 0;
    var end = r.r ? P(r.r) : TODAY;
    return end > P(r.due) ? FINE : 0;
  }
  function head(t, s) {
    return '<div class="ban"><h1>' + t + "</h1><p>" + s + "</p></div>";
  }
  var CI = {
    IT: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    Mathematics:
      '<path d="M4 7h6M7 4v6"/><path d="M14 7h6"/><path d="M4 17h6"/><path d="M14 14l6 6M20 14l-6 6"/>',
    Science:
      '<path d="M9 3h6M10 3v6L4 19a2 2 0 002 3h12a2 2 0 002-3l-6-10V3"/>',
    History:
      '<path d="M3 21h18M5 21V10M10 21V10M14 21V10M19 21V10M3 10l9-6 9 6"/>',
    Filipino:
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    Fiction:
      '<path d="M12 3l2.5 6 6.5.5-5 4.3 1.6 6.4L12 17l-5.6 3.2L8 13.8 3 9.5l6.5-.5z"/>',
    Research: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    Reference: I.book,
  };
  var ANN = [
    [
      "Library closed on Nov 30",
      "Holiday break. Regular hours resume the next day.",
    ],
    ["New arrivals", "Fresh IT and Research titles are now in the catalog."],
    [
      "Return reminder",
      "Please return borrowed books on or before the due date.",
    ],
  ];
  function note(m) {
    S.n = S.n || [];
    S.n.push({ t: iso(TODAY), m: m });
    if (S.n.length > 40) S.n.shift();
  }
  function reserve(id) {
    var b = find(id);
    if (!b || !S.u) return;
    if (status(id) !== "out") {
      toast("This book is available. You can borrow it now.");
      return;
    }
    if (resOf(id)) {
      toast(
        myRes(id)
          ? "You already reserved this book."
          : "Sorry, this book is already reserved by another student.",
      );
      return;
    }
    S.rv.push({ id: id, u: S.u.un, n: S.u.name, d: iso(TODAY) });
    note("Reserved " + b[1] + ". We will message you when it is returned.");
    save();
    toast("Reserved: " + b[1]);
  }
  function stPill(st) {
    return st === "pending"
      ? '<span class="pill me2">Pending</span>'
      : st === "approved"
        ? '<span class="pill ok">Approved</span>'
        : st === "cancelled"
          ? '<span class="pill no">Cancelled</span>'
          : st === "na"
            ? '<span class="pill no">Not available</span>'
            : '<span class="pill no">Reserved by someone else</span>';
  }
  // Book Requests ng librarian: kasama na ang libro AT ang message ng student
  function reqRows(mode) {
    var l = (S.q || [])
      .map(function (x, i) {
        return [x, i];
      })
      .filter(function (p) {
        return (
          p[0].ty !== "reserve" &&
          (p[0].st === "pending") === (mode === "pending")
        );
      })
      .reverse();
    return (
      l
        .map(function (p) {
          var x = p[0],
            i = p[1],
            b = find(x.id);
          return (
            '<div class="row" style="align-items:flex-start">' +
            (b ? cover(b) : "") +
            '<div class="t"><strong>' +
            esc(x.n) +
            "</strong> wants to borrow<br><strong>" +
            esc(b ? b[1] : x.id) +
            "</strong>" +
            (b
              ? ' <span style="color:var(--mut)">by ' + esc(b[2]) + "</span>"
              : "") +
            '<div style="margin:8px 0;padding:10px 12px;border-radius:10px;background:var(--bg);border:1px solid var(--line);line-height:1.5"><small style="color:var(--mut);display:block;margin-bottom:2px">Message from the student</small>“' +
            esc(x.m) +
            "”</div>" +
            '<small style="color:var(--mut)">' +
            when(x) +
            "</small> " +
            stPill(x.st) +
            "</div>" +
            (x.st === "pending"
              ? '<div class="racts">' +
                sbtn("qok", i, "Approve") +
                sbtn("qna", i, "Not available", 1) +
                sbtn("qtk", i, "Reserved already", 1) +
                "</div>"
              : "") +
            "</div>"
          );
        })
        .join("") ||
      '<p class="empty">' +
        (mode === "pending"
          ? "No requests waiting for your decision."
          : "No past requests yet.") +
        "</p>"
    );
  }
  function reminders() {
    var out = [];
    // mga mensahe galing sa librarian
    inbox()
      .slice()
      .reverse()
      .forEach(function (x) {
        out.push({ m: "Librarian (" + F(x.t) + "): " + x.m });
      });
    myPending().forEach(function (x) {
      var b = find(x.id);
      if (b)
        out.push({
          m:
            "Waiting for the librarian to review your request for " +
            b[1] +
            ".",
        });
    });
    active().forEach(function (r) {
      var b = find(r.id),
        d = daysLeft(r);
      if (r.sc === false) {
        out.push({
          m:
            "Approved: " +
            b[1] +
            ". Go to " +
            PICKUP +
            " and show your QR code to pick it up.",
        });
        return;
      }
      if (d < 0)
        out.push({
          m:
            b[1] +
            " is overdue by " +
            -d +
            " day(s). Penalty: " +
            peso(FINE) +
            " for this book. Please return it to the librarian.",
        });
      else if (d === 0) out.push({ m: b[1] + " is due today." });
      else if (d <= 2)
        out.push({
          m: b[1] + " is due in " + d + " day(s), on " + F(r.due) + ".",
        });
      else
        out.push({
          m: b[1] + " is due on " + F(r.due) + " (" + d + " days left).",
        });
    });
    myReservations().forEach(function (r) {
      var b = find(r.id);
      if (!b) return;
      out.push(
        status(r.id) === "in"
          ? {
              m:
                "Ready for you: " +
                b[1] +
                " is now available. It is reserved for you. Go to the library and borrow it.",
            }
          : {
              m:
                "You reserved " +
                b[1] +
                ". We will message you when it is returned.",
            },
      );
    });
    return out;
  }
  function unread() {
    if (isLib()) return openConcerns().length;
    var over = active().filter(function (r) {
      return r.sc !== false && daysLeft(r) < 0;
    }).length;
    return (
      over +
      Math.max(0, (S.n || []).length - (S.seen || 0)) +
      Math.max(0, inbox().length - (S.seenm || 0))
    );
  }
  var V = {
    dashboard: function () {
      var L = isLib(),
        al = allActive(),
        A = L ? al : active();
      var annBox =
        '<div class="box"><h2>Announcements <a class="more" href="#announcements">View all</a></h2>' +
        allAnn()
          .slice(0, 2)
          .map(function (x) {
            return (
              '<div class="row"><div class="t"><strong>' +
              esc(x[0]) +
              '</strong><br><span style="color:var(--mut)">' +
              esc(x[1]) +
              "</span></div></div>"
            );
          })
          .join("") +
        "</div>";
      var picked = L
          ? []
          : active().filter(function (r) {
              return r.sc !== false;
            }),
        waiting = L
          ? []
          : active().filter(function (r) {
              return r.sc === false;
            });
      var side;
      if (L) {
        side =
          '<div class="warn">Pending student requests: <strong>' +
          pendingAll().length +
          '</strong> <a href="#reservations">Review</a></div>' +
          '<div class="warn">Open student messages: <strong>' +
          openConcerns().length +
          '</strong> <a href="#notifications">Open</a></div>' +
          annBox;
      } else {
        var loanRow = function (r) {
          var bk = find(r.id),
            d = daysLeft(r);
          if (!bk) return "";
          return (
            '<div class="row"><div style="width:64px;flex:none">' +
            cover(bk) +
            '</div><div class="t"><strong>' +
            esc(bk[1]) +
            '</strong><br><span style="color:var(--mut)">Due ' +
            F(r.due) +
            "</span><br>" +
            (d < 0
              ? '<span class="pill no">Overdue by ' + -d + " day(s)</span>"
              : '<span class="pill ' +
                (d <= 2 ? "no" : "ok") +
                '">' +
                (d === 0 ? "Due today" : d + " day(s) left") +
                "</span>") +
            "</div></div>"
          );
        };
        var waitRow = function (r) {
          var bk = find(r.id);
          if (!bk) return "";
          return (
            '<div class="row"><div style="width:64px;flex:none">' +
            cover(bk) +
            '</div><div class="t"><strong>' +
            esc(bk[1]) +
            '</strong><br><span class="pill me2">Approved: show QR to the librarian</span></div><div class="racts">' +
            btn("qr", r.id, "Show QR", 1) +
            "</div></div>"
          );
        };
        side =
          (waiting.length
            ? '<div class="warn">Ready for pick-up: <strong>' +
              waiting.length +
              "</strong> book(s). Show your QR code to <strong>" +
              esc(PICKUP) +
              "</strong>.</div>"
            : "") +
          '<div class="box"><h2>Currently Borrowed <a class="more" href="#borrowed">View all</a></h2>' +
          (picked.map(loanRow).join("") + waiting.map(waitRow).join("") ||
            '<p class="empty">No borrowed books. <a href="#books">Browse books</a></p>') +
          "</div>" +
          annBox;
      }
      var avail = B.filter(function (x) {
        return status(x[0]) === "in" && !lockedForMe(x[0]);
      })
        .slice(0, 6)
        .map(function (b) {
          return (
            '<button class="cb" data-a="view" data-id="' +
            b[0] +
            '" aria-label="View details of ' +
            esc(b[1]) +
            '">' +
            cover(b) +
            "</button>"
          );
        })
        .join("");
      var tiles = T.filter(function (t) {
        return !L || LIBTILES.indexOf(t[0]) > -1;
      })
        .map(function (t) {
          var nm = t[1],
            sub = t[2];
          if (L && t[0] === "reservations") {
            nm = "Book Requests";
            sub = "Approve or decline borrowers";
          }
          if (L && t[0] === "notifications") {
            sub = "Student messages and complaints";
          }
          return (
            '<a class="tile" href="#' +
            t[0] +
            '" style="background:' +
            t[3] +
            '">' +
            svg(t[4]) +
            "<span>" +
            nm +
            "<small>" +
            sub +
            "</small></span></a>"
          );
        })
        .join("");
      var availN = B.filter(function (x) {
        return status(x[0]) === "in";
      }).length;
      var fineTotal = my().reduce(function (s, r) {
        return s + fine(r);
      }, 0);
      var stats = (
        L
          ? [
              ["Total Books", B.length],
              ["Available", availN],
              ["Borrowed now", A.length],
              [
                "Overdue",
                A.filter(function (r) {
                  return daysLeft(r) < 0;
                }).length,
              ],
            ]
          : [
              ["Available books", availN],
              ["Borrowed now", picked.length],
              ["Requests / pick-up", myPending().length + waiting.length],
              ["Fines (PHP)", fineTotal],
            ]
      )
        .map(function (s) {
          return (
            '<div class="box st"><b data-n="' +
            s[1] +
            '">' +
            s[1] +
            "</b><span>" +
            s[0] +
            "</span></div>"
          );
        })
        .join("");
      return (
        '<div class="ban"><h1>Welcome back, ' +
        (S.u ? esc(S.u.name) : "Student") +
        '</h1><p>What would you like to do in the library today?</p></div><div class="stats">' +
        stats +
        '</div><div class="cols"><section><div class="tiles">' +
        tiles +
        '</div><div class="box" style="margin-top:16px"><h2>Available Books <a class="more" href="#books">View all</a></h2><div class="strip">' +
        (avail || '<p class="empty">No books are available right now.</p>') +
        "</div></div></section><aside>" +
        side +
        "</aside></div>"
      );
    },
    books: function () {
      var n = active().length;
      var l = B.filter(function (b) {
        return (
          (cat === "All" || b[3] === cat) &&
          (!avOnly || status(b[0]) === "in") &&
          (!q ||
            (b[1] + b[2] + b[0]).toLowerCase().indexOf(q.toLowerCase()) > -1)
        );
      });
      var ch = ["All"]
        .concat(Object.keys(C))
        .map(function (c) {
          return (
            '<button class="chip" aria-pressed="' +
            (c === cat) +
            '" data-a="cat2" data-id="' +
            c +
            '">' +
            c +
            "</button>"
          );
        })
        .join("");
      return (
        head(
          "Book Catalog",
          isLib()
            ? "Browse the catalog. Only students can borrow or reserve books."
            : "Search, then send a borrow message to the librarian or reserve a book. You have " +
                n +
                " of 3 allowed books. Loan period is 7 days.",
        ) +
        pickupNote() +
        '<div class="chips">' +
        ch +
        '<button class="chip" aria-pressed="' +
        avOnly +
        '" data-a="avf" data-id="">Available only</button></div><p class="empty">' +
        l.length +
        ' book(s) found</p><div class="grid">' +
        (l.map(card).join("") ||
          '<p class="empty">No books match your search.</p>') +
        "</div>"
      );
    },
    borrowed: function () {
      var a = active();
      return (
        head(
          "My Borrowed Books",
          "Books you currently have and the date to return them. Return books in person to the librarian.",
        ) +
        '<div class="box">' +
        (a
          .map(function (r) {
            var b = find(r.id),
              d = daysLeft(r);
            var st =
              r.sc === false
                ? '<span class="pill me2">Approved: show QR to the librarian</span>'
                : d < 0
                  ? '<span class="pill no">Overdue by ' + -d + " day(s)</span>"
                  : '<span class="pill ' +
                    (d <= 2 ? "no" : "ok") +
                    '">' +
                    d +
                    " day(s) left</span>";
            return (
              '<div class="row">' +
              cover(b) +
              '<div class="t"><strong>' +
              b[1] +
              '</strong><br><span style="color:var(--mut)">' +
              (r.sc === false
                ? "Approved " +
                  F(r.d) +
                  " · due date starts when the librarian scans your QR"
                : "Borrowed " + F(r.d) + " · Due " + F(r.due)) +
              "</span><br>" +
              st +
              '</div><div class="racts">' +
              btn("qr", r.id, "Show QR", 1) +
              "</div></div>"
            );
          })
          .join("") ||
          '<p class="empty">You have no borrowed books. <a href="#books">Browse the catalog</a></p>') +
        "</div>"
      );
    },
    categories: function () {
      return (
        head("Categories", "Pick a category to see its books.") +
        '<div class="cats">' +
        Object.keys(C)
          .map(function (k) {
            var n = B.filter(function (b) {
              return b[3] === k;
            }).length;
            return (
              '<button class="cat" style="background:linear-gradient(135deg,' +
              C[k][0] +
              "d9," +
              C[k][1] +
              "e6),url(img/cat-" +
              k +
              ".jpg) center/cover,linear-gradient(135deg," +
              C[k][0] +
              "," +
              C[k][1] +
              ')" data-a="cat" data-id="' +
              k +
              '"><svg class="cico" viewBox="0 0 24 24" aria-hidden="true">' +
              (CI[k] || I.book) +
              "</svg><span>" +
              k +
              "<small>" +
              n +
              (n === 1 ? " book" : " books") +
              "</small></span></button>"
            );
          })
          .join("") +
        "</div>"
      );
    },
    history: function () {
      var l = my().reverse();
      return (
        head("Borrowing History", "Every book you have borrowed.") +
        '<div class="box wrap"><table><tr><th>Book ID</th><th>Title</th><th>Borrowed</th><th>Due</th><th>Status</th><th>Fine</th></tr>' +
        (l
          .map(function (r) {
            return (
              "<tr><td>" +
              r.id +
              "</td><td>" +
              find(r.id)[1] +
              "</td><td>" +
              F(r.d) +
              "</td><td>" +
              F(r.due) +
              "</td><td>" +
              (r.r
                ? "Returned " + F(r.r)
                : r.sc === false
                  ? "Waiting for pick-up"
                  : "Borrowed") +
              "</td><td>" +
              peso(fine(r)) +
              "</td></tr>"
            );
          })
          .join("") || '<tr><td colspan="6">No records yet.</td></tr>') +
        "</table></div>"
      );
    },
    reservations: function () {
      // LIBRARIAN: bawat request may libro + message ng student, ikaw ang magdedesisyon
      if (isLib())
        return (
          head(
            "Book Requests",
            "Each request shows the book and the student’s message. Decide if the book can be borrowed. Only students can borrow.",
          ) +
          '<div class="box"><h2>Waiting for your decision (' +
          pendingAll().length +
          ")</h2>" +
          reqRows("pending") +
          '</div><div class="box"><h2>Past requests</h2>' +
          reqRows("done") +
          "</div>"
        );
      var mineRows = myReservations()
        .map(function (r) {
          var id = r.id,
            b = find(id),
            ok = status(id) === "in";
          if (!b) return "";
          return (
            '<div class="row">' +
            cover(b) +
            '<div class="t"><strong>' +
            b[1] +
            '</strong><br><span style="color:var(--mut)">' +
            b[2] +
            "</span><br>" +
            (ok
              ? '<span class="pill ok">Ready for you. Go borrow it now.</span>'
              : '<span class="pill no">Waiting for return</span>') +
            '</div><div class="racts">' +
            (ok ? btn("borrow", id, "Borrow") : "") +
            btn("unres", id, "Cancel", 1) +
            "</div></div>"
          );
        })
        .join("");
      var myQ = (S.q || [])
        .filter(function (x) {
          return S.u && x.u === S.u.un && x.ty !== "reserve";
        })
        .reverse()
        .map(function (x) {
          var b = find(x.id);
          return (
            '<div class="row"><div class="t"><strong>' +
            esc(b ? b[1] : x.id) +
            '</strong><br><span style="color:var(--mut)">Borrow request · sent ' +
            F(x.d) +
            "</span><br>" +
            stPill(x.st) +
            "</div></div>"
          );
        })
        .join("");
      // mga libro na hiniram ng ibang student at pwede pang i-reserve
      var canRes = B.filter(function (b) {
        return status(b[0]) === "out";
      })
        .map(function (b) {
          var id = b[0],
            right = myRes(id)
              ? '<span class="pill ok">You reserved this</span>'
              : resOf(id)
                ? '<span class="pill no">Already reserved by another student</span>'
                : '<span class="pill no">Borrowed by someone</span>';
          return (
            '<div class="row">' +
            cover(b) +
            '<div class="t"><strong>' +
            b[1] +
            '</strong><br><span style="color:var(--mut)">' +
            b[2] +
            "</span><br>" +
            right +
            '</div><div class="racts">' +
            (myRes(id)
              ? btn("unres", id, "Cancel", 1)
              : resOf(id)
                ? '<button class="btn ghost" disabled>Reserved</button>'
                : btn("res", id, "Reserve")) +
            "</div></div>"
          );
        })
        .join("");
      return (
        head(
          "Book Reservation",
          "Want a book that someone else borrowed? Press Reserve and we will message you when it is returned.",
        ) +
        '<div class="box"><h2>How it works</h2><ol style="margin:0;padding-left:22px;line-height:1.9"><li>Find a book below that is borrowed by someone.</li><li>Press <strong>Reserve</strong>. Only one student can reserve each book.</li><li>When the librarian marks it Available, you get a message right away.</li><li>The book is saved for you. No other student can borrow it. Go to the library and borrow it.</li></ol></div>' +
        '<div class="box"><h2>My reservations</h2>' +
        (mineRows || '<p class="empty">You have no reservations yet.</p>') +
        "</div>" +
        '<div class="box"><h2>Books you can reserve</h2>' +
        (canRes ||
          '<p class="empty">All books are available right now. Nothing to reserve.</p>') +
        "</div>" +
        '<div class="box"><h2>My borrow requests</h2>' +
        (myQ || '<p class="empty">No borrow requests yet.</p>') +
        "</div>"
      );
    },
    fines: function () {
      var l = my().filter(function (r) {
          return fine(r) > 0;
        }),
        t = l.reduce(function (s, r) {
          return s + fine(r);
        }, 0);
      return (
        head(
          "Fines",
          "Late return penalty is " +
            peso(FINE) +
            " for each borrowed book. Lost or damaged book: " +
            peso(LOST) +
            " each.",
        ) +
        '<div class="warn">Outstanding Fines: <strong>' +
        peso(t) +
        '</strong></div><div class="box"><h2>Instructions</h2><p style="color:var(--mut);line-height:1.6;margin:0 0 10px">The money you pay for penalties goes to the school. It is used for school funds and for events that will happen in school.</p>' +
        rulesHtml() +
        '</div><div class="box wrap"><table><tr><th>Book</th><th>Due</th><th>Returned</th><th>Fine</th></tr>' +
        (l
          .map(function (r) {
            return (
              "<tr><td>" +
              find(r.id)[1] +
              "</td><td>" +
              F(r.due) +
              "</td><td>" +
              (r.r ? F(r.r) : "Not yet") +
              "</td><td>" +
              peso(fine(r)) +
              "</td></tr>"
            );
          })
          .join("") || '<tr><td colspan="4">No fines. Keep it up!</td></tr>') +
        "</table></div>"
      );
    },
    announcements: function () {
      return (
        head("Announcements", "Latest from the library.") +
        '<div class="box">' +
        allAnn()
          .map(function (x) {
            return (
              '<div class="row"><div class="t"><strong>' +
              esc(x[0]) +
              '</strong><br><span style="color:var(--mut)">' +
              esc(x[1]) +
              "</span></div></div>"
            );
          })
          .join("") +
        "</div>"
      );
    },
    addbook: function () {
      if (!isLib())
        return head(
          "Add Book",
          "Librarian access only. Log out and sign in as Librarian.",
        );
      return (
        head(
          "Add Book",
          "Add a new book to the catalog. All students will be notified.",
        ) +
        '<div class="box" style="max-width:480px;display:grid;gap:12px"><label>Title<br><input id="nt" class="in"></label><label>Author<br><input id="na" class="in"></label><label>ISBN (optional)<br><input id="ni" class="in"></label><label>Cover picture (optional, the whole picture is shown)<br><input id="nf" type="file" accept="image/*" class="in" style="padding-top:10px"></label><label>Category<br><select id="nc" class="in">' +
        Object.keys(C)
          .map(function (k) {
            return "<option>" + k + "</option>";
          })
          .join("") +
        "</select></label>" +
        btn("add", "", "Add book") +
        "</div>"
      );
    },
    // ===== LIBRARIAN VIEWS =====
    lib: function () {
      if (!isLib()) return head("Librarian Panel", "Librarian access only.");
      var al = allActive(),
        od = al.filter(function (r) {
          return daysLeft(r) < 0;
        }).length,
        ns = (S.acc || []).filter(function (x) {
          return x.role === "Student";
        }).length;
      var st = [
        ["Books in catalog", B.length],
        ["Borrowed now", al.length],
        ["Overdue", od],
        ["Students", ns],
        ["Pending requests", pendingAll().length],
        [
          "Waiting pick-up",
          S.b.filter(function (r) {
            return !r.r && r.sc === false;
          }).length,
        ],
        ["Reserved books", (S.rv || []).length],
        ["Open messages", openConcerns().length],
      ]
        .map(function (s) {
          return (
            '<div class="box st"><b>' +
            s[1] +
            "</b><span>" +
            s[0] +
            "</span></div>"
          );
        })
        .join("");
      var fbs = (S.q || []).filter(function (x) {
        return x.fb;
      });
      var avg = fbs.length
        ? fbs.reduce(function (s, x) {
            return s + x.fb;
          }, 0) / fbs.length
        : 0;
      var fbRows = fbs
        .slice()
        .reverse()
        .map(function (x) {
          var b = find(x.id);
          return (
            '<div class="row"><div class="t"><strong>' +
            esc(x.n) +
            '</strong> · <span style="color:var(--acc)">' +
            stars(x.fb) +
            "</span> (" +
            x.fb +
            "/5)<br>" +
            esc(b ? b[1] : x.id) +
            '<br><span style="color:var(--mut)">Approved in ' +
            dur(x.at - x.ts) +
            "</span></div></div>"
          );
        })
        .join("");
      return (
        head(
          "Librarian Panel",
          "Manage books, borrowers, reminders and announcements.",
        ) +
        '<div class="stats">' +
        st +
        "</div>" +
        '<div class="two"><div class="box"><h2>Reminders</h2><p class="empty">Send the return date reminder to every student who borrowed a book.</p>' +
        btn("remall", "", "Notify all borrowers") +
        '</div><div class="box"><h2>Post announcement</h2><label>Title<input id="at" class="in"></label><label>Message<input id="ax" class="in"></label>' +
        btn("post", "", "Post") +
        "</div></div>" +
        '<div class="box" style="margin-top:16px"><h2>Student feedback</h2><p class="empty" style="padding:0 0 8px">' +
        (fbs.length
          ? "Average rating: <strong>" +
            avg.toFixed(1) +
            " / 5</strong> from " +
            fbs.length +
            " rating(s)"
          : "No feedback yet.") +
        "</p>" +
        fbRows +
        "</div>"
      );
    },
    loans: function () {
      if (!isLib()) return head("Student Borrowers", "Librarian access only.");
      var rows = S.b
        .map(function (r, i) {
          return [r, i];
        })
        .filter(function (x) {
          return !x[0].r;
        })
        .map(function (x) {
          var r = x[0],
            i = x[1],
            w = r.sc === false,
            d = daysLeft(r);
          var stt = w
            ? '<span class="pill me2">Waiting for pick-up</span>'
            : d < 0
              ? '<span class="pill no">Overdue ' + -d + "d</span>"
              : '<span class="pill ' +
                (d <= 2 ? "no" : "ok") +
                '">' +
                d +
                "d left</span>";
          var acts = w
            ? sbtn("lnotify", i, "Notify") +
              sbtn("lcancel", i, "Cancel approval", 1)
            : sbtn("lnotify", i, "Notify") +
              sbtn("lext", i, "+7 days", 1) +
              sbtn("lret", i, "Book returned", 1);
          return (
            "<tr><td>" +
            esc(r.n || "Demo student") +
            "</td><td>" +
            esc(find(r.id)[1]) +
            "</td><td>" +
            F(r.d) +
            "</td><td>" +
            (w ? "—" : F(r.due)) +
            "</td><td>" +
            stt +
            "</td><td>" +
            peso(fine(r)) +
            '</td><td><div class="racts">' +
            acts +
            "</div></td></tr>"
          );
        })
        .join("");
      var done = S.b
        .filter(function (r) {
          return r.r;
        })
        .reverse()
        .slice(0, 15)
        .map(function (r) {
          var bk = find(r.id);
          return (
            "<tr><td>" +
            esc(r.n || "Demo student") +
            "</td><td>" +
            esc(bk ? bk[1] : r.id) +
            "</td><td>" +
            F(r.d) +
            "</td><td>" +
            F(r.r) +
            "</td><td>" +
            (fine(r) > 0
              ? '<span class="pill no">Late · ' + peso(fine(r)) + "</span>"
              : '<span class="pill ok">On time</span>') +
            "</td></tr>"
          );
        })
        .join("");
      return (
        head(
          "Student Borrowers",
          "Students who borrowed books. Notify them, extend, or confirm that the book was returned.",
        ) +
        '<div class="box wrap"><h2>Current loans</h2><table><tr><th>Student</th><th>Book</th><th>Borrowed</th><th>Due</th><th>Status</th><th>Fine</th><th>Actions</th></tr>' +
        (rows || '<tr><td colspan="7">No active loans.</td></tr>') +
        "</table></div>" +
        '<div class="box wrap"><h2>Recently returned</h2><table><tr><th>Student</th><th>Book</th><th>Borrowed</th><th>Returned</th><th>Result</th></tr>' +
        (done || '<tr><td colspan="5">No returned books yet.</td></tr>') +
        "</table></div>"
      );
    },
    manage: function () {
      if (!isLib()) return head("Manage Books", "Librarian access only.");
      var rows = B.map(function (b) {
        var out = isOut(b[0]),
          rr = resOf(b[0]);
        return (
          "<tr><td>" +
          b[0] +
          "</td><td>" +
          esc(b[1]) +
          "</td><td>" +
          b[3] +
          "</td><td>" +
          pill(b[0]) +
          (rr
            ? '<br><small style="color:var(--mut)">Reserved by ' +
              esc(rr.n) +
              "</small>"
            : "") +
          '</td><td><div class="racts">' +
          (out
            ? sbtn("avail", b[0], "Turn on Available")
            : '<button class="sm btn" disabled>Available</button>') +
          sbtn("rmbook", b[0], "Remove", 1) +
          '<label class="sm btn ghost up">Cover<input type="file" accept="image/*" hidden data-cid="' +
          b[0] +
          '"></label>' +
          "</div></td></tr>"
        );
      }).join("");
      return (
        head(
          "Manage Books",
          "Press “Turn on Available” only after the student returned the book. The student who reserved it will get a message automatically. Borrowed books cannot be removed. Use “Cover” to upload or change a book picture (the whole picture is shown).",
        ) +
        '<div class="box wrap"><table><tr><th>No.</th><th>Title</th><th>Category</th><th>Status</th><th>Actions</th></tr>' +
        rows +
        "</table></div>"
      );
    },
    verify: function () {
      if (!isLib()) return head("Scan QR", "Librarian access only.");
      return (
        head(
          "Scan QR",
          "Scan the student’s QR code with the camera. The book becomes Not available right away for the student and the librarian.",
        ) +
        '<div class="box" style="max-width:560px"><h2>Camera scanner</h2>' +
        btn("startscan", "", "Scan with camera") +
        '</div><div class="box" style="max-width:560px"><h2>No camera? Paste the QR text</h2><label>QR text or TXN code<input id="vc" class="in" placeholder="USTP-LIB|BORROW|..."></label>' +
        btn("verify", "", "Check", 1) +
        "</div>" +
        vres
      );
    },
    profile: function () {
      var ac = acct();
      if (!ac) return head("My Profile", "Please log in.");
      var L = isLib();
      var stat = function (n, l) {
        return (
          '<div class="box st"><b>' + n + "</b><span>" + l + "</span></div>"
        );
      };
      var yrs = ["", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"]
        .map(function (y) {
          return (
            '<option value="' +
            y +
            '"' +
            (ac.yr === y ? " selected" : "") +
            ">" +
            (y || "Select year level") +
            "</option>"
          );
        })
        .join("");
      // Information form: students lang (librarian walang ganito)
      var info = L
        ? ""
        : '<div class="box"><h2>Information</h2>' +
          '<label>Full name<input id="pn" class="in" value="' +
          esc(ac.n) +
          '"></label>' +
          '<label>Student ID<input id="ps" class="in" value="' +
          esc(ac.sid || "") +
          '" placeholder="Your ID"></label>' +
          '<label>Program / Course<input id="pg" class="in" value="' +
          esc(ac.prog || "") +
          '" placeholder="Your program"></label>' +
          '<label>Year level<select id="py" class="in">' +
          yrs +
          "</select></label>" +
          '<label>Email<input id="pe" class="in" type="email" value="' +
          esc(ac.em || "") +
          '" placeholder="name@example.com"></label>' +
          btn("saveinfo", "", "Save changes") +
          "</div>";
      return (
        head("My Profile", "Account information and settings.") +
        '<div class="box prof"><div class="pav">' +
        (ac.pic
          ? '<img src="' + ac.pic + '" alt="Your photo">'
          : esc(initials(ac.n))) +
        '</div><div class="pinfo"><h2>' +
        esc(ac.n) +
        '</h2><p class="empty" style="padding:0">@' +
        esc(ac.un) +
        " · " +
        ac.role +
        '</p><div class="pbtns"><label class="btn up">Upload photo<input id="pf" type="file" accept="image/*" hidden></label>' +
        (ac.pic ? btn("rmpic", "", "Remove photo", 1) : "") +
        '</div><p class="empty">JPG or PNG. Saved only on this browser.</p></div></div>' +
        (L
          ? ""
          : '<div class="stats">' +
            stat(my().length, "Total borrowed") +
            stat(active().length, "Borrowed now") +
            stat(myReservations().length, "Reservations") +
            stat(myPending().length, "Pending requests") +
            "</div>") +
        '<div class="two">' +
        info +
        '<div class="box"><h2>Account settings</h2>' +
        '<label>Current password<input id="po" class="in" type="password" autocomplete="current-password"></label>' +
        '<label>New password<input id="pw1" class="in" type="password" autocomplete="new-password"></label>' +
        '<label>Confirm new password<input id="pw2" class="in" type="password" autocomplete="new-password"></label>' +
        btn("savepw", "", "Change password") +
        "</div></div>"
      );
    },
    details: function () {
      var b = det && find(det);
      if (!b)
        return (
          head("Book Details", "Pick a book from the catalog.") +
          '<p class="empty"><a href="#books">Go to Book Catalog</a></p>'
        );
      var id = b[0],
        s = status(id),
        r = mine(id),
        bd = window.BOOKS && window.BOOKS[id];
      var main = isLib()
        ? '<button class="btn" disabled>Students only</button>' +
          '<label class="btn ghost up">Change cover<input type="file" accept="image/*" hidden data-cid="' +
          id +
          '"></label>'
        : s === "in"
          ? lockedForMe(id)
            ? '<button class="btn" disabled>Reserved for another student</button>'
            : btn("borrow", id, "Borrow")
          : s === "mine"
            ? btn("qr", id, "Show QR")
            : myRes(id)
              ? btn("unres", id, "Cancel reservation", 1)
              : resOf(id)
                ? '<button class="btn" disabled>Already reserved</button>'
                : btn("res", id, "Reserve");
      var hint =
        s === "in"
          ? lockedForMe(id)
            ? "This book was returned, but it is reserved for another student."
            : myRes(id)
              ? "This book is ready for you. Send a message to the librarian to borrow it."
              : "This book is on the shelf. Send a message to the librarian to borrow it."
          : s === "mine"
            ? "You have this book. Please return it to the librarian by " +
              F(r.due) +
              "."
            : resOf(id) && !myRes(id)
              ? "This book is checked out and another student already reserved it."
              : "This book is checked out. Reserve it and you will get a message when it is available.";
      return (
        '<div class="rbar">' +
        btn("rback", "", "← Back to catalog", 1) +
        "</div>" +
        head(
          "Book Details",
          "Check the details and availability before you borrow.",
        ) +
        '<div class="box det"><div class="dcov">' +
        cover(b) +
        '</div><div class="dinfo"><h2>' +
        esc(b[1]) +
        '</h2><p class="empty" style="padding:0 0 12px">by ' +
        esc(b[2]) +
        "</p>" +
        '<table class="dt"><tr><th>Title</th><td>' +
        esc(b[1]) +
        "</td></tr><tr><th>Author</th><td>" +
        esc(b[2]) +
        "</td></tr><tr><th>ISBN</th><td>" +
        (b[4] ? esc(b[4]) : "Not listed") +
        "</td></tr><tr><th>Category</th><td>" +
        b[3] +
        "</td></tr><tr><th>Book No.</th><td>" +
        b[0] +
        "</td></tr><tr><th>Availability</th><td>" +
        pill(id) +
        "</td></tr></table>" +
        '<p class="empty">' +
        (isLib()
          ? "Librarian: you can change this book’s cover picture."
          : hint) +
        "</p>" +
        (bd ? '<p class="rtxt">' + esc(bd.about) + "</p>" : "") +
        '<div class="dact">' +
        main +
        btn("read", id, s === "mine" ? "Read book" : "Preview", 1) +
        "</div></div></div>"
      );
    },
    notifications: function () {
      // LIBRARIAN: lahat ng gusto / reklamo ng students tungkol sa system o libro (may pop-up din)
      if (isLib()) {
        var cl = concerns()
          .map(function (x, i) {
            return [x, i];
          })
          .reverse();
        var row = function (p) {
          var x = p[0],
            i = p[1],
            b = x.id && find(x.id);
          return (
            '<div class="row" style="align-items:flex-start"><div class="t"><strong>' +
            esc(x.n) +
            "</strong> · " +
            esc(ctype(x.ty)) +
            " · " +
            when(x) +
            (b ? "<br>Book: <strong>" + esc(b[1]) + "</strong>" : "") +
            '<div style="margin:8px 0;padding:10px 12px;border-radius:10px;background:var(--bg);border:1px solid var(--line);line-height:1.5">“' +
            esc(x.m) +
            "”</div>" +
            (x.st === "open"
              ? '<span class="pill me2">Needs reply</span>'
              : '<span class="pill ok">Done</span>' +
                (x.rp
                  ? '<br><span style="color:var(--mut)">Your reply: ' +
                    esc(x.rp) +
                    "</span>"
                  : "")) +
            "</div>" +
            (x.st === "open"
              ? '<div class="racts">' +
                sbtn("creply", i, "Reply") +
                sbtn("cdone", i, "Mark done", 1) +
                "</div>"
              : "") +
            "</div>"
          );
        };
        var op = cl.filter(function (p) {
            return p[0].st === "open";
          }),
          dn = cl.filter(function (p) {
            return p[0].st !== "open";
          });
        return (
          head(
            "Notifications",
            "Complaints, problems and suggestions from students about the system or the books. Reply to the student or mark it done.",
          ) +
          '<div class="box"><h2>Needs reply (' +
          op.length +
          ")</h2>" +
          (op.map(row).join("") ||
            '<p class="empty">No new messages. You are all caught up.</p>') +
          '</div><div class="box"><h2>Done</h2>' +
          (dn.map(row).join("") || '<p class="empty">Nothing here yet.</p>') +
          "</div>"
        );
      }
      S.seen = (S.n || []).length;
      S.seenm = inbox().length;
      save();
      var rem = reminders(),
        log = (S.n || []).slice().reverse();
      return (
        head(
          "Notifications",
          "Replies from the librarian, due date reminders and reservation updates. You can also send a message to the librarian here.",
        ) +
        '<div class="box"><h2>Reminders</h2>' +
        (rem
          .map(function (x) {
            return (
              '<div class="note"><span class="nd"></span><p>' +
              esc(x.m) +
              "</p></div>"
            );
          })
          .join("") || '<p class="empty">You are all caught up.</p>') +
        "</div>" +
        studentForm() +
        '<div class="box"><h2>Recent activity</h2>' +
        (log
          .map(function (x) {
            return (
              '<div class="note"><span class="nd"></span><p>' +
              esc(x.m) +
              "<small>" +
              F(x.t) +
              "</small></p></div>"
            );
          })
          .join("") || '<p class="empty">No activity yet.</p>') +
        "</div>"
      );
    },
    reader: function () {
      var bk = rd.id && find(rd.id),
        bd = window.BOOKS && window.BOOKS[rd.id];
      if (!bk)
        return (
          head("Reader", "Pick a book first.") +
          '<p class="empty"><a href="#books">Go to Book Catalog</a></p>'
        );
      var back =
        '<div class="rbar">' +
        btn("rback", "", "← Back to books", 1) +
        "</div>";
      var top = head(bk[1], "by " + bk[2] + " · " + bk[3] + " · No. " + bk[0]);
      if (!bd)
        return (
          back +
          top +
          '<div class="box"><p class="empty">No reading copy for this book yet.</p></div>'
        );
      var pg = bd.pages,
        s = status(rd.id);
      if (s !== "mine") {
        var words = pg[0][1].split(" ").slice(0, 38).join(" ");
        var gate =
          s === "in"
            ? "Borrow this book to unlock all " + pg.length + " pages."
            : "This book is checked out. Reserve it to read it later.";
        return (
          back +
          top +
          '<div class="box"><span class="pill no">Preview only</span><p class="rtxt" style="margin-top:12px">' +
          esc(bd.about) +
          "</p></div>" +
          '<div class="box"><h2>Contents</h2><ol class="toc">' +
          pg
            .map(function (p) {
              return (
                "<li>" + esc(p[0]) + ' <span class="lock">Locked</span></li>'
              );
            })
            .join("") +
          "</ol></div>" +
          '<div class="box"><h2>Sample from page 1</h2><div class="fade"><p class="rtxt">' +
          esc(words) +
          '…</p></div><p class="gate">' +
          gate +
          "</p>" +
          (isLib()
            ? ""
            : s === "in"
              ? lockedForMe(rd.id)
                ? ""
                : btn("borrow", rd.id, "Borrow to read")
              : myRes(rd.id)
                ? btn("unres", rd.id, "Cancel reservation", 1)
                : resOf(rd.id)
                  ? ""
                  : btn("res", rd.id, "Reserve", 1)) +
          "</div>"
        );
      }
      var i = Math.max(0, Math.min(rd.p, pg.length - 1)),
        p = pg[i];
      return (
        back +
        top +
        '<article class="box page"><p class="pno">Page ' +
        (i + 1) +
        " of " +
        pg.length +
        "</p><h2>" +
        esc(p[0]) +
        '</h2><p class="rtxt">' +
        esc(p[1]) +
        "</p></article>" +
        '<div class="rnav">' +
        (i > 0 ? btn("rpage", i - 1, "← Previous", 1) : "<span></span>") +
        '<span class="empty">Page ' +
        (i + 1) +
        " / " +
        pg.length +
        "</span>" +
        (i < pg.length - 1
          ? btn("rpage", i + 1, "Next →")
          : btn("rback", "", "Finish", 1)) +
        "</div>"
      );
    },
    help: function () {
      var h = [
        [
          "How do I borrow a book?",
          "Open Book Catalog and press Borrow. Write an approach message to the librarian and send it. The librarian will approve it or reply that it is not available. After approval, go to " +
            PICKUP +
            " and show your QR code; the book is yours once it is scanned. You can hold up to 3 books.",
        ],
        [
          "How long can I keep a book?",
          "7 days. Return it in person to the librarian.",
        ],
        [
          "What if I return late?",
          "The penalty is " +
            peso(FINE) +
            " for each borrowed book. Example: 3 books returned late = " +
            peso(FINE * 3) +
            ". The money goes to the school (school funds and events).",
        ],
        [
          "What if I lose or damage a book?",
          "You must pay " + peso(LOST) + " for each book.",
        ],
        [
          "A book is not available. What now?",
          "Press Reserve. When the book is returned, you will get a message right away and only you can borrow it. Only one student can reserve each book.",
        ],
        [
          "How do I report a problem or send a suggestion?",
          "Open Notifications and use “Send a message to the librarian”. Choose what it is about (system problem, book problem, your request, suggestion), write your message and send it. The librarian’s reply will appear in the same page.",
        ],
      ];
      return (
        head("Help", "Common questions.") +
        '<div class="box">' +
        h
          .map(function (x) {
            return (
              "<details><summary>" +
              x[0] +
              '</summary><p style="color:var(--mut)">' +
              x[1] +
              "</p></details>"
            );
          })
          .join("") +
        '</div><div class="box"><button class="btn ghost" data-a="reset" data-id="">Reset demo data</button></div>'
      );
    },
  };
  function route() {
    var r = (location.hash || "#dashboard").slice(1);
    if (!V[r]) return "dashboard";
    if (
      isLib() &&
      (r === "borrowed" ||
        r === "history" ||
        r === "fines" ||
        r === "help" ||
        r === "categories")
    )
      return "dashboard";
    return r;
  }
  function render() {
    var r = route();
    var cur = r === "details" || r === "reader" ? "books" : r;
    var L = isLib();
    $("nav").innerHTML =
      '<div class="logo"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#F2B705" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      I.book +
      "</svg><div>USTP<br>Library</div></div>" +
      R.filter(function (x) {
        return !x[3] || (x[3] === "L" && L) || (x[3] === "S" && !L);
      })
        .map(function (x) {
          return (
            '<a class="nav" href="#' +
            x[0] +
            '"' +
            (x[0] === cur ? ' aria-current="page"' : "") +
            ">" +
            svg(x[2]) +
            (L && x[0] === "reservations" ? "Book Requests" : x[1]) +
            badge(x[0], L) +
            "</a>"
          );
        })
        .join("");
    $("main").innerHTML = V[r]();
    $("bdot").style.display = S.u && unread() > 0 ? "" : "none";
    $("login").style.display = S.u ? "none" : "flex";
    if (S.u) {
      $("un").textContent = S.u.name;
      $("ur").textContent = S.u.role;
      var pa = acct(),
        av = $("uav");
      if (pa && pa.pic) {
        av.textContent = "";
        av.style.backgroundImage = 'url("' + pa.pic + '")';
      } else {
        av.style.backgroundImage = "";
        av.textContent = initials(S.u.name);
      }
    }
    if (r === "dashboard") document.querySelectorAll("[data-n]").forEach(count);
    loadCovers();
    checkFeedback();
    checkLibAlert();
  }
  function count(el) {
    var n = +el.dataset.n,
      t0 = null;
    function s(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / 700, 1);
      el.textContent = Math.round(n * p);
      if (p < 1) requestAnimationFrame(s);
    }
    requestAnimationFrame(s);
  }
  function toast(m) {
    var t = $("toast");
    t.textContent = m;
    t.className = "on";
    clearTimeout(toast.h);
    toast.h = setTimeout(function () {
      t.className = "";
    }, 2800);
  }
  var cam = { s: null, t: null };
  function stopCam() {
    if (cam.t) {
      clearTimeout(cam.t);
      cam.t = null;
    }
    if (cam.s) {
      cam.s.getTracks().forEach(function (t) {
        t.stop();
      });
      cam.s = null;
    }
  }
  // hindi na kailangan i-edit ang HTML: kusang nilo-load ang jsQR (para sa iPhone/Safari)
  function loadJsQR() {
    if (window.jsQR || document.getElementById("jsqr")) return;
    var sc = document.createElement("script");
    sc.id = "jsqr";
    sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
    document.head.appendChild(sc);
  }
  // Pag na-scan ang QR: nagiging NOT AVAILABLE ang libro (student at librarian)
  function scanResult(text) {
    var t = String(text || "").trim(),
      pt = t.split("|"),
      code = pt.length >= 8 ? pt[7] : t;
    var hit = S.b.filter(function (r) {
        return tcode(r) === code;
      })[0],
      inner;
    if (!hit) {
      inner =
        '<span class="pill no">Code not found</span><p class="empty">No record of this QR code in this browser.</p>';
    } else {
      var bk = find(hit.id),
        title = bk ? bk[1] : hit.id,
        state,
        ok = true;
      if (hit.r) {
        state = "Already returned on " + F(hit.r) + ".";
        ok = false;
      } else if (hit.sc === false) {
        hit.sc = true;
        hit.sd = iso(TODAY);
        hit.due = iso(new Date(TODAY.getTime() + 7 * DAY));
        msg(
          hit.u || "all",
          "Pick-up confirmed: " +
            title +
            " is now marked as borrowed. Return it on or before " +
            F(hit.due) +
            "." +
            RULESMSG,
        );
        save();
        state =
          "Scanned! This book is now NOT AVAILABLE. Due on " + F(hit.due) + ".";
      } else {
        state = "Already scanned. Still borrowed, due on " + F(hit.due) + ".";
        ok = false;
      }
      inner =
        '<span class="pill ' +
        (ok ? "ok" : "no") +
        '">' +
        (ok ? "Valid code" : "Notice") +
        '</span><table class="dt"><tr><th>Student</th><td>' +
        esc(hit.n || "Demo student") +
        "</td></tr><tr><th>Book</th><td>" +
        esc(title) +
        "</td></tr><tr><th>Result</th><td>" +
        esc(state) +
        "</td></tr></table>";
    }
    vres = '<div class="box" style="max-width:560px">' + inner + "</div>";
    dlg(
      '<div class="qrbox" style="align-items:stretch;text-align:left">' +
        inner +
        btn("closemd", "", "Close") +
        "</div>",
    );
  }
  function startScan() {
    if (!isLib()) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Camera is not available here. Paste the QR text instead.");
      return;
    }
    loadJsQR();
    dlg(
      '<div class="qrbox"><video id="sv" playsinline muted style="width:100%;max-width:360px;border-radius:12px;background:#000"></video><p class="empty" id="ss">Point the camera at the student’s QR code.</p><button class="btn ghost" data-a="stopscan" data-id="">Cancel</button></div>',
    );
    var v = $("sv"),
      st = $("ss");
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      .then(function (stream) {
        cam.s = stream;
        v.srcObject = stream;
        v.play();
        var det = null;
        try {
          if (window.BarcodeDetector)
            det = new BarcodeDetector({ formats: ["qr_code"] });
        } catch (e) {}
        var cv = document.createElement("canvas"),
          cx = cv.getContext("2d", { willReadFrequently: true });
        function done(txt) {
          stopCam();
          $("md").className = "";
          scanResult(txt);
          render();
        }
        function tick() {
          if (!cam.s) return;
          if (v.readyState < 2) {
            cam.t = setTimeout(tick, 150);
            return;
          }
          if (det) {
            det
              .detect(v)
              .then(function (c) {
                if (c && c[0] && c[0].rawValue) done(c[0].rawValue);
                else cam.t = setTimeout(tick, 200);
              })
              .catch(function () {
                det = null;
                cam.t = setTimeout(tick, 200);
              });
            return;
          }
          if (window.jsQR) {
            cv.width = v.videoWidth;
            cv.height = v.videoHeight;
            cx.drawImage(v, 0, 0);
            var im = cx.getImageData(0, 0, cv.width, cv.height),
              r = window.jsQR(im.data, im.width, im.height);
            if (r && r.data) {
              done(r.data);
              return;
            }
          }
          cam.t = setTimeout(tick, 200);
        }
        tick();
      })
      .catch(function () {
        if (st)
          st.textContent =
            "Camera blocked. Allow camera access (needs https), or paste the QR text instead.";
      });
  }
  var RULESMSG =
    " Return it in person to the librarian. Late: " +
    "PHP " +
    FINE +
    " per book. Lost or damaged: PHP " +
    LOST.toLocaleString("en-US") +
    " per book.";
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-a]");
    if (!t) return;
    var a = t.dataset.a,
      id = t.dataset.id,
      b = id && find(id);
    stopCam();
    if (a !== "view") $("md").className = "";
    if (a === "startscan") {
      startScan();
      return;
    }
    if (a === "view") {
      det = id;
      if (location.hash === "#details") render();
      else location.hash = "details";
      return;
    }
    if (a === "closemd") {
      checkFeedback();
      return;
    }
    if (a === "gonotif") {
      if (location.hash === "#notifications") render();
      else location.hash = "notifications";
      return;
    }
    if (a === "creply") {
      showReply(+id);
      return;
    }
    if (a === "fblater") {
      fbSkip[+id] = true;
      return;
    }
    if (a === "star") {
      var fx = (S.q || [])[+id];
      if (fx && !fx.fb) {
        fx.fb = +t.dataset.n;
        fx.ft = Date.now();
        save();
        toast("Thank you for your feedback! (" + fx.fb + " of 5 stars)");
      }
    } else if (a === "sendconcern") {
      if (stuOnly()) return;
      var cty = $("ct") ? $("ct").value : "other",
        cbk = $("cb") ? $("cb").value : "",
        cmt = $("cmsg") ? $("cmsg").value.trim() : "";
      if (cty === "book" && !cbk) {
        toast("Please choose the book you are reporting.");
        return;
      }
      if (cmt.length < 5) {
        toast("Please write your message.");
        return;
      }
      S.cm = S.cm || [];
      S.cm.push({
        u: S.u.un,
        n: S.u.name,
        ty: cty,
        id: cbk,
        m: cmt,
        d: iso(TODAY),
        ts: Date.now(),
        st: "open",
      });
      note("Message sent to the librarian: " + ctype(cty) + ".");
      save();
      toast("Message sent to the librarian");
    } else if (a === "sendreply") {
      var cx = (S.cm || [])[+id],
        rtx = $("rp") ? $("rp").value.trim() : "";
      if (!isLib() || !cx) return;
      if (!rtx) {
        toast("Please write a reply.");
        showReply(+id);
        return;
      }
      cx.st = "resolved";
      cx.rp = rtx;
      cx.rt = iso(TODAY);
      msg(
        cx.u,
        "Reply from the librarian about your message (" +
          ctype(cx.ty) +
          "): " +
          rtx,
      );
      save();
      toast("Reply sent to " + cx.n);
    } else if (a === "cdone") {
      var cd = (S.cm || [])[+id];
      if (!isLib() || !cd) return;
      cd.st = "resolved";
      save();
      toast("Marked as done");
    } else if (a === "avf") {
      avOnly = !avOnly;
    } else if (a === "borrow") {
      if (stuOnly()) return;
      if (status(id) !== "in") {
        toast("This book is not available.");
        return;
      }
      if (lockedForMe(id)) {
        toast("This book is reserved for another student.");
        return;
      }
      if (
        active().length +
          myPending().filter(function (x) {
            return x.ty === "borrow";
          }).length >=
        3
      ) {
        toast("Limit reached: you can borrow up to 3 books.");
        return;
      }
      if (
        hasPending(id) &&
        myPending().some(function (x) {
          return x.id === id && x.ty === "borrow";
        })
      ) {
        toast("You already sent a request for this book.");
        return;
      }
      showBorrowBox(id);
      return;
    } else if (a === "sendborrow") {
      if (stuOnly()) return;
      var bm = $("bm") ? $("bm").value.trim() : "";
      if (!bm) {
        toast("Please write a message to the librarian.");
        showBorrowBox(id);
        return;
      }
      if (status(id) !== "in") {
        toast("This book is not available.");
        return;
      }
      if (lockedForMe(id)) {
        toast("This book is reserved for another student.");
        return;
      }
      S.q = S.q || [];
      S.q.push({
        id: id,
        u: S.u.un,
        n: S.u.name,
        m: bm,
        d: iso(TODAY),
        ts: Date.now(),
        st: "pending",
        ty: "borrow",
      });
      note("Borrow request sent to the librarian for " + b[1] + ".");
      save();
      showSent(b);
    } else if (a === "res") {
      if (stuOnly()) return;
      reserve(id);
    } else if (a === "unres") {
      S.rv = (S.rv || []).filter(function (x) {
        return !(S.u && x.u === S.u.un && x.id === id);
      });
      note("Reservation cancelled: " + (b ? b[1] : ""));
      save();
      toast("Reservation cancelled");
    } else if (a === "qok" || a === "qna" || a === "qtk") {
      var rq = (S.q || [])[+id];
      if (!isLib() || !rq || rq.st !== "pending") return;
      var rb = find(rq.id),
        rt = rb ? rb[1] : rq.id;
      if (a === "qok") {
        if (status(rq.id) !== "in") {
          toast(
            "This book is still borrowed. Choose “Not available” or “Reserved already”.",
          );
          return;
        }
        var rsv = resOf(rq.id);
        if (rsv && rsv.u !== rq.u) {
          toast(
            "This book is reserved for another student (" +
              rsv.n +
              "). Choose “Reserved already”.",
          );
          return;
        }
        if (
          S.b.some(function (r) {
            return r.id === rq.id && !r.r && r.sc === false;
          })
        ) {
          toast(
            "This book is already approved for another student (waiting for pick-up).",
          );
          return;
        }
        var cnt = S.b.filter(function (r) {
          return !r.r && r.u === rq.u;
        }).length;
        if (cnt >= 3) {
          toast("This student already has 3 borrowed books.");
          return;
        }
        var due = iso(new Date(TODAY.getTime() + 7 * DAY));
        S.b.push({
          id: rq.id,
          d: iso(TODAY),
          due: due,
          r: null,
          u: rq.u,
          n: rq.n,
          sc: false,
        });
        S.rv = (S.rv || []).filter(function (x) {
          return !(x.id === rq.id && x.u === rq.u);
        });
        rq.st = "approved";
        rq.at = Date.now(); // para sa feedback: gaano kabilis ang approval
        msg(
          rq.u,
          "Approved: " +
            rt +
            ". Go to " +
            PICKUP +
            " and show your QR code (My Borrowed Books > Show QR). The book is yours once the librarian scans it. You will have 7 days after the scan." +
            RULESMSG,
        );
        toast("Approved: " + rt);
      } else if (a === "qna") {
        rq.st = "na";
        msg(rq.u, "Not available: " + rt + " is not available right now.");
        toast("Student notified: not available");
      } else {
        rq.st = "taken";
        msg(rq.u, "Sorry, " + rt + " was already reserved by another student.");
        toast("Student notified: already reserved");
      }
      save();
    } else if (a === "avail") {
      if (!isLib()) return;
      if (!isOut(id)) {
        toast("Already available.");
        return;
      }
      if (
        !confirm(
          'Turn on Available for "' +
            b[1] +
            '"? Only do this if the book has been returned.',
        )
      )
        return;
      var ol = allActive().filter(function (r) {
        return r.id === id;
      })[0];
      if (ol) {
        ol.r = iso(TODAY);
        msg(
          ol.u || "all",
          "Return of " + b[1] + " confirmed by the librarian. Thank you!",
        );
      } else {
        S.av = (S.av || []).concat(id);
      }
      notifyReserver(id); // automatic message sa nag-reserve
      save();
      toast(
        b[1] +
          " is now available" +
          (resOf(id) ? ". The student who reserved it was notified." : ""),
      );
    } else if (a === "cat" || a === "cat2") {
      cat = id;
      q = "";
      $("q").value = "";
      if (a === "cat" && route() !== "books") {
        location.hash = "books";
        return;
      }
    } else if (a === "login") {
      var lu = $("lu").value.trim().toLowerCase(),
        lp = $("lp").value;
      var ac = (S.acc || []).filter(function (x) {
        return x.un === lu && x.pw === lp;
      })[0];
      if (!ac) {
        say(
          "lerr",
          "Wrong username or password. If you are new, create an account first.",
        );
        return;
      }
      S.u = { name: ac.n, role: ac.role, un: ac.un };
      pendingWelcome = ac.role === "Student";
      S.rem = $("lrem").checked;
      try {
        if (S.rem) localStorage.setItem("ustp-user", lu);
        else localStorage.removeItem("ustp-user");
        sessionStorage.setItem("ustp-sess", "1");
      } catch (e) {}
      $("lp").value = "";
      save();
      location.hash = ac.role === "Librarian" ? "lib" : "dashboard";
      toast("Welcome, " + ac.n + " (" + ac.role + ")");
    } else if (a === "logout") {
      S.u = null;
      S.rem = false;
      save();
      try {
        sessionStorage.removeItem("ustp-sess");
      } catch (e) {}
      showView("login");
    } else if (a === "show") {
      showView(id);
      return;
    } else if (a === "signup") {
      // walang limit ang bilang ng student accounts
      var sn = $("sn").value.trim(),
        su = $("su").value.trim().toLowerCase(),
        sp = $("sp").value,
        sr = "Student"; // Librarian accounts are provided na, Student lang ang pwedeng gumawa
      if (!sn || !su || !sp) {
        say("serr", "Please fill in all fields.");
        return;
      }
      if (sp.length < 4) {
        say("serr", "Password must be at least 4 characters.");
        return;
      }
      if (sp !== $("sp2").value) {
        say("serr", "Passwords do not match.");
        return;
      }
      S.acc = S.acc || [];
      if (
        S.acc.some(function (x) {
          return x.un === su;
        })
      ) {
        say("serr", "That username is already taken.");
        return;
      }
      S.acc.push({ n: sn, un: su, pw: sp, role: sr });
      save();
      ["sn", "su", "sp", "sp2"].forEach(function (x) {
        $(x).value = "";
      });
      $("lu").value = su;
      $("lp").value = "";
      showView("login");
      toast("Account created. You can log in now.");
      return;
    } else if (a === "forgot") {
      var fu = $("fu").value.trim().toLowerCase(),
        fp = $("fp").value;
      var fa = (S.acc || []).filter(function (x) {
        return x.un === fu;
      })[0];
      if (!fa) {
        say("ferr", "No account found with that username.");
        return;
      }
      if (fp.length < 4) {
        say("ferr", "New password must be at least 4 characters.");
        return;
      }
      fa.pw = fp;
      save();
      $("fu").value = "";
      $("fp").value = "";
      $("lu").value = fu;
      showView("login");
      toast("Password updated. Log in with your new password.");
      return;
    } else if (a === "read") {
      rd = { id: id, p: 0 };
      if (location.hash === "#reader") render();
      else location.hash = "reader";
      return;
    } else if (a === "rpage") {
      rd.p = +id;
      window.scrollTo(0, 0);
    } else if (a === "rback") {
      location.hash = "books";
      return;
    } else if (a === "rmpic") {
      var pr = acct();
      if (pr) {
        delete pr.pic;
        save();
        toast("Photo removed");
      }
    } else if (a === "saveinfo") {
      var ic = acct(),
        iname = $("pn") ? $("pn").value.trim() : "",
        iem = $("pe") ? $("pe").value.trim() : "";
      if (!$("pn")) return;
      if (!iname) {
        toast("Please enter your name");
        return;
      }
      if (iem && !/^\S+@\S+\.\S+$/.test(iem)) {
        toast("Please enter a valid email");
        return;
      }
      if (ic) {
        ic.n = iname;
        S.u.name = iname;
        ic.sid = $("ps").value.trim();
        ic.prog = $("pg").value.trim();
        ic.yr = $("py").value;
        ic.em = iem;
        save();
        toast("Profile saved");
      }
    } else if (a === "savepw") {
      var wc = acct(),
        wold = $("po").value,
        wnew = $("pw1").value;
      if (!wc) return;
      if (wold !== wc.pw) {
        toast("Current password is incorrect");
        return;
      }
      if (wnew.length < 4) {
        toast("New password must be at least 4 characters");
        return;
      }
      if (wnew !== $("pw2").value) {
        toast("New passwords do not match");
        return;
      }
      wc.pw = wnew;
      save();
      toast("Password changed");
      ["po", "pw1", "pw2"].forEach(function (x) {
        $(x).value = "";
      });
    } else if (a === "add") {
      if (!isLib()) return;
      var ti = $("nt").value.trim(),
        au = $("na").value.trim() || "Unknown",
        ct = $("nc").value,
        isbn = $("ni").value.trim();
      if (!ti) {
        toast("Please enter a title");
        return;
      }
      var nb = [String(ALL.length + 1).padStart(3, "0"), ti, au, ct, isbn];
      B.push(nb);
      ALL.push(nb);
      S.x = S.x || [];
      S.x.push(nb);
      // cover picture (optional) galing sa upload ng librarian
      var cfile = $("nf") && $("nf").files[0];
      if (cfile && /^image\//.test(cfile.type)) {
        TRY[nb[0]] = 1; // para hindi ma-override ng auto cover
        shrinkCover(cfile, function (u) {
          putCover(nb[0], u);
        });
      }
      // notify lahat ng students
      msg(
        "all",
        "New book added: " +
          ti +
          " by " +
          au +
          " (" +
          ct +
          "). Check the Book Catalog!",
      );
      save();
      toast("Added: " + ti + " (No. " + nb[0] + "). Students notified.");
      location.hash = "books";
    } else if (a === "qr") {
      var q0 = mine(id);
      if (q0) showQR(q0);
      return;
    } else if (a === "rmbook") {
      if (!isLib()) return;
      if (
        isOut(id) ||
        S.b.some(function (r) {
          return r.id === id && !r.r;
        })
      ) {
        toast("Cannot remove: book is borrowed or approved.");
        return;
      }
      if (!confirm('Remove "' + b[1] + '" from the catalog?')) return;
      S.rm = (S.rm || []).concat(id);
      B = B.filter(function (x) {
        return x[0] !== id;
      });
      S.rv = (S.rv || []).filter(function (x) {
        return x.id !== id;
      });
      save();
      toast("Removed: " + b[1]);
    } else if (a === "lcancel") {
      // kinansela ang approval kapag hindi pumunta ang student (para hindi ma-lock ang libro)
      var cr = S.b[+id];
      if (!isLib() || !cr || cr.r || cr.sc !== false) return;
      var ctt = find(cr.id) ? find(cr.id)[1] : cr.id;
      if (
        !confirm(
          'Cancel the approval of "' +
            ctt +
            '" for ' +
            (cr.n || "the student") +
            "? The book will be available again.",
        )
      )
        return;
      S.b.splice(+id, 1);
      (S.q || []).forEach(function (x) {
        if (x.id === cr.id && x.u === cr.u && x.st === "approved")
          x.st = "cancelled";
      });
      msg(
        cr.u || "all",
        "Your approved request for " +
          ctt +
          " was cancelled because the book was not picked up. You can send a new request.",
      );
      notifyReserver(cr.id);
      save();
      toast("Approval cancelled. The book is available again.");
    } else if (a === "lnotify" || a === "lext" || a === "lret") {
      var lr = S.b[+id];
      if (!isLib() || !lr) return;
      var lt = find(lr.id)[1],
        lw = lr.u || "all";
      if (a === "lnotify" && lr.sc === false) {
        msg(
          lw,
          "Reminder: your request for " +
            lt +
            " was approved. Go to " +
            PICKUP +
            " and show your QR code to pick it up.",
        );
        toast("Reminder sent");
      } else if (a === "lnotify") {
        msg(
          lw,
          lt +
            " is due on " +
            F(lr.due) +
            (daysLeft(lr) < 0
              ? " and is already overdue. Please return it now."
              : ". Please return it on or before that date.") +
            RULESMSG,
        );
        toast("Reminder sent");
      } else if (a === "lext") {
        lr.due = iso(new Date(P(lr.due).getTime() + 7 * DAY));
        msg(
          lw,
          "Your loan of " +
            lt +
            " was extended. New due date: " +
            F(lr.due) +
            ".",
        );
        save();
        toast("Extended by 7 days");
      } else {
        if (
          !confirm(
            'Confirm that "' + lt + '" was returned? It will become Available.',
          )
        )
          return;
        lr.r = iso(TODAY);
        msg(lw, "Return of " + lt + " confirmed by the librarian. Thank you!");
        notifyReserver(lr.id); // automatic message sa nag-reserve
        save();
        toast(
          "Book is now available" +
            (resOf(lr.id) ? ". The student who reserved it was notified." : ""),
        );
      }
    } else if (a === "remall") {
      if (!isLib()) return;
      var n = 0;
      allActive().forEach(function (r) {
        var d = daysLeft(r);
        msg(
          r.u || "all",
          find(r.id)[1] +
            " is due on " +
            F(r.due) +
            (d < 0
              ? " (overdue by " +
                -d +
                " day(s), penalty " +
                peso(FINE) +
                " per book)."
              : " (" + d + " day(s) left).") +
            RULESMSG,
        );
        n++;
      });
      toast(
        n
          ? n + " reminder(s) sent to all borrowers"
          : "No active borrowers to notify",
      );
    } else if (a === "post") {
      if (!isLib()) return;
      var at = $("at").value.trim(),
        ax = $("ax").value.trim();
      if (!at) {
        toast("Please enter a title");
        return;
      }
      S.ann = S.ann || [];
      S.ann.unshift([at, ax || " "]);
      save();
      toast("Announcement posted");
    } else if (a === "verify") {
      scanResult($("vc") ? $("vc").value : "");
    } else if (a === "reset") {
      var u = S.u,
        ac2 = S.acc,
        rm = S.rem;
      S = {
        b: [{ id: "001", d: "2026-11-03", due: "2026-11-05", r: null }],
        rv: [],
        x: [],
        cm: [],
        u: u,
        acc: ac2,
        rem: rm,
      };
      save();
      location.reload();
      return;
    }
    render();
    // welcome message + guidelines para sa student pagka-login
    if (pendingWelcome && S.u) {
      pendingWelcome = false;
      showWelcome();
    }
  });
  document.addEventListener("change", function (e) {
    // librarian: upload / palitan ang cover ng libro (Manage Books o Book Details)
    if (e.target.dataset && e.target.dataset.cid) {
      if (!isLib()) return;
      var cf = e.target.files[0],
        cid = e.target.dataset.cid;
      if (!cf) return;
      if (!/^image\//.test(cf.type)) {
        toast("Please choose an image file.");
        return;
      }
      shrinkCover(cf, function (u) {
        putCover(cid, u);
        toast("Cover updated");
      });
      return;
    }
    if (e.target.id !== "pf") return;
    var f = e.target.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast("Please choose an image file.");
      return;
    }
    shrink(f, function (url) {
      var ac = acct();
      if (!ac) return;
      ac.pic = url;
      save();
      toast("Profile photo updated");
      render();
    });
  });
  // star rating: nagiging dilaw ang mga star hanggang sa tinuturo ng mouse
  document.addEventListener("mouseover", function (e) {
    var all = document.querySelectorAll('[data-a="star"]');
    if (!all.length) return;
    var t = e.target.closest && e.target.closest('[data-a="star"]'),
      n = t ? +t.dataset.n : 0;
    all.forEach(function (s) {
      s.style.color = +s.dataset.n <= n ? "#f2b705" : "#c3cad9";
    });
  });
  $("q").addEventListener("input", function (e) {
    q = e.target.value;
    cat = "All";
    if (route() !== "books") location.hash = "books";
    else render();
  });
  // i-click ang labas ng pop-up para isara
  $("md").addEventListener("click", function (e) {
    if (e.target === this) {
      stopCam();
      this.className = "";
    }
  });
  window.addEventListener("hashchange", function () {
    render();
    window.scrollTo(0, 0);
  });
  try {
    // kung hindi naka-check ang Remember me, logout kapag bagong browser session
    if (S.u && !S.rem && !sessionStorage.getItem("ustp-sess")) S.u = null;
    var ru = localStorage.getItem("ustp-user");
    if (ru) {
      $("lu").value = ru;
      $("lrem").checked = true;
    }
  } catch (e) {}
  $("login").addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var go = [].filter.call(
      document.querySelectorAll("#login .go"),
      function (x) {
        return x.offsetParent;
      },
    )[0];
    if (go) go.click();
  });
  render();
})();
