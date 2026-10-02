/* GOPUSH — phần mở rộng module Creator: Phân loại Creator, tải lên / sao lưu Kho Creator,
   Gắn Tag và tải xuống cho mọi trang của module. Thao tác đi qua dispatch('crx:…') của app.js.
   Phân loại là bộ điều kiện chạy trên dữ liệu Creator lấy từ TikTok Shop (API), dùng làm
   bộ lọc "Phân loại" ở Tìm Creator và Kho Creator. */
(function (global) {
  'use strict';

  var P = global.PAGES, U = global.UI, S = global.DB, ic = global.icon, AIX = global.AIX;
  var pick = AIX.pick, st = AIX.st;

  /* ---------------------------------------------------------- trường dùng cho điều kiện */
  var FIELDS = {
    followers: { l: 'Follower', t: 'num' },
    gmv30: { l: 'GMV 30 ngày', t: 'num', money: true },
    postRate: { l: 'Tỉ lệ đăng sau khi nhận mẫu (%)', t: 'num' },
    gpm: { l: 'GPM (mỗi 1.000 lượt xem)', t: 'num', money: true },
    avgViews: { l: 'Lượt xem TB mỗi video', t: 'num' },
    liveViewers: { l: 'Người xem LIVE TB', t: 'num' },
    cat: { l: 'Ngành hàng', t: 'list' },
    country: { l: 'Quốc gia', t: 'list', opts: ['Việt Nam', 'Thái Lan', 'Malaysia'] },
    content: { l: 'Loại nội dung chính', t: 'list', opts: ['Video', 'LIVE'] },
    contact: { l: 'Có thông tin liên hệ', t: 'bool' }
  };
  var OPS = [{ v: 'gte', l: 'từ' }, { v: 'lte', l: 'đến' }, { v: 'between', l: 'trong khoảng' }];
  var TONES = ['sky', 'sage', 'sand', 'lilac', 'blush', 'mist'];

  function catOpts() {
    var seen = {};
    S.data.creators.forEach(function (cr) { seen[cr.cat] = 1; });
    return Object.keys(seen).sort();
  }
  function get(cr, f) {
    if (f === 'content') return cr.contentLabel === 2 ? 'LIVE' : 'Video';
    if (f === 'contact') return cr.contact ? 'Có' : 'Không';
    return cr[f];
  }
  /* nhận "1.000.000", "500K", "1,2M", "50tr" */
  function num(s) {
    s = String(s == null ? '' : s).trim().toLowerCase().replace(/\s/g, '');
    if (!s) return null;
    var mul = 1;
    if (/(k|n|nghìn)$/.test(s)) mul = 1e3; else if (/(m|tr|triệu)$/.test(s)) mul = 1e6; else if (/(b|tỷ|ty)$/.test(s)) mul = 1e9;
    s = s.replace(/[a-zà-ỹ]+$/i, '');
    s = mul > 1 ? s.replace(',', '.') : s.replace(/[.,]/g, '');
    var n = parseFloat(s);
    return isNaN(n) ? null : n * mul;
  }
  function condOk(q, cr) {
    var F = FIELDS[q.f]; if (!F) return true;
    var val = get(cr, q.f);
    if (F.t === 'num') {
      /* tiền người dùng nhập theo tiền tệ thị trường, đổi về đơn vị gốc để so */
      var a = num(q.v), b = num(q.v2);
      if (F.money) { if (a != null) a = S.toBase(a); if (b != null) b = S.toBase(b); }
      if (q.op === 'gte') return a == null || val >= a;
      if (q.op === 'lte') return a == null || val <= a;
      return (a == null || val >= a) && (b == null || val <= b);
    }
    if (F.t === 'bool') return !q.v || val === q.v;
    return !(q.list && q.list.length) || q.list.indexOf(val) > -1;
  }
  function match(seg, cr) { return seg.conds.every(function (q) { return condOk(q, cr); }); }
  function condText(q) {
    var F = FIELDS[q.f]; if (!F) return '';
    if (F.t === 'num') {
      var a = num(q.v), b = num(q.v2), fmt = function (v) { return F.money ? S.amt(S.toBase(v)) : S.short(v); };
      var fa = a == null ? '…' : fmt(a), fb = b == null ? '…' : fmt(b);
      return F.l + (q.op === 'gte' ? ' ≥ ' + fa : q.op === 'lte' ? ' ≤ ' + fa : ': ' + fa + ' – ' + fb);
    }
    if (F.t === 'bool') return F.l + ': ' + (q.v || 'bất kỳ');
    return F.l + ': ' + ((q.list && q.list.length) ? q.list.join(', ') : 'bất kỳ');
  }

  function segments() {
    var db = S.data;
    if (!db.segments) {
      db.segments = [
        { id: 'sg1', name: 'Mega', tone: 'lilac', desc: 'Ngôi sao trên 1 triệu follower, hợp chiến dịch ra mắt, phủ nhận diện.',
          conds: [{ f: 'followers', op: 'gte', v: '1000000' }] },
        { id: 'sg2', name: 'Macro', tone: 'sky', desc: 'Tầm ảnh hưởng lớn, chi phí cao, cần ràng buộc KPI rõ.',
          conds: [{ f: 'followers', op: 'between', v: '500000', v2: '999999' }] },
        { id: 'sg3', name: 'Mid-tier', tone: 'sage', desc: 'Cân bằng giữa độ phủ và tỉ lệ chuyển đổi.',
          conds: [{ f: 'followers', op: 'between', v: '100000', v2: '499999' }] },
        { id: 'sg4', name: 'Micro', tone: 'sand', desc: 'Khán giả trung thành, tương tác cao, dễ hợp tác bằng hoa hồng.',
          conds: [{ f: 'followers', op: 'between', v: '10000', v2: '99999' }] },
        { id: 'sg5', name: 'Nano', tone: 'mist', desc: 'Dưới 10K follower, phù hợp seeding số lượng lớn.',
          conds: [{ f: 'followers', op: 'lte', v: '9999' }] },
        { id: 'sg6', name: 'Freecast', tone: 'blush', desc: 'Creator nhận hàng mẫu đổi video, không thu phí booking, đăng đều.',
          conds: [{ f: 'followers', op: 'lte', v: '50000' }, { f: 'postRate', op: 'gte', v: '60' }] },
        { id: 'sg7', name: 'LIVE seller', tone: 'sky', desc: 'Bán chủ yếu qua LIVE, có lượng người xem ổn định.',
          conds: [{ f: 'content', list: ['LIVE'] }, { f: 'liveViewers', op: 'gte', v: '500' }] }
      ];
    }
    return db.segments;
  }
  /* Kho Creator của shop: dữ liệu đã đồng bộ về GOPUSH và sao lưu hằng ngày.
     Phân loại, Gắn Tag và mọi tác vụ AI đều chạy trên tập này, không gọi API TikTok. */
  function kho(sid) { return S.data.creators.filter(function (cr) { return cr.rel[sid] && cr.rel[sid].saved && !S.isBlacklisted(cr.id, sid); }); }
  function backupAt() { return (S.data.backup && S.data.backup.at) || 'Hôm nay 02:00'; }
  function segByName(n) { return segments().filter(function (s) { return s.name === n; })[0]; }

  /* ---------------------------------------------------------- CSV */
  function fileDate() { return S.fmtDate(new Date()).replace(/\//g, ''); }
  function tagNames(r) { return r.tags.map(function (t) { var x = S.tag(t); return x ? x.name : ''; }).filter(Boolean).join(', '); }
  function creatorCSV(list, sid, full) {
    var cols = ['Tên', 'Username', 'Kênh TikTok', 'Ngành hàng', 'Quốc gia', 'Follower', 'GMV 30 ngày (' + S.market().iso + ')', 'GPM (' + S.market().iso + ')', 'Tỉ lệ đăng', 'Phân loại', 'Quan hệ', 'Tag'];
    if (full) cols = cols.concat(['Phụ trách', 'Email', 'Số điện thoại', 'Ghi chú nội bộ']);
    var segs = segments();
    return S.toCSV(cols, list.map(function (c) {
      var r = S.rel(c, sid);
      var row = [c.name, '@' + c.user, c.tiktok, c.cat, c.country, c.followers, Math.round(S.fx(c.gmv30)), Math.round(S.fx(c.gpm)), c.postRate + '%',
        segs.filter(function (g) { return match(g, c); }).map(function (g) { return g.name; }).join(', '), r.state, tagNames(r)];
      if (full) row = row.concat([r.owner, c.email || '', c.phone || '', r.note || '']);
      return row;
    }));
  }
  function save(name, csv, n, toast) { S.download('gopush-' + name + '-' + fileDate() + '.csv', csv); toast('Đã tải xuống ' + S.num(n) + ' dòng'); }

  /* ---------------------------------------------------------- trang Phân loại Creator */
  function editor(c) {
    var x = st(c), e = x.edit, cats = catOpts();
    var count = kho(c.shop.id).filter(function (cr) { return match(e, cr); }).length;
    return '<div class="ig-segedit">' +
      '<div class="ig-segedit-head"><h3>' + (e.id ? 'Sửa phân loại “' + U.esc(e.name) + '”' : 'Thêm phân loại') + '</h3>' +
        '<span class="spacer"></span>' + U.iconBtn('x', 'Đóng', 'crx:seg:cancel') + '</div>' +
      '<div class="ig-segedit-grid">' +
        U.field('Tên phân loại', '<label class="gm-input"><input type="text" data-seg="name" value="' + U.attr(e.name) + '" placeholder="Ví dụ: Macro, Freecast, KOC review"></label>') +
        U.field('Mô tả', '<label class="gm-input"><input type="text" data-seg="desc" value="' + U.attr(e.desc) + '" placeholder="Nhóm này dùng để làm gì"></label>') +
        U.field('Màu', '<div class="ig-segtones">' + TONES.map(function (t) {
          return '<button class="tone-' + t + (e.tone === t ? ' on' : '') + '" data-do="crx:seg:tone:' + t + '" aria-label="' + t + '"></button>';
        }).join('') + '</div>') +
      '</div>' +
      '<div class="ig-segconds"><div class="h"><b>Điều kiện</b><span class="gm-help">Creator phải thỏa tất cả điều kiện</span></div>' +
        e.conds.map(function (q, i) {
          var F = FIELDS[q.f], ctl;
          if (F.t === 'num') {
            ctl = pick(c, 'so' + i, 'Phép so', OPS, { value: q.op, act: 'crx:seg:op:' + i }) +
              '<label class="gm-input gm-input-sm"><input type="text" data-segv="' + i + ':v" value="' + U.attr(q.v || '') + '" placeholder="' + (q.op === 'between' ? 'Từ' : 'Giá trị') + ', vd 100K"></label>' +
              (q.op === 'between' ? '<span class="gm-help">đến</span><label class="gm-input gm-input-sm"><input type="text" data-segv="' + i + ':v2" value="' + U.attr(q.v2 || '') + '" placeholder="Đến, vd 500K"></label>' : '');
          } else if (F.t === 'bool') {
            ctl = pick(c, 'sb' + i, 'Giá trị', ['Có', 'Không'], { value: q.v, act: 'crx:seg:v:' + i, ph: 'Bất kỳ' });
          } else {
            ctl = pick(c, 'sl' + i, 'Chọn', F.opts || cats, { value: q.list || [], act: 'crx:seg:lv:' + i, multi: true, wide: true });
          }
          return '<div class="ig-segcond"><span class="and">' + (i ? 'và' : 'Khi') + '</span>' +
            pick(c, 'sf' + i, 'Trường', Object.keys(FIELDS).map(function (k) { return { v: k, l: FIELDS[k].l }; }), { value: q.f, act: 'crx:seg:f:' + i, wide: true }) +
            ctl + '<span class="spacer"></span>' + (e.conds.length > 1 ? U.iconBtn('trash', 'Bỏ điều kiện', 'crx:seg:rm:' + i) : '') + '</div>';
        }).join('') +
        U.btn('Thêm điều kiện', { sm: true, variant: 'ghost', icon: 'plus', act: 'crx:seg:add' }) +
      '</div>' +
      '<div class="ig-segedit-foot"><span class="ig-segcount">Khớp <b class="gm-num" id="seg-count">' + S.num(count) + '</b> Creator trong Kho</span>' +
        '<span class="spacer"></span>' + U.btn('Hủy', { act: 'crx:seg:cancel' }) +
        U.btn(e.id ? 'Lưu thay đổi' : 'Tạo phân loại', { variant: 'primary', act: 'crx:seg:save' }) + '</div>' +
    '</div>';
  }

  P.segments = function (c) {
    var x = st(c), sid = c.shop.id, segs = segments(), pool = kho(sid), total = pool.length || 1;
    var cards = segs.map(function (g) {
      var m = pool.filter(function (cr) { return match(g, cr); });
      return '<article class="ig-segcard tone-' + g.tone + '">' +
        '<header><span class="dot"></span><b>' + U.esc(g.name) + '</b><span class="spacer"></span>' +
          U.iconBtn('download', 'Tải danh sách', 'crx:dl:seg:' + g.id) +
          U.iconBtn('edit', 'Sửa', 'crx:seg:edit:' + g.id) +
          U.iconBtn('trash', 'Xóa', 'crx:seg:del:' + g.id) + '</header>' +
        '<div class="num"><b class="gm-num">' + S.num(m.length) + '</b><span>Creator trong Kho · ' + S.pct(m.length / total * 100) + '</span></div>' +
        '<span class="bar"><i style="width:' + Math.max(2, m.length / total * 100) + '%"></i></span>' +
        (g.desc ? '<p>' + U.esc(g.desc) + '</p>' : '') +
        '<div class="conds">' + g.conds.map(function (q) { return '<span>' + U.esc(condText(q)) + '</span>'; }).join('') + '</div>' +
        '<footer>' + U.btn('Xem trong Kho', { sm: true, icon: 'database', act: 'crx:seg:kho:' + g.id }) +
          U.btn('Tìm thêm qua API', { sm: true, variant: 'ghost', act: 'crx:seg:find:' + g.id, title: 'Dùng điều kiện này để tìm Creator mới ở Tìm Creator' }) + '</footer>' +
      '</article>';
    }).join('');
    return c.head(
      U.btn('Tải xuống', { icon: 'download', act: 'crx:dl:segments' }) +
      U.btn('Thêm phân loại', { variant: 'primary', icon: 'plus', act: 'crx:seg:new' })
    ) +
    '<div class="ig-section">' +
      srcNote(c, 'Phân loại chạy trên Kho Creator. Một Creator có thể thuộc nhiều phân loại; dùng làm bộ lọc <b>Phân loại</b> ở Kho Creator, hoặc mang điều kiện sang Tìm Creator để tìm thêm qua API.') +
      (x.edit ? editor(c) : '') +
      '<div class="ig-segs">' + cards + '</div>' +
    '</div>';
  };

  /* dải ghi nguồn dữ liệu đặt đầu trang: trang này đang đọc từ đâu */
  function srcNote(c, text, api) {
    var sid = c.shop.id;
    return '<div class="ig-srcnote' + (api ? ' is-api' : '') + '">' + ic(api ? 'globe' : 'database') +
      '<span><b>' + (api ? 'Nguồn: API TikTok Shop' : 'Nguồn: Kho Creator · ' + S.num(kho(sid).length) + ' Creator · sao lưu ' + U.esc(backupAt())) + '</b>' +
      (text ? ' — ' + text : '') + '</span>' +
      (api ? '' : '<a class="gm-link" data-do="go:/s/' + sid + '/creators/library">Mở Kho</a>') + '</div>';
  }

  var baseDiscover = P.discover;
  P.discover = function (c) {
    var html = baseDiscover(c), cut = html.indexOf('<nav class="gm-tabs">');
    var note = srcNote(c, 'kết quả lấy trực tiếp, chưa nằm trong Kho. Lưu vào Kho để phân loại, gắn tag và để GOPUSH AI phân tích.', true);
    return cut > -1 ? html.slice(0, cut) + note + html.slice(cut) : html;
  };

  /* ---------------------------------------------------------- Kho Creator: sao lưu và tải lên */
  var baseLibrary = P.library;
  P.library = function (c) {
    var x = st(c), sid = c.shop.id;
    var saved = S.data.creators.filter(function (cr) { return cr.rel[sid] && cr.rel[sid].saved; }).length;
    var b = S.data.backup || { at: 'Hôm nay 02:00' };
    var top = '<div class="ig-libtop">' +
      '<span class="ic">' + ic('database') + '</span>' +
      '<div class="t"><b>Kho dữ liệu Creator của bạn trên GOPUSH</b>' +
        '<span>' + S.num(saved) + ' Creator · đồng bộ từ TikTok Shop và sao lưu tự động 02:00 mỗi ngày · bản gần nhất ' + U.esc(b.at) +
        ' · Phân loại, Gắn Tag và GOPUSH AI đều khai thác dữ liệu này</span></div>' +
      '<span class="spacer"></span>' +
      U.btn('Tải bản sao lưu', { sm: true, icon: 'download', act: 'crx:dl:backup' }) +
      U.btn('Sao lưu ngay', { sm: true, icon: 'refresh', act: 'crx:backup' }) +
    '</div>' +
    (x.up ? uploadPanel(x) : '');
    var html = baseLibrary(c), cut = html.indexOf('<nav class="gm-tabs">');
    return cut > -1 ? html.slice(0, cut) + top + html.slice(cut) : top + html;
  };

  function uploadPanel(x) {
    var r = x.upRes;
    return '<div class="ig-upload">' +
      '<label class="ig-drop" data-drop>' +
        '<input type="file" accept=".csv,text/csv" data-crxfile hidden>' + ic('upload') +
        '<b>Kéo thả file CSV vào đây hoặc bấm để chọn file</b>' +
        '<span>Cột bắt buộc: <code>Username</code>. Nên có: Tên, Ngành hàng, Follower, Tag, Ghi chú. File Excel: chọn “Lưu thành CSV UTF-8”.</span>' +
      '</label>' +
      '<div class="ig-upload-side">' +
        (r ? '<div class="ig-upres"><b>' + U.esc(r.file) + '</b>' +
          '<span class="ok">' + ic('check') + S.num(r.added) + ' Creator mới đã thêm vào Kho</span>' +
          (r.existing ? '<span>' + ic('refresh') + S.num(r.existing) + ' Creator đã có, cập nhật và đánh dấu lưu</span>' : '') +
          (r.bad ? '<span class="bad">' + ic('alert') + S.num(r.bad) + ' dòng thiếu Username, bỏ qua</span>' : '') + '</div>'
          : '<p class="gm-help">GOPUSH khớp Creator theo Username. Creator đã có trong Kho sẽ được cập nhật Tag và ghi chú, không tạo trùng.</p>') +
        U.btn('Tải file mẫu', { sm: true, icon: 'download', act: 'crx:tpl' }) +
        U.btn('Đóng', { sm: true, variant: 'ghost', act: 'crx:up' }) +
      '</div></div>';
  }

  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    var first = text.split(/\r?\n/)[0] || '', sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (v) { return v.trim(); }); });
  }

  function importRows(rows, sid, fileName) {
    var db = S.data, head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    function col(names) { for (var k = 0; k < head.length; k++) if (names.indexOf(head[k]) > -1) return k; return -1; }
    var cU = col(['username', 'user', 'tiktok', 'kênh tiktok', 'tài khoản']), cN = col(['tên', 'name', 'họ tên']),
      cC = col(['ngành hàng', 'category', 'ngành']), cF = col(['follower', 'followers']), cT = col(['tag', 'tags', 'nhãn']), cG = col(['ghi chú', 'note', 'ghi chú nội bộ']);
    var res = { file: fileName, added: 0, existing: 0, bad: 0 };
    rows.slice(1).forEach(function (r) {
      var u = cU > -1 ? (r[cU] || '').trim().replace(/^https?:\/\/(www\.)?tiktok\.com\/@/, '').replace(/^@/, '').split(/[/?]/)[0] : '';
      if (!u) { res.bad++; return; }
      var cr = db.creators.filter(function (x) { return x.user.toLowerCase() === u.toLowerCase(); })[0];
      if (cr) res.existing++;
      else {
        cr = { id: S.uid('c'), oecId: S.uid('oec'), name: cN > -1 && r[cN] ? r[cN].trim() : u, user: u,
          tiktok: 'https://www.tiktok.com/@' + u, catL1: '600001', cat2: '600372', cat: cC > -1 && r[cC] ? r[cC].trim() : 'Khác',
          avgCommission: 0, contentLabel: 1, agency: 2, langs: ['0'], risingStar: false, ageGroups: [1], gender: 3, genderPct: 5000,
          country: 'Việt Nam', region: 'TP.HCM', followers: cF > -1 ? (num(r[cF]) || 0) : 0, gmv30: 0, gmvBand: 1, gpm: 0, postRate: 0,
          avgViews: 0, liveViewers: 0, unitsSold: 0, unitsBand: 1, engagement: 0, fulfillment: 2,
          brands: [], promoting: 0, contact: false, email: '', phone: '', rel: {} };
        db.creators.unshift(cr); res.added++;
      }
      var rl = S.rel(cr, sid); rl.saved = true;
      if (cG > -1 && r[cG]) rl.note = r[cG].trim();
      if (cT > -1 && r[cT]) r[cT].split(/[,|]/).forEach(function (tn) {
        tn = tn.trim(); if (!tn) return;
        var tg = db.tags.filter(function (t) { return t.name.toLowerCase() === tn.toLowerCase(); })[0];
        if (!tg) { tg = { id: S.uid('t'), name: tn, desc: 'Tạo khi tải lên', by: db.settings.profile.name }; db.tags.push(tg); }
        if (rl.tags.indexOf(tg.id) < 0) rl.tags.push(tg.id);
      });
    });
    S.log('Tải lên ' + fileName + ': ' + res.added + ' Creator mới, ' + res.existing + ' cập nhật', 'Creator', sid);
    S.save();
    return res;
  }

  function readFile(file) {
    if (!file || !global.APP) return;
    var c = global.APP.vz(), x = st(c);
    if (!/\.csv$/i.test(file.name)) { x.upRes = { file: file.name, added: 0, existing: 0, bad: 0 }; alertBad(file.name); return; }
    var fr = new FileReader();
    fr.onload = function () {
      var rows = parseCSV(String(fr.result || ''));
      x.upRes = rows.length > 1 ? importRows(rows, c.shop.id, file.name) : { file: file.name, added: 0, existing: 0, bad: 0 };
      global.APP.refresh();
    };
    fr.readAsText(file, 'utf-8');
  }
  function alertBad(name) {
    var t = document.querySelector('.ig-upload-side');
    if (t) t.insertAdjacentHTML('afterbegin', '<p class="ig-upbad">' + ic('alert') + U.esc(name) + ' không phải file CSV. Mở bằng Excel rồi chọn Lưu thành CSV UTF-8.</p>');
  }
  document.addEventListener('change', function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-crxfile')) readFile(e.target.files[0]);
  });
  document.addEventListener('dragover', function (e) {
    var d = e.target.closest && e.target.closest('[data-drop]'); if (!d) return;
    e.preventDefault(); d.classList.add('is-over');
  });
  document.addEventListener('dragleave', function (e) {
    var d = e.target.closest && e.target.closest('[data-drop]'); if (d) d.classList.remove('is-over');
  });
  document.addEventListener('drop', function (e) {
    var d = e.target.closest && e.target.closest('[data-drop]'); if (!d) return;
    e.preventDefault(); d.classList.remove('is-over');
    readFile(e.dataTransfer.files[0]);
  });

  /* ---------------------------------------------------------- Gắn Tag */
  P.tags = function (c) {
    var db = S.data, v = c.v, x = st(c), sid = c.shop.id;
    var rows = db.tags.filter(function (t) { return !v.q || (t.name + ' ' + t.desc).toLowerCase().indexOf(v.q.toLowerCase()) > -1; }).map(function (t) {
      var count = db.creators.filter(function (cr) {
        return Object.keys(cr.rel).some(function (k) { return cr.rel[k].tags.indexOf(t.id) > -1; });
      }).length;
      return { id: t.id, name: t.name, desc: t.desc, by: t.by, count: count };
    });
    var r = x.tagRes;
    return c.head(
      U.btn('Tải xuống', { icon: 'download', act: 'crx:dl:tags' }) +
      U.btn('Tạo tag', { variant: 'primary', icon: 'plus', act: 'tag:new' })
    ) +
    '<div class="ig-section">' +
      '<div class="ig-tagquick">' +
        '<div class="h"><b>Gắn tag nhanh</b><span class="gm-help">Dán danh sách username (mỗi dòng một người, hoặc cách nhau dấu phẩy), chọn tag rồi bấm Gắn tag. Áp dụng cho shop ' + U.esc(c.shop.name) + '.</span></div>' +
        '<div class="row">' +
          '<label class="gm-input gm-input-area"><textarea rows="2" data-aix="tagUsers" placeholder="@huyenmy.review, @an.coffee…">' + U.esc(x.tagUsers || '') + '</textarea></label>' +
          '<div class="side">' + pick(c, 'tagPick', 'Tag', db.tags.map(function (t) { return { v: t.id, l: t.name, s: t.desc }; }), { multi: true, icon: 'tag', ph: 'Chọn tag' }) +
            U.btn('Gắn tag', { variant: 'primary', icon: 'tag', act: 'crx:tag:apply' }) + '</div>' +
        '</div>' +
        (r ? '<p class="res">' + ic('check') + 'Đã gắn ' + r.tags + ' tag cho <b>' + r.ok + '</b> Creator' + (r.miss.length ? ' · không tìm thấy: ' + U.esc(r.miss.slice(0, 5).join(', ')) + (r.miss.length > 5 ? '…' : '') : '') + '</p>' : '') +
        '<p class="gm-help">Hoặc chọn nhiều Creator trong <a class="gm-link" data-do="go:/s/' + sid + '/creators/library">Kho Creator</a> rồi bấm “Gắn tag”.</p>' +
      '</div>' +
    '</div>' +
    U.filters({ ph: 'Tìm tag', q: v.q, right: '<span class="ig-fmeta"><b class="gm-num">' + rows.length + '</b> tag</span>' }) +
    U.table({
      cols: [
        { k: 'name', t: 'Tag', r: function (o) { return '<span class="gm-tag gm-tag-ink">' + ic('tag') + U.esc(o.name) + '</span>'; } },
        { k: 'desc', t: 'Mô tả' },
        { k: 'count', t: 'Số Creator', cls: 'num', r: function (o) { return S.num(o.count); } },
        { k: 'by', t: 'Người tạo' },
        { k: '', t: '', cls: 'col-actions', r: function (o) {
          return U.btn('Xem Creator', { sm: true, act: 'crx:tag:view:' + o.id }) + ' ' +
            U.iconBtn('download', 'Tải danh sách', 'crx:dl:tag:' + o.id) +
            U.iconBtn('edit', 'Sửa', 'tag:edit:' + o.id) + U.iconBtn('trash', 'Xóa', 'tag:del:' + o.id); } }
      ],
      rows: rows
    });
  };

  /* ---------------------------------------------------------- thao tác */
  function goFiltered(pageId, path, f) {
    var vw = global.APP.view(pageId);
    vw.f = f; vw.q = ''; vw.page = 1; vw.tab = 0;
    location.hash = '#' + path;
  }

  function action(a, el, c, refresh, toast) {
    var x = st(c), db = S.data, sid = c.shop.id, verb = a[0], arg = a[1], rest = a.slice(2).join(':');

    if (verb === 'dl') {
      if (arg === 'discover') { var l1 = P.creatorRows(c, {}); save('tim-creator', creatorCSV(l1, sid), l1.length, toast); }
      else if (arg === 'library') { var l2 = P.creatorRows(c, { savedOnly: true }); save('kho-creator', creatorCSV(l2, sid), l2.length, toast); }
      else if (arg === 'backup') {
        var l3 = db.creators.filter(function (cr) { return cr.rel[sid] && cr.rel[sid].saved; });
        save('sao-luu-kho-creator', creatorCSV(l3, sid, true), l3.length, toast);
      } else if (arg === 'segments') {
        var segs = segments();
        save('phan-loai-creator', S.toCSV(['Phân loại', 'Mô tả', 'Điều kiện', 'Số Creator'], segs.map(function (g) {
          return [g.name, g.desc, g.conds.map(condText).join(' và '), kho(sid).filter(function (cr) { return match(g, cr); }).length];
        })), segs.length, toast);
      } else if (arg === 'seg') {
        var g2 = segments().filter(function (g) { return g.id === rest; })[0];
        if (g2) { var l4 = kho(sid).filter(function (cr) { return match(g2, cr); }); save('phan-loai-' + g2.name.toLowerCase().replace(/\s+/g, '-'), creatorCSV(l4, sid), l4.length, toast); }
      } else if (arg === 'tags') {
        save('tag', S.toCSV(['Tag', 'Mô tả', 'Số Creator', 'Người tạo'], db.tags.map(function (t) {
          return [t.name, t.desc, db.creators.filter(function (cr) { return Object.keys(cr.rel).some(function (k) { return cr.rel[k].tags.indexOf(t.id) > -1; }); }).length, t.by];
        })), db.tags.length, toast);
      } else if (arg === 'tag') {
        var l5 = db.creators.filter(function (cr) { return cr.rel[sid] && cr.rel[sid].tags.indexOf(rest) > -1; });
        save('tag-' + ((S.tag(rest) || {}).name || rest), creatorCSV(l5, sid), l5.length, toast);
      } else if (arg === 'blacklist') {
        var bl = db.blacklist.filter(function (b) { return b.shopId === sid; });
        save('blacklist', S.toCSV(['Creator', 'Username', 'Kênh TikTok', 'Lý do', 'Người thêm', 'Ngày thêm'], bl.map(function (b) {
          var cr = S.creator(b.creatorId) || { name: '', user: '', tiktok: '' };
          return [cr.name, '@' + cr.user, cr.tiktok, b.reason, b.by, b.at];
        })), bl.length, toast);
      }
      return true;
    }

    if (verb === 'up') { x.up = !x.up; if (!x.up) x.upRes = null; refresh(); return true; }
    if (verb === 'tpl') {
      S.download('gopush-mau-tai-len-creator.csv', S.toCSV(['Username', 'Tên', 'Ngành hàng', 'Follower', 'Tag', 'Ghi chú'],
        [['@huyenmy.review', 'Huyền My', 'Đồ uống', '120000', 'Ưu tiên, F&B', 'Đã làm việc qua Zalo'],
         ['@an.coffee', 'An Coffee', 'Đồ uống', '45000', 'Thử nghiệm', '']]));
      return true;
    }
    if (verb === 'backup') {
      db.backup = { at: S.fmtDateTime(new Date()) }; S.log('Sao lưu Kho Creator', 'Creator', sid); S.save();
      toast('Đã sao lưu Kho Creator'); refresh(); return true;
    }

    if (verb === 'tag') {
      if (arg === 'view') { var tg = S.tag(rest); if (tg) goFiltered('library', '/s/' + sid + '/creators/library', { tag: tg.name }); }
      else if (arg === 'apply') {
        var users = String(x.tagUsers || '').split(/[\s,;]+/).map(function (u) { return u.replace(/^@/, '').replace(/^https?:\/\/(www\.)?tiktok\.com\/@/, '').trim().toLowerCase(); }).filter(Boolean);
        var tags = x.tagPick || [];
        if (!users.length) { toast('Dán ít nhất một username'); return true; }
        if (!tags.length) { toast('Chọn ít nhất một tag'); return true; }
        var ok = 0, miss = [];
        users.forEach(function (u) {
          var cr = db.creators.filter(function (q) { return q.user.toLowerCase() === u; })[0];
          if (!cr) { miss.push('@' + u); return; }
          var rl = S.rel(cr, sid); rl.saved = true;
          tags.forEach(function (t) { if (rl.tags.indexOf(t) < 0) rl.tags.push(t); });
          ok++;
        });
        x.tagRes = { ok: ok, miss: miss, tags: tags.length };
        S.log('Gắn tag cho ' + ok + ' Creator', 'Creator', sid); S.save(); refresh();
      }
      return true;
    }

    if (verb === 'seg') {
      var segs2 = segments(), e = x.edit;
      if (arg === 'new') { x.edit = { name: '', desc: '', tone: 'sky', conds: [{ f: 'followers', op: 'between', v: '', v2: '' }] }; refresh(); scrollTop(); }
      else if (arg === 'edit') {
        var g = segs2.filter(function (q) { return q.id === rest; })[0];
        if (g) { x.edit = JSON.parse(JSON.stringify(g)); refresh(); scrollTop(); }
      } else if (arg === 'cancel') { x.edit = null; x.open = null; refresh(); }
      else if (arg === 'del') {
        var g3 = segs2.filter(function (q) { return q.id === rest; })[0];
        if (g3) global.APP.confirm('Xóa phân loại', 'Xóa phân loại “' + g3.name + '”? Creator không bị xóa.', 'Xóa', function () {
          db.segments = segs2.filter(function (q) { return q.id !== rest; }); S.save(); toast('Đã xóa phân loại'); refresh();
        });
      } else if (arg === 'find' || arg === 'kho') {
        var g4 = segs2.filter(function (q) { return q.id === rest; })[0];
        if (g4) arg === 'find' ? goFiltered('discover', '/s/' + sid + '/creators/discover', { seg: g4.name })
          : goFiltered('library', '/s/' + sid + '/creators/library', { seg: g4.name });
      } else if (e) {
        var i = parseInt(a[2], 10), val = a.slice(3).join(':');
        if (arg === 'tone') e.tone = a[2];
        else if (arg === 'add') e.conds.push({ f: 'gmv30', op: 'gte', v: '' });
        else if (arg === 'rm') e.conds.splice(i, 1);
        else if (arg === 'f') { var t = FIELDS[val].t; e.conds[i] = t === 'num' ? { f: val, op: 'gte', v: '' } : (t === 'bool' ? { f: val, v: 'Có' } : { f: val, list: [] }); x.open = null; }
        else if (arg === 'op') { e.conds[i].op = val; x.open = null; }
        else if (arg === 'v') { e.conds[i].v = val; x.open = null; }
        else if (arg === 'lv') { var L = e.conds[i].list = e.conds[i].list || [], k = L.indexOf(val); if (k > -1) L.splice(k, 1); else L.push(val); }
        else if (arg === 'save') {
          if (!e.name.trim()) { toast('Đặt tên cho phân loại'); return true; }
          if (segs2.some(function (q) { return q.name.toLowerCase() === e.name.trim().toLowerCase() && q.id !== e.id; })) { toast('Tên phân loại đã có'); return true; }
          e.name = e.name.trim();
          if (e.id) db.segments = segs2.map(function (q) { return q.id === e.id ? e : q; });
          else { e.id = S.uid('sg'); segs2.push(e); }
          S.log('Lưu phân loại Creator “' + e.name + '”', 'Creator', sid); S.save();
          x.edit = null; toast('Đã lưu phân loại “' + e.name + '”');
        }
        refresh();
      }
      return true;
    }
    return false;
  }
  function scrollTop() { var v = document.getElementById('view'); if (v) v.scrollTop = 0; }

  /* ô nhập trong trình sửa phân loại: ghi thẳng, cập nhật số Creator khớp tại chỗ */
  document.addEventListener('input', function (e) {
    var t = e.target, k = t.getAttribute && (t.getAttribute('data-seg') || t.getAttribute('data-segv'));
    if (!k || !global.APP) return;
    var x = st(global.APP.vz()), ed = x.edit; if (!ed) return;
    if (t.hasAttribute('data-seg')) ed[k] = t.value;
    else { var p = k.split(':'); ed.conds[parseInt(p[0], 10)][p[1]] = t.value; }
    var n = document.getElementById('seg-count');
    if (n) n.textContent = S.num(kho(global.APP.vz().shop.id).filter(function (cr) { return match(ed, cr); }).length);
  });

  global.CRX = {
    action: action,
    segNames: function () { return segments().map(function (g) { return g.name; }); },
    kho: kho, backupAt: backupAt, srcNote: srcNote,
    inSeg: function (name, cr) { var g = segByName(name); return !g || match(g, cr); }
  };
})(window);
