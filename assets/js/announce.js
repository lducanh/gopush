/* GOPUSH — thông báo hệ thống: thanh nhỏ trên cùng của app (kiểu Trung tâm doanh nghiệp TikTok)
   và trang quản trị cho admin hệ thống (#/admin/announcements).
   Danh sách thông báo dùng chung mọi site, lưu ở localStorage `gopush.ann` (bản thật: lưu máy chủ).
   Bấm đóng chỉ ẩn trong lần xem hiện tại: tải lại trang hoặc đăng nhập lại thì hiện lại. */
(function (global) {
  'use strict';

  var P = global.PAGES, U = global.UI, S = global.DB, ic = global.icon;
  var KEY = 'gopush.ann', IDX = 0;
  /* đã đóng: chỉ giữ trong bộ nhớ, mất khi tải lại trang; xóa mỗi lần đăng nhập */
  var closedNow = false;
  if (global.AUTH) global.AUTH.onChange(function (u) { if (u) { closedNow = false; IDX = 0; } });

  var TONES = [
    { v: 'butter', l: 'Vàng nhạt' }, { v: 'sky', l: 'Xanh dương nhạt' }, { v: 'coral', l: 'Đỏ cam' }, { v: 'teal', l: 'Xanh ngọc' },
    { v: 'violet', l: 'Tím' }, { v: 'berry', l: 'Hồng TikTok' }, { v: 'custom', l: 'Tự chọn màu…' }
  ];
  /* màu nền sáng thì chữ đậm, nền đậm thì chữ trắng */
  var LIGHT = { butter: 1, sky: 1 };
  function isLight(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return false;
    var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
  }
  function toneAttrs(a) {
    var custom = a.tone === 'custom', light = custom ? isLight(a.color) : !!LIGHT[a.tone];
    return 'class="ig-ann-in tone-' + a.tone + (light ? ' is-light' : '') + '"' +
      (custom ? ' style="--ann-bg:' + U.attr(a.color || '#ffe9a8') + '"' : '');
  }
  /* số thông báo tối đa trên thanh; 0 = hiện tất cả */
  var CFG = 'gopush.ann.cfg';
  function maxShown() { return (read(CFG, {}).max) || 0; }
  var AUDIENCE = [{ v: 'all', l: 'Mọi người dùng' }, { v: 'customer', l: 'Chỉ khách hàng' }, { v: 'trial', l: 'Khách đang dùng thử' }];

  function read(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }

  function list() {
    var l = read(KEY, null);
    if (!l) {
      l = [
        { id: 'a1', rev: 1, on: true, tone: 'butter', audience: 'all', market: 'all',
          text: 'Tham gia vào TikTok Shop Partner để nhận ngay 7 ngày dùng thử GOPUSH',
          cta: 'Tham gia ngay', link: 'https://partner.tiktokshop.com' },
        { id: 'a2', rev: 1, on: true, tone: 'sky', audience: 'all', market: 'all',
          text: 'Mới: Report AI quét dữ liệu chiến dịch, chỉ ra khâu nghẽn và việc nên làm tiếp',
          cta: 'Thử ngay', link: '#/ai/reports' }
      ];
      write(KEY, l);
    }
    /* hai thông báo mẫu chưa ai sửa: theo màu mới */
    var changed = false;
    l.forEach(function (a) {
      if (a.rev === 1 && a.id === 'a1' && /30 ngày dùng thử/.test(a.text)) { a.text = 'Tham gia vào TikTok Shop Partner để nhận ngay 7 ngày dùng thử GOPUSH'; changed = true; }
      if (a.rev === 1 && a.id === 'a1' && (a.tone === 'teal' || a.tone === 'coral')) { a.tone = 'butter'; changed = true; }
      if (a.rev === 1 && a.id === 'a2' && (a.tone === 'violet' || a.tone === 'ink')) { a.tone = 'sky'; changed = true; }
    });
    if (changed) write(KEY, l);
    return l;
  }
  function save(l) { write(KEY, l); }

  /* thông báo người đang xem được thấy: bật, đúng đối tượng, đúng site, chưa đóng */
  function active() {
    var u = global.AUTH && global.AUTH.user();
    if (closedNow) return [];
    var admin = global.AUTH && global.AUTH.isAdmin();
    var plan = global.PLANS && global.PLANS.current().id, mk = S.market().code;
    var max = maxShown();
    var out = list().filter(function (a) {
      if (!a.on) return false;
      if (a.market !== 'all' && a.market !== mk) return false;
      if (a.audience === 'customer' && admin) return false;
      if (a.audience === 'trial' && plan !== 'trial') return false;
      /* nút dẫn tới trang người xem chưa mở được (ví dụ Report AI với gói Cơ bản) thì không hiện */
      if (/^#\//.test(a.link || '') && global.APP && global.APP.canOpenPath && !global.APP.canOpenPath(a.link.slice(1))) return false;
      return !!u;
    });
    return max ? out.slice(0, max) : out;
  }

  function bar() {
    var l = active();
    if (!l.length) return '';
    if (IDX >= l.length) IDX = 0;
    var a = l[IDX], ext = /^https?:/.test(a.link || '');
    return '<div class="ig-ann" id="ann" role="region" aria-label="Thông báo hệ thống">' +
      '<div ' + toneAttrs(a) + '>' +
        (l.length > 1 ? '<span class="pg"><button data-ann="prev" aria-label="Thông báo trước">' + ic('left') + '</button>' +
          '<span class="gm-num">' + (IDX + 1) + ' / ' + l.length + '</span>' +
          '<button data-ann="next" aria-label="Thông báo sau">' + ic('right') + '</button></span>' : '<span class="pg one">' + ic('bell') + '</span>') +
        '<span class="tx">' + U.esc(a.text) + '</span>' +
        (a.cta ? '<a class="cta" href="' + U.attr(a.link || '#') + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
          U.esc(a.cta) + ic('arrowUpRight') + '</a>' : '') +
        '<button class="x" data-ann="close" aria-label="Đóng thông báo">' + ic('x') + '</button>' +
      '</div></div>';
  }

  function repaint() {
    var el = document.getElementById('ann'), app = document.querySelector('.ig-app');
    var html = bar();
    if (el && html) { el.outerHTML = html; return; }
    if (!html && el) {
      /* thu gọn rồi mới gỡ, khung app co lại theo */
      el.classList.add('is-closing');
      setTimeout(function () { el.remove(); if (app) app.classList.remove('has-ann'); }, 220);
    }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-ann]');
    if (!el) return;
    var act = el.getAttribute('data-ann'), l = active();
    if (act === 'prev') { IDX = (IDX - 1 + l.length) % l.length; repaint(); }
    else if (act === 'next') { IDX = (IDX + 1) % l.length; repaint(); }
    else if (act === 'close') {
      closedNow = true; IDX = 0; repaint();
    }
  });
  /* tự chuyển thông báo mỗi 8 giây khi có nhiều cái */
  setInterval(function () {
    var el = document.getElementById('ann');
    if (!el || el.matches(':hover')) return;
    var n = active().length; if (n > 1) { IDX = (IDX + 1) % n; repaint(); }
  }, 8000);

  /* ---------------------------------------------------------- trang quản trị (chỉ admin hệ thống) */
  function blank() { return { id: '', rev: 0, on: true, tone: 'butter', color: '#ffe9a8', audience: 'all', market: 'all', text: '', cta: 'Xem ngay', link: '' }; }

  function previewHTML(a) {
    return '<div class="ig-ann is-preview"><div ' + toneAttrs(a) + '><span class="pg one">' + ic('bell') + '</span>' +
      '<span class="tx">' + U.esc(a.text || 'Nội dung thông báo hiện ở đây') + '</span>' +
      (a.cta ? '<span class="cta">' + U.esc(a.cta) + ic('arrowUpRight') + '</span>' : '') +
      '<span class="x">' + ic('x') + '</span></div></div>';
  }

  function editor(c) {
    var x = c.v.ann, pick = global.AIX.pick;
    var markets = [{ v: 'all', l: 'Mọi thị trường' }].concat(global.MARKETS.list.map(function (m) { return { v: m.code, l: m.flag + ' ' + m.name }; }));
    return '<div class="ig-annedit">' +
      '<div class="h"><b>' + (x.id ? 'Sửa thông báo' : 'Thông báo mới') + '</b><span class="spacer"></span>' + U.iconBtn('x', 'Đóng', 'ann:cancel') + '</div>' +
      '<div class="pv"><span class="gm-help">Xem trước</span><div id="ann-pv">' + previewHTML(x) + '</div></div>' +
      '<div class="grid">' +
        U.field('Nội dung', '<label class="gm-input"><input type="text" data-annf="text" maxlength="160" value="' + U.attr(x.text) + '" placeholder="Ngắn gọn, một câu, dưới 120 ký tự"></label>') +
        '<div class="two">' +
          U.field('Chữ trên nút', '<label class="gm-input"><input type="text" data-annf="cta" maxlength="24" value="' + U.attr(x.cta) + '" placeholder="Tham gia ngay"></label>') +
          U.field('Liên kết', '<label class="gm-input"><input type="text" data-annf="link" value="' + U.attr(x.link) + '" placeholder="https://… hoặc #/settings/billing"></label>') +
        '</div>' +
        '<div class="ig-xbar-row">' +
          pick(c, 'annTone', 'Màu', TONES, { value: x.tone, act: 'ann:set:tone', icon: 'sparkle' }) +
          (x.tone === 'custom' ? '<label class="ig-annclr" title="Chọn màu nền"><input type="color" data-annf="color" value="' + U.attr(x.color || '#ffe9a8') + '">' +
            '<span id="ann-hex">' + U.esc((x.color || '#ffe9a8').toUpperCase()) + '</span></label>' : '') +
          pick(c, 'annAud', 'Hiện cho', AUDIENCE, { value: x.audience, act: 'ann:set:audience', icon: 'users' }) +
          pick(c, 'annMk', 'Thị trường', markets, { value: x.market, act: 'ann:set:market', icon: 'globe' }) +
        '</div>' +
      '</div>' +
      '<div class="ft"><span class="gm-help">Đăng xong là hiện ngay cho người dùng đúng đối tượng.</span><span class="spacer"></span>' +
        U.btn('Hủy', { act: 'ann:cancel' }) + U.btn(x.id ? 'Lưu thay đổi' : 'Đăng thông báo', { variant: 'primary', act: 'ann:save' }) + '</div>' +
    '</div>';
  }

  P['sys-announce'] = function (c) {
    var l = list();
    var mx = maxShown();
    return c.head(global.AIX.pick(c, 'annMax', 'Hiện tối đa', [{ v: '0', l: 'Tất cả thông báo đang bật' }].concat([1, 2, 3, 4, 5].map(function (n) {
        return { v: String(n), l: n + ' thông báo' }; })), { value: String(mx), act: 'ann:max', icon: 'layers' }) +
      U.btn('Thêm thông báo', { variant: 'primary', icon: 'plus', act: 'ann:new' })) +
    '<div class="ig-section">' +
      '<p class="ig-segintro">' + ic('info') + '<span>Thông báo hiện ở thanh nhỏ trên cùng của app cho người dùng đang đăng nhập. Nhiều thông báo thì tự chuyển 8 giây một lần, theo thứ tự trong bảng (mới nhất ở trên); “Hiện tối đa” giới hạn số thông báo trên thanh. Người dùng bấm × chỉ ẩn tạm; tải lại trang hoặc đăng nhập lại là hiện lại.</span></p>' +
      (c.v.ann ? editor(c) : '') +
    '</div>' +
    U.table({
      cols: [
        { k: 'on', t: 'Bật', r: function (a) { return '<span class="gm-switch' + (a.on ? ' on' : '') + '" data-do="ann:toggle:' + a.id + '" role="switch" aria-checked="' + a.on + '"></span>'; } },
        { k: 'text', t: 'Nội dung', r: function (a) { return '<div class="ig-annrow"><i class="tone-' + a.tone + '"' +
          (a.tone === 'custom' ? ' style="background:' + U.attr(a.color || '#ffe9a8') + '"' : '') + '></i><span>' + U.esc(a.text) + '</span></div>'; } },
        { k: 'cta', t: 'Nút', r: function (a) { return a.cta ? '<span class="gm-tag">' + U.esc(a.cta) + '</span>' : '<span class="gm-muted">—</span>'; } },
        { k: 'audience', t: 'Hiện cho', r: function (a) { return '<span style="white-space:nowrap">' + U.esc(AUDIENCE.filter(function (o) { return o.v === a.audience; })[0].l) + '</span>'; } },
        { k: 'market', t: 'Thị trường', r: function (a) { return a.market === 'all' ? 'Tất cả' : global.MARKETS.get(a.market).flag + ' ' + a.market; } },
        { k: '', t: '', cls: 'col-actions', r: function (a) {
          return U.iconBtn('edit', 'Sửa', 'ann:edit:' + a.id) + U.iconBtn('trash', 'Xóa', 'ann:del:' + a.id); } }
      ],
      rows: l, emptyTitle: 'Chưa có thông báo', emptyText: 'Bấm “Thêm thông báo” để tạo thông báo đầu tiên.'
    });
  };

  function action(a, el, c, refresh, toast) {
    var verb = a[0], arg = a.slice(1).join(':'), l = list();
    if (verb === 'new') { c.v.ann = blank(); refresh(); }
    else if (verb === 'edit') { var f = l.filter(function (x) { return x.id === arg; })[0]; if (f) { c.v.ann = JSON.parse(JSON.stringify(f)); refresh(); } }
    else if (verb === 'cancel') { c.v.ann = null; refresh(); }
    else if (verb === 'set') {
      var p = arg.split(':'); c.v.ann[p[0]] = p.slice(1).join(':');
      if (p[0] === 'tone' && c.v.ann.tone === 'custom' && !c.v.ann.color) c.v.ann.color = '#ffe9a8';
      if (c.v.aix) c.v.aix.open = null; refresh();
    }
    else if (verb === 'max') {
      write(CFG, { max: parseInt(arg, 10) || 0 }); if (c.v.aix) c.v.aix.open = null;
      IDX = 0; toast(arg === '0' ? 'Thanh thông báo hiện mọi thông báo đang bật' : 'Thanh thông báo hiện tối đa ' + arg + ' thông báo'); refresh(true);
    }
    else if (verb === 'toggle') { l.forEach(function (x) { if (x.id === arg) x.on = !x.on; }); save(l); refresh(true); }
    else if (verb === 'del') {
      global.APP.confirm('Xóa thông báo', 'Xóa thông báo này khỏi mọi người dùng?', 'Xóa', function () {
        save(l.filter(function (x) { return x.id !== arg; })); toast('Đã xóa thông báo'); refresh(true);
      });
    } else if (verb === 'save') {
      var x = c.v.ann;
      if (!x.text.trim()) { toast('Nhập nội dung thông báo'); return true; }
      if (x.id) { x.rev = (x.rev || 0) + 1; save(l.map(function (y) { return y.id === x.id ? x : y; })); }
      else { x.id = 'a' + Date.now().toString(36); x.rev = 1; l.unshift(x); save(l); }
      S.log('Đăng thông báo hệ thống: ' + x.text.slice(0, 50), 'Cài đặt');
      c.v.ann = null; IDX = 0; closedNow = false; toast('Đã đăng thông báo'); refresh(true);
    }
    return true;
  }

  /* ô nhập trong trình sửa: ghi thẳng, cập nhật xem trước tại chỗ */
  document.addEventListener('input', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-annf');
    if (!k || !global.APP) return;
    var c = global.APP.vz(); if (!c.v.ann) return;
    c.v.ann[k] = e.target.value;
    var pv = document.getElementById('ann-pv'); if (pv) pv.innerHTML = previewHTML(c.v.ann);
    var hx = document.getElementById('ann-hex'); if (hx && k === 'color') hx.textContent = e.target.value.toUpperCase();
  });

  global.ANN = { bar: bar, action: action };
})(window);
