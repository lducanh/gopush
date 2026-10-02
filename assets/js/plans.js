/* GOPUSH — gói dịch vụ: dữ liệu gói, hạn mức áp vào hệ thống, trang Bảng giá công khai
   (#/pricing) và trang Gói & thanh toán trong app (#/settings/billing).
   Giá lưu theo VND (đơn vị gốc của store.js), hiển thị theo tiền tệ thị trường đang chọn. */
(function (global) {
  'use strict';

  var P = global.PAGES, U = global.UI, S = global.DB, ic = global.icon;
  var INF = Infinity;

  /* hạn mức theo bảng quyền lợi: cửa hàng liên kết, tác vụ song song, tài khoản phụ,
     Creator được mời / nhắn tin riêng mỗi ngày */
  var PLANS = [
    { id: 'trial', name: 'Gói dùng thử', tag: 'Trải nghiệm tính năng cốt lõi trong 7 ngày', price: 0,
      shops: 1, tasks: 2, subs: 0, invites: 1000, msgs: 1000, support: 'Email' },
    { id: 'basic', name: 'Gói Cơ bản', tag: 'Cho shop mới bắt đầu làm affiliate', price: 399000,
      shops: 2, tasks: 2, subs: 0, invites: 3000, msgs: 3000, support: 'Email, Zalo' },
    { id: 'pro', name: 'Gói Chuyên nghiệp', tag: 'Cho thương hiệu chạy nhiều shop, nhiều chiến dịch', price: 1299000, popular: true,
      shops: 8, tasks: 8, subs: 1, invites: 10000, msgs: 10000, support: 'Zalo ưu tiên' },
    { id: 'premium', name: 'Gói Cao cấp', tag: 'Cho agency và nhà bán hàng quy mô lớn', price: 2699000,
      shops: 20, tasks: 20, subs: 9, invites: INF, msgs: INF, support: 'Chuyên viên riêng' }
  ];
  /* tính năng theo gói: dùng thử mở đủ để khách trải nghiệm */
  var FEATURES = [
    ['Tìm Creator qua API TikTok Shop', [1, 1, 1, 1], 'discover'],
    ['Kho Creator, sao lưu mỗi ngày', [1, 1, 1, 1], 'library'],
    ['Phân loại Creator và Gắn Tag', [0, 1, 1, 1], 'segments'],
    ['Tự động hóa lời mời và tin nhắn', [0, 1, 1, 1], 'auto'],
    ['GOPUSH AI: Chat, Tìm Creator, Content', [0, 0, 1, 1], 'ai'],
    ['Report AI phân tích chiến dịch', [0, 0, 1, 1], 'report']
  ];
  /* gói hiện tại có tính năng này không (khóa theo trường feature trong sitemap) */
  function has(key) {
    if (current().id === 'none') return false;
    var f = FEATURES.filter(function (x) { return x[2] === key; })[0];
    return !f || !!f[1][PLANS.indexOf(current())];
  }
  function featureName(key) { var f = FEATURES.filter(function (x) { return x[2] === key; })[0]; return f ? f[0] : ''; }

  /* gói năm = 12 tháng, giảm 20%, làm tròn về giá "đẹp" gần nhất: phần nghìn kết thúc bằng
     099, 299, 399, 599, 699 hoặc 999. Ví dụ 3.830.400 → 3.699.000 */
  var ENDS = [99, 299, 399, 599, 699, 999];
  function nice(v) {
    var k = v / 1000, base = Math.floor(k / 1000) * 1000, best = null;
    [base - 1000, base, base + 1000].forEach(function (b) {
      ENDS.forEach(function (e) { var c = b + e; if (c > 0 && (best === null || Math.abs(c - k) < Math.abs(best - k))) best = c; });
    });
    return best * 1000;
  }
  /* dùng thử cố định 7 ngày, tính từ hôm nay */
  var TRIAL_DAYS = 7;
  /* ngày 1 của tháng hiện tại + off (gia hạn, hóa đơn) */
  function firstOf(off) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + off); return d; }
  function trialEnd() { var d = new Date(); d.setDate(d.getDate() + TRIAL_DAYS); return S.fmtDate(d) + ' (hết dùng thử)'; }
  function yearly(p) { return p.price ? nice(p.price * 12 * 0.8) : 0; }
  function priceOf(p, cycle) { return cycle === 'year' ? yearly(p) : p.price; }
  /* tài khoản vừa khởi tạo, chưa chọn gói nào (kể cả dùng thử): chỉ xem Trang chủ, Gói, Hồ sơ */
  var NONE = { id: 'none', name: 'Chưa có gói', tag: '', price: 0, shops: 0, tasks: 0, subs: 0, invites: 0, msgs: 0, support: '' };
  var OPEN_PAGES = ['home', 'billing', 'profile', 'shop-list', 'shop-detail'];
  function byId(id) { return id === 'none' ? NONE : (PLANS.filter(function (p) { return p.id === id; })[0] || PLANS[0]); }
  function rank(id) { return id === 'none' ? -1 : PLANS.indexOf(byId(id)); }
  function isNone() { return current().id === 'none'; }
  /* trang có mở được với gói hiện tại không */
  function allowPage(p) {
    if (isNone()) return OPEN_PAGES.indexOf(p.navAs || p.id) > -1;
    return !p.feature || has(p.feature);
  }
  function denyNone() {
    deny('Tài khoản <b>chưa có gói</b>. Bắt đầu dùng thử 7 ngày miễn phí hoặc chọn gói để dùng tính năng này.');
  }

  /* gói, đơn chờ thanh toán, hóa đơn, phương thức thanh toán, ngày gia hạn thuộc về TÀI KHOẢN chứ không theo thị trường:
     lưu ở một khóa riêng của tài khoản, chép vào kho của thị trường đang mở mỗi khi đổi kho, ghi ngược lại mỗi lần lưu.
     Khóa bắt đầu bằng gopush.db.v8. và kết thúc bằng uid nên được xóa cùng kho khi đặt lại tài khoản demo. */
  function acctKey() { var u = global.AUTH && global.AUTH.user(); return u ? 'gopush.db.v8.billing.' + u.uid : null; }
  var synced = null;
  function syncIn() {
    if (synced === S.data) return;
    synced = S.data;
    var k = acctKey(); if (!k) return;
    try {
      var a = JSON.parse(localStorage.getItem(k) || 'null');
      if (a && a.b) { S.data.settings.billing = a.b; S.data.invoices = a.inv || []; }
      else syncOut();
    } catch (e) { /* bỏ qua */ }
  }
  function syncOut() {
    var k = acctKey(); if (!k || synced !== S.data) return;
    try { localStorage.setItem(k, JSON.stringify({ b: S.data.settings.billing, inv: S.data.invoices })); } catch (e) { /* bỏ qua */ }
  }
  var baseSave = S.save;
  S.save = function () { syncOut(); return baseSave.apply(S, arguments); };

  /* gói đang dùng: theo tài khoản đăng nhập (AUTH.plan), ghi lại để hiển thị hóa đơn */
  function billing() {
    syncIn();
    var b = S.data.settings.billing;
    var u = global.AUTH && global.AUTH.user();
    if (u) {
      var pid = global.AUTH.plan();
      if (b.planId !== pid) { b.planId = pid; b.plan = byId(pid).name; if (!b.cycleId) b.cycleId = 'month'; S.save(); }
    }
    if (!b.renew) b.renew = '—';
    if (!b.planId) {
      b.planId = { Starter: 'basic', Growth: 'premium', Scale: 'premium' }[b.plan] || 'premium';
      b.cycleId = 'month';
      b.renew = S.fmtDate(firstOf(1));
      S.save();
    }
    return b;
  }
  function current() { return byId(billing().planId); }

  /* lời mời mỗi ngày không vượt hạn mức của gói */
  /* Hạn mức gói tính trên TỔNG tài khoản trong ngày (cộng mọi shop): shop này dùng bao nhiêu
     thì shop khác còn bấy nhiêu. Gói không giới hạn (INF) thì không chặn gì.
     Giới hạn riêng từng shop (soft/hard trong Cài đặt shop) vẫn áp dụng như cài đặt an toàn. */
  function acct(kind) {
    var lim = current()[kind === 'msgs' ? 'msgs' : 'invites'];
    var used = S.data.shops.reduce(function (a, s) { return a + ((kind === 'msgs' ? s.msgUsed : s.used) || 0); }, 0);
    return { used: used, limit: lim, left: lim === INF ? INF : Math.max(0, lim - used) };
  }
  var baseQuota = S.quota;
  S.quota = function (shopId) {
    var q = baseQuota(shopId), a = acct('invites');
    q.shopLeft = q.left;
    /* gói không giới hạn: bỏ cả giới hạn an toàn của từng shop */
    q.left = a.limit === INF ? INF : Math.min(q.left, a.left);
    q.acctUsed = a.used; q.acctLimit = a.limit; q.acctLeft = a.left;
    return q;
  };
  /* còn gửi được bao nhiêu (lời mời: thêm cả giới hạn shop; tin nhắn: theo tài khoản) */
  function room(kind, sid) { return kind === 'msgs' ? acct('msgs').left : S.quota(sid).left; }
  /* trừ hạn mức; trả về số thực gửi được. Hết hạn mức thì hiện popup (trừ khi silent) */
  function take(kind, sid, n, silent) {
    var k = Math.max(0, Math.min(n, room(kind, sid)));
    if (!k) { if (!silent) denyLimit(kind, sid); return 0; }
    var sh = S.shop(sid);
    if (kind === 'msgs') sh.msgUsed = (sh.msgUsed || 0) + k; else sh.used = (sh.used || 0) + k;
    return k;
  }
  /* shop đang chạy chiến dịch (tác vụ song song = số cửa hàng khác nhau chạy cùng lúc) */
  function runningShops() {
    var set = {};
    S.data.campaigns.forEach(function (c) { if (c.status === 'Đang chạy') set[c.shopId] = 1; });
    return Object.keys(set);
  }

  /* còn được thêm không: shops (cửa hàng liên kết), subs (tài khoản phụ) */
  function check(kind, sid) {
    var p = current(), db = S.data;
    if (kind === 'shops') return { ok: db.shops.length < p.shops, used: db.shops.length, limit: p.shops, label: 'cửa hàng liên kết' };
    if (kind === 'subs') return { ok: Math.max(0, db.members.length - 1) < p.subs, used: Math.max(0, db.members.length - 1), limit: p.subs, label: 'tài khoản phụ' };
    if (kind === 'tasks') { var rs = runningShops(); return { ok: rs.indexOf(sid) > -1 || rs.length < p.tasks, used: rs.length, limit: p.tasks, label: 'cửa hàng chạy chiến dịch cùng lúc' }; }
    if (kind === 'invites' || kind === 'msgs') { var a = acct(kind); return { ok: a.left > 0, used: a.used, limit: a.limit, label: kind === 'msgs' ? 'tin nhắn mỗi ngày (tổng mọi shop)' : 'lời mời mỗi ngày (tổng mọi shop)' }; }
    return { ok: true };
  }

  /* ---------------------------------------------------------- hiển thị */
  function fmt(n) { return n === INF ? 'Không giới hạn' : S.num(n); }
  function money(v) { return S.vnd(v); }
  function accounts(p) { return (1 + p.subs) + ' tài khoản · 1 chính + ' + p.subs + ' phụ'; }

  function cycleSwitch(cycle, act) {
    return '<div class="ig-cyc" role="tablist">' +
      '<button class="' + (cycle === 'month' ? 'on' : '') + '" data-plancycle="month" role="tab">Theo tháng</button>' +
      '<button class="' + (cycle === 'year' ? 'on' : '') + '" data-plancycle="year" role="tab">Theo năm<span>Tiết kiệm 20%</span></button></div>';
  }

  /* thẻ gói; o.action(p) trả về HTML nút hành động */
  function cards(cycle, o) {
    o = o || {};
    return '<div class="ig-tiers">' + PLANS.map(function (p) {
      var price = priceOf(p, cycle), full = p.price * 12;
      return '<article class="ig-tier' + (p.popular ? ' is-pop' : '') + (o.current === p.id ? ' is-cur' : '') + '">' +
        (p.popular ? '<span class="ribbon">Phổ biến nhất</span>' : '') +
        '<header><h3>' + U.esc(p.name) + '</h3><p>' + U.esc(p.tag) + '</p></header>' +
        '<div class="price"><b class="gm-num">' + money(price) + '</b><span>' + (p.price ? (cycle === 'year' ? '/ năm' : '/ tháng') : '/ 7 ngày') + '</span></div>' +
        '<div class="sub">' + (p.price && cycle === 'year'
          ? '<s>' + money(full) + '</s> · khoảng ' + money(Math.round(price / 12 / 1000) * 1000) + ' / tháng'
          : (p.price ? 'Hoặc ' + money(yearly(p)) + ' / năm' : 'Không cần thẻ thanh toán')) + '</div>' +
        (o.action ? o.action(p) : '') +
        '<ul>' +
          '<li>' + ic('store') + '<span><b>' + fmt(p.shops) + '</b> cửa hàng liên kết</span></li>' +
          '<li>' + ic('layers') + '<span><b>' + fmt(p.tasks) + '</b> tác vụ song song</span></li>' +
          '<li>' + ic('users') + '<span><b>' + (1 + p.subs) + '</b> tài khoản (' + p.subs + ' phụ)</span></li>' +
          '<li>' + ic('send') + '<span><b>' + fmt(p.invites) + '</b> lời mời Creator / ngày</span></li>' +
          '<li>' + ic('msgSend') + '<span><b>' + fmt(p.msgs) + '</b> tin nhắn riêng / ngày</span></li>' +
          FEATURES.filter(function (f) { return f[1][PLANS.indexOf(p)]; }).slice(4).map(function (f) {
            return '<li>' + ic('ai') + '<span>' + U.esc(f[0]) + '</span></li>'; }).join('') +
        '</ul></article>';
    }).join('') + '</div>';
  }

  /* bảng so sánh quyền lợi, như bảng giá chuẩn: mỗi cột một gói */
  function compare(cycle, curId) {
    function row(label, vals, cls) {
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><th>' + label + '</th>' + vals.map(function (v, i) {
        return '<td class="' + (PLANS[i].popular ? 'pop' : '') + (PLANS[i].id === curId ? ' cur' : '') + '">' + v + '</td>';
      }).join('') + '</tr>';
    }
    var yes = '<span class="ig-yes">' + ic('check') + '</span>', no = '<span class="ig-no">—</span>';
    return '<div class="ig-cmp-wrap"><table class="ig-cmp">' +
      '<thead><tr><th></th>' + PLANS.map(function (p) {
        return '<th class="' + (p.popular ? 'pop' : '') + (p.id === curId ? ' cur' : '') + '"><b>' + U.esc(p.name) + '</b><span class="gm-num">' +
          money(priceOf(p, cycle)) + '</span></th>';
      }).join('') + '</tr></thead><tbody>' +
      row('Quyền lợi dịch vụ', PLANS.map(function () { return ''; }), 'sec') +
      row('Số cửa hàng liên kết', PLANS.map(function (p) { return fmt(p.shops); })) +
      row('Số tác vụ song song <small>(các cửa hàng khác nhau)</small>', PLANS.map(function (p) { return fmt(p.tasks); })) +
      row('Số tài khoản', PLANS.map(function (p) { return '<b>' + (1 + p.subs) + '</b> <small>(1 chính + ' + p.subs + ' phụ)</small>'; })) +
      row('Số Creator được mời', PLANS.map(function (p) { return p.invites === INF ? 'Không giới hạn' : fmt(p.invites) + '/ngày'; })) +
      row('Số Creator được nhắn tin riêng', PLANS.map(function (p) { return p.msgs === INF ? 'Không giới hạn' : fmt(p.msgs) + '/ngày'; })) +
      row('Tính năng', PLANS.map(function () { return ''; }), 'sec') +
      FEATURES.map(function (f) { return row(U.esc(f[0]), f[1].map(function (v) { return v ? yes : no; })); }).join('') +
      row('Hỗ trợ', PLANS.map(function (p) { return U.esc(p.support); })) +
      '</tbody></table></div>';
  }

  var FAQ = [
    ['Gói năm được tính thế nào?', 'Bằng 12 tháng, giảm 20% rồi làm tròn về giá gần nhất. Thanh toán một lần cho cả năm.'],
    ['Có hạ gói giữa kỳ được không?', 'Không hạ gói giữa kỳ đã thanh toán. Bạn đổi sang gói thấp hơn khi gia hạn kỳ sau.'],
    ['Nâng gói giữa kỳ thì sao?', 'Tạo đơn nâng cấp và thanh toán; gói mới có hiệu lực ngay khi thanh toán được xác nhận, phần tiền còn lại của gói cũ được trừ theo số ngày.'],
    ['Hết dùng thử thì dữ liệu có mất không?', 'Không. Kho Creator, chiến dịch và report được giữ lại; chọn gói để tiếp tục thao tác.']
  ];
  function faq() {
    return '<div class="ig-faq">' + FAQ.map(function (q, i) {
      return '<details' + (i ? '' : ' open') + '><summary>' + U.esc(q[0]) + ic('down') + '</summary><p>' + U.esc(q[1]) + '</p></details>';
    }).join('') + '</div>';
  }

  /* ---------------------------------------------------------- trang Bảng giá công khai */
  var CYCLE = 'month';
  P.pricing = function (c) {
    var logged = global.AUTH && global.AUTH.user();
    return '<div class="ig-public ig-site">' + P.pubNav(c.lang) +
      '<section class="ig-pr-hero"><div class="ig-wrap">' +
        '<span class="ig-eyebrow">Bảng giá</span>' +
        '<h1>Chọn gói theo quy mô affiliate của bạn</h1>' +
        '<p>Giá đã gồm mọi cập nhật. Dùng thử 7 ngày miễn phí, nâng gói bất cứ lúc nào.</p>' +
        cycleSwitch(CYCLE) + '</div></section>' +
      '<section class="ig-wrap ig-pr-cards">' + cards(CYCLE, { action: function (p) {
        return '<a class="ig-tier-btn' + (p.popular ? ' is-primary' : '') + '" href="' + (logged ? '#/settings/billing' : '#/signup') + '">' +
          (p.price ? 'Chọn ' + U.esc(p.name.replace('Gói ', '')) : 'Bắt đầu dùng thử') + '</a>';
      } }) + '</section>' +
      '<section class="ig-wrap ig-pr-sec"><h2>So sánh chi tiết</h2>' + compare(CYCLE) + '</section>' +
      '<section class="ig-wrap ig-pr-sec"><h2>Câu hỏi thường gặp</h2>' + faq() + '</section>' +
      P.ctaBand() + P.pubFoot() + '</div>';
  };

  /* ---------------------------------------------------------- Gói & thanh toán trong app */
  P.billing = function (c) {
    var b = billing(), cur = current(), db = S.data, view = c.v;
    var cycle = view.cycle || b.cycleId || 'month';
    var usage = [
      ['Cửa hàng liên kết', db.shops.length, cur.shops],
      ['Tài khoản phụ', Math.max(0, db.members.length - 1), cur.subs],
      ['Shop chạy chiến dịch cùng lúc', runningShops().length, cur.tasks],
      ['Lời mời hôm nay (mọi shop)', acct('invites').used, cur.invites],
      ['Tin nhắn hôm nay (mọi shop)', acct('msgs').used, cur.msgs]
    ];
    var curRank = rank(cur.id);
    return c.head(U.btn('Tải hóa đơn gần nhất', { icon: 'download', act: 'invoice:' + (db.invoices[0] ? db.invoices[0].id : '') })) +
    '<div class="ig-section">' +
      '<div class="ig-bill-top p-' + cur.id + '">' +
        '<div class="ig-bill-cur p-' + cur.id + '"><span class="gm-help">Gói hiện tại</span><h2>' + U.esc(cur.name) + '</h2>' +
          (cur.id === 'none' ? '<p>Chọn một gói hoặc dùng thử 7 ngày để bắt đầu.</p>' : !cur.price ? '<p><b>Miễn phí 7 ngày</b> · ' + U.esc(b.renew) + '</p>' : '<p><b class="gm-num">' + money(priceOf(cur, b.cycleId)) + '</b> / ' + (b.cycleId === 'year' ? 'năm' : 'tháng') +
          ' · gia hạn ' + U.esc(b.renew) + '</p>') + '<p class="gm-help">' + U.esc(b.method) + '</p></div>' +
        '<div class="ig-bill-use">' + usage.map(function (u) {
          var over = u[2] !== INF && u[1] >= u[2], pc = u[2] === INF ? 8 : Math.min(100, u[1] / Math.max(1, u[2]) * 100);
          return '<div class="' + (over ? 'is-full' : '') + '"><span class="l">' + u[0] + '</span><b class="gm-num">' + S.num(u[1]) +
            ' <small>/ ' + fmt(u[2]) + '</small></b><span class="tr"><i style="width:' + pc + '%"></i></span></div>';
        }).join('') + '</div>' +
      '</div>' +
      (b.pending ? '<div class="ig-bill-pend">' + ic('clock') + '<div><b>Đơn nâng cấp lên ' + U.esc(byId(b.pending.planId).name) + ' đang chờ thanh toán</b>' +
        '<span>' + U.esc(b.pending.invoice) + ' · ' + money(b.pending.amount) + ' · gói được kích hoạt sau khi thanh toán được xác nhận</span></div>' +
        '<span class="spacer"></span><button class="gm-btn gm-btn-sm" data-planpay="' + b.pending.planId + ':' + b.pending.cycle + ':' + b.pending.amount + '">Thanh toán</button>' +
        '<button class="gm-btn gm-btn-sm gm-btn-ghost" data-plancancel>Hủy đơn</button></div>' : '') +
      '<div class="ig-bill-head"><h2>Đổi gói</h2><span class="spacer"></span>' + cycleSwitch(cycle) + '</div>' +
      cards(cycle, { current: cur.id, action: function (p) {
        var r = rank(p.id);
        if (p.id === cur.id) return '<span class="ig-tier-btn is-cur">' + ic('check') + 'Gói hiện tại</span>';
        if (r < curRank) return '<span class="ig-tier-btn is-off" title="Hạ gói khi gia hạn kỳ sau">Không thể hạ cấp</span>';
        if (!p.price) return '<button class="ig-tier-btn is-primary" data-planbuy="' + p.id + ':' + cycle + '">Bắt đầu dùng thử</button>';
        if (b.pending) return '<span class="ig-tier-btn is-off" title="Hoàn tất hoặc hủy đơn đang chờ trước">' + (b.pending.planId === p.id ? 'Đang chờ thanh toán' : 'Đang có đơn chờ') + '</span>';
        return '<button class="ig-tier-btn' + (p.popular ? ' is-primary' : '') + '" data-planbuy="' + p.id + ':' + cycle + '">' + (curRank < 0 ? 'Chọn gói' : 'Nâng cấp') + '</button>';
      } }) +
    '</div>' +
    '<div class="ig-section"><h2>So sánh quyền lợi</h2>' + compare(cycle, cur.id) + '</div>' +
    '<div class="ig-section"><h2>Lịch sử hóa đơn</h2></div>' +
    U.table({
      cols: [{ k: 'id', t: 'Mã hóa đơn' }, { k: 'd', t: 'Ngày' }, { k: 'p', t: 'Gói' },
        { k: 'a', t: 'Số tiền', cls: 'num', r: function (r) { return r.vnd != null ? money(r.vnd) : U.esc(r.a); } }, { k: 'st', t: 'Trạng thái', r: function (r) { return U.tag(r.st); } },
        { k: '', t: '', cls: 'col-actions', r: function (r) { return U.iconBtn('download', 'Tải hóa đơn', 'invoice:' + r.id); } }],
      rows: db.invoices
    });
  };

  /* hộp xác nhận nâng gói */
  function buyModal(id, cycle) {
    var p = byId(id), cur = current(), b = billing();
    /* gói dùng thử: kích hoạt ngay, không qua thanh toán */
    if (!p.price) {
      if (global.AUTH && global.AUTH.setPlan) global.AUTH.setPlan(p.id);
      b.planId = p.id; b.plan = p.name; b.renew = trialEnd();
      S.log('Kích hoạt ' + p.name, 'Cài đặt'); S.save();
      global.APP.toast('Đã kích hoạt 7 ngày dùng thử'); global.APP.refresh(true);
      return;
    }
    var price = priceOf(p, cycle);
    /* trừ phần còn lại của gói cũ: giả định còn nửa kỳ */
    var credit = cur.price ? Math.round(priceOf(cur, b.cycleId) / 2 / 1000) * 1000 : 0;
    var pay = Math.max(0, price - credit);
    global.APP.modal(U.modal({
      title: 'Nâng cấp lên ' + p.name,
      body: '<div class="ig-buy">' +
        '<div class="row"><span>' + U.esc(p.name) + ' · ' + (cycle === 'year' ? '12 tháng' : '1 tháng') + '</span><b class="gm-num">' + money(price) + '</b></div>' +
        (credit ? '<div class="row"><span>Trừ phần còn lại của ' + U.esc(cur.name) + '</span><b class="gm-num">−' + money(credit) + '</b></div>' : '') +
        '<div class="row total"><span>Thanh toán hôm nay</span><b class="gm-num">' + money(pay) + '</b></div>' +
        '<ul>' +
          '<li>' + ic('store') + fmt(p.shops) + ' cửa hàng liên kết</li>' +
          '<li>' + ic('users') + (1 + p.subs) + ' tài khoản (1 chính + ' + p.subs + ' phụ)</li>' +
          '<li>' + ic('send') + (p.invites === INF ? 'Không giới hạn lời mời' : fmt(p.invites) + ' lời mời / ngày') + '</li></ul>' +
        '<p class="gm-help">Thanh toán qua ' + U.esc(b.method) + '. Hạn mức mới áp dụng ngay sau khi thanh toán.</p></div>',
      foot: U.btn('Hủy', { act: 'modal:close' }) + '<button class="gm-btn gm-btn-primary" data-planpay="' + id + ':' + cycle + ':' + pay + '">Tiếp tục thanh toán</button>'
    }));
  }

  /* bước thanh toán: chọn phương thức, cổng thanh toán để trống chờ tích hợp */
  function payModal(id, cycle, pay) {
    var p = byId(id);
    var methods = [['card', 'Thẻ quốc tế', 'Visa · Mastercard · JCB'], ['bank', 'Chuyển khoản / QR', 'VietQR, mọi ngân hàng'], ['wallet', 'Ví điện tử', 'MoMo · ZaloPay · ShopeePay']];
    global.APP.modal(U.modal({
      title: 'Thanh toán · ' + p.name,
      body: '<div class="ig-pay">' +
        '<div class="sum"><span>' + U.esc(p.name) + ' · ' + (cycle === 'year' ? '12 tháng' : '1 tháng') + '</span><b class="gm-num">' + money(pay) + '</b></div>' +
        '<span class="gm-help">Phương thức thanh toán</span>' +
        '<div class="methods">' + methods.map(function (m, i) {
          return '<button type="button" class="' + (i ? '' : 'on') + '" data-paymethod="' + m[0] + '"><span class="rd"></span><span class="t"><b>' + m[1] + '</b><small>' + m[2] + '</small></span></button>';
        }).join('') + '</div>' +
        '<div class="gateway">' + ic('lock') + '<div><b>Cổng thanh toán</b><span>Đang chờ tích hợp. Khu vực này sẽ hiển thị form thẻ, mã QR hoặc chuyển sang ví điện tử.</span></div></div>' +
        '<p class="gm-help">Bấm <b>Đặt hàng</b> sẽ tạo đơn chờ thanh toán. Gói <b>chưa đổi</b> cho tới khi GOPUSH xác nhận đã nhận tiền.</p>' +
      '</div>',
      foot: U.btn('Quay lại', { act: 'modal:close' }) + '<button class="gm-btn gm-btn-primary" data-planorder="' + id + ':' + cycle + ':' + pay + '">Đặt hàng · ' + money(pay) + '</button>'
    }));
  }

  document.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-plancycle]'))) {
      var cyc = el.getAttribute('data-plancycle');
      CYCLE = cyc;
      if (global.APP && global.APP.vz && location.hash.indexOf('/settings/billing') > -1) { global.APP.vz().v.cycle = cyc; global.APP.refresh(); }
      else if (global.APP) global.APP.render();
      return;
    }
    if ((el = e.target.closest('[data-planbuy]'))) { var a = el.getAttribute('data-planbuy').split(':'); buyModal(a[0], a[1]); return; }
    if ((el = e.target.closest('[data-planpay]'))) {
      var q = el.getAttribute('data-planpay').split(':');
      payModal(q[0], q[1], Number(q[2]));
      return;
    }
    if ((el = e.target.closest('[data-paymethod]'))) {
      [].forEach.call(document.querySelectorAll('[data-paymethod]'), function (b) { b.classList.toggle('on', b === el); });
      return;
    }
    if ((el = e.target.closest('[data-planorder]'))) {
      /* tạo đơn chờ thanh toán; gói chỉ đổi khi thanh toán được xác nhận (cổng thanh toán chưa tích hợp) */
      var o = el.getAttribute('data-planorder').split(':'), pp = byId(o[0]), bb = billing(), db = S.data;
      var d = new Date(), pad = function (n) { return n < 10 ? '0' + n : n; };
      if (bb.pending) {
        global.APP.closeModal();
        global.APP.toast('Đơn ' + bb.pending.invoice + ' vẫn đang chờ thanh toán. Gói được kích hoạt sau khi thanh toán được xác nhận.');
        return;
      }
      var inv = { id: 'INV-' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + '-' + ('00' + (db.invoices.length + 1)).slice(-3),
        d: S.fmtDate(d), p: pp.name + (o[1] === 'year' ? ' – theo năm' : ' – theo tháng'),
        a: money(Number(o[2])), vnd: Number(o[2]), st: 'Chờ thanh toán' };
      db.invoices.unshift(inv);
      bb.pending = { planId: pp.id, cycle: o[1], amount: Number(o[2]), invoice: inv.id };
      S.log('Tạo đơn nâng cấp ' + pp.name + ' · chờ thanh toán', 'Cài đặt'); S.save();
      global.APP.closeModal();
      global.APP.toast('Đã tạo đơn ' + inv.id + '. Gói được kích hoạt sau khi thanh toán được xác nhận.');
      global.APP.refresh(true);
      return;
    }
    if ((el = e.target.closest('[data-plancancel]'))) {
      var b2 = billing(), db2 = S.data;
      if (b2.pending) db2.invoices.forEach(function (iv) { if (iv.id === b2.pending.invoice) iv.st = 'Đã hủy'; });
      b2.pending = null; S.save(); global.APP.toast('Đã hủy đơn nâng cấp'); global.APP.refresh(true);
    }
  });

  /* ---------------------------------------------------------- cắt dữ liệu mới sinh theo gói của tài khoản
     dùng thử: 1 cửa hàng, chỉ tài khoản chính… để demo đúng giới hạn từng bản */
  S.setSeedHook(function (db) {
    if (!global.AUTH || !global.AUTH.user()) return;
    var p = byId(global.AUTH.plan()), keep = db.shops.slice(0, Math.max(1, p.shops)).map(function (s) { return s.id; });
    function inKeep(x) { return keep.indexOf(x.shopId) > -1; }
    db.shops = db.shops.filter(function (s) { return keep.indexOf(s.id) > -1; });
    Object.keys(db.products).forEach(function (k) { if (keep.indexOf(k) < 0) delete db.products[k]; });
    ['campaigns', 'samples', 'blacklist', 'autoInvites', 'autoMessages', 'tasks'].forEach(function (k) { if (db[k]) db[k] = db[k].filter(inKeep); });
    db.members = db.members.slice(0, 1 + p.subs);
    var b = db.settings.billing;
    b.planId = p.id; b.plan = p.name; b.cycleId = 'month';
    /* chưa liên kết gian hàng: chỉ có 1 gian hàng chờ ủy quyền, chưa đồng bộ dữ liệu gì */
    if (!global.AUTH.linked()) {
      var sh = db.shops[0];
      sh.name = 'Chưa liên kết cửa hàng'; sh.status = 'err'; sh.expires = 'Chưa ủy quyền'; sh.sync = 'Chưa đồng bộ'; sh.used = 0;
      db.products[sh.id] = [];
      ['campaigns', 'samples', 'blacklist', 'autoInvites', 'autoMessages', 'tasks', 'aiReports', 'audit', 'invoices'].forEach(function (k) { if (db[k]) db[k] = []; });
      db.creators.forEach(function (c) { c.rel = {}; });
      b.renew = '—'; b.method = 'Chưa có phương thức thanh toán';
    }
    /* đã dùng hôm nay: lời mời theo chiến dịch đang chạy, tin nhắn khoảng 1/3; tổng không quá ~45% hạn mức gói */
    var tot = db.shops.reduce(function (x, sh2) { return x + (sh2.used || 0); }, 0);
    var capT = p.invites === INF ? INF : Math.round(p.invites * 0.45);
    db.shops.forEach(function (sh2) {
      if (capT !== INF && tot > capT) sh2.used = Math.round((sh2.used || 0) * capT / tot);
      sh2.msgUsed = Math.round((sh2.used || 0) * 0.32);
    });
    /* lịch sử hóa đơn sinh theo đúng gói đang dùng (gói trả phí: 3 kỳ gần nhất) */
    b.pending = null;
    if (p.price) {
      b.renew = S.fmtDate(firstOf(1)); b.method = 'Chuyển khoản – Vietcombank';
      db.invoices = [0, -1, -2].map(function (off, k) {
        var d = firstOf(off), mm = ('0' + (d.getMonth() + 1)).slice(-2);
        return { id: 'INV-' + String(d.getFullYear()).slice(2) + mm + '-0' + (12 + k), d: S.fmtDate(d), p: p.name + ' – theo tháng', a: money(p.price), vnd: p.price, st: 'Đã thanh toán' };
      });
    }
    /* đã liên kết nhưng chưa có gói: dữ liệu TikTok đã đồng bộ, chưa có gì do GOPUSH tạo */
    if (p.id === 'none' && global.AUTH.linked()) {
      ['campaigns', 'tasks', 'autoInvites', 'autoMessages', 'aiReports', 'invoices'].forEach(function (k) { if (db[k]) db[k] = []; });
      db.shops.forEach(function (s) { s.used = 0; });
      b.renew = '—'; b.method = 'Chưa có phương thức thanh toán';
    }
    if (p.id === 'trial') {
      b.renew = trialEnd(); b.method = 'Chưa có phương thức thanh toán'; db.invoices = [];
      /* tác vụ song song không vượt giới hạn: chỉ giữ 2 chiến dịch đang chạy */
      var run = 0;
      db.campaigns.forEach(function (c) { if (c.status === 'Đang chạy' && ++run > p.tasks) c.status = 'Tạm dừng'; });
    }
  });

  /* ---------------------------------------------------------- popup "Rất tiếc, tài khoản không đủ quyền"
     nền tối, nút × ở góc, bấm ra ngoài hoặc Esc để đóng; bấm vào popup mở Gói & thanh toán */
  function deny(reason) {
    closeDeny(true);
    var el = document.createElement('div');
    el.className = 'ig-deny'; el.id = 'deny'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Tài khoản không đủ quyền');
    /* chỉ có banner + đốm sáng phía sau + nút ×; lý do đưa vào aria-label cho trình đọc màn hình */
    el.innerHTML = '<div class="ig-deny-box"><span class="glow" aria-hidden="true"></span>' +
      '<button class="x" data-deny="close" aria-label="Đóng">' + ic('x') + '</button>' +
      '<a class="card" data-deny="go" href="#/settings/billing" title="Xem gói đang sử dụng">' +
        '<img src="' + U.img('popup-upgrade.webp') + '" alt="Rất tiếc, tài khoản không đủ quyền. Nâng cấp ngay để dùng đầy đủ tính năng."></a>' +
    '</div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    var x = el.querySelector('.x'); if (x) x.focus();
  }
  /* popup chữ, không mời nâng cấp: trang chỉ dành cho admin, hoặc đã ở gói cao nhất mà vẫn chạm giới hạn */
  function notice(title, text, icon) {
    closeDeny(true);
    var el = document.createElement('div');
    el.className = 'ig-deny'; el.id = 'deny'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', title);
    el.innerHTML = '<div class="ig-deny-box is-text"><div class="note">' +
      '<button class="x" data-deny="close" aria-label="Đóng">' + ic('x') + '</button>' +
      '<span class="ic">' + ic(icon || 'lock') + '</span><h2>' + U.esc(title) + '</h2><p>' + text + '</p>' +
      '<div class="foot"><a class="gm-btn gm-btn-sm" href="mailto:contact@gopush.asia">Liên hệ hỗ trợ</a>' +
        '<button class="gm-btn gm-btn-sm gm-btn-primary" data-deny="close">Đã hiểu</button></div></div></div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    var b = el.querySelector('.gm-btn-primary'); if (b) b.focus();
  }
  function closeDeny(now) {
    var el = document.getElementById('deny'); if (!el) return;
    if (now) { el.remove(); return; }
    el.classList.remove('is-in'); setTimeout(function () { el.remove(); }, 180);
  }
  document.addEventListener('click', function (e) {
    var box = document.getElementById('deny'); if (!box) return;
    var t = e.target.closest && e.target.closest('[data-deny]');
    if (t && t.getAttribute('data-deny') === 'go') { closeDeny(true); return; }      /* để thẻ a tự mở #/settings/billing */
    if (t || !(e.target.closest && e.target.closest('.ig-deny-box .card, .ig-deny-box .note'))) { e.preventDefault(); closeDeny(); }
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDeny(); });

  /* lý do theo từng trường hợp */
  function denyLimit(kind, sid) {
    var r = check(kind, sid), p = current();
    /* hết giới hạn riêng của shop (cài đặt an toàn) chứ không phải hạn mức gói: chỉ báo, không mời nâng gói */
    if (kind === 'invites' && r.ok && global.APP) { global.APP.toast('Shop đã chạm giới hạn gửi mỗi ngày trong Cài đặt shop'); return; }
    var msg = '<b>' + U.esc(p.name) + '</b> cho phép tối đa <b>' + fmt(r.limit) + ' ' + r.label + '</b>, hôm nay đã dùng ' + S.num(r.used) + '.';
    /* gói cao nhất: không còn gói nào để nâng, chỉ báo giới hạn */
    if (p.id === PLANS[PLANS.length - 1].id) return notice('Đã chạm giới hạn của gói', msg + ' Liên hệ GOPUSH nếu cần nâng giới hạn riêng cho tài khoản.', 'alert');
    deny(msg);
  }
  function denyFeature(key) {
    var f = FEATURES.filter(function (x) { return x[2] === key; })[0], from = f ? PLANS[f[1].indexOf(1, 1)] : null;
    deny('<b>' + U.esc(featureName(key)) + '</b> không có trong <b>' + U.esc(current().name) + '</b>' +
      (from ? '. Có từ <b>' + U.esc(from.name) + '</b>.' : '.'));
  }

  global.PLANS = { list: PLANS, current: current, check: check, has: has, acct: acct, room: room, take: take, runningShops: runningShops, isNone: isNone, allowPage: allowPage, denyNone: denyNone, deny: deny, notice: notice, denyLimit: denyLimit, denyFeature: denyFeature, yearly: yearly, nice: nice, cards: cards, cycleSwitch: cycleSwitch };
})(window);
