/* GOPUSH — bộ dựng HTML dùng lại cho mọi màn hình. Không phụ thuộc framework.
   Phần tử có data-* được app.js bắt sự kiện tập trung. */
(function (global) {
  'use strict';

  /* Đổi số này mỗi khi thay ảnh hoặc sửa CSS/JS: trình duyệt sẽ tải lại thay vì
     dùng bản cũ trong cache. Nhớ đổi kèm ?v= trong index.html cho khớp. */
  var ASSET_V = '?v=8';
  function img(name) { return 'assets/img/' + name + ASSET_V; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function attr(s) { return esc(s).replace(/'/g, '&#39;'); }

  var GREEN = ['Đang chạy', 'Hoàn thành', 'Đã hoàn thành', 'Đã giao', 'Giao thành công', 'Hoạt động', 'Đã thanh toán',
    'Đang hợp tác', 'Đã chấp nhận', 'Đã duyệt', 'Đã ủy quyền', 'Đang bán', 'Có video', 'Thành công', 'Đã đồng bộ'];
  var ORANGE = ['Tạm dừng', 'Chờ duyệt', 'Chờ giao', 'Chờ gửi hàng', 'Chờ đăng nội dung', 'Chờ chạy',
    'Chờ nhận lời mời', 'Đang giao', 'Đang thực hiện', 'Sắp hết hạn', 'Chưa có video', 'Bỏ qua'];
  var RED = ['Lỗi', 'Đã hủy', 'Đã khóa', 'Ngừng', 'Hết hạn', 'Đã hết hạn', 'Mất kết nối', 'Từ chối'];

  function tag(text, extra) {
    var t = String(text), cls = '';
    if (GREEN.indexOf(t) > -1) cls = ' gm-tag-green';
    else if (ORANGE.indexOf(t) > -1) cls = ' gm-tag-orange';
    else if (RED.indexOf(t) > -1) cls = ' gm-tag-red';
    return '<span class="gm-tag gm-pill' + cls + (extra ? ' ' + extra : '') + '"><i class="gm-dot"></i>' + esc(t) + '</span>';
  }

  function initials(name) {
    var p = String(name).trim().split(/\s+/);
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }

  function bear() {
    return '<span class="gm-avatar is-bear" aria-hidden="true"><svg viewBox="0 0 40 40">' +
      '<circle cx="9.6" cy="11.2" r="6" fill="#b08258"/><circle cx="30.4" cy="11.2" r="6" fill="#b08258"/>' +
      '<circle cx="9.6" cy="11.2" r="3" fill="#e8c6a4"/><circle cx="30.4" cy="11.2" r="3" fill="#e8c6a4"/>' +
      '<circle cx="20" cy="21.6" r="14" fill="#c8996c"/>' +
      '<ellipse cx="20" cy="26.2" rx="7.6" ry="6" fill="#f3e2ce"/>' +
      '<circle cx="14.6" cy="19.4" r="1.9" fill="#3b2b1e"/><circle cx="25.4" cy="19.4" r="1.9" fill="#3b2b1e"/>' +
      '<ellipse cx="20" cy="24" rx="2.4" ry="1.8" fill="#3b2b1e"/>' +
      '<path d="M20 25.8v1.5" stroke="#3b2b1e" stroke-width="1.1" stroke-linecap="round" fill="none"/>' +
      '<path d="M20 27.3c-1 1.1-2.7 1-3.4-.3" stroke="#3b2b1e" stroke-width="1.1" stroke-linecap="round" fill="none"/>' +
      '<path d="M20 27.3c1 1.1 2.7 1 3.4-.3" stroke="#3b2b1e" stroke-width="1.1" stroke-linecap="round" fill="none"/>' +
      '</svg></span>';
  }

  /* Logo GOPUSH · BY GOMAX DIGITAL là chữ trắng trên nền trong suốt,
     hợp với top bar Oracle Bark tối. Trên nền sáng thêm class ig-logo--ink. */
  function logo(alt, onLight) {
    return '<img class="ig-logo' + (onLight ? ' ig-logo--ink' : '') + '" src="' + img('logo-gomax.webp') + '" alt="' + attr(alt || 'GOPUSH · BY GOMAX DIGITAL') + '">';
  }

  function pageHead(o) {
    return '<div class="ig-page-head"><div>' +
      (o.crumb ? '<div class="ig-crumb">' + o.crumb + '</div>' : '') +
      '<h1>' + esc(o.title) + (o.note || '') + '</h1>' +
      (o.desc ? '<p>' + esc(o.desc) + '</p>' : '') + '</div>' +
      (o.actions ? '<div class="ig-head-actions">' + o.actions + '</div>' : '') + '</div>';
  }

  function tabs(items, active) {
    return '<nav class="gm-tabs">' + items.map(function (it, i) {
      var label = typeof it === 'string' ? it : it.t;
      var n = typeof it === 'string' ? null : it.n;
      return '<button class="gm-tab' + (i === (active || 0) ? ' on' : '') + '" data-tab="' + i + '">' +
        esc(label) + (n != null ? '<span class="gm-badge">' + esc(n) + '</span>' : '') + '</button>';
    }).join('') + '</nav>';
  }

  function btn(label, o) {
    o = o || {};
    return '<button class="gm-btn' + (o.variant ? ' gm-btn-' + o.variant : '') + (o.sm ? ' gm-btn-sm' : '') +
      (o.cls ? ' ' + o.cls : '') + '"' +
      (o.act ? ' data-do="' + attr(o.act) + '"' : '') + (o.title ? ' title="' + attr(o.title) + '"' : '') +
      (o.disabled ? ' disabled' : '') + '>' +
      (o.icon ? global.icon(o.icon) : '') + esc(label) + '</button>';
  }

  function iconBtn(iconName, label, act, cls) {
    return '<button class="gm-btn gm-btn-ghost gm-btn-icon' + (cls ? ' ' + cls : '') + '" title="' + attr(label) +
      '" aria-label="' + attr(label) + '"' + (act ? ' data-do="' + attr(act) + '"' : '') + '>' + global.icon(iconName) + '</button>';
  }

  function input(o) {
    o = o || {};
    return '<label class="gm-input' + (o.cls ? ' ' + o.cls : '') + '">' + (o.icon ? global.icon(o.icon) : '') +
      '<input type="' + (o.type || 'text') + '" placeholder="' + attr(o.ph || '') + '"' +
      (o.value != null ? ' value="' + attr(o.value) + '"' : '') +
      (o.bind ? ' data-bind="' + attr(o.bind) + '"' : '') + '></label>';
  }

  function textarea(o) {
    o = o || {};
    return '<label class="gm-input gm-input-area"><textarea rows="' + (o.rows || 4) + '" placeholder="' +
      attr(o.ph || '') + '"' + (o.bind ? ' data-bind="' + attr(o.bind) + '"' : '') + '>' + esc(o.value || '') + '</textarea></label>';
  }

  function select(value, o) {
    o = o || {};
    return '<button class="gm-input gm-select' + (o.sm ? ' gm-input-sm' : '') + (o.cls ? ' ' + o.cls : '') + '"' +
      (o.pick ? ' data-pick="' + attr(o.pick) + '" data-opts="' + attr(JSON.stringify(o.opts || [])) + '"' : '') + '>' +
      '<span class="val' + (o.ph ? ' ph' : '') + '">' + esc(value) + '</span>' + global.icon('down') + '</button>';
  }

  function sel(label, key, value, opts) {
    var on = value && value !== 'all';
    return '<button class="gm-input gm-select gm-input-sm' + (on ? ' is-set' : '') +
      '" data-pick="f:' + attr(key) + '" data-opts="' + attr(JSON.stringify(opts)) + '">' +
      '<span class="val">' + esc(on ? value : label) + '</span>' + global.icon('down') + '</button>';
  }

  function field(label, control, help) {
    return '<div class="gm-field"><span class="gm-label">' + esc(label) + '</span>' + control +
      (help ? '<span class="gm-help">' + esc(help) + '</span>' : '') + '</div>';
  }

  function filters(o) {
    var adv = '';
    if (o.groups && o.groups.length) {
      adv = '<div class="ig-filters-adv" id="filters-adv"' + (o.open ? '' : ' hidden') + '>' +
        o.groups.map(function (g) {
          return '<div class="ig-fgrp"><span class="lb">' + esc(g.l) + '</span><div class="row">' + g.f + '</div></div>';
        }).join('') +
        '<button class="ig-freset" data-do="filters:reset">Đặt lại</button>' +
      '</div>';
    }
    var chips = '';
    if (o.chips && o.chips.length) {
      chips = '<div class="ig-filters-chips">' + o.chips.map(function (c) {
        return '<span class="gm-chip">' + esc(c.l) + '<button data-do="filters:clear:' + attr(c.k) +
          '" aria-label="Bỏ điều kiện">' + global.icon('x') + '</button></span>';
      }).join('') + '<button class="gm-btn gm-btn-link gm-btn-sm" data-do="filters:reset">Xóa tất cả</button></div>';
    }
    return '<div class="ig-filters"><div class="ig-filters-bar">' +
      (o.search === false ? '' :
        '<label class="gm-input gm-input-sm ig-fsearch">' + global.icon('search') +
        '<input type="search" data-q placeholder="' + attr(o.ph || 'Tìm nhanh') + '" value="' + attr(o.q || '') + '"></label>') +
      (o.quick || '') +
      (adv ? '<button class="gm-btn gm-btn-sm ig-more" data-do="filters:toggle" aria-expanded="' + (!!o.open) +
        '" aria-controls="filters-adv">' + global.icon('filter') + 'Bộ lọc' +
        (o.count ? '<span class="gm-badge">' + o.count + '</span>' : '') + global.icon('down') + '</button>' : '') +
      '<span class="spacer"></span>' + (o.right ? '<span class="ig-fright">' + o.right + '</span>' : '') +
      '</div>' + adv + chips + '</div>';
  }

  /* cột ngày giờ, người phụ trách, mã: giữ một dòng để hàng bảng không cao vọt */
  var NOWRAP = /lúc|SKU|Ký nhận|Nội dung|Đồng bộ|Ngày|Bắt đầu|Kết thúc|Hạn|Thời điểm|Đăng nhập|Cập nhật|Người tạo|Phụ trách|Người được giao|Mã /;
  function colCls(c) { return (c.cls || '') + (c.t && NOWRAP.test(c.t) ? ' nw' : ''); }

  function table(o) {
    var cols = o.cols, rows = o.rows, s = o.sel || {};
    var allOn = o.check && rows.length && rows.every(function (r) { return s[r.id]; });
    var head = '<tr>' +
      (o.check ? '<th class="col-check"><span class="gm-check' + (allOn ? ' on' : '') + '" data-selall></span></th>' : '') +
      cols.map(function (c) {
        var tip = c.th ? ' title="' + attr(c.th) + '"' : '';
        if (!c.s) {
          return '<th class="' + colCls(c) + '"' + tip + '>' + esc(c.t) +
            (c.th ? global.icon('help', 'sw') : '') + '</th>';
        }
        var on = o.sort === c.s;
        return '<th class="' + colCls(c) + '"' + tip + '><button class="gm-sort' + (on ? ' on' : '') +
          '" data-sort="' + attr(c.s) + '">' + esc(c.t) + global.icon(on && o.dir === 1 ? 'up' : 'down') + '</button></th>';
      }).join('') + '</tr>';

    if (!rows.length) {
      return '<div class="gm-table-wrap"><table class="gm-table"><thead>' + head + '</thead></table></div>' +
        empty(o.emptyTitle || 'Không có dữ liệu khớp điều kiện',
          o.emptyText || 'Thử bỏ bớt điều kiện lọc hoặc đổi từ khóa tìm kiếm.',
          btn('Xóa bộ lọc', { sm: true, act: 'filters:reset' }));
    }

    var body = rows.map(function (row) {
      return '<tr' + (s[row.id] ? ' class="is-sel"' : '') + '>' +
        (o.check ? '<td class="col-check"><span class="gm-check' + (s[row.id] ? ' on' : '') +
          '" data-sel="' + attr(row.id) + '"></span></td>' : '') +
        cols.map(function (c) {
          return '<td class="' + colCls(c) + '">' + (c.r ? c.r(row) : esc(row[c.k])) + '</td>';
        }).join('') + '</tr>';
    }).join('');

    return '<div class="gm-table-wrap"><table class="gm-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function tiktok(url) {
    return '<a class="ig-tt" href="' + attr(url) + '" target="_blank" rel="noopener" title="Mở kênh TikTok" ' +
      'aria-label="Mở kênh TikTok">' + global.icon('tiktok', 'solid') + '</a>';
  }

  function creatorCell(c, sub) {
    return '<div class="gm-entity"><span class="gm-avatar">' + esc(initials(c.name)) + '</span>' +
      '<div><div class="name"><a class="gm-link" data-do="creator:' + attr(c.id) + '">' + esc(c.name) + '</a>' +
      (c.tiktok ? tiktok(c.tiktok) : '') + '</div>' +
      '<div class="meta">@' + esc(c.user) + (sub ? ' · ' + esc(sub) : '') + '</div></div></div>';
  }

  function pager(o) {
    var pages = Math.max(1, Math.ceil(o.total / o.size));
    var cur = Math.min(o.page, pages);
    var from = o.total ? (cur - 1) * o.size + 1 : 0;
    var to = Math.min(cur * o.size, o.total);
    var nums = '';
    var start = Math.max(1, Math.min(cur - 2, pages - 4));
    for (var i = start; i < start + 5 && i <= pages; i++) {
      nums += '<button class="' + (i === cur ? 'on' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    return '<div class="gm-pager"><span>' + from + '–' + to + ' trong ' + global.DB.num(o.total) + '</span>' +
      '<button data-page="' + Math.max(1, cur - 1) + '" aria-label="Trước">' + global.icon('left') + '</button>' + nums +
      '<button data-page="' + Math.min(pages, cur + 1) + '" aria-label="Sau">' + global.icon('right') + '</button></div>';
  }

  function selbar(n, actions) {
    if (!n) return '';
    return '<div class="ig-selbar"><span class="sel">Đã chọn <b class="gm-num">' + n + '</b></span>' +
      actions + '<span class="spacer"></span>' + btn('Bỏ chọn', { sm: true, variant: 'ghost', act: 'sel:none' }) + '</div>';
  }

  function askBar(ph) {
    return '<div class="ig-ask">' + global.icon('ai') +
      '<input type="text" placeholder="' + attr(ph) + '">' +
      '<button class="ig-send" data-do="ask" aria-label="Gửi cho GOPUSH AI">' + global.icon('arrowUp') + '</button></div>';
  }

  function stats(list) {
    return '<div class="gm-stats">' + list.map(function (s) {
      return '<div class="gm-stat"><span class="v">' + esc(s.v) + '</span>' +
        (s.icon ? global.icon(s.icon) : '<span></span>') +
        '<span class="l">' + esc(s.l) +
        (s.d ? ' · <span class="' + (s.d[0] === '-' ? 'gm-delta-down' : 'gm-delta-up') + '">' + esc(s.d) + '</span>' : '') +
        '</span></div>';
    }).join('') + '</div>';
  }

  function card(o) {
    return '<section class="gm-card' + (o.cls ? ' ' + o.cls : '') + '">' +
      (o.title ? '<div class="gm-card-head"><h2 class="gm-card-title">' + (o.rawTitle ? o.title : esc(o.title)) + '</h2>' +
        (o.actions ? '<div class="ig-head-actions">' + o.actions + '</div>' : '') + '</div>' : '') +
      o.body + '</section>';
  }

  function kv(pairs) {
    return '<dl class="gm-kv">' + pairs.map(function (p) {
      return '<dt>' + esc(p[0]) + '</dt><dd>' + (p[2] ? p[1] : esc(p[1])) + '</dd>';
    }).join('') + '</dl>';
  }

  /* các dòng nhãn trái – giá trị phải, ngăn bằng hairline; hợp với card hẹp */
  function rows(pairs) {
    return '<dl class="ig-rows">' + pairs.map(function (p) {
      return '<div><dt>' + esc(p[0]) + '</dt><dd>' + (p[2] ? p[1] : esc(p[1])) + '</dd></div>';
    }).join('') + '</dl>';
  }

  /* dải thông tin ngang: nhãn 12px phía trên, giá trị phía dưới — gọn hơn kv
     khi card rộng và mỗi giá trị ngắn */
  function facts(pairs) {
    return '<dl class="gm-facts">' + pairs.map(function (p) {
      return '<div><dt>' + esc(p[0]) + '</dt><dd>' + (p[2] ? p[1] : esc(p[1])) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function funnel(steps) {
    var max = steps[0].v || 1;
    return '<div class="gm-funnel"><div class="cap"><span>Bước · số lượng</span><span>Chuyển đổi so với bước trước</span></div>' +
      steps.map(function (s, i) {
      var w = Math.max(18, Math.round((s.v / max) * 100));
      var rate = i === 0 ? '—' : (steps[i - 1].v ? Math.round((s.v / steps[i - 1].v) * 100) : 0) + '%';
      return '<div class="step"><div class="bar" style="width:' + w + '%;--fn:' +
        (i / Math.max(1, steps.length - 1)) + '"><span>' + esc(s.l) +
        '</span><span class="gm-num">' + global.DB.num(s.v) + '</span></div>' +
        '<span class="rate">' + rate + '</span></div>';
    }).join('') + '</div>';
  }

  function steps(list, active) {
    return '<div class="gm-steps">' + list.map(function (s, i) {
      var cls = i === active ? ' on' : (i < active ? ' done' : '');
      return '<button class="gm-step' + cls + '" data-step="' + i + '"><span class="n">' +
        (i < active ? '✓' : i + 1) + '</span>' + esc(s) + '</button>' +
        (i < list.length - 1 ? '<span class="gm-step-line"></span>' : '');
    }).join('') + '</div>';
  }

  function empty(title, sub, action) {
    return '<div class="gm-empty">' + global.icon('file') + '<div><strong style="color:var(--text-primary)">' + esc(title) +
      '</strong>' + (sub ? '<div style="margin-top:4px">' + esc(sub) + '</div>' : '') + '</div>' + (action || '') + '</div>';
  }

  function banner(text, kind, icon) {
    return '<div class="gm-banner' + (kind ? ' gm-banner-' + kind : '') + '">' + global.icon(icon || 'info') +
      '<div class="body">' + text + '</div></div>';
  }

  function switchRow(label, on, sub, act) {
    return '<label class="ig-switchrow"' + (act ? ' data-do="' + attr(act) + '"' : '') + '>' +
      '<span class="t"><span class="n">' + esc(label) + '</span>' +
      (sub ? '<span class="gm-help">' + esc(sub) + '</span>' : '') + '</span>' +
      '<span class="gm-switch' + (on ? ' on' : '') + '"></span></label>';
  }

  function modal(o) {
    return '<div class="ig-overlay" data-do="modal:close"></div>' +
      '<div class="ig-modal' + (o.wide ? ' is-wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + attr(o.title) + '">' +
      '<header><h2>' + esc(o.title) + '</h2>' + iconBtn('x', 'Đóng', 'modal:close') + '</header>' +
      '<div class="ig-modal-body">' + o.body + '</div>' +
      (o.foot ? '<footer>' + o.foot + '</footer>' : '') + '</div>';
  }

  global.UI = {
    esc: esc, attr: attr, img: img, tag: tag, initials: initials, bear: bear, logo: logo, pageHead: pageHead, tabs: tabs,
    btn: btn, iconBtn: iconBtn, input: input, textarea: textarea, select: select, sel: sel, field: field,
    filters: filters, table: table, tiktok: tiktok, creatorCell: creatorCell, pager: pager, selbar: selbar,
    askBar: askBar, stats: stats, card: card, kv: kv, rows: rows, facts: facts, funnel: funnel, steps: steps, empty: empty,
    banner: banner, switchRow: switchRow, modal: modal
  };
})(window);
