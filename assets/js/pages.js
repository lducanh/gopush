/* GOPUSH — nội dung mọi màn hình. Mỗi hàm nhận ctx và trả về HTML.
   ctx = { shop, lang, head(actions), v } — v là trạng thái xem của trang
   (tab đang mở, từ khóa, bộ lọc, sắp xếp, trang, dòng đang chọn). */
(function (global) {
  'use strict';

  var U = global.UI, D = global.DATA, CH = global.CHART, ic = global.icon, S = global.DB, TT = global.TT;

  function ctype(c) { return c.contentLabel === 2 ? 'LIVE' : 'Video'; }
  function audience(c) {
    var ages = c.ageGroups.map(function (a) { return TT.optLabel('ageGroups', a); }).join(', ');
    return TT.optLabel('gender', c.gender) + ' ' + S.pct(c.genderPct / 100) + ' · ' + ages + ' · ' + c.region;
  }
  var P = {};
  var SIZE = 10;

  var SOFT = [
    ['var(--soft-sky)', 'var(--soft-sky-ink)'], ['var(--soft-sage)', 'var(--soft-sage-ink)'],
    ['var(--soft-sand)', 'var(--soft-sand-ink)'], ['var(--soft-lilac)', 'var(--soft-lilac-ink)'],
    ['var(--soft-blush)', 'var(--soft-blush-ink)'], ['var(--soft-mist)', 'var(--soft-mist-ink)']
  ];
  /* sparkline: màu đen chủ đạo cho mọi thẻ, theo GoMax Console */
  var TONE_LINE = ['var(--accent)'];
  /* thang đen nhạt dần, dùng cho bảng xếp hạng */
  function rankColor(i) {
    return i === 0 ? 'var(--chart-1)' : (i < 3 ? 'var(--chart-1-mid)' : 'var(--chart-1-soft)');
  }
  function chip(tone, name) {
    return '<span class="ic" style="background:' + SOFT[tone][0] + ';color:' + SOFT[tone][1] + '">' + ic(name) + '</span>';
  }

  /* --------------------------------------------------------- tiện ích lọc */
  function hit(q, parts) {
    if (!q) return true;
    var s = parts.join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (w) { return s.indexOf(w) > -1; });
  }
  function sortBy(rows, key, dir) {
    if (!key) return rows;
    return rows.slice().sort(function (a, b) {
      var x = a[key], y = b[key];
      if (typeof x === 'string') return dir * String(x).localeCompare(String(y), 'vi');
      return dir * ((x || 0) - (y || 0));
    });
  }
  function page(rows, v) {
    var pages = Math.max(1, Math.ceil(rows.length / SIZE));
    if (v.page > pages) v.page = pages;
    return rows.slice((v.page - 1) * SIZE, v.page * SIZE);
  }
  function selCount(v) { return Object.keys(v.sel).filter(function (k) { return v.sel[k]; }).length; }
  function chips(v, labels) {
    return Object.keys(v.f).filter(function (k) { return v.f[k] && v.f[k] !== 'all'; })
      .map(function (k) { return { k: k, l: (labels[k] || k) + ': ' + v.f[k] }; });
  }
  function fv(v, k) { return v.f[k] && v.f[k] !== 'all' ? v.f[k] : null; }

  var FOLLOWER_OPTS = ['all', 'Dưới 50K', '50K – 100K', '100K – 300K', 'Trên 300K'];
  function folBand(n) {
    if (n < 50000) return 'Dưới 50K';
    if (n < 100000) return '50K – 100K';
    if (n < 300000) return '100K – 300K';
    return 'Trên 300K';
  }
  var GMV_OPTS = ['all', 'Trên 100tr', 'Trên 500tr', 'Trên 1 tỷ'];
  function gmvPass(g, band) {
    if (band === 'Trên 100tr') return g > 1e8;
    if (band === 'Trên 500tr') return g > 5e8;
    if (band === 'Trên 1 tỷ') return g > 1e9;
    return true;
  }

  function kpi(o) {
    return '<div class="ig-kpi">' +
      '<div class="top">' + chip(0, o.i) + U.esc(o.l) + '</div>' +
      '<div class="b"><span class="v">' + U.esc(o.v) + '</span>' + CH.spark(o.s, o.c || TONE_LINE[0]) + '</div>' +
      '<span class="d ' + (String(o.d).charAt(0) === '-' ? 'gm-delta-down' : 'gm-delta-up') + '">' + U.esc(o.d) +
      ' <span class="gm-muted">so với kỳ trước</span></span></div>';
  }

  function series(base, n) {
    var out = [], x = base * 0.72;
    for (var i = 0; i < (n || 7); i++) { x = x * (0.94 + ((i * 37) % 17) / 100); out.push(Math.round(x)); }
    out[out.length - 1] = base;
    return out;
  }

  /* ============================================================ 1. Tổng quan */
  P.home = function (c) {
    var db = S.data, sid = c.shop.id, st = S.stats(c.scope);
    var running = db.campaigns.filter(function (x) { return inScope(c.scope, x.shopId) && x.status === 'Đang chạy'; });
    var queue = P.inboxItems(c.scope).filter(function (x) { return !x.done; });
    /* liên kết tới trang theo shop giữ nguyên phạm vi đang xem */
    var sp = c.all ? 'all' : sid;
    /* lối tắt: một dòng mô tả, số liệu sống gắn vào nơi có */
    var tiles = [
      ['users', 'Tìm Creator', 'Lọc theo ngành, follower, GMV', '#/s/' + sp + '/creators/discover'],
      ['send', 'Lời mời hàng loạt', 'Tự chia 50 Creator mỗi đợt', '#/s/' + sp + '/campaigns/invites'],
      ['box', 'Duyệt hàng mẫu', st.pending + ' yêu cầu đang chờ', '#/s/' + sp + '/samples'],
      ['truck', 'Theo dõi vận đơn', st.lateNoVideo + ' đơn quá hạn chưa đăng', '#/s/' + sp + '/samples/shipments'],
      ['msgSend', 'Nhắn tin hàng loạt', 'Theo mẫu, giãn cách an toàn', '#/s/' + sp + '/campaigns/messages'],
      ['sliders', 'Điều chỉnh kế hoạch', 'Dọn, bù, gia hạn lời mời', '#/s/' + sp + '/campaigns/tasks'],
      ['template', 'Thư viện mẫu', db.templates.length + ' mẫu lời mời và tin nhắn', '#/templates'],
      ['store', 'Ủy quyền shop mới', 'Qua OAuth chính thức', '#/shops']
    ].map(function (t) {
      return '<a class="ig-tile" href="' + t[3] + '">' +
        '<span class="ic">' + ic(t[0]) + '</span>' +
        '<span class="t"><b>' + U.esc(t[1]) + '</b><span class="tx">' + U.esc(t[2]) + '</span></span>' +
        '<span class="go">' + ic('right') + '</span></a>';
    }).join('');

    return c.head(
      U.btn('Tìm Creator', { icon: 'users', act: 'go:/s/' + sp + '/creators/discover' }) +
      U.btn('Tạo lời mời hàng loạt', { variant: 'primary', icon: 'send', act: 'campaign:new:invite' })
    ) +
    '<div class="ig-section">' +
      '<div class="ig-sec-head"><h2>Nhịp 7 ngày qua</h2><a class="gm-link" href="#/dashboard">Xem Dashboard đầy đủ</a></div>' +
      '<div class="ig-kpis ig-kpis-4">' +
        kpi({ i: 'trend', l: 'GMV liên kết (₫)', v: S.money(st.gmv), d: '+18,2%', s: series(st.gmv) }) +
        kpi({ i: 'box', l: 'Đơn liên kết', v: S.num(st.orders), d: '+12,4%', s: series(st.orders) }) +
        kpi({ i: 'send', l: 'Lời mời đã gửi', v: S.num(st.invited), d: '+240', s: series(st.invited) }) +
        kpi({ i: 'video', l: 'Video / live', v: S.num(st.videos), d: '+64', s: series(st.videos) }) +
      '</div>' +

      '<div class="ig-dash ig-dash-2">' +
        U.card({
          title: 'Việc cần xử lý',
          actions: '<a class="gm-link" href="#/inbox">Xem tất cả ' + queue.length + ' việc</a>',
          body: queue.length ? '<ul class="ig-todo">' + queue.slice(0, 5).map(function (r) {
            return '<li>' + chip(r.sev, r.icon) + '<span class="txt">' + U.esc(r.title) + '<small>' +
              (c.all ? U.esc(r.shopName) + ' · ' : '') + U.esc(r.sub) + '</small></span>' +
              U.btn(r.cta, { sm: true, variant: r.sev === 4 ? 'soft' : undefined, act: 'go:' + r.go }) + '</li>';
          }).join('') + '</ul>' : U.empty('Không còn việc tồn', 'Mọi yêu cầu và vận đơn đều đã được xử lý.')
        }) +
        U.card({
          title: 'Chiến dịch đang chạy',
          actions: '<a class="gm-link" href="#/s/' + sid + '/campaigns/invites">Xem tất cả</a>',
          body: running.length ? '<ul class="ig-runs">' + running.map(function (r) {
            var p = r.total ? Math.round(r.sent / r.total * 100) : 0;
            return '<li><div class="r1">' + ic(r.kind === 'message' ? 'msgSend' : 'send') +
              '<a class="n gm-link" href="#/s/' + r.shopId + '/campaigns/c/' + r.id + '">' + U.esc(r.name) + '</a>' +
              (c.all ? '<span class="gm-help">' + U.esc(S.shop(r.shopId).name) + '</span>' : '') + '<b class="gm-num">' + p + '%</b></div>' +
              '<div class="bar"><i style="width:' + p + '%"></i></div>' +
              '<div class="r2"><span class="gm-num">' + r.sent + ' / ' + r.total + ' đã gửi</span>' +
              '<span>' + (r.kind === 'invite' && r.sent ? 'Chấp nhận ' + Math.round(r.accepted / r.sent * 100) + '%' : 'Bắt đầu ' + r.at) +
              '</span></div></li>';
          }).join('') + '</ul>' : U.empty('Chưa có chiến dịch nào chạy', 'Tạo lời mời hàng loạt để bắt đầu.',
            U.btn('Tạo lời mời', { sm: true, variant: 'primary', act: 'campaign:new:invite' }))
        }) +
      '</div>' +

      '<h2>Thao tác nhanh</h2><div class="ig-tiles">' + tiles + '</div>' +

      '<div class="ig-sec-head"><h2>Mở gần đây</h2></div><div class="ig-chips">' + [
        ['users', 'Kho Creator', '#/s/' + sp + '/creators/library'],
        ['send', 'Lời mời hàng loạt', '#/s/' + sp + '/campaigns/invites'],
        ['box', 'Yêu cầu hàng mẫu', '#/s/' + sp + '/samples'],
        ['chart', 'Báo cáo theo chiến dịch', '#/reports/campaigns'],
        ['store', 'Chi tiết shop', '#/shops/' + sid],
        ['history', 'Nhật ký hoạt động', '#/team/audit']
      ].map(function (r) { return '<a href="' + r[2] + '">' + ic(r[0]) + U.esc(r[1]) + '</a>'; }).join('') + '</div>' +

      '<a class="ig-banner" href="#/s/' + sid + '/creators/discover">' +
        '<img src="' + U.img('banner.png') + '" alt="Kết nối Creator TikTok Shop"></a>' +
    '</div>';
  };

  /* --- Dashboard --- */
  P.dashboard = function (c) {
    var db = S.data;
    var scope = c.scope;   /* phạm vi lấy từ bộ chọn shop trên topbar */
    var st = S.stats(scope);
    var mult = { '7 ngày qua': 0.28, '30 ngày qua': 1, '90 ngày qua': 2.7 }[c.v.f.period || '30 ngày qua'] || 1;
    var gmv = Math.round(st.gmv * mult), orders = Math.round(st.orders * mult), com = Math.round(st.com * mult);

    /* cơ cấu theo ngành hàng từ Creator đang hợp tác */
    var byCat = {};
    db.creators.forEach(function (cr) {
      var ok = scope === 'all' ? Object.keys(cr.rel).some(function (k) { return cr.rel[k].state === 'Đang hợp tác'; })
        : cr.rel[scope] && cr.rel[scope].state === 'Đang hợp tác';
      if (ok) byCat[cr.cat] = (byCat[cr.cat] || 0) + cr.gmv30;
    });
    var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; }).slice(0, 5);
    var catData = cats.map(function (k, i) {
      return { l: k, v: byCat[k], c: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'][i] };
    });

    var top = db.creators.filter(function (cr) {
      return scope === 'all' ? Object.keys(cr.rel).some(function (k) { return cr.rel[k].state === 'Đang hợp tác'; })
        : cr.rel[scope] && cr.rel[scope].state === 'Đang hợp tác';
    }).sort(function (a, b) { return b.gmv30 - a.gmv30; }).slice(0, 6);

    var shopRows = db.shops.filter(function (s) { return s.status !== 'err'; }).map(function (s) {
      var ss = S.stats(s.id);
      return { id: s.id, s: s.flag + ' ' + s.name, gmv: S.money(ss.gmv), ord: S.num(ss.orders),
        com: S.money(ss.com), vid: S.num(ss.videos), cre: S.num(ss.working) };
    });

    return c.head(
      U.sel('30 ngày qua', 'period', c.v.f.period, ['7 ngày qua', '30 ngày qua', '90 ngày qua']) +
      U.btn('Xuất Excel', { icon: 'download', act: 'export:dashboard' })
    ) +
    '<div class="ig-section">' +
      '<div class="ig-kpis ig-kpis-6">' +
        kpi({ i: 'trend', t: 0, l: 'GMV liên kết (₫)', v: S.money(gmv), d: '+18,2%', s: series(gmv) }) +
        kpi({ i: 'box', t: 1, l: 'Đơn liên kết', v: S.num(orders), d: '+12,4%', s: series(orders) }) +
        kpi({ i: 'wallet', t: 2, l: 'Hoa hồng (₫)', v: S.money(com), d: '+9,8%', s: series(com) }) +
        kpi({ i: 'send', t: 3, l: 'Creator đã mời', v: S.num(st.invited), d: '+240', s: series(st.invited) }) +
        kpi({ i: 'check', t: 4, l: 'Tỉ lệ chấp nhận', v: S.pct(st.acceptRate), d: '-1,6%', s: series(Math.round(st.acceptRate)) }) +
        kpi({ i: 'video', t: 5, l: 'Video / live', v: S.num(st.videos), d: '+64', s: series(st.videos) }) +
      '</div>' +

      '<div class="ig-dash ig-dash-2">' +
        U.card({
          title: 'Doanh thu liên kết',
          actions: '<div class="gm-seg">' + ['Ngày', 'Tuần', 'Tháng'].map(function (x, i) {
            return '<button class="' + ((c.v.f.grain || 'Ngày') === x ? 'on' : '') + '" data-do="f:grain:' + x + '">' + x + '</button>';
          }).join('') + '</div>',
          body: CH.line({
            alt: 'GMV và hoa hồng theo thời gian', h: 300,
            labels: (c.v.f.grain === 'Tháng') ? ['T4', 'T5', 'T6', 'T7', 'T8', 'T9']
              : (c.v.f.grain === 'Tuần') ? ['T33', 'T34', 'T35', 'T36', 'T37', 'T38']
              : ['18/9', '19/9', '20/9', '21/9', '22/9', '23/9', '24/9'],
            series: [
              { name: 'GMV (triệu ₫)', values: series(Math.round(gmv / 1e6 / 7), c.v.f.grain && c.v.f.grain !== 'Ngày' ? 6 : 7), color: 'var(--chart-1)' },
              { name: 'Hoa hồng (triệu ₫)', values: series(Math.round(com / 1e6 / 7), c.v.f.grain && c.v.f.grain !== 'Ngày' ? 6 : 7), color: 'var(--chart-2)', fill: false }
            ]
          })
        }) +
        U.card({
          title: 'Cơ cấu GMV theo ngành hàng',
          body: catData.length ? CH.donut({ alt: 'Tỉ trọng GMV theo ngành hàng', value: S.money(gmv), label: 'GMV kỳ này', data: catData })
            : U.empty('Chưa có Creator đang hợp tác', 'Mời Creator để bắt đầu ghi nhận GMV.')
        }) +
      '</div>' +

      '<div class="ig-dash ig-dash-3">' +
        U.card({
          title: 'Phễu hợp tác',
          actions: '<span class="gm-help">' + S.num(st.invited) + ' Creator đã mời</span>',
          body: U.funnel((function () {
            /* mỗi bước không thể lớn hơn bước trước nó */
            var req = Math.min(st.samples, st.accepted);
            var got = Math.min(st.received, req);
            var vid = Math.min(st.videos, got);
            return [
              { l: 'Đã mời', v: st.invited }, { l: 'Chấp nhận', v: st.accepted }, { l: 'Xin mẫu', v: req },
              { l: 'Nhận mẫu', v: got }, { l: 'Lên video/live', v: vid },
              { l: 'Có đơn', v: Math.round(vid * 0.79) }
            ];
          })())
        }) +
        U.card({
          title: 'Video và live theo tuần',
          body: CH.bars({
            alt: 'Số video và live theo tuần', labels: ['T33', 'T34', 'T35', 'T36', 'T37', 'T38'],
            values: series(st.videos, 6), name: 'Video', color: 'var(--chart-1)',
            values2: series(Math.round(st.videos * 0.3), 6), name2: 'Live', color2: 'var(--chart-4)',
            w: 380, h: 172
          })
        }) +
        U.card({
          title: 'Top Creator theo GMV',
          actions: U.btn('Xem tất cả', { sm: true, variant: 'ghost', act: 'go:/s/' + c.shop.id + '/creators/library' }),
          body: top.length ? CH.hbars(top.map(function (r, i) {
            return { l: r.name, v: r.gmv30, d: S.money(r.gmv30), c: rankColor(i) };
          })) : U.empty('Chưa có dữ liệu')
        }) +
      '</div>' +

      '<div class="ig-dash ig-dash-21">' +
        U.card({
          title: 'Hiệu suất theo cửa hàng',
          actions: U.btn('Xuất Excel', { sm: true, variant: 'ghost', icon: 'download', act: 'export:shops' }),
          cls: 'gm-card-tablewrap',
          body: U.table({
            cols: [{ k: 's', t: 'Cửa hàng' }, { k: 'gmv', t: 'GMV', cls: 'num' }, { k: 'ord', t: 'Đơn', cls: 'num' },
              { k: 'com', t: 'Hoa hồng', cls: 'num' }, { k: 'vid', t: 'Video/live', cls: 'num' },
              { k: 'cre', t: 'Creator hoạt động', cls: 'num' }],
            rows: shopRows
          })
        }) +
        U.card({
          title: 'Sức khỏe hệ thống',
          body: '<div class="ig-dash" style="grid-template-columns:1fr 1fr">' +
            CH.ring({ pct: Math.min(100, Math.round(S.quota(c.shop.id).used / (S.quota(c.shop.id).cap || 1) * 100)),
              label: 'Hạn mức lời mời hôm nay',
              sub: S.num(S.quota(c.shop.id).used) + '/' + S.num(S.quota(c.shop.id).cap), color: 'var(--chart-1)' }) +
            CH.ring({ pct: Math.round(db.shops.filter(function (s) { return s.status === 'ok'; }).length / db.shops.length * 100),
              label: 'Shop còn hạn ủy quyền',
              sub: db.shops.filter(function (s) { return s.status === 'ok'; }).length + '/' + db.shops.length,
              color: 'var(--chart-4)' }) +
            '</div><div style="height:12px"></div>' +
            U.rows([['Đồng bộ gần nhất', c.shop.sync],
              ['Trần TikTok cấp', S.num(S.quota(c.shop.id).hard) + ' lời mời/ngày'],
              ['Quy tắc tự động bật', db.autoInvites.filter(function (r) { return r.on; }).length + ' / ' + db.autoInvites.length],
              ['Yêu cầu mẫu chờ duyệt', String(st.pending)]])
        }) +
      '</div>' +
    '</div>';
  };

  /* ============================================================ 2. Creator */
  function creatorRows(c, opts) {
    var db = S.data, sid = c.shop.id, v = c.v;
    var rows = db.creators.filter(function (cr) {
      var r = S.rel(cr, sid);
      if (opts.savedOnly && !r.saved) return false;
      if (opts.excludeBlack !== false && S.isBlacklisted(cr.id, sid)) return false;
      if (!hit(v.q, [cr.name, cr.user, cr.cat])) return false;
      if (fv(v, 'cat') && cr.cat !== v.f.cat) return false;
      if (fv(v, 'country') && cr.country !== v.f.country) return false;
      if (fv(v, 'fol') && folBand(cr.followers) !== v.f.fol) return false;
      if (fv(v, 'type') && ctype(cr) !== v.f.type) return false;
      if (fv(v, 'rel') && r.state !== v.f.rel) return false;
      if (fv(v, 'gmv') && !gmvPass(cr.gmv30, v.f.gmv)) return false;
      if (fv(v, 'contact') && (v.f.contact === 'Có liên hệ') !== !!cr.contact) return false;
      if (fv(v, 'tag')) {
        var t = db.tags.filter(function (x) { return x.name === v.f.tag; })[0];
        if (!t || r.tags.indexOf(t.id) < 0) return false;
      }
      if (fv(v, 'owner') && r.owner !== v.f.owner) return false;
      if (opts.state && r.state !== opts.state) return false;
      return true;
    });
    return rows;
  }

  function creatorFilterQuick(c) {
    var v = c.v;
    return U.sel('Ngành hàng', 'cat', v.f.cat, ['all'].concat(['Đồ uống', 'Ẩm thực', 'Gia dụng', 'Làm đẹp', 'Thời trang', 'Công nghệ', 'Mẹ và bé', 'Sức khỏe'])) +
      U.sel('Follower', 'fol', v.f.fol, FOLLOWER_OPTS) +
      U.sel('Quan hệ', 'rel', v.f.rel, ['all', 'Mới', 'Đã mời', 'Đã chấp nhận', 'Đang hợp tác', 'Ngừng']);
  }

  /* vài điều kiện hay dùng, bật một chạm */
  function quickChips(v, items) {
    return '<div class="ig-quick"><span class="lb">Hay dùng</span>' + items.map(function (it) {
      var on = v.f[it[1]] === it[2];
      return '<button class="ig-qchip' + (on ? ' on' : '') + '" data-do="fq:' + U.attr(it[1]) + ':' + U.attr(it[2]) + '">' +
        (on ? ic('check') : '') + U.esc(it[0]) + '</button>';
    }).join('') + '</div>';
  }

  var FLABEL = { cat: 'Ngành hàng', fol: 'Follower', rel: 'Quan hệ', country: 'Quốc gia', type: 'Nội dung',
    gmv: 'GMV 30 ngày', contact: 'Liên hệ', tag: 'Nhãn', owner: 'Phụ trách', status: 'Trạng thái',
    kind: 'Loại', carrier: 'Vận chuyển', period: 'Kỳ', shop: 'Cửa hàng', grain: 'Mức', role: 'Vai trò',
    who: 'Người thực hiện', late: 'Giao xong' };

  P.discover = function (c) {
    var v = c.v, sid = c.shop.id;
    var all = creatorRows(c, {});
    var rows = sortBy(all, v.sort || 'gmv30', v.dir || -1);
    var shown = page(rows, v);
    var n = selCount(v);

    return c.head(
      U.btn('Xuất Excel', { icon: 'download', act: 'export:creators' }) +
      U.btn('Lưu bộ lọc', { icon: 'bookmark', act: 'filters:save' }) +
      U.btn('Tạo lời mời từ kết quả', { variant: 'primary', icon: 'send', act: 'campaign:new:invite' })
    ) +
    U.tabs([{ t: 'Kết quả', n: S.num(all.length) }, { t: 'Bộ lọc đã lưu', n: String((v.saved || []).length) }], v.tab) +
    (v.tab === 1 ? savedFilters(c) :
    quickChips(v, [['Chưa mời', 'rel', 'Mới'], ['GMV trên 500tr', 'gmv', 'Trên 500tr'],
      ['Có liên hệ', 'contact', 'Có liên hệ'], ['Chuyên LIVE', 'type', 'LIVE']]) +
    U.filters({
      ph: 'Tên hoặc @username', q: v.q,
      quick: creatorFilterQuick(c),
      count: Object.keys(v.f).filter(function (k) { return v.f[k] && v.f[k] !== 'all'; }).length,
      chips: chips(v, FLABEL),
      right: '<span class="ig-fmeta"><b class="gm-num">' + S.num(all.length) + '</b> Creator</span>' +
        U.btn('Đồng bộ', { sm: true, variant: 'ghost', icon: 'refresh', act: 'sync:creators' }),
      groups: [
        { l: 'Cơ bản', f: U.sel('Quốc gia', 'country', v.f.country, ['all', 'Việt Nam', 'Thái Lan', 'Malaysia']) +
          U.sel('Loại nội dung', 'type', v.f.type, ['all', 'Video', 'LIVE']) +
          U.sel('Thông tin liên hệ', 'contact', v.f.contact, ['all', 'Có liên hệ', 'Chưa có liên hệ']) },
        { l: 'Hiệu suất bán', f: U.sel('GMV 30 ngày', 'gmv', v.f.gmv, GMV_OPTS) },
        { l: 'Quan hệ với shop', f: U.sel('Nhãn', 'tag', v.f.tag, ['all'].concat(S.data.tags.map(function (t) { return t.name; }))) +
          U.sel('Người phụ trách', 'owner', v.f.owner, ['all', 'user01', 'Lê Quốc Huy', 'Ngô Thảo Vy']) }
      ]
    }) +
    U.selbar(n,
      U.btn('Lưu vào Kho', { sm: true, variant: 'ghost', icon: 'bookmark', act: 'bulk:save' }) +
      U.btn('Gắn nhãn', { sm: true, variant: 'ghost', icon: 'tag', act: 'bulk:tag' }) +
      U.btn('Tạo lời mời', { sm: true, variant: 'ghost', icon: 'send', act: 'bulk:invite' }) +
      U.btn('Blacklist', { sm: true, variant: 'ghost', icon: 'ban', act: 'bulk:black' })) +
    U.table({
      check: true, sel: v.sel, sort: v.sort || 'gmv30', dir: v.dir || -1,
      cols: [
        { k: 'name', t: 'Creator', s: 'name', r: function (r) { return U.creatorCell(r); } },
        { k: 'cat', t: 'Ngành hàng', s: 'cat' },
        { k: 'followers', t: 'Follower', cls: 'num', s: 'followers', r: function (r) { return S.money(r.followers); } },
        { k: 'gmv30', t: 'GMV 30 ngày', cls: 'num', s: 'gmv30', r: function (r) { return S.money(r.gmv30); } },
        { k: 'postRate', t: 'Tỉ lệ đăng', cls: 'num', s: 'postRate', r: function (r) { return r.postRate + '%'; } },
        { k: '', t: 'Nội dung', r: function (r) { return ctype(r); } },
        { k: '', t: 'Quan hệ', r: function (r) { return U.tag(S.rel(r, sid).state); } },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          var rl = S.rel(r, sid);
          return (rl.state === 'Mới'
            ? U.btn('Mời', { sm: true, variant: 'soft', icon: 'send', act: 'invite:' + r.id })
            : U.btn('Hồ sơ', { sm: true, act: 'creator:' + r.id })) + ' ' +
            U.iconBtn(rl.saved ? 'check' : 'bookmark', rl.saved ? 'Đã lưu vào Kho' : 'Lưu vào Kho', 'save:' + r.id); } }
      ],
      rows: shown
    }) +
    U.askBar('Hỏi GOPUSH AI về ' + S.num(all.length) + ' Creator đang lọc…') +
    U.pager({ page: v.page, size: SIZE, total: all.length }));
  };

  function savedFilters(c) {
    var list = c.v.saved || [];
    return '<div class="ig-section">' + (list.length
      ? '<ul class="ig-todo">' + list.map(function (f, i) {
          return '<li>' + ic('bookmark') + '<span class="txt">' + U.esc(f.name) + '<small>' + U.esc(f.desc) + '</small></span>' +
            U.btn('Áp dụng', { sm: true, act: 'filters:apply:' + i }) +
            U.iconBtn('trash', 'Xóa', 'filters:del:' + i) + '</li>';
        }).join('') + '</ul>'
      : U.empty('Chưa lưu bộ lọc nào', 'Chọn điều kiện ở tab Kết quả rồi bấm “Lưu bộ lọc”.')) + '</div>';
  }

  P.library = function (c) {
    var v = c.v, sid = c.shop.id, db = S.data;
    var states = ['', 'Mới', 'Đã mời', 'Đã chấp nhận', 'Đang hợp tác', 'Ngừng'];
    var base = creatorRows(c, { savedOnly: true });
    var counts = states.map(function (st) {
      return st ? base.filter(function (cr) { return S.rel(cr, sid).state === st; }).length : base.length;
    });
    var rows = v.tab ? base.filter(function (cr) { return S.rel(cr, sid).state === states[v.tab]; }) : base;
    rows = sortBy(rows, v.sort || 'gmv30', v.dir || -1);
    var shown = page(rows, v);
    var n = selCount(v);
    var mode = v.view || db.settings.libraryView || 'table';
    var toggle = '<div class="gm-seg">' +
      '<button class="' + (mode === 'table' ? 'on' : '') + '" data-do="view:table">' + ic('list') + 'Bảng</button>' +
      '<button class="' + (mode === 'kanban' ? 'on' : '') + '" data-do="view:kanban">' + ic('columns') + 'Pipeline</button></div>';

    return c.head(
      U.btn('Nhập Excel', { icon: 'upload', act: 'import:creators' }) +
      U.btn('Xuất Excel', { icon: 'download', act: 'export:creators' }) +
      U.btn('Thêm Creator', { variant: 'primary', icon: 'plus', act: 'creator:add' })
    ) +
    U.tabs(['Tất cả', 'Mới', 'Đã mời', 'Đã chấp nhận', 'Đang hợp tác', 'Ngừng'].map(function (t, i) {
      return { t: t, n: S.num(counts[i]) };
    }), v.tab) +
    U.filters({
      ph: 'Tìm trong kho Creator', q: v.q,
      quick: U.sel('Nhãn', 'tag', v.f.tag, ['all'].concat(db.tags.map(function (t) { return t.name; }))) +
        U.sel('Người phụ trách', 'owner', v.f.owner, ['all', 'user01', 'Lê Quốc Huy', 'Ngô Thảo Vy']) +
        U.sel('Ngành hàng', 'cat', v.f.cat, ['all'].concat(['Đồ uống', 'Ẩm thực', 'Gia dụng', 'Làm đẹp', 'Thời trang', 'Công nghệ', 'Mẹ và bé', 'Sức khỏe'])),
      chips: chips(v, FLABEL),
      right: '<span class="ig-fmeta"><b class="gm-num">' + S.num((mode === 'kanban' ? base : rows).length) + '</b> Creator</span>' + toggle
    }) +
    (mode === 'kanban' ? pipeline(base, sid) :
    U.selbar(n,
      U.btn('Gắn nhãn', { sm: true, variant: 'ghost', icon: 'tag', act: 'bulk:tag' }) +
      U.btn('Nhắn tin', { sm: true, variant: 'ghost', icon: 'msgSend', act: 'bulk:message' }) +
      U.btn('Bỏ khỏi Kho', { sm: true, variant: 'ghost', icon: 'trash', act: 'bulk:unsave' }) +
      U.btn('Blacklist', { sm: true, variant: 'ghost', icon: 'ban', act: 'bulk:black' })) +
    U.table({
      check: true, sel: v.sel, sort: v.sort || 'gmv30', dir: v.dir || -1,
      cols: [
        { k: 'name', t: 'Creator', s: 'name', r: function (r) { return U.creatorCell(r); } },
        { k: '', t: 'Trạng thái quan hệ', r: function (r) { return U.tag(S.rel(r, sid).state); } },
        { k: '', t: 'Nhãn', r: function (r) {
          var t = S.rel(r, sid).tags.map(function (id) { var x = S.tag(id); return x ? '<span class="gm-tag">' + U.esc(x.name) + '</span>' : ''; }).join(' ');
          return t || '<span class="gm-muted">—</span>'; } },
        { k: 'followers', t: 'Follower', cls: 'num', s: 'followers', r: function (r) { return S.money(r.followers); } },
        { k: 'gmv30', t: 'GMV 30 ngày', cls: 'num', s: 'gmv30', r: function (r) { return S.money(r.gmv30); } },
        { k: 'postRate', t: 'Tỉ lệ đăng', cls: 'num', s: 'postRate', r: function (r) { return r.postRate + '%'; } },
        { k: '', t: 'Phụ trách', r: function (r) { return U.esc(S.rel(r, sid).owner); } },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          return U.iconBtn('msgSend', 'Nhắn tin', 'message:' + r.id) + U.btn('Hồ sơ', { sm: true, act: 'creator:' + r.id }); } }
      ],
      rows: shown
    }) +
    U.askBar('Hỏi GOPUSH AI về kho Creator…') +
    U.pager({ page: v.page, size: SIZE, total: rows.length }));
  };

  /* Kanban theo giai đoạn quan hệ. Kéo thẻ sang cột khác để đổi giai đoạn;
     sang "Đã mời" nghĩa là gửi lời mời qua API nên sẽ hỏi xác nhận (app.js). */
  var STAGES = ['Mới', 'Đã mời', 'Đã chấp nhận', 'Đang hợp tác', 'Ngừng'];
  var STAGE_TONE = [5, 0, 1, 1, 4];
  function pipeline(base, sid) {
    return '<div class="ig-kanban">' + STAGES.map(function (st, i) {
      var list = base.filter(function (cr) { return S.rel(cr, sid).state === st; })
        .sort(function (a, b) { return b.gmv30 - a.gmv30; });
      var gmv = list.reduce(function (a, cr) { return a + cr.gmv30; }, 0);
      return '<section class="ig-kcol" data-stage="' + U.attr(st) + '">' +
        '<header>' + chip(STAGE_TONE[i], ['user', 'send', 'check', 'handshake', 'ban'][i]) +
          '<b>' + st + '</b><span class="gm-badge">' + S.num(list.length) + '</span>' +
          '<span class="gmv gm-num">' + S.money(gmv) + '</span></header>' +
        '<div class="ig-kbody">' + list.slice(0, 20).map(function (cr) {
          var r = S.rel(cr, sid);
          return '<article class="ig-kcard" draggable="true" data-cr="' + cr.id + '" data-do="creator:' + cr.id + '">' +
            '<div class="h"><span class="gm-avatar">' + U.esc(U.initials(cr.name)) + '</span>' +
              '<div><b>' + U.esc(cr.name) + '</b><span>@' + U.esc(cr.user) + '</span></div></div>' +
            '<div class="m"><span>' + S.money(cr.followers) + ' follower</span><span>GMV <b class="gm-num">' + S.money(cr.gmv30) + '</b></span></div>' +
            '<div class="f"><span class="gm-help">' + U.esc(cr.cat) + '</span><span class="gm-help">' + U.esc(r.owner) + '</span></div></article>';
        }).join('') +
        (list.length > 20 ? '<p class="more">+' + S.num(list.length - 20) + ' Creator — chuyển sang Bảng để xem hết</p>' : '') +
        (list.length ? '' : '<p class="more">Kéo Creator vào đây</p>') + '</div></section>';
    }).join('') + '</div>';
  }



  P.tags = function (c) {
    var db = S.data, v = c.v, sid = c.shop.id;
    var rows = db.tags.filter(function (t) { return hit(v.q, [t.name, t.desc]); }).map(function (t) {
      var count = db.creators.filter(function (cr) {
        return Object.keys(cr.rel).some(function (k) { return cr.rel[k].tags.indexOf(t.id) > -1; });
      }).length;
      return { id: t.id, name: t.name, desc: t.desc, by: t.by, count: count };
    });
    return c.head(U.btn('Tạo nhãn', { variant: 'primary', icon: 'plus', act: 'tag:new' })) +
    '<div class="ig-section">' + U.banner('Nhãn dùng chung cho cả nhóm và cho mọi cửa hàng. Xóa nhãn không xóa Creator.') + '</div>' +
    U.filters({ ph: 'Tìm nhãn', q: v.q, right: '<span class="ig-fmeta"><b class="gm-num">' + rows.length + '</b> nhãn</span>' }) +
    U.table({
      sort: v.sort, dir: v.dir || -1,
      cols: [
        { k: 'name', t: 'Nhãn', s: 'name', r: function (r) { return '<span class="gm-tag gm-tag-ink">' + ic('tag') + U.esc(r.name) + '</span>'; } },
        { k: 'desc', t: 'Mô tả' },
        { k: 'count', t: 'Số Creator', cls: 'num', s: 'count' },
        { k: 'by', t: 'Người tạo' },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          return U.iconBtn('edit', 'Sửa', 'tag:edit:' + r.id) + U.iconBtn('trash', 'Xóa', 'tag:del:' + r.id); } }
      ],
      rows: sortBy(rows, v.sort, v.dir || -1)
    });
  };

  P.blacklist = function (c) {
    var db = S.data, v = c.v, sid = c.shop.id;
    var rows = db.blacklist.filter(function (b) { return b.shopId === sid; }).map(function (b) {
      var cr = S.creator(b.creatorId) || { name: '—', user: '', tiktok: '' };
      return { id: b.id, cr: cr, name: cr.name, reason: b.reason, by: b.by, at: b.at };
    }).filter(function (r) { return hit(v.q, [r.name, r.reason]); });

    return c.head(U.btn('Thêm vào blacklist', { variant: 'primary', icon: 'ban', act: 'black:new' })) +
    '<div class="ig-section">' +
      U.banner('Creator trong blacklist bị loại khỏi mọi chiến dịch và mọi quy tắc tự động hóa của cửa hàng <b>' +
        U.esc(c.shop.name) + '</b>.', 'warning', 'alert') + '</div>' +
    U.filters({ ph: 'Tìm Creator trong blacklist', q: v.q,
      right: '<span class="ig-fmeta"><b class="gm-num">' + rows.length + '</b> Creator</span>' }) +
    U.table({
      cols: [
        { k: 'name', t: 'Creator', r: function (r) { return U.creatorCell(r.cr); } },
        { k: 'reason', t: 'Lý do' },
        { k: 'by', t: 'Người thêm' },
        { k: 'at', t: 'Ngày thêm' },
        { k: '', t: '', cls: 'col-actions', r: function (r) { return U.btn('Gỡ khỏi blacklist', { sm: true, act: 'black:del:' + r.id }); } }
      ],
      rows: rows,
      emptyTitle: 'Blacklist đang trống',
      emptyText: 'Thêm Creator không muốn liên hệ để loại họ khỏi mọi chiến dịch.'
    });
  };

  /* ============================================================ 3. Chiến dịch */
  function campaignPage(c, kind) {
    if (c.v.wz) return global.WIZ.render(c);
    var db = S.data, v = c.v, sid = c.shop.id;
    var all = db.campaigns.filter(function (x) { return inScope(c.scope, x.shopId) && x.kind === kind; });
    var states = ['', 'Đang chạy', 'Tạm dừng', 'Nháp', 'Hoàn thành', 'Lỗi'];
    var counts = states.map(function (st) { return st ? all.filter(function (x) { return x.status === st; }).length : all.length; });
    var rows = all.filter(function (x) {
      if (v.tab && x.status !== states[v.tab]) return false;
      if (v.f.batch && x.batchId !== v.f.batch) return false;
      return hit(v.q, [x.name, x.by]);
    });
    rows = sortBy(rows, v.sort, v.dir || -1);

    /* gom theo lô: một đợt lọc có thể sinh nhiều chiến dịch 50 Creator */
    var lots = [];
    if (v.group) {
      var map = {};
      rows.forEach(function (x) {
        var key = x.batchId || x.id;
        if (!map[key]) {
          map[key] = { id: key, name: x.batchName || x.name, status: x.status, by: x.by, at: x.at,
            sent: 0, total: 0, accepted: 0, n: 0, batchId: x.batchId || '' };
          lots.push(map[key]);
        }
        var g = map[key];
        g.sent += x.sent; g.total += x.total; g.accepted += x.accepted; g.n++;
        if (x.status === 'Đang chạy') g.status = 'Đang chạy';
      });
    }
    var lot = v.f.batch ? (rows[0] || null) : null;

    return c.head(
      U.btn('Xuất Excel', { icon: 'download', act: 'export:campaigns' }) +
      U.btn(kind === 'invite' ? 'Tạo lời mời hàng loạt' : 'Tạo đợt nhắn tin',
        { variant: 'primary', icon: 'plus', act: 'campaign:new:' + kind })
    ) +
    (kind === 'message' ? U.banner('Nhắn tin hàng loạt thuộc giai đoạn <b>P2</b>: cần xác nhận quyền Affiliate messaging có mở cho thị trường Việt Nam.', 'warning', 'alert') : '') +
    U.tabs(['Tất cả', 'Đang chạy', 'Tạm dừng', 'Nháp', 'Hoàn thành', 'Lỗi'].map(function (t, i) {
      return { t: t, n: String(counts[i]) };
    }), v.tab) +
    (v.f.batch && lot
      ? '<div class="ig-tkcrumb">' + ic('layers') + '<span>Lô “' + U.esc(lot.batchName || lot.name) + '”</span>' +
        ic('right') + '<b>' + rows.length + ' chiến dịch</b>' +
        '<span style="flex:1"></span>' +
        U.btn('Bỏ lọc lô', { sm: true, variant: 'link', act: 'filters:clear:batch' }) + '</div>'
      : '') +
    U.filters({ ph: kind === 'invite' ? 'Tìm đợt mời' : 'Tìm đợt nhắn tin', q: v.q,
      quick: '<button class="ig-qchip' + (v.group ? ' on' : '') + '" data-do="campaign:group">' +
        (v.group ? ic('check') : ic('layers')) + 'Gom theo lô</button>',
      right: '<span class="ig-fmeta"><b class="gm-num">' + (v.group ? lots.length : rows.length) + '</b> ' +
        (v.group ? 'lô' : 'đợt') + '</span>' }) +
    (v.group ? U.table({
      cols: [
        { k: 'name', t: 'Lô chiến dịch', r: function (r) {
          return '<div class="ig-tkcell"><b>' + U.esc(r.name) + '</b><span>' + r.n + ' chiến dịch × tối đa ' +
            global.WIZ.PER + ' Creator</span></div>'; } },
        { k: 'status', t: 'Trạng thái', r: function (r) { return U.tag(r.status); } },
        { k: '', t: 'Tiến độ gửi', r: function (r) {
          var p = r.total ? Math.round(r.sent / r.total * 100) : 0;
          return '<div class="ig-prog"><span class="tr"><i style="width:' + p + '%"></i></span>' +
            '<span class="gm-num gm-secondary">' + S.num(r.sent) + '/' + S.num(r.total) + '</span></div>'; } },
        { k: '', t: 'Tỉ lệ chấp nhận', cls: 'num', r: function (r) {
          return r.sent ? Math.round(r.accepted / r.sent * 100) + '%' : '<span class="gm-muted">—</span>'; } },
        { k: 'by', t: 'Người tạo' },
        { k: 'at', t: 'Bắt đầu' },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          return r.batchId ? U.iconBtn('right', 'Xem từng chiến dịch', 'campaign:lot:' + r.batchId) : ''; } }
      ],
      rows: lots,
      emptyTitle: 'Chưa có lô nào',
      emptyText: 'Tạo đợt đầu tiên để bắt đầu tiếp cận Creator.'
    }) : U.table({
      sort: v.sort, dir: v.dir || -1,
      cols: [
        { k: 'name', t: kind === 'invite' ? 'Đợt mời' : 'Đợt nhắn tin', s: 'name', r: function (r) {
          return '<a class="gm-link" href="#/s/' + r.shopId + '/campaigns/c/' + r.id + '">' + U.esc(r.name) + '</a>' +
            (c.all ? '<div class="gm-help">' + U.esc(S.shop(r.shopId).name) + '</div>' : ''); } },
        { k: 'status', t: 'Trạng thái', r: function (r) { return U.tag(r.status); } },
        { k: '', t: 'Tiến độ gửi', r: function (r) {
          var p = r.total ? Math.round(r.sent / r.total * 100) : 0;
          return '<div class="ig-prog"><span class="tr"><i style="width:' + p + '%"></i></span>' +
            '<span class="gm-num gm-secondary">' + r.sent + '/' + r.total + '</span></div>'; } },
        kind === 'invite'
          ? { k: 'accepted', t: 'Tỉ lệ chấp nhận', cls: 'num', s: 'accepted', r: function (r) {
              return r.sent ? Math.round(r.accepted / r.sent * 100) + '%' : '<span class="gm-muted">—</span>'; } }
          : { k: '', t: 'Mẫu tin nhắn', r: function (r) { var t = S.tpl(r.templateId); return U.esc(t ? t.name : '—'); } },
        { k: 'by', t: 'Người tạo' },
        { k: 'at', t: 'Bắt đầu' },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          var a = '';
          if (r.status === 'Đang chạy') a += U.iconBtn('pause', 'Tạm dừng', 'campaign:pause:' + r.id);
          else if (r.status === 'Tạm dừng' || r.status === 'Nháp' || r.status === 'Lỗi') a += U.iconBtn('play', 'Chạy', 'campaign:run:' + r.id);
          a += U.iconBtn('copy', 'Nhân bản', 'campaign:dup:' + r.id);
          a += U.iconBtn('trash', 'Xóa', 'campaign:del:' + r.id);
          return a; } }
      ],
      rows: rows,
      emptyTitle: 'Chưa có đợt nào',
      emptyText: 'Tạo đợt đầu tiên để bắt đầu tiếp cận Creator.'
    })) +
    U.pager({ page: v.page, size: SIZE, total: v.group ? lots.length : rows.length });
  }

  P.invites = function (c) { return campaignPage(c, 'invite'); };
  P.messages = function (c) { return campaignPage(c, 'message'); };

  P.templates = function (c) {
    var db = S.data, v = c.v;
    var kind = v.tab === 1 ? 'message' : 'invite';
    var rows = db.templates.filter(function (t) { return t.kind === kind && hit(v.q, [t.name, t.body]); });
    var cnt = { invite: db.templates.filter(function (t) { return t.kind === 'invite'; }).length,
      message: db.templates.filter(function (t) { return t.kind === 'message'; }).length };

    return c.head(U.btn('Tạo mẫu', { variant: 'primary', icon: 'plus', act: 'tpl:new:' + kind })) +
    U.tabs([{ t: 'Mẫu lời mời', n: String(cnt.invite) }, { t: 'Mẫu tin nhắn', n: String(cnt.message) }], v.tab) +
    U.filters({ ph: 'Tìm mẫu', q: v.q, right: '<span class="ig-fmeta"><b class="gm-num">' + rows.length + '</b> mẫu</span>' }) +
    U.table({
      sort: v.sort, dir: v.dir || -1,
      cols: kind === 'invite' ? [
        { k: 'name', t: 'Tên mẫu', s: 'name', r: function (r) { return '<a class="gm-link" data-do="tpl:edit:' + r.id + '">' + U.esc(r.name) + '</a>'; } },
        { k: 'scope', t: 'Sản phẩm áp dụng' },
        { k: 'com', t: 'Hoa hồng', cls: 'num', s: 'com', r: function (r) { return r.com + '%'; } },
        { k: '', t: 'Mẫu miễn phí', r: function (r) { return r.free ? 'Có' : 'Không'; } },
        { k: 'uses', t: 'Lượt dùng', cls: 'num', s: 'uses' },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          return U.iconBtn('copy', 'Nhân bản', 'tpl:dup:' + r.id) + U.iconBtn('edit', 'Sửa', 'tpl:edit:' + r.id) +
            U.iconBtn('trash', 'Xóa', 'tpl:del:' + r.id); } }
      ] : [
        { k: 'name', t: 'Tên mẫu', s: 'name', r: function (r) { return '<a class="gm-link" data-do="tpl:edit:' + r.id + '">' + U.esc(r.name) + '</a>'; } },
        { k: 'mtype', t: 'Loại' },
        { k: 'vars', t: 'Biến' },
        { k: 'uses', t: 'Lượt dùng', cls: 'num', s: 'uses' },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          return U.iconBtn('copy', 'Nhân bản', 'tpl:dup:' + r.id) + U.iconBtn('edit', 'Sửa', 'tpl:edit:' + r.id) +
            U.iconBtn('trash', 'Xóa', 'tpl:del:' + r.id); } }
      ],
      rows: rows
    });
  };

  /* ============================================================ 4. Hàng mẫu
     Hai màn này đọc dữ liệu đã đồng bộ từ TikTok về (Affiliate Seller API),
     không gọi thẳng TikTok từ trình duyệt. Trạng thái dùng đúng enum của API. */
  var ST = S.SAMPLE_STATUS;
  var KEYWORD_TYPES = [{ v: 'PRODUCT_ID', l: 'ID sản phẩm', ph: 'Nhập ID sản phẩm' },
    { v: 'PRODUCT_NAME', l: 'Tên sản phẩm', ph: 'Nhập tên sản phẩm' }];
  var PAGE_SIZES = [5, 10, 20, 50, 100];
  var MSG_MAX = 100;              /* mỗi lần gửi tin nhắn mẫu tối đa 100 yêu cầu */

  function psize(v) { return parseInt(v.f.size, 10) || 20; }
  function slice(rows, v) {
    var n = psize(v), from = (v.page - 1) * n;
    return rows.slice(from, from + n);
  }
  function sizeSel(v) {
    return U.sel('20 mục/trang', 'size', String(psize(v)) + ' mục/trang',
      PAGE_SIZES.map(function (n) { return { v: String(n), l: n + ' mục/trang' }; }));
  }
  function dash() { return '<span class="gm-muted">—</span>'; }

  /* thẻ Creator trong bảng mẫu: đúng các trường creatorInfo trả về */
  function sampleCreator(s) {
    var ci = s.creatorInfo;
    var ind = ci.mainIndustry || [];
    var more = ind.length > 1 ? '<span class="more" title="' + U.attr(ind.map(function (x) { return x.name; }).join(', ')) +
      '">+' + (ind.length - 1) + '</span>' : '';
    return '<div class="ig-sampcr">' +
      '<span class="gm-avatar">' + U.esc(U.initials(ci.nickname)) + '</span>' +
      '<div class="tx">' +
        '<div class="n"><a class="gm-link" data-do="creator:' + U.attr(s.creatorId) + '">@' + U.esc(ci.username) + '</a>' +
          U.tiktok('https://www.tiktok.com/@' + ci.username) +
          (s.isLibrary ? '<span class="gm-tag gm-tag-green">Đã lưu</span>' : '') +
          (s.isBlack ? '<span class="gm-tag gm-tag-red">Danh sách đen</span>' : '') + '</div>' +
        '<div class="s" title="' + U.attr(ci.nickname + ' · ' + S.money(ci.followerCount) + ' follower · Ngành hàng: ' +
          (ind.length ? ind.map(function (x) { return x.name; }).join(', ') : '—')) + '">' +
          U.esc(ci.nickname) + ' · ' + S.money(ci.followerCount) + ' follower · ' +
          U.esc(ind.length ? ind[0].name : '—') + more + '</div>' +
      '</div></div>';
  }

  function sampleProduct(s) {
    return '<div class="ig-sampprod"><span class="th">' + ic('box') + '</span>' +
      '<div class="tx"><b>' + U.esc(s.productInfo.title) + '</b>' +
      '<span class="gm-num">ID: ' + U.esc(s.productInfo.id) +
      '<button class="ig-copy" data-do="copy:' + U.attr(s.productInfo.id) + '" title="Sao chép ID">' + ic('copy') + '</button>' +
      '</span></div></div>';
  }

  function syncTag(s) {
    if (s.logisticsInfo.syncStatus === 'FAILED') {
      return '<span class="gm-tag gm-tag-red" title="Đồng bộ vận chuyển thất bại, vui lòng cập nhật dữ liệu rồi thử lại">' +
        'Đồng bộ lỗi</span>' + U.iconBtn('refresh', 'Đồng bộ lại vận đơn này', 'ship:resync:' + s.id);
    }
    return '<span class="gm-tag gm-tag-green">Đã đồng bộ</span>';
  }

  /* cột thay đổi theo tab, đúng bảng trong đặc tả */
  function sampleCols(status) {
    var cols = [
      { k: '', t: 'Thông tin Creator', r: sampleCreator },
      { k: '', t: 'Thông tin sản phẩm', r: sampleProduct },
      { k: '', t: 'SKU', r: function (r) { return U.esc(r.sku || r.productInfo.skuName) || dash(); } },
      { k: '', t: 'Hoa hồng', cls: 'num', r: function (r) { return r.commissionRate + '%'; } },
      { k: '', t: 'Phương thức phê duyệt', r: function (r) {
        return '<span class="ig-appr' + (r.approvalMethod === 'AUTO' ? ' is-auto' : '') + '">' +
          ic(r.approvalMethod === 'AUTO' ? 'flash' : 'user') + S.approvalLabel(r.approvalMethod) + '</span>'; } }
    ];
    if (status === 'PENDING') {
      cols.push(
        { k: '', t: 'Tỷ lệ đăng dự kiến', cls: 'num',
          th: 'Tỷ lệ Creator đăng video hoặc livestream bán hàng sau khi nhận mẫu.',
          r: function (r) { return Math.round(Number(r.fulfillmentPercentage) || 0) + '%'; } },
        { k: '', t: 'GMV 30 ngày', cls: 'num',
          th: 'Doanh số (GMV) của Creator trong 30 ngày qua.',
          r: function (r) { return S.money(Number(String(r.gmvCount).replace(/[^\d]/g, ''))) + ' ' +
            (r.gmvCurrency === 'VND' ? '₫' : r.gmvCurrency); } },
        { k: '', t: 'Lượt xem TB mỗi video', cls: 'num',
          th: 'Lượt xem trung bình mỗi video của Creator trong 30 ngày qua.',
          r: function (r) { return S.num(r.ecVideoView); } },
        { k: '', t: 'ID lời mời nguồn', r: function (r) {
          return r.targetCollabrationId ? '<span class="gm-num gm-secondary">' + U.esc(r.targetCollabrationId) + '</span>' : dash(); } }
      );
    }
    if (['AWAITING_SHIPMENT', 'SHIPPED', 'CONTENT_PENDING', 'COMPLETED'].indexOf(status) > -1) {
      cols.push({ k: '', t: 'Mã đơn hàng', r: function (r) {
        return r.orderId ? '<span class="gm-num gm-secondary">' + U.esc(r.orderId) + '</span>' : dash(); } });
    }
    if (['SHIPPED', 'CONTENT_PENDING'].indexOf(status) > -1) {
      cols.push(
        { k: '', t: 'Vận đơn', r: function (r) {
          return r.logisticsInfo.trackingNo ? '<div class="nw gm-num">' + U.esc(r.logisticsInfo.trackingNo) + '</div>' +
            '<div class="gm-help">' + (U.esc(r.logisticsInfo.carrierName) || '—') + '</div>' : dash(); } }
      );
    }
    if (status === 'SHIPPED') {
      cols.push({ k: '', t: 'Hành trình mới nhất', r: function (r) {
        return r.logisticsInfo.latestDescription ? '<div class="ig-clamp" title="' + U.attr(r.logisticsInfo.latestDescription) + '">' +
          U.esc(r.logisticsInfo.latestDescription) + '</div>' : dash(); } });
    }
    if (status === 'CONTENT_PENDING') {
      cols.push({ k: '', t: 'Thời gian ký nhận', r: function (r) {
        if (!r.logisticsInfo.signedAt) return dash();
        var d = S.daysFrom(r.logisticsInfo.signedAt);
        return '<div>' + S.tsShort(r.logisticsInfo.signedAt) + '</div>' +
          '<div class="gm-help' + (d >= 5 ? ' is-late' : '') + '">' + d + ' ngày trước</div>'; } });
    }
    if (status === 'COMPLETED') {
      cols.push(
        { k: '', t: 'Nội dung đã đăng', r: function (r) {
          var cs = r.contents || [];
          if (!cs.length) return dash();
          var nv = cs.filter(function (x) { return x.type === 'VIDEO'; }).length;
          var nl = cs.length - nv;
          var views = cs.reduce(function (a, x) { return a + x.views; }, 0);
          return '<button class="ig-clink" data-do="sample:content:' + U.attr(r.id) + '">' + ic('play') +
            '<span><b>' + nv + ' video' + (nl ? ' · ' + nl + ' LIVE' : '') + '</b>' +
            '<small>' + S.money(views) + ' lượt xem</small></span></button>'; } },
        { k: '', t: 'Đánh giá', cls: 'num', r: function (r) {
          return r.rating ? '<span class="ig-stars" title="' + U.attr(r.ratingNote || '') + '">' +
            '★'.repeat(r.rating) + '<i>' + '★'.repeat(5 - r.rating) + '</i></span>'
            : '<span class="gm-tag gm-tag-orange">Chưa đánh giá</span>'; } }
      );
    }
    if (status === 'CANCELLED') {
      cols.push({ k: '', t: 'Lý do', r: function (r) {
        var lb = '';
        S.REJECT_REASONS.forEach(function (x) { if (x.v === r.rejectReason) lb = x.l; });
        return lb ? U.esc(lb) : dash(); } });
    }
    cols.push({ k: '', t: 'Yêu cầu lúc', r: function (r) { return S.tsShort(r.requestAt); } });
    cols.push({ k: '', t: 'Thao tác', cls: 'col-actions', r: sampleActions });
    return cols;
  }

  function sampleActions(s) {
    var a = '';
    if (s.status === 'PENDING') a += U.btn('Duyệt', { sm: true, variant: 'primary', act: 'sample:review:' + s.id });
    if (s.status === 'COMPLETED') {
      a += U.btn('Xem nội dung', { sm: true, variant: 'ghost', icon: 'play', act: 'sample:content:' + s.id });
      a += U.iconBtn('truck', 'Xem thông tin vận chuyển', 'ship:trail:' + s.id);
      a += U.iconBtn('star', s.rating ? 'Sửa đánh giá' : 'Để lại đánh giá', 'sample:rate:' + s.id);
    }
    if (['SHIPPED', 'CONTENT_PENDING'].indexOf(s.status) > -1) {
      a += U.iconBtn('truck', 'Xem hành trình', 'ship:trail:' + s.id);
    }
    a += U.iconBtn('msgSend', 'Nhắn tin cho Creator', 'sample:chat:' + s.id);
    a += U.iconBtn(s.isLibrary ? 'check' : 'bookmark', s.isLibrary ? 'Đã lưu vào Kho Creator' : 'Lưu Creator',
      'sample:lib:' + s.id);
    a += U.iconBtn('ban', s.isBlack ? 'Bỏ khỏi danh sách đen' : 'Thêm vào danh sách đen', 'sample:black:' + s.id);
    return a;
  }

  P.requests = function (c) {
    var db = S.data, v = c.v, sid = c.shop.id;
    var stype = v.f.stype || 'FREE';
    var sum = S.sampleSummary(sid, stype);
    var status = ST[v.tab || 0].v;
    var kwType = v.f.kwType || 'PRODUCT_ID';
    var kw = String(v.kw || '').trim().toLowerCase();
    var ph = KEYWORD_TYPES[0].ph;
    KEYWORD_TYPES.forEach(function (t) { if (t.v === kwType) ph = t.ph; });

    var rows = db.samples.filter(function (s) {
      if (s.shopId !== sid || s.status !== status || s.sampleType !== stype) return false;
      if (v.f.appr && v.f.appr !== 'all' && s.approvalMethod !== v.f.appr) return false;
      if (status === 'COMPLETED' && v.f.norate === 'norate' && s.rating) return false;
      var q = String(v.q || '').trim().toLowerCase();
      if (q && (s.creatorInfo.username + ' ' + s.creatorInfo.nickname).toLowerCase().indexOf(q) < 0) return false;
      if (kw) {
        if (kwType === 'PRODUCT_ID') { if (s.productInfo.id !== kw) return false; }
        else if (s.productInfo.title.toLowerCase().indexOf(kw) < 0) return false;
      }
      return true;
    });
    var shown = slice(rows, v);
    var n = selCount(v);
    var wait = S.data.settings.sampleCooldown || 0;

    return c.head(
      (sum.lastUpdateTime
        ? '<span class="ig-synced" title="Mốc dữ liệu đã đồng bộ về từ TikTok">' + ic('history') +
          'Dữ liệu cập nhật đến: <b>' + S.ts(sum.lastUpdateTime) + '</b></span>' : '') +
      U.btn('Xuất dữ liệu', { icon: 'download', act: 'export:samples' }) +
      U.btn('Cập nhật dữ liệu', { variant: 'primary', icon: 'refresh', act: 'sample:sync' })
    ) +
    U.banner('Nếu shop có quá nhiều yêu cầu mẫu, TikTok chỉ trả về các yêu cầu gần nhất nên dữ liệu có thể chưa đầy đủ. ' +
      'Số liệu dưới đây đọc từ bản đã đồng bộ, không gọi thẳng TikTok.', '', 'info') +
    '<div class="ig-subtabs">' + S.SAMPLE_TYPES.map(function (t) {
      return '<button class="' + (stype === t.v ? 'on' : '') + '" data-do="f:stype:' + t.v + '">' +
        U.esc(t.l) + '</button>';
    }).join('') + '</div>' +
    U.tabs(ST.map(function (x) { return { t: x.l, n: S.num(sum[x.v] || 0) }; }), v.tab || 0) +
    U.filters({
      ph: 'Tìm tên Creator', q: v.q,
      quick: U.sel('Tiêu chí sản phẩm', 'kwType', kwType === 'PRODUCT_ID' ? '' : 'Tên sản phẩm',
          KEYWORD_TYPES.map(function (t) { return { v: t.v, l: t.l }; })) +
        '<label class="gm-input gm-input-sm ig-fsearch">' + ic('search') +
          '<input type="search" data-kw placeholder="' + U.attr(ph) + '" value="' + U.attr(v.kw || '') + '"></label>' +
        U.sel('Phương thức phê duyệt', 'appr', v.f.appr, [{ v: 'all', l: 'Mọi phương thức' }].concat(S.APPROVAL)) +
        (status === 'COMPLETED'
          ? '<button class="ig-qchip' + (v.f.norate === 'norate' ? ' on' : '') + '" data-do="f:norate:' +
            (v.f.norate === 'norate' ? 'all' : 'norate') + '" title="Chỉ hiện yêu cầu chưa để lại đánh giá">' +
            (v.f.norate === 'norate' ? ic('check') : ic('star')) + 'Chưa đánh giá</button>'
          : ''),
      right: sizeSel(v) + '<span class="ig-fmeta"><b class="gm-num">' + S.num(rows.length) + '</b> yêu cầu</span>'
    }) +
    U.selbar(n,
      (status === 'PENDING'
        ? U.btn('Duyệt', { sm: true, variant: 'ghost', icon: 'check', act: 'sample:bulkApprove' }) +
          U.btn('Từ chối', { sm: true, variant: 'ghost', icon: 'x', act: 'sample:bulkReject' }) +
          U.btn('Gửi tin nhắn mẫu', { sm: true, variant: 'ghost', icon: 'msgSend', act: 'sample:bulkMsg' })
        : '') +
      U.btn('Lưu Creator', { sm: true, variant: 'ghost', icon: 'bookmark', act: 'sample:bulkLib' }) +
      U.btn('Thêm vào danh sách đen', { sm: true, variant: 'ghost', icon: 'ban', act: 'sample:bulkBlack' }) +
      U.btn('Tạo tác vụ kết nối', { sm: true, variant: 'ghost', icon: 'send', act: 'sample:bulkCampaign' })) +
    U.table({
      check: true, sel: v.sel, cols: sampleCols(status), rows: shown,
      emptyTitle: 'Chưa có dữ liệu',
      emptyText: 'Không có yêu cầu mẫu nào ở trạng thái “' + ST[v.tab || 0].l + '” khớp bộ lọc.'
    }) +
    (wait ? '' : '') +
    U.pager({ page: v.page, size: psize(v), total: rows.length });
  };

  P.shipments = function (c) {
    var db = S.data, v = c.v, sid = c.shop.id;
    var all = db.samples.filter(function (s) { return s.shopId === sid && s.logisticsInfo.trackingNo; });
    var rows = all.filter(function (s) {
      var q = String(v.q || '').trim().toLowerCase();
      if (q && (s.logisticsInfo.trackingNo + ' ' + s.creatorInfo.username + ' ' + s.creatorInfo.nickname +
        ' ' + s.productInfo.title).toLowerCase().indexOf(q) < 0) return false;
      if (fv(v, 'carrier') && s.logisticsInfo.carrierName !== v.f.carrier) return false;
      if (fv(v, 'status') && s.status !== v.f.status) return false;
      if (fv(v, 'sync') && s.logisticsInfo.syncStatus !== v.f.sync) return false;
      if (fv(v, 'late') && !S.isLate(s)) return false;
      return true;
    });
    var shown = slice(rows, v);
    var nSel = selCount(v);
    var late = all.filter(function (s) { return S.isLate(s); }).length;
    var signed = all.filter(function (s) { return s.logisticsInfo.signedAt; });
    var withVid = all.filter(function (s) { return s.video; }).length;
    var failed = all.filter(function (s) { return s.logisticsInfo.syncStatus === 'FAILED'; }).length;
    var avgDays = signed.length
      ? Math.round(signed.reduce(function (a, s) {
          return a + Math.max(0, (s.logisticsInfo.signedAt - s.requestAt) / 86400);
        }, 0) / signed.length * 10) / 10
      : 0;
    var carriers = [];
    all.forEach(function (s) { if (carriers.indexOf(s.logisticsInfo.carrierName) < 0) carriers.push(s.logisticsInfo.carrierName); });

    return c.head(
      U.btn('Xuất dữ liệu', { icon: 'download', act: 'export:shipments' }) +
      U.btn('Đồng bộ vận chuyển', { icon: 'refresh', act: 'ship:syncAll' }) +
      U.btn('Gửi nhắc cho đơn quá hạn', { variant: 'primary', icon: 'msgSend', act: 'ship:remindLate' })
    ) +
    (failed ? U.banner('<b>' + failed + '</b> vận đơn đồng bộ thất bại. Bấm <b>Đồng bộ vận chuyển</b> rồi thử lại.',
      'warning', 'alert') : '') +
    '<div class="ig-section">' + U.stats([
      { v: S.num(all.length), l: 'Vận đơn đang theo dõi', icon: 'truck' },
      { v: String(avgDays).replace('.', ',') + ' ngày', l: 'Từ lúc xin mẫu đến khi ký nhận', icon: 'clock' },
      { v: S.num(late), l: 'Ký nhận quá 5 ngày chưa đăng', icon: 'alert' },
      { v: all.length ? Math.round(withVid / all.length * 100) + '%' : '0%', l: 'Tỉ lệ lên nội dung sau nhận mẫu', icon: 'video' }
    ]) + '</div>' +
    U.filters({
      ph: 'Mã vận đơn, Creator hoặc sản phẩm', q: v.q,
      quick: U.sel('Đơn vị vận chuyển', 'carrier', v.f.carrier, ['all'].concat(carriers)) +
        U.sel('Trạng thái', 'status', v.f.status, [{ v: 'all', l: 'Tất cả trạng thái' }].concat(
          ST.filter(function (x) { return ['SHIPPED', 'CONTENT_PENDING', 'COMPLETED'].indexOf(x.v) > -1; }))) +
        U.sel('Đồng bộ', 'sync', v.f.sync, [{ v: 'all', l: 'Mọi trạng thái đồng bộ' },
          { v: 'SUCCESS', l: 'Đã đồng bộ' }, { v: 'FAILED', l: 'Đồng bộ lỗi' }]) +
        '<button class="ig-qchip' + (v.f.late === 'late' ? ' on' : '') + '" data-do="f:late:' +
          (v.f.late === 'late' ? 'all' : 'late') + '">' + (v.f.late === 'late' ? ic('check') : ic('alert')) +
          'Quá 5 ngày chưa đăng</button>',
      right: sizeSel(v) + '<span class="ig-fmeta"><b class="gm-num">' + S.num(rows.length) + '</b> vận đơn</span>'
    }) +
    U.selbar(nSel, U.btn('Gửi nhắc', { sm: true, variant: 'ghost', icon: 'msgSend', act: 'ship:bulkRemind' })) +
    U.table({
      check: true, sel: v.sel,
      cols: [
        { k: '', t: 'Thông tin Creator', r: sampleCreator },
        { k: '', t: 'Thông tin sản phẩm', r: sampleProduct },
        { k: '', t: 'Trạng thái', r: function (r) { return U.tag(S.sampleLabel(r.status)); } },
        { k: '', t: 'Vận đơn', r: function (r) {
          return '<div class="nw"><span class="gm-num">' + U.esc(r.logisticsInfo.trackingNo) + '</span>' +
            '<button class="ig-copy" data-do="copy:' + U.attr(r.logisticsInfo.trackingNo) + '" title="Sao chép mã">' +
            ic('copy') + '</button></div><div class="gm-help">' + U.esc(r.logisticsInfo.carrierName) + '</div>'; } },
        { k: '', t: 'Hành trình mới nhất', r: function (r) {
          return '<div class="ig-clamp" title="' + U.attr(r.logisticsInfo.latestDescription || '') + '">' +
            U.esc(r.logisticsInfo.latestDescription || '—') + '</div>' +
            '<div class="gm-help">' + S.tsShort(Math.floor((r.logisticsInfo.trail.length
              ? r.logisticsInfo.trail[r.logisticsInfo.trail.length - 1].updateTimeMillis : 0) / 1000)) + '</div>'; } },
        { k: '', t: 'Ký nhận', r: function (r) {
          if (!r.logisticsInfo.signedAt) return dash();
          var d = S.daysFrom(r.logisticsInfo.signedAt);
          return '<div>' + S.tsShort(r.logisticsInfo.signedAt) + '</div>' +
            '<div class="gm-help' + (S.isLate(r) ? ' is-late' : '') + '">' + d + ' ngày trước</div>'; } },
        { k: '', t: 'Nội dung', r: function (r) {
          return r.video ? '<a class="ig-vid" href="' + U.attr(r.video) + '" target="_blank" rel="noopener">' +
            ic('play') + 'Xem</a>' : U.tag('Chưa có video'); } },
        { k: '', t: 'Đồng bộ', r: syncTag },
        { k: '', t: 'Thao tác', cls: 'col-actions', r: function (r) {
          return U.iconBtn('truck', 'Xem hành trình', 'ship:trail:' + r.id) +
            (r.video ? U.iconBtn('eye', 'Mở video', 'sample:open:' + r.id)
              : U.btn('Gửi nhắc', { sm: true, act: 'ship:remind:' + r.id })); } }
      ],
      rows: shown,
      emptyTitle: 'Chưa có dữ liệu',
      emptyText: 'Không có vận đơn nào khớp bộ lọc.'
    }) +
    U.pager({ page: v.page, size: psize(v), total: rows.length });
  };

  /* ============================================================ 5. Tự động hóa */
  /* Tự động hóa: một mục trên sidebar, hai loại quy tắc chuyển bằng tab cấp hai */
  function autoSwitch(c, which) {
    var sp = '/s/' + c.shop.id;
    return '<div class="ig-subtabs">' +
      '<button class="' + (which === 'invite' ? 'on' : '') + '" data-do="go:' + sp + '/auto/invites">Lời mời tự động</button>' +
      '<button class="' + (which === 'message' ? 'on' : '') + '" data-do="go:' + sp + '/auto/messages">Tin nhắn tự động</button></div>';
  }

  P['auto-invites'] = function (c) {
    var db = S.data, v = c.v, sid = c.shop.id;
    var rules = db.autoInvites.filter(function (r) { return r.shopId === sid; });
    if (v.tab === 1) return autoHistory(c, rules);
    return c.head(U.btn('Tạo quy tắc', { variant: 'primary', icon: 'plus', act: 'auto:new:invite' })) +
    autoSwitch(c, 'invite') + U.tabs([{ t: 'Quy tắc', n: String(rules.length) },
      { t: 'Lịch sử chạy', n: String(rules.reduce(function (a, r) { return a + r.runs; }, 0)) }], v.tab) +
    '<div class="ig-section">' +
      U.banner('Hệ thống chỉ mời Creator <b>mới khớp bộ lọc và chưa từng được mời</b>. Blacklist luôn được loại trừ.') +
      (rules.length ? rules.map(function (r) {
        var t = S.tpl(r.templateId);
        var err = /[1-9]\d* lỗi/.test(r.last);
        return U.card({
          cls: 'ig-rule' + (r.on ? '' : ' is-off'),
          title: '<span class="gm-switch' + (r.on ? ' on' : '') + '" data-do="auto:toggle:' + r.id + '" title="Bật / tắt"></span>' +
            U.esc(r.name) + ' ' + (r.on ? '<span class="gm-tag gm-tag-green">Đang bật</span>' : '<span class="gm-tag">Đã tắt</span>'),
          rawTitle: true,
          actions: U.btn('Chạy thử', { sm: true, icon: 'play', act: 'auto:run:' + r.id }) +
            U.iconBtn('edit', 'Sửa', 'auto:edit:' + r.id) + U.iconBtn('trash', 'Xóa', 'auto:del:' + r.id),
          body: U.facts([
            ['Bộ lọc đã lưu', '<span class="gm-tag gm-tag-ink">' + U.esc(r.filter) + '</span>', true],
            ['Mẫu lời mời', t ? t.name : '—'],
            ['Lịch chạy', r.schedule],
            ['Giới hạn mỗi lần', r.limit + ' lời mời'],
            ['Lần chạy gần nhất', '<span' + (err ? ' class="gm-delta-down"' : '') + '>' + U.esc(r.last) + '</span>', true]
          ])
        });
      }).join('') : U.empty('Chưa có quy tắc nào', 'Tạo quy tắc để tự mời Creator mới khớp bộ lọc mỗi ngày.',
        U.btn('Tạo quy tắc', { sm: true, variant: 'primary', act: 'auto:new:invite' }))) +
    '</div>';
  };

  function autoHistory(c, rules) {
    var rows = [];
    rules.forEach(function (r) {
      for (var i = 0; i < 4; i++) {
        rows.push({ id: r.id + '-' + i, name: r.name, at: i === 0 ? r.last.split(' · ')[0] : 'Ngày ' + (24 - i) + '/09 08:00',
          sent: r.limit - i * 3, err: i === 1 ? 2 : 0, status: i === 1 ? 'Lỗi' : 'Hoàn thành' });
      }
    });
    return c.head(U.btn('Xuất Excel', { icon: 'download', act: 'export:autoruns' })) +
    autoSwitch(c, 'invite') + U.tabs([{ t: 'Quy tắc', n: String(rules.length) }, { t: 'Lịch sử chạy', n: String(rows.length) }], 1) +
    U.table({
      cols: [{ k: 'at', t: 'Thời điểm' }, { k: 'name', t: 'Quy tắc' },
        { k: 'sent', t: 'Đã mời', cls: 'num' }, { k: 'err', t: 'Lỗi', cls: 'num' },
        { k: 'status', t: 'Kết quả', r: function (r) { return U.tag(r.status); } },
        { k: '', t: '', cls: 'col-actions', r: function () { return U.btn('Thử lại', { sm: true, act: 'toast:Đã đưa lần chạy vào hàng đợi' }); } }],
      rows: rows
    });
  }

  P['auto-messages'] = function (c) {
    var db = S.data, v = c.v, sid = c.shop.id;
    var rules = db.autoMessages.filter(function (r) { return r.shopId === sid; });
    return c.head(U.btn('Tạo quy tắc', { variant: 'primary', icon: 'plus', act: 'auto:new:message' })) +
    autoSwitch(c, 'message') + U.tabs([{ t: 'Quy tắc', n: String(rules.length) }, { t: 'Lịch sử chạy', n: '412' }], v.tab) +
    U.table({
      cols: [
        { k: 'when', t: 'Khi', r: function (r) { return '<span class="gm-tag">' + ic('flash') + U.esc(r.when) + '</span>'; } },
        { k: '', t: '', r: function () { return '<span class="gm-muted">' + ic('right') + '</span>'; } },
        { k: '', t: 'Gửi mẫu tin nhắn', r: function (r) {
          var t = S.tpl(r.templateId);
          return '<a class="gm-link" data-do="tpl:edit:' + r.templateId + '">' + U.esc(t ? t.name : '—') + '</a>'; } },
        { k: 'last', t: 'Lần chạy gần nhất' },
        { k: '', t: 'Bật', r: function (r) { return '<span class="gm-switch' + (r.on ? ' on' : '') + '" data-do="autoMsg:toggle:' + r.id + '"></span>'; } },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          return U.iconBtn('play', 'Chạy thử', 'autoMsg:run:' + r.id) + U.iconBtn('edit', 'Sửa', 'autoMsg:edit:' + r.id) +
            U.iconBtn('trash', 'Xóa', 'autoMsg:del:' + r.id); } }
      ],
      rows: rules
    });
  };

  /* ============================================================ 6. Báo cáo */
  P['report-all'] = function (c) {
    var v = c.v, db = S.data;
    var scope = v.f.shop && v.f.shop !== 'Tất cả cửa hàng' ? c.shop.id : 'all';
    var st = S.stats(scope);
    var live = db.shops.filter(function (s) { return s.status !== 'err'; });
    var tot = live.reduce(function (a, s) { return a + S.stats(s.id).gmv; }, 0) || 1;
    var SHOP_C = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
    var rows = live.map(function (s, i) {
      var ss = S.stats(s.id);
      return { id: s.id, s: s.flag + ' ' + s.name, raw: ss.gmv, c: SHOP_C[i % SHOP_C.length],
        gmv: S.money(ss.gmv), ord: S.num(ss.orders), com: S.money(ss.com), vid: S.num(ss.videos), cre: S.num(ss.working),
        share: Math.round(ss.gmv / tot * 100) };
    });
    return c.head(
      U.sel('30 ngày qua', 'period', v.f.period, ['7 ngày qua', '30 ngày qua', '90 ngày qua']) +
      U.sel('Tất cả cửa hàng', 'shop', v.f.shop, ['Tất cả cửa hàng', c.shop.name]) +
      U.btn('Xuất Excel', { icon: 'download', act: 'export:report' })
    ) +
    '<div class="ig-section">' +
      '<div class="ig-kpis ig-kpis-5">' +
        kpi({ i: 'trend', l: 'GMV liên kết (₫)', v: S.money(st.gmv), d: '+18,2%', s: series(st.gmv) }) +
        kpi({ i: 'box', l: 'Đơn liên kết', v: S.num(st.orders), d: '+12,4%', s: series(st.orders) }) +
        kpi({ i: 'wallet', l: 'Hoa hồng (₫)', v: S.money(st.com), d: '+9,8%', s: series(st.com) }) +
        kpi({ i: 'video', l: 'Video / live', v: S.num(st.videos), d: '+17,1%', s: series(st.videos) }) +
        kpi({ i: 'users', l: 'Creator hoạt động', v: S.num(st.working), d: '+28', s: series(st.working) }) +
      '</div>' +
      '<div class="ig-dash ig-dash-2">' +
        U.card({
          title: 'Xu hướng theo tuần',
          body: CH.line({ alt: 'GMV và hoa hồng theo tuần', h: 300, labels: ['T33', 'T34', 'T35', 'T36', 'T37', 'T38'],
            series: [{ name: 'GMV (triệu ₫)', values: series(Math.round(st.gmv / 1e6 / 6), 6), color: 'var(--chart-1)' },
              { name: 'Hoa hồng (triệu ₫)', values: series(Math.round(st.com / 1e6 / 6), 6), color: 'var(--chart-2)', fill: false }] })
        }) +
        U.card({
          title: 'Tỉ trọng GMV theo cửa hàng',
          body: CH.donut({ alt: 'Tỉ trọng GMV theo cửa hàng', value: S.money(tot), label: 'GMV kỳ này',
            data: rows.map(function (r) { return { l: r.s, v: r.raw, c: r.c }; }) })
        }) +
      '</div>' +
      U.card({ title: 'Theo cửa hàng', cls: 'gm-card-tablewrap', body: U.table({
        cols: [{ k: 's', t: 'Cửa hàng', r: function (r) {
            return '<span style="display:inline-flex;align-items:center;gap:8px"><i class="gm-dot" style="background:' + r.c + '"></i>' + U.esc(r.s) + '</span>'; } },
          { k: 'gmv', t: 'GMV', cls: 'num' },
          { k: '', t: 'Tỉ trọng', r: function (r) {
            return '<span class="ig-prog"><span class="tr"><i style="width:' + r.share + '%"></i></span><span class="gm-num">' + r.share + '%</span></span>'; } },
          { k: 'ord', t: 'Đơn', cls: 'num' },
          { k: 'com', t: 'Hoa hồng', cls: 'num' }, { k: 'vid', t: 'Video/live', cls: 'num' },
          { k: 'cre', t: 'Creator hoạt động', cls: 'num' }], rows: rows }) }) +
    '</div>';
  };

  P['report-campaign'] = function (c) {
    var db = S.data, v = c.v, sid = c.shop.id;
    var rows = db.campaigns.filter(function (x) { return inScope(c.scope, x.shopId) && x.kind === 'invite' && hit(v.q, [x.name]); })
      .map(function (x) {
        var req = Math.round(x.accepted * 0.58), vid = Math.round(req * 0.66), ord = Math.round(vid * 0.79);
        return { id: x.id, shopId: x.shopId, name: x.name, sent: x.sent, acc: x.accepted, req: req, vid: vid, ord: ord,
          gmv: ord * 3800000, status: x.status };
      });
    var sorted = sortBy(rows, v.sort || 'gmv', v.dir || -1);
    var focus = sorted.filter(function (r) { return r.id === v.focusId; })[0] || sorted[0];
    return c.head(
      U.sel('30 ngày qua', 'period', v.f.period, ['7 ngày qua', '30 ngày qua', '90 ngày qua']) +
      U.btn('Xuất Excel', { icon: 'download', act: 'export:campaignReport' })
    ) +
    U.filters({ ph: 'Tìm chiến dịch', q: v.q, right: '<span class="ig-fmeta"><b class="gm-num">' + rows.length + '</b> chiến dịch</span>' }) +
    U.table({
      sort: v.sort || 'gmv', dir: v.dir || -1,
      cols: [
        { k: 'name', t: 'Chiến dịch', s: 'name', r: function (r) {
          return '<a class="gm-link" href="#/s/' + r.shopId + '/campaigns/c/' + r.id + '">' + U.esc(r.name) + '</a>' +
            (c.all ? '<div class="gm-help">' + U.esc(S.shop(r.shopId).name) + '</div>' : ''); } },
        { k: 'sent', t: 'Đã gửi', cls: 'num', s: 'sent' },
        { k: 'acc', t: 'Chấp nhận', cls: 'num', s: 'acc' },
        { k: 'req', t: 'Xin mẫu', cls: 'num', s: 'req' },
        { k: 'vid', t: 'Lên video', cls: 'num', s: 'vid' },
        { k: 'ord', t: 'Có đơn', cls: 'num', s: 'ord' },
        { k: 'gmv', t: 'GMV', cls: 'num', s: 'gmv', r: function (r) { return S.money(r.gmv); } },
        { k: '', t: '', cls: 'col-actions', r: function (r) { return U.btn('Xem phễu', { sm: true, act: 'report:focus:' + r.id }) +
          U.iconBtn('right', 'Mở chi tiết chiến dịch', 'go:/s/' + r.shopId + '/campaigns/c/' + r.id); } }
      ],
      rows: sorted
    }) +
    (focus ? '<div class="ig-section"><h2>Phễu — ' + U.esc(focus.name) + '</h2>' +
      U.card({ body: U.funnel([{ l: 'Đã gửi', v: focus.sent }, { l: 'Chấp nhận', v: focus.acc },
        { l: 'Xin mẫu', v: focus.req }, { l: 'Lên video', v: focus.vid }, { l: 'Có đơn', v: focus.ord }]) }) + '</div>' : '');
  };

  P['report-custom'] = function (c) {
    var v = c.v, db = S.data, sid = c.shop.id;
    var group = v.f.group || 'Creator';
    var rows;
    if (group === 'Ngành hàng') {
      var by = {};
      db.creators.forEach(function (cr) {
        if (S.rel(cr, sid).state !== 'Đang hợp tác') return;
        by[cr.cat] = (by[cr.cat] || 0) + cr.gmv30;
      });
      rows = Object.keys(by).map(function (k) { return { id: k, n: k, gmv: by[k], cnt: 0 }; });
    } else {
      rows = db.creators.filter(function (cr) { return S.rel(cr, sid).state === 'Đang hợp tác'; })
        .map(function (cr) { return { id: cr.id, cr: cr, n: cr.name, gmv: cr.gmv30, gpm: cr.gpm, rate: cr.postRate, cat: cr.cat }; });
    }
    rows = sortBy(rows, 'gmv', -1).slice(0, 20);
    return c.head(
      U.btn('Lưu báo cáo', { icon: 'bookmark', act: 'report:save' }) +
      U.btn('Xuất Excel', { variant: 'primary', icon: 'download', act: 'export:custom' })
    ) +
    U.filters({
      search: false, open: true,
      quick: U.sel('Kỳ', 'period', v.f.period, ['7 ngày qua', '30 ngày qua', '90 ngày qua']) +
        U.sel('Nhóm theo', 'group', v.f.group, ['Creator', 'Ngành hàng']) +
        U.sel('Hiển thị', 'view', v.f.view, ['Bảng', 'Biểu đồ']),
      chips: chips(v, { period: 'Kỳ', group: 'Nhóm theo', view: 'Hiển thị', tag: 'Nhãn' }),
      groups: [
        { l: 'Phạm vi', f: U.sel('Nhãn', 'tag', v.f.tag, ['all'].concat(db.tags.map(function (t) { return t.name; }))) +
          U.sel('Ngành hàng', 'cat', v.f.cat, ['all', 'Đồ uống', 'Ẩm thực', 'Gia dụng', 'Làm đẹp']) },
        { l: 'Chỉ số', f: U.sel('GMV', 'm1', 'GMV', ['GMV']) + U.sel('Hoa hồng', 'm2', 'Hoa hồng', ['Hoa hồng']) +
          U.sel('Tỉ lệ đăng', 'm3', 'Tỉ lệ đăng', ['Tỉ lệ đăng']) }
      ]
    }) +
    (v.f.view === 'Biểu đồ'
      ? '<div class="ig-section">' + U.card({ title: 'GMV theo ' + group, body: CH.hbars(rows.slice(0, 10).map(function (r, i) {
          return { l: r.n, v: r.gmv, d: S.money(r.gmv), c: rankColor(i) };
        })) }) + '</div>'
      : U.table({
          cols: group === 'Ngành hàng'
            ? [{ k: 'n', t: 'Ngành hàng' }, { k: 'gmv', t: 'GMV', cls: 'num', r: function (r) { return S.money(r.gmv); } }]
            : [{ k: 'n', t: 'Creator', r: function (r) { return U.creatorCell(r.cr); } },
               { k: 'gmv', t: 'GMV', cls: 'num', r: function (r) { return S.money(r.gmv); } },
               { k: 'gpm', t: 'GPM', cls: 'num', r: function (r) { return S.money(r.gpm); } },
               { k: 'rate', t: 'Tỉ lệ đăng', cls: 'num', r: function (r) { return r.rate + '%'; } },
               { k: 'cat', t: 'Ngành hàng' }],
          rows: rows
        }));
  };

  /* ============================================================ 7. GOPUSH AI */
  function aiAvatar() { return '<span class="ig-ai-av">' + ic('ai') + '</span>'; }
  function msgUser(t) { return '<div class="ig-msg me"><div class="bubble">' + U.esc(t) + '</div></div>'; }
  function msgAi(body, plain) {
    return '<div class="ig-msg">' + aiAvatar() + '<div class="body">' + body +
      (plain ? '' : '<div class="ig-msg-actions">' +
        U.btn('Tạo report', { sm: true, variant: 'ghost', icon: 'file', act: 'ai:report' }) +
        U.btn('Xuất Excel', { sm: true, variant: 'ghost', icon: 'download', act: 'export:aiPicks' }) +
        '<span class="sep"></span>' + U.iconBtn('copy', 'Sao chép', 'toast:Đã sao chép nội dung') +
        U.iconBtn('thumbUp', 'Hữu ích', 'toast:Cảm ơn phản hồi của bạn') +
        U.iconBtn('refresh', 'Chạy lại', 'ai:redo')) + '</div></div></div>';
  }

  /* trả lời dựa trên dữ liệu thật trong hệ thống */
  function aiAnswer(q, c) {
    var db = S.data, sid = c.shop.id, st = S.stats(sid);
    var low = q.toLowerCase();
    var working = db.creators.filter(function (cr) { return S.rel(cr, sid).state === 'Đang hợp tác'; })
      .sort(function (a, b) { return b.gmv30 - a.gmv30; });

    if (/hoa hồng|commission|tăng/.test(low)) {
      var picks = working.slice(0, 4).map(function (cr, i) {
        var cur = 12 + (i % 3) * 3;
        return { id: cr.id, cr: cr, gmv: S.money(cr.gmv30), rate: cr.postRate + '%', cur: cur + '%',
          sug: i === 3 ? cur + '%' : (cur + 4) + '%',
          why: i === 0 ? 'GMV cao nhất nhóm, đăng đều' : i === 1 ? 'Tăng mạnh so với tháng trước'
            : i === 2 ? 'Chuyển đổi live tốt, hoa hồng đang thấp hơn nhóm' : 'Đã ở mức trần ngành hàng' };
      });
      return '<p>Mình xếp hạng theo GMV 30 ngày, tỉ lệ đăng sau khi nhận mẫu và mức hoa hồng trung bình ngành hàng. ' +
        'Có <b>3 Creator nên tăng</b> và 1 nên giữ nguyên.</p>' +
        '<section class="gm-card gm-card-table">' + U.table({
          cols: [{ k: 'n', t: 'Creator', r: function (r) { return U.esc(r.cr.name) + U.tiktok(r.cr.tiktok); } },
            { k: 'gmv', t: 'GMV 30 ngày', cls: 'num' }, { k: 'rate', t: 'Tỉ lệ đăng', cls: 'num' },
            { k: 'cur', t: 'Hiện tại', cls: 'num' },
            { k: 'sug', t: 'Đề xuất', cls: 'num', r: function (r) {
              return r.sug === r.cur ? '<span class="gm-muted">giữ nguyên</span>' : '<b class="gm-delta-up">' + r.sug + '</b>'; } },
            { k: 'why', t: 'Vì sao' }],
          rows: picks
        }) + '</section>' +
        '<ul><li>Nhóm 4 Creator này chiếm <b>' +
        Math.round(picks.reduce(function (a, p) { return a + p.cr.gmv30; }, 0) / (st.gmv || 1) * 100) +
        '%</b> GMV liên kết của shop.</li>' +
        '<li>Tăng như đề xuất làm hoa hồng tháng tăng thêm khoảng <b>' +
        S.money(Math.round(st.com * 0.045)) + ' ₫</b>, đổi lại GMV dự kiến +9%.</li></ul>';
    }

    if (/mẫu|video|nhắc/.test(low)) {
      var late = db.samples.filter(function (s) { return s.shopId === sid && S.isLate(s); });
      return '<p>Có <b>' + late.length + ' vận đơn</b> đã ký nhận quá 5 ngày mà Creator chưa lên nội dung, ' +
        'tương đương khoảng <b>' + S.money(late.length * 16000000) + ' ₫</b> GMV chưa được kích hoạt.</p>' +
        (late.length ? '<section class="gm-card gm-card-table">' + U.table({
          cols: [{ k: '', t: 'Creator', r: function (r) {
              return U.esc(r.creatorInfo.nickname) + U.tiktok('https://www.tiktok.com/@' + r.creatorInfo.username); } },
            { k: '', t: 'Sản phẩm', r: function (r) { return U.esc(r.productInfo.title); } },
            { k: '', t: 'Vận đơn', r: function (r) { return U.esc(r.logisticsInfo.trackingNo); } },
            { k: '', t: 'Số ngày', cls: 'num', r: function (r) { return S.daysFrom(r.logisticsInfo.signedAt); } }],
          rows: late.slice(0, 5)
        }) + '</section>' : '') +
        '<ul><li>Nên gửi nhắc kèm hạn chót, mẫu <b>Nhắc lên video sau khi nhận mẫu</b> đang có tỉ lệ phản hồi tốt nhất.</li></ul>';
    }

    if (/chiến dịch|campaign|so sánh/.test(low)) {
      var cps = db.campaigns.filter(function (x) { return x.shopId === sid && x.kind === 'invite' && x.sent; })
        .sort(function (a, b) { return (b.accepted / b.sent) - (a.accepted / a.sent); });
      return '<p>So sánh <b>' + cps.length + ' chiến dịch</b> đã gửi của ' + U.esc(c.shop.name) + ':</p>' +
        '<section class="gm-card gm-card-table">' + U.table({
          cols: [{ k: 'name', t: 'Chiến dịch' }, { k: 'sent', t: 'Đã gửi', cls: 'num' },
            { k: 'accepted', t: 'Chấp nhận', cls: 'num' },
            { k: '', t: 'Tỉ lệ', cls: 'num', r: function (r) { return Math.round(r.accepted / r.sent * 100) + '%'; } },
            { k: 'status', t: 'Trạng thái', r: function (r) { return U.tag(r.status); } }],
          rows: cps
        }) + '</section>' +
        '<ul><li>Tốt nhất: <b>' + U.esc(cps[0] ? cps[0].name : '—') + '</b>. Nên nhân bản mẫu lời mời của chiến dịch này.</li>' +
        '<li>Kém nhất: <b>' + U.esc(cps[cps.length - 1] ? cps[cps.length - 1].name : '—') + '</b> — nên đổi mẫu tin nhắn kèm.</li></ul>';
    }

    return '<p>Tổng quan ' + U.esc(c.shop.name) + ' trong 30 ngày qua:</p><ul>' +
      '<li>GMV liên kết <b>' + S.money(st.gmv) + ' ₫</b>, hoa hồng <b>' + S.money(st.com) + ' ₫</b>.</li>' +
      '<li>Đã mời <b>' + S.num(st.invited) + '</b> Creator, tỉ lệ chấp nhận <b>' + S.pct(st.acceptRate) + '</b>.</li>' +
      '<li><b>' + st.pending + '</b> yêu cầu hàng mẫu chờ duyệt và <b>' + st.lateNoVideo + '</b> vận đơn quá hạn chưa có video.</li>' +
      '</ul><p>Bạn có thể hỏi cụ thể hơn, ví dụ “Creator nào nên tăng hoa hồng” hoặc “so sánh 2 chiến dịch đang chạy”.</p>';
  }

  P['ai-home'] = function (c) {
    var db = S.data;
    var chat = db.chat.length ? db.chat : [{ role: 'ai', greet: true }];
    var st = S.stats(c.shop.id);

    var body = chat.map(function (m) {
      if (m.role === 'me') return msgUser(m.text);
      if (m.greet) {
        return msgAi('<p>Chào <b>' + U.esc(db.settings.profile.name) + '</b>. Mình vừa quét <b>' +
          S.num(db.creators.length) + ' Creator</b>, <b>' +
          db.campaigns.filter(function (x) { return x.shopId === c.shop.id; }).length + ' chiến dịch</b> và <b>' +
          db.samples.filter(function (x) { return x.shopId === c.shop.id; }).length + ' yêu cầu hàng mẫu</b> của ' +
          U.esc(c.shop.name) + '. Hỏi mình bất cứ điều gì về số liệu này.</p>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<span class="gm-tag">' + ic('database') + 'Creator · Chiến dịch · Hàng mẫu</span>' +
            '<span class="gm-tag">' + ic('clock') + 'Dữ liệu tới ' + U.esc(c.shop.sync) + '</span></div>', true);
      }
      return msgAi(m.html);
    }).join('');

    var suggests = ['Creator nào nên tăng hoa hồng tháng tới?', 'So sánh hiệu quả các chiến dịch đang chạy',
      'Vận đơn nào quá hạn chưa có video?', 'Tổng quan 30 ngày qua'];

    return c.head(
      U.btn('Xóa hội thoại', { icon: 'trash', act: 'ai:clear' }) +
      U.btn('Cuộc trò chuyện mới', { variant: 'primary', icon: 'newchat', act: 'ai:clear' })
    ) +
    '<div class="ig-chat"><div class="ig-chat-wrap">' + body + '</div>' +
    '<div class="ig-composer"><div class="ig-composer-in">' +
      '<div class="ig-suggests">' + suggests.map(function (q) {
        return '<button data-do="ai:ask:' + U.attr(q) + '">' + U.esc(q) + '</button>';
      }).join('') + '</div>' +
      '<div class="ig-composer-box">' +
        '<textarea rows="1" data-prompt placeholder="Hỏi GOPUSH AI về Creator, chiến dịch, hàng mẫu, doanh thu…"></textarea>' +
        '<div class="ig-composer-row">' +
          U.btn('Phạm vi: ' + c.shop.name, { sm: true, variant: 'ghost', icon: 'store' }) +
          U.btn(db.settings.ai.period, { sm: true, variant: 'ghost', icon: 'calendar' }) +
          '<span class="spacer"></span>' +
          '<button class="ig-send" data-do="ai:send" aria-label="Gửi">' + ic('arrowUp') + '</button>' +
        '</div></div>' +
      '<p class="ig-composer-hint">GOPUSH AI chỉ đọc dữ liệu trong hệ thống, không tự gửi lời mời hay tin nhắn.</p>' +
    '</div></div></div>';
  };

  P['ai-reports'] = function (c) {
    var db = S.data, v = c.v, st = S.stats(c.shop.id);
    var tabs = ['', 'Hoàn thành', 'Đã lên lịch', 'Nháp'];
    var counts = tabs.map(function (t) { return t ? db.aiReports.filter(function (r) { return r.status === t; }).length : db.aiReports.length; });
    var rows = db.aiReports.filter(function (r) {
      if (v.tab && r.status !== tabs[v.tab]) return false;
      if (fv(v, 'kind') && r.kind !== v.f.kind) return false;
      return hit(v.q, [r.name, r.scope, r.by]);
    });
    var top = db.creators.filter(function (cr) { return S.rel(cr, c.shop.id).state === 'Đang hợp tác'; })
      .sort(function (a, b) { return b.gmv30 - a.gmv30; }).slice(0, 6);

    return c.head(
      U.btn('Lên lịch report', { icon: 'calendar', act: 'report:schedule' }) +
      U.btn('Tạo report bằng AI', { variant: 'primary', icon: 'ai', act: 'ai:report' })
    ) +
    U.tabs(['Tất cả', 'Hoàn thành', 'Đã lên lịch', 'Nháp'].map(function (t, i) { return { t: t, n: String(counts[i]) }; }), v.tab) +
    U.filters({
      ph: 'Tìm theo tên report', q: v.q,
      quick: U.sel('Loại', 'kind', v.f.kind, ['all', 'Phân tích', 'So sánh', 'Cảnh báo', 'Dự báo', 'Đề xuất', 'Tổng hợp']),
      chips: chips(v, FLABEL),
      right: '<span class="ig-fmeta"><b class="gm-num">' + rows.length + '</b> report</span>'
    }) +
    U.table({
      cols: [
        { k: 'name', t: 'Report', r: function (r) {
          return '<div class="gm-entity" style="min-width:240px"><span class="ig-ai-av" style="background:var(--soft-mist);color:var(--soft-mist-ink)">' +
            ic('file') + '</span><div><div class="name"><a class="gm-link" data-do="report:open:' + r.id + '">' + U.esc(r.name) + '</a></div>' +
            '<div class="meta">' + U.esc(r.scope) + '</div></div></div>'; } },
        { k: 'kind', t: 'Loại', r: function (r) { return '<span class="gm-tag">' + U.esc(r.kind) + '</span>'; } },
        { k: 'by', t: 'Người tạo', r: function (r) {
          return r.by === 'GOPUSH AI' ? '<span class="gm-tag gm-tag-ink">' + ic('ai') + 'GOPUSH AI</span>' : U.esc(r.by); } },
        { k: 'at', t: 'Tạo lúc' },
        { k: 'status', t: 'Trạng thái', r: function (r) { return U.tag(r.status); } },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          return U.btn('Xem', { sm: true, act: 'report:open:' + r.id }) + ' ' +
            U.iconBtn('download', 'Tải CSV', 'report:download:' + r.id) +
            U.iconBtn('share', 'Chia sẻ', 'report:share:' + r.id) +
            U.iconBtn('trash', 'Xóa', 'report:del:' + r.id); } }
      ],
      rows: rows
    }) +

    '<div class="ig-section"><h2>Report mẫu</h2>' +
      '<div class="ig-report">' +
        '<div class="ig-report-head"><div class="t">' +
          '<h3>Hiệu suất Creator – tháng 9/2026</h3>' +
          '<div class="meta"><span>' + ic('ai') + ' GOPUSH AI tạo lúc 24/09 11:48</span>' +
          '<span>' + ic('store') + ' ' + U.esc(c.shop.name) + '</span>' +
          '<span>' + ic('calendar') + ' 26/08 – 24/09/2026</span></div></div>' +
        '<div class="ig-head-actions">' +
          U.btn('Tải CSV', { sm: true, icon: 'download', act: 'export:aiReport' }) +
          U.btn('Chia sẻ', { sm: true, icon: 'share', act: 'toast:Đã sao chép liên kết chia sẻ' }) +
        '</div></div>' +
        '<div class="ig-report-body">' +
          '<div class="ig-report-sum">' + ic('ai') +
            '<div><b>Tóm tắt của AI.</b> GMV liên kết đạt ' + S.money(S.stats(c.shop.id).gmv) + ' ₫, tăng 18,2% so với kỳ trước. ' +
            'Tăng trưởng đến từ nhóm Creator đầu bảng, trong khi nhóm đuôi dài giảm 6%. Điểm nghẽn lớn nhất là ' +
            st.lateNoVideo + ' vận đơn đã giao quá 5 ngày nhưng chưa có video.</div></div>' +
          '<div><h4>Chỉ số chính</h4>' + U.stats([
            { v: S.money(st.gmv) + ' ₫', l: 'GMV liên kết', d: '+18,2%' },
            { v: S.money(st.com) + ' ₫', l: 'Hoa hồng', d: '+11,4%' },
            { v: S.num(st.working), l: 'Creator hoạt động', d: '+24' },
            { v: st.received ? Math.round(st.videos / st.received * 100) + '%' : '0%', l: 'Tỉ lệ lên video sau mẫu', d: '+5%' }
          ]) + '</div>' +
          '<div><h4>GMV theo Creator nhóm đầu</h4>' + (top.length ? CH.hbars(top.map(function (r, i) {
            return { l: r.name, v: r.gmv30, d: S.money(r.gmv30), c: rankColor(i) };
          })) : U.empty('Chưa có dữ liệu')) + '</div>' +
          '<div><h4>Khuyến nghị</h4><ul class="ig-rec">' + [
            'Tăng hoa hồng cho nhóm Creator đầu bảng theo mức đề xuất, áp dụng từ 01/10.',
            'Gửi nhắc ' + st.lateNoVideo + ' Creator đã nhận mẫu quá 5 ngày, kèm hạn chót lên video.',
            'Mở chiến dịch mời mới cho ngành có tỉ lệ chấp nhận cao nhất.',
            'Xem lại chiến dịch có tỉ lệ chấp nhận dưới 15%, nên đổi mẫu tin nhắn kèm.'
          ].map(function (t, i) { return '<li><span class="n">' + (i + 1) + '</span><span>' + U.esc(t) + '</span></li>'; }).join('') +
          '</ul></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  };

  P['ai-settings'] = function (c) {
    var a = S.data.settings.ai;
    function weight(label, p) {
      return '<div class="ig-weight"><span class="lb">' + U.esc(label) + '</span><b>' + p + '%</b>' +
        '<span class="tr"><i style="width:' + p + '%"></i></span></div>';
    }
    var onCount = Object.keys(a.sources).filter(function (k) { return a.sources[k]; }).length;
    return c.head(U.btn('Khôi phục mặc định', { act: 'ai:resetSettings' }) + U.btn('Lưu thay đổi', { variant: 'primary', act: 'save:settings' })) +
    '<div class="ig-section">' +
      U.banner('Những thiết lập dưới đây quyết định GOPUSH AI được đọc dữ liệu nào và chấm điểm Creator theo tiêu chí gì. Áp dụng cho mọi câu hỏi và mọi report tự động.') +
      '<div class="ig-dash ig-dash-2">' +
        U.card({
          title: 'Nguồn dữ liệu được quét',
          actions: '<span class="gm-badge">' + onCount + ' / ' + Object.keys(a.sources).length + '</span>',
          body: Object.keys(a.sources).map(function (k) {
            return U.switchRow(k, a.sources[k], null, 'set:ai.sources.' + k);
          }).join('') + '<div style="height:12px"></div>' +
            U.field('Phạm vi mặc định', U.select(a.scope, { pick: 'set:ai.scope', opts: ['Shop đang chọn', 'Tất cả shop được giao'] })) +
            '<div style="height:10px"></div>' +
            U.field('Kỳ dữ liệu mặc định', U.select(a.period, { pick: 'set:ai.period', opts: ['7 ngày gần nhất', '30 ngày gần nhất', '90 ngày gần nhất'] }))
        }) +
        U.card({
          title: 'Tiêu chí chấm điểm Creator',
          actions: '<span class="gm-tag">Tổng ' + Object.keys(a.weights).reduce(function (s2, k) { return s2 + a.weights[k]; }, 0) + '%</span>',
          body: Object.keys(a.weights).map(function (k) { return weight(k, a.weights[k]); }).join('')
        }) +
      '</div>' +
      '<div class="ig-dash ig-dash-2">' +
        U.card({
          title: 'Ngưỡng cảnh báo',
          body: U.field('Creator nhận mẫu quá N ngày chưa lên video', U.input({ value: a.alertDays, bind: 'ai.alertDays' })) +
            '<div style="height:10px"></div>' + U.field('Tỉ lệ chấp nhận thấp hơn', U.input({ value: a.alertAccept, bind: 'ai.alertAccept' })) +
            '<div style="height:10px"></div>' + U.field('GMV giảm quá', U.input({ value: a.alertGmv, bind: 'ai.alertGmv' })) +
            '<div style="height:12px"></div>' +
            U.switchRow('Tự tạo report cảnh báo khi vượt ngưỡng', a.autoReport, 'Gửi vào Report và báo qua kênh đã bật.', 'set:ai.autoReport')
        }) +
        U.card({
          title: 'Cách trả lời',
          body: U.field('Văn phong', U.select(a.tone, { pick: 'set:ai.tone', opts: ['Ngắn gọn, đi thẳng vào số liệu', 'Chi tiết, có giải thích', 'Trang trọng'] })) +
            '<div style="height:10px"></div>' +
            U.field('Ngôn ngữ trả lời', U.select(a.answerLang, { pick: 'set:ai.answerLang', opts: ['Theo ngôn ngữ giao diện', 'Luôn tiếng Việt', 'Luôn tiếng Anh'] })) +
            '<div style="height:10px"></div>' +
            U.field('Độ dài mặc định', U.select(a.length, { pick: 'set:ai.length', opts: ['Ngắn — tối đa 3 ý', 'Vừa — tối đa 6 ý', 'Dài — không giới hạn'] })) +
            '<div style="height:12px"></div>' +
            U.switchRow('Luôn kèm bảng số liệu', a.alwaysTable, null, 'set:ai.alwaysTable') +
            U.switchRow('Luôn ghi rõ nguồn và kỳ dữ liệu', a.alwaysSource, null, 'set:ai.alwaysSource') +
            U.switchRow('Được phép đưa ra dự báo', a.allowForecast, 'Khi tắt, AI chỉ mô tả dữ liệu đã có.', 'set:ai.allowForecast')
        }) +
      '</div>' +
      U.card({
        title: 'Hướng dẫn riêng cho AI',
        body: U.textarea({ rows: 5, value: a.guide, bind: 'ai.guide' }) +
          '<p class="gm-help">Đoạn này được gửi kèm mọi câu hỏi. Giữ dưới 500 từ để AI trả lời nhanh.</p>'
      }) +
      U.card({
        title: 'Ví dụ huấn luyện',
        actions: U.btn('Thêm ví dụ', { sm: true, icon: 'plus', act: 'ai:addExample' }),
        cls: 'gm-card-tablewrap',
        body: U.table({
          cols: [{ k: 'q', t: 'Câu hỏi mẫu' }, { k: 'a', t: 'Cách trả lời mong muốn' },
            { k: '', t: '', cls: 'col-actions', r: function (r) { return U.iconBtn('trash', 'Xóa', 'ai:delExample:' + r.id); } }],
          rows: a.examples.map(function (e, i) { return { id: i, q: e.q, a: e.a }; })
        })
      }) +
      U.card({
        title: 'Giới hạn an toàn',
        body: U.switchRow('Không cho AI gửi lời mời hoặc tin nhắn', a.noSend, 'AI chỉ soạn nháp, người dùng bấm gửi.', 'set:ai.noSend') +
          U.switchRow('Không đọc dữ liệu của shop chưa được giao', a.onlyAssigned, null, 'set:ai.onlyAssigned') +
          U.switchRow('Ghi nhật ký mọi câu hỏi và report', a.logAll, null, 'set:ai.logAll') +
          '<div style="height:12px"></div>' +
          U.field('Từ khóa không được dùng trong nội dung AI soạn', U.input({ value: a.banned, bind: 'ai.banned' }))
      }) +
    '</div>';
  };

  /* ============================================================ 8. Cửa hàng */
  P['shop-list'] = function (c) {
    var db = S.data;
    return c.head(U.btn('Ủy quyền shop mới', { variant: 'primary', icon: 'plus', act: 'shop:new' })) +
    '<div class="ig-section">' +
      U.banner('Mỗi cửa hàng cấp quyền OAuth riêng qua TikTok Shop Partner Center. GOPUSH không dùng cookie hay RPA.') +
      '<div class="ig-grid ig-grid-3">' + db.shops.map(function (s) {
        var st = s.status === 'ok' ? 'Đã ủy quyền' : (s.status === 'warn' ? 'Sắp hết hạn' : 'Đã hết hạn');
        var ss = S.stats(s.id);
        return '<article class="gm-card ig-shopcard">' +
          '<header><span class="nm">' + s.flag + ' ' + U.esc(s.name) + '</span>' + U.tag(st) + '</header>' +
          '<p class="meta">' + U.esc(s.country) + ' · ' + U.esc(s.owner) + '</p>' +
          '<div class="ig-shopcard-stats">' +
            '<div class="gm-stat"><span class="v">' + S.num(db.products[s.id].length) + '</span><span class="l">Sản phẩm</span></div>' +
            '<div class="gm-stat"><span class="v">' + S.num(ss.working) + '</span><span class="l">Creator hợp tác</span></div>' +
          '</div>' +
          '<dl class="ig-rows"><div><dt>Đồng bộ gần nhất</dt><dd>' + U.esc(s.sync) + '</dd></div>' +
            '<div><dt>Token hết hạn</dt><dd' + (s.status !== 'ok' ? ' class="' + (s.status === 'err' ? 'gm-delta-down' : 'ig-warn') + '"' : '') + '>' +
              U.esc(s.expires) + '</dd></div></dl>' +
          '<footer>' +
            U.btn('Chi tiết', { act: 'shop:open:' + s.id }) +
            U.btn(s.status === 'err' ? 'Ủy quyền lại' : 'Cập nhật ủy quyền',
              { variant: s.status === 'ok' ? undefined : 'primary', icon: 'link', act: 'shop:auth:' + s.id }) +
          '</footer></article>';
      }).join('') + '</div>' +
    '</div>';
  };

  P['shop-detail'] = function (c) {
    var s = c.shop, v = c.v, db = S.data, ss = S.stats(s.id);
    var prods = db.products[s.id] || [];
    var st = s.status === 'ok' ? 'Đã ủy quyền' : (s.status === 'warn' ? 'Sắp hết hạn' : 'Đã hết hạn');
    var tabs = ['Tổng quan', 'Sản phẩm', 'Giới hạn gửi', 'Người được giao'];

    var body;
    if (v.tab === 1) {
      body = U.table({
        cols: [{ k: 'name', t: 'Sản phẩm', s: 'name' }, { k: 'sku', t: 'SKU' },
          { k: 'price', t: 'Giá', cls: 'num', s: 'price', r: function (r) { return S.num(r.price) + ' ' + s.cur; } },
          { k: 'com', t: 'Hoa hồng', cls: 'num', s: 'com', r: function (r) { return r.com + '%'; } },
          { k: '', t: 'Trạng thái', r: function (r) { return U.tag(r.active ? 'Đang bán' : 'Ngừng'); } },
          { k: '', t: '', cls: 'col-actions', r: function (r) {
            return U.btn(r.active ? 'Ngừng bán' : 'Bán lại', { sm: true, act: 'product:toggle:' + r.id }); } }],
        rows: sortBy(prods.filter(function (p) { return hit(v.q, [p.name, p.sku]); }), v.sort, v.dir || -1),
        sort: v.sort, dir: v.dir || -1,
        emptyTitle: 'Shop chưa đồng bộ sản phẩm'
      });
    } else if (v.tab === 2) {
      body = '<div class="ig-section"><div class="ig-dash ig-dash-2">' +
        U.card({
          title: 'An toàn cho shop',
          body: U.field('Trần TikTok cấp', U.input({ value: S.num(s.inviteLimit) + ' lời mời/ngày', bind: '' }),
            'Lấy từ API, không sửa được.') +
            '<div style="height:10px"></div>' +
            U.field('Trần an toàn của GOPUSH', U.input({ value: s.soft, bind: 'shop.soft' }),
              'GOPUSH chỉ gửi tới mức này dù TikTok cho phép nhiều hơn.') +
            '<div style="height:10px"></div>' +
            U.field('Giãn cách giữa 2 lần gửi', U.select(s.gap, { pick: 'set:shop.gap', opts: ['30 – 60 giây', '45 – 90 giây', '60 – 120 giây'] })) +
            '<div style="height:12px"></div>' +
            U.switchRow('Luôn loại trừ blacklist', true, null, 'toast:Blacklist luôn được loại trừ, không tắt được') +
            U.switchRow('Ghi nhật ký mọi thao tác', true, null, 'toast:Nhật ký luôn bật để đối soát') +
            U.switchRow('Tạm dừng khi API trả lỗi liên tiếp', true, 'Dừng sau 5 lỗi trong 10 phút.', 'toast:Đã cập nhật')
        }) +
        U.card({
          title: 'Đã dùng hôm nay',
          body: CH.ring({ pct: Math.min(100, Math.round(s.used / (S.quota(s.id).cap || 1) * 100)), label: 'Đã gửi hôm nay',
            sub: S.num(s.used) + '/' + S.num(S.quota(s.id).cap), color: 'var(--chart-1)' }) +
            '<div style="height:10px"></div>' +
            U.kv([['Lời mời đã gửi', S.num(s.used)], ['Còn lại hôm nay', S.num(S.quota(s.id).left)],
              ['Chia được', S.num(Math.floor(S.quota(s.id).left / 50)) + ' chiến dịch × 50 Creator'],
              ['Giãn cách', s.gap]])
        }) + '</div></div>';
    } else if (v.tab === 3) {
      body = U.table({
        cols: [{ k: 'name', t: 'Thành viên' }, { k: 'role', t: 'Vai trò' }, { k: 'email', t: 'Email' },
          { k: '', t: '', cls: 'col-actions', r: function (r) {
            return U.btn('Bỏ giao shop', { sm: true, act: 'toast:Đã bỏ giao ' + s.name + ' khỏi ' + r.name }); } }],
        rows: db.members.filter(function (m) { return m.shops === 'Tất cả' || m.shops.indexOf(s.name.split(' ')[1] || s.name) > -1; })
      });
    } else {
      body = '<div class="ig-section"><div class="ig-dash ig-dash-2">' +
        U.card({
          title: 'Ủy quyền',
          body: U.kv([
            ['Cửa hàng', s.flag + ' ' + s.name],
            ['Quốc gia / tiền tệ', s.country + ' · ' + s.cur],
            ['Trạng thái', U.tag(st), true],
            ['Token hết hạn', s.expires],
            ['Đồng bộ gần nhất', s.sync],
            ['Nhóm quyền', 'Shop authorization · Product · Affiliate']
          ]) + '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">' +
            U.btn('Cập nhật ủy quyền', { sm: true, icon: 'link', act: 'shop:auth:' + s.id }) +
            U.btn('Đồng bộ ngay', { sm: true, icon: 'refresh', act: 'shop:sync:' + s.id }) + '</div>'
        }) +
        U.card({
          title: 'Kết quả 30 ngày',
          body: U.stats([
            { v: S.money(ss.gmv) + ' ₫', l: 'GMV liên kết' }, { v: S.num(ss.orders), l: 'Đơn' },
            { v: S.num(ss.working), l: 'Creator hợp tác' }, { v: S.num(ss.samples), l: 'Yêu cầu mẫu' }
          ])
        }) + '</div></div>';
    }

    return c.head(
      U.btn('Cập nhật ủy quyền', { icon: 'link', act: 'shop:auth:' + s.id }) +
      U.btn('Đồng bộ ngay', { icon: 'refresh', act: 'shop:sync:' + s.id }) +
      U.btn('Gỡ liên kết', { variant: 'danger', act: 'shop:unlink:' + s.id })
    ) +
    U.tabs(tabs.map(function (t, i) { return { t: t, n: i === 1 ? String(prods.length) : null }; }), v.tab || 0) +
    (v.tab === 1 ? U.filters({ ph: 'Tìm sản phẩm', q: v.q,
      right: U.btn('Đồng bộ lại', { sm: true, variant: 'ghost', icon: 'refresh', act: 'shop:sync:' + s.id }) }) : '') +
    body;
  };

  /* ============================================================ 9. Nhóm */
  P.members = function (c) {
    var db = S.data, v = c.v;
    var rows = db.members.filter(function (m) {
      if (fv(v, 'role') && m.role !== v.f.role) return false;
      return hit(v.q, [m.name, m.email, m.shops]);
    });
    return c.head(U.btn('Mời thành viên', { variant: 'primary', icon: 'plus', act: 'member:new' })) +
    U.filters({ ph: 'Tìm thành viên', q: v.q,
      quick: U.sel('Vai trò', 'role', v.f.role, ['all', 'Chủ', 'Quản lý', 'BD', 'Chỉ xem']),
      chips: chips(v, FLABEL),
      right: '<span class="ig-fmeta"><b class="gm-num">' + rows.length + '</b> thành viên</span>' }) +
    U.table({
      sort: v.sort, dir: v.dir || -1,
      cols: [
        { k: 'name', t: 'Thành viên', s: 'name', r: function (r) {
          return '<div class="gm-entity">' + (r.name === db.settings.profile.name ? U.bear() :
            '<span class="gm-avatar">' + U.esc(U.initials(r.name)) + '</span>') +
            '<div><div class="name">' + U.esc(r.name) + '</div><div class="meta">' + U.esc(r.email) + '</div></div></div>'; } },
        { k: 'role', t: 'Vai trò', r: function (r) {
          return '<button class="gm-tag gm-tag-ink" data-pick="member:' + r.id +
            '" data-opts="' + U.attr(JSON.stringify(['Chủ', 'Quản lý', 'BD', 'Chỉ xem'])) + '">' +
            U.esc(r.role) + ic('down') + '</button>'; } },
        { k: 'shops', t: 'Cửa hàng được giao' },
        { k: 'status', t: 'Trạng thái', r: function (r) { return U.tag(r.status); } },
        { k: 'last', t: 'Đăng nhập gần nhất' },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          return U.iconBtn('store', 'Giao shop', 'member:shops:' + r.id) +
            U.btn(r.status === 'Đã khóa' ? 'Mở khóa' : 'Khóa', { sm: true, variant: 'ghost', act: 'member:lock:' + r.id }) +
            U.iconBtn('trash', 'Xóa', 'member:del:' + r.id); } }
      ],
      rows: rows
    });
  };

  P.roles = function (c) {
    var v = c.v, db = S.data;
    var ROLES = ['Chủ', 'Quản lý', 'BD', 'Chỉ xem'];
    var role = v.f.role || 'Quản lý';
    var mods = ['Tổng quan', 'Creator', 'Chiến dịch', 'Hàng mẫu', 'Tự động hóa', 'GOPUSH AI', 'Báo cáo', 'Cửa hàng', 'Nhóm', 'Cài đặt & Gói'];
    var M = {
      'Chủ': function () { return [1, 1, 1, 1, 1]; },
      'Quản lý': function (m) { return m === 'Cài đặt & Gói' ? [1, 0, 1, 0, 0] : (m === 'Tổng quan' ? [1, 0, 0, 0, 0] : [1, 1, 1, m === 'Hàng mẫu' ? 0 : 1, m === 'Báo cáo' ? 0 : 1]); },
      'BD': function (m) { return ['Creator', 'Chiến dịch', 'Hàng mẫu'].indexOf(m) > -1 ? [1, 1, 1, 0, 1] : [1, 0, 0, 0, 0]; },
      'Chỉ xem': function () { return [1, 0, 0, 0, 0]; }
    };
    return c.head(U.btn('Tạo vai trò', { icon: 'plus', act: 'role:new' })) +
    '<div class="ig-section">' +
      '<div class="ig-grid ig-grid-3">' + ROLES.map(function (r) {
        var cnt = db.members.filter(function (m) { return m.role === r; }).length;
        var desc = { 'Chủ': 'Toàn quyền, kể cả gói và thanh toán', 'Quản lý': 'Mọi nghiệp vụ trên shop được giao',
          'BD': 'Tìm, mời, nhắn và chăm sóc Creator', 'Chỉ xem': 'Xem báo cáo và dữ liệu, không thao tác' }[r];
        return '<button class="ig-rolecard' + (role === r ? ' on' : '') + '" data-do="f:role:' + r + '">' +
          '<span class="h"><b>' + r + '</b><span class="gm-badge">' + cnt + ' người</span></span>' +
          '<span class="d">' + desc + '</span></button>';
      }).join('') + '</div>' +
      '<h2>Ma trận quyền — ' + U.esc(role) + '</h2>' +
      '<div style="overflow-x:auto"><table class="ig-matrix"><thead><tr><th>Module</th>' +
        ['Xem', 'Tạo', 'Sửa', 'Xóa', 'Gửi'].map(function (a) { return '<th>' + a + '</th>'; }).join('') +
      '</tr></thead><tbody>' + mods.map(function (m) {
        return '<tr><td>' + m + '</td>' + M[role](m).map(function (x) {
          return '<td class="' + (x ? 'yes' : 'no') + '">' + (x ? '✓' : '—') + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>' +
    '</div>';
  };

  P.audit = function (c) {
    var db = S.data, v = c.v;
    var rows = db.audit.filter(function (a) {
      if (fv(v, 'who') && a.who !== v.f.who) return false;
      if (fv(v, 'kind') && a.kind !== v.f.kind) return false;
      return hit(v.q, [a.act, a.who, a.shop, a.kind]);
    });
    var shown = page(rows, v);
    return c.head(U.btn('Xuất Excel', { icon: 'download', act: 'export:audit' })) +
    U.filters({
      ph: 'Tìm trong nhật ký', q: v.q,
      quick: U.sel('Người thực hiện', 'who', v.f.who, ['all'].concat(db.members.map(function (m) { return m.name; })).concat(['Hệ thống', 'Tự động hóa'])) +
        U.sel('Loại thao tác', 'kind', v.f.kind, ['all', 'Creator', 'Chiến dịch', 'Hàng mẫu', 'Cài đặt', 'Đồng bộ', 'Nhóm', 'Khác']),
      chips: chips(v, FLABEL),
      right: '<span class="ig-fmeta"><b class="gm-num">' + rows.length + '</b> bản ghi</span>'
    }) +
    U.table({
      cols: [{ k: 'at', t: 'Thời gian' }, { k: 'who', t: 'Người thực hiện' },
        { k: 'kind', t: 'Loại', r: function (r) { return '<span class="gm-tag">' + U.esc(r.kind) + '</span>'; } },
        { k: 'act', t: 'Thao tác' }, { k: 'shop', t: 'Cửa hàng' }],
      rows: shown
    }) +
    U.pager({ page: v.page, size: SIZE, total: rows.length });
  };

  /* ============================================================ 10. Cài đặt & Gói */
  P.profile = function (c) {
    var p = S.data.settings.profile;
    return c.head(U.btn('Lưu thay đổi', { variant: 'primary', act: 'save:settings' })) +
    '<div class="ig-section"><div class="ig-dash ig-dash-2">' +
      U.card({
        title: 'Thông tin cá nhân',
        body: '<div class="ig-me">' + U.bear() +
            '<div class="t"><b>' + U.esc(p.name) + '</b><span class="gm-tag gm-tag-outline"><i class="gm-dot" style="color:var(--accent-bright)"></i>Chủ tài khoản</span>' +
            '<small>' + U.esc(p.email) + '</small></div>' +
            U.btn('Đổi ảnh đại diện', { sm: true, act: 'toast:Tính năng đổi ảnh sẽ mở khi kết nối tài khoản' }) + '</div>' +
          '<div class="ig-form-2">' +
            U.field('Tên hiển thị', U.input({ value: p.name, bind: 'profile.name' })) +
            U.field('Số điện thoại', U.input({ value: p.phone, bind: 'profile.phone' })) +
            '<div class="span2">' + U.field('Email', U.input({ value: p.email, bind: 'profile.email' })) + '</div>' +
            U.field('Ngôn ngữ giao diện', U.select(p.lang, { pick: 'set:profile.lang', opts: ['Tiếng Việt', 'English'] })) +
            U.field('Múi giờ', U.select(p.tz, { pick: 'set:profile.tz', opts: ['(UTC+7) Hồ Chí Minh', '(UTC+7) Bangkok', '(UTC+8) Kuala Lumpur'] })) +
          '</div>'
      }) +
      U.card({
        title: 'Bảo mật',
        body: U.field('Mật khẩu', U.input({ type: 'password', value: '••••••••••' })) +
          '<div style="height:8px"></div>' +
          U.btn('Đổi mật khẩu', { sm: true, act: 'toast:Đã gửi liên kết đổi mật khẩu tới email' }) +
          '<div style="height:12px"></div>' +
          U.switchRow('Bảo mật 2 lớp (2FA)', p.twofa, 'Ứng dụng xác thực · đã bật 12/08/2026', 'set:profile.twofa') +
          U.switchRow('Cảnh báo đăng nhập từ thiết bị mới', p.newDevice, null, 'set:profile.newDevice') +
          '<div style="height:12px"></div>' + U.btn('Đăng xuất mọi thiết bị', { icon: 'logout', act: 'toast:Đã đăng xuất khỏi mọi thiết bị khác' })
      }) +
    '</div></div>';
  };

  P.billing = function (c) {
    var b = S.data.settings.billing, db = S.data;
    var usage = [['Cửa hàng', db.shops.length, 10], ['Thành viên', db.members.length, 15],
      ['Lời mời mỗi ngày', c.shop.used, S.quota(c.shop.id).cap || 1]];
    return c.head(U.btn('Đổi gói', { variant: 'primary', act: 'billing:plan' })) +
    '<div class="ig-section">' +
      '<div class="ig-dash ig-dash-2">' +
        U.card({
          title: 'Gói hiện tại', actions: '<span class="gm-tag gm-tag-ink">' + U.esc(b.plan) + '</span>',
          body: U.kv([['Chu kỳ', b.cycle], ['Giá', b.price], ['Phương thức', b.method]]) +
            '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">' +
            U.btn('Đổi gói', { sm: true, act: 'billing:plan' }) +
            U.btn('Đổi phương thức', { sm: true, variant: 'ghost', act: 'toast:Mở cổng thanh toán khi phát hành ra ngoài' }) + '</div>'
        }) +
        U.card({
          title: 'Hạn mức đã dùng',
          body: usage.map(function (r) {
            return '<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:13px">' +
              '<span>' + r[0] + '</span><span class="gm-num gm-secondary">' + r[1] + ' / ' + r[2] + '</span></div>' +
              '<span style="display:block;width:100%;height:6px;border-radius:3px;background:var(--border);overflow:hidden;margin-top:6px">' +
              '<i style="display:block;height:100%;background:var(--accent-dark);width:' + Math.min(100, r[1] / r[2] * 100) + '%"></i></span></div>';
          }).join('')
        }) +
      '</div>' +
      U.card({
        title: 'Lịch sử hóa đơn', cls: 'gm-card-tablewrap',
        body: U.table({
          cols: [{ k: 'id', t: 'Mã hóa đơn' }, { k: 'd', t: 'Ngày' }, { k: 'p', t: 'Gói' },
            { k: 'a', t: 'Số tiền', cls: 'num' }, { k: 'st', t: 'Trạng thái', r: function (r) { return U.tag(r.st); } },
            { k: '', t: '', cls: 'col-actions', r: function (r) {
              return U.iconBtn('download', 'Tải hóa đơn', 'invoice:' + r.id); } }],
          rows: db.invoices
        })
      }) +
    '</div>';
  };

  P.notifications = function (c) {
    var n = S.data.settings.notify;
    return c.head(U.btn('Lưu thay đổi', { variant: 'primary', act: 'save:settings' })) +
    '<div class="ig-section">' +
      U.banner('Zalo OA cần kết nối một lần ở mục Cài đặt &gt; Kết nối. Email gửi tới địa chỉ trong hồ sơ.') +
      U.card({
        title: 'Kênh nhận thông báo',
        body: '<div style="overflow-x:auto"><table class="ig-matrix"><thead><tr><th>Sự kiện</th><th>Email</th><th>Zalo OA</th><th>Trong app</th></tr></thead><tbody>' +
          Object.keys(n).map(function (k) {
            return '<tr><td>' + U.esc(k) + '</td>' + n[k].map(function (v, i) {
              return '<td><span class="gm-switch' + (v ? ' on' : '') + '" data-do="notify:' + U.attr(k) + ':' + i + '"></span></td>';
            }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>'
      }) +
    '</div>';
  };

  /* ============================================================ drawer hồ sơ Creator */
  P.creatorDrawer = function (id, shopId) {
    var cr = S.creator(id);
    if (!cr) return '';
    var r = S.rel(cr, shopId), db = S.data;
    var samples = db.samples.filter(function (s) { return s.creatorId === id; });
    var vids = samples.filter(function (s) { return s.video; });

    /* dòng thời gian quan hệ: [thời điểm (giây, để sắp xếp), nhãn thời gian, nội dung, icon] */
    var timeline = [], shopSamples = samples.filter(function (s) { return s.shopId === shopId; });
    shopSamples.forEach(function (s) {
      timeline.push([s.requestAt, S.tsShort(s.requestAt), 'Xin mẫu ' + s.productInfo.title + ' — ' + S.sampleLabel(s.status), 'box']);
      if (s.logisticsInfo && s.logisticsInfo.signedAt) timeline.push([s.logisticsInfo.signedAt, S.tsShort(s.logisticsInfo.signedAt),
        'Ký nhận mẫu qua ' + s.logisticsInfo.carrierName, 'truck']);
      (s.contents || []).forEach(function (x) {
        timeline.push([x.publishedAt, S.tsShort(x.publishedAt), 'Đăng ' + (x.type === 'LIVE' ? 'LIVE' : 'video') + ' · ' +
          S.money(x.views) + ' lượt xem · ' + x.orders + ' đơn', 'play']);
      });
    });
    db.campaigns.filter(function (cp) { return cp.shopId === shopId && cp.sent; }).forEach(function (cp) {
      if (P.campMembers(cp).indexOf(cr) > -1) timeline.push([0, cp.at, 'Có trong chiến dịch “' + cp.name + '” (' + cp.status + ')', 'send']);
    });
    if (r.invitedAt) timeline.push([0, r.invitedAt, 'Nhận lời mời hợp tác từ ' + S.shop(shopId).name, 'send']);
    timeline.sort(function (a, b) { return b[0] - a[0]; });
    var tgmv = 0, tord = 0;
    shopSamples.forEach(function (s) { (s.contents || []).forEach(function (x) { tgmv += x.gmv; tord += x.orders; }); });
    if (!timeline.length) timeline.push([0, '—', 'Chưa có hoạt động với cửa hàng này', 'clock']);

    return '<div class="ig-overlay" data-do="drawer:close"></div><aside class="ig-drawer" role="dialog" aria-label="Hồ sơ Creator">' +
      '<header><span class="gm-avatar">' + U.esc(U.initials(cr.name)) + '</span>' +
        '<div class="t"><strong>' + U.esc(cr.name) + U.tiktok(cr.tiktok) + '</strong>' +
        '<span>@' + U.esc(cr.user) + ' · ' + U.esc(cr.cat) + ' · ' + U.esc(cr.country) + '</span></div>' +
        U.tag(r.state) + U.iconBtn('x', 'Đóng', 'drawer:close') + '</header>' +
      '<div class="scroll">' +
        U.stats([
          { v: S.money(cr.followers), l: 'Follower' }, { v: S.money(cr.gmv30), l: 'GMV 30 ngày' },
          { v: cr.postRate + '%', l: 'Tỉ lệ đăng' }, { v: S.money(cr.gpm), l: 'GPM' }
        ]) +
        U.card({
          title: 'Chỉ số chi tiết',
          body: U.kv([
            ['Hạng mục', TT.catL1Name(cr.cat2) + ' › ' + cr.cat],
            ['Loại nội dung', ctype(cr)], ['Lượt xem TB/video', S.money(cr.avgViews)],
            ['Người xem TB/live', S.num(cr.liveViewers)], ['Số món bán 30 ngày', S.num(cr.unitsSold)],
            ['Tỷ lệ tương tác', S.pct(cr.engagement)],
            ['Hoa hồng trung bình', cr.avgCommission + '%'],
            ['Agency', cr.agency === 1 ? 'Có agency' : 'Độc lập'],
            ['Khán giả', audience(cr)],
            ['Liên hệ', cr.contact ? U.esc(cr.email || cr.phone) : '<span class="gm-muted">Chưa có</span>', true]
          ])
        }) +
        U.card({
          title: 'Hành trình với ' + S.shop(shopId).name,
          body: '<div class="ig-crsum"><span><b class="gm-num">' + shopSamples.length + '</b> mẫu</span>' +
              '<span><b class="gm-num">' + shopSamples.reduce(function (a, s) { return a + (s.contents || []).length; }, 0) + '</b> nội dung</span>' +
              '<span><b class="gm-num">' + S.num(tord) + '</b> đơn</span><span><b class="gm-num">' + S.money(tgmv) + '</b> GMV mang về</span></div>' +
            '<ul class="ig-timeline">' + timeline.slice(0, 12).map(function (t) {
            return '<li><span class="pin"><i></i><span></span></span><span class="tx">' + ic(t[3]) + ' ' + U.esc(t[2]) +
              '<small>' + U.esc(t[1]) + '</small></span></li>';
          }).join('') + '</ul>'
        }) +
        U.card({
          title: 'Hàng mẫu và video',
          body: U.kv([
            ['Đã xin mẫu', samples.length + ' lần'],
            ['Đã nhận mẫu', samples.filter(function (s) { return ['CONTENT_PENDING', 'COMPLETED'].indexOf(s.status) > -1; }).length + ' lần'],
            ['Video đã lên', String(vids.length)]
          ]) + (vids.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
            vids.slice(0, 4).map(function (s) {
              return '<a class="ig-vid" href="' + U.attr(s.video) + '" target="_blank" rel="noopener">' + ic('play') +
                U.esc(s.productInfo.title.slice(0, 18)) + '</a>';
            }).join('') + '</div>' : '')
        }) +
        U.card({
          title: 'Nhãn và ghi chú nội bộ',
          body: '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">' +
            (r.tags.length ? r.tags.map(function (tid) {
              var t = S.tag(tid);
              return t ? '<span class="gm-chip">' + U.esc(t.name) + '<button data-do="untag:' + cr.id + ':' + tid + '">' + ic('x') + '</button></span>' : '';
            }).join('') : '<span class="gm-muted">Chưa gắn nhãn</span>') +
            U.btn('Gắn nhãn', { sm: true, variant: 'ghost', icon: 'plus', act: 'tagpick:' + cr.id }) + '</div>' +
            U.textarea({ ph: 'Ghi chú nội bộ, chỉ nhóm nhìn thấy…', rows: 3, value: r.note, bind: 'note.' + cr.id }) +
            '<div style="margin-top:12px">' + U.field('Người phụ trách',
              U.select(r.owner, { pick: 'owner:' + cr.id, opts: ['user01', 'Lê Quốc Huy', 'Ngô Thảo Vy'] })) + '</div>'
        }) +
      '</div>' +
      '<footer>' +
        U.btn('Nhắn tin', { icon: 'msgSend', act: 'message:' + cr.id }) +
        (r.state === 'Mới' ? U.btn('Mời hợp tác', { variant: 'primary', icon: 'send', act: 'invite:' + cr.id })
          : U.btn('Thêm vào chiến dịch', { variant: 'primary', icon: 'send', act: 'bulk:inviteOne:' + cr.id })) +
        '<span style="flex:1"></span>' + U.btn('Blacklist', { variant: 'danger', icon: 'ban', act: 'black:add:' + cr.id }) +
      '</footer></aside>';
  };

  /* ============================================================ trang công khai */
  function pubNav(lang) {
    return '<nav class="ig-pub-nav"><a class="ig-brand" href="#/">' + U.logo() + '</a>' +
      '<span class="spacer"></span>' +
      '<a href="#/privacy">' + (lang === 'en' ? 'Privacy' : 'Bảo mật') + '</a>' +
      '<a href="#/terms">' + (lang === 'en' ? 'Terms' : 'Điều khoản') + '</a>' +
      '<a class="gm-btn gm-btn-sm" href="#/login" style="text-decoration:none">' + (lang === 'en' ? 'Sign in' : 'Đăng nhập') + '</a>' +
      '<a class="gm-btn gm-btn-sm gm-btn-primary" href="#/home" style="text-decoration:none">' +
      (lang === 'en' ? 'Open the app' : 'Vào ứng dụng') + '</a></nav>';
  }
  function pubFoot() {
    return '<footer class="ig-pub-foot"><div class="ig-wrap"><span>© 2026 GoMax Digital</span>' +
      '<a href="#/privacy">Chính sách bảo mật</a><a href="#/terms">Điều khoản sử dụng</a>' +
      '<span style="flex:1"></span><span>GOPUSH v0.2</span></div></footer>';
  }

  P.landing = function (c) {
    return '<div class="ig-public">' + pubNav(c.lang) +
      '<div class="ig-wrap"><section class="ig-hero">' +
        '<div class="ig-hero-mark">' + U.logo(null, true) + '</div>' +
        '<h1>Quản lý affiliate Creator cho TikTok Shop</h1>' +
        '<p>Kết nối với shop qua API chính thức (ISV) thay vì cookie hay RPA. Tìm Creator, mời hàng loạt, duyệt hàng mẫu, theo vận đơn và đo GMV — tất cả trong một nơi.</p>' +
        '<div class="cta"><a class="gm-btn gm-btn-primary" href="#/signup" style="text-decoration:none">Dùng thử</a>' +
        '<a class="gm-btn" href="#/home" style="text-decoration:none">Xem bản demo</a></div>' +
      '</section>' +
      '<section class="ig-features">' + [
        ['shield', 'Chính thức', 'Mọi thao tác đi qua API được cấp quyền. Mỗi shop cấp quyền OAuth riêng, có hạn dùng và nhật ký.'],
        ['store', 'Theo shop', 'Chọn shop ở đầu trang; mọi dữ liệu và thao tác gắn với shop đó. Tổng quan và báo cáo xem gộp được.'],
        ['team', 'Theo nhóm', 'Tài khoản chính, tài khoản con, phân quyền theo vai trò và theo shop.'],
        ['lock', 'An toàn cho shop', 'Giới hạn gửi mỗi ngày, giãn cách, blacklist mặc định và nhật ký mọi thao tác.']
      ].map(function (f) {
        return '<article class="ig-feature">' + ic(f[0]) + '<h3>' + f[1] + '</h3><p>' + f[2] + '</p></article>';
      }).join('') + '</section>' +
      '<section style="padding-bottom:32px"><h2 style="font-size:16px;margin:0 0 12px">Luồng người dùng chính</h2>' +
        '<div class="ig-flow">' + [
          ['Bước 1', 'Đăng ký và ủy quyền shop'], ['Bước 2', 'Tìm Creator và lưu vào Kho'],
          ['Bước 3', 'Lời mời / nhắn tin hàng loạt'], ['Bước 4', 'Duyệt hàng mẫu'],
          ['Bước 5', 'Theo dõi vận đơn'], ['Bước 6', 'Báo cáo GMV, hoa hồng']
        ].map(function (s) { return '<div class="s"><b>' + s[0] + '</b>' + s[1] + '</div>'; }).join('') + '</div>' +
        '<p class="gm-help" style="margin-top:12px">Tự động hóa thay người dùng lặp lại bước 3 và nhắc Creator ở bước 5.</p>' +
      '</section></div>' + pubFoot() + '</div>';
  };

  function gLogo() {
    return '<svg class="ig-gsvg" viewBox="0 0 48 48" aria-hidden="true">' +
      '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
      '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
      '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
      '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
      '</svg>';
  }

  function authPage(o) {
    return '<div class="ig-auth-split">' +
      '<aside class="ig-auth-art">' +
        '<img src="' + U.img('auth.png') + '" alt="Lời mời hợp tác gửi tới Creator trên TikTok Shop">' +
        '<div class="cap"><h2>Mời Creator hợp tác, đo kết quả tới từng đơn</h2>' +
          '<p>Kết nối shop qua API chính thức, tìm và mời Creator hàng loạt, duyệt hàng mẫu rồi theo GMV về tận nơi — trong một nơi duy nhất.</p>' +
          '<ul><li>' + ic('shield') + 'API chính thức (ISV)</li><li>' + ic('users') + '4.29 triệu Creator</li>' +
          '<li>' + ic('lock') + 'An toàn cho shop</li></ul></div>' +
      '</aside>' +
      '<main class="ig-auth-pane"><div class="ig-auth-card">' +
        '<header><a href="#/">' + U.logo(null, true) + '</a>' +
        '<h1>' + o.title + '</h1><p>' + o.sub + '</p></header>' +
        '<button class="gm-btn ig-gbtn" data-do="auth:google">' + gLogo() + U.esc(o.google) + '</button>' +
        '<div class="ig-or">hoặc</div>' + o.body +
        '<div class="ig-auth-foot">' + o.foot + '</div>' +
        '<a class="ig-auth-back" href="#/">' + ic('back') + 'Về trang giới thiệu</a>' +
      '</div></main></div>';
  }

  P.login = function (c) {
    return authPage({
      title: 'Đăng nhập', sub: 'Dùng tài khoản GoMax của bạn', google: 'Đăng nhập bằng Google',
      body: U.field('Email', U.input({ ph: 'ten@congty.vn', icon: 'mail', value: S.data.settings.profile.email })) +
        U.field('Mật khẩu', U.input({ type: 'password', ph: '••••••••', icon: 'lock', value: '12345678' })) +
        '<div class="ig-auth-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer">' +
        '<span class="gm-check on"></span>Ghi nhớ đăng nhập</label>' +
        '<a class="gm-link" data-do="toast:Đã gửi liên kết đặt lại mật khẩu">Quên mật khẩu?</a></div>' +
        '<a class="gm-btn gm-btn-primary" href="#/home" style="text-decoration:none">Đăng nhập</a>',
      foot: 'Chưa có tài khoản? <a class="gm-link" href="#/signup">Đăng ký</a>'
    });
  };

  P.signup = function (c) {
    return authPage({
      title: 'Tạo tài khoản', sub: 'Onboarding 3 bước: tạo tài khoản → ủy quyền shop đầu tiên → mời thành viên',
      google: 'Đăng ký bằng Google',
      body: U.steps(['Tài khoản', 'Ủy quyền shop', 'Mời thành viên'], 0) +
        U.field('Tên hiển thị', U.input({ ph: 'user01' })) +
        U.field('Email công việc', U.input({ ph: 'ten@congty.vn', icon: 'mail' })) +
        U.field('Mật khẩu', U.input({ type: 'password', ph: 'Ít nhất 8 ký tự', icon: 'lock' })) +
        '<p class="gm-help" style="margin:0">Bấm Tiếp tục là bạn đồng ý với <a class="gm-link" href="#/terms">Điều khoản sử dụng</a> và <a class="gm-link" href="#/privacy">Chính sách bảo mật</a>.</p>' +
        '<a class="gm-btn gm-btn-primary" href="#/shops" style="text-decoration:none">Tiếp tục: ủy quyền shop</a>',
      foot: 'Đã có tài khoản? <a class="gm-link" href="#/login">Đăng nhập</a>'
    });
  };

  function doc(c, title, sections) {
    return '<div class="ig-public">' + pubNav(c.lang) +
      '<div class="ig-wrap ig-doc"><h1>' + title + '</h1>' +
      '<p class="upd">Cập nhật lần cuối 24/09/2026 · GoMax Digital</p>' +
      sections.map(function (s) {
        return '<h2>' + s[0] + '</h2>' + (Array.isArray(s[1])
          ? '<ul>' + s[1].map(function (li) { return '<li>' + li + '</li>'; }).join('') + '</ul>'
          : '<p>' + s[1] + '</p>');
      }).join('') + '</div>' + pubFoot() + '</div>';
  }

  P.privacy = function (c) {
    return doc(c, 'Chính sách bảo mật', [
      ['1. Dữ liệu GOPUSH thu thập', 'GOPUSH lưu thông tin tài khoản người dùng (họ tên, email, vai trò), thông tin cửa hàng TikTok Shop được ủy quyền và dữ liệu Creator lấy về qua API chính thức của TikTok Shop Partner.'],
      ['2. Cách dùng dữ liệu', ['Hiển thị và lọc Creator trong Tìm Creator và Kho Creator.', 'Gửi lời mời hợp tác và tin nhắn thay mặt cửa hàng đã ủy quyền.', 'Tổng hợp báo cáo GMV, đơn hàng, hoa hồng cho chính cửa hàng đó.']],
      ['3. Chia sẻ dữ liệu', 'GOPUSH không bán dữ liệu. Dữ liệu chỉ hiển thị cho thành viên trong nhóm được phân quyền trên cửa hàng tương ứng.'],
      ['4. Lưu trữ và xóa', 'Dữ liệu Creator sao lưu trong database của GOPUSH theo thời hạn quy định tại điều khoản dữ liệu của TikTok Shop Partner. Người dùng có thể yêu cầu xóa toàn bộ dữ liệu của mình bất kỳ lúc nào.'],
      ['5. Bảo mật', 'Kết nối mã hóa TLS, token OAuth lưu ở dạng mã hóa, bật bảo mật 2 lớp cho tài khoản, ghi nhật ký mọi thao tác tác động tới shop.'],
      ['6. Liên hệ', 'Mọi câu hỏi về quyền riêng tư: privacy@gomax.vn.']
    ]);
  };

  P.terms = function (c) {
    return doc(c, 'Điều khoản sử dụng', [
      ['1. Phạm vi', 'GOPUSH là công cụ quản lý affiliate Creator cho TikTok Shop do GoMax Digital phát hành. Sử dụng GOPUSH đồng nghĩa với việc chấp nhận các điều khoản dưới đây.'],
      ['2. Tài khoản và ủy quyền', 'Người dùng chịu trách nhiệm bảo mật tài khoản của mình và chỉ ủy quyền những cửa hàng mà mình có quyền quản lý hợp pháp.'],
      ['3. Cách dùng được phép', ['Chỉ thao tác với TikTok Shop qua API được cấp quyền.', 'Không dùng GOPUSH để spam, quấy rối hoặc gửi nội dung sai sự thật tới Creator.', 'Tôn trọng giới hạn gửi và giãn cách mà hệ thống áp dụng.']],
      ['4. Giới hạn trách nhiệm', 'GOPUSH phụ thuộc vào tính sẵn sàng của API TikTok Shop. GoMax Digital không chịu trách nhiệm cho gián đoạn phát sinh từ phía nền tảng.'],
      ['5. Gói dịch vụ', 'Giai đoạn dùng nội bộ không tính phí. Khi phát hành ra ngoài, gói và hạn mức được công bố tại trang Gói &amp; thanh toán.'],
      ['6. Thay đổi điều khoản', 'GoMax Digital có thể cập nhật điều khoản và sẽ thông báo trong app trước ít nhất 14 ngày.']
    ]);
  };

  /* ============================================================ phạm vi shop */
  /* 'all' = mọi shop; ngược lại là id của một shop */
  function inScope(scope, shopId) { return scope === 'all' || scope === shopId; }
  function shopCell(id) { var sh = S.shop(id); return '<span class="nw">' + sh.flag + ' ' + U.esc(sh.name) + '</span>'; }

  /* ============================================================ Việc cần xử lý */
  /* Hàng đợi tính từ dữ liệu thật mỗi lần mở; chỉ trạng thái (xong / người nhận)
     được lưu, theo khóa ổn định của từng việc. sev: 0 thường · 2 cảnh báo · 4 khẩn */
  function inboxState() { if (!S.data.inboxState) S.data.inboxState = {}; return S.data.inboxState; }

  P.inboxItems = function (scope) {
    var db = S.data, out = [], mem = inboxState();
    function add(o) {
      var st = mem[o.key] || {};
      o.done = !!st.done; o.doneAt = st.doneAt || '';
      o.owner = st.owner || S.shop(o.shopId).owner || 'user01';
      o.shopName = S.shop(o.shopId).name;
      out.push(o);
    }
    db.shops.forEach(function (sh) {
      if (!inScope(scope, sh.id)) return;
      var st = S.stats(sh.id), q = S.quota(sh.id);
      if (sh.status === 'err') add({ key: 'auth-' + sh.id, sev: 4, icon: 'alert', kind: 'Ủy quyền', shopId: sh.id,
        title: sh.name + ' đã hết hạn ủy quyền', sub: 'Dừng đồng bộ và gửi cho tới khi ủy quyền lại', due: 'Ngay',
        cta: 'Ủy quyền lại', go: '/shops/' + sh.id });
      else if (sh.status === 'warn') add({ key: 'auth-' + sh.id, sev: 2, icon: 'alert', kind: 'Ủy quyền', shopId: sh.id,
        title: sh.name + ' sắp hết hạn ủy quyền', sub: 'Token hết hạn ' + sh.expires, due: sh.expires,
        cta: 'Gia hạn', go: '/shops/' + sh.id });
      if (st.pending) add({ key: 'pend-' + sh.id, sev: st.pending > 10 ? 2 : 0, icon: 'box', kind: 'Hàng mẫu', shopId: sh.id,
        title: st.pending + ' yêu cầu hàng mẫu chờ duyệt', sub: 'TikTok tự hủy yêu cầu sau 7 ngày không xử lý', due: 'Hôm nay',
        cta: 'Duyệt', go: '/s/' + sh.id + '/samples' });
      if (st.lateNoVideo) add({ key: 'late-' + sh.id, sev: 2, icon: 'truck', kind: 'Vận đơn', shopId: sh.id,
        title: st.lateNoVideo + ' Creator nhận mẫu quá 5 ngày chưa đăng', sub: 'Nên gửi nhắc kèm hạn đăng', due: 'Hôm nay',
        cta: 'Gửi nhắc', go: '/s/' + sh.id + '/samples/shipments' });
      var fail = db.samples.filter(function (s) { return s.shopId === sh.id && s.logisticsInfo && s.logisticsInfo.syncStatus === 'FAILED'; }).length;
      if (fail) add({ key: 'sync-' + sh.id, sev: 2, icon: 'refresh', kind: 'Vận đơn', shopId: sh.id,
        title: fail + ' vận đơn đồng bộ thất bại', sub: 'Hành trình có thể chưa cập nhật', due: 'Hôm nay',
        cta: 'Đồng bộ lại', go: '/s/' + sh.id + '/samples/shipments' });
      if (q.cap && q.used / q.cap >= 0.8) add({ key: 'quota-' + sh.id, sev: 0, icon: 'send', kind: 'Hạn mức', shopId: sh.id,
        title: 'Đã dùng ' + Math.round(q.used / q.cap * 100) + '% hạn mức lời mời hôm nay', sub: S.num(q.used) + ' / ' + S.num(q.cap) + ' lời mời',
        due: 'Hôm nay', cta: 'Xem chiến dịch', go: '/s/' + sh.id + '/campaigns/invites' });
    });
    db.campaigns.forEach(function (cp) {
      if (!inScope(scope, cp.shopId)) return;
      if (cp.status === 'Lỗi') add({ key: 'cerr-' + cp.id, sev: 4, icon: 'x', kind: 'Chiến dịch', shopId: cp.shopId,
        title: 'Chiến dịch “' + cp.name + '” lỗi', sub: cp.sent + '/' + cp.total + ' đã gửi · dừng giữa chừng', due: 'Ngay',
        cta: 'Xem lỗi', go: '/s/' + cp.shopId + '/campaigns/c/' + cp.id });
      else if (cp.status === 'Đang chạy' && cp.endDays <= 3) add({ key: 'cend-' + cp.id, sev: 2, icon: 'clock', kind: 'Chiến dịch', shopId: cp.shopId,
        title: '“' + cp.name + '” hết hạn sau ' + cp.endDays + ' ngày', sub: 'Gia hạn nếu còn Creator đang cân nhắc', due: cp.end,
        cta: 'Gia hạn', go: '/s/' + cp.shopId + '/campaigns/c/' + cp.id });
    });
    (db.autoInvites || []).forEach(function (r) {
      if (!inScope(scope, r.shopId) || !r.on || !/[1-9]\d* lỗi/.test(r.last)) return;
      add({ key: 'auto-' + r.id + '-' + r.last, sev: 2, icon: 'orbit', kind: 'Tự động hóa', shopId: r.shopId,
        title: 'Quy tắc “' + r.name + '” chạy có lỗi', sub: r.last, due: 'Hôm nay', cta: 'Xem quy tắc', go: '/s/' + r.shopId + '/auto/invites' });
    });
    out.sort(function (a, b) { return (a.done - b.done) || (b.sev - a.sev); });
    return out;
  };

  var SEV = { 4: ['Khẩn', 'gm-tag-red'], 2: ['Cảnh báo', 'gm-tag-orange'], 0: ['Thường', 'gm-tag-ink'] };

  P.inbox = function (c) {
    var v = c.v, me = S.data.settings.profile.name;
    var all = P.inboxItems(c.scope);
    var open = all.filter(function (x) { return !x.done; });
    var lists = [open, open.filter(function (x) { return x.owner === me; }), all.filter(function (x) { return x.done; })];
    var rows = lists[v.tab || 0].filter(function (x) {
      if (v.f.kind && v.f.kind !== 'all' && x.kind !== v.f.kind) return false;
      if (v.f.sev && v.f.sev !== 'all' && SEV[x.sev][0] !== v.f.sev) return false;
      return hit(v.q, [x.title, x.sub, x.shopName]);
    });
    var kinds = ['all'].concat(all.map(function (x) { return x.kind; }).filter(function (k, i, a) { return a.indexOf(k) === i; }));
    function cnt(sev) { return open.filter(function (x) { return x.sev === sev; }).length; }
    var owners = ['user01', 'Lê Quốc Huy', 'Ngô Thảo Vy', 'Phạm Đăng Khoa'];
    return c.head(U.btn('Cài đặt thông báo', { icon: 'bell', act: 'go:/settings/notifications' })) +
    '<div class="ig-section">' +
      '<div class="ig-kpis ig-kpis-4">' +
        '<div class="gm-stat ig-sev is-4"><span class="v">' + cnt(4) + '</span><span class="l">Khẩn · xử lý ngay</span></div>' +
        '<div class="gm-stat ig-sev is-2"><span class="v">' + cnt(2) + '</span><span class="l">Cảnh báo · trong ngày</span></div>' +
        '<div class="gm-stat ig-sev is-0"><span class="v">' + cnt(0) + '</span><span class="l">Thường</span></div>' +
        '<div class="gm-stat"><span class="v">' + lists[2].length + '</span><span class="l">Đã xong</span></div>' +
      '</div></div>' +
    U.tabs([{ t: 'Cần xử lý', n: String(open.length) }, { t: 'Giao cho tôi', n: String(lists[1].length) },
      { t: 'Đã xong', n: String(lists[2].length) }], v.tab) +
    U.filters({ ph: 'Tìm việc, shop…', q: v.q,
      quick: U.sel('Loại việc', 'kind', v.f.kind, kinds) + U.sel('Mức độ', 'sev', v.f.sev, ['all', 'Khẩn', 'Cảnh báo', 'Thường']),
      right: '<span class="ig-fmeta"><b class="gm-num">' + rows.length + '</b> việc</span>' }) +
    U.table({
      cols: [
        { k: '', t: 'Việc', r: function (r) {
          return '<div class="ig-inbox-t">' + chip(r.sev, r.icon) + '<div><b>' + U.esc(r.title) + '</b><span>' + U.esc(r.sub) + '</span></div></div>'; } },
        { k: '', t: 'Mức độ', r: function (r) { return '<span class="gm-tag ' + SEV[r.sev][1] + '">' + SEV[r.sev][0] + '</span>'; } },
        { k: '', t: 'Loại', r: function (r) { return U.esc(r.kind); } },
        { k: '', t: 'Cửa hàng', r: function (r) { return shopCell(r.shopId); } },
        { k: '', t: 'Người phụ trách', r: function (r) {
          return '<button class="gm-tag gm-tag-outline" data-pick="inbox:owner:' + U.attr(r.key) + '" data-opts="' +
            U.attr(JSON.stringify(owners)) + '">' + U.esc(r.owner) + ic('down') + '</button>'; } },
        { k: '', t: 'Hạn', r: function (r) { return r.done ? '<span class="gm-muted">Xong ' + U.esc(r.doneAt) + '</span>' : U.esc(r.due); } },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          return r.done ? U.btn('Mở lại', { sm: true, act: 'inbox:undo:' + r.key })
            : U.btn(r.cta, { sm: true, variant: r.sev === 4 ? 'primary' : 'soft', act: 'go:' + r.go }) +
              U.iconBtn('check', 'Đánh dấu đã xong', 'inbox:done:' + r.key); } }
      ],
      rows: rows,
      emptyTitle: v.tab === 2 ? 'Chưa có việc nào xong' : 'Không còn việc tồn',
      emptyText: 'Việc mới sẽ tự xuất hiện khi có mẫu chờ duyệt, vận đơn quá hạn hay chiến dịch lỗi.'
    });
  };

  /* ============================================================ Chi tiết chiến dịch */
  /* Creator trong một đợt: lấy ổn định từ những Creator đã có quan hệ với shop,
     xoay theo mã chiến dịch để mỗi đợt ra một nhóm khác nhau */
  function campSeed(cp) { var seed = 0; for (var i = 0; i < cp.id.length; i++) seed = (seed * 31 + cp.id.charCodeAt(i)) % 9973; return seed; }
  /* yêu cầu mẫu thuộc đợt: lát cắt ổn định của mẫu trong shop, cỡ theo bước "Xin mẫu" của phễu */
  function campSamples(cp) {
    var all = S.data.samples.filter(function (s) { return s.shopId === cp.shopId; });
    if (!all.length || !cp.accepted) return [];
    var n = Math.min(all.length, Math.max(1, Math.round(cp.accepted * 0.58 / 4))), seed = campSeed(cp), out = [];
    for (var k = 0; k < n; k++) out.push(all[(seed + k * 3) % all.length]);
    return out.filter(function (x, i, a) { return a.indexOf(x) === i; });
  }
  function campMembers(cp) {
    var pool = S.data.creators.filter(function (cr) { return cr.rel[cp.shopId] && cr.rel[cp.shopId].state !== 'Mới'; });
    if (pool.length < 12) pool = S.data.creators.slice(0, 80);
    var seed = campSeed(cp), out = [];
    campSamples(cp).forEach(function (sm) { var cr = S.creator(sm.creatorId); if (cr) out.push(cr); });
    var n = Math.min(cp.sent, pool.length, 60);
    for (var k = 0; out.length < n && k < pool.length * 2; k++) out.push(pool[(seed + k * 7) % pool.length]);
    return out.filter(function (x, i, a) { return a.indexOf(x) === i; });
  }
  P.campSamples = campSamples;
  P.campMembers = campMembers;

  function campFunnel(cp) {
    var req = Math.round(cp.accepted * 0.58), got = Math.round(req * 0.72), vid = Math.round(got * 0.66), ord = Math.round(vid * 0.79);
    return [{ l: 'Đã gửi', v: cp.sent, tab: 0 }, { l: 'Chấp nhận', v: cp.accepted, tab: 0, f: 'acc' },
      { l: 'Xin mẫu', v: req, tab: 1 }, { l: 'Nhận mẫu', v: got, tab: 1, f: 'got' },
      { l: 'Lên video/live', v: vid, tab: 2 }, { l: 'Có đơn', v: ord, tab: 3 }];
  }

  P['campaign-detail'] = function (c) {
    var db = S.data, v = c.v, cp = null;
    db.campaigns.forEach(function (x) { if (x.id === c.id) cp = x; });
    if (!cp) return c.head('', { title: 'Không tìm thấy chiến dịch', desc: 'Chiến dịch có thể đã bị xóa.' }) +
      '<div class="ig-section">' + U.empty('Không tìm thấy chiến dịch', 'Quay lại danh sách để chọn chiến dịch khác.',
        U.btn('Về danh sách', { sm: true, act: 'go:/s/' + c.shop.id + '/campaigns/invites' })) + '</div>';
    if (v.cid !== cp.id) { v.cid = cp.id; v.tab = 0; v.f = {}; v.q = ''; }
    var mem = campMembers(cp), steps = campFunnel(cp), tp = S.tpl(cp.templateId);
    var samples = campSamples(cp);
    var contents = [];
    samples.forEach(function (s) { (s.contents || []).forEach(function (x) { contents.push({ s: s, x: x }); }); });
    var gmv = contents.reduce(function (a, o) { return a + o.x.gmv; }, 0);
    var orders = contents.reduce(function (a, o) { return a + o.x.orders; }, 0);
    var accN = Math.round(mem.length * (cp.sent ? cp.accepted / cp.sent : 0));
    var listPath = '/s/' + cp.shopId + '/campaigns/' + (cp.kind === 'invite' ? 'invites' : 'messages');
    var p = cp.total ? Math.round(cp.sent / cp.total * 100) : 0;

    var head = c.head(
      (cp.status === 'Đang chạy' ? U.btn('Tạm dừng', { icon: 'pause', act: 'campaign:pause:' + cp.id })
        : cp.status !== 'Hoàn thành' ? U.btn('Chạy', { icon: 'play', act: 'campaign:run:' + cp.id }) : '') +
      U.btn('Bù Creator', { icon: 'userPlus', act: 'campaign:refill:' + cp.id }) +
      U.btn('Gia hạn 14 ngày', { icon: 'calendar', act: 'campaign:extend:' + cp.id }) +
      U.btn('Nhân bản', { icon: 'copy', act: 'campaign:dup:' + cp.id }) +
      U.iconBtn('trash', 'Xóa chiến dịch', 'campaign:del:' + cp.id),
      { title: cp.name, desc: (cp.kind === 'invite' ? 'Lời mời' : 'Nhắn tin') + ' · mẫu ' + (tp ? tp.name : '—') + ' · ' +
        cp.prodCount + ' sản phẩm · ' + cp.start + ' → ' + cp.end + ' · tạo bởi ' + cp.by,
        crumb: '<a href="#' + listPath + '">' + (cp.kind === 'invite' ? 'Chiến dịch lời mời' : 'Nhắn tin hàng loạt') + '</a>' + ic('right') +
          '<span>' + U.esc(cp.ttId || cp.id) + '</span>' + U.tag(cp.status) });

    var funnel = '<div class="ig-cfunnel">' + steps.map(function (st, i) {
      var rate = i === 0 ? (cp.total ? p + '% kế hoạch' : '—') : (steps[i - 1].v ? Math.round(st.v / steps[i - 1].v * 100) : 0) + '% bước trước';
      var on = (v.tab || 0) === st.tab && (v.f.stage || '') === (st.f || '');
      return '<button class="ig-cstep' + (on ? ' on' : '') + '" data-do="camp:stage:' + st.tab + ':' + (st.f || '') + '">' +
        '<span class="l">' + st.l + '</span><b class="gm-num">' + S.num(st.v) + '</b><span class="r">' + rate + '</span>' +
        '<i style="width:' + Math.max(4, Math.round(st.v / (steps[0].v || 1) * 100)) + '%"></i></button>';
    }).join('') + '</div>';

    var tab = v.tab || 0, body = '';
    if (tab === 0) {
      var mrows = mem.map(function (cr, i) {
        var st = i < accN ? 'Đã chấp nhận' : (i % 5 === 4 ? 'Từ chối' : 'Chưa phản hồi');
        var sm = samples.filter(function (s) { return s.creatorId === cr.id; })[0];
        return { id: cr.id, cr: cr, st: st, sm: sm, gmv: cr.gmv30, followers: cr.followers };
      }).filter(function (r) { return v.f.stage !== 'acc' || r.st === 'Đã chấp nhận'; })
        .filter(function (r) { return hit(v.q, [r.cr.name, r.cr.user]); });
      body = U.filters({ ph: 'Tìm Creator trong đợt', q: v.q,
          right: '<span class="ig-fmeta">Hiển thị <b class="gm-num">' + mrows.length + '</b> / ' + S.num(cp.sent) + ' Creator đã gửi</span>' }) +
        U.table({ cols: [
          { k: '', t: 'Creator', r: function (r) { return U.creatorCell(r.cr); } },
          { k: '', t: 'Phản hồi', r: function (r) { return U.tag(r.st); } },
          { k: '', t: 'Hàng mẫu', r: function (r) { return r.sm ? U.tag(S.sampleLabel(r.sm.status)) : '<span class="gm-muted">—</span>'; } },
          { k: '', t: 'Follower', cls: 'num', r: function (r) { return S.money(r.followers); } },
          { k: '', t: 'GMV 30 ngày', cls: 'num', r: function (r) { return S.money(r.gmv); } },
          { k: '', t: '', cls: 'col-actions', r: function (r) {
            return U.iconBtn('msgSend', 'Nhắn tin', 'message:' + r.id) + U.btn('Hồ sơ', { sm: true, act: 'creator:' + r.id }); } }
        ], rows: mrows, emptyTitle: 'Chưa có Creator nào', emptyText: 'Chạy chiến dịch để bắt đầu gửi lời mời.' });
    } else if (tab === 1) {
      var srows = samples.filter(function (s) { return v.f.stage !== 'got' || ['CONTENT_PENDING', 'COMPLETED'].indexOf(s.status) > -1; });
      body = U.table({ cols: [
        { k: '', t: 'Creator', r: sampleCreator }, { k: '', t: 'Sản phẩm', r: sampleProduct },
        { k: '', t: 'Trạng thái', r: function (r) { return U.tag(S.sampleLabel(r.status)); } },
        { k: '', t: 'Xin lúc', r: function (r) { return S.tsShort(r.requestAt); } },
        { k: '', t: '', cls: 'col-actions', r: function (r) { return U.btn('Mở', { sm: true, act: 'go:/s/' + cp.shopId + '/samples' }); } }
      ], rows: srows, emptyTitle: 'Chưa có yêu cầu mẫu', emptyText: 'Creator chấp nhận lời mời rồi mới xin mẫu.' });
    } else if (tab === 2) {
      body = U.table({ cols: [
        { k: '', t: 'Nội dung', r: function (o) {
          return '<div class="ig-inbox-t">' + chip(o.x.type === 'LIVE' ? 4 : 0, o.x.type === 'LIVE' ? 'video' : 'play') +
            '<div><b>' + U.esc(o.x.title) + '</b><span>@' + U.esc(o.s.creatorInfo.username) + ' · ' + S.tsShort(o.x.publishedAt) + '</span></div></div>'; } },
        { k: '', t: 'Loại', r: function (o) { return o.x.type === 'LIVE' ? 'LIVE' : 'Video'; } },
        { k: '', t: 'Lượt xem', cls: 'num', r: function (o) { return S.money(o.x.views); } },
        { k: '', t: 'Đơn', cls: 'num', r: function (o) { return S.num(o.x.orders); } },
        { k: '', t: 'GMV', cls: 'num', r: function (o) { return S.money(o.x.gmv); } },
        { k: '', t: '', cls: 'col-actions', r: function (o) {
          return '<a class="ig-vid" href="' + U.attr(o.x.url) + '" target="_blank" rel="noopener">' + ic('play') + 'Xem</a>'; } }
      ], rows: contents.sort(function (a, b) { return b.x.gmv - a.x.gmv; }),
        emptyTitle: 'Chưa có nội dung', emptyText: 'Video và LIVE xuất hiện khi Creator đăng sau khi nhận mẫu.' });
    } else if (tab === 3) {
      var byCr = {};
      contents.forEach(function (o) { byCr[o.s.creatorInfo.username] = (byCr[o.s.creatorInfo.username] || 0) + o.x.gmv; });
      var top = Object.keys(byCr).sort(function (a, b) { return byCr[b] - byCr[a]; }).slice(0, 6);
      body = '<div class="ig-section">' +
        '<div class="ig-kpis ig-kpis-4">' +
          kpi({ i: 'trend', l: 'GMV từ nội dung (₫)', v: S.money(gmv), d: '+' + contents.length + ' nội dung', s: series(gmv || 1) }) +
          kpi({ i: 'box', l: 'Đơn hàng', v: S.num(orders), d: '+' + orders, s: series(orders || 1) }) +
          kpi({ i: 'check', l: 'Tỉ lệ chấp nhận', v: cp.sent ? Math.round(cp.accepted / cp.sent * 100) + '%' : '—', d: '+0', s: series(cp.accepted || 1) }) +
          kpi({ i: 'send', l: 'Tiến độ gửi', v: p + '%', d: '+' + cp.sent, s: series(cp.sent || 1) }) +
        '</div>' +
        '<div class="ig-dash ig-dash-2">' +
          U.card({ title: 'Lời mời gửi theo ngày', body: CH.line({ alt: 'Lời mời gửi theo ngày', h: 260,
            labels: ['18/9', '19/9', '20/9', '21/9', '22/9', '23/9', '24/9'],
            series: [{ name: 'Đã gửi', values: series(Math.max(1, Math.round(cp.sent / 7)), 7), color: 'var(--chart-1)' },
              { name: 'Chấp nhận', values: series(Math.max(1, Math.round(cp.accepted / 7)), 7), color: 'var(--chart-2)', fill: false }] }) }) +
          U.card({ title: 'Creator mang về GMV cao nhất', body: top.length ? CH.hbars(top.map(function (k, i) {
            return { l: '@' + k, v: byCr[k], d: S.money(byCr[k]), c: rankColor(i) }; })) : U.empty('Chưa có GMV', 'GMV ghi nhận khi nội dung có đơn.') }) +
        '</div></div>';
    } else {
      var logs = S.data.audit.filter(function (a) { return a.act.indexOf(cp.name) > -1; });
      var tl = logs.map(function (a) { return [a.at, a.who + ' · ' + a.act]; })
        .concat([[cp.updated, 'Hệ thống gửi lượt ' + Math.ceil(cp.sent / (cp.perRun || 50)) + ' · giãn cách ' + cp.gap],
          [cp.at, cp.by + ' tạo chiến dịch với ' + cp.prodCount + ' sản phẩm, mẫu “' + (tp ? tp.name : '—') + '”']]);
      body = '<div class="ig-section"><ul class="ig-timeline">' + tl.map(function (t) {
        return '<li><span class="pin"><i></i><span></span></span><div class="tx">' + U.esc(t[1]) + '<small>' + U.esc(t[0]) + '</small></div></li>';
      }).join('') + '</ul></div>';
    }

    return head +
      '<div class="ig-section">' + funnel +
        '<div class="ig-cmeta">' +
          '<span>' + ic('send') + 'Gửi <b class="gm-num">' + S.num(cp.sent) + '</b> / ' + S.num(cp.total) + '</span>' +
          '<span>' + ic('clock') + 'Mỗi lượt ' + (cp.perRun || 50) + ' Creator · giãn cách ' + cp.gap + '</span>' +
          '<span>' + ic('calendar') + 'Hết hạn ' + cp.end + (cp.endDays <= 3 ? ' <b class="ig-warn">· còn ' + cp.endDays + ' ngày</b>' : '') + '</span>' +
          '<span>' + ic('trend') + 'GMV <b class="gm-num">' + S.money(gmv) + '</b></span>' +
        '</div></div>' +
      U.tabs([{ t: 'Creator trong đợt', n: S.num(mem.length) }, { t: 'Hàng mẫu', n: String(samples.length) },
        { t: 'Nội dung', n: String(contents.length) }, 'Kết quả', 'Nhật ký'], tab) + body;
  };

  /* ============================================================ panel GOPUSH AI */
  P.aiPanel = function (x) {
    var db = S.data;
    var chat = db.chat.length ? db.chat.map(function (m) { return m.role === 'me' ? msgUser(m.text) : msgAi(m.html); }).join('')
      : msgAi('<p>Chào <b>' + U.esc(db.settings.profile.name) + '</b>. Mình đọc được dữ liệu của trang <b>' + U.esc(x.page) +
          '</b> trong phạm vi <b>' + U.esc(x.scope) + '</b>. Hỏi bất cứ điều gì, hoặc chọn một gợi ý bên dưới.</p>', true);
    var ctx = '<span class="gm-tag">' + ic('file') + U.esc(x.page) + '</span>' +
      '<span class="gm-tag">' + ic('store') + U.esc(x.scope) + '</span>' +
      (x.filters ? '<span class="gm-tag gm-tag-ink">' + ic('filter') + x.filters + ' bộ lọc</span>' : '') +
      (x.selected ? '<span class="gm-tag gm-tag-ink">' + ic('check') + x.selected + ' dòng đang chọn</span>' : '') +
      '<span class="gm-tag">' + ic('calendar') + U.esc(x.period) + '</span>';
    return '<aside class="ig-aipanel" id="aipanel" aria-label="GOPUSH AI">' +
      '<header><span class="ig-ai-av">' + ic('ai') + '</span><b>GOPUSH AI</b><span class="spacer"></span>' +
        U.iconBtn('newchat', 'Cuộc trò chuyện mới', 'ai:clear') + U.iconBtn('x', 'Đóng', 'ai:close') + '</header>' +
      '<div class="ig-ai-ctx"><span class="h">Đang đọc</span>' + ctx + '</div>' +
      '<div class="ig-ai-scroll"><div class="ig-chat-wrap">' + chat + '</div></div>' +
      '<footer>' +
        '<div class="ig-suggests">' + x.suggest.map(function (q) {
          return '<button data-do="ai:ask:' + U.attr(q) + '">' + U.esc(q) + '</button>'; }).join('') + '</div>' +
        '<div class="ig-composer-box"><textarea rows="2" data-prompt placeholder="Hỏi về dữ liệu trang này…"></textarea>' +
          '<div class="ig-composer-row"><span class="gm-help">Chỉ đọc dữ liệu, không tự gửi lời mời hay tin nhắn</span><span class="spacer"></span>' +
          '<button class="ig-send" data-do="ai:send" aria-label="Gửi">' + ic('arrowUp') + '</button></div></div>' +
      '</footer></aside>';
  };

  P.aiAnswer = aiAnswer;
  P.sampleActions = sampleActions;
  global.PAGES = P;
})(window);
