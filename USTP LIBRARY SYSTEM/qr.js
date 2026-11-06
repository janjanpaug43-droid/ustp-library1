/* qr.js - maliit na QR generator (offline, walang library). Gamit: qrSvg("text") */
(function () {
  var EX = [],
    LG = [],
    x = 1,
    i;
  for (i = 0; i < 255; i++) {
    EX[i] = x;
    LG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
  function mul(a, b) {
    return a && b ? EX[(LG[a] + LG[b]) % 255] : 0;
  }
  // [total codewords, ec per block, blocks] — ECC level L, version 1..10
  var T = [
    0,
    [26, 7, 1],
    [44, 10, 1],
    [70, 15, 1],
    [100, 20, 1],
    [134, 26, 1],
    [172, 18, 2],
    [196, 20, 2],
    [242, 24, 2],
    [292, 30, 2],
    [346, 18, 4],
  ];
  var AL = [
    0,
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
  ];
  function rs(data, n) {
    var g = [1],
      j,
      k;
    for (j = 0; j < n; j++) {
      var ng = g.concat(0);
      for (k = 0; k < g.length; k++) {
        ng[k + 1] ^= mul(g[k], EX[j]);
      }
      g = ng;
    }
    var r = data.concat(new Array(n).fill(0));
    for (j = 0; j < data.length; j++) {
      var c = r[j];
      if (c) for (k = 0; k < g.length; k++) r[j + k] ^= mul(g[k], c);
    }
    return r.slice(data.length);
  }
  function bch(v, g) {
    var d = function (z) {
        return 32 - Math.clz32(z);
      },
      r = v;
    while (d(r) >= d(g)) r ^= g << (d(r) - d(g));
    return r;
  }
  function make(text) {
    var by = unescape(encodeURIComponent(text))
      .split("")
      .map(function (c) {
        return c.charCodeAt(0);
      });
    var v, dc;
    for (v = 1; v <= 10; v++) {
      dc = T[v][0] - T[v][1] * T[v][2];
      if (4 + (v < 10 ? 8 : 16) + by.length * 8 <= dc * 8) break;
    }
    if (v > 10) throw new Error("QR text too long");
    var bits = [];
    function put(val, len) {
      for (var k = len - 1; k >= 0; k--) bits.push((val >> k) & 1);
    }
    put(4, 4);
    put(by.length, v < 10 ? 8 : 16);
    by.forEach(function (b) {
      put(b, 8);
    });
    for (var t = 0; t < 4 && bits.length < dc * 8; t++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    var cw = [];
    for (i = 0; i < bits.length; i += 8)
      cw.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    for (var p = 0; cw.length < dc; p++) cw.push(p % 2 ? 0x11 : 0xec);
    var nb = T[v][2],
      ec = T[v][1],
      sh = nb - (dc % nb),
      per = Math.floor(dc / nb),
      blocks = [],
      pos = 0;
    for (i = 0; i < nb; i++) {
      var len = per + (i >= sh ? 1 : 0),
        d = cw.slice(pos, pos + len);
      pos += len;
      blocks.push({ d: d, e: rs(d, ec) });
    }
    var out = [],
      mx = per + 1;
    for (i = 0; i < mx; i++)
      blocks.forEach(function (b) {
        if (i < b.d.length) out.push(b.d[i]);
      });
    for (i = 0; i < ec; i++)
      blocks.forEach(function (b) {
        out.push(b.e[i]);
      });
    var n = 17 + 4 * v,
      m = [],
      f = [],
      r,
      c;
    for (r = 0; r < n; r++) {
      m.push(new Array(n).fill(0));
      f.push(new Array(n).fill(false));
    }
    function set(r, c, val) {
      if (r >= 0 && c >= 0 && r < n && c < n) {
        m[r][c] = val ? 1 : 0;
        f[r][c] = true;
      }
    }
    [
      [0, 0],
      [0, n - 7],
      [n - 7, 0],
    ].forEach(function (o) {
      for (var a = -1; a <= 7; a++)
        for (var b = -1; b <= 7; b++) {
          var inn = a >= 0 && a <= 6 && b >= 0 && b <= 6;
          set(
            o[0] + a,
            o[1] + b,
            inn &&
              (a == 0 ||
                a == 6 ||
                b == 0 ||
                b == 6 ||
                (a >= 2 && a <= 4 && b >= 2 && b <= 4)),
          );
        }
    });
    for (i = 8; i < n - 8; i++) {
      set(6, i, i % 2 == 0);
      set(i, 6, i % 2 == 0);
    }
    var al = AL[v];
    al.forEach(function (a) {
      al.forEach(function (b) {
        if (
          (a == 6 && b == 6) ||
          (a == 6 && b == al[al.length - 1]) ||
          (b == 6 && a == al[al.length - 1])
        )
          return;
        for (var dr = -2; dr <= 2; dr++)
          for (var dd = -2; dd <= 2; dd++)
            set(a + dr, b + dd, Math.max(Math.abs(dr), Math.abs(dd)) != 1);
      });
    });
    for (i = 0; i < 9; i++) {
      f[8][i] = true;
      f[i][8] = true;
    }
    for (i = 0; i < 8; i++) {
      f[8][n - 1 - i] = true;
      f[n - 1 - i][8] = true;
    }
    set(n - 8, 8, 1);
    if (v >= 7)
      for (i = 0; i < 18; i++) {
        f[Math.floor(i / 3)][(i % 3) + n - 11] = true;
        f[(i % 3) + n - 11][Math.floor(i / 3)] = true;
      }
    var bi = 0,
      up = true;
    for (c = n - 1; c > 0; c -= 2) {
      if (c == 6) c--;
      for (var k = 0; k < n; k++) {
        r = up ? n - 1 - k : k;
        for (var q = 0; q < 2; q++) {
          var cc = c - q;
          if (f[r][cc]) continue;
          var bit =
            bi < out.length * 8 ? (out[bi >> 3] >> (7 - (bi & 7))) & 1 : 0;
          bi++;
          m[r][cc] = bit ^ ((r + cc) % 2 == 0 ? 1 : 0);
        }
      }
      up = !up;
    }
    var fm = (1 << 3) | 0,
      fb = ((fm << 10) | bch(fm << 10, 0x537)) ^ 0x5412;
    for (i = 0; i < 15; i++) {
      var mod = (fb >> i) & 1;
      if (i < 6) m[i][8] = mod;
      else if (i < 8) m[i + 1][8] = mod;
      else m[n - 15 + i][8] = mod;
      if (i < 8) m[8][n - i - 1] = mod;
      else if (i < 9) m[8][15 - i] = mod;
      else m[8][14 - i] = mod;
    }
    if (v >= 7) {
      var vb = (v << 12) | bch(v << 12, 0x1f25);
      for (i = 0; i < 18; i++) {
        var vm = (vb >> i) & 1;
        m[Math.floor(i / 3)][(i % 3) + n - 11] = vm;
        m[(i % 3) + n - 11][Math.floor(i / 3)] = vm;
      }
    }
    return m;
  }
  window.qrSvg = function (text, px) {
    var m = make(text),
      n = m.length,
      z = 4,
      d = "",
      r,
      c;
    for (r = 0; r < n; r++)
      for (c = 0; c < n; c++)
        if (m[r][c]) d += "M" + (c + z) + " " + (r + z) + "h1v1h-1z";
    var s = n + z * 2;
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      s +
      " " +
      s +
      '" width="' +
      (px || 240) +
      '" height="' +
      (px || 240) +
      '" role="img" aria-label="QR code"><rect width="' +
      s +
      '" height="' +
      s +
      '" fill="#fff"/><path d="' +
      d +
      '" fill="#000"/></svg>'
    );
  };
  window.qrMake = make;
})();
