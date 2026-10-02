/* GOPUSH — menu GOPUSH AI: AI Chat, Report AI, AI Tìm Creator, Content AI.
   Trang dựng bằng chuỗi HTML như pages.js; thao tác đi qua dispatch('aix:…') của app.js.
   Lựa chọn dùng bộ chọn dạng filter (pick): bấm mới mở danh sách, có ô tìm khi dài.
   Mỗi lần "chạy AI" là một job có các bước và thanh tiến độ, cập nhật thẳng vào DOM
   (#aix-job) để không vẽ lại cả trang; xong job mới refresh để hiện kết quả. */
(function (global) {
  'use strict';

  var P = global.PAGES, U = global.UI, S = global.DB, ic = global.icon;

  /* Model do đội GOPUSH cấu hình trong code. Khách hàng không thấy tên model;
     chỉ admin hệ thống (AUTH.isAdmin) mới thấy và đổi được. */
  var AI_MODEL = 'GPT-5';
  var MODELS = ['GPT-5', 'GPT-5 mini', 'GPT-4.1', 'GPT-4o'];

  try { localStorage.removeItem('gopush.sys'); } catch (e) { /* cờ của bản trước */ }
  function isSystem() { return !!(global.AUTH && global.AUTH.isAdmin && global.AUTH.isAdmin()); }

  /* ---------------------------------------------------------- tiện ích */
  /* số giả ngẫu nhiên ổn định theo chuỗi, để cùng yêu cầu ra cùng kết quả */
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 10000) / 10000;
  }
  function st(c) { if (!c.v.aix) c.v.aix = {}; return c.v.aix; }
  function model(c) { return (isSystem() && st(c).model) || AI_MODEL; }
  function pct(a, b) { return b ? a / b * 100 : 0; }
  function p1(n) { return S.pct(n); }
  function kho(sid) { return global.CRX ? global.CRX.kho(sid) : []; }
  function srcNote(c, t) { return global.CRX ? global.CRX.srcNote(c, t) : ''; }
  function fileDate() { return S.fmtDate(new Date()).replace(/\//g, ''); }

  /* ---------------------------------------------------------- bộ chọn dạng filter
     opts: [{ v, l, s? }]. multi: chọn nhiều. Bấm nút mở popup; popup có ô tìm khi > 7 mục.
     o.value / o.act: lấy giá trị và gửi lựa chọn đi nơi khác thay vì x[key] (dùng ở Phân loại Creator). */
  function optOf(o) { return typeof o === 'string' ? { v: o, l: o } : o; }
  function pick(c, key, label, opts, o) {
    o = o || {};
    var x = st(c), val = o.value !== undefined ? o.value : x[key], open = x.open === key;
    opts = opts.map(optOf);
    var picked = o.multi ? opts.filter(function (q) { return (val || []).indexOf(q.v) > -1; }) : opts.filter(function (q) { return q.v === val; });
    var sum = !picked.length ? (o.ph || 'Tất cả') :
      (picked.length === 1 ? picked[0].l : picked[0].l + ' +' + (picked.length - 1));
    var html = '<div class="ig-xp' + (open ? ' is-open' : '') + (picked.length ? ' has-val' : '') + '">' +
      '<button class="ig-xp-btn" data-do="aix:open:' + key + '" aria-expanded="' + open + '">' +
        (o.icon ? ic(o.icon) : '') + '<span class="l">' + U.esc(label) + '</span>' +
        '<span class="v">' + U.esc(sum) + '</span>' + ic('down', 'chev') + '</button>';
    if (open) {
      html += '<div class="ig-xp-pop' + (o.wide ? ' wide' : '') + '">' +
        (opts.length > 7 ? '<label class="gm-input gm-input-sm ig-xp-q">' + ic('search') +
          '<input type="search" data-xpq placeholder="Tìm trong ' + opts.length + ' mục"></label>' : '') +
        '<div class="ig-xp-list">' + opts.map(function (q) {
          var on = picked.indexOf(q) > -1;
          return '<button class="' + (on ? 'on' : '') + '" data-txt="' + U.attr(q.l.toLowerCase()) + '" data-do="' +
            (o.act ? U.attr(o.act) : 'aix:' + (o.multi ? 'tog' : 'set') + ':' + key) + ':' + U.attr(q.v) + '">' +
            '<span class="' + (o.multi ? 'gm-check' : 'ig-xp-radio') + (on ? ' on' : '') + '"></span>' +
            '<span class="t">' + U.esc(q.l) + (q.s ? '<small>' + U.esc(q.s) + '</small>' : '') + '</span></button>';
        }).join('') + '</div>' +
        (o.multi ? '<div class="ig-xp-foot"><span>Đã chọn <b class="gm-num">' + picked.length + '</b></span><span class="spacer"></span>' +
          (picked.length ? U.btn('Bỏ chọn', { sm: true, variant: 'ghost', act: 'aix:clr:' + key }) : '') +
          U.btn('Xong', { sm: true, variant: 'primary', act: 'aix:open:' }) + '</div>' : '') +
      '</div>';
    }
    return html + '</div>';
  }
  function inp(key, value, ph) {
    return '<label class="gm-input"><input type="text" data-aix="' + key + '" value="' + U.attr(value || '') +
      '" placeholder="' + U.attr(ph || '') + '"></label>';
  }
  function area(key, value, ph, rows) {
    return '<label class="gm-input gm-input-area"><textarea rows="' + (rows || 3) + '" data-aix="' + key + '" placeholder="' +
      U.attr(ph || '') + '">' + U.esc(value || '') + '</textarea></label>';
  }
  /* chỉ tài khoản hệ thống mới thấy bộ chọn model */
  function modelPick(c) {
    if (!isSystem()) return '';
    if (!st(c).model) st(c).model = AI_MODEL;
    return pick(c, 'model', 'Model', MODELS, { icon: 'sparkle' }) +
      '<span class="ig-xsys" title="Khách hàng không thấy mục này">Tài khoản hệ thống</span>';
  }

  /* ---------------------------------------------------------- job + thanh tiến độ */
  var JOB = null;   /* { view, steps, i, pct, title, timer } */

  function jobHTML(j) {
    var pc = Math.min(100, Math.round(j.pct));
    return '<div class="ig-xjob" id="aix-job" aria-live="polite">' +
      '<div class="ig-xjob-head">' +
        '<span class="ig-xorb"><i></i>' + ic('ai') + '</span>' +
        '<div class="t"><b>' + U.esc(j.title) + '</b><span>' + U.esc(j.steps[Math.min(j.i, j.steps.length - 1)]) + '…</span></div>' +
        (isSystem() ? '<span class="gm-tag">' + U.esc(j.model) + '</span>' : '') +
        '<b class="gm-num pct">' + pc + '%</b>' +
      '</div>' +
      '<div class="ig-xbar"><i style="width:' + pc + '%"></i></div>' +
      '<ol class="ig-xsteps">' + j.steps.map(function (s, k) {
        var cls = k < j.i ? 'done' : (k === j.i ? 'run' : '');
        return '<li class="' + cls + '"><span class="dot">' + (k < j.i ? ic('check') : '') + '</span>' + U.esc(s) + '</li>';
      }).join('') + '</ol>' +
    '</div>';
  }
  function paintJob() { var el = document.getElementById('aix-job'); if (el && JOB) el.outerHTML = jobHTML(JOB); }

  /* mỗi bước 500–900ms, thanh tiến độ trôi đều trong từng bước */
  function runJob(view, o, done) {
    if (JOB && JOB.timer) clearInterval(JOB.timer);
    var per = o.steps.map(function (s, k) { return 500 + Math.round(hash(s + k) * 400); });
    var total = per.reduce(function (a, b) { return a + b; }, 0), t = 0;
    JOB = { view: view, steps: o.steps, i: 0, pct: 0, model: o.model, title: o.title };
    view.job = o.key;
    global.APP.refresh();
    var el = document.getElementById('aix-job'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    JOB.timer = setInterval(function () {
      t += 60;
      var acc = 0, i = 0;
      while (i < per.length && t >= acc + per[i]) { acc += per[i]; i++; }
      JOB.i = i; JOB.pct = t / total * 100;
      if (t >= total) {
        clearInterval(JOB.timer); JOB.pct = 100; JOB.i = per.length; paintJob();
        setTimeout(function () { view.job = null; JOB = null; done(); global.APP.refresh(); if (o.after) o.after(); }, 260);
        return;
      }
      paintJob();
    }, 60);
  }
  function running(c, key) { return c.v.job === key && JOB; }
  function scrollTo(id) { setTimeout(function () { var e = document.getElementById(id); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }

  /* =========================================================== 1. AI Chat */
  var CHAT_SUGGEST = [
    ['trend', 'Tổng quan 30 ngày qua', 'GMV, hoa hồng, tỉ lệ chấp nhận'],
    ['users', 'Creator nào nên tăng hoa hồng tháng tới?', 'Xếp hạng theo GMV và tỉ lệ đăng'],
    ['send', 'So sánh hiệu quả các chiến dịch đang chạy', 'Tỉ lệ chấp nhận từng chiến dịch'],
    ['box', 'Vận đơn nào quá hạn chưa có video?', 'Mẫu đã ký nhận quá 5 ngày'],
    ['help', 'Cách tạo chiến dịch mời Creator hàng loạt?', 'Hướng dẫn dùng hệ thống'],
    ['shield', 'Vai trò BD được làm gì trong hệ thống?', 'Phân quyền theo module']
  ];

  function chatHistory() {
    var db = S.data;
    if (!db.chatHistory) {
      db.chatHistory = [
        { id: 'h1', title: 'Creator F&B có GPM cao nhất', at: 'Hôm qua', msgs: [] },
        { id: 'h2', title: 'Vì sao chiến dịch Live chuyên sâu lỗi?', at: 'Hôm qua', msgs: [] },
        { id: 'h3', title: 'Dự báo GMV ' + S.month(1, true), at: S.dm(4), msgs: [] },
        { id: 'h4', title: 'Mẫu tin nhắn nhắc lên video', at: S.dm(6), msgs: [] }
      ];
    }
    return db.chatHistory;
  }

  function msgUser(t) { return '<div class="ig-msg me"><div class="bubble">' + U.esc(t) + '</div></div>'; }
  function msgAi(html, actions) {
    return '<div class="ig-msg"><span class="ig-ai-av">' + ic('ai') + '</span><div class="body">' + html +
      (actions ? '<div class="ig-msg-actions">' +
        U.iconBtn('copy', 'Sao chép', 'copymsg') +
        U.iconBtn('thumbUp', 'Hữu ích', 'toast:Cảm ơn phản hồi của bạn') +
        U.iconBtn('refresh', 'Chạy lại', 'ai:redo') +
        U.iconBtn('download', 'Tải hội thoại', 'aix:chat:dl') + '</div>' : '') + '</div></div>';
  }
  function thinking() {
    return '<div class="ig-think">' +
      ['Hiểu câu hỏi', 'Đọc dữ liệu Creator, chiến dịch, hàng mẫu', 'Tính toán số liệu', 'Viết câu trả lời'].map(function (s, i) {
        return '<span style="--d:' + (i * 0.45) + 's">' + ic('check') + U.esc(s) + '</span>';
      }).join('') + '<div class="ig-xskel"><i></i><i></i></div></div>';
  }

  P['ai-chat'] = function (c) {
    var db = S.data, a = S.data.settings.ai, hist = chatHistory();
    var msgs = db.chat || [];
    var body;
    if (!msgs.length) {
      body = '<div class="ig-xhello">' +
        '<span class="ig-xorb big"><i></i>' + ic('ai') + '</span>' +
        '<h2>Chào ' + U.esc(db.settings.profile.name) + ', hôm nay bạn muốn biết gì?</h2>' +
        '<p>Hỏi về số liệu của ' + U.esc(c.shop.name) + ' hoặc cách dùng GOPUSH. AI đọc Kho Creator (' + S.num(kho(c.shop.id).length) +
          ' Creator, sao lưu ' + U.esc(global.CRX ? global.CRX.backupAt() : '') + '), chiến dịch, hàng mẫu và đơn hàng đã đồng bộ.</p>' +
        '<div class="ig-xsuggest">' + CHAT_SUGGEST.map(function (s) {
          return '<button data-do="ai:ask:' + U.attr(s[1]) + '">' + ic(s[0]) + '<b>' + U.esc(s[1]) + '</b><span>' + U.esc(s[2]) + '</span></button>';
        }).join('') + '</div></div>';
    } else {
      body = '<div class="ig-chat-wrap">' + msgs.map(function (m, i) {
        if (m.role === 'me') return msgUser(m.text);
        if (m.pending) return msgAi(thinking());
        return msgAi(m.html, i === msgs.length - 1);
      }).join('') + '</div>';
    }

    return c.head(
      (isSystem() ? '<span class="gm-tag">' + ic('sparkle') + U.esc(AI_MODEL) + ' · chỉ tài khoản hệ thống thấy</span>' : '') +
      (msgs.length ? U.btn('Tải hội thoại', { icon: 'download', act: 'aix:chat:dl' }) : '') +
      U.btn('Cuộc trò chuyện mới', { variant: 'primary', icon: 'newchat', act: 'aix:chat:new' })
    ) +
    '<div class="ig-xchat">' +
      '<aside class="ig-xchat-side">' +
        '<div class="h">Gần đây</div>' +
        (msgs.length ? '<a class="on">' + ic('chat') + '<span>' + U.esc((msgs[0].text || 'Cuộc trò chuyện hiện tại').slice(0, 40)) + '</span></a>' : '') +
        hist.map(function (h) {
          return '<a data-do="aix:chat:open:' + h.id + '">' + ic('chat') + '<span>' + U.esc(h.title) + '</span><small>' + U.esc(h.at) + '</small></a>';
        }).join('') +
      '</aside>' +
      '<div class="ig-chat"><div class="ig-xchat-scroll" id="aix-chat">' + body + '</div>' +
        '<div class="ig-composer"><div class="ig-composer-in">' +
          '<div class="ig-composer-box">' +
            '<textarea rows="2" data-prompt placeholder="Hỏi về Creator, chiến dịch, hàng mẫu, doanh thu hoặc cách dùng hệ thống…"></textarea>' +
            '<div class="ig-composer-row">' +
              '<span class="gm-tag">' + ic('store') + U.esc(c.all ? 'Tất cả cửa hàng' : c.shop.name) + '</span>' +
              '<span class="gm-tag">' + ic('calendar') + U.esc(a.period) + '</span>' +
              '<span class="spacer"></span>' +
              '<button class="ig-send" data-do="ai:send" aria-label="Gửi">' + ic('arrowUp') + '</button>' +
            '</div></div>' +
          '<p class="ig-composer-hint">GOPUSH AI chỉ đọc dữ liệu trong hệ thống, không tự gửi lời mời hay tin nhắn. Enter để gửi, Shift + Enter xuống dòng.</p>' +
        '</div></div>' +
      '</div>' +
    '</div>';
  };

  /* =========================================================== 2. Report AI */
  var GOALS = [
    { v: 'eval', l: 'Chiến dịch có đạt hiệu quả không?', s: 'Chấm đạt / chưa đạt theo KPI, so với mốc' },
    { v: 'why', l: 'Vì sao kết quả chưa tốt?', s: 'Tìm khâu nghẽn trong phễu và nguyên nhân' },
    { v: 'scale', l: 'Nên mở rộng, giữ hay dừng chiến dịch nào?', s: 'Xếp hạng chiến dịch, phân bổ lại nguồn lực' },
    { v: 'creator', l: 'Creator nào đáng đầu tư tiếp?', s: 'Nhóm tạo ra GMV, nhóm nhận mẫu không đăng' },
    { v: 'cost', l: 'Chi phí hoa hồng và hàng mẫu có đáng không?', s: 'ROI, chi phí trên mỗi video' }
  ];
  var PERIODS = ['7 ngày', '30 ngày', '90 ngày', 'Từ đầu chiến dịch'];
  var COMPARE = [
    { v: 'shop', l: 'Trung bình các chiến dịch của shop' },
    { v: 'prev', l: 'Kỳ trước liền kề' }
  ];
  var AUDIENCE = [
    { v: 'ops', l: 'Team vận hành', s: 'Đủ chi tiết, có người làm và hạn' },
    { v: 'exec', l: 'Quản lý / chủ shop', s: 'Ngắn: kết luận, con số chính, quyết định' }
  ];

  function shopCamps(c) {
    return S.data.campaigns.filter(function (cp) { return (c.all || cp.shopId === c.shop.id) && cp.kind === 'invite' && cp.sent; });
  }

  /* đo một chiến dịch: phễu, GMV ghi nhận từ nội dung, chi phí, ROI */
  function measure(cp) {
    var f = P.campFunnel(cp), samples = P.campSamples(cp);
    var gmv = 0, byCr = {}, noVid = 0;
    samples.forEach(function (s) {
      var g = (s.contents || []).reduce(function (a, x) { return a + x.gmv; }, 0);
      gmv += g;
      if (!(s.contents || []).length) noVid++;
      byCr[s.creatorId] = (byCr[s.creatorId] || 0) + g;
    });
    var prods = S.data.products[cp.shopId] || [];
    var avgCom = prods.length ? prods.reduce(function (a, p) { return a + p.com; }, 0) / prods.length : 15;
    var avgPrice = prods.length ? prods.reduce(function (a, p) { return a + p.price; }, 0) / prods.length : 200000;
    var com = gmv * avgCom / 100, sampleCost = f[3].v * avgPrice * 0.55;
    return {
      cp: cp, sent: f[0].v, acc: f[1].v, got: f[3].v, vid: f[4].v, ord: f[5].v,
      accR: pct(f[1].v, f[0].v), gotR: pct(f[3].v, f[1].v), vidR: pct(f[4].v, f[3].v), ordR: pct(f[5].v, f[4].v),
      gmv: gmv, com: com, sampleCost: sampleCost, cost: com + sampleCost,
      roi: (com + sampleCost) ? gmv / (com + sampleCost) : 0, byCr: byCr, noVid: noVid, avgPrice: avgPrice
    };
  }

  function analyze(c, x) {
    var all = shopCamps(c), ms = all.map(measure);
    var sel = ms.filter(function (m) { return x.camps.indexOf(m.cp.id) > -1; });
    function sum(list, k) { return list.reduce(function (a, m) { return a + m[k]; }, 0); }
    function agg(list) {
      var o = { sent: sum(list, 'sent'), acc: sum(list, 'acc'), got: sum(list, 'got'), vid: sum(list, 'vid'), ord: sum(list, 'ord'),
        gmv: sum(list, 'gmv'), cost: sum(list, 'cost'), com: sum(list, 'com'), sampleCost: sum(list, 'sampleCost'), noVid: sum(list, 'noVid') };
      o.accR = pct(o.acc, o.sent); o.gotR = pct(o.got, o.acc); o.vidR = pct(o.vid, o.got); o.ordR = pct(o.ord, o.vid);
      o.roi = o.cost ? o.gmv / o.cost : 0; o.gpv = o.vid ? o.gmv / o.vid : 0; o.cpv = o.vid ? o.cost / o.vid : 0;
      return o;
    }
    var A = agg(sel);
    /* mốc so sánh: trung bình mọi chiến dịch của shop, hoặc kỳ trước (ước từ số hiện có khi chưa đủ lịch sử) */
    var B = agg(ms);
    if (x.cmp === 'prev') {
      var k = 0.86 + hash(x.camps.join()) * 0.2;
      B = { accR: A.accR * k, gotR: A.gotR * (0.94 + hash('g' + k) * 0.12), vidR: A.vidR * (0.9 + hash('v' + k) * 0.25),
        ordR: A.ordR * 0.97, roi: A.roi * (0.85 + hash('r' + k) * 0.3), gpv: A.gpv * 0.92, cpv: A.cpv * 1.06, gmv: A.gmv * k };
    }
    var cmpLabel = x.cmp === 'prev' ? 'kỳ trước' : 'TB shop';

    /* khâu nghẽn: tỉ lệ chuyển đổi hụt nhiều nhất so với mốc */
    var stages = [
      { k: 'accR', l: 'Mời → Chấp nhận', fix: 'Đổi mẫu lời mời, tăng hoa hồng mở đầu hoặc nhắm lại tệp Creator' },
      { k: 'gotR', l: 'Chấp nhận → Nhận mẫu', fix: 'Duyệt mẫu trong 24 giờ và kiểm tra tồn kho hàng mẫu' },
      { k: 'vidR', l: 'Nhận mẫu → Lên video', fix: 'Nhắc Creator kèm hạn chót, gửi brief và hook mẫu, chỉ gửi mẫu tiếp khi đã lên video' },
      { k: 'ordR', l: 'Video → Có đơn', fix: 'Gắn đúng sản phẩm, ưu tiên Creator có GPM cao, thêm mã giảm giá riêng' }
    ];
    stages.forEach(function (s) { s.a = A[s.k]; s.b = B[s.k]; s.gap = s.b ? (s.a - s.b) / s.b : 0; });
    var neck = stages.slice().sort(function (p, q) { return p.gap - q.gap; })[0];
    /* GMV bỏ lỡ nếu khâu nghẽn đạt bằng mốc */
    var lostVid = neck.gap < 0 ? Math.round(A.vid * (neck.b / Math.max(neck.a, 0.1) - 1)) : 0;
    var lostGmv = Math.max(0, lostVid) * A.gpv;

    /* chấm từng chiến dịch */
    var rows = sel.map(function (m) {
      var v, why;
      if (m.accR >= B.accR * 1.1 && m.vidR >= B.vidR * 0.95 && m.roi >= 3) { v = 'Mở rộng'; why = 'Chấp nhận ' + p1(m.accR) + ', ROI ' + m.roi.toFixed(1) + 'x — tăng lời mời, nhân bản mẫu'; }
      else if (m.roi < 1.5 || m.accR < B.accR * 0.6) { v = 'Dừng / làm lại'; why = m.roi < 1.5 ? 'Mỗi 1 ' + S.cur() + ' chi chỉ thu ' + m.roi.toFixed(1) + ' ' + S.cur() + ' GMV' : 'Chấp nhận chỉ ' + p1(m.accR) + ', mốc ' + p1(B.accR); }
      else if (m.vidR < B.vidR * 0.85) { v = 'Tối ưu khâu mẫu'; why = 'Chỉ ' + p1(m.vidR) + ' Creator nhận mẫu lên video (mốc ' + p1(B.vidR) + ')'; }
      else { v = 'Giữ'; why = 'Các chỉ số quanh mức mốc, chưa có điểm bất thường'; }
      return { m: m, verdict: v, why: why };
    }).sort(function (p, q) { return q.m.roi - p.m.roi; });

    /* Creator: GMV tập trung ở đâu */
    var byCr = {};
    sel.forEach(function (m) { Object.keys(m.byCr).forEach(function (id) { byCr[id] = (byCr[id] || 0) + m.byCr[id]; }); });
    var crs = Object.keys(byCr).map(function (id) { return { cr: S.creator(id), gmv: byCr[id] }; })
      .filter(function (o) { return o.cr; }).sort(function (p, q) { return q.gmv - p.gmv; });
    var earning = crs.filter(function (o) { return o.gmv > 0; });
    var top = earning.slice(0, Math.max(1, Math.ceil(earning.length * 0.2)));
    var topShare = pct(top.reduce(function (a, o) { return a + o.gmv; }, 0), A.gmv || 1);
    var wasted = A.noVid * (sel[0] ? sel[0].avgPrice * 0.55 : 0);

    /* đạt / chưa đạt theo KPI người dùng đặt; không đặt thì so với mốc */
    var tAcc = parseFloat(String(x.tAcc || '').replace(',', '.')), tGmv = parseFloat(String(x.tGmv || '').replace(',', '.')) * S.unit().div;
    var checks = [];
    if (tAcc) checks.push({ l: 'Tỉ lệ chấp nhận', a: p1(A.accR), t: p1(tAcc), ok: A.accR >= tAcc });
    if (tGmv) checks.push({ l: 'GMV', a: S.amt(A.gmv), t: S.amt(tGmv), ok: A.gmv >= tGmv });
    var okCount = checks.length ? checks.filter(function (q) { return q.ok; }).length
      : [A.accR >= B.accR, A.vidR >= B.vidR, A.roi >= B.roi].filter(Boolean).length;
    var okTotal = checks.length || 3;
    var status = okCount === okTotal ? 'good' : (okCount === 0 ? 'bad' : 'mid');

    /* khuyến nghị kèm tác động ước tính */
    var recs = [];
    var scale = rows.filter(function (r) { return r.verdict === 'Mở rộng'; });
    var stop = rows.filter(function (r) { return r.verdict === 'Dừng / làm lại'; });
    if (lostGmv > 0) recs.push({ pri: 'Cao', t: 'Gỡ nghẽn khâu “' + neck.l + '”: ' + neck.fix + '.', gain: lostGmv, who: 'Team vận hành', when: '7 ngày' });
    if (scale.length) recs.push({ pri: 'Cao', t: 'Dồn thêm lời mời cho “' + scale[0].m.cp.name + '” (ROI ' + scale[0].m.roi.toFixed(1) + 'x) và nhân bản mẫu lời mời sang chiến dịch khác.', gain: scale[0].m.gmv * 0.35, who: 'BD phụ trách', when: 'Tuần này' });
    if (stop.length) recs.push({ pri: 'Cao', t: 'Tạm dừng “' + stop[0].m.cp.name + '”, làm lại tệp Creator và mẫu lời mời trước khi gửi tiếp.', save: stop[0].m.cost * 0.6, who: 'Trưởng nhóm', when: 'Ngay' });
    if (A.noVid) recs.push({ pri: 'TB', t: 'Nhắc ' + A.noVid + ' Creator đã nhận mẫu nhưng chưa đăng; quá 10 ngày thì đưa vào Blacklist để không gửi mẫu lần sau.', save: wasted, who: 'CSKH Creator', when: '3 ngày' });
    if (top.length && A.gmv) recs.push({ pri: 'TB', t: 'Ký hợp tác dài hạn hoặc tăng hoa hồng 2–4% cho ' + top.length + ' Creator đầu bảng — nhóm này tạo ' + p1(topShare) + ' GMV.', gain: A.gmv * 0.08, who: 'BD phụ trách', when: '14 ngày' });

    var goal = GOALS.filter(function (g) { return g.v === x.goal; })[0] || GOALS[0];
    var answer = {
      eval: status === 'good' ? 'Đạt. ' + okCount + '/' + okTotal + ' tiêu chí đạt hoặc vượt mốc; nên giữ nhịp và mở rộng chiến dịch tốt nhất.'
        : (status === 'bad' ? 'Chưa đạt. Không tiêu chí nào chạm mốc; khâu yếu nhất là “' + neck.l + '”.' : 'Đạt một phần (' + okCount + '/' + okTotal + ' tiêu chí). Khâu kéo kết quả xuống là “' + neck.l + '”.'),
      why: 'Nguyên nhân chính nằm ở khâu “' + neck.l + '”: ' + p1(neck.a) + ' so với ' + p1(neck.b) + ' (' + cmpLabel + '). ' +
        (lostGmv ? 'Nếu khâu này đạt mức mốc, chiến dịch có thêm khoảng ' + S.amt(lostGmv) + ' GMV.' : ''),
      scale: (scale.length ? 'Mở rộng ' + scale.map(function (r) { return '“' + r.m.cp.name + '”'; }).join(', ') + '. ' : 'Chưa có chiến dịch đủ tốt để mở rộng. ') +
        (stop.length ? 'Dừng / làm lại ' + stop.map(function (r) { return '“' + r.m.cp.name + '”'; }).join(', ') + '.' : 'Không có chiến dịch cần dừng.'),
      creator: top.length && A.gmv ? top.length + ' Creator đầu bảng tạo ' + p1(topShare) + ' GMV — nên giữ chân nhóm này; ' + A.noVid + ' lượt nhận mẫu chưa đăng cần xử lý.' : 'Chưa đủ dữ liệu nội dung để xếp hạng Creator.',
      cost: 'ROI chung ' + A.roi.toFixed(1) + 'x (mốc ' + (B.roi || 0).toFixed(1) + 'x): mỗi video tốn ' + S.amt(A.cpv) + ' và mang về ' + S.amt(A.gpv) + ' GMV. ' +
        (wasted ? 'Hàng mẫu không ra video đang tốn khoảng ' + S.amt(wasted) + '.' : '')
    }[goal.v];

    var names = sel.map(function (m) { return m.cp.name; });
    return {
      id: S.uid('rp'), at: S.fmtDateTime(new Date()), goal: goal, answer: answer, status: status,
      title: (names.length === 1 ? names[0] : names.length + ' chiến dịch') + ' — ' + goal.l.replace(/\?$/, ''),
      scope: (c.all ? 'Tất cả cửa hàng' : c.shop.name) + ' · ' + x.period + ' · so với ' + cmpLabel,
      A: A, B: B, cmpLabel: cmpLabel, stages: stages, neck: neck, lostGmv: lostGmv, checks: checks,
      rows: rows.map(function (r) {
        return { name: r.m.cp.name, status: r.m.cp.status, sent: r.m.sent, accR: r.m.accR, vidR: r.m.vidR, gmv: r.m.gmv,
          cost: r.m.cost, roi: r.m.roi, verdict: r.verdict, why: r.why };
      }),
      top: top.slice(0, 5).map(function (o) { return { id: o.cr.id, name: o.cr.name, user: o.cr.user, gmv: o.gmv }; }),
      topShare: topShare, crCount: crs.length, wasted: wasted, recs: recs, audience: x.aud || 'ops'
    };
  }

  var VERDICT_TONE = { 'Mở rộng': 'is-good', 'Giữ': '', 'Tối ưu khâu mẫu': 'is-mid', 'Dừng / làm lại': 'is-bad' };
  /* chênh lệch so với mốc; lowerBetter đảo màu (chi phí giảm là tốt) */
  function delta(a, b, lowerBetter) {
    if (!b) return '<span class="gm-muted">—</span>';
    var d = (a - b) / b * 100, good = lowerBetter ? d <= 0 : d >= 0;
    return '<span class="' + (good ? 'gm-delta-up' : 'gm-delta-down') + '">' + (d >= 0 ? '+' : '') + p1(d) + '</span>';
  }

  function renderReport(r) {
    var A = r.A, B = r.B, exec = r.audience === 'exec';
    var stTxt = { good: 'Đạt', mid: 'Đạt một phần', bad: 'Chưa đạt' }[r.status];
    var kpis = [
      { l: 'Tỉ lệ chấp nhận', a: p1(A.accR), d: delta(A.accR, B.accR) },
      { l: 'Nhận mẫu → lên video', a: p1(A.vidR), d: delta(A.vidR, B.vidR) },
      { l: 'GMV ghi nhận', a: S.amt(A.gmv), d: x0(B.gmv) ? delta(A.gmv, B.gmv) : '' },
      { l: 'ROI (GMV / chi phí)', a: A.roi.toFixed(1) + 'x', d: delta(A.roi, B.roi) },
      { l: 'Chi phí mỗi video', a: S.amt(A.cpv), d: delta(A.cpv, B.cpv, true) }
    ];
    return '<article class="ig-rp" id="aix-rep">' +
      '<header class="ig-rp-head">' +
        '<div class="t"><span class="gm-help">' + ic('ai') + ' GOPUSH AI · ' + U.esc(r.at) + ' · ' + U.esc(r.scope) + '</span>' +
          '<h2>' + U.esc(r.title) + '</h2></div>' +
        '<div class="ig-head-actions">' +
          U.btn('Tải CSV', { sm: true, icon: 'download', act: 'aix:rep:csvcur' }) +
          U.btn('In / PDF', { sm: true, icon: 'file', act: 'aix:rep:print' }) +
          U.iconBtn('x', 'Đóng report', 'aix:rep:close') +
        '</div></header>' +

      '<section class="ig-rp-answer is-' + r.status + '">' +
        '<span class="badge">' + stTxt + '</span>' +
        '<div><span class="q">' + U.esc(r.goal.l) + '</span><p>' + U.esc(r.answer) + '</p></div></section>' +

      '<section class="ig-rp-sec"><h3>Chỉ số chính <span class="gm-help">so với ' + U.esc(r.cmpLabel) + '</span></h3>' +
        '<div class="ig-rp-kpis">' + kpis.map(function (k) {
          return '<div><span class="l">' + k.l + '</span><b class="gm-num">' + k.a + '</b><span class="d">' + k.d + '</span></div>';
        }).join('') + '</div>' +
        (r.checks.length ? '<div class="ig-rp-checks">' + r.checks.map(function (q) {
          return '<span class="' + (q.ok ? 'ok' : 'no') + '">' + ic(q.ok ? 'check' : 'x') + q.l + ': ' + q.a + ' / mục tiêu ' + q.t + '</span>';
        }).join('') + '</div>' : '') + '</section>' +

      '<section class="ig-rp-sec"><h3>Phễu chuyển đổi và khâu nghẽn <span class="gm-help">vạch đứng là mốc so sánh</span></h3>' +
        '<div class="ig-rp-funnel">' + r.stages.map(function (s) {
          var bad = s === r.neck && s.gap < 0;
          return '<div class="' + (bad ? 'is-neck' : '') + '"><span class="l">' + s.l + '</span>' +
            '<span class="bar"><i style="width:' + Math.min(100, s.a) + '%"></i><em style="left:' + Math.min(100, s.b) + '%"></em></span>' +
            '<b class="gm-num">' + p1(s.a) + '</b><span class="gm-help">mốc ' + p1(s.b) + '</span>' +
            (bad ? '<span class="ig-rp-verdict is-bad">Nghẽn</span>' : '<span></span>') + '</div>';
        }).join('') + '</div>' +
        (r.neck.gap < 0 ? '<p class="ig-rp-note">' + ic('alert') + '<span><b>' + U.esc(r.neck.l) + '</b> thấp hơn mốc ' + p1(-r.neck.gap * 100) +
          (r.lostGmv ? ', tương đương khoảng <b>' + S.amt(r.lostGmv) + ' GMV bị bỏ lỡ</b>' : '') + '. ' + U.esc(r.neck.fix) + '.</span></p>' : '') +
      '</section>' +

      '<section class="ig-rp-sec"><h3>Đánh giá từng chiến dịch</h3>' +
        U.table({
          cols: [
            { k: 'name', t: 'Chiến dịch', r: function (o) { return '<b>' + U.esc(o.name) + '</b><div class="gm-help">' + U.esc(o.status) + ' · ' + S.num(o.sent) + ' lời mời</div>'; } },
            { k: 'accR', t: 'Chấp nhận', cls: 'num', r: function (o) { return p1(o.accR); } },
            { k: 'vidR', t: 'Lên video', cls: 'num', r: function (o) { return p1(o.vidR); } },
            { k: 'gmv', t: 'GMV', cls: 'num', r: function (o) { return S.money(o.gmv); } },
            { k: 'roi', t: 'ROI', cls: 'num', r: function (o) { return o.roi.toFixed(1) + 'x'; } },
            { k: 'verdict', t: 'Đề xuất', r: function (o) { return '<span class="ig-rp-verdict ' + VERDICT_TONE[o.verdict] + '">' + U.esc(o.verdict) + '</span>'; } },
            { k: 'why', t: 'Vì sao', r: function (o) { return '<span class="gm-help">' + U.esc(o.why) + '</span>'; } }
          ],
          rows: r.rows
        }) + '</section>' +

      (exec ? '' : '<section class="ig-rp-sec"><h3>Creator tạo ra kết quả</h3>' +
        '<div class="ig-rp-two"><div>' +
          (r.top.length && r.A.gmv ? '<p class="ig-rp-lead"><b>' + p1(r.topShare) + '</b> GMV đến từ ' + r.top.length + ' Creator đầu bảng.</p>' +
            '<ol class="ig-rp-top">' + r.top.map(function (o) {
              return '<li><a class="gm-link" data-do="creator:' + o.id + '">' + U.esc(o.name) + '</a><span class="gm-help">@' + U.esc(o.user) + '</span><b class="gm-num">' + S.amt(o.gmv) + '</b></li>';
            }).join('') + '</ol>' : U.empty('Chưa có nội dung ghi nhận GMV')) +
        '</div><div class="ig-rp-warn">' + ic('box') + '<div><b>' + r.A.noVid + ' lượt nhận mẫu chưa có video</b>' +
          '<p>Chi phí hàng mẫu chưa sinh doanh thu: khoảng <b>' + S.amt(r.wasted) + '</b>. Nhắc lần cuối, quá hạn thì loại khỏi các đợt gửi mẫu sau.</p>' +
          U.btn('Mở việc cần xử lý', { sm: true, act: 'go:/inbox' }) + '</div></div></div></section>') +

      '<section class="ig-rp-sec"><h3>Việc nên làm tiếp, xếp theo giá trị</h3>' +
        '<ol class="ig-rp-recs">' + r.recs.map(function (q, i) {
          return '<li><span class="n">' + (i + 1) + '</span><div><p>' + U.esc(q.t) + '</p>' +
            '<span class="meta"><span class="ig-rp-pri p-' + (q.pri === 'Cao' ? 'hi' : 'md') + '">Ưu tiên ' + q.pri + '</span>' +
            (q.gain ? '<span>' + ic('trend') + 'GMV +' + S.amt(q.gain) + '</span>' : '') +
            (q.save ? '<span>' + ic('wallet') + 'Tiết kiệm ' + S.amt(q.save) + '</span>' : '') +
            (exec ? '' : '<span>' + ic('user') + U.esc(q.who) + '</span><span>' + ic('clock') + U.esc(q.when) + '</span>') + '</span></div></li>';
        }).join('') + '</ol></section>' +

      '<footer class="ig-rp-foot">' + ic('info') + '<span>Dữ liệu lấy từ Kho Creator và bản đồng bộ chiến dịch của GOPUSH. GMV tính từ nội dung đã đồng bộ của Creator nhận mẫu; chi phí gồm hoa hồng theo sản phẩm và giá vốn hàng mẫu ước 55% giá bán. Mốc kỳ trước là ước tính khi chưa đủ lịch sử.</span></footer>' +
    '</article>';
  }
  function x0(n) { return n && isFinite(n); }

  P['ai-reports'] = function (c) {
    var db = S.data, x = st(c), v = c.v;
    var camps = shopCamps(c);
    if (!x.camps) x.camps = camps.slice(0, 3).map(function (cp) { return cp.id; });
    if (!x.goal) x.goal = 'eval';
    if (!x.period) x.period = '30 ngày';
    if (!x.cmp) x.cmp = 'shop';
    if (!x.aud) x.aud = 'ops';
    var chosen = camps.filter(function (cp) { return x.camps.indexOf(cp.id) > -1; });
    var sent = chosen.reduce(function (a, cp) { return a + cp.sent; }, 0), acc = chosen.reduce(function (a, cp) { return a + cp.accepted; }, 0);
    var formOpen = x.formOpen !== false;

    function row(n, title, help, ctl) {
      return '<div class="ig-rp-row"><span class="n">' + n + '</span><div class="lb"><b>' + title + '</b><span>' + help + '</span></div><div class="ctl">' + ctl + '</div></div>';
    }
    var form = running(c, 'rep') ? jobHTML(JOB) : (!formOpen ? '' :
      '<div class="ig-xform ig-rp-form">' +
        row(1, 'Chiến dịch cần đánh giá', 'AI quét lời mời, phản hồi, hàng mẫu, vận đơn, nội dung và đơn hàng.',
          pick(c, 'camps', 'Chiến dịch', camps.map(function (cp) {
            return { v: cp.id, l: cp.name, s: cp.status + ' · ' + S.num(cp.sent) + ' đã gửi · ' + S.num(cp.accepted) + ' chấp nhận' };
          }), { multi: true, ph: 'Chọn chiến dịch', wide: true, icon: 'send' }) +
          '<span class="gm-help">' + chosen.length + ' chiến dịch · ' + S.num(sent) + ' lời mời · ' + S.num(acc) + ' chấp nhận</span>') +
        row(2, 'Report cần trả lời câu hỏi gì?', 'AI trả lời thẳng câu hỏi này ở đầu report, rồi mới đưa số liệu chứng minh.',
          pick(c, 'goal', 'Câu hỏi', GOALS, { wide: true, icon: 'target' })) +
        row(3, 'Kỳ dữ liệu và mốc so sánh', 'Có mốc mới biết kết quả tốt hay xấu.',
          '<div class="ig-xbar-row">' + pick(c, 'period', 'Kỳ', PERIODS, { icon: 'calendar' }) + pick(c, 'cmp', 'So với', COMPARE, { icon: 'trend', wide: true }) + '</div>') +
        row(4, 'Mục tiêu KPI <em>không bắt buộc</em>', 'Có mục tiêu thì AI chấm đạt / chưa đạt theo mục tiêu của bạn.',
          '<div class="ig-xbar-row"><label class="gm-input gm-input-sm ig-rp-kpi"><span>Tỉ lệ chấp nhận</span><input type="text" inputmode="decimal" data-aix="tAcc" value="' + U.attr(x.tAcc || '') + '" placeholder="35"><span>%</span></label>' +
          '<label class="gm-input gm-input-sm ig-rp-kpi"><span>GMV</span><input type="text" inputmode="decimal" data-aix="tGmv" value="' + U.attr(x.tGmv || '') + '" placeholder="500"><span>' + S.unit().label + ' ' + S.cur() + '</span></label></div>') +
        row(5, 'Người đọc report', 'Quyết định độ dài và mức chi tiết.', pick(c, 'aud', 'Gửi cho', AUDIENCE, { icon: 'user', wide: true })) +
        row(6, 'Ghi chú cho AI <em>không bắt buộc</em>', 'Bối cảnh AI không tự biết: đợt sale, đổi giá, sự cố kho…',
          area('note', x.note, 'Ví dụ: tuần 2 hết hàng mẫu 3 ngày; muốn biết có nên tăng hoa hồng tháng 10 không', 2)) +
        '<div class="ig-xfoot">' + modelPick(c) + '<span class="spacer"></span>' +
          U.btn('Quét dữ liệu và phân tích', { variant: 'primary', icon: 'sparkle', act: 'aix:rep:run' }) + '</div>' +
      '</div>');

    var list = db.aiReports.filter(function (r) { return hitQ(v.q, [r.name, r.scope]); });
    return c.head(
      U.btn('Lên lịch report', { icon: 'calendar', act: 'report:schedule' }) +
      U.btn('Tải danh sách', { icon: 'download', act: 'aix:rep:list' }) +
      U.btn('Tạo report mới', { variant: 'primary', icon: 'plus', act: 'aix:rep:new' })
    ) +
    '<div class="ig-section">' +
      srcNote(c, 'cùng dữ liệu chiến dịch, hàng mẫu, nội dung và đơn hàng đã đồng bộ về GOPUSH.') +
      '<div class="ig-xbuild">' +
        '<div class="ig-xbuild-head"><span class="ig-xorb sm"><i></i>' + ic('file') + '</span>' +
          '<div><h2>Tạo report từ chiến dịch</h2><p>Quét dữ liệu → đánh giá kết quả → chỉ ra nguyên nhân → đề xuất việc nên làm.</p></div>' +
          (!formOpen && !running(c, 'rep') ? U.btn('Mở form', { sm: true, icon: 'down', act: 'aix:rep:new' }) : '') + '</div>' +
        form + '</div>' +
      (x.rep ? renderReport(x.rep) : '') +
    '</div>' +
    '<div class="ig-section"><div class="ig-xres-head"><h2>Report đã tạo</h2><span class="gm-badge">' + list.length + '</span><span class="spacer"></span>' +
      '<label class="gm-input gm-input-sm ig-xsearch">' + ic('search') + '<input type="search" data-q placeholder="Tìm report" value="' + U.attr(v.q || '') + '"></label></div></div>' +
    U.table({
      cols: [
        { k: 'name', t: 'Report', r: function (r) {
          return '<a class="gm-link" data-do="aix:rep:view:' + r.id + '">' + U.esc(r.name) + '</a><div class="gm-help">' + U.esc(r.scope) + '</div>'; } },
        { k: 'kind', t: 'Loại', r: function (r) { return '<span class="gm-tag">' + U.esc(r.kind) + '</span>'; } },
        { k: 'by', t: 'Người tạo' },
        { k: 'at', t: 'Tạo lúc' },
        { k: 'status', t: 'Trạng thái', r: function (r) { return U.tag(r.status); } },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          return U.btn('Xem', { sm: true, act: 'aix:rep:view:' + r.id }) + ' ' +
            U.iconBtn('download', 'Tải CSV', 'aix:rep:csv:' + r.id) +
            U.iconBtn('share', 'Chia sẻ', 'report:share:' + r.id) +
            U.iconBtn('trash', 'Xóa', 'report:del:' + r.id); } }
      ],
      rows: list
    });
  };
  function hitQ(q, fields) {
    if (!q) return true; q = q.toLowerCase();
    return fields.some(function (f) { return String(f || '').toLowerCase().indexOf(q) > -1; });
  }

  /* =========================================================== 3. AI Tìm Creator */
  var FIND = [
    { id: 'cond', ic: 'sliders', t: 'Theo điều kiện', d: 'Ngành, follower, GMV, mô tả bằng lời', tone: 'sky' },
    { id: 'shop', ic: 'store', t: 'Theo cửa hàng', d: 'Từng bán cho shop tương tự', tone: 'sage' },
    { id: 'product', ic: 'box', t: 'Theo sản phẩm', d: 'Hợp với sản phẩm của bạn', tone: 'sand' },
    { id: 'content', ic: 'video', t: 'Theo nội dung', d: 'Phong cách giống video mẫu', tone: 'lilac' }
  ];
  /* mốc GMV lưu theo đơn vị gốc, nhãn theo tiền tệ thị trường */
  function gmvSteps() { return ['Bất kỳ'].concat([1e7, 5e7, 2e8].map(function (v) { return 'Từ ' + S.amt(v); })); }
  var FOLLOW = ['Dưới 10K', '10K – 100K', '100K – 500K', 'Trên 500K'];

  function allCats(sid) {
    var cnt = {};
    kho(sid).forEach(function (cr) { cnt[cr.cat] = (cnt[cr.cat] || 0) + 1; });
    return Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).map(function (k) { return { v: k, l: k, s: S.num(cnt[k]) + ' Creator' }; });
  }

  function findForm(c, mode) {
    var x = st(c), db = S.data;
    if (mode === 'cond') {
      return '<div class="ig-xbar-row">' +
          pick(c, 'cats', 'Ngành hàng', allCats(c.shop.id), { multi: true, icon: 'layers', wide: true }) +
          pick(c, 'follow', 'Follower', FOLLOW, { multi: true, icon: 'users' }) +
          pick(c, 'gmv', 'GMV 30 ngày', gmvSteps(), { icon: 'trend', ph: 'Bất kỳ' }) +
          pick(c, 'chan', 'Kênh bán', ['Cả hai', 'Video', 'Live'], { icon: 'video', ph: 'Cả hai' }) + '</div>' +
        inp('desc', x.desc, 'Mô tả thêm (không bắt buộc): Creator nữ 25–34 ở TP.HCM, hay review đồ uống, live buổi tối…');
    }
    if (mode === 'shop') {
      return inp('shopq', x.shopq, 'Tên hoặc link cửa hàng TikTok Shop, ví dụ: Highlands Coffee Official') +
        '<div class="ig-xbar-row">' +
          pick(c, 'shopby', 'Tìm theo', ['Đang bán cho shop này', 'Từng bán cho shop này', 'Bán cho shop cùng ngành'], { icon: 'store', ph: 'Đang bán cho shop này', wide: true }) +
          pick(c, 'excl', 'Loại trừ', ['Creator đã hợp tác', 'Creator đang độc quyền'], { multi: true, icon: 'ban', ph: 'Không' }) + '</div>';
    }
    if (mode === 'product') {
      var prods = db.products[c.shop.id] || [];
      return '<div class="ig-xbar-row">' +
          pick(c, 'prods', 'Sản phẩm', prods.map(function (p) { return { v: p.id, l: p.name, s: S.amt(p.price) + ' · hoa hồng ' + p.com + '%' }; }),
            { multi: true, icon: 'box', ph: 'Chọn sản phẩm', wide: true }) +
          pick(c, 'prio', 'Ưu tiên', ['Doanh số cao', 'Nhận hoa hồng thấp', 'Mới nổi, giá tốt'], { icon: 'target', ph: 'Doanh số cao' }) + '</div>' +
        inp('plink', x.plink, 'Hoặc dán link sản phẩm bất kỳ: https://shop.tiktok.com/view/product/…');
    }
    return inp('vlink', x.vlink, 'Link video hoặc LIVE mẫu: https://www.tiktok.com/@creator/video/…') +
      '<div class="ig-xbar-row">' +
        pick(c, 'styles', 'Phong cách', ['Review chân thật', 'Unbox', 'Hài hước', 'Hướng dẫn / mẹo', 'Vlog đời sống', 'Live bán hàng'], { multi: true, icon: 'video' }) + '</div>' +
      inp('cdesc', x.cdesc, 'Mô tả nội dung mong muốn: video 30–45 giây quay cận cảnh pha cà phê buổi sáng…');
  }

  function findResults(c) {
    var x = st(c), r = x.found;
    if (!r) return '';
    return '<div class="ig-section" id="aix-found">' +
      '<div class="ig-xres-head"><h2>' + r.list.length + ' Creator phù hợp nhất</h2>' +
        '<span class="gm-help">' + U.esc(r.summary) + '</span><span class="spacer"></span>' +
        U.btn('Tải xuống', { icon: 'download', act: 'aix:find:csv' }) +
        U.btn('Mời hợp tác', { variant: 'primary', icon: 'send', act: 'campaign:new:invite' }) + '</div></div>' +
      U.table({
        cols: [
          { k: 'n', t: 'Creator', r: function (o) { return U.creatorCell(o.cr, o.cr.cat); } },
          { k: 's', t: 'Độ phù hợp', r: function (o) {
            return '<div class="ig-xscore"><span class="tr"><i style="width:' + o.score + '%"></i></span><b class="gm-num">' + o.score + '</b></div>'; } },
          { k: 'f', t: 'Follower', cls: 'num', r: function (o) { return S.short(o.cr.followers); } },
          { k: 'g', t: 'GMV 30 ngày', cls: 'num', r: function (o) { return S.money(o.cr.gmv30); } },
          { k: 'p', t: 'Tỉ lệ đăng', cls: 'num', r: function (o) { return o.cr.postRate + '%'; } },
          { k: 'w', t: 'Vì sao AI chọn', r: function (o) { return '<span class="ig-xwhy">' + U.esc(o.why) + '</span>'; } },
          { k: 'st', t: 'Quan hệ', r: function (o) { return U.tag(S.rel(o.cr, c.shop.id).state); } },
          { k: '', t: '', cls: 'col-actions', r: function (o) { return U.btn('Hồ sơ', { sm: true, act: 'creator:' + o.cr.id }); } }
        ],
        rows: r.list
      });
  }

  P['ai-find'] = function (c) {
    var x = st(c);
    if (!x.mode) x.mode = 'cond';
    if (!x.limit) x.limit = '20';
    if (!x.shopby) x.shopby = 'Đang bán cho shop này';
    if (!x.gmv) x.gmv = 'Bất kỳ';
    if (!x.chan) x.chan = 'Cả hai';
    if (!x.prio) x.prio = 'Doanh số cao';
    var empty = !kho(c.shop.id).length;
    return c.head(U.btn('Mở Kho Creator', { icon: 'database', act: 'go:/s/' + c.shop.id + '/creators/library' })) +
    '<div class="ig-section">' +
      srcNote(c, 'AI chỉ quét Creator đã có trong Kho. Cần thêm người thì lưu từ Tìm Creator (API) hoặc tải lên file.') +
      (empty ? U.empty('Kho Creator đang trống', 'Lưu Creator từ Tìm Creator hoặc tải lên file để AI có dữ liệu quét.',
        U.btn('Mở Tìm Creator', { sm: true, act: 'go:/s/' + c.shop.id + '/creators/discover' })) + '</div>' : '') +
      (empty ? '' : '<div class="ig-xmods" role="tablist">' + FIND.map(function (f) {
        return '<button class="ig-xmod tone-' + f.tone + (f.id === x.mode ? ' on' : '') + '" role="tab" aria-selected="' + (f.id === x.mode) + '" data-do="aix:set:mode:' + f.id + '">' +
          '<span class="ic">' + ic(f.ic) + '</span><span class="tx"><b>' + U.esc(f.t) + '</b><span class="d">' + U.esc(f.d) + '</span></span></button>';
      }).join('') + '</div>' +
      '<div class="ig-xbuild">' +
        (running(c, 'find') ? jobHTML(JOB) :
          '<div class="ig-xform">' + findForm(c, x.mode) +
          '<div class="ig-xfoot">' + modelPick(c) +
            pick(c, 'limit', 'Số kết quả', ['10', '20', '50'], { ph: '20' }) +
            '<span class="spacer"></span>' +
            '<span class="gm-help">Tự loại Creator bị chặn</span>' +
            U.btn('Quét Kho bằng AI', { variant: 'primary', icon: 'sparkle', act: 'aix:find:run' }) + '</div></div>') +
      '</div>' +
    '</div>' + findResults(c));
  };

  /* =========================================================== 4. Content AI */
  var CT_MODES = [
    { id: 'product', ic: 'box', t: 'Từ sản phẩm' },
    { id: 'criteria', ic: 'sliders', t: 'Theo tiêu chí' },
    { id: 'prompt', ic: 'chat', t: 'Viết prompt' }
  ];
  var CT_TYPES = ['Kịch bản video ngắn', 'Caption TikTok', 'Kịch bản LIVE', 'Lời mời hợp tác Creator', 'Tin nhắn nhắc Creator', 'Mô tả sản phẩm'];
  var TONES = ['Thân thiện', 'Chuyên gia', 'Hài hước', 'Sang trọng', 'Gấp gáp, chốt đơn'];

  P['ai-content'] = function (c) {
    var x = st(c), db = S.data;
    var prods = db.products[c.shop.id] || [];
    if (!x.cmode) x.cmode = 'product';
    if (!x.cnum) x.cnum = '2';
    if (!x.clen) x.clen = 'Vừa';
    if (!x.clang) x.clang = 'Tiếng Việt';
    if (!x.ctype) x.ctype = CT_TYPES[0];
    if (!x.tone) x.tone = TONES[0];
    if (!x.cprod && prods[0]) x.cprod = prods[0].id;
    var prodPick = pick(c, 'cprod', 'Sản phẩm', prods.map(function (p) { return { v: p.id, l: p.name, s: S.amt(p.price) + ' · hoa hồng ' + p.com + '%' }; }),
      { icon: 'box', ph: 'Chọn sản phẩm', wide: true });
    var typePick = pick(c, 'ctype', 'Loại', CT_TYPES, { icon: 'file' });
    var form;
    if (x.cmode === 'product') {
      form = '<div class="ig-xbar-row">' + prodPick + typePick + '</div>' +
        inp('chl', x.chl, 'Điểm nhấn muốn nói (không bắt buộc): giảm 20% cuối tuần, freeship…');
    } else if (x.cmode === 'criteria') {
      form = '<div class="ig-xbar-row">' + prodPick + typePick +
          pick(c, 'tone', 'Văn phong', TONES, { icon: 'chat' }) +
          pick(c, 'clen', 'Độ dài', ['Ngắn', 'Vừa', 'Dài'], { ph: 'Vừa' }) +
          pick(c, 'clang', 'Ngôn ngữ', ['Tiếng Việt', 'English', 'ภาษาไทย'], { icon: 'globe', ph: 'Tiếng Việt' }) + '</div>' +
        inp('caud', x.caud, 'Khách hàng mục tiêu: dân văn phòng 22–30 tuổi, thích đồ uống tiện lợi');
    } else {
      form = area('cprompt', x.cprompt, 'Viết bất kỳ yêu cầu nào. Ví dụ: Viết 3 hook mở đầu video 3 giây cho Cold Brew Vị Đào, giọng GenZ, có emoji', 4) +
        '<div class="ig-xsuggest-sm">' + ['Viết 5 hook mở đầu video', 'Viết kịch bản LIVE 30 phút', 'Viết lời mời Creator Beauty', 'Viết caption kèm hashtag'].map(function (s) {
          return '<button data-do="aix:set:cprompt:' + U.attr(s) + '">' + ic('sparkle') + U.esc(s) + '</button>'; }).join('') + '</div>';
    }

    var outs = x.outs;
    return c.head(U.btn('Thư viện mẫu', { icon: 'template', act: 'go:/templates' }) +
      (outs ? U.btn('Tải tất cả', { icon: 'download', act: 'aix:content:dl' }) : '')) +
    '<div class="ig-section"><div class="ig-xcontent">' +
      '<div class="ig-xbuild">' +
        '<div class="ig-xseg">' + CT_MODES.map(function (m) {
          return '<button class="' + (x.cmode === m.id ? 'on' : '') + '" data-do="aix:set:cmode:' + m.id + '">' + ic(m.ic) + U.esc(m.t) + '</button>';
        }).join('') + '</div>' +
        (running(c, 'content') ? jobHTML(JOB) :
        '<div class="ig-xform">' + form +
          '<div class="ig-xfoot">' + modelPick(c) + pick(c, 'cnum', 'Phương án', ['1', '2', '3'], { ph: '2' }) +
            '<span class="spacer"></span>' +
            U.btn('Viết content', { variant: 'primary', icon: 'sparkle', act: 'aix:content:run' }) + '</div></div>') +
      '</div>' +
      '<div class="ig-xouts">' + (outs ? outs.list.map(function (o, i) {
        return '<article class="ig-xout"><header><b>Phương án ' + (i + 1) + '</b><span class="gm-tag">' + U.esc(outs.type) + '</span>' +
          '<span class="spacer"></span>' +
          U.iconBtn('copy', 'Sao chép', 'aix:content:copy:' + i) +
          U.iconBtn('download', 'Tải xuống', 'aix:content:dl:' + i) +
          U.iconBtn('refresh', 'Viết lại', 'aix:content:run') + '</header>' +
          '<div class="tx">' + o.split('\n').map(function (l) { return l ? '<p>' + U.esc(l) + '</p>' : ''; }).join('') + '</div>' +
          '<footer><span class="gm-help">' + o.length + ' ký tự</span><span class="spacer"></span>' +
            U.btn('Lưu vào Thư viện mẫu', { sm: true, icon: 'template', act: 'aix:content:save:' + i }) + '</footer></article>';
      }).join('') : '<div class="ig-xempty tall">' + ic('edit') + '<span>Nội dung AI viết sẽ hiện ở đây.<br>Chọn sản phẩm hoặc nhập prompt rồi bấm <b>Viết content</b>.</span></div>') +
      '</div>' +
    '</div></div>';
  };

  /* ---------------------------------------------------------- sinh nội dung mẫu */
  function writeContent(c) {
    var x = st(c), db = S.data, n = parseInt(x.cnum || '2', 10);
    var p = (db.products[c.shop.id] || []).filter(function (q) { return q.id === x.cprod; })[0] || (db.products[c.shop.id] || [])[0] ||
      { name: 'sản phẩm', price: 0, com: 15 };
    var price = S.amt(p.price), hl = x.chl ? ' ' + x.chl + '.' : '', type = x.ctype;
    var hooks = ['Đừng lướt qua nếu bạn là người mê ' + p.name.toLowerCase() + '!', 'Mình đã thử ' + p.name + ' 7 ngày liền và đây là kết quả…',
      'Chỉ ' + price + ' mà chất lượng thế này thì quá hời!'];
    if (x.cmode === 'prompt' && x.cprompt) {
      return { type: 'Theo prompt', list: hooks.slice(0, n).map(function (h, i) {
        return 'Yêu cầu: ' + x.cprompt + '\n\n' + h + '\n' + ['✨ Mở đầu bằng cận cảnh sản phẩm, chữ to trên màn hình.', '☕ Kể trải nghiệm thật trong 1 câu, chèn giá và ưu đãi.', '👉 Kết bằng lời kêu gọi bấm giỏ hàng ngay.'][i % 3] +
          '\n#' + p.name.replace(/[^\wÀ-ỹ]/g, '').toLowerCase() + ' #tiktokshop #reviewthat';
      }) };
    }
    var list = hooks.slice(0, n).map(function (h, i) {
      if (/Kịch bản video/.test(type)) return 'HOOK (0–3s): ' + h + '\nTHÂN (3–20s): Cận cảnh ' + p.name + ', nêu 2 điểm nổi bật và giá ' + price + '.' + hl +
        '\nCHỨNG MINH (20–35s): Dùng thử trước camera, phản ứng thật.\nCTA (35–45s): Bấm giỏ hàng góc trái, số lượng ưu đãi có hạn!';
      if (/Caption/.test(type)) return h + ' ' + p.name + ' giá chỉ ' + price + '.' + hl + ' Bấm giỏ hàng để nhận ưu đãi hôm nay 🛒\n#tiktokshop #' + ['review', 'muasam', 'deal'][i] + ' #xuhuong';
      if (/LIVE/.test(type)) return 'PHÚT 0–5: Chào mọi người, giới thiệu ' + p.name + ' và ưu đãi chỉ có trong live.' + hl +
        '\nPHÚT 5–15: Demo sản phẩm, đọc bình luận, trả lời câu hỏi.\nPHÚT 15–25: Mini game tặng quà, chốt đơn đợt 1 với giá ' + price + '.\nPHÚT 25–30: Nhắc lại ưu đãi, đếm ngược hết hàng.';
      if (/Lời mời/.test(type)) return 'Chào {tên Creator}, mình là ' + c.shop.name + '. Bên mình rất thích phong cách nội dung của bạn và muốn mời hợp tác ' +
        p.name + ' với hoa hồng ' + (p.com + i * 2) + '%, gửi mẫu miễn phí.' + hl + ' Bạn quan tâm thì chấp nhận lời mời giúp mình nhé!';
      if (/nhắc/.test(type)) return 'Chào {tên Creator}, ' + c.shop.name + ' thấy bạn đã nhận ' + p.name + ' rồi 🎉 Bạn dự kiến lên video ngày nào để bên mình hỗ trợ đẩy nội dung nhé?' + hl;
      return p.name + ' — ' + ['chất lượng vượt mong đợi trong tầm giá', 'lựa chọn được Creator tin dùng', 'món quà tinh tế cho người thân'][i] + '.\n• Giá ' + price + '.' + hl + '\n• Giao nhanh toàn quốc, đổi trả 7 ngày.';
    });
    if (x.cmode === 'criteria') list = list.map(function (t) { return '[' + x.tone + ' · ' + (x.clen || 'Vừa') + ' · ' + (x.clang || 'Tiếng Việt') + ']\n' + t; });
    return { type: type, list: list };
  }

  /* ---------------------------------------------------------- tìm Creator: chấm điểm */
  function findCreators(c) {
    var x = st(c), db = S.data, sid = c.shop.id, lim = parseInt(x.limit || '20', 10);
    var key = JSON.stringify([x.mode, x.cats, x.follow, x.gmv, x.desc, x.shopq, x.prods, x.plink, x.styles, x.vlink, x.cdesc]);
    var minG = { 1: 1e7, 2: 5e7, 3: 2e8 }[gmvSteps().indexOf(x.gmv)] || 0;
    var fr = { 'Dưới 10K': [0, 1e4], '10K – 100K': [1e4, 1e5], '100K – 500K': [1e5, 5e5], 'Trên 500K': [5e5, 1e12] };
    var all = kho(sid);
    var pool = all.filter(function (cr) {
      if (x.mode === 'cond') {
        if (x.cats && x.cats.length && x.cats.indexOf(cr.cat) < 0) return false;
        if (x.follow && x.follow.length && !x.follow.some(function (f) { return cr.followers >= fr[f][0] && cr.followers < fr[f][1]; })) return false;
        if (cr.gmv30 < minG) return false;
      }
      return true;
    });
    var WHY = {
      cond: ['Khớp ngành hàng và mức follower', 'GMV 30 ngày ổn định, tỉ lệ đăng cao', 'Khán giả cùng khu vực với shop'],
      shop: ['Đang bán sản phẩm cùng phân khúc', 'Từng có đơn từ shop cùng ngành', 'Khán giả trùng với shop tham chiếu'],
      product: ['Đã bán sản phẩm tương tự giá', 'GPM cao ở ngành này', 'Video review sản phẩm cùng loại được xem nhiều'],
      content: ['Phong cách video giống mẫu', 'Nhịp dựng và giọng kể tương đồng', 'Thường xuyên live bán hàng']
    }[x.mode];
    var list = pool.map(function (cr) {
      var s = 0.45 * hash(key + cr.id) + 0.3 * Math.min(1, cr.gmv30 / 3e8) + 0.25 * (cr.postRate / 100);
      return { id: cr.id, cr: cr, score: Math.round(62 + s * 37) };
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, lim);
    list.forEach(function (o, i) { o.why = WHY[i % 3]; });
    return { list: list, summary: 'Đã quét ' + S.num(all.length) + ' Creator trong Kho, ' + S.num(pool.length) + ' qua bộ lọc' };
  }

  function reportCSV(r) {
    var cols = ['Chiến dịch', 'Trạng thái', 'Đã gửi', 'Tỉ lệ chấp nhận', 'Tỉ lệ lên video', 'GMV', 'Chi phí', 'ROI', 'Đề xuất', 'Vì sao'];
    var rows = r.rows.map(function (o) {
      return [o.name, o.status, o.sent, p1(o.accR), p1(o.vidR), Math.round(o.gmv), Math.round(o.cost), o.roi.toFixed(2), o.verdict, o.why];
    });
    rows.push([]); rows.push(['Câu hỏi', r.goal.l]); rows.push(['Trả lời', r.answer]);
    r.recs.forEach(function (q, i) { rows.push(['Việc ' + (i + 1), q.t, 'Ưu tiên ' + q.pri, q.gain ? 'GMV +' + Math.round(q.gain) : '', q.save ? 'Tiết kiệm ' + Math.round(q.save) : '']); });
    return S.toCSV(cols, rows);
  }

  /* Popup đặt cố định theo màn hình để không bị khung trang cắt: canh theo nút,
     không đủ chỗ bên dưới thì mở lên trên, sát mép phải thì dịch vào trong. */
  function placePop() {
    var pop = document.querySelector('.ig-xp-pop'), btn = pop && pop.parentNode.querySelector('.ig-xp-btn');
    if (!pop || !btn) return;
    var r = btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    var below = window.innerHeight - r.bottom - 12;
    pop.style.position = 'fixed';
    pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    pop.style.right = 'auto';
    pop.style.bottom = 'auto';
    pop.style.top = (below < h && r.top > h + 12 ? r.top - h - 6 : r.bottom + 6) + 'px';
  }
  /* cuộn trang thì đóng popup đang mở, tránh popup trôi lệch khỏi nút */
  document.addEventListener('scroll', function (e) {
    if (e.target.closest && e.target.closest('.ig-xp-pop')) return;
    var pop = document.querySelector('.ig-xp-pop'); if (!pop || !global.APP) return;
    var c; try { c = global.APP.vz(); } catch (err) { return; }
    if (c.v.aix) c.v.aix.open = null;
    var w = pop.parentNode; w.classList.remove('is-open'); pop.remove();
  }, true);

  /* ---------------------------------------------------------- thao tác */
  function action(a, el, c, refresh, toast) {
    var x = st(c), db = S.data, verb = a[0], arg = a[1], rest = a.slice(2).join(':');
    if (verb === 'open') {
      x.open = arg && x.open !== arg ? arg : null; refresh();
      placePop();
      var q = document.querySelector('[data-xpq]'); if (q) q.focus();
      return true;
    }
    if (verb === 'set') {
      x[arg] = rest;
      if (x.open === arg) x.open = null;
      if (arg === 'mode') x.found = null;
      refresh(); return true;
    }
    if (verb === 'tog') {
      var arr = x[arg] = (x[arg] || []).slice(), i = arr.indexOf(rest);
      if (i > -1) arr.splice(i, 1); else arr.push(rest);
      refresh(); placePop();
      var q2 = document.querySelector('[data-xpq]'); if (q2) q2.focus();
      return true;
    }
    if (verb === 'clr') { x[arg] = []; refresh(); return true; }
    if (c.v.job) { toast('AI đang chạy, chờ chút nhé'); return true; }
    var mdl = model(c);

    if (verb === 'chat') {
      if (arg === 'new') {
        if (db.chat.length) chatHistory().unshift({ id: S.uid('h'), title: (db.chat[0].text || 'Cuộc trò chuyện').slice(0, 48), at: 'Vừa xong', msgs: db.chat });
        db.chat = []; S.save(); refresh();
      } else if (arg === 'open') {
        var h = chatHistory().filter(function (q) { return q.id === rest; })[0];
        if (!h) return true;
        if (db.chat.length) chatHistory().unshift({ id: S.uid('h'), title: (db.chat[0].text || 'Cuộc trò chuyện').slice(0, 48), at: 'Vừa xong', msgs: db.chat });
        db.chatHistory = chatHistory().filter(function (q) { return q.id !== rest; });
        db.chat = h.msgs && h.msgs.length ? h.msgs : [{ role: 'me', text: h.title }, { role: 'ai', html: P.aiAnswer(h.title, { shop: c.shop, v: c.v }) }];
        S.save(); refresh();
      } else if (arg === 'dl') {
        var tmp = document.createElement('div');
        var txt = db.chat.map(function (m) {
          if (m.role === 'me') return 'Bạn: ' + m.text;
          tmp.innerHTML = m.html || ''; return 'GOPUSH AI: ' + tmp.textContent.trim();
        }).join('\n\n');
        S.download('gopush-ai-chat-' + fileDate() + '.txt', txt, 'text/plain');
      }
      return true;
    }

    if (verb === 'rep') {
      if (arg === 'new') { x.formOpen = true; x.rep = null; refresh(); return true; }
      if (arg === 'close') { x.rep = null; x.formOpen = true; refresh(); return true; }
      if (arg === 'print') { global.print(); return true; }
      if (arg === 'csvcur' && x.rep) { S.download('gopush-report-' + fileDate() + '.csv', reportCSV(x.rep)); toast('Đã tải report'); return true; }
      if (arg === 'list') {
        S.download('gopush-report-ai-' + fileDate() + '.csv', S.toCSV(['Report', 'Loại', 'Phạm vi', 'Người tạo', 'Tạo lúc', 'Trạng thái'],
          db.aiReports.map(function (r) { return [r.name, r.kind, r.scope, r.by, r.at, r.status]; })));
        toast('Đã tải danh sách report'); return true;
      }
      if (arg === 'view' || arg === 'csv') {
        var rp = db.aiReports.filter(function (r) { return r.id === rest; })[0];
        if (!rp) return true;
        /* report cũ chưa có dữ liệu phân tích: dựng lại từ các chiến dịch hiện có */
        if (!rp.data) {
          var keep = x.camps;
          x.camps = shopCamps(c).slice(0, 3).map(function (cp) { return cp.id; });
          rp.data = analyze(c, x); rp.data.title = rp.name; rp.data.at = rp.at;
          x.camps = keep; S.save();
        }
        if (arg === 'csv') { S.download('gopush-report-' + fileDate() + '.csv', reportCSV(rp.data)); toast('Đã tải report'); return true; }
        x.rep = rp.data; x.formOpen = false; refresh(); scrollTo('aix-rep'); return true;
      }
      if (arg === 'run') {
        if (!x.camps || !x.camps.length) { toast('Chọn ít nhất 1 chiến dịch'); return true; }
        x.open = null;
        runJob(c.v, { key: 'rep', model: mdl, title: 'Đang phân tích ' + x.camps.length + ' chiến dịch', after: function () { scrollTo('aix-rep'); }, steps: [
          'Quét lời mời và phản hồi của ' + x.camps.length + ' chiến dịch', 'Quét yêu cầu hàng mẫu và vận đơn', 'Đọc nội dung, đơn hàng và GMV',
          'So với ' + (x.cmp === 'prev' ? 'kỳ trước' : 'trung bình shop'), 'Tìm khâu nghẽn trong phễu', 'Chấm từng chiến dịch và Creator',
          'Viết nhận định và việc nên làm'] }, function () {
          var r = analyze(c, x);
          db.aiReports.unshift({ id: r.id, name: r.title, kind: { eval: 'Đánh giá', why: 'Phân tích', scale: 'Đề xuất', creator: 'Phân tích', cost: 'Phân tích' }[r.goal.v],
            scope: r.scope, at: r.at, by: 'GOPUSH AI', status: 'Hoàn thành', data: r });
          x.rep = r; x.formOpen = false;
          S.log('Tạo report AI “' + r.title + '”', 'Khác', c.shop.id); S.save();
          toast('Đã tạo report');
        });
      }
      return true;
    }

    if (verb === 'find') {
      if (arg === 'run') {
        if (x.mode === 'shop' && !x.shopq) { toast('Nhập tên hoặc link cửa hàng'); return true; }
        x.open = null;
        var label = { cond: 'theo điều kiện', shop: 'theo cửa hàng', product: 'theo sản phẩm', content: 'theo nội dung' }[x.mode];
        runJob(c.v, { key: 'find', model: mdl, title: 'AI đang tìm Creator ' + label, after: function () { scrollTo('aix-found'); }, steps: [
          'Phân tích yêu cầu',
          x.mode === 'shop' ? 'Đối chiếu lịch sử bán của Creator với cửa hàng tham chiếu' : (x.mode === 'product' ? 'Hiểu sản phẩm: ngành, giá, hoa hồng' : (x.mode === 'content' ? 'Phân tích phong cách nội dung mẫu' : 'Dựng bộ lọc từ điều kiện')),
          'Đọc ' + S.num(kho(c.shop.id).length) + ' Creator trong Kho (sao lưu ' + (global.CRX ? global.CRX.backupAt() : '') + ')', 'Chấm điểm phù hợp theo tiêu chí Cài đặt AI',
          'Loại Creator bị chặn và trùng lặp', 'Xếp hạng kết quả'] }, function () {
          x.found = findCreators(c);
          toast('Tìm thấy ' + x.found.list.length + ' Creator phù hợp');
        });
      } else if (arg === 'save' || arg === 'saveAll') {
        var ids = arg === 'save' ? [rest] : (x.found ? x.found.list.map(function (o) { return o.id; }) : []);
        ids.forEach(function (id) { var cr = S.creator(id); if (cr) S.rel(cr, c.shop.id).saved = true; });
        S.save(); toast('Đã lưu ' + ids.length + ' Creator vào Kho'); refresh();
      } else if (arg === 'csv' && x.found) {
        S.download('gopush-ai-tim-creator-' + fileDate() + '.csv', S.toCSV(['Creator', 'Username', 'Ngành hàng', 'Độ phù hợp', 'Follower', 'GMV 30 ngày (' + S.market().iso + ')', 'Tỉ lệ đăng', 'Vì sao'],
          x.found.list.map(function (o) { return [o.cr.name, '@' + o.cr.user, o.cr.cat, o.score, o.cr.followers, Math.round(S.fx(o.cr.gmv30)), o.cr.postRate + '%', o.why]; })));
        toast('Đã tải ' + x.found.list.length + ' Creator');
      }
      return true;
    }

    if (verb === 'content') {
      if (arg === 'run') {
        if (x.cmode === 'prompt' && !x.cprompt) { toast('Nhập prompt trước đã'); return true; }
        x.open = null;
        runJob(c.v, { key: 'content', model: mdl, title: 'AI đang viết ' + (x.cmode === 'prompt' ? 'content theo prompt' : x.ctype.toLowerCase()), steps: [
          'Đọc thông tin sản phẩm và shop', 'Áp hướng dẫn riêng và từ khóa cấm', 'Viết bản nháp', 'Tối ưu hook và lời kêu gọi', 'Kiểm tra chính tả, độ dài'] }, function () {
          x.outs = writeContent(c);
          toast('Đã viết ' + x.outs.list.length + ' phương án');
        });
      } else if (arg === 'copy') {
        var t = x.outs && x.outs.list[parseInt(rest, 10)];
        try { if (t && navigator.clipboard) navigator.clipboard.writeText(t); } catch (e) { /* bỏ qua */ }
        toast('Đã sao chép nội dung');
      } else if (arg === 'dl' && x.outs) {
        var one = rest !== '' ? [x.outs.list[parseInt(rest, 10)]] : x.outs.list;
        S.download('gopush-content-ai-' + fileDate() + '.txt', one.map(function (o, k) { return '— Phương án ' + (k + 1) + ' —\n' + o; }).join('\n\n'), 'text/plain');
      } else if (arg === 'save') {
        var body = x.outs && x.outs.list[parseInt(rest, 10)];
        if (body) {
          db.templates.unshift({ id: S.uid('ti'), kind: /Lời mời/.test(x.outs.type) ? 'invite' : 'message', name: 'AI · ' + x.outs.type,
            scope: c.shop.name, com: 0, free: true, uses: 0, body: body });
          S.save(); toast('Đã lưu vào Thư viện mẫu');
        }
      }
      return true;
    }
    return false;
  }

  /* ô nhập data-aix: ghi thẳng vào trạng thái trang, không vẽ lại */
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.hasAttribute && t.hasAttribute('data-xpq')) {
      var q = t.value.trim().toLowerCase(), pop = t.closest('.ig-xp-pop');
      if (pop) [].forEach.call(pop.querySelectorAll('.ig-xp-list > button'), function (b) {
        b.hidden = !!q && b.getAttribute('data-txt').indexOf(q) < 0;
      });
      return;
    }
    var k = t.getAttribute && t.getAttribute('data-aix');
    if (!k || !global.APP) return;
    var c = global.APP.vz(); if (!c.v.aix) c.v.aix = {};
    c.v.aix[k] = t.value;
  });
  /* bấm ra ngoài thì đóng bộ chọn đang mở */
  document.addEventListener('mousedown', function (e) {
    if (!global.APP || (e.target.closest && e.target.closest('.ig-xp'))) return;
    var c; try { c = global.APP.vz(); } catch (err) { return; }
    if (!(c && c.v && c.v.aix && c.v.aix.open)) return;
    /* chỉ gỡ popup khỏi DOM, không vẽ lại trang để cú bấm vào nút khác vẫn chạy */
    c.v.aix.open = null;
    [].forEach.call(document.querySelectorAll('.ig-xp.is-open'), function (w) {
      w.classList.remove('is-open');
      var pop = w.querySelector('.ig-xp-pop'); if (pop) pop.remove();
    });
  });

  global.AIX = { action: action, MODELS: MODELS, isSystem: isSystem, pick: pick, st: st };
})(window);
