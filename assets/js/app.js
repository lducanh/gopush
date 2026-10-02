/* GOPUSH — khung ứng dụng: router theo hash, shell 3 tầng, và bộ xử lý thao tác
   tập trung. Mọi nút trong app đều đi qua dispatch() bên dưới. */
(function () {
  'use strict';

  var D = window.DATA, U = window.UI, P = window.PAGES, ic = window.icon, S = window.DB, TT = window.TT;
  var USER = function () { return S.data.settings.profile.name; };

  var store = {
    get: function (k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } }
  };

  var state = {
    lang: store.get('gopush.lang', 'vi'),
    shop: store.get('gopush.shop', S.data.shops[0].id),
    theme: store.get('gopush.theme', 'light'),
    sub: store.get('gopush.sub', 'open'),
    /* phạm vi xem: true = Tất cả cửa hàng; state.shop vẫn là shop làm việc gần nhất */
    all: store.get('gopush.all', '0') === '1',
    ai: false          /* panel GOPUSH AI đang mở */
  };
  if (!S.data.shops.some(function (s) { return s.id === state.shop; })) state.shop = S.data.shops[0].id;

  var REJ = 'NOT_MATCH';   /* lý do từ chối đang chọn trong popup duyệt mẫu */
  var CT = { id: null, tab: 0 };   /* drawer Chi tiết nội dung: yêu cầu nào, tab Video hay LIVE */
  var RATE = 0;            /* số sao đang chọn trong popup đánh giá */
  var MSG = null;          /* nội dung đang soạn của popup gửi tin nhắn mẫu */

  /* trạng thái xem của từng trang */
  var VIEW = {};
  function vs(id) {
    if (!VIEW[id]) VIEW[id] = { tab: 0, q: '', f: {}, sort: null, dir: -1, page: 1, sel: {}, saved: [] };
    return VIEW[id];
  }

  /* --------------------------------------------------------- bảng tuyến */
  var ROUTES = [];
  D.MODULES.forEach(function (m) {
    m.pages.forEach(function (p) {
      ROUTES.push({ module: m, page: p,
        re: new RegExp('^' + p.path.replace('{shop}', '([^/]+)').replace('{id}', '([^/]+)') + '$') });
    });
  });

  /* ở chế độ Tất cả cửa hàng, liên kết tới trang theo shop dùng /s/all/… */
  function href(page, shopId) { return '#' + page.path.replace('{shop}', shopId || (state.all ? 'all' : state.shop)); }
  function pageById(id) {
    for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].page.id === id) return ROUTES[i];
    return null;
  }
  /* phạm vi dữ liệu của trang đang mở: 'all' chỉ khi trang gộp được */
  function scopeOf(page) { return state.all && page.scope === 'multi' ? 'all' : state.shop; }
  /* tiếng Việt và tiếng Anh có sẵn trong sitemap; ngôn ngữ khác tra I18N, thiếu thì dùng tiếng Anh */
  var I = window.I18N;
  function label(o) { return I.nav(o.vi, o.en, state.lang); }
  /* tiếng Anh có mô tả viết tay; ngôn ngữ khác lấy câu gốc để từ điển (assets/i18n) dịch */
  function desc(o) { return state.lang === 'en' ? (o.den || o.dvi) : o.dvi; }
  var titleSrc = '';
  function setTitle(s) { titleSrc = s; document.title = 'GOPUSH — ' + I.tr(s); }
  function t(key) { var o = D.T[key], l = state.lang; if (o[l]) return o[l]; var x = I.t(key, l); return x !== key ? x : (l === 'en' ? o.en : o.vi); }
  S.setLang(state.lang);
  document.documentElement.lang = state.lang; I.use(state.lang);
  function currentPath() { return location.hash.replace(/^#/, '').split('?')[0] || '/'; }
  function query() { var q = location.hash.split('?')[1] || ''; return q; }

  function match(path) {
    if (D.ALIASES[path]) return { alias: D.ALIASES[path] };
    for (var i = 0; i < ROUTES.length; i++) {
      var m = path.match(ROUTES[i].re);
      if (m) {
        var hasShop = ROUTES[i].page.path.indexOf('{shop}') > -1;
        return { route: ROUTES[i], shop: hasShop ? m[1] : null, id: hasShop ? m[2] : m[1] };
      }
    }
    for (var j = 0; j < D.PUBLIC.length; j++) if (D.PUBLIC[j].path === path) return { pub: D.PUBLIC[j] };
    return null;
  }

  var cur = null;   /* { module, page, ctx } của trang đang mở */
  var lastHash = '';   /* địa chỉ trang trong app vẽ thành công gần nhất, để quay về khi bị chặn */

  /* --------------------------------------------------------- shell */
  /* Topbar gọn tối đa: logo · phạm vi shop (kèm hạn mức) · ô Tìm hoặc hỏi AI · avatar.
     Ngôn ngữ, giao diện, trợ giúp nằm trong menu avatar; việc tồn báo trên sidebar. */
  function quotaLine() {
    /* hạn mức gói tính trên tổng tài khoản (mọi shop) */
    var a = window.PLANS.acct('invites'), unl = a.limit === Infinity;
    var pct = unl ? 0 : (a.limit ? Math.min(100, Math.round(a.used / a.limit * 100)) : 100);
    return '<span class="qt' + (pct >= 80 ? ' is-high' : '') + '" title="Tổng lời mời hôm nay của mọi shop trong tài khoản"><span class="gm-num">' + S.num(a.used) + '/' + (unl ? '∞' : S.num(a.limit)) +
      '</span> ' + I.t('quota', state.lang) + '<span class="track"><i style="width:' + pct + '%"></i></span></span>';
  }

  function openCount() { return P.inboxItems(state.all ? 'all' : state.shop).filter(function (x) { return !x.done; }).length; }
  function bellDot() { var n = openCount(); return n ? '<span class="gm-topbar__dot">' + n + '</span>' : ''; }

  /* chuông: 5 việc gấp nhất, đầy đủ ở Việc cần xử lý */
  function notifMenu(anchor) {
    var items = P.inboxItems(state.all ? 'all' : state.shop).filter(function (x) { return !x.done; });
    var el = openMenu(anchor, '<div class="h">Việc cần xử lý · ' + items.length + '</div>' + (items.length ? items.slice(0, 5).map(function (i) {
      return '<button data-go="' + i.go + '"><span class="ig-sevdot is-' + i.sev + '"></span>' +
        '<span style="flex:1;text-align:left">' + U.esc(i.title) + '<br><small class="gm-muted">' + U.esc(i.shopName + ' · ' + i.sub) + '</small></span></button>';
    }).join('') : '<div class="h">Không có việc tồn</div>') +
      '<div class="sep"></div><button data-go="/inbox">' + ic('inbox') + 'Xem tất cả việc</button>');
    el.style.width = '340px';
    el.style.left = Math.max(8, Math.min(anchor.getBoundingClientRect().right - 340, window.innerWidth - 348)) + 'px';
  }

  /* nhãn gói ngay dưới avatar: khách thấy mình đang ở gói nào; admin hệ thống hiện "Admin" */
  var PLAN_SHORT = { none: 'Chưa có gói', trial: 'Dùng thử', basic: 'Cơ bản', pro: 'Chuyên nghiệp', premium: 'Cao cấp' };
  function planTag(big) {
    if (window.AUTH && window.AUTH.isAdmin()) return '<span class="ig-plantag p-admin' + (big ? ' is-big' : '') + '">Admin</span>';
    var p = window.PLANS && window.PLANS.current();
    if (!p) return '';
    return '<span class="ig-plantag p-' + p.id + (big ? ' is-big' : '') + '" title="' + U.attr(p.name) + '">' +
      (big ? U.esc(p.name) : PLAN_SHORT[p.id]) + '</span>';
  }

  /* thị trường (site) và ngôn ngữ: hai nút gọn trên thanh trên */
  function marketBtn() {
    var m = S.market();
    return '<button class="ig-pill ig-mkt" id="market-btn" title="' + U.attr(I.t('market', state.lang)) + '">' +
      '<span class="fl">' + m.flag + '</span><b>' + m.code + '</b>' + ic('down') + '</button>';
  }
  function langBtn() {
    var l = I.LANGS.filter(function (x) { return x.v === state.lang; })[0] || I.LANGS[0];
    return '<button class="ig-pill ig-mkt" id="lang-btn" title="' + U.attr(I.t('language', state.lang)) + '">' + ic('globe') + '<b>' + l.s + '</b>' + ic('down') + '</button>';
  }
  function marketMenu(anchor) {
    var cur = S.market().code, zones = ['sea', 'am', 'ea'];
    var el = openMenu(anchor, '<div class="h">' + U.esc(I.t('market', state.lang)) + ' · TikTok Shop</div>' + zones.map(function (z) {
      return '<div class="h ig-mkt-zone">' + U.esc(I.t('zone_' + z, state.lang)) + '</div>' +
        window.MARKETS.list.filter(function (m) { return m.zone === z; }).map(function (m) {
          return '<button data-market="' + m.code + '"><span class="ig-mkt-fl">' + m.flag + '</span><span style="flex:1">' +
            U.esc(state.lang !== 'en' ? m.name : m.en) + '</span><span class="gm-help">' + m.iso + '</span>' + (m.code === cur ? ic('check') : '<span style="width:16px"></span>') + '</button>';
        }).join('');
    }).join(''));
    el.style.minWidth = '260px';
  }
  function langMenu(anchor) {
    openMenu(anchor, '<div class="h">' + U.esc(I.t('language', state.lang)) + '</div>' + I.LANGS.map(function (l) {
      return '<button data-lang="' + l.v + '"><span class="ig-mkt-code">' + l.s + '</span><span style="flex:1">' + U.esc(l.l) + '</span>' +
        (l.v === state.lang ? ic('check') : '') + '</button>';
    }).join('') + (state.lang !== 'vi' ? '<div class="h ig-mkt-note">' + U.esc(I.t('langNote', state.lang)) + '</div>' : ''));
  }
  /* đổi site: nạp kho dữ liệu của thị trường mới rồi về Trang chủ */
  function setMarket(code, silent) {
    if (code === S.market().code) return;
    S.useMarket(code); VIEW = {};
    state.shop = S.data.shops[0].id; state.all = false;
    store.set('gopush.shop', state.shop); store.set('gopush.all', '0');
    if (window.AUTH && window.AUTH.user()) syncProfile(window.AUTH.user());
    /* đổi thị trường thì đổi luôn ngôn ngữ theo thị trường đó; vẫn chọn lại ngôn ngữ khác được */
    if (!silent && S.market().lang && S.market().lang !== state.lang) setLang(S.market().lang, true);
    if (!silent) { var m = S.market(); toast(I.t('switchMarket', state.lang) + ' ' + m.flag + ' ' + (state.lang !== 'en' ? m.name : m.en)); }
    if (!silent) { if (location.hash === '#/home') render(); else location.hash = '#/home'; }
  }
  /* tài khoản đăng nhập là chủ dữ liệu đang xem: tên, email hiện ở hồ sơ và menu */
  function syncProfile(u) {
    var pr = S.data.settings.profile;
    /* tài khoản demo có gói gắn sẵn; tài khoản mới đăng ký bắt đầu bằng gói dùng thử */
    if (window.PLANS) window.PLANS.current();   /* nạp gói của tài khoản vào kho đang mở */
    var b = S.data.settings.billing;
    if (u.plan && window.PLANS && b.ownerUid !== u.uid) { b.planId = u.plan; b.ownerUid = u.uid; S.save(); }
    if (pr.name !== u.name || pr.email !== u.email) {
      pr.name = u.name; pr.email = u.email;
      if (S.data.members[0]) { S.data.members[0].name = u.name; S.data.members[0].email = u.email; }
      S.save();
    }
  }

  function topbar() {
    var sh = S.shop(state.shop);
    var dot = sh.status === 'ok' ? 'var(--success)' : (sh.status === 'warn' ? 'var(--warning)' : 'var(--danger)');
    var mac = /Mac|iPhone|iPad/.test(navigator.platform || '');
    return '<header class="gm-topbar ig-topbar">' +
      '<a class="gm-topbar__brand ig-brand" href="#/" title="Trang công khai">' + U.logo() + '</a>' +
      '<span class="sep"></span>' +
      '<button class="ig-shop" id="shop-btn" title="Đổi phạm vi xem">' +
        (state.all
          ? '<span class="flag">' + ic('store') + '</span>' +
            '<span class="txt"><span class="nm">Tất cả cửa hàng (' + S.data.shops.length + ')</span>' + quotaLine() + '</span>'
          : '<span class="flag">' + sh.flag + '</span>' +
            '<span class="txt"><span class="nm">' + U.esc(sh.name) + '<i class="gm-dot" style="background:' + dot + '"></i></span>' +
            quotaLine() + '</span>') +
        ic('chevronsDown', 'sw') + '</button>' +
      '<div class="gm-topbar__right">' +
        '<div class="ig-cmd" id="cmd">' + ic('search') +
          '<input type="search" id="gsearch" autocomplete="off" placeholder="' + U.attr(I.t('searchAsk', state.lang)) + '">' +
          '<kbd>' + (mac ? '⌘' : 'Ctrl') + ' K</kbd>' +
          '<div class="ig-cmdpop" id="cmdpop" hidden></div></div>' +
        marketBtn() + langBtn() +
        '<button class="gm-topbar__icon ig-aiicon' + (state.ai ? ' on' : '') + '" id="ai-btn" title="GOPUSH AI — hỏi về trang đang xem">' + ic('ai') + '</button>' +
        '<button class="gm-topbar__icon" id="notif-btn" title="Việc cần xử lý">' + ic('bell') + bellDot() + '</button>' +
        '<button class="ig-avatarbtn" id="user-btn" aria-label="Tài khoản và tùy chỉnh">' +
          '<span class="ig-av">' + U.bear() + planTag() + '</span>' + ic('down') + '</button>' +
      '</div>' +
    '</header>';
  }

  /* --------------------------------------------------------- bảng Tìm hoặc hỏi AI */
  function fold(x) { return String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  var CMD = { list: [], sel: 0 };

  function cmdResults(q) {
    var out = [], fq = fold(q.trim()), sid = state.shop;
    function item(group, icon, title, sub, run) { out.push({ g: group, i: icon, t: title, s: sub || '', run: run }); }
    if (!fq) {
      if (aiOk()) item('Gợi ý', 'ai', 'Hỏi GOPUSH AI về trang đang xem', cur ? label(cur.page) : '', 'aiopen');
      var n = P.inboxItems(state.all ? 'all' : sid).filter(function (x) { return !x.done; }).length;
      item('Gợi ý', 'inbox', 'Việc cần xử lý', n + ' việc đang chờ', 'go:/inbox');
      item('Gợi ý', 'send', 'Tạo lời mời hàng loạt', 'Mở wizard 4 bước', 'do:campaign:new:invite');
      item('Gợi ý', 'search', 'Tìm Creator trên TikTok Shop', 'Lọc theo ngành, follower, GMV', 'go:/s/' + sid + '/creators/discover');
      return out;
    }
    S.data.creators.filter(function (c) { return fold(c.name + ' ' + c.user).indexOf(fq) > -1; }).slice(0, 5).forEach(function (c) {
      item('Creator', 'user', c.name, '@' + c.user + ' · ' + S.short(c.followers) + ' follower · ' + c.cat, 'do:creator:' + c.id);
    });
    S.data.campaigns.filter(function (c) { return fold(c.name).indexOf(fq) > -1; }).slice(0, 4).forEach(function (c) {
      item('Chiến dịch', c.kind === 'message' ? 'msgSend' : 'send', c.name, S.shop(c.shopId).name + ' · ' + c.status,
        'go:/s/' + c.shopId + '/campaigns/c/' + c.id);
    });
    ROUTES.filter(function (r) { return !r.page.hidden && (!r.page.adminOnly || window.AUTH.isAdmin()) && fold(label(r.page) + ' ' + label(r.module)).indexOf(fq) > -1; })
      .slice(0, 4).forEach(function (r) {
        item('Trang', canOpen(r.page) ? (r.page.ic || 'file') : 'lock', label(r.page), label(r.module) + (canOpen(r.page) ? '' : ' · chưa mở với tài khoản này'), 'go:' + href(r.page).slice(1));
      });
    item('Tìm thêm', 'search', 'Tìm “' + q.trim() + '” trong Tìm Creator', 'Lọc toàn bộ Creator của TikTok Shop', 'find:' + q.trim());
    if (aiOk()) item('GOPUSH AI', 'ai', 'Hỏi GOPUSH AI: “' + q.trim() + '”', 'Trả lời bằng dữ liệu của ' + (state.all ? 'mọi shop' : S.shop(sid).name), 'ai:' + q.trim());
    return out;
  }

  function aiOk() { return window.AUTH.linked() && window.PLANS.has('ai'); }
  function cmdRender(q) {
    var pop = document.getElementById('cmdpop');
    if (!pop) return;
    CMD.list = cmdResults(q || '');
    CMD.sel = q && q.trim() ? 0 : 0;
    var last = '';
    pop.innerHTML = CMD.list.map(function (it, k) {
      var head = it.g !== last ? '<div class="h">' + U.esc(it.g) + '</div>' : '';
      last = it.g;
      return head + '<button class="it' + (k === CMD.sel ? ' is-sel' : '') + (it.g === 'GOPUSH AI' ? ' is-ai' : '') +
        '" data-cmd="' + k + '">' + ic(it.i) + '<span class="t"><b>' + U.esc(it.t) + '</b>' +
        (it.s ? '<small>' + U.esc(it.s) + '</small>' : '') + '</span>' + (k === CMD.sel ? '<kbd>↵</kbd>' : '') + '</button>';
    }).join('') + '<div class="foot"><span><kbd>↑</kbd><kbd>↓</kbd> chọn</span><span><kbd>↵</kbd> mở</span><span><kbd>Esc</kbd> đóng</span></div>';
    pop.hidden = false;
  }
  function cmdMove(d) {
    var pop = document.getElementById('cmdpop'); if (!pop || pop.hidden || !CMD.list.length) return;
    CMD.sel = (CMD.sel + d + CMD.list.length) % CMD.list.length;
    [].forEach.call(pop.querySelectorAll('.it'), function (b) {
      var on = +b.getAttribute('data-cmd') === CMD.sel;
      b.classList.toggle('is-sel', on);
      var k = b.querySelector('kbd'); if (k && !on) k.remove();
      if (on && !k) b.insertAdjacentHTML('beforeend', '<kbd>↵</kbd>');
      if (on) b.scrollIntoView({ block: 'nearest' });
    });
  }
  function cmdClose() {
    var pop = document.getElementById('cmdpop'); if (pop) pop.hidden = true;
    var inp = document.getElementById('gsearch'); if (inp) { inp.value = ''; inp.blur(); }
  }
  function cmdRun(k) {
    var it = CMD.list[k]; if (!it) return;
    var r = it.run;
    cmdClose();
    if (r === 'aiopen') toggleAI(true);
    else if (r.indexOf('go:') === 0) location.hash = '#' + r.slice(3);
    else if (r.indexOf('do:') === 0) dispatch(r.slice(3), document.body);
    else if (r.indexOf('ai:') === 0) askAI(r.slice(3));
    else if (r.indexOf('find:') === 0) {
      var vw = vs('discover'); vw.q = r.slice(5); vw.tab = 0; vw.page = 1; vw.f = {};
      location.hash = '#/s/' + state.shop + '/creators/discover';
    }
  }

  function badgeFor(p) {
    var db = S.data, sid = state.shop;
    if (p.id === 'inbox') { var n = P.inboxItems(state.all ? 'all' : sid).filter(function (x) { return !x.done; }).length; return n ? String(n) : null; }
    if (p.id === 'library') return S.num(db.creators.filter(function (c) { return S.rel(c, sid).saved; }).length);
    if (p.id === 'requests') return S.num(db.samples.filter(function (s) { return (state.all || s.shopId === sid) && s.status === 'PENDING'; }).length);
    if (p.id === 'ai-reports') return String(db.aiReports.length);
    return null;
  }

  /* Sidebar trắng một cột theo GoMax Console: nhãn nhóm 12px, module là nav item
     40px có icon; module đang mở xổ các trang con thụt lề 32px, không icon.
     Trang hidden không lên menu; navAs cho biết mục nào được tô sáng thay nó. */
  /* module nào đang mở menu con: người dùng tự mở/thu, lựa chọn được nhớ.
     Khi chuyển sang module khác, module chứa trang đang xem tự mở ra. */
  var NAV_OPEN = (function () { try { return JSON.parse(store.get('gopush.nav', '[]')) || []; } catch (e) { return []; } })();
  var navLastModule = null;
  function saveNav() { store.set('gopush.nav', JSON.stringify(NAV_OPEN)); }

  function sidebar(activeModule, activePage) {
    var activeId = activePage.navAs || activePage.id;
    if (navLastModule !== activeModule.id) {
      navLastModule = activeModule.id;
      if (NAV_OPEN.indexOf(activeModule.id) < 0) { NAV_OPEN.push(activeModule.id); saveNav(); }
    }
    function group(g, title) {
      return '<div class="gm-nav-label">' + U.esc(title) + '</div>' +
        D.MODULES.filter(function (m) { return m.group === g; }).map(function (m) {
          var cur = m.id === activeModule.id;
          var adm = window.AUTH && window.AUTH.isAdmin();
          var vis = m.pages.filter(function (p) { return !p.hidden && (!p.adminOnly || adm); });
          /* module flat: mỗi trang là một dòng có icon, nằm thẳng dưới nhãn nhóm */
          if (m.flat) {
            return vis.map(function (p) {
              var on = p.id === activeId, b = badgeFor(p);
              return '<a class="gm-nav-item' + (on ? ' is-current is-active' : '') + '" href="' + href(p) +
                '" title="' + U.attr(label(p)) + '">' + ic(p.ic) + '<span class="tx">' + U.esc(label(p)) + '</span>' +
                (!canOpen(p) ? '<span class="ig-navlock" title="Chưa mở với tài khoản này">' + ic('lock') + '</span>'
                  : (b ? '<span class="gm-badge">' + b + '</span>' : '')) + '</a>';
            }).join('');
          }
          if (vis.length < 2) {
            return '<a class="gm-nav-item' + (cur ? ' is-current is-active' : '') + '" href="' + href(vis[0]) +
              '" title="' + U.attr(label(m)) + '">' + ic(m.icon) + '<span class="tx">' + U.esc(label(m)) + '</span></a>';
          }
          var open = NAV_OPEN.indexOf(m.id) > -1;
          /* badge tổng hiện trên dòng module khi menu con đang thu, để không mất tín hiệu */
          var alert = vis.map(function (p) { return p.id === 'inbox' ? badgeFor(p) : null; }).filter(Boolean)[0];
          return '<div class="ig-navgrp' + (open ? ' is-open' : '') + '" data-mod="' + m.id + '">' +
            '<button class="gm-nav-item' + (cur ? ' is-current' : '') + '" data-navtoggle="' + m.id + '" data-first="' +
              U.attr(href(vis[0])) + '" aria-expanded="' + open + '" title="' + U.attr(label(m)) + '">' + ic(m.icon) +
              '<span class="tx">' + U.esc(label(m)) + '</span>' +
              (alert ? '<span class="gm-badge is-alert ig-navdot">' + alert + '</span>' : '') +
              ic('down', 'gm-chev') + '</button>' +
            '<div class="ig-navsub"><div>' + vis.map(function (p) {
              var b = badgeFor(p);
              return '<a class="gm-nav-item gm-nav-sub' + (p.id === activeId ? ' is-active' : '') + '" href="' + href(p) + '">' +
                '<span class="tx">' + U.esc(label(p)) + '</span>' +
                (!canOpen(p) ? '<span class="ig-navlock" title="Chưa mở với tài khoản này">' + ic('lock') + '</span>'
                  : (b ? '<span class="gm-badge' + (p.id === 'inbox' ? ' is-alert' : '') + '">' + b + '</span>' : '')) + '</a>';
            }).join('') + '</div></div></div>';
        }).join('');
    }
    /* Cài đặt hệ thống: một dòng ghim ở đáy, mở trang cài đặt đầu tiên (có thanh tab) */
    var setMod = D.MODULES.filter(function (m) { return m.id === 'business'; })[0];
    var setOn = activeModule.id === 'business';
    /* banner quảng bá dịch vụ GOMAX (mở trang ngoài ở tab mới) */
    var promo = '<a class="ig-promo" href="https://gomaxdigital.vn" target="_blank" rel="noopener">' +
      '<b>Booking KOC Freecast</b>' +
      '<span class="pd"><em>New</em>Dịch vụ từ GOMAX Digital</span>' + ic('arrowUpRight', 'pa') + '</a>';
    var setting = '<div class="ig-side-foot">' + promo + '<a class="gm-nav-item' + (setOn ? ' is-current is-active' : '') + '" href="' + href(setMod.pages[0]) +
      '" title="' + U.attr(label(setMod)) + '">' + ic('settings') + '<span class="tx">' + U.esc(label(setMod)) + '</span></a></div>';
    return '<nav class="gm-sidebar ig-side" id="subnav" aria-label="Điều hướng">' +
      group('biz', I.nav('Nghiệp vụ', 'Operations', state.lang)) + setting + '</nav>';
  }

  function support() {
    var rows = [
      ['phone', 0, 'Gọi hỗ trợ', '0867.888.582 · 8h – 22h', 'tel:+84867888582'],
      ['chat', 1, 'Zalo', '0867.888.582 · trả lời trong 15 phút', 'https://zalo.me/0867888582'],
      ['mail', 3, 'Email', 'contact@gopush.asia', 'mailto:contact@gopush.asia']
    ];
    var TONE = [['var(--soft-sky)', 'var(--soft-sky-ink)'], ['var(--soft-sage)', 'var(--soft-sage-ink)'],
      ['var(--soft-sand)', 'var(--soft-sand-ink)'], ['var(--soft-lilac)', 'var(--soft-lilac-ink)']];
    return '<div class="ig-support" id="support">' +
      '<div class="ig-support-menu" role="menu"><div class="h">Liên hệ hỗ trợ</div>' +
        rows.map(function (r) {
          return '<a href="' + r[4] + '" role="menuitem"' + (r[4].indexOf('http') === 0 ? ' target="_blank" rel="noopener"' : '') + '>' +
            '<span class="ic" style="background:' + TONE[r[1]][0] + ';color:' + TONE[r[1]][1] + '">' + ic(r[0]) + '</span>' +
            '<span><b>' + r[2] + '</b><small>' + r[3] + '</small></span></a>';
        }).join('') + '</div>' +
      '<button class="ig-support-btn" aria-label="Liên hệ hỗ trợ" aria-expanded="false">' + ic('headset') + '</button></div>';
  }

  /* --------------------------------------------------------- render */
  function scopeNote(p) {
    var sc = p.scope || 'shop';
    if (sc === 'account') return '<span class="ig-scope">' + ic('layers') + 'Dùng chung mọi shop</span>';
    if (sc === 'multi' && state.all) return '<span class="ig-scope is-all">' + ic('store') + 'Tất cả cửa hàng</span>';
    var sh = S.shop(state.shop);
    return '<span class="ig-scope">' + sh.flag + ' ' + U.esc(sh.name) + '</span>';
  }

  function ctxFor(p) {
    var v = vs(p.id), scope = scopeOf(p);
    return {
      shop: S.shop(state.shop), scope: scope, all: scope === 'all', id: cur && cur.id, lang: state.lang, v: v,
      head: function (actions, o) {
        return U.pageHead({ title: (o && o.title) || label(p), desc: (o && o.desc) || desc(p), actions: actions,
          note: scopeNote(p), crumb: o && o.crumb }) + settingsTabs(p);
      }
    };
  }

  /* thanh tab của Cài đặt hệ thống: thay cho menu con trên sidebar */
  function settingsTabs(p) {
    var m = D.MODULES.filter(function (x) { return x.id === 'business'; })[0];
    if (!m || m.pages.indexOf(p) < 0) return '';
    var adm = window.AUTH && window.AUTH.isAdmin(), on = p.navAs || p.id;
    return '<nav class="ig-settabs" aria-label="' + U.attr(label(m)) + '">' + m.pages.filter(function (x) {
      return !x.hidden && (!x.adminOnly || adm);
    }).map(function (x) {
      return '<a href="' + href(x) + '" class="' + (x.id === on ? 'is-on' : '') + '">' + ic(x.ic) + U.esc(label(x)) +
        (!canOpen(x) ? ic('lock', 'lk') : '') + '</a>';
    }).join('') + '</nav>';
  }

  /* trang thao tác trên một shop nhưng đang xem Tất cả cửa hàng: hỏi chọn shop */
  function shopPicker(p) {
    return U.pageHead({ title: label(p), desc: desc(p), note: '<span class="ig-scope is-all">' + ic('store') + 'Tất cả cửa hàng</span>' }) +
      '<div class="ig-section">' +
        U.banner('Trang này thao tác trên <b>từng cửa hàng</b> (duyệt, gửi, đồng bộ đều gọi API của shop đó). Chọn cửa hàng để tiếp tục.') +
        '<div class="ig-grid ig-grid-3">' + S.data.shops.map(function (sh) {
          var st = S.stats(sh.id);
          return '<button class="ig-pickshop" data-pickshop="' + sh.id + '">' +
            '<b>' + sh.flag + ' ' + U.esc(sh.name) + '</b>' + U.tag(sh.status === 'ok' ? 'Đã ủy quyền' : (sh.status === 'warn' ? 'Sắp hết hạn' : 'Đã hết hạn')) +
            '<span class="gm-help">' + st.pending + ' mẫu chờ duyệt · ' + st.working + ' Creator hợp tác</span></button>';
        }).join('') + '</div></div>';
  }

  function viewHTML(p) {
    if (state.all && (p.scope || 'shop') === 'shop') return shopPicker(p);
    return P[p.id](ctxFor(p));
  }

  function render() {
    var path = currentPath(), hit = match(path);
    if (!hit) { location.hash = '#/home'; return; }
    if (hit.alias) {
      if (hit.alias.indexOf('ai=1') > -1) state.ai = true;
      location.hash = '#' + hit.alias.split('?')[0]; return;
    }

    var me = window.AUTH.user();
    if (hit.pub) {
      /* đã đăng nhập thì không ở lại trang đăng nhập / đăng ký */
      if (me && /^(login|signup|forgot)$/.test(hit.pub.id)) { location.hash = '#/home'; return; }
      cur = null;
      setTitle(label(hit.pub));
      document.body.innerHTML = P[hit.pub.id]({ lang: state.lang }) + support();
      window.scrollTo(0, 0);
      return;
    }

    /* trang trong app cần đăng nhập */
    if (!me) { location.hash = '#/login?next=' + encodeURIComponent(path); return; }
    /* mỗi tài khoản một kho dữ liệu riêng */
    if (S.useUser(me.uid)) {
      VIEW = {};
      if (!S.data.shops.some(function (s) { return s.id === state.shop; })) { state.shop = S.data.shops[0].id; store.set('gopush.shop', state.shop); }
      if (hit.shop && hit.shop !== 'all' && !S.data.shops.some(function (s) { return s.id === hit.shop; })) { location.hash = '#/home'; return; }
    }
    syncProfile(me);
    var m = hit.route.module, p = hit.route.page;
    /* trang chỉ dành cho admin hệ thống */
    /* không đủ quyền: giữ nguyên trang đang xem (hoặc về Trang chủ) và hiện popup */
    if (!canOpen(p)) {
      var showDeny = function () { denyFor(p.feature, p); };
      /* luôn đưa về Trang chủ rồi mới hiện popup: tắt popup cũng không ở lại trang bị khóa */
      location.replace('#/home'); setTimeout(showDeny, 80);
      return;
    }
    var ann = window.ANN ? window.ANN.bar() : '';
    /* shop trong URL quyết định phạm vi: /s/all/… = Tất cả, /s/{id}/… = shop đó */
    if (hit.shop === 'all') { if (!state.all) { state.all = true; store.set('gopush.all', '1'); } }
    else if (hit.shop && S.shop(hit.shop).id === hit.shop) {
      state.shop = hit.shop; store.set('gopush.shop', hit.shop);
      if (state.all) { state.all = false; store.set('gopush.all', '0'); }
    }
    setTitle(label(p));
    cur = { module: m, page: p, id: hit.id };
    lastHash = location.hash;

    document.body.innerHTML =
      '<div class="ig-app' + (state.sub === 'collapsed' ? ' sub-collapsed' : '') + (state.ai ? ' ai-open' : '') + (ann ? ' has-ann' : '') + '">' + topbar() + ann +
        '<div class="ig-body">' + sidebar(m, p) +
          '<button class="ig-collapse" id="sub-btn" aria-controls="subnav" aria-expanded="' + (state.sub === 'open') +
            '" title="' + U.attr(t(state.sub === 'open' ? 'collapse' : 'expand')) + '">' + ic('left') + '</button>' +
          '<main class="ig-content" id="view">' + viewHTML(p) + '</main>' +
          (state.ai ? P.aiPanel(aiCtx()) : '') +
        '</div></div>' + support() + '<div id="layer"></div>';
    sheet(document.getElementById('view'));
    if (window.LINK) window.LINK.onLogin(me);
  }

  /* Bố cục GoMax Console: tiêu đề trang nằm ngoài card, mọi khối phía dưới
     (tab, bộ lọc, bảng, section) gom vào một card trắng trên nền canvas. */
  function sheet(view) {
    if (!view) return;
    var box = document.createElement('div');
    box.className = 'ig-sheet';
    [].slice.call(view.childNodes).forEach(function (n) {
      if (!(n.classList && n.classList.contains('ig-page-head'))) box.appendChild(n);
    });
    if (box.childNodes.length) view.appendChild(box);
  }

  /* cập nhật dòng hạn mức dưới tên shop (không còn chuông trên topbar) */
  function updateBell() {
    var q = document.querySelector('.ig-shop .qt');
    if (q) q.outerHTML = quotaLine();
    var b = document.getElementById('notif-btn');
    if (b) b.innerHTML = ic('bell') + bellDot();
  }

  /* vẽ lại phần nội dung, giữ nguyên vị trí cuộn */
  function refresh(full) {
    if (!cur) return;
    if (full) { render(); return; }
    var view = document.getElementById('view');
    if (!view) { render(); return; }
    var top = view.scrollTop;
    view.innerHTML = viewHTML(cur.page);
    sheet(view);
    if (state.ai) renderAI();
    view.scrollTop = top;
    /* cập nhật badge sidebar và hạn mức */
    var sub = document.getElementById('subnav');
    if (sub) sub.outerHTML = sidebar(cur.module, cur.page);
    updateBell();
  }
  /* vẽ lại riêng thanh chân wizard để không cắt mạch gõ của người dùng */
  function refreshFoot() {
    if (!cur || !v().wz) return;
    var old = document.querySelector('.ig-wzfoot');
    if (!old) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = window.WIZ.render(ctxFor(cur.page));
    var neu = tmp.querySelector('.ig-wzfoot');
    if (neu) old.replaceWith(neu);
  }

  window.APP = { refresh: refresh, vz: function () { return ctxFor(cur.page); },
    /* trạng thái lọc của một trang bất kỳ, để trang khác mở sẵn bộ lọc */
    view: function (id) { return vs(id); },
    lang: function () { return state.lang; },
    canOpenPath: function (path) { var h = match(path.split('?')[0]); return !h || !h.route || canOpen(h.route.page); },
    render: function () { render(); },
    modal: function (html) { openModal(html); },
    closeModal: function () { closeLayer(); },
    toast: function (m) { toast(m); },
    setLang: function (l) { setLang(l); }, title: function () { if (titleSrc) setTitle(titleSrc); },
    setMarket: function (c, silent) { setMarket(c, silent); },
    onLogin: function (u) { syncProfile(u); },
    afterLink: function () {
      S.reset(); VIEW = {};
      state.shop = S.data.shops[0].id; state.all = false; store.set('gopush.shop', state.shop);
      syncProfile(window.AUTH.user());
      toast('Đã liên kết gian hàng ' + S.data.shops[0].name + ' · đang đồng bộ dữ liệu');
      if (location.hash === '#/home') render(); else location.hash = '#/home';
    },
    confirm: function (title, text, ok, fn) { confirmBox(title, text, ok, function () { closeLayer(); fn(); }); } };

  /* --------------------------------------------------------- lớp nổi */
  function layer() { return document.getElementById('layer'); }
  function closeLayer() { var l = layer(); if (l) l.innerHTML = ''; }
  function openModal(html) { var l = layer(); if (l) { l.innerHTML = html; var f = l.querySelector('input,textarea'); if (f) f.focus(); } }
  function openDrawer(html) { var l = layer(); if (l) l.innerHTML = html; }

  function toast(msg) {
    var old = document.querySelector('.ig-toast');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'ig-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2400);
  }

  function closeMenus() { var m = document.querySelector('.ig-menu'); if (m) m.remove(); }
  function openMenu(anchor, html) {
    closeMenus();
    var r = anchor.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'ig-menu';
    el.innerHTML = html;
    el.style.position = 'fixed';
    el.style.top = (r.bottom + 6) + 'px';
    document.body.appendChild(el);
    var w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    if (r.bottom + h + 12 > window.innerHeight) el.style.top = Math.max(8, r.top - h - 6) + 'px';
    return el;
  }

  /* menu chọn nhiều: bấm để bật/tắt, menu vẫn mở */
  function multiMenu(anchor, key, opts, selected) {
    var sel = (selected || []).map(String);
    var html = '<div class="h">Chọn một hoặc nhiều</div>' + opts.map(function (o) {
      var on = sel.indexOf(String(o.v)) > -1;
      return '<button data-multi="' + U.attr(key) + '" data-val="' + U.attr(o.v) + '">' +
        '<span class="gm-check' + (on ? ' on' : '') + '"></span>' +
        '<span style="flex:1">' + U.esc(o.l) + '</span></button>';
    }).join('') +
      (sel.length ? '<div class="h" style="border-top:1px solid var(--border-light);margin-top:4px;padding-top:6px">' +
        '<button class="gm-btn gm-btn-link gm-btn-sm" data-multi="' + U.attr(key) + '" data-val="__clear">Bỏ chọn tất cả</button></div>' : '');
    var el = openMenu(anchor, html);
    el.setAttribute('data-keepopen', '1');
    return el;
  }

  /* popup hạng mục sản phẩm: 2 cấp, lấy từ cây của TikTok */
  var CATV = { l1: TT.CATEGORIES[0][0], q: '' };
  function catModal(ctx) {
    var w = ctx.v.wz;
    var q = CATV.q.trim().toLowerCase();
    var l1s = TT.CATEGORIES.filter(function (g) {
      if (!q) return true;
      return g[1].toLowerCase().indexOf(q) > -1 || g[2].some(function (x) { return x[1].toLowerCase().indexOf(q) > -1; });
    });
    if (!l1s.some(function (g) { return g[0] === CATV.l1; }) && l1s.length) CATV.l1 = l1s[0][0];
    var cur = TT.CATEGORIES.filter(function (g) { return g[0] === CATV.l1; })[0] || TT.CATEGORIES[0];
    var kids = cur[2].filter(function (x) { return !q || x[1].toLowerCase().indexOf(q) > -1 || cur[1].toLowerCase().indexOf(q) > -1; });

    var left = l1s.map(function (g) {
      var picked = g[2].filter(function (x) { return w.f.cats.indexOf(x[0]) > -1; }).length;
      return '<button class="ig-catl1' + (g[0] === CATV.l1 ? ' on' : '') + '" data-do="cat:l1:' + g[0] + '">' +
        '<span class="t">' + U.esc(g[1]) + '</span>' +
        (picked ? '<span class="gm-badge">' + picked + '</span>' : '') + ic('right') + '</button>';
    }).join('');

    var right = kids.map(function (x) {
      var on = w.f.cats.indexOf(x[0]) > -1;
      return '<label class="ig-catl2' + (on ? ' on' : '') + '" data-do="cat:pick:' + x[0] + '">' +
        '<span class="gm-check' + (on ? ' on' : '') + '"></span><span>' + U.esc(x[1]) + '</span></label>';
    }).join('') || U.empty('Không có hạng mục khớp');

    openModal(U.modal({
      title: 'Chọn hạng mục sản phẩm', wide: true,
      body: '<label class="gm-input gm-input-sm" style="margin-bottom:10px">' + ic('search') +
        '<input type="search" data-catq placeholder="Tìm hạng mục" value="' + U.attr(CATV.q) + '"></label>' +
        '<div class="ig-cats"><div class="ig-catcol">' + left + '</div><div class="ig-catcol is-2">' + right + '</div></div>',
      foot: '<span class="ig-prodcount">Đã chọn <b class="gm-num">' + w.f.cats.length + '</b> hạng mục</span>' +
        '<span style="flex:1"></span>' + U.btn('Bỏ chọn hết', { act: 'cat:clear' }) +
        U.btn('Xong', { variant: 'primary', act: 'modal:close' })
    }));
  }

  function optionMenu(anchor, key, opts, current) {
    openMenu(anchor, opts.map(function (o) {
      var val = typeof o === 'string' ? o : o.v;
      var lab = typeof o === 'string' ? (o === 'all' ? 'Tất cả' : o) : o.l;
      return '<button data-choose="' + U.attr(key) + '" data-val="' + U.attr(val) + '">' +
        '<span style="flex:1">' + U.esc(lab) + '</span>' + (val === current ? ic('check') : '') + '</button>';
    }).join(''));
  }

  /* --------------------------------------------------------- tiện ích thao tác */
  function v() { return cur ? vs(cur.page.id) : {}; }
  /* túi bộ lọc đang mở: của wizard hoặc của tác vụ điều chỉnh kế hoạch */
  function fbag() { var vv = v(); return vv.wz ? vv.wz.f : (vv.tk ? vv.tk.f : null); }
  function fowner() { var vv = v(); return vv.wz || vv.tk || null; }
  function selected() { var s = v().sel || {}; return Object.keys(s).filter(function (k) { return s[k]; }); }
  function clearSel() { v().sel = {}; }
  function shopId() { return state.shop; }

  function setPath(path, value) {
    var st = S.data.settings, parts = path.split('.');
    if (parts[0] === 'note') {
      var cr = S.creator(parts[1]); if (cr) S.rel(cr, shopId()).note = value;
    } else if (parts[0] === 'shop') {
      var sh = S.shop(shopId());
      sh[parts[1]] = parts[1] === 'limit' ? (parseInt(value, 10) || 0) : value;
    } else {
      var o = st;
      for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
      o[parts[parts.length - 1]] = value;
    }
    S.save();
  }
  function togglePath(path) {
    var st = S.data.settings, parts = path.split('.'), o = st;
    for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    var k = parts[parts.length - 1];
    o[k] = !o[k];
    S.save();
    return o[k];
  }

  /* --------------------------------------------------------- hộp thoại dùng lại */
  function askText(title, label, value, onOk, help) {
    openModal(U.modal({
      title: title,
      body: U.field(label, U.input({ value: value || '', bind: '__tmp' }), help),
      foot: U.btn('Hủy', { act: 'modal:close' }) + U.btn('Lưu', { variant: 'primary', act: 'modal:ok' })
    }));
    MODAL_OK = function () {
      var el = document.querySelector('.ig-modal input');
      onOk(el ? el.value.trim() : '');
    };
  }
  var MODAL_OK = null;

  /* vượt hạn mức gói: báo rõ đang dùng bao nhiêu và mời nâng gói */
  function overLimit(kind) {
    if (window.PLANS.check(kind).ok) return false;
    window.PLANS.denyLimit(kind);
    return true;
  }

  function confirmBox(title, text, okLabel, onOk) {
    openModal(U.modal({
      title: title,
      body: '<p style="margin:0;font-size:14px;line-height:22px;color:var(--text-secondary)">' + U.esc(text) + '</p>',
      foot: U.btn('Hủy', { act: 'modal:close' }) + U.btn(okLabel, { variant: 'danger', act: 'modal:ok' })
    }));
    MODAL_OK = onOk;
  }

  /* --------------------------------------------------------- chọn sản phẩm từ shop */
  var PROD = null;
  /* drawer Chi tiết nội dung: video và LIVE Creator đã đăng cho yêu cầu mẫu này */
  function contentDrawer() {
    var sp = null;
    S.data.samples.forEach(function (x) { if (x.id === CT.id) sp = x; });
    if (!sp) return;
    var all = sp.contents || [];
    var vids = all.filter(function (x) { return x.type === 'VIDEO'; });
    var lives = all.filter(function (x) { return x.type === 'LIVE'; });
    var list = CT.tab === 1 ? lives : vids;

    var body = list.length ? list.map(function (x) {
      return '<article class="ig-ct">' +
        '<a class="th" href="' + U.attr(x.url) + '" target="_blank" rel="noopener" title="Mở trên TikTok">' +
          ic(x.type === 'LIVE' ? 'video' : 'play') + '</a>' +
        '<div class="bd">' +
          '<b>' + U.esc(x.title) + '</b>' +
          '<span class="when">Thời gian phát hành: ' + S.ts(x.publishedAt).replace(' (UTC+7)', '') + '</span>' +
          '<div class="ms">' +
            '<span title="Lượt xem">' + ic('eye') + S.short(x.views) + '</span>' +
            '<span title="Lượt thích">' + ic('thumbUp') + S.short(x.likes) + '</span>' +
            '<span title="Bình luận">' + ic('chat') + S.num(x.comments) + '</span>' +
            '<span title="Đơn hàng phát sinh từ nội dung này">' + ic('box') + S.num(x.orders) + ' đơn</span>' +
            (x.gmv ? '<span title="GMV từ nội dung này">' + ic('wallet') + S.amt(x.gmv) + '</span>' : '') +
          '</div>' +
          '<a class="gm-btn gm-btn-sm" href="' + U.attr(x.url) + '" target="_blank" rel="noopener">' +
            ic('tiktok', 'solid') + (x.type === 'LIVE' ? 'Xem LIVE trên TikTok' : 'Xem video trên TikTok') + '</a>' +
        '</div></article>';
    }).join('')
      : U.empty(CT.tab === 1 ? 'Chưa có buổi LIVE nào' : 'Chưa có video nào',
          'Nội dung sẽ xuất hiện sau khi Creator đăng và TikTok đồng bộ về.');

    openDrawer('<div class="ig-overlay" data-do="drawer:close"></div>' +
      '<aside class="ig-drawer" role="dialog" aria-label="Chi tiết nội dung">' +
        '<header><div class="t"><strong>Chi tiết nội dung</strong>' +
          '<small>@' + U.esc(sp.creatorInfo.username) + ' · ' + U.esc(sp.productInfo.title) + '</small></div>' +
          U.iconBtn('x', 'Đóng', 'drawer:close') + '</header>' +
        '<div class="ig-drawer-body">' +
          '<nav class="gm-tabs">' +
            '<button class="gm-tab' + (CT.tab === 0 ? ' on' : '') + '" data-do="sample:ctab:0">Video' +
              '<span class="gm-badge">' + vids.length + '</span></button>' +
            '<button class="gm-tab' + (CT.tab === 1 ? ' on' : '') + '" data-do="sample:ctab:1">LIVE' +
              '<span class="gm-badge">' + lives.length + '</span></button>' +
          '</nav>' +
          '<div class="ig-ctlist">' + body + '</div>' +
        '</div></aside>');
  }

  /* popup để lại đánh giá cho Creator sau khi hoàn thành */
  function rateModal(sp) {
    openModal(U.modal({
      title: 'Để lại đánh giá',
      body: '<p style="margin:0 0 10px;font-size:13.5px;color:var(--text-secondary)">Đánh giá hợp tác với <b>@' +
          U.esc(sp.creatorInfo.username) + '</b> ở yêu cầu mẫu <b>' + U.esc(sp.productInfo.title) + '</b>.</p>' +
        '<div class="ig-rate">' + [1, 2, 3, 4, 5].map(function (n) {
          return '<button class="' + (n <= RATE ? 'on' : '') + '" data-do="sample:star:' + n + '" ' +
            'aria-label="' + n + ' sao">★</button>';
        }).join('') + '<span class="lb">' +
          (RATE ? ['Rất tệ', 'Chưa đạt', 'Bình thường', 'Tốt', 'Rất tốt'][RATE - 1] : 'Chọn số sao') + '</span></div>' +
        '<div style="margin-top:12px">' +
          U.field('Ghi chú nội bộ', U.textarea({ rows: 3, value: sp.ratingNote || '',
            ph: 'Nội dung có đúng brief không, có lên đơn không…', bind: '__rate' })) + '</div>',
      foot: U.btn('Hủy', { act: 'modal:close' }) + '<span style="flex:1"></span>' +
        U.btn('Lưu đánh giá', { variant: 'primary', act: 'sample:rateSave:' + sp.id })
    }));
  }

  /* popup chọn mẫu có sẵn cho nội dung lời mời / tin nhắn */
  function tplModal(kind) {
    var list = S.data.templates.filter(function (t) { return t.kind === kind; });
    openModal(U.modal({
      title: kind === 'invite' ? 'Chọn mẫu lời mời' : 'Chọn mẫu tin nhắn', wide: true,
      body: list.length
        ? '<div class="ig-tpllist">' + list.map(function (t) {
            return '<button class="ig-tplcard" data-do="wz:pickTemplate:' + U.attr(t.id) + '">' +
              '<span class="hd"><b>' + U.esc(t.name) + '</b>' +
              '<span class="gm-help">' + S.num(t.uses || 0) + ' lượt dùng</span></span>' +
              '<span class="bd">' + U.esc(t.body) + '</span>' +
              (t.vars ? '<span class="vr">' + U.esc(t.vars) + '</span>' : '') + '</button>';
          }).join('') + '</div>'
        : U.empty('Chưa có mẫu nào', 'Tạo mẫu ở Chiến dịch → Thư viện mẫu rồi quay lại dùng.',
            U.btn('Mở Thư viện mẫu', { sm: true, act: 'go:/templates' })),
      foot: '<span class="ig-prodcount">Chọn một mẫu để chèn vào nội dung</span>' +
        '<span style="flex:1"></span>' + U.btn('Đóng', { act: 'modal:close' })
    }));
  }

  /* popup gửi tin nhắn mẫu — thẻ mẫu luôn gửi, văn bản và ảnh là tuỳ chọn */
  function msgModal(n) {
    var text = MSG.text || '';
    openModal(U.modal({
      title: 'Gửi tin nhắn mẫu',
      body: '<div class="ig-msgrow"><span class="lb">Tin nhắn bắt buộc</span>' +
          '<div class="bd"><div class="ig-msgcard">' + ic('box') +
          '<div><b>Tin nhắn thẻ mẫu</b><span>Thẻ sản phẩm kèm nút xin mẫu, TikTok luôn gửi kèm và không sửa được.</span></div>' +
          '</div></div></div>' +
        '<div class="ig-msgrow"><span class="lb">Tin nhắn văn bản</span><div class="bd">' +
          '<label class="gm-input gm-input-area"><textarea rows="4" maxlength="2000" data-msg placeholder="Nhập lời nhắn gửi kèm (tuỳ chọn)">' +
          U.esc(text) + '</textarea><span class="cnt">' + text.length + ' / 2000</span></label></div></div>' +
        '<div class="ig-msgrow"><span class="lb">Hình ảnh</span><div class="bd">' +
          (MSG.image
            ? '<div class="ig-msgpic">' + ic('file') + '<span>' + U.esc(MSG.image.imageUrl) + ' · 800×800</span>' +
              U.iconBtn('trash', 'Xóa ảnh', 'sample:msgPic') + '</div>'
            : '<button class="ig-msgup" data-do="sample:msgPic">' + ic('upload') +
              '<span>Nhấp để tải lên<small>1 ảnh .jpg, .jpeg, .png, tối đa 5MB</small></span></button>') +
          '</div></div>',
      foot: '<span class="ig-prodcount">Gửi cho <b class="gm-num">' + n + '</b> Creator · tối đa 100</span>' +
        '<span style="flex:1"></span>' + U.btn('Hủy', { act: 'modal:close' }) +
        U.btn('Gửi hàng loạt', { variant: 'primary', icon: 'msgSend', act: 'sample:msgSend' })
    }));
  }

  function productModal(ctx, mode) {
    var w = ctx.v.wz, sid = ctx.shop.id, sh = S.shop(sid);
    var prods = S.data.products[sid] || [];
    if (!PROD || PROD.mode !== mode) {
      PROD = { mode: mode, sel: {} };
      if (mode === 'task') (ctx.v.tk.products || []).forEach(function (x) { PROD.sel[x.id] = true; });
      else if (mode === 'invite') w.products.forEach(function (x) { PROD.sel[x.id] = true; });
      else w.cards.forEach(function (id) { PROD.sel[id] = true; });
    }
    var picked = Object.keys(PROD.sel).filter(function (k) { return PROD.sel[k]; });
    var limit = mode === 'card' ? 5 : 0;

    var list = prods.length ? '<div class="ig-prodlist">' + prods.map(function (p) {
      var on = !!PROD.sel[p.id];
      return '<label class="ig-prodrow' + (on ? ' on' : '') + '" data-do="prodpick:' + p.id + '">' +
        '<span class="gm-check' + (on ? ' on' : '') + '"></span>' +
        '<span class="th">' + ic('box') + '</span>' +
        '<span class="t"><b>' + U.esc(p.name) + '</b>' +
        '<span class="gm-help">' + U.esc(p.sku) + ' · ' + S.vnd(p.price) +
        ' · hoa hồng ' + p.com + '%</span></span>' +
        (p.active ? '' : '<span class="gm-tag gm-tag-red">Ngừng bán</span>') + '</label>';
    }).join('') + '</div>'
      : U.empty('Shop chưa đồng bộ sản phẩm', 'Vào Cửa hàng → Chi tiết shop để đồng bộ trước.');

    openModal(U.modal({
      title: 'Chọn sản phẩm', wide: true,
      body: '<div class="ig-prodhead">' + ic('store') +
        '<span>Lấy từ <b>' + U.esc(sh.name) + '</b> · ' + prods.length + ' sản phẩm đã đồng bộ qua API</span>' +
        '<span class="spacer"></span>' +
        U.btn('Đồng bộ lại', { sm: true, variant: 'ghost', icon: 'refresh', act: 'shop:sync:' + sid }) +
        '</div>' + list,
      foot: '<span class="ig-prodcount">Đã chọn <b class="gm-num">' + picked.length + '</b>' +
        (limit ? ' / ' + limit : '') + '</span><span style="flex:1"></span>' +
        U.btn('Hủy', { act: 'modal:close' }) +
        U.btn('Thêm sản phẩm', { variant: 'primary', act: 'prodapply' })
    }));
  }

  /* --------------------------------------------------------- xuất file */
  function exportCSV(what) {
    var db = S.data, sid = shopId(), cols, rows, name;
    if (what === 'creators') {
      name = 'creators';
      cols = ['Tên', 'Username', 'Kênh TikTok', 'Ngành hàng', 'Quốc gia', 'Follower', 'GMV 30 ngày (' + S.market().iso + ')', 'GPM (' + S.market().iso + ')', 'Tỉ lệ đăng', 'Quan hệ', 'Tag'];
      rows = db.creators.filter(function (c) { return S.rel(c, sid).saved || true; }).map(function (c) {
        var r = S.rel(c, sid);
        return [c.name, '@' + c.user, c.tiktok, c.cat, c.country, c.followers, Math.round(S.fx(c.gmv30)), Math.round(S.fx(c.gpm)), c.postRate + '%', r.state,
          r.tags.map(function (t) { var x = S.tag(t); return x ? x.name : ''; }).join(', ')];
      });
    } else if (what === 'samples' || what === 'shipments') {
      var ship = what === 'shipments';
      name = ship ? 'van-don-hang-mau' : 'yeu-cau-hang-mau';
      cols = ['ID yêu cầu', 'Creator', 'Username', 'Follower', 'Sản phẩm', 'ID sản phẩm', 'SKU', 'Hoa hồng',
        'Trạng thái', 'Mã đơn hàng', 'Mã vận đơn', 'Đơn vị vận chuyển', 'Ký nhận lúc', 'Đồng bộ', 'Link video', 'Yêu cầu lúc'];
      rows = db.samples.filter(function (s) {
        return s.shopId === sid && (!ship || s.logisticsInfo.trackingNo);
      }).map(function (s) {
        var lg = s.logisticsInfo;
        return [s.id, s.creatorInfo.nickname, '@' + s.creatorInfo.username, s.creatorInfo.followerCount,
          s.productInfo.title, s.productInfo.id, s.sku, s.commissionRate + '%', S.sampleLabel(s.status),
          s.orderId, lg.trackingNo || '', lg.carrierName || '', lg.signedAt ? S.ts(lg.signedAt) : '',
          lg.syncStatus, s.video, S.ts(s.requestAt)];
      });
    } else if (what === 'campaigns' || what === 'campaignReport') {
      name = 'chien-dich';
      cols = ['Tên', 'Loại', 'Trạng thái', 'Đã gửi', 'Tổng', 'Chấp nhận', 'Người tạo', 'Bắt đầu'];
      rows = db.campaigns.filter(function (c) { return c.shopId === sid; }).map(function (c) {
        return [c.name, c.kind === 'invite' ? 'Lời mời' : 'Tin nhắn', c.status, c.sent, c.total, c.accepted, c.by, c.at];
      });
    } else if (what === 'audit') {
      name = 'nhat-ky';
      cols = ['Thời gian', 'Người thực hiện', 'Loại', 'Thao tác', 'Cửa hàng'];
      rows = db.audit.map(function (a) { return [a.at, a.who, a.kind, a.act, a.shop]; });
    } else if (what === 'shops' || what === 'report' || what === 'dashboard') {
      name = 'bao-cao-cua-hang';
      cols = ['Cửa hàng', 'GMV (' + S.market().iso + ')', 'Đơn', 'Hoa hồng (' + S.market().iso + ')', 'Video/live', 'Creator hoạt động'];
      rows = db.shops.map(function (s) {
        var st = S.stats(s.id);
        return [s.name, Math.round(S.fx(st.gmv)), st.orders, Math.round(S.fx(st.com)), st.videos, st.working];
      });
    } else {
      name = 'du-lieu';
      cols = ['Creator', 'GMV 30 ngày (' + S.market().iso + ')', 'Tỉ lệ đăng', 'Ngành hàng'];
      rows = db.creators.filter(function (c) { return S.rel(c, sid).state === 'Đang hợp tác'; })
        .sort(function (a, b) { return b.gmv30 - a.gmv30; }).slice(0, 50)
        .map(function (c) { return [c.name, Math.round(S.fx(c.gmv30)), c.postRate + '%', c.cat]; });
    }
    S.download('gopush-' + name + '-' + S.fmtDate(new Date()).replace(/\//g, '') + '.csv', S.toCSV(cols, rows));
    toast('Đã tải xuống ' + rows.length + ' dòng');
  }

  /* --------------------------------------------------------- bộ xử lý thao tác */
  /* về Trang chủ rồi hiện popup không đủ quyền (theo tính năng, hoặc chưa có gói) */
  /* Cơ cấu quyền, theo thứ tự: 1) liên kết gian hàng  2) gói  3) vai trò (admin hệ thống).
     canOpen: trang mở được không; denyFor: hiện đúng popup của lớp đang chặn. */
  var LINK_OPEN = ['home', 'shop-list', 'shop-detail', 'billing', 'profile'];
  function linkOk(p) { return window.AUTH.linked() || LINK_OPEN.indexOf(p.navAs || p.id) > -1; }
  function canOpen(p) { return linkOk(p) && window.PLANS.allowPage(p) && (!p.adminOnly || window.AUTH.isAdmin()); }
  function denyFor(feature, p) {
    if (!window.AUTH.linked()) return window.LINK.needed();
    if (p && p.adminOnly && !window.AUTH.isAdmin()) return window.PLANS.notice('Trang dành cho quản trị', 'Trang <b>' + U.esc(label(p)) + '</b> chỉ dành cho admin hệ thống GOPUSH. Tài khoản của bạn không cần trang này để sử dụng các tính năng theo gói.', 'shield');
    if (window.PLANS.isNone() || !feature) return window.PLANS.denyNone();
    window.PLANS.denyFeature(feature);
  }
  function denyHome(feature) {
    closeLayer();
    var show = function () { denyFor(feature); };
    if (location.hash !== '#/home') { location.hash = '#/home'; setTimeout(show, 80); } else show();
  }

  /* tài khoản chưa có gói: chỉ được chuyển trang, đóng hộp thoại, sửa hồ sơ; còn lại hiện popup */
  var NONE_OK = ['go', 'modal', 'set', 'save', 'invoice', 'toast'];
  function dispatch(act, el) {
    var db = S.data, sid = shopId(), a = act.split(':'), verb = a[0], arg = a[1], arg2 = a.slice(2).join(':');
    var view = v();
    if (!window.AUTH.linked() && NONE_OK.indexOf(verb) < 0) {
      if (verb === 'shop' || verb === 'sync') { window.LINK.guide(); return true; }
      denyHome(); return true;
    }
    if (window.PLANS.isNone() && NONE_OK.indexOf(verb) < 0) { denyHome(); return true; }
    /* thao tác thuộc tính năng gói không có: popup + về Trang chủ */
    var need = { tag: 'segments', tagpick: 'segments', untag: 'segments', auto: 'auto', autoMsg: 'auto', ai: 'ai', ask: 'ai' }[verb] ||
      (verb === 'bulk' && arg === 'tag' ? 'segments' : '') || (verb === 'crx' && arg === 'seg' ? 'segments' : '') || (verb === 'crx' && arg === 'tag' ? 'segments' : '');
    /* aix: dùng chung cho bộ chọn ở nhiều trang; chỉ chặn khi đang ở trang AI */
    if (verb === 'aix' && cur && /^(ai|report)$/.test(cur.page.feature || '')) need = cur.page.feature;
    if (need && !window.PLANS.has(need)) { denyHome(need); return true; }

    switch (verb) {
      case 'go': location.hash = '#' + act.slice(3); return true;
      case 'toast': toast(act.slice(6)); return true;
      /* sao chép nội dung một câu trả lời AI */
      case 'copymsg': {
        var mb = el && el.closest('.ig-msg'), tx = '';
        if (mb) { var cl = mb.querySelector('.body').cloneNode(true); var ac = cl.querySelector('.ig-msg-actions'); if (ac) ac.remove(); tx = cl.innerText.trim(); }
        try { if (navigator.clipboard && tx) navigator.clipboard.writeText(tx); } catch (e) { /* bỏ qua */ }
        toast('Đã sao chép nội dung'); return true;
      }

      /* --- việc cần xử lý --- */
      case 'inbox': {
        var ikey = a.slice(2).join(':'), ist2 = db.inboxState = db.inboxState || {};
        ist2[ikey] = ist2[ikey] || {};
        if (arg === 'done') { ist2[ikey].done = true; ist2[ikey].doneAt = S.fmtDateTime(new Date()); toast('Đã đánh dấu xong'); }
        if (arg === 'undo') { ist2[ikey].done = false; toast('Đã mở lại việc'); }
        S.save(); refresh(); updateBell(); return true;
      }
      /* --- bước phễu trong chi tiết chiến dịch: lọc tab tương ứng --- */
      case 'camp':
        if (arg === 'stage') { var sp2 = arg2.split(':'); view.tab = parseInt(sp2[0], 10) || 0; view.f.stage = sp2[1] || ''; refresh(); }
        return true;
      /* --- đổi kiểu xem Bảng / Kanban --- */
      case 'view': view.view = arg; S.data.settings.libraryView = arg; S.save(); refresh(); return true;

      /* --- Creator --- */
      case 'creator':
        if (arg === 'add') {
          askText('Thêm Creator', 'Username TikTok', '', function (u) {
            if (!u) return;
            u = u.replace(/^@/, '');
            var c = { id: S.uid('c'), oecId: S.uid('oec'), name: u, user: u,
              tiktok: 'https://www.tiktok.com/@' + u, catL1: '600001', cat2: '600372', cat: 'Khác',
              avgCommission: 0, contentLabel: 1, agency: 2, langs: ['0'], risingStar: false,
              ageGroups: [1], gender: 3, genderPct: 5000,
              country: 'Việt Nam', region: 'TP.HCM', followers: 0, gmv30: 0, gmvBand: 1, gpm: 0, postRate: 0,
              avgViews: 0, liveViewers: 0, unitsSold: 0, unitsBand: 1, engagement: 0, fulfillment: 2,
              brands: [], promoting: 0, contact: false, email: '', phone: '', rel: {} };
            S.rel(c, sid).saved = true;
            db.creators.unshift(c);
            S.log('Thêm Creator @' + u + ' vào Kho', 'Creator', sid);
            S.save(); closeLayer(); toast('Đã thêm @' + u + ' vào Kho Creator'); refresh();
          }, 'Nhập username, ví dụ @huyenmy.review');
        } else {
          openDrawer(P.creatorDrawer(arg, sid));
        }
        return true;

      case 'save': {
        if (arg === 'settings') { S.save(); toast('Đã lưu thay đổi'); return true; }
        var c1 = S.creator(arg); if (!c1) return true;
        var r1 = S.rel(c1, sid); r1.saved = !r1.saved;
        S.save(); toast(r1.saved ? 'Đã lưu ' + c1.name + ' vào Kho' : 'Đã bỏ khỏi Kho'); refresh();
        return true;
      }
      case 'invite': {
        var c2 = S.creator(arg); if (!c2) return true;
        if (S.isBlacklisted(c2.id, sid)) { toast('Creator đang trong blacklist, không gửi được'); return true; }
        if (!window.PLANS.take('invites', sid, 1)) return true;
        var r2 = S.rel(c2, sid);
        r2.state = 'Đã mời'; r2.saved = true; r2.invitedAt = S.fmtDate(new Date());
        S.log('Gửi lời mời tới ' + c2.name, 'Chiến dịch', sid);
        S.save(); toast('Đã gửi lời mời tới ' + c2.name); refresh();
        return true;
      }
      case 'message': {
        var c3 = S.creator(arg); if (!c3) return true;
        var tpls = db.templates.filter(function (x) { return x.kind === 'message'; });
        openModal(U.modal({
          title: 'Nhắn tin cho ' + c3.name,
          body: U.field('Mẫu tin nhắn', U.select(tpls[0].name, { pick: 'msgtpl', opts: tpls.map(function (x) { return { v: x.id, l: x.name }; }) })) +
            '<div style="height:12px"></div>' +
            U.field('Nội dung', U.textarea({ rows: 4, value: tpls[0].body.replace('{tên Creator}', c3.name).replace('{tên shop}', S.shop(sid).name), bind: '__msg' })),
          foot: U.btn('Hủy', { act: 'modal:close' }) + U.btn('Gửi', { variant: 'primary', icon: 'msgSend', act: 'modal:ok' })
        }));
        MODAL_OK = function () {
          closeLayer();
          if (!window.PLANS.take('msgs', sid, 1)) return;
          S.log('Gửi tin nhắn tới ' + c3.name, 'Chiến dịch', sid);
          S.save(); closeLayer(); toast('Đã gửi tin nhắn tới ' + c3.name); refresh();
        };
        return true;
      }
      case 'untag': {
        var c4 = S.creator(arg); if (!c4) return true;
        var r4 = S.rel(c4, sid);
        r4.tags = r4.tags.filter(function (x) { return x !== arg2; });
        S.save(); openDrawer(P.creatorDrawer(arg, sid)); refresh();
        return true;
      }
      case 'tagpick':
        optionMenu(el, 'addtag:' + arg, db.tags.map(function (t2) { return { v: t2.id, l: t2.name }; }), null);
        return true;

      /* --- thao tác hàng loạt --- */
      case 'bulk': {
        var ids = arg === 'inviteOne' ? [arg2] : selected();
        if (!ids.length) { toast('Chưa chọn dòng nào'); return true; }
        if (arg === 'save' || arg === 'unsave') {
          ids.forEach(function (id) { var c = S.creator(id); if (c) S.rel(c, sid).saved = (arg === 'save'); });
          toast(arg === 'save' ? 'Đã lưu ' + ids.length + ' Creator vào Kho' : 'Đã bỏ ' + ids.length + ' Creator khỏi Kho');
        } else if (arg === 'invite' || arg === 'inviteOne') {
          var todo = ids.filter(function (id) { var c = S.creator(id); return c && !S.isBlacklisted(id, sid) && S.rel(c, sid).state === 'Mới'; });
          if (!todo.length) { toast('Những Creator này đã được mời trước đó'); clearSel(); refresh(); return true; }
          var sent = window.PLANS.take('invites', sid, todo.length);
          if (!sent) { clearSel(); refresh(); return true; }
          todo.slice(0, sent).forEach(function (id) {
            var r = S.rel(S.creator(id), sid); r.state = 'Đã mời'; r.saved = true; r.invitedAt = S.fmtDate(new Date());
          });
          S.log('Gửi ' + sent + ' lời mời hàng loạt', 'Chiến dịch', sid);
          toast(sent < todo.length ? 'Đã gửi ' + sent + '/' + todo.length + ' lời mời · đã hết hạn mức hôm nay' : 'Đã gửi ' + sent + ' lời mời');
        } else if (arg === 'black') {
          ids.forEach(function (id) {
            if (S.isBlacklisted(id, sid)) return;
            db.blacklist.unshift({ id: S.uid('b'), shopId: sid, creatorId: id, reason: 'Thêm hàng loạt',
              by: USER(), at: S.fmtDate(new Date()) });
          });
          S.log('Thêm ' + ids.length + ' Creator vào blacklist', 'Creator', sid);
          toast('Đã thêm ' + ids.length + ' Creator vào blacklist');
        } else if (arg === 'tag') {
          optionMenu(el, 'bulktag', db.tags.map(function (t2) { return { v: t2.id, l: t2.name }; }), null);
          return true;
        } else if (arg === 'message') {
          var nm = window.PLANS.take('msgs', sid, ids.length);
          if (!nm) { clearSel(); refresh(); return true; }
          S.log('Gửi ' + nm + ' tin nhắn hàng loạt', 'Chiến dịch', sid);
          toast(nm < ids.length ? 'Đã đưa ' + nm + '/' + ids.length + ' tin nhắn vào hàng đợi · đã hết hạn mức hôm nay' : 'Đã đưa ' + nm + ' tin nhắn vào hàng đợi gửi');
        }
        clearSel(); S.save(); refresh(); closeLayer();
        return true;
      }
      case 'sel': if (arg === 'none') { clearSel(); refresh(); } return true;

      /* --- bộ lọc --- */
      case 'filters':
        if (arg === 'toggle') {
          var adv = document.getElementById('filters-adv');
          if (adv) {
            var open = adv.hasAttribute('hidden');
            if (open) adv.removeAttribute('hidden'); else adv.setAttribute('hidden', '');
            el.setAttribute('aria-expanded', open);
          }
        } else if (arg === 'reset') { view.f = {}; view.q = ''; view.page = 1; refresh(); }
        else if (arg === 'clear') { delete view.f[arg2]; view.page = 1; refresh(); }
        else if (arg === 'save') {
          var keys = Object.keys(view.f).filter(function (k) { return view.f[k] && view.f[k] !== 'all'; });
          if (!keys.length && !view.q) { toast('Chưa có điều kiện nào để lưu'); return true; }
          askText('Lưu bộ lọc', 'Tên bộ lọc', 'Bộ lọc ' + ((view.saved || []).length + 1), function (n) {
            if (!n) return;
            view.saved = view.saved || [];
            view.saved.push({ name: n, desc: (view.q ? '“' + view.q + '” · ' : '') + keys.map(function (k) { return view.f[k]; }).join(' · '),
              f: JSON.parse(JSON.stringify(view.f)), q: view.q });
            closeLayer(); toast('Đã lưu bộ lọc “' + n + '”'); refresh();
          });
        } else if (arg === 'apply') {
          var sv = (view.saved || [])[parseInt(arg2, 10)];
          if (sv) { view.f = JSON.parse(JSON.stringify(sv.f)); view.q = sv.q; view.tab = 0; view.page = 1; refresh(); toast('Đã áp dụng bộ lọc'); }
        } else if (arg === 'del') {
          (view.saved || []).splice(parseInt(arg2, 10), 1); refresh();
        }
        return true;
      case 'f': view.f[arg] = arg2; view.page = 1; refresh(); return true;
      case 'fq':
        if (view.f[arg] === arg2) delete view.f[arg]; else view.f[arg] = arg2;
        view.page = 1; refresh(); return true;

      /* --- đồng bộ, xuất --- */
      case 'sync':
        toast('Đang đồng bộ với TikTok Shop…');
        setTimeout(function () {
          S.shop(sid).sync = 'Hôm nay ' + S.fmtDateTime(new Date()).split(' ')[1];
          S.log('Đồng bộ dữ liệu từ shop', 'Đồng bộ', sid); S.save();
          toast('Đồng bộ xong'); refresh();
        }, 700);
        return true;
      case 'export': exportCSV(arg); return true;
      case 'import':
        toast('Chọn tệp .xlsx hoặc .csv để nhập — kết nối khi bật API');
        return true;

      /* --- nhãn --- */
      case 'tag':
        if (arg === 'new') {
          askText('Tạo tag', 'Tên tag', '', function (n) {
            if (!n) return;
            db.tags.push({ id: S.uid('t'), name: n, desc: 'Tag mới', by: USER() });
            S.save(); closeLayer(); toast('Đã tạo tag “' + n + '”'); refresh();
          });
        } else if (arg === 'edit') {
          var tg = S.tag(arg2);
          askText('Sửa tag', 'Tên tag', tg ? tg.name : '', function (n) {
            if (tg && n) { tg.name = n; S.save(); }
            closeLayer(); refresh();
          });
        } else if (arg === 'del') {
          var tg2 = S.tag(arg2);
          confirmBox('Xóa tag', 'Xóa tag “' + (tg2 ? tg2.name : '') + '”? Creator đang gắn tag này sẽ được gỡ tag.', 'Xóa', function () {
            db.tags = db.tags.filter(function (x) { return x.id !== arg2; });
            db.creators.forEach(function (c) {
              Object.keys(c.rel).forEach(function (k) {
                c.rel[k].tags = c.rel[k].tags.filter(function (x) { return x !== arg2; });
              });
            });
            S.save(); closeLayer(); toast('Đã xóa tag'); refresh();
          });
        }
        return true;

      /* --- blacklist --- */
      case 'black':
        if (arg === 'new') {
          openModal(U.modal({
            title: 'Thêm vào blacklist',
            body: U.field('Creator', U.select('Chọn Creator', { pick: 'blackpick',
              opts: db.creators.filter(function (c) { return !S.isBlacklisted(c.id, sid); }).slice(0, 40)
                .map(function (c) { return { v: c.id, l: c.name + ' · @' + c.user }; }) })) +
              '<div style="height:12px"></div>' + U.field('Lý do', U.input({ value: '', bind: '__reason' })),
            foot: U.btn('Hủy', { act: 'modal:close' }) + U.btn('Thêm', { variant: 'danger', act: 'modal:ok' })
          }));
          MODAL_OK = function () {
            if (!PICKED.black) { toast('Chưa chọn Creator'); return; }
            var reason = (document.querySelector('.ig-modal input[data-bind="__reason"]') || {}).value || 'Không nêu lý do';
            db.blacklist.unshift({ id: S.uid('b'), shopId: sid, creatorId: PICKED.black, reason: reason, by: USER(), at: S.fmtDate(new Date()) });
            S.log('Thêm Creator vào blacklist', 'Creator', sid); S.save();
            PICKED.black = null; closeLayer(); toast('Đã thêm vào blacklist'); refresh();
          };
        } else if (arg === 'add') {
          if (S.isBlacklisted(arg2, sid)) { toast('Creator đã có trong blacklist'); return true; }
          db.blacklist.unshift({ id: S.uid('b'), shopId: sid, creatorId: arg2, reason: 'Thêm từ hồ sơ', by: USER(), at: S.fmtDate(new Date()) });
          S.save(); closeLayer(); toast('Đã thêm vào blacklist'); refresh();
        } else if (arg === 'del') {
          db.blacklist = db.blacklist.filter(function (b) { return b.id !== arg2; });
          S.save(); toast('Đã gỡ khỏi blacklist'); refresh();
        }
        return true;

      /* --- chiến dịch --- */
      case 'campaign':
        if (arg === 'group') { view.group = !view.group; view.page = 1; delete view.f.batch; refresh(); return true; }
        if (arg === 'lot') { view.f.batch = arg2; view.group = false; view.page = 1; refresh(); return true; }
        if (arg === 'new') {
          var target = arg2 === 'invite' ? 'invites' : 'messages';
          window.WIZ.start(arg2, sid, vs(target));
          var path = '/s/' + sid + '/campaigns/' + target;
          if (currentPath() !== path) location.hash = '#' + path; else refresh();
        } else {
          var cp = null;
          db.campaigns.forEach(function (x) { if (x.id === arg2) cp = x; });
          if (!cp) return true;
          if (arg === 'pause') { cp.status = 'Tạm dừng'; toast('Đã tạm dừng “' + cp.name + '”'); }
          else if (arg === 'run') {
            if (!window.PLANS.check('tasks', cp.shopId).ok) { window.PLANS.denyLimit('tasks', cp.shopId); return true; }
            if (!cp.total) cp.total = 100;
            var inc = Math.min(cp.total - cp.sent, parseInt(cp.perRun, 10) || 50);
            if (inc > 0) { inc = window.PLANS.take(cp.kind === 'message' ? 'msgs' : 'invites', cp.shopId, inc); if (!inc) return true; }
            cp.status = 'Đang chạy';
            cp.sent = Math.min(cp.total, cp.sent + Math.max(0, inc));
            cp.accepted = Math.round(cp.sent * 0.36);
            toast('Đang chạy “' + cp.name + '”');
          } else if (arg === 'dup') {
            var copy = JSON.parse(JSON.stringify(cp));
            copy.id = S.uid('cp'); copy.name = cp.name + ' (bản sao)'; copy.status = 'Nháp';
            copy.sent = 0; copy.accepted = 0; copy.by = USER(); copy.at = S.fmtDateTime(new Date());
            db.campaigns.unshift(copy); toast('Đã nhân bản thành bản nháp');
          } else if (arg === 'del') {
            confirmBox('Xóa chiến dịch', 'Xóa “' + cp.name + '”? Không thể hoàn tác.', 'Xóa', function () {
              db.campaigns = db.campaigns.filter(function (x) { return x.id !== arg2; });
              S.save(); closeLayer(); toast('Đã xóa chiến dịch');
              if (cur && cur.page.id === 'campaign-detail') location.hash = '#/s/' + cp.shopId + '/campaigns/' + (cp.kind === 'invite' ? 'invites' : 'messages');
              else refresh();
            });
            return true;
          } else if (arg === 'open') {
            location.hash = '#/s/' + cp.shopId + '/campaigns/c/' + cp.id;
            return true;
          } else if (arg === 'refill') {
            if (cp.status === 'Hoàn thành' && !window.PLANS.check('tasks', cp.shopId).ok) { window.PLANS.denyLimit('tasks', cp.shopId); return true; }
            cp.total += 50; if (cp.status === 'Hoàn thành') cp.status = 'Đang chạy';
            toast('Đã bù thêm 50 Creator khớp bộ lọc vào “' + cp.name + '”');
          } else if (arg === 'extend') {
            cp.endDays = (cp.endDays || 0) + 14;
            var ed = S.today(); ed.setDate(ed.getDate() + cp.endDays); cp.end = S.fmtDate(ed);
            toast('Đã gia hạn tới ' + cp.end);
          }
          S.log('Cập nhật chiến dịch “' + cp.name + '”', 'Chiến dịch', sid);
          S.save(); closeLayer(); refresh();
        }
        return true;

      /* --- mẫu --- */
      case 'tpl': {
        if (arg === 'new') {
          var kind = arg2;
          openModal(U.modal({
            title: kind === 'invite' ? 'Tạo mẫu lời mời' : 'Tạo mẫu tin nhắn',
            body: U.field('Tên mẫu', U.input({ value: '', bind: '__name' })) + '<div style="height:12px"></div>' +
              U.field('Nội dung', U.textarea({ rows: 4, value: 'Chào {tên Creator}, ', bind: '__body' })),
            foot: U.btn('Hủy', { act: 'modal:close' }) + U.btn('Tạo', { variant: 'primary', act: 'modal:ok' })
          }));
          MODAL_OK = function () {
            var n = (document.querySelector('.ig-modal input[data-bind="__name"]') || {}).value;
            var b = (document.querySelector('.ig-modal textarea[data-bind="__body"]') || {}).value;
            if (!n) { toast('Nhập tên mẫu'); return; }
            db.templates.push(kind === 'invite'
              ? { id: S.uid('t'), kind: 'invite', name: n, scope: 'Tất cả SP', com: 15, free: true, uses: 0, body: b }
              : { id: S.uid('t'), kind: 'message', name: n, vars: '{tên Creator}', mtype: 'Văn bản', uses: 0, body: b });
            S.save(); closeLayer(); toast('Đã tạo mẫu'); refresh();
          };
        } else if (arg === 'edit') {
          var tp2 = S.tpl(arg2); if (!tp2) return true;
          openModal(U.modal({
            title: 'Sửa mẫu',
            body: U.field('Tên mẫu', U.input({ value: tp2.name, bind: '__name' })) + '<div style="height:12px"></div>' +
              U.field('Nội dung', U.textarea({ rows: 5, value: tp2.body, bind: '__body' })),
            foot: U.btn('Hủy', { act: 'modal:close' }) + U.btn('Lưu', { variant: 'primary', act: 'modal:ok' })
          }));
          MODAL_OK = function () {
            tp2.name = (document.querySelector('.ig-modal input[data-bind="__name"]') || {}).value || tp2.name;
            tp2.body = (document.querySelector('.ig-modal textarea[data-bind="__body"]') || {}).value || tp2.body;
            S.save(); closeLayer(); toast('Đã lưu mẫu'); refresh();
          };
        } else if (arg === 'dup') {
          var tp3 = S.tpl(arg2); if (!tp3) return true;
          var cp2 = JSON.parse(JSON.stringify(tp3)); cp2.id = S.uid('t'); cp2.name = tp3.name + ' (bản sao)'; cp2.uses = 0;
          db.templates.push(cp2); S.save(); toast('Đã nhân bản mẫu'); refresh();
        } else if (arg === 'del') {
          db.templates = db.templates.filter(function (x) { return x.id !== arg2; });
          S.save(); toast('Đã xóa mẫu'); refresh();
        }
        return true;
      }

      /* --- hàng mẫu ---
         Luồng bám theo Affiliate Seller API: duyệt/từ chối có lý do, gửi tin nhắn
         mẫu hàng loạt (tối đa 100, chỉ khi đang Chờ duyệt), xem hành trình vận đơn. */
      case 'sample': {
        var SY_WAIT = 300;                       /* chờ 5 phút giữa 2 lần đồng bộ */
        function find(id) { var out = null; db.samples.forEach(function (x) { if (x.id === id) out = x; }); return out; }
        function picked() {
          return selected().map(find).filter(Boolean);
        }
        function needPick(list) {
          if (!list.length) { toast('Vui lòng chọn yêu cầu mẫu'); return true; }
          return false;
        }
        function approve(sp) {
          if (sp.status !== 'PENDING') return false;
          sp.status = 'AWAITING_SHIPMENT';
          if (!sp.orderId) sp.orderId = String(Date.now()) + String(Math.floor(100000 + Math.random() * 899999));
          return true;
        }
        function reject(sp, reason) {
          if (sp.status !== 'PENDING') return false;
          sp.status = 'CANCELLED';
          sp.rejectReason = reason || 'NOT_MATCH';
          return true;
        }

        if (arg === 'sync') {
          var lastSy = db.sampleSync[sid] || 0, gone = Math.floor(Date.now() / 1000) - lastSy;
          if (gone < SY_WAIT) {
            toast('Vừa cập nhật xong, thử lại sau ' + Math.ceil((SY_WAIT - gone) / 60) + ' phút');
            return true;
          }
          if (S.shop(sid).status !== 'ok') { toast('Shop chưa ủy quyền, không kéo được dữ liệu mẫu'); return true; }
          toast('Đang kéo dữ liệu yêu cầu mẫu từ TikTok…');
          setTimeout(function () {
            db.sampleSync[sid] = Math.floor(Date.now() / 1000);
            db.samples.forEach(function (x) {
              if (x.shopId === sid && x.logisticsInfo.trackingNo) {
                x.logisticsInfo.fetchedAt = db.sampleSync[sid];
                if (x.logisticsInfo.syncStatus === 'FAILED' && Math.random() > 0.3) x.logisticsInfo.syncStatus = 'SUCCESS';
              }
            });
            S.log('Cập nhật dữ liệu yêu cầu mẫu', 'Hàng mẫu', sid);
            S.save(); toast('Đã cập nhật dữ liệu yêu cầu mẫu'); refresh();
          }, 700);
          return true;
        }

        if (arg === 'review') {
          var sp0 = find(arg2); if (!sp0) return true;
          openModal(U.modal({
            title: 'Duyệt mẫu',
            body: '<p style="margin:0 0 4px;font-size:14px;line-height:22px;color:var(--text-secondary)">' +
              'Bạn có đồng ý yêu cầu mẫu của <b>@' + U.esc(sp0.creatorInfo.username) + '</b> không?</p>' +
              U.kv([['Sản phẩm', sp0.productInfo.title], ['SKU', sp0.sku],
                ['Hoa hồng', sp0.commissionRate + '%'],
                ['Tỷ lệ đăng dự kiến', Math.round(Number(sp0.fulfillmentPercentage) || 0) + '%']]),
            foot: U.btn('Từ chối', { act: 'sample:rejectAsk:' + sp0.id }) +
              '<span style="flex:1"></span>' + U.btn('Hủy', { act: 'modal:close' }) +
              U.btn('Đồng ý', { variant: 'primary', act: 'sample:approve:' + sp0.id })
          }));
          return true;
        }

        if (arg === 'rejectAsk' || arg === 'bulkRejectAsk') {
          var bulkR = arg === 'bulkRejectAsk';
          if (bulkR && needPick(picked())) return true;
          REJ = REJ || 'NOT_MATCH';
          openModal(U.modal({
            title: 'Duyệt mẫu',
            body: '<p style="margin:0 0 10px;font-size:13.5px;color:var(--text-secondary)">Vui lòng chọn lý do từ chối</p>' +
              '<div class="ig-reasons">' + S.REJECT_REASONS.map(function (r) {
                return '<label class="ig-reason' + (REJ === r.v ? ' on' : '') + '" data-do="sample:reason:' + r.v + '">' +
                  '<span class="gm-radio' + (REJ === r.v ? ' on' : '') + '"></span>' +
                  '<span class="ic">' + ic(r.ic) + '</span><span class="t">' + U.esc(r.l) + '</span></label>';
              }).join('') + '</div>' +
              (REJ === 'OTHER' ? '<div style="margin-top:10px">' +
                U.field('Ghi chú (không gửi cho Creator)', U.input({ ph: 'Nhập lý do cụ thể', bind: '__rej' })) + '</div>' : ''),
            foot: U.btn('Hủy', { act: 'modal:close' }) + '<span style="flex:1"></span>' +
              U.btn('Xác nhận', { variant: 'primary', act: bulkR ? 'sample:bulkRejectDo' : 'sample:rejectDo:' + arg2 })
          }));
          return true;
        }
        if (arg === 'reason') {
          REJ = arg2;
          var openBulk = !!document.querySelector('[data-do="sample:bulkRejectDo"]');
          var oneId = (document.querySelector('[data-do^="sample:rejectDo:"]') || { getAttribute: function () { return ''; } })
            .getAttribute('data-do').split(':')[2] || '';
          dispatch(openBulk ? 'sample:bulkRejectAsk' : 'sample:rejectAsk:' + oneId, el);
          return true;
        }

        if (arg === 'approve') {
          var sp1 = find(arg2); if (!sp1) return true;
          if (!approve(sp1)) { toast('Yêu cầu mẫu không tồn tại hoặc đã được xử lý'); closeLayer(); refresh(); return true; }
          S.log('Duyệt yêu cầu mẫu của @' + sp1.creatorInfo.username, 'Hàng mẫu', sid);
          S.save(); closeLayer(); toast('Duyệt mẫu thành công'); refresh();
          return true;
        }
        if (arg === 'rejectDo') {
          var sp2 = find(arg2); if (!sp2) return true;
          if (!reject(sp2, REJ)) { toast('Yêu cầu mẫu không tồn tại hoặc đã được xử lý'); }
          else { S.log('Từ chối yêu cầu mẫu của @' + sp2.creatorInfo.username, 'Hàng mẫu', sid); toast('Đã từ chối yêu cầu mẫu'); }
          REJ = 'NOT_MATCH'; S.save(); closeLayer(); refresh();
          return true;
        }

        if (arg === 'bulkApprove' || arg === 'bulkReject') {
          var list1 = picked();
          if (needPick(list1)) return true;
          if (arg === 'bulkReject') return dispatch('sample:bulkRejectAsk', el);
          confirmBox('Duyệt mẫu', 'Áp dụng “Duyệt” cho ' + list1.length + ' Creator đã chọn?', 'Đồng ý', function () {
            var okN = 0;
            list1.forEach(function (x) { if (approve(x)) okN++; });
            S.log('Duyệt ' + okN + ' yêu cầu mẫu', 'Hàng mẫu', sid);
            clearSel(); S.save(); closeLayer();
            toast(okN === list1.length ? 'Duyệt mẫu thành công · ' + okN + ' yêu cầu'
              : 'Đã duyệt ' + okN + '/' + list1.length + ', phần còn lại không còn ở trạng thái chờ duyệt');
            refresh();
          });
          return true;
        }
        if (arg === 'bulkRejectDo') {
          var list2 = picked(), okR = 0;
          list2.forEach(function (x) { if (reject(x, REJ)) okR++; });
          S.log('Từ chối ' + okR + ' yêu cầu mẫu', 'Hàng mẫu', sid);
          REJ = 'NOT_MATCH'; clearSel(); S.save(); closeLayer();
          toast('Đã từ chối ' + okR + ' yêu cầu mẫu'); refresh();
          return true;
        }

        if (arg === 'lib' || arg === 'black') {
          var sp3 = find(arg2); if (!sp3) return true;
          var cr3 = S.creator(sp3.creatorId);
          if (arg === 'lib') {
            sp3.isLibrary = !sp3.isLibrary;
            db.samples.forEach(function (x) { if (x.creatorId === sp3.creatorId) x.isLibrary = sp3.isLibrary; });
            if (cr3) S.rel(cr3, sid).saved = sp3.isLibrary;
            toast(sp3.isLibrary ? 'Đã lưu @' + sp3.creatorInfo.username + ' vào Kho Creator' : 'Đã bỏ khỏi Kho Creator');
            S.save(); refresh();
            return true;
          }
          if (sp3.isBlack) {
            db.blacklist = db.blacklist.filter(function (b) { return !(b.creatorId === sp3.creatorId && b.shopId === sid); });
            db.samples.forEach(function (x) { if (x.creatorId === sp3.creatorId) x.isBlack = false; });
            S.save(); toast('Đã bỏ khỏi danh sách đen'); refresh();
            return true;
          }
          confirmBox('Thêm vào danh sách đen',
            'Chặn @' + sp3.creatorInfo.username + '? Creator bị chặn sẽ không được mời lại từ shop này.',
            'Thêm vào danh sách đen', function () {
              db.blacklist.unshift({ id: S.uid('b'), shopId: sid, creatorId: sp3.creatorId,
                reason: 'Chặn từ màn hàng mẫu', by: db.settings.profile.name, at: S.fmtDate(new Date()) });
              db.samples.forEach(function (x) { if (x.creatorId === sp3.creatorId) x.isBlack = true; });
              S.log('Thêm @' + sp3.creatorInfo.username + ' vào danh sách đen', 'Creator', sid);
              S.save(); closeLayer(); toast('Đã thêm vào danh sách đen'); refresh();
            });
          return true;
        }

        if (arg === 'bulkLib' || arg === 'bulkBlack') {
          var list3 = picked();
          if (needPick(list3)) return true;
          var lib = arg === 'bulkLib';
          confirmBox(lib ? 'Lưu Creator' : 'Thêm vào danh sách đen',
            'Áp dụng “' + (lib ? 'Lưu Creator' : 'Thêm vào danh sách đen') + '” cho ' + list3.length + ' Creator đã chọn?',
            'Đồng ý', function () {
              var seen = {};
              list3.forEach(function (x) {
                if (seen[x.creatorId]) return;
                seen[x.creatorId] = 1;
                var cr = S.creator(x.creatorId);
                if (lib) {
                  if (cr) S.rel(cr, sid).saved = true;
                  db.samples.forEach(function (y) { if (y.creatorId === x.creatorId) y.isLibrary = true; });
                } else {
                  if (!S.isBlacklisted(x.creatorId, sid)) {
                    db.blacklist.unshift({ id: S.uid('b'), shopId: sid, creatorId: x.creatorId,
                      reason: 'Chặn hàng loạt từ màn hàng mẫu', by: db.settings.profile.name, at: S.fmtDate(new Date()) });
                  }
                  db.samples.forEach(function (y) { if (y.creatorId === x.creatorId) y.isBlack = true; });
                }
              });
              var nn = Object.keys(seen).length;
              S.log((lib ? 'Lưu ' : 'Chặn ') + nn + ' Creator từ màn hàng mẫu', 'Creator', sid);
              clearSel(); S.save(); closeLayer();
              toast(lib ? 'Đã lưu ' + nn + ' Creator' : 'Đã chặn ' + nn + ' Creator'); refresh();
            });
          return true;
        }

        if (arg === 'bulkCampaign') {
          var list4 = picked();
          if (needPick(list4)) return true;
          var wz = window.WIZ.start('invite', sid, vs('invites'));
          var uniq = {};
          list4.forEach(function (x) { uniq[x.creatorId] = true; });
          wz.source = 'db'; wz.sel = uniq; wz.step = 0;
          clearSel();
          toast('Đã điền sẵn ' + Object.keys(uniq).length + ' Creator vào lời mời mới');
          location.hash = '#/s/' + sid + '/campaigns/invites';
          return true;
        }

        if (arg === 'bulkMsg') {
          var list5 = picked();
          if (needPick(list5)) return true;
          var wrong = list5.filter(function (x) { return x.status !== 'PENDING'; }).length;
          if (wrong) { toast('Chỉ gửi tin nhắn mẫu cho yêu cầu đang chờ duyệt'); return true; }
          if (list5.length > 100) { toast('Mỗi lần chỉ chọn tối đa 100 yêu cầu mẫu'); return true; }
          MSG = { text: '', image: null };
          msgModal(list5.length);
          return true;
        }
        if (arg === 'msgPic') {
          MSG.image = MSG.image ? null : { imageUrl: 'sample-card.png', cosUrl: '', width: 800, height: 800 };
          msgModal(selected().length);
          return true;
        }
        if (arg === 'msgSend') {
          var list6 = picked();
          if (!list6.length) { toast('Không có yêu cầu mẫu nào để gửi'); return true; }
          var still = list6.filter(function (x) { return x.status === 'PENDING'; });
          var nmk = window.PLANS.take('msgs', sid, still.length);
          if (still.length && !nmk) { closeLayer(); return true; }
          still = still.slice(0, nmk);
          toast('Đang gửi tin nhắn mẫu…');
          setTimeout(function () {
            still.forEach(function (x) { x.msgSentAt = Math.floor(Date.now() / 1000); });
            S.log('Gửi tin nhắn mẫu cho ' + still.length + ' Creator', 'Hàng mẫu', sid);
            MSG = null; clearSel(); S.save(); closeLayer();
            toast(still.length === list6.length
              ? 'Đã gửi tin nhắn mẫu cho ' + still.length + ' Creator'
              : 'Đã gửi ' + still.length + '/' + list6.length + '. Một số yêu cầu không còn ở trạng thái chờ duyệt nên không được gửi');
            refresh();
          }, 600);
          return true;
        }

        if (arg === 'content') {
          var sp9 = find(arg2); if (!sp9) return true;
          CT = { id: sp9.id, tab: (sp9.contents || []).some(function (x) { return x.type === 'VIDEO'; }) ? 0 : 1 };
          contentDrawer();
          return true;
        }
        if (arg === 'ctab') { CT.tab = parseInt(arg2, 10) || 0; contentDrawer(); return true; }

        if (arg === 'rate') {
          var spA = find(arg2); if (!spA) return true;
          RATE = spA.rating || 0;
          rateModal(spA);
          return true;
        }
        if (arg === 'star') {
          RATE = parseInt(arg2, 10) || 0;
          var spB = null;
          db.samples.forEach(function (x) {
            var btn = document.querySelector('[data-do^="sample:rateSave:"]');
            if (btn && btn.getAttribute('data-do').split(':')[2] === x.id) spB = x;
          });
          if (spB) {
            var keep = document.querySelector('.ig-modal textarea');
            if (keep) spB.ratingNote = keep.value;
            rateModal(spB);
          }
          return true;
        }
        if (arg === 'rateSave') {
          var spC = find(arg2); if (!spC) return true;
          if (!RATE) { toast('Vui lòng chọn số sao'); return true; }
          var note = document.querySelector('.ig-modal textarea');
          spC.rating = RATE;
          spC.ratingNote = note ? note.value.trim() : '';
          S.log('Đánh giá ' + RATE + ' sao cho @' + spC.creatorInfo.username, 'Hàng mẫu', sid);
          RATE = 0; S.save(); closeLayer(); toast('Đã lưu đánh giá'); refresh();
          return true;
        }

        if (arg === 'chat') {
          var sp4 = find(arg2); if (!sp4) return true;
          openDrawer(P.creatorDrawer(sp4.creatorId, sid));
          toast('Mở hồ sơ để nhắn tin với @' + sp4.creatorInfo.username);
          return true;
        }
        if (arg === 'open') {
          var sp5 = find(arg2);
          if (sp5 && sp5.video) window.open(sp5.video, '_blank', 'noopener');
          return true;
        }
        return true;
      }

      /* --- vận đơn --- */
      case 'ship': {
        function findS(id) { var out = null; db.samples.forEach(function (x) { if (x.id === id) out = x; }); return out; }
        function remind(x) {
          if (!window.PLANS.take('msgs', sid, 1)) return false;
          x.note = 'Đã nhắc ' + S.fmtDateTime(new Date());
          return true;
        }

        if (arg === 'trail') {
          var sp6 = findS(arg2); if (!sp6) return true;
          var lg = sp6.logisticsInfo;
          var items = (lg.trail || []).slice().reverse();
          openModal(U.modal({
            title: 'Hành trình vận chuyển',
            body: U.kv([['Mã vận đơn', lg.trackingNo || '—'], ['Đơn vị vận chuyển', lg.carrierName || '—'],
              ['Creator', '@' + sp6.creatorInfo.username], ['Sản phẩm', sp6.productInfo.title],
              ['Đồng bộ gần nhất', lg.fetchedAt ? S.ts(lg.fetchedAt) : '—']]) +
              (items.length
                ? '<ul class="ig-trail">' + items.map(function (t, i) {
                    return '<li' + (i === 0 ? ' class="on"' : '') + '><span class="dot"></span>' +
                      '<div><b>' + U.esc(t.actionCodeName || t.actionCode) + '</b>' +
                      '<span>' + U.esc(t.description) + '</span>' +
                      '<i>' + S.ts(Math.floor(t.updateTimeMillis / 1000)) + '</i></div></li>';
                  }).join('') + '</ul>'
                : U.empty('Chưa có thông tin vận chuyển',
                    'Bấm Đồng bộ vận chuyển rồi mở lại để xem hành trình mới nhất.')),
            foot: (lg.syncStatus === 'FAILED'
              ? '<span class="sum warn">' + ic('alert') + 'Đồng bộ vận chuyển thất bại</span>' : '') +
              '<span style="flex:1"></span>' +
              U.btn('Đồng bộ lại', { icon: 'refresh', act: 'ship:resync:' + sp6.id }) +
              U.btn('Đóng', { variant: 'primary', act: 'modal:close' })
          }));
          return true;
        }
        if (arg === 'resync') {
          var sp7 = findS(arg2); if (!sp7) return true;
          toast('Đang đồng bộ vận đơn ' + sp7.logisticsInfo.trackingNo + '…');
          setTimeout(function () {
            sp7.logisticsInfo.syncStatus = 'SUCCESS';
            sp7.logisticsInfo.fetchedAt = Math.floor(Date.now() / 1000);
            S.save(); closeLayer(); toast('Đã đồng bộ vận đơn'); refresh();
          }, 600);
          return true;
        }
        if (arg === 'syncAll') {
          var mine = db.samples.filter(function (x) { return x.shopId === sid && x.logisticsInfo.trackingNo; });
          if (!mine.length) { toast('Chưa có vận đơn nào để đồng bộ'); return true; }
          toast('Đang đồng bộ ' + mine.length + ' vận đơn…');
          setTimeout(function () {
            var fixed = 0;
            mine.forEach(function (x) {
              x.logisticsInfo.fetchedAt = Math.floor(Date.now() / 1000);
              if (x.logisticsInfo.syncStatus === 'FAILED') { x.logisticsInfo.syncStatus = 'SUCCESS'; fixed++; }
            });
            S.log('Đồng bộ ' + mine.length + ' vận đơn hàng mẫu', 'Hàng mẫu', sid);
            S.save(); toast('Đã đồng bộ ' + mine.length + ' vận đơn' + (fixed ? ', khắc phục ' + fixed + ' đơn lỗi' : ''));
            refresh();
          }, 700);
          return true;
        }
        if (arg === 'remind') {
          var sp8 = findS(arg2); if (!sp8) return true;
          remind(sp8);
          S.log('Nhắc @' + sp8.creatorInfo.username + ' lên nội dung', 'Hàng mẫu', sid);
          S.save(); toast('Đã gửi nhắc cho @' + sp8.creatorInfo.username); refresh();
          return true;
        }
        if (arg === 'bulkRemind') {
          var ids3 = selected();
          if (!ids3.length) { toast('Vui lòng chọn vận đơn'); return true; }
          db.samples.forEach(function (x) { if (ids3.indexOf(x.id) > -1) remind(x); });
          S.log('Gửi nhắc hàng loạt cho ' + ids3.length + ' Creator', 'Hàng mẫu', sid);
          clearSel(); S.save(); toast('Đã gửi nhắc cho ' + ids3.length + ' Creator'); refresh();
          return true;
        }
        if (arg === 'remindLate') {
          var late = db.samples.filter(function (x) { return x.shopId === sid && S.isLate(x); });
          if (!late.length) { toast('Không có đơn nào quá hạn'); return true; }
          confirmBox('Gửi nhắc hàng loạt',
            'Gửi nhắc cho ' + late.length + ' Creator đã ký nhận mẫu quá 5 ngày mà chưa đăng nội dung?', 'Gửi nhắc', function () {
              late.forEach(remind);
              S.log('Gửi nhắc ' + late.length + ' Creator quá hạn', 'Hàng mẫu', sid);
              S.save(); closeLayer(); toast('Đã gửi nhắc cho ' + late.length + ' Creator'); refresh();
            });
          return true;
        }
        return true;
      }

      /* --- sao chép nhanh --- */
      case 'copy': {
        var text = act.slice(5);
        try {
          if (navigator.clipboard) navigator.clipboard.writeText(text);
          else {
            var ta = document.createElement('textarea');
            ta.value = text; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); ta.remove();
          }
          toast('Đã sao chép ' + text);
        } catch (e) { toast('Không sao chép được, vui lòng copy tay'); }
        return true;
      }

      /* --- tự động hóa --- */
      case 'auto': {
        function findR(id) { var o = null; db.autoInvites.forEach(function (r) { if (r.id === id) o = r; }); return o; }
        if (arg === 'new') {
          askText('Tạo quy tắc lời mời tự động', 'Tên quy tắc', 'Quy tắc mới', function (n) {
            if (!n) return;
            db.autoInvites.unshift({ id: S.uid('ai'), shopId: sid, name: n, filter: 'Bộ lọc mặc định',
              templateId: db.templates[0].id, schedule: '08:00 hằng ngày', limit: 50, on: false,
              last: 'Chưa chạy', runs: 0 });
            S.save(); closeLayer(); toast('Đã tạo quy tắc'); refresh();
          });
        } else if (arg === 'toggle') {
          var r5 = findR(arg2); if (r5) { r5.on = !r5.on; S.save(); toast(r5.on ? 'Đã bật quy tắc' : 'Đã tắt quy tắc'); refresh(); }
        } else if (arg === 'run') {
          var r6 = findR(arg2); if (!r6) return true;
          var pool2 = db.creators.filter(function (c) { return !S.isBlacklisted(c.id, sid) && S.rel(c, sid).state === 'Mới'; })
            .slice(0, r6.limit);
          var k6 = window.PLANS.take('invites', sid, pool2.length);
          if (pool2.length && !k6) return true;
          pool2 = pool2.slice(0, k6);
          pool2.forEach(function (c) { var r = S.rel(c, sid); r.state = 'Đã mời'; r.saved = true; r.invitedAt = S.fmtDate(new Date()); });
          r6.runs++; r6.last = 'Vừa xong · ' + pool2.length + ' mời · 0 lỗi';
          S.log('Chạy quy tắc “' + r6.name + '” · ' + pool2.length + ' lời mời', 'Chiến dịch', sid);
          S.save(); toast('Đã mời ' + pool2.length + ' Creator mới khớp bộ lọc'); refresh();
        } else if (arg === 'edit') {
          var r7 = findR(arg2); if (!r7) return true;
          openModal(U.modal({
            title: 'Sửa quy tắc',
            body: U.field('Tên quy tắc', U.input({ value: r7.name, bind: '__name' })) + '<div style="height:12px"></div>' +
              U.field('Lịch chạy', U.select(r7.schedule, { pick: 'rule.schedule:' + r7.id,
                opts: ['08:00 hằng ngày', '14:00 hằng ngày', '09:00 thứ 2, 5'] })) + '<div style="height:12px"></div>' +
              U.field('Giới hạn mỗi lần', U.input({ value: r7.limit, bind: '__limit' })),
            foot: U.btn('Hủy', { act: 'modal:close' }) + U.btn('Lưu', { variant: 'primary', act: 'modal:ok' })
          }));
          MODAL_OK = function () {
            r7.name = (document.querySelector('.ig-modal input[data-bind="__name"]') || {}).value || r7.name;
            r7.limit = parseInt((document.querySelector('.ig-modal input[data-bind="__limit"]') || {}).value, 10) || r7.limit;
            S.save(); closeLayer(); toast('Đã lưu quy tắc'); refresh();
          };
        } else if (arg === 'del') {
          db.autoInvites = db.autoInvites.filter(function (r) { return r.id !== arg2; });
          S.save(); toast('Đã xóa quy tắc'); refresh();
        }
        return true;
      }
      case 'autoMsg': {
        var rm = null; db.autoMessages.forEach(function (r) { if (r.id === arg2) rm = r; });
        if (arg === 'toggle' && rm) { rm.on = !rm.on; S.save(); toast(rm.on ? 'Đã bật quy tắc' : 'Đã tắt quy tắc'); refresh(); }
        else if (arg === 'run' && rm) { rm.last = 'Vừa xong · 5 tin'; S.save(); toast('Đã chạy thử, gửi 5 tin nhắn'); refresh(); }
        else if (arg === 'del') { db.autoMessages = db.autoMessages.filter(function (r) { return r.id !== arg2; }); S.save(); toast('Đã xóa quy tắc'); refresh(); }
        else if (arg === 'edit' && rm) { dispatch('tpl:edit:' + rm.templateId, el); }
        return true;
      }

      /* --- cửa hàng --- */
      case 'shop':
        if (arg === 'new') {
          if (overLimit('shops')) return true;
          askText('Ủy quyền shop mới', 'Tên cửa hàng', '', function (n) {
            if (!n) return;
            var id = 'shop-' + Math.random().toString(36).slice(2, 7);
            db.shops.push({ id: id, flag: S.market().flag, name: n, country: S.market().name, cur: S.cur(), status: 'ok',
              expires: S.ago(-365), sync: 'Vừa xong', owner: USER(), limit: 300, gap: '45 – 90 giây', used: 0 });
            db.products[id] = [];
            S.log('Ủy quyền cửa hàng “' + n + '”', 'Cài đặt', id);
            S.save(); closeLayer(); toast('Đã thêm cửa hàng, hãy đồng bộ sản phẩm'); location.hash = '#/shops/' + id;
          }, 'Bước tiếp theo mở trang ủy quyền dịch vụ của TikTok Shop để chủ gian hàng đồng ý cấp quyền.');
        } else if (arg === 'open') { location.hash = '#/shops/' + arg2; }
        else if (arg === 'auth') {
          var sh5 = S.shop(arg2);
          toast('Đang mở trang cấp quyền TikTok Shop…');
          setTimeout(function () {
            sh5.status = 'ok'; sh5.expires = S.ago(-365); sh5.sync = 'Vừa xong';
            if (!sh5.inviteLimit) { sh5.inviteLimit = 10000; sh5.soft = 3000; }
            S.log('Cập nhật ủy quyền ' + sh5.name, 'Cài đặt', sh5.id); S.save();
            toast('Đã cập nhật ủy quyền cho ' + sh5.name); refresh(true);
          }, 800);
        } else if (arg === 'sync') { dispatch('sync:shop', el); }
        else if (arg === 'unlink') {
          var sh6 = S.shop(arg2);
          var last = db.shops.length <= 1;
          confirmBox('Gỡ liên kết', 'Gỡ “' + sh6.name + '” khỏi GOPUSH? Dữ liệu đã đồng bộ sẽ bị xóa.' +
            (last ? ' Đây là gian hàng cuối cùng: tài khoản sẽ về trạng thái chưa liên kết, mọi tính năng bị khóa tới khi liên kết lại.' : ''), 'Gỡ liên kết', function () {
            if (last) {
              window.AUTH.setLinked(false); S.reset(); VIEW = {};
              state.shop = S.data.shops[0].id; store.set('gopush.shop', state.shop);
              S.log('Gỡ liên kết ' + sh6.name, 'Cài đặt'); S.save(); closeLayer(); toast('Đã gỡ liên kết gian hàng'); location.hash = '#/home';
              return;
            }
            db.shops = db.shops.filter(function (s) { return s.id !== arg2; });
            if (state.shop === arg2 && db.shops.length) { state.shop = db.shops[0].id; store.set('gopush.shop', state.shop); }
            S.save(); closeLayer(); toast('Đã gỡ liên kết'); location.hash = '#/shops';
          });
        }
        return true;
      case 'product': {
        var pr = null;
        (db.products[sid] || []).forEach(function (p) { if (p.id === arg2) pr = p; });
        if (pr) { pr.active = !pr.active; S.save(); toast(pr.active ? 'Đã mở bán lại' : 'Đã ngừng bán'); refresh(); }
        return true;
      }

      /* --- nhóm --- */
      case 'member':
        if (arg === 'new') {
          if (overLimit('subs')) return true;
          askText('Mời thành viên', 'Email', '', function (e2) {
            if (!e2) return;
            db.members.push({ id: S.uid('m'), name: e2.split('@')[0], email: e2, role: 'BD',
              shops: S.shop(sid).name, status: 'Chờ nhận lời mời', last: '—' });
            S.log('Mời thành viên ' + e2, 'Nhóm'); S.save(); closeLayer();
            toast('Đã gửi lời mời tới ' + e2); refresh();
          }, 'Lời mời gửi qua email, hết hạn sau 7 ngày.');
        } else if (arg === 'lock') {
          db.members.forEach(function (m) {
            if (m.id === arg2) { m.status = m.status === 'Đã khóa' ? 'Hoạt động' : 'Đã khóa'; toast((m.status === 'Đã khóa' ? 'Đã khóa “' : 'Đã mở khóa “') + m.name + '”'); }
          });
          S.save(); refresh();
        } else if (arg === 'del') {
          db.members = db.members.filter(function (m) { return m.id !== arg2; });
          S.save(); toast('Đã xóa thành viên'); refresh();
        } else if (arg === 'shops') {
          optionMenu(el, 'memberShops:' + arg2, db.shops.map(function (s) { return { v: s.id, l: s.name }; }).concat([{ v: 'all', l: 'Tất cả' }]), null);
        }
        return true;
      case 'role':
        if (arg === 'new') toast('Vai trò tùy chỉnh sẽ mở ở bản tiếp theo');
        return true;

      /* --- báo cáo --- */
      case 'report':
        if (arg === 'focus') {
          view.focusId = arg2; refresh();
        } else if (arg === 'open') {
          var rp = null; db.aiReports.forEach(function (r) { if (r.id === arg2) rp = r; });
          if (rp) openModal(U.modal({
            title: rp.name, wide: true,
            body: U.kv([['Loại', rp.kind], ['Phạm vi', rp.scope], ['Tạo lúc', rp.at], ['Người tạo', rp.by],
              ['Trạng thái', U.tag(rp.status), true]]) +
              '<div style="height:16px"></div>' +
              U.banner('Bản đầy đủ của report này nằm ở phần “Report mẫu” phía dưới danh sách.'),
            foot: U.btn('Đóng', { act: 'modal:close' }) + U.btn('Tải CSV', { variant: 'primary', icon: 'download', act: 'report:download:' + rp.id })
          }));
        } else if (arg === 'download') { exportCSV('custom'); }
        else if (arg === 'share') { toast('Đã sao chép liên kết chia sẻ report'); }
        else if (arg === 'del') {
          db.aiReports = db.aiReports.filter(function (r) { return r.id !== arg2; });
          S.save(); toast('Đã xóa report'); refresh();
        } else if (arg === 'save') { toast('Đã lưu báo cáo vào danh sách của bạn'); }
        else if (arg === 'schedule') {
          db.aiReports.unshift({ id: S.uid('r'), name: 'Báo cáo định kỳ ' + S.fmtDate(new Date()), kind: 'Tổng hợp',
            scope: S.shop(sid).name + ' · hằng tuần', at: 'Thứ 2 hằng tuần', by: 'Lịch tự động', status: 'Đã lên lịch' });
          S.save(); toast('Đã lên lịch report hằng tuần'); refresh();
        }
        return true;

      /* --- menu GOPUSH AI (ai.js) --- */
      case 'aix': return window.AIX.action(a.slice(1), el, ctxFor(cur.page), refresh, toast);
      /* --- Phân loại, Kho, Gắn Tag, tải xuống của module Creator (creators.js) --- */
      case 'ann': return window.ANN.action(a.slice(1), el, ctxFor(cur.page), refresh, toast);
      case 'crx': return window.CRX.action(a.slice(1), el, ctxFor(cur.page), refresh, toast);

      /* --- GOPUSH AI --- */
      case 'ai':
        if (arg === 'ask') { askAI(arg2); }
        else if (arg === 'send') {
          var ta = document.querySelector('#aipanel [data-prompt]') || document.querySelector('[data-prompt]');
          var q = ta ? ta.value.trim() : '';
          if (!q) { toast('Nhập câu hỏi trước đã'); return true; }
          askAI(q);
        } else if (arg === 'clear') { db.chat = []; S.save(); if (onChatPage()) refresh(); else renderAI(); }
        else if (arg === 'close') { state.ai = false; renderAI(); }
        else if (arg === 'redo') { var last = db.chat.filter(function (m) { return m.role === 'me'; }).pop(); if (last) askAI(last.text, true); }
        else if (arg === 'report') {
          db.aiReports.unshift({ id: S.uid('r'), name: 'Phân tích theo yêu cầu ' + S.fmtDateTime(new Date()),
            kind: 'Phân tích', scope: S.shop(sid).name + ' · 30 ngày', at: S.fmtDateTime(new Date()),
            by: 'GOPUSH AI', status: 'Hoàn thành' });
          S.save(); toast('Đã tạo report mới trong mục Report'); refresh();
        } else if (arg === 'resetSettings') {
          confirmBox('Khôi phục mặc định', 'Đặt lại toàn bộ thiết lập GOPUSH AI về mặc định?', 'Khôi phục', function () {
            S.reset(); closeLayer(); toast('Đã khôi phục mặc định'); refresh(true);
          });
        } else if (arg === 'addExample') {
          askText('Thêm ví dụ huấn luyện', 'Câu hỏi mẫu', '', function (q2) {
            if (!q2) return;
            db.settings.ai.examples.push({ q: q2, a: 'Trả lời ngắn gọn kèm bảng số liệu.' });
            S.save(); closeLayer(); refresh();
          });
        } else if (arg === 'delExample') {
          db.settings.ai.examples.splice(parseInt(arg2, 10), 1); S.save(); refresh();
        }
        return true;
      case 'ask': {
        /* thanh hỏi nhanh dưới bảng: có chữ thì hỏi luôn, không thì mở panel */
        var box = el && el.closest ? el.closest('.ig-ask') : null;
        var inp = box ? box.querySelector('input') : null;
        var qq = inp ? inp.value.trim() : '';
        if (inp) inp.value = '';
        if (qq) askAI(qq); else toggleAI(true);
        return true;
      }

      /* --- cài đặt --- */
      case 'set': togglePath(act.slice(4)); refresh(); return true;
      case 'notify': {
        var key = a.slice(1, a.length - 1).join(':'), idx = parseInt(a[a.length - 1], 10);
        var n2 = db.settings.notify[key];
        if (n2) { n2[idx] = n2[idx] ? 0 : 1; S.save(); refresh(); }
        return true;
      }
      case 'invoice': toast('Đang tải hóa đơn ' + arg); return true;
      case 'billing': location.hash = '#/settings/billing'; return true;

      /* --- wizard tạo lời mời / đợt nhắn tin --- */
      case 'wz': {
        var ctx = ctxFor(cur.page);
        var res = window.WIZ.action(a.slice(1), el, ctx, refresh, toast);
        if (res === true || res === false) return true;
        if (res && res.productModal) { PROD = null; productModal(ctx, res.productModal); return true; }
        if (res && res.catModal) { CATV.q = ''; catModal(ctx); return true; }
        if (res && res.tplModal) { tplModal(res.tplModal); return true; }
        if (res && res.tplPicked) {
          closeLayer(); toast('Đã chèn mẫu “' + res.tplPicked + '”'); refresh();
          return true;
        }
        if (res && res.bulkCom) {
          askText('Chỉnh hoa hồng hàng loạt', 'Tỷ lệ hoa hồng tiêu chuẩn (%)', '18', function (val) {
            var num2 = parseInt(val, 10);
            if (!(num2 >= 1 && num2 <= 80)) { toast('Hoa hồng phải từ 1 đến 80%'); return; }
            ctx.v.wz.products.forEach(function (x) { x.com = num2; });
            closeLayer(); toast('Đã đặt hoa hồng ' + num2 + '% cho tất cả sản phẩm'); refresh();
          });
          return true;
        }
        if (res && res.create) {
          if (res.create === 'Đang chạy') {
            var wk = ctx.v.wz && ctx.v.wz.kind === 'message' ? 'msgs' : 'invites';
            if (!window.PLANS.check('tasks', ctx.shop.id).ok) { window.PLANS.denyLimit('tasks', ctx.shop.id); return true; }
            if (window.PLANS.room(wk, ctx.shop.id) <= 0) { window.PLANS.denyLimit(wk, ctx.shop.id); return true; }
          }
          var made = window.WIZ.create(ctx, res.create);
          var vw5 = vs(cur.page.id);
          vw5.f = { batch: made.batchId }; vw5.group = false; vw5.tab = 0; vw5.page = 1;
          toast(res.create === 'Nháp'
            ? 'Đã lưu nháp “' + made.name + '” · ' + S.num(made.campaigns) + ' chiến dịch'
            : 'Đã tạo ' + S.num(made.campaigns) + ' chiến dịch, gửi ' + S.num(made.creators) + ' lời mời');
          refresh();
          return true;
        }
        return true;
      }

      /* --- tác vụ điều chỉnh kế hoạch --- */
      case 'tk': {
        var ctxT = ctxFor(cur.page);
        var resT = window.TASKS.action(a.slice(1), ctxT, refresh, toast);
        if (resT === true || resT === false || !resT) return true;
        if (resT.productModal) { PROD = null; productModal(ctxT, 'task'); return true; }
        if (resT.modal) { openModal(resT.modal); return true; }
        if (resT.bulkCom) {
          askText('Thiết lập hàng loạt', 'Tỷ lệ hoa hồng tiêu chuẩn (%)', '18', function (val) {
            var nn = parseInt(val, 10);
            if (!(nn >= 1 && nn <= 80)) { toast('Hoa hồng phải từ 1 đến 80%'); return; }
            ctxT.v.tk.products.forEach(function (x) { x.com = nn; });
            closeLayer(); toast('Đã đặt hoa hồng ' + nn + '% cho tất cả sản phẩm'); refresh();
          });
          return true;
        }
        if (resT.confirmClean) {
          var nInv = Object.keys(ctxT.v.sel).filter(function (k) { return ctxT.v.sel[k]; }).length;
          confirmBox('Hủy toàn bộ lời mời?',
            'Sẽ hủy ' + nInv + ' lời mời đã chọn. Thao tác này không thể hoàn tác.', 'Hủy lời mời', function () {
              var mk = window.TASKS.create(ctxT);
              ctxT.v.tk = null; ctxT.v.q = ''; ctxT.v.sel = {}; ctxT.v.page = 1; ctxT.v.tab = 0;
              closeLayer(); toast('Đã tạo tác vụ ' + mk.code); refresh();
            });
          return true;
        }
        if (resT.created) {
          var vt = vs(cur.page.id);
          vt.tk = null; vt.q = ''; vt.sel = {}; vt.page = 1; vt.tab = 0;
          toast('Đã tạo tác vụ ' + resT.created.code + ' · ' + resT.created.invitationIds.length + ' lời mời');
          refresh();
          return true;
        }
        return true;
      }

      /* --- popup hạng mục --- */
      case 'cat': {
        var ctx3 = ctxFor(cur.page), w4 = ctx3.v.wz;
        if (!w4) return true;
        if (arg === 'l1') CATV.l1 = arg2;
        else if (arg === 'pick') {
          var i3 = w4.f.cats.indexOf(arg2);
          if (i3 > -1) w4.f.cats.splice(i3, 1); else w4.f.cats.push(arg2);
          w4.page = 1;
        } else if (arg === 'clear') { w4.f.cats = []; w4.page = 1; }
        catModal(ctx3);
        refreshFoot();
        return true;
      }

      /* --- popup chọn sản phẩm --- */
      case 'prodpick': {
        if (!PROD) return true;
        var limit2 = PROD.mode === 'card' ? 5 : 0;
        var cnt = Object.keys(PROD.sel).filter(function (k) { return PROD.sel[k]; }).length;
        if (!PROD.sel[arg] && limit2 && cnt >= limit2) { toast('Tối đa ' + limit2 + ' thẻ sản phẩm'); return true; }
        PROD.sel[arg] = !PROD.sel[arg];
        productModal(ctxFor(cur.page), PROD.mode);
        return true;
      }
      case 'prodapply': {
        if (!PROD) return true;
        var ctx2 = ctxFor(cur.page), w3 = ctx2.v.wz;
        var ids4 = Object.keys(PROD.sel).filter(function (k) { return PROD.sel[k]; });
        if (!ids4.length) { toast('Chưa chọn sản phẩm nào'); return true; }
        if (PROD.mode === 'task') {
          var tk4 = ctx2.v.tk, keepT = {};
          tk4.products.forEach(function (x) { keepT[x.id] = x; });
          tk4.products = ids4.slice(0, 100).map(function (id) {
            if (keepT[id]) return keepT[id];
            var pT = null; (db.products[sid] || []).forEach(function (q) { if (q.id === id) pT = q; });
            return { id: id, com: pT ? pT.com : 15, adsOn: false, adsCom: pT ? Math.max(1, pT.com - 6) : 10 };
          });
          PROD = null; closeLayer(); toast('Đã thêm ' + ids4.length + ' sản phẩm'); refresh();
          return true;
        }
        if (PROD.mode === 'card') {
          w3.cards = ids4.slice(0, 5);
        } else {
          var keep = {};
          w3.products.forEach(function (x) { keep[x.id] = x; });
          w3.products = ids4.map(function (id) {
            if (keep[id]) return keep[id];
            var pr2 = null; (db.products[sid] || []).forEach(function (q) { if (q.id === id) pr2 = q; });
            return { id: id, com: pr2 ? pr2.com : 15, adsOn: true, adsCom: pr2 ? Math.max(1, pr2.com - 6) : 10 };
          });
        }
        PROD = null; closeLayer(); toast('Đã thêm ' + ids4.length + ' sản phẩm'); refresh();
        return true;
      }

      /* --- lớp nổi --- */
      case 'modal':
        if (arg === 'close') { closeLayer(); MODAL_OK = null; }
        else if (arg === 'ok' && MODAL_OK) { var f = MODAL_OK; MODAL_OK = null; f(); }
        return true;
      case 'drawer': closeLayer(); return true;
      case 'auth':
        if (arg === 'google') { toast('Đang chuyển tới Google…'); setTimeout(function () { location.hash = '#/home'; }, 600); }
        return true;
    }
    return false;
  }

  /* --------------------------------------------------------- GOPUSH AI dạng panel
     Panel nằm cạnh nội dung, tự đọc ngữ cảnh trang đang xem: phạm vi shop,
     bộ lọc đang bật, số dòng đang chọn. Câu trả lời vẫn do P.aiAnswer dựng. */
  var AI_SUGGEST = {
    overview: ['Hôm nay nên ưu tiên việc gì?', 'Tóm tắt 7 ngày qua', 'Shop nào đang tụt GMV?'],
    creators: ['Creator nào nên tăng hoa hồng tháng tới?', 'Lọc Creator giống nhóm đang bán tốt', 'Ai nhận mẫu mà chưa đăng?'],
    collab: ['So sánh hiệu quả các chiến dịch đang chạy', 'Chiến dịch nào nên dừng?', 'Viết lại mẫu lời mời cho tỉ lệ chấp nhận cao hơn'],
    samples: ['Vận đơn nào quá hạn chưa có video?', 'Creator nào hay xin mẫu mà không đăng?', 'Tỉ lệ lên nội dung theo sản phẩm'],
    results: ['Tổng quan 30 ngày qua', 'Nguồn GMV đến từ đâu?', 'Dự báo GMV tháng tới'],
    business: ['Ai đang dùng nhiều hạn mức nhất?', 'Shop nào sắp hết hạn ủy quyền?', 'Tóm tắt nhật ký tuần này'],
    ai: ['Tổng quan 30 ngày qua', 'So sánh hiệu quả các chiến dịch đang chạy', 'Creator nào nên tăng hoa hồng tháng tới?']
  };
  function onChatPage() { return cur && cur.page.id === 'ai-chat'; }

  function aiCtx() {
    var p = cur ? cur.page : null, m = cur ? cur.module : null, view = p ? vs(p.id) : null;
    var nf = view ? Object.keys(view.f).filter(function (k) { return view.f[k] && view.f[k] !== 'all'; }).length + (view.q ? 1 : 0) : 0;
    var nsel = view ? Object.keys(view.sel || {}).filter(function (k) { return view.sel[k]; }).length : 0;
    return {
      page: p ? label(p) : '', scope: state.all ? 'Tất cả cửa hàng' : S.shop(state.shop).name,
      filters: nf, selected: nsel, suggest: AI_SUGGEST[m ? m.id : 'overview'] || AI_SUGGEST.overview,
      shop: S.shop(state.shop), period: S.data.settings.ai.period
    };
  }

  function renderAI() {
    var old = document.getElementById('aipanel');
    var app = document.querySelector('.ig-app');
    if (app) app.classList.toggle('ai-open', state.ai);
    var aib = document.getElementById('ai-btn');
    if (aib) aib.classList.toggle('on', state.ai);
    if (!state.ai) { if (old) old.remove(); return; }
    var html = P.aiPanel(aiCtx());
    if (old) old.outerHTML = html;
    else { var body = document.querySelector('.ig-body'); if (body) body.insertAdjacentHTML('beforeend', html); }
    var sc = document.querySelector('.ig-ai-scroll');
    if (sc) sc.scrollTop = sc.scrollHeight;
  }

  function toggleAI(force) {
    if (!state.ai && (!window.AUTH.linked() || !window.PLANS.has('ai'))) { denyHome('ai'); return; }
    state.ai = force === true ? true : !state.ai;
    renderAI();
    if (state.ai) { var ta = document.querySelector('#aipanel [data-prompt]'); if (ta) ta.focus(); }
  }

  /* trên trang AI Chat thì trả lời ngay trong trang (có các bước suy nghĩ),
     ở trang khác thì mở panel bên phải */
  function askAI(q, redo) {
    if (!window.AUTH.linked() || !window.PLANS.has('ai')) { denyHome('ai'); return; }
    var db = S.data, full = onChatPage();
    if (!redo) db.chat.push({ role: 'me', text: q, ctx: aiCtx().page });
    var reply = { role: 'ai', pending: true };
    db.chat.push(reply);
    S.save();
    function show() {
      if (onChatPage()) {
        refresh();
        var sc = document.getElementById('aix-chat'); if (sc) sc.scrollTop = sc.scrollHeight;
        var ta = document.querySelector('.ig-xchat [data-prompt]'); if (ta) ta.focus();
      } else { state.ai = true; renderAI(); }
    }
    show();
    setTimeout(function () {
      var ctx = { shop: S.shop(state.shop), v: v() };
      reply.pending = false; reply.html = P.aiAnswer(q, ctx);
      if (db.settings.ai.logAll) S.log('Hỏi GOPUSH AI: ' + q.slice(0, 60), 'Khác', state.shop);
      S.save(); show();
    }, full ? 2100 : 420);
  }

  var PICKED = {};

  /* --------------------------------------------------------- chọn giá trị từ menu */
  function onChoose(key, val) {
    var db = S.data, sid = shopId(), view = v(), p = key.split(':'), head = p[0], rest = p.slice(1).join(':');
    closeMenus();
    if (head === 'f') { view.f[rest] = val; view.page = 1; refresh(); return; }
    if (head === 'wzf' && view.wz) { view.wz[rest] = val; refresh(); return; }

    /* tác vụ: tkf ghi thẳng vào t, tk1 ghi vào bộ lọc t.f */
    if (head === 'tkf' && view.tk) {
      view.tk[rest] = /^-?\d+$/.test(val) ? parseInt(val, 10) : val;
      if (rest === 'sfield') { view.q = ''; view.page = 1; }
      refresh(); return;
    }
    if (head === 'tk1' && view.tk) { view.tk.f[rest] = val; view.page = 1; refresh(); return; }

    /* wz1:<bucket>.<khóa> — chọn một giá trị, '' là bỏ lọc */
    if (head === 'wz1' && view.wz) {
      var w = view.wz, dot = rest.indexOf('.');
      var bucket = rest.slice(0, dot), key = rest.slice(dot + 1);
      var num3 = val === '' ? null : (/^-?\d+$/.test(val) ? parseInt(val, 10) : val);
      if (bucket === 'f') w.f[key] = num3;
      else if (bucket === 'd') w.d[key] = val;
      else w[key] = num3;
      w.page = 1; refresh(); return;
    }

    /* kênh liên hệ */
    if (head === 'wzc' && view.wz) {
      view.wz.contacts[parseInt(rest, 10)].field = parseInt(val, 10);
      refresh(); return;
    }
    if (head === 'wzcc' && view.wz) {
      view.wz.contacts[parseInt(rest, 10)].cc = val;
      refresh(); return;
    }
    if (head === 'set') { setPath(rest, val); refresh(); return; }
    if (head === 'addtag') {
      var c = S.creator(rest);
      if (c) { var r = S.rel(c, sid); if (r.tags.indexOf(val) < 0) r.tags.push(val); S.save(); openDrawer(P.creatorDrawer(rest, sid)); refresh(); }
      return;
    }
    if (head === 'bulktag') {
      selected().forEach(function (id) {
        var cc = S.creator(id); if (!cc) return;
        var rr = S.rel(cc, sid); if (rr.tags.indexOf(val) < 0) rr.tags.push(val);
      });
      var tg = S.tag(val);
      toast('Đã gắn tag “' + (tg ? tg.name : '') + '” cho ' + selected().length + ' Creator');
      clearSel(); S.save(); refresh(); return;
    }
    if (head === 'owner') {
      var c2 = S.creator(rest); if (c2) { S.rel(c2, sid).owner = val; S.save(); openDrawer(P.creatorDrawer(rest, sid)); refresh(); }
      return;
    }
    if (head === 'inbox') {
      var key0 = rest.replace(/^owner:/, ''), ist = P.inboxItems && (db.inboxState = db.inboxState || {});
      ist[key0] = ist[key0] || {}; ist[key0].owner = val;
      S.log('Giao việc cho ' + val, 'Khác'); S.save(); toast('Đã giao cho ' + val); refresh(); return;
    }
    if (head === 'member') {
      db.members.forEach(function (m) { if (m.id === rest) m.role = val; });
      S.log('Đổi vai trò thành viên', 'Nhóm'); S.save(); toast('Đã đổi vai trò'); refresh(); return;
    }
    if (head === 'memberShops') {
      db.members.forEach(function (m) { if (m.id === rest) m.shops = val === 'all' ? 'Tất cả' : S.shop(val).name; });
      S.save(); toast('Đã cập nhật shop được giao'); refresh(); return;
    }
    if (head === 'blackpick') {
      PICKED.black = val;
      var c3 = S.creator(val);
      var btn = document.querySelector('.ig-modal [data-pick="blackpick"] .val');
      if (btn && c3) btn.textContent = c3.name + ' · @' + c3.user;
      return;
    }
    if (head === 'msgtpl') {
      var tp = S.tpl(val), ta = document.querySelector('.ig-modal textarea');
      var lbl = document.querySelector('.ig-modal [data-pick="msgtpl"] .val');
      if (tp && ta) ta.value = tp.body;
      if (tp && lbl) lbl.textContent = tp.name;
      return;
    }
    if (head === 'rule.schedule') {
      db.autoInvites.forEach(function (r) { if (r.id === rest) r.schedule = val; });
      var l2 = document.querySelector('.ig-modal [data-pick^="rule.schedule"] .val');
      if (l2) l2.textContent = val;
      S.save(); return;
    }
    if (head === 'wz.templateId') {
      WZ.templateId = val; wizard(WZ.kind, WZ.step); return;
    }
    if (head === 'wz.target') { WZ.target = val; wizard(WZ.kind, WZ.step); return; }
    if (head === 'wz.gap') { WZ.gap = val; wizard(WZ.kind, WZ.step); return; }
    refresh();
  }

  /* --------------------------------------------------------- menu hệ thống */
  function shopMenu(anchor) {
    var html = '<div class="h">Phạm vi xem</div>' +
      '<button data-shop="all"><span>' + ic('store') + '</span><span style="flex:1">Tất cả cửa hàng</span>' +
        '<span class="gm-help">gộp số liệu</span>' + (state.all ? ic('check') : '') + '</button>' +
      '<div class="h" style="border-top:1px solid var(--border-light);margin-top:4px;padding-top:8px">Từng cửa hàng</div>' +
      S.data.shops.map(function (s) {
        var dot = s.status === 'ok' ? 'var(--success)' : (s.status === 'warn' ? 'var(--warning)' : 'var(--danger)');
        return '<button data-shop="' + s.id + '"><span>' + s.flag + '</span><span style="flex:1">' + U.esc(s.name) +
          '</span><i class="gm-dot" style="background:' + dot + '"></i>' + (!state.all && s.id === state.shop ? ic('check') : '') + '</button>';
      }).join('') + '<div class="h" style="border-top:1px solid var(--border-light);margin-top:4px;padding-top:8px">' +
      '<a class="gm-link" href="#/shops">Quản lý cửa hàng</a></div>';
    openMenu(anchor, html);
  }

  function userMenu(anchor) {
    var adm = window.AUTH && window.AUTH.isAdmin();
    openMenu(anchor, '<div class="ig-me-mini">' + U.bear() + '<span><b>' + U.esc(USER()) +
        (adm ? ' <em class="ig-role-adm">Admin hệ thống</em>' : '') + '</b><small>' +
        U.esc(S.data.settings.profile.email) + '</small>' +
        (adm ? '' : '<a class="ig-me-plan" data-go="/settings/billing">' + planTag(true) + '<span>Xem gói</span></a>') + '</span></div>' +
      '<button data-go="/settings/profile">' + ic('user') + 'Hồ sơ</button>' +
      '<button data-go="/settings/billing">' + ic('card') + 'Gói &amp; thanh toán</button>' +
      '<div class="sep"></div>' +

      '<div class="row">' + ic(state.theme === 'dark' ? 'moon' : 'sun') + '<span>Giao diện tối</span>' +
        '<span class="gm-switch' + (state.theme === 'dark' ? ' on' : '') + '" data-themetoggle role="switch" aria-checked="' + (state.theme === 'dark') + '"></span></div>' +
      '<button data-helpcenter>' + ic('help') + 'Trợ giúp &amp; liên hệ hỗ trợ</button>' +
      '<div class="sep"></div>' +
      '<button data-reset>' + ic('refresh') + 'Đặt lại dữ liệu thử</button>' +
      '<button data-signout>' + ic('logout') + U.esc(t('signout')) + '</button>');
  }

  function setLang(l, noRender) {
    state.lang = l; store.set('gopush.lang', l); S.setLang(l); document.documentElement.lang = l; I.use(l);
    if (!noRender) render();
  }
  function setTheme(th) {
    state.theme = th; store.set('gopush.theme', th);
    document.documentElement.setAttribute('data-theme', th);
  }

  /* --------------------------------------------------------- sự kiện */
  document.addEventListener('click', function (e) {
    var el;
    /* bấm ra ngoài thì đóng menu; bấm trong menu để nguyên,
       vì onChoose và nhánh data-multi tự quyết định đóng hay giữ */
    if (!e.target.closest('.ig-menu')) closeMenus();

    /* menu hệ thống */
    if ((el = e.target.closest('#shop-btn'))) { e.preventDefault(); shopMenu(el); return; }
    if ((el = e.target.closest('#user-btn'))) { e.preventDefault(); userMenu(el); return; }
    if ((el = e.target.closest('#market-btn'))) { e.preventDefault(); marketMenu(el); return; }
    if ((el = e.target.closest('#lang-btn'))) { e.preventDefault(); langMenu(el); return; }
    if ((el = e.target.closest('[data-market]'))) { closeMenus(); setMarket(el.getAttribute('data-market')); return; }
    if (e.target.closest('[data-signout]')) {
      closeMenus();
      window.AUTH.signOut().then(function () { S.useUser(''); state.ai = false; VIEW = {}; location.hash = '#/login'; });
      return;
    }
    if ((el = e.target.closest('[data-shop], [data-pickshop]'))) {
      var pick = el.getAttribute('data-shop') || el.getAttribute('data-pickshop');
      if (pick === 'all') { state.all = true; }
      else { state.all = false; state.shop = pick; store.set('gopush.shop', pick); }
      store.set('gopush.all', state.all ? '1' : '0'); closeMenus();
      var hitNow = match(currentPath());
      if (hitNow && hitNow.route && hitNow.route.page.path.indexOf('{shop}') > -1) {
        /* trang chi tiết (có id) không đổi shop được: về danh sách của mục cha */
        var pg = hitNow.route.page.navAs && hitNow.id ? pageById(hitNow.route.page.navAs).page : hitNow.route.page;
        var next = href(pg);
        if (next === location.hash) render(); else location.hash = next;
      } else render();
      return;
    }
    /* bấm module trên sidebar: mở / thu menu con. Khi sidebar đang thu về cột icon
       (hoặc màn hình hẹp) thì menu con bị ẩn, nên đi thẳng tới trang đầu của module. */
    if ((el = e.target.closest('[data-navtoggle]'))) {
      e.preventDefault();
      /* module không có trang nào mở được với gói hiện tại: hiện popup luôn */
      var modId = el.getAttribute('data-navtoggle'), mod = D.MODULES.filter(function (x) { return x.id === modId; })[0];
      if (mod && !mod.pages.some(function (pg) { return !pg.hidden && canOpen(pg); })) {
        if (location.hash !== '#/home') location.hash = '#/home';
        setTimeout(function () { denyFor(mod.pages[0].feature); }, 80);
        return;
      }
      var narrow = document.querySelector('.ig-app.sub-collapsed') || window.innerWidth <= 1100;
      if (narrow) { location.hash = el.getAttribute('data-first'); return; }
      var mid = el.getAttribute('data-navtoggle'), grp = el.parentNode, i = NAV_OPEN.indexOf(mid);
      if (i > -1) NAV_OPEN.splice(i, 1); else NAV_OPEN.push(mid);
      saveNav();
      grp.classList.toggle('is-open', i < 0);
      el.setAttribute('aria-expanded', String(i < 0));
      return;
    }
    if ((el = e.target.closest('[data-go]'))) { closeMenus(); location.hash = '#' + el.getAttribute('data-go'); return; }
    if (e.target.closest('[data-reset]')) {
      closeMenus();
      confirmBox('Đặt lại dữ liệu thử', 'Xóa mọi thay đổi và tạo lại bộ dữ liệu ban đầu?', 'Đặt lại', function () {
        S.reset(); VIEW = {}; closeLayer(); toast('Đã đặt lại dữ liệu'); render();
      });
      return;
    }
    if ((el = e.target.closest('[data-lang]'))) { closeMenus(); setLang(el.getAttribute('data-lang')); return; }
    if ((el = e.target.closest('[data-themetoggle]'))) {
      setTheme(state.theme === 'dark' ? 'light' : 'dark');
      el.classList.toggle('on', state.theme === 'dark'); el.setAttribute('aria-checked', String(state.theme === 'dark'));
      return;
    }
    if (e.target.closest('[data-helpcenter]')) {
      closeMenus(); var sp0 = document.querySelector('.ig-support'); if (sp0) sp0.classList.add('open'); return;
    }
    if ((el = e.target.closest('#ai-btn'))) { e.preventDefault(); toggleAI(); return; }
    if ((el = e.target.closest('#notif-btn'))) { e.preventDefault(); notifMenu(el); return; }
    if ((el = e.target.closest('[data-cmd]'))) { e.preventDefault(); cmdRun(+el.getAttribute('data-cmd')); return; }
    if (e.target.closest('#cmd') && !e.target.closest('#cmdpop')) { var gi2 = document.getElementById('gsearch'); if (gi2) gi2.focus(); return; }
    if ((el = e.target.closest('.ig-support-btn'))) {
      var sp = el.closest('.ig-support');
      el.setAttribute('aria-expanded', sp.classList.toggle('open'));
      return;
    }
    if ((el = e.target.closest('#sub-btn'))) {
      state.sub = state.sub === 'open' ? 'collapsed' : 'open';
      store.set('gopush.sub', state.sub);
      document.querySelector('.ig-app').classList.toggle('sub-collapsed', state.sub === 'collapsed');
      el.setAttribute('aria-expanded', state.sub === 'open');
      el.setAttribute('title', t(state.sub === 'open' ? 'collapse' : 'expand'));
      return;
    }

    /* chọn giá trị trong menu */
    if ((el = e.target.closest('[data-choose]'))) {
      onChoose(el.getAttribute('data-choose'), el.getAttribute('data-val'));
      return;
    }
    if ((el = e.target.closest('[data-multi]'))) {
      var vwm = v(), bag = fbag();
      if (bag) {
        var mk = el.getAttribute('data-multi'), mv = el.getAttribute('data-val');
        var arr = bag[mk] || [];
        if (mv === '__clear') arr = [];
        else {
          var castv = /^-?\d+$/.test(mv) ? parseInt(mv, 10) : mv;
          var at = arr.map(String).indexOf(String(castv));
          if (at > -1) arr.splice(at, 1); else arr.push(castv);
        }
        bag[mk] = arr;
        if (vwm.wz) vwm.wz.page = 1; else vwm.page = 1;
        refresh();
        var again = document.querySelector('[data-pickm="' + mk + '"]');
        if (again) {
          var opts2 = [];
          try { opts2 = JSON.parse(again.getAttribute('data-opts') || '[]'); } catch (x2) { opts2 = []; }
          multiMenu(again, mk, opts2, arr);
        }
      }
      return;
    }
    if ((el = e.target.closest('[data-pickm]'))) {
      e.preventDefault();
      var mopts = [], msel = [];
      try { mopts = JSON.parse(el.getAttribute('data-opts') || '[]'); } catch (x3) { mopts = []; }
      try { msel = JSON.parse(el.getAttribute('data-sel') || '[]'); } catch (x4) { msel = []; }
      multiMenu(el, el.getAttribute('data-pickm'), mopts, msel);
      return;
    }
    if ((el = e.target.closest('[data-pick]'))) {
      e.preventDefault();
      var opts = [];
      try { opts = JSON.parse(el.getAttribute('data-opts') || '[]'); } catch (x) { opts = []; }
      var valEl = el.querySelector('.val');
      optionMenu(el, el.getAttribute('data-pick'), opts, valEl ? valEl.textContent : null);
      return;
    }

    /* bảng: sắp xếp, chọn dòng, phân trang, tab */
    if ((el = e.target.closest('[data-sort]'))) {
      var view = v(), k = el.getAttribute('data-sort');
      if (view.sort === k) view.dir = -view.dir; else { view.sort = k; view.dir = -1; }
      refresh(); return;
    }
    if ((el = e.target.closest('[data-sel]'))) {
      var vw = v(), id = el.getAttribute('data-sel');
      if (vw.wz) {
        if (!window.WIZ.toggleSel(ctxFor(cur.page), id)) toast('Đã đạt giới hạn số Creator cho một đợt');
      } else vw.sel[id] = !vw.sel[id];
      refresh(); return;
    }
    if (e.target.closest('[data-selall]')) {
      var vw2 = v();
      var boxes = Array.prototype.map.call(document.querySelectorAll('[data-sel]'), function (b) { return b.getAttribute('data-sel'); });
      if (vw2.wz) {
        if (!window.WIZ.toggleAll(ctxFor(cur.page), boxes)) toast('Đã đạt giới hạn số Creator cho một đợt');
      } else {
        var allOn = boxes.length && boxes.every(function (b) { return vw2.sel[b]; });
        boxes.forEach(function (b) { vw2.sel[b] = !allOn; });
      }
      refresh(); return;
    }
    if ((el = e.target.closest('[data-page]'))) {
      var vw4 = v();
      if (vw4.wz) vw4.wz.page = parseInt(el.getAttribute('data-page'), 10) || 1;
      else vw4.page = parseInt(el.getAttribute('data-page'), 10) || 1;
      refresh(); return;
    }
    if ((el = e.target.closest('[data-tab]'))) {
      var vw3 = v();
      vw3.tab = parseInt(el.getAttribute('data-tab'), 10) || 0;
      vw3.page = 1; vw3.sel = {};
      refresh(); return;
    }

    /* mọi hành động khác */
    if ((el = e.target.closest('[data-do]'))) {
      if (e.target.closest('a[href]') && !el.getAttribute('data-do')) return;
      e.preventDefault();
      if (dispatch(el.getAttribute('data-do'), el)) return;
    }

    /* segmented control chưa gắn hành động */
    if ((el = e.target.closest('.gm-seg button'))) {
      el.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
      el.classList.add('on');
      return;
    }
    if ((el = e.target.closest('.gm-step'))) {
      if (WZ && el.closest('.ig-modal')) { wizard(WZ.kind, parseInt(el.getAttribute('data-step'), 10)); return; }
    }
    if ((el = e.target.closest('.gm-check'))) { el.classList.toggle('on'); return; }
    if ((el = e.target.closest('.gm-switch'))) { el.classList.toggle('on'); return; }
  });

  /* nhập liệu: tìm kiếm, ô có data-bind */
  var qTimer = null;
  /* ô number không cho đặt con trỏ nên phải bọc lại */
  function caretEnd(el) {
    try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* ô số */ }
  }
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.hasAttribute('data-q')) {
      var val = el.value;
      clearTimeout(qTimer);
      qTimer = setTimeout(function () {
        var vw = v(); vw.q = val; vw.page = 1;
        refresh();
        var f = document.querySelector('[data-q]');
        if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
      }, 220);
      return;
    }
    if (el.id === 'gsearch') { cmdRender(el.value); return; }

    var wzk = el.getAttribute && el.getAttribute('data-wz');
    if (wzk && v().wz) {
      var w2 = v().wz;
      w2[wzk] = el.value;
      if (wzk === 'q' || wzk === 'paste') {
        clearTimeout(qTimer);
        qTimer = setTimeout(function () {
          w2.page = 1; refresh();
          var f2 = document.querySelector('[data-wz="' + wzk + '"]');
          if (f2) { f2.focus(); f2.setSelectionRange(f2.value.length, f2.value.length); }
        }, 260);
      } else {
        var cnt = el.parentNode.querySelector('.cnt');
        if (cnt && el.getAttribute('maxlength')) cnt.textContent = el.value.length + '/' + el.getAttribute('maxlength');
        var nextBtn = document.querySelector('[data-do="wz:next"], [data-do="wz:create"]');
        if (nextBtn) {
          clearTimeout(qTimer);
          qTimer = setTimeout(function () { refreshFoot(); }, 300);
        }
      }
      return;
    }
    var rng = el.getAttribute && el.getAttribute('data-rng');
    if (rng && fbag()) {
      var rp = rng.split('.'), wf = fbag();
      if (rp[0] === 'genderPctRange') {
        wf.genderPct = Math.round((parseFloat(el.value) || 0) * 100);
      } else if (rp.length === 1) {
        wf[rp[0]] = el.value;                       /* ngưỡng tối thiểu của tác vụ */
      } else if (wf[rp[0]]) {
        wf[rp[0]][rp[1]] = el.value;
      }
      clearTimeout(qTimer);
      qTimer = setTimeout(function () {
        var ow = fowner(); if (ow && ow.page != null) ow.page = 1;
        refresh();
        var back = document.querySelector('[data-rng="' + rng + '"]');
        if (back) { back.focus(); caretEnd(back); }
      }, 320);
      return;
    }
    if (el.hasAttribute && el.hasAttribute('data-catq')) {
      CATV.q = el.value;
      clearTimeout(qTimer);
      qTimer = setTimeout(function () {
        catModal(ctxFor(cur.page));
        var b2 = document.querySelector('[data-catq]');
        if (b2) { b2.focus(); b2.setSelectionRange(b2.value.length, b2.value.length); }
      }, 260);
      return;
    }
    if (el.hasAttribute && el.hasAttribute('data-msg') && MSG) {
      MSG.text = el.value;
      var mc = el.parentNode.querySelector('.cnt');
      if (mc) mc.textContent = el.value.length + ' / 2000';
      return;
    }
    if (el.hasAttribute && el.hasAttribute('data-kw')) {
      var kwv = el.value;
      clearTimeout(qTimer);
      qTimer = setTimeout(function () {
        var vk = v(); vk.kw = kwv; vk.page = 1;
        refresh();
        var f3 = document.querySelector('[data-kw]');
        if (f3) { f3.focus(); caretEnd(f3); }
      }, 240);
      return;
    }
    var tkk = el.getAttribute && el.getAttribute('data-tk');
    if (tkk && v().tk) {
      v().tk[tkk] = el.value;
      var cnt2 = el.parentNode.querySelector('.cnt');
      if (cnt2 && el.getAttribute('maxlength')) cnt2.textContent = el.value.length + '/' + el.getAttribute('maxlength');
      return;
    }
    var tkp = el.getAttribute && el.getAttribute('data-tkp');
    if (tkp && v().tk) {
      var tp = tkp.split(':');
      v().tk.products.forEach(function (x) { if (x.id === tp[1]) x[tp[0]] = parseInt(el.value, 10) || 0; });
      return;
    }
    var wzc = el.getAttribute && el.getAttribute('data-wzc');
    if (wzc && v().wz) { v().wz.contacts[parseInt(wzc, 10)].value = el.value; return; }

    var wzp = el.getAttribute && el.getAttribute('data-wzp');
    if (wzp && v().wz) {
      var pp = wzp.split(':');
      v().wz.products.forEach(function (x) { if (x.id === pp[1]) x[pp[0]] = parseInt(el.value, 10) || 0; });
      return;
    }

    var bind = el.getAttribute && el.getAttribute('data-bind');
    if (!bind) return;
    if (bind.indexOf('wz.') === 0 && WZ) { WZ[bind.slice(3)] = el.value; return; }
    if (bind.indexOf('__') === 0) return;
    setPath(bind, el.value);
  });

  /* tìm nhanh trên thanh trên */
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      var gi = document.getElementById('gsearch'); if (gi) { gi.focus(); cmdRender(gi.value); }
      return;
    }
    if (e.target.id === 'gsearch') {
      if (e.key === 'ArrowDown') { e.preventDefault(); cmdMove(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); cmdMove(-1); return; }
      if (e.key === 'Enter') { e.preventDefault(); cmdRun(CMD.sel); return; }
      if (e.key === 'Escape') { cmdClose(); return; }
    }
    if (e.key === 'Enter' && e.target.closest && e.target.closest('.ig-ask')) {
      e.preventDefault();
      var qa = e.target.value.trim(); if (qa) { e.target.value = ''; askAI(qa); } else toggleAI(true);
      return;
    }
    if (e.key === 'Enter' && e.target.hasAttribute('data-prompt') && !e.shiftKey) {
      e.preventDefault();
      dispatch('ai:send', e.target);
      return;
    }
    if (e.key === 'Escape') { closeMenus(); closeLayer(); MODAL_OK = null; }
  });

  /* --------------------------------------------------------- kéo thả trong Pipeline */
  var DRAG = null;
  document.addEventListener('dragstart', function (e) {
    var card = e.target.closest && e.target.closest('.ig-kcard');
    if (!card) return;
    DRAG = card.getAttribute('data-cr');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', DRAG); } catch (err) { /* bỏ qua */ }
    card.classList.add('is-drag');
  });
  document.addEventListener('dragend', function (e) {
    var card = e.target.closest && e.target.closest('.ig-kcard');
    if (card) card.classList.remove('is-drag');
    [].forEach.call(document.querySelectorAll('.ig-kcol.is-over'), function (c) { c.classList.remove('is-over'); });
  });
  document.addEventListener('dragover', function (e) {
    var col = e.target.closest && e.target.closest('.ig-kcol');
    if (!col || !DRAG) return;
    e.preventDefault();
    [].forEach.call(document.querySelectorAll('.ig-kcol.is-over'), function (c) { if (c !== col) c.classList.remove('is-over'); });
    col.classList.add('is-over');
  });
  document.addEventListener('drop', function (e) {
    var col = e.target.closest && e.target.closest('.ig-kcol');
    if (!col || !DRAG) return;
    e.preventDefault();
    var cr = S.creator(DRAG), to = col.getAttribute('data-stage'), sid = state.shop;
    DRAG = null;
    if (!cr) return;
    var r = S.rel(cr, sid), from = r.state;
    if (from === to) { refresh(); return; }
    function apply() {
      if (to === 'Đã mời' && !r.invitedAt) {
        closeLayer();
        if (!window.PLANS.take('invites', sid, 1)) { refresh(); return; }
        r.invitedAt = S.fmtDateTime(new Date());
      }
      r.state = to;
      S.log('Chuyển ' + cr.name + ': ' + from + ' → ' + to, 'Creator', sid);
      S.save(); closeLayer(); toast(cr.name + ' → ' + to); refresh();
    }
    if (from === 'Mới' && to === 'Đã mời') {
      confirmBox('Gửi lời mời', 'Chuyển sang “Đã mời” sẽ gửi lời mời hợp tác tới @' + cr.user +
        ' qua API TikTok Shop và trừ 1 lượt hạn mức hôm nay.', 'Gửi lời mời', apply);
    } else apply();
  });

  /* bảng Tìm hoặc hỏi AI: mở khi focus, đóng khi bấm ra ngoài */
  document.addEventListener('focusin', function (e) { if (e.target.id === 'gsearch') cmdRender(e.target.value); });
  document.addEventListener('mousedown', function (e) {
    var pop = document.getElementById('cmdpop');
    if (pop && !pop.hidden && !(e.target.closest && e.target.closest('#cmd'))) pop.hidden = true;
  });

  window.addEventListener('hashchange', render);

  /* --------------------------------------------------------- khởi động */
  document.documentElement.setAttribute('data-theme', state.theme);
  document.documentElement.lang = state.lang;
  if (!location.hash) location.hash = '#/';
  /* chờ biết trạng thái đăng nhập (Firebase trả về bất đồng bộ) rồi mới vẽ lần đầu */
  document.body.innerHTML = '<div class="ig-boot"><span></span></div>';
  window.AUTH.ready.then(render, render);
})();
