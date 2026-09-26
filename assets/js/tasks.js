/* inGo — Điều chỉnh kế hoạch: bốn tác vụ xử lý hàng loạt trên các lời mời đã tạo.

   TikTok chỉ cho sửa từng lời mời một. Ở đây chọn một lần nhiều lời mời rồi
   chạy chung một tác vụ: dọn dẹp, bù Creator, gia hạn – đổi tên, thêm sản phẩm.
   Trường và giới hạn bám theo hợp đồng dữ liệu của TikTok trong tiktok.js. */
(function (global) {
  'use strict';

  var U = global.UI, ic = global.icon, S = global.DB, TT = global.TT;

  var EXPIRING_DAYS = 4;          /* còn dưới 4 ngày là sắp hết hạn */
  var NAME_MAX = TT.LIMIT.nameMax;
  var PROD_MAX = TT.LIMIT.productMax;
  var PER_PAGE = 8;

  var TYPES = [
    { c: 'CLEAN_INVITATION', l: 'Dọn dẹp lời mời kém hiệu quả', ic: 'trash', tone: 'blush',
      d: 'Gỡ Creator chưa hợp tác và hủy lời mời không mang lại kết quả, giải phóng suất mời cho Creator mới.',
      sub: 'Cấu hình tác vụ dọn dẹp lời mời kém hiệu quả' },
    { c: 'REFILL_CREATOR', l: 'Bổ sung Creator vào lời mời cũ', ic: 'userPlus', tone: 'sage',
      d: 'Tự tìm Creator phù hợp theo bộ lọc và thêm vào các lời mời còn trống suất. Nên chạy ngay sau khi dọn dẹp.',
      sub: 'Cấu hình tác vụ bổ sung Creator vào lời mời cũ' },
    { c: 'UPDATE_INVITATION_PERIOD_NAME', l: 'Gia hạn & đổi tên lời mời', ic: 'calendar', tone: 'sky',
      d: 'Gia hạn thời gian hiệu lực và đổi tên hàng loạt để giữ hợp tác với Creator đang chạy tốt.',
      sub: 'Cấu hình tác vụ gia hạn và đổi tên lời mời' },
    { c: 'ADD_INVITATION_PRODUCT', l: 'Thêm sản phẩm vào lời mời', ic: 'box', tone: 'sand',
      d: 'Thêm sản phẩm và thiết lập hoa hồng hàng loạt cho các lời mời đang có.',
      sub: 'Cấu hình tác vụ thêm sản phẩm vào lời mời' }
  ];

  var STATUS = ['Chờ chạy', 'Đang chạy', 'Tạm dừng', 'Hoàn thành', 'Đã dừng', 'Lỗi'];

  var CLEAN_MODES = [
    { v: 1, l: 'Gỡ Creator chưa thêm showcase', d: 'Gỡ Creator chưa thêm sản phẩm vào showcase và chưa quảng bá. Lời mời không còn ai hợp tác sẽ bị hủy.', tag: 'NÊN DÙNG|ok' },
    { v: 3, l: 'Gỡ Creator chưa quảng bá', d: 'Chặt hơn: gỡ mọi Creator chưa lên video hoặc LIVE. Lời mời không còn ai quảng bá sẽ bị hủy.' },
    { v: 2, l: 'Hủy toàn bộ lời mời đã chọn', d: 'Hủy ngay mọi lời mời đã chọn, không xét kết quả. Không thể hoàn tác.', tag: 'CẨN TRỌNG|hot' }
  ];

  var VALID_DAYS = [3, 5, 10, 15, 30, 60, 90, 180, 365].map(function (n) { return { v: n, l: n + ' ngày' }; });

  var SEARCH_FIELDS = [
    { v: 'name', l: 'Tên lời mời', ph: 'Nhập tên lời mời' },
    { v: 'id', l: 'ID lời mời', ph: 'Nhập ID lời mời' },
    { v: 'product', l: 'Tên sản phẩm', ph: 'Nhập tên sản phẩm' }
  ];

  var FOLLOWER_BANDS = [
    { v: 1, l: '0 – 10K', min: 0, max: 10000 },
    { v: 2, l: '10K – 20K', min: 10000, max: 20000 },
    { v: 3, l: '20K – 25K', min: 20000, max: 25000 },
    { v: 4, l: '25K – 50K', min: 25000, max: 50000 },
    { v: 5, l: '50K – 100K', min: 50000, max: 100000 },
    { v: 6, l: 'Trên 100K', min: 100000, max: Infinity }
  ];

  function typeOf(code) {
    var out = TYPES[0];
    TYPES.forEach(function (t) { if (t.c === code) out = t; });
    return out;
  }
  function esc(s) { return U.esc(s); }

  /* --------------------------------------------------------- trạng thái màn hình */
  function blank() {
    return {
      screen: 'pick', type: null,
      cleanMode: 1,
      maxPer: 50, tplId: '',
      f: { cats: [], ages: [], gender: 'ALL', fol: [], views: '', eng: '', live: '', gmv: [], gmvMin: '', gmvMax: '' },
      validDays: 60, newName: '',
      products: [],
      scope: 'ONGOING', sfield: 'name'
    };
  }

  /* --------------------------------------------------------- lời mời của shop */
  function invitations(shopId, scope) {
    return S.data.campaigns.filter(function (c) {
      if (c.shopId !== shopId || c.kind !== 'invite') return false;
      if (c.status === 'Đã hủy' || c.status === 'Hết hạn' || c.status === 'Nháp') return false;
      if (!scope) return true;
      return scope === 'EXPIRING' ? c.endDays < EXPIRING_DAYS : c.endDays >= EXPIRING_DAYS;
    });
  }
  function byId(id) {
    var out = null;
    S.data.campaigns.forEach(function (c) { if (c.id === id) out = c; });
    return out;
  }

  /* --------------------------------------------------------- khối dựng chung */
  function row(label, hint, fields, required) {
    return '<div class="ig-wzrow"><div class="lb"><b>' + (required ? '<i class="req">*</i>' : '') + esc(label) + '</b>' +
      (hint ? '<p>' + hint + '</p>' : '') + '</div><div class="fields">' + fields + '</div></div>';
  }
  function field(label, control, help) {
    return '<div class="gm-field"><span class="gm-label">' + esc(label) + '</span>' + control +
      (help ? '<span class="gm-help">' + help + '</span>' : '') + '</div>';
  }
  function optcard(on, title, sub, act, badge) {
    var tag = '';
    if (badge) {
      var parts = String(badge).split('|');
      tag = ' <span class="gm-tag gm-tag-' + (parts[1] || 'ok') + '">' + esc(parts[0]) + '</span>';
    }
    return '<label class="ig-optcard' + (on ? ' on' : '') + '" data-do="' + U.attr(act) + '">' +
      '<span class="gm-radio' + (on ? ' on' : '') + '"></span>' +
      '<span class="tx"><b>' + esc(title) + tag + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</span></label>';
  }
  /* select nhỏ một lựa chọn, ghi thẳng vào t hoặc t.f */
  function one(bucket, key, value, opts, ph, clearable) {
    var cur = null;
    opts.forEach(function (o) { if (String(o.v) === String(value)) cur = o; });
    var list = clearable === false ? opts : [{ v: '', l: 'Tất cả' }].concat(opts);
    return '<button class="gm-input gm-select gm-input-sm' + (cur && value !== '' ? ' is-set' : '') +
      '" data-pick="' + bucket + ':' + U.attr(key) + '" data-opts="' + U.attr(JSON.stringify(list)) + '">' +
      '<span class="val">' + esc(cur ? cur.l : ph) + '</span>' + ic('down') + '</button>';
  }
  /* select nhỏ nhiều lựa chọn */
  function many(key, arr, opts, ph) {
    var n = (arr || []).length, lb = ph;
    if (n === 1) opts.forEach(function (o) { if (String(o.v) === String(arr[0])) lb = o.l; });
    else if (n > 1) lb = ph + ': ' + n;
    return '<button class="gm-input gm-select gm-input-sm' + (n ? ' is-set' : '') +
      '" data-pickm="' + U.attr(key) + '" data-opts="' + U.attr(JSON.stringify(opts)) +
      '" data-sel="' + U.attr(JSON.stringify(arr || [])) + '">' +
      '<span class="val">' + esc(lb) + '</span>' + ic('down') + '</button>';
  }
  /* ngưỡng tối thiểu: để trống là không lọc */
  function minBox(key, value, ph, unit) {
    return '<span class="ig-rng' + (value !== '' && value != null ? ' is-set' : '') + '">' +
      '<span class="k">' + esc(ph) + '</span><i>≥</i>' +
      '<input type="number" min="0" data-rng="' + U.attr(key) + '" placeholder="0" value="' + U.attr(value) + '">' +
      (unit ? '<span class="u">' + esc(unit) + '</span>' : '') + '</span>';
  }

  /* --------------------------------------------------------- màn 1: danh sách tác vụ */
  function listPage(c) {
    var v = c.v, sid = c.shop.id;
    var all = S.data.tasks.filter(function (t) { return t.shopId === sid; });
    var counts = [all.length].concat(STATUS.map(function (st) {
      return all.filter(function (t) { return t.status === st; }).length;
    }));
    var rows = all.filter(function (t) {
      if (v.tab && t.status !== STATUS[v.tab - 1]) return false;
      if (v.f.type && v.f.type !== 'all' && t.type !== v.f.type) return false;
      var q = String(v.q || '').trim().toLowerCase();
      if (!q) return true;
      return (t.code + ' ' + typeOf(t.type).l + ' ' + t.summary + ' ' + t.by).toLowerCase().indexOf(q) > -1;
    });
    var from = (v.page - 1) * PER_PAGE;
    var shown = rows.slice(from, from + PER_PAGE);

    return c.head(U.btn('Tạo tác vụ', { variant: 'primary', icon: 'plus', act: 'tk:new' })) +
    U.tabs(['Tất cả'].concat(STATUS).map(function (t, i) { return { t: t, n: String(counts[i]) }; }), v.tab) +
    U.filters({
      ph: 'Tìm mã tác vụ, cấu hình hoặc người tạo', q: v.q,
      quick: U.sel('Loại tác vụ', 'type', v.f.type === 'all' || !v.f.type ? '' : typeOf(v.f.type).l,
        [{ v: 'all', l: 'Tất cả loại' }].concat(TYPES.map(function (t) { return { v: t.c, l: t.l }; }))),
      right: '<span class="ig-fmeta"><b class="gm-num">' + rows.length + '</b> tác vụ</span>'
    }) +
    U.table({
      cols: [
        { k: '', t: 'Tác vụ', r: function (r) {
          return '<div class="ig-tkcell"><b>' + esc(r.code) + '</b><span>' + esc(r.summary) + '</span></div>'; } },
        { k: '', t: 'Loại tác vụ', r: function (r) {
          var ty = typeOf(r.type);
          return '<span class="ig-tktype"><i class="tone-' + ty.tone + '">' + ic(ty.ic) + '</i>' + esc(ty.l) + '</span>'; } },
        { k: 'status', t: 'Trạng thái', r: function (r) { return U.tag(r.status); } },
        { k: '', t: 'Lời mời', cls: 'num', r: function (r) {
          var p = r.invitationIds.length ? Math.round(r.processed / r.invitationIds.length * 100) : 0;
          return '<div class="ig-prog"><span class="tr"><i style="width:' + p + '%"></i></span>' +
            '<span class="gm-num gm-secondary">' + r.processed + '/' + r.invitationIds.length + '</span></div>'; } },
        { k: '', t: 'Kết quả', r: function (r) { return statChips(r); } },
        { k: 'at', t: 'Tạo lúc' },
        { k: 'by', t: 'Người tạo' },
        { k: '', t: '', cls: 'col-actions', r: function (r) {
          var a = '';
          if (r.status === 'Chờ chạy') a += U.iconBtn('play', 'Chạy ngay', 'tk:run:' + r.id);
          if (r.status === 'Đang chạy') a += U.iconBtn('pause', 'Tạm dừng', 'tk:pause:' + r.id);
          if (r.status === 'Tạm dừng') a += U.iconBtn('play', 'Tiếp tục', 'tk:resume:' + r.id);
          if (['Chờ chạy', 'Đang chạy', 'Tạm dừng'].indexOf(r.status) > -1) a += U.iconBtn('stop', 'Dừng', 'tk:stop:' + r.id);
          if (r.status === 'Lỗi') a += U.iconBtn('refresh', 'Chạy lại phần lỗi', 'tk:retry:' + r.id);
          a += U.iconBtn('eye', 'Xem chi tiết', 'tk:view:' + r.id);
          return a; } }
      ],
      rows: shown,
      emptyTitle: 'Chưa có tác vụ nào',
      emptyText: 'Tạo tác vụ để dọn dẹp, bù Creator, gia hạn hoặc thêm sản phẩm cho hàng loạt lời mời.'
    }) +
    U.pager({ page: v.page, size: PER_PAGE, total: rows.length });
  }

  function statChips(t) {
    var map = {
      CLEAN_INVITATION: [['cancelledInvitationCount', 'đã hủy'], ['keptInvitationCount', 'giữ lại'], ['removedCreatorCount', 'Creator gỡ']],
      REFILL_CREATOR: [['addedCreatorCount', 'Creator thêm'], ['skippedInvitationCount', 'bỏ qua'], ['failedInvitationCount', 'lỗi']],
      UPDATE_INVITATION_PERIOD_NAME: [['updatedInvitationCount', 'cập nhật'], ['skippedInvitationCount', 'bỏ qua'], ['failedInvitationCount', 'lỗi']],
      ADD_INVITATION_PRODUCT: [['addedCount', 'lượt thêm'], ['skippedCount', 'bỏ qua'], ['failedCount', 'lỗi']]
    }[t.type] || [];
    var out = map.filter(function (m) { return t.stats[m[0]]; }).map(function (m) {
      return '<span class="ig-tkstat"><b class="gm-num">' + S.num(t.stats[m[0]]) + '</b>' + esc(m[1]) + '</span>';
    }).join('');
    return out || '<span class="gm-muted">—</span>';
  }

  /* --------------------------------------------------------- màn 2: chọn loại tác vụ */
  function pickPage(c) {
    var t = c.v.tk;
    return U.pageHead({ title: 'Tạo tác vụ', desc: 'Chọn loại tác vụ muốn chạy cho các lời mời đã có.',
      actions: U.btn('Thoát', { icon: 'x', act: 'tk:cancel' }) }) +
    '<div class="ig-tkpick">' +
      '<div class="ig-tkgrid">' + TYPES.map(function (ty) {
        var on = t.type === ty.c;
        return '<label class="ig-tkcard tone-' + ty.tone + (on ? ' on' : '') + '" data-do="tk:type:' + ty.c + '">' +
          '<span class="gm-radio' + (on ? ' on' : '') + '"></span>' +
          '<span class="ic">' + ic(ty.ic) + '</span>' +
          '<span class="tx"><b>' + esc(ty.l) + '</b><span>' + esc(ty.d) + '</span></span></label>';
      }).join('') + '</div>' +
    '</div>' +
    '<div class="ig-wzfoot">' + U.btn('Quay lại', { icon: 'back', act: 'tk:cancel' }) +
      '<span class="spacer"></span>' +
      (t.type ? '<span class="sum">' + esc(typeOf(t.type).l) + '</span>' : '<span class="sum warn">' + ic('alert') + 'Chưa chọn loại tác vụ</span>') +
      U.btn('Bước tiếp theo', { variant: 'primary', icon: 'right', act: 'tk:toForm', cls: t.type ? '' : 'is-blocked' }) +
    '</div>';
  }

  /* --------------------------------------------------------- bảng chọn lời mời */
  function selector(c) {
    var t = c.v.tk, v = c.v, sid = c.shop.id;
    var scoped = invitations(sid, t.scope);
    var nOngoing = invitations(sid, 'ONGOING').length, nExpiring = invitations(sid, 'EXPIRING').length;
    var q = String(v.q || '').trim().toLowerCase();
    var rows = scoped.filter(function (r) {
      if (!q) return true;
      if (t.sfield === 'id') return r.ttId.indexOf(q) > -1;
      if (t.sfield === 'product') return String(r.name).toLowerCase().indexOf(q) > -1;
      return r.name.toLowerCase().indexOf(q) > -1;
    });
    var from = (v.page - 1) * PER_PAGE;
    var shown = rows.slice(from, from + PER_PAGE);
    var picked = Object.keys(v.sel).filter(function (k) { return v.sel[k]; }).length;
    var ph = SEARCH_FIELDS[0].ph;
    SEARCH_FIELDS.forEach(function (f) { if (f.v === t.sfield) ph = f.ph; });

    return row('Chọn lời mời', 'Chọn các lời mời sẽ chạy tác vụ. Trạng thái của lời mời luôn được lấy lại tại thời điểm chạy.',
      '<div class="ig-wzfilter">' +
        '<div class="ig-wzfhead">' +
          '<div class="gm-seg">' +
            '<button class="' + (t.scope === 'ONGOING' ? 'on' : '') + '" data-do="tk:scope:ONGOING">Đang hiệu lực <b>' + nOngoing + '</b></button>' +
            '<button class="' + (t.scope === 'EXPIRING' ? 'on' : '') + '" data-do="tk:scope:EXPIRING">Sắp hết hạn <b>' + nExpiring + '</b></button>' +
          '</div>' +
          '<span class="spacer"></span>' +
          one('tkf', 'sfield', t.sfield, SEARCH_FIELDS.map(function (f) { return { v: f.v, l: f.l }; }), 'Tìm theo', false) +
          '<label class="gm-input gm-input-sm ig-fsearch">' + ic('search') +
            '<input type="search" data-q placeholder="' + U.attr(ph) + '" value="' + U.attr(v.q || '') + '"></label>' +
        '</div>' +
        '<div class="ig-tktable">' + U.table({
          check: true, sel: v.sel, rows: shown,
          cols: [
            { k: 'name', t: 'Tên lời mời', r: function (r) {
              return '<div class="ig-tkcell"><b>' + esc(r.name) + '</b><span class="gm-num">' + esc(r.ttId) + '</span></div>'; } },
            { k: '', t: 'Đã mời', cls: 'num', r: function (r) { return S.num(r.total); } },
            { k: '', t: 'Chấp nhận', cls: 'num', r: function (r) { return S.num(r.accepted); } },
            { k: '', t: 'Đã quảng bá', cls: 'num', r: function (r) { return S.num(r.promoted); } },
            { k: '', t: 'Sản phẩm', cls: 'num', r: function (r) { return S.num(r.prodCount); } },
            { k: '', t: 'Hiệu lực', r: function (r) {
              return '<span class="gm-num gm-secondary">' + esc(r.start) + ' – ' + esc(r.end) + '</span>' +
                (r.endDays < EXPIRING_DAYS ? ' <span class="gm-tag gm-tag-orange">Còn ' + r.endDays + ' ngày</span>' : ''); } },
            { k: 'updated', t: 'Cập nhật' }
          ],
          emptyTitle: 'Chưa có lời mời nào trong phạm vi này',
          emptyText: 'Đổi phạm vi hoặc bỏ từ khóa tìm kiếm.'
        }) + '</div>' +
        '<div class="ig-wzfbar"><span class="gm-help">Đã chọn <b class="gm-num">' + picked + '</b> lời mời</span>' +
          '<span class="spacer"></span>' +
          U.btn('Chọn hết trang này', { sm: true, variant: 'link', act: 'tk:selPage' }) +
          (picked ? U.btn('Bỏ chọn', { sm: true, variant: 'link', act: 'tk:selNone' }) : '') +
        '</div>' +
      '</div>' +
      U.pager({ page: v.page, size: PER_PAGE, total: rows.length }));
  }

  /* --------------------------------------------------------- các phần cấu hình */
  function cleanConfig(t) {
    return row('Chế độ dọn dẹp', 'Chế độ quyết định Creator nào bị gỡ và lời mời nào bị hủy. Chỉ lời mời không còn ai hợp tác mới bị hủy, trừ chế độ hủy toàn bộ.',
      '<div class="ig-optcards is-2">' + CLEAN_MODES.map(function (m, i) {
        return (i === 2 ? '<div class="span">' : '') +
          optcard(t.cleanMode === m.v, m.l, m.d, 'tk:clean:' + m.v, m.tag) +
          (i === 2 ? '</div>' : '');
      }).join('') + '</div>', true);
  }

  function refillConfig(t, c) {
    var market = c.shop.flag === '🇻🇳';
    var pool = matched(t, c.shop.id);
    var cats = TT.CATEGORIES.map(function (g) { return { v: g[0], l: g[1] }; });
    return row('Giới hạn mỗi lời mời', 'Tổng số Creator tối đa trong một lời mời sau khi bù. Thị trường Việt Nam tối đa ' + TT.LIMIT.creatorPerCampaign + ' Creator.',
      '<div class="ig-wzgrid">' +
        field('Số Creator tối đa mỗi lời mời',
          one('tkf', 'maxPer', t.maxPer, [{ v: 50, l: '50 Creator' }].concat(market ? [] : [{ v: 100, l: '100 Creator' }]), '50 Creator', false)) +
        field('Mẫu bộ lọc Creator',
          one('tkf', 'tplId', t.tplId, [{ v: '', l: 'Không dùng mẫu' }].concat(S.data.templates.filter(function (x) { return x.kind === 'invite'; })
            .map(function (x) { return { v: x.id, l: x.name }; })), 'Chọn mẫu bộ lọc', false),
          'Chọn mẫu sẽ đổ sẵn điều kiện, vẫn sửa lại được.') +
      '</div>', true) +

    row('Lọc Creator', 'Các trường khác nhau là điều kiện <b>và</b>; trong cùng một trường chọn nhiều là <b>hoặc</b>. Để trống nghĩa là không lọc.',
      '<div class="ig-wzfilter">' +
        '<div class="ig-wzfhead"><span class="gm-muted">Điều kiện lọc</span>' +
          '<span class="spacer"></span>' +
          U.btn('Lưu thành mẫu', { sm: true, variant: 'ghost', icon: 'bookmark', act: 'tk:saveTpl' }) +
          U.btn('Đặt lại', { sm: true, variant: 'link', act: 'tk:resetFilter' }) + '</div>' +
        '<div class="ig-wzfrow">' +
          many('cats', t.f.cats, cats, 'Danh mục sản phẩm') +
          many('ages', t.f.ages, TT.F.ageGroups.opts, 'Độ tuổi người theo dõi') +
          one('tk1', 'gender', t.f.gender, [{ v: 'ALL', l: 'Tất cả' }, { v: 'MALE', l: 'Nam' }, { v: 'FEMALE', l: 'Nữ' }], 'Giới tính', false) +
          many('fol', t.f.fol, FOLLOWER_BANDS.map(function (b) { return { v: b.v, l: b.l }; }), 'Số người theo dõi') +
          many('gmv', t.f.gmv, TT.F.gmv.opts.map(function (o) { return { v: o.v, l: o.l }; }), 'GMV sản phẩm') +
          minBox('views', t.f.views, 'Lượt xem TB video', 'lượt') +
          minBox('eng', t.f.eng, 'Tỷ lệ tương tác', '%') +
          minBox('live', t.f.live, 'Người xem TB LIVE', 'người') +
        '</div>' +
        '<div class="ig-wzfbar"><span class="gm-help">Khớp bộ lọc hiện tại: <b class="gm-num">' + S.num(pool) + '</b> Creator trong kho</span></div>' +
      '</div>');
  }

  function updateConfig(t, picked) {
    var max = picked > 1 ? NAME_MAX - 3 : NAME_MAX;
    var preview = '';
    if (picked > 1 && t.newName.trim()) {
      preview = '<div class="ig-tkpreview">' + [1, 2, 3].slice(0, Math.min(3, picked)).map(function (i) {
        return '<span>' + esc(t.newName.trim() + '-' + String(i).padStart(2, '0')) + '</span>';
      }).join('') + (picked > 3 ? '<span class="gm-muted">… tới -' + String(picked).padStart(2, '0') + '</span>' : '') + '</div>';
    }
    return row('Thời hạn & tên mới', 'Ngày kết thúc mới tính từ lúc tác vụ bắt đầu chạy. Để trống ô tên sẽ giữ nguyên tên cũ.',
      '<div class="ig-wzgrid">' +
        field('Thời hạn hiệu lực', one('tkf', 'validDays', t.validDays, VALID_DAYS, '60 ngày', false),
          'Ngày kết thúc mới = lúc chạy + ' + t.validDays + ' ngày.') +
        field('Tên lời mời mới',
          '<label class="gm-input"><input type="text" data-tk="newName" maxlength="' + max + '" placeholder="Nhập tên mới" value="' +
            U.attr(t.newName) + '"><span class="cnt">' + t.newName.length + '/' + max + '</span></label>',
          picked > 1 ? 'Chọn nhiều lời mời sẽ tự thêm hậu tố -01, -02… nên tên tối đa ' + max + ' ký tự.'
            : 'Tối đa ' + max + ' ký tự.') +
      '</div>' + preview, true);
  }

  function productConfig(t, c) {
    var prods = S.data.products[c.shop.id] || [];
    function prod(id) { var o = null; prods.forEach(function (p) { if (p.id === id) o = p; }); return o; }
    var body;
    if (!t.products.length) {
      body = U.empty('Chọn và thêm sản phẩm',
        'Mỗi lời mời chứa tối đa ' + PROD_MAX + ' sản phẩm. Mỗi lần nên thêm không quá ' + TT.LIMIT.productMin * 10 + ' sản phẩm để Creator dễ nhận.',
        U.btn('Thêm sản phẩm', { sm: true, variant: 'primary', icon: 'plus', act: 'tk:addProduct' }));
    } else {
      body = '<div class="ig-tktable">' + U.table({
        rows: t.products.map(function (x) { return { id: x.id, x: x, p: prod(x.id) }; }),
        cols: [
          { k: '', t: 'Sản phẩm', r: function (r) {
            return '<div class="ig-tkcell"><b>' + esc(r.p ? r.p.name : r.id) + '</b><span class="gm-num">' +
              esc(r.p ? r.p.sku : '') + '</span></div>'; } },
          { k: '', t: 'Hoa hồng tiêu chuẩn', cls: 'num', r: function (r) {
            return '<label class="gm-input gm-input-sm ig-tknum"><input type="number" min="1" max="80" data-tkp="com:' +
              r.id + '" value="' + r.x.com + '"><span class="u">%</span></label>'; } },
          { k: '', t: 'Hoa hồng quảng cáo', cls: 'num', r: function (r) {
            return '<span class="gm-switch' + (r.x.adsOn ? ' on' : '') + '" data-do="tk:ads:' + r.id + '"></span>'; } },
          { k: '', t: 'Tỷ lệ quảng cáo', cls: 'num', r: function (r) {
            if (!r.x.adsOn) return '<span class="gm-muted">—</span>';
            return '<label class="gm-input gm-input-sm ig-tknum"><input type="number" min="1" max="80" data-tkp="adsCom:' +
              r.id + '" value="' + r.x.adsCom + '"><span class="u">%</span></label>'; } },
          { k: '', t: '', cls: 'col-actions', r: function (r) {
            return U.iconBtn('trash', 'Bỏ sản phẩm', 'tk:delProduct:' + r.id); } }
        ]
      }) + '</div>';
    }
    return row('Sản phẩm chỉ định', 'Sản phẩm đã có trong lời mời sẽ được bỏ qua, không ghi đè hoa hồng cũ. Hoa hồng nhận giá trị nguyên từ 1 đến 80%.',
      '<div class="ig-wzfilter"><div class="ig-wzfhead">' +
        '<span>Đã chọn <b class="gm-num">' + t.products.length + '</b> / ' + PROD_MAX + ' sản phẩm</span>' +
        '<span class="spacer"></span>' +
        (t.products.length ? U.btn('Thiết lập hàng loạt', { sm: true, variant: 'ghost', icon: 'sliders', act: 'tk:bulkCom' }) +
          U.btn('Xóa tất cả', { sm: true, variant: 'link', act: 'tk:clearProducts' }) : '') +
        U.btn('Thêm sản phẩm', { sm: true, icon: 'plus', act: 'tk:addProduct' }) +
      '</div>' + body + '</div>', true);
  }

  /* số Creator trong kho khớp bộ lọc bổ sung */
  function matched(t, shopId) {
    var f = t.f;
    return S.data.creators.filter(function (cr) {
      if (f.cats.length && f.cats.indexOf(cr.catL1) < 0) return false;
      if (f.ages.length && !f.ages.some(function (a) { return cr.ageGroups.indexOf(a) > -1; })) return false;
      if (f.gender === 'MALE' && cr.gender !== 2) return false;
      if (f.gender === 'FEMALE' && cr.gender !== 3) return false;
      if (f.fol.length && !f.fol.some(function (b) {
        var band = null;
        FOLLOWER_BANDS.forEach(function (x) { if (x.v === b) band = x; });
        return band && cr.followers >= band.min && cr.followers < band.max;
      })) return false;
      if (f.gmv.length && f.gmv.indexOf(cr.gmvBand) < 0) return false;
      if (f.views !== '' && cr.avgViews < Number(f.views)) return false;
      if (f.eng !== '' && cr.engagement < Number(f.eng)) return false;
      if (f.live !== '' && cr.liveViewers < Number(f.live)) return false;
      if (S.isBlacklisted(cr.id, shopId)) return false;
      return true;
    }).length;
  }

  /* --------------------------------------------------------- màn 3: biểu mẫu */
  function formPage(c) {
    var t = c.v.tk, v = c.v, ty = typeOf(t.type);
    var picked = Object.keys(v.sel).filter(function (k) { return v.sel[k]; }).length;
    var bad = problems(c);

    var body;
    if (t.type === 'CLEAN_INVITATION') body = cleanConfig(t) + selector(c);
    else if (t.type === 'REFILL_CREATOR') body = refillConfig(t, c) + selector(c);
    else if (t.type === 'UPDATE_INVITATION_PERIOD_NAME') body = updateConfig(t, picked) + selector(c);
    else body = productConfig(t, c) + selector(c);

    return U.pageHead({ title: ty.l, desc: ty.sub, actions: U.btn('Thoát', { icon: 'x', act: 'tk:cancel' }) }) +
      '<div class="ig-tkcrumb">' + ic('sliders') + '<span>Điều chỉnh kế hoạch</span>' + ic('right') +
        '<a class="gm-link" data-do="tk:toPick">Tạo tác vụ</a>' + ic('right') + '<b>' + esc(ty.l) + '</b></div>' +
      '<div class="ig-wzbody">' + body + '</div>' +
      '<div class="ig-wzfoot">' +
        U.btn('Quay lại bước trước', { icon: 'back', act: 'tk:toPick' }) +
        '<span class="spacer"></span>' +
        (bad.length ? '<span class="sum warn">' + ic('alert') + esc(bad[0]) + '</span>'
          : '<span class="sum"><b class="gm-num">' + picked + '</b> lời mời sẽ được xử lý</span>') +
        U.btn('Tạo tác vụ', { variant: 'primary', icon: 'check', act: 'tk:create', cls: bad.length ? 'is-blocked' : '' }) +
      '</div>';
  }

  function problems(c) {
    var t = c.v.tk, p = [];
    var picked = Object.keys(c.v.sel).filter(function (k) { return c.v.sel[k]; }).length;
    if (t.type === 'UPDATE_INVITATION_PERIOD_NAME') {
      var max = picked > 1 ? NAME_MAX - 3 : NAME_MAX;
      if (t.newName.trim().length > max) p.push('Tên lời mời tối đa ' + max + ' ký tự');
    }
    if (t.type === 'ADD_INVITATION_PRODUCT') {
      if (!t.products.length) p.push('Vui lòng thêm ít nhất 1 sản phẩm');
      else if (t.products.length > PROD_MAX) p.push('Tối đa ' + PROD_MAX + ' sản phẩm');
      t.products.forEach(function (x) {
        if (!(x.com >= 1 && x.com <= 80)) p.push('Hoa hồng phải từ 1 đến 80%');
        else if (x.adsOn && !(x.adsCom >= 1 && x.adsCom <= 80)) p.push('Hoa hồng quảng cáo phải từ 1 đến 80%');
      });
    }
    if (!picked) p.push('Vui lòng chọn ít nhất 1 lời mời');
    return p;
  }

  /* --------------------------------------------------------- tạo và chạy tác vụ */
  function summaryOf(t) {
    if (t.type === 'CLEAN_INVITATION') {
      var m = CLEAN_MODES[0];
      CLEAN_MODES.forEach(function (x) { if (x.v === t.cleanMode) m = x; });
      return 'Chế độ ' + t.cleanMode + ' · ' + m.l.toLowerCase();
    }
    if (t.type === 'REFILL_CREATOR') return 'Bù tối đa ' + t.maxPer + ' Creator mỗi lời mời';
    if (t.type === 'UPDATE_INVITATION_PERIOD_NAME') {
      return 'Gia hạn ' + t.validDays + ' ngày' + (t.newName.trim() ? ' · đổi tên ' + t.newName.trim() : ' · giữ tên cũ');
    }
    var com = t.products.length ? t.products[0].com : 0;
    return t.products.length + ' sản phẩm · hoa hồng ' + com + '%';
  }

  function create(c) {
    var t = c.v.tk, ids = Object.keys(c.v.sel).filter(function (k) { return c.v.sel[k]; });
    var task = {
      id: S.uid('tk'), code: 'TV-' + String(Math.floor(100000 + Math.random() * 899999)),
      shopId: c.shop.id, type: t.type, status: 'Chờ chạy', scope: t.scope,
      cfg: { cleanMode: t.cleanMode, maxCreatorsPerInvitation: t.maxPer, filters: t.f,
        validDays: t.validDays, newName: t.newName.trim(), products: t.products.slice() },
      summary: summaryOf(t), invitationIds: ids, processed: 0, stats: {},
      by: S.data.settings.profile.name, at: S.fmtDateTime(new Date()), startedAt: ''
    };
    S.data.tasks.unshift(task);
    S.log('Tạo tác vụ ' + typeOf(t.type).l + ' cho ' + ids.length + ' lời mời', 'Chiến dịch', c.shop.id);
    S.save();
    return task;
  }

  /* chạy thật trên dữ liệu đang có để xem ngay kết quả */
  function run(task) {
    var st = {};
    if (task.type === 'CLEAN_INVITATION') {
      st = { cancelledInvitationCount: 0, keptInvitationCount: 0, removedCreatorCount: 0, failedInvitationCount: 0 };
      task.invitationIds.forEach(function (id) {
        var cp = byId(id); if (!cp) { st.failedInvitationCount++; return; }
        if (task.cfg.cleanMode === 2 || (task.cfg.cleanMode === 1 && !cp.accepted) ||
            (task.cfg.cleanMode === 3 && !cp.promoted)) {
          cp.status = 'Đã hủy';
          st.cancelledInvitationCount++;
          st.removedCreatorCount += cp.total;
          cp.total = 0; cp.sent = 0;
        } else {
          var keep = task.cfg.cleanMode === 3 ? cp.promoted : cp.accepted;
          var gone = Math.max(0, cp.total - keep);
          st.removedCreatorCount += gone;
          cp.total = keep; cp.sent = Math.min(cp.sent, keep);
          st.keptInvitationCount++;
        }
        cp.updated = S.fmtDateTime(new Date());
      });
    } else if (task.type === 'REFILL_CREATOR') {
      st = { addedCreatorCount: 0, skippedInvitationCount: 0, failedInvitationCount: 0 };
      var per = task.cfg.maxCreatorsPerInvitation || 50;
      task.invitationIds.forEach(function (id) {
        var cp = byId(id); if (!cp) { st.failedInvitationCount++; return; }
        var open = per - cp.total;
        if (open <= 0) { st.skippedInvitationCount++; return; }
        cp.total += open; cp.sent += open;
        st.addedCreatorCount += open;
        cp.updated = S.fmtDateTime(new Date());
      });
    } else if (task.type === 'UPDATE_INVITATION_PERIOD_NAME') {
      st = { updatedInvitationCount: 0, skippedInvitationCount: 0, failedInvitationCount: 0 };
      var base = task.cfg.newName, n = task.invitationIds.length;
      task.invitationIds.forEach(function (id, i) {
        var cp = byId(id); if (!cp) { st.failedInvitationCount++; return; }
        var end = new Date();
        end.setDate(end.getDate() + task.cfg.validDays);
        cp.end = S.fmtDate(end); cp.endDays = task.cfg.validDays;
        if (base) cp.name = n > 1 ? base + '-' + String(i + 1).padStart(2, '0') : base;
        cp.updated = S.fmtDateTime(new Date());
        st.updatedInvitationCount++;
      });
    } else {
      st = { addedCount: 0, skippedCount: 0, failedCount: 0 };
      task.invitationIds.forEach(function (id) {
        var cp = byId(id); if (!cp) { st.failedCount++; return; }
        var room = Math.max(0, PROD_MAX - cp.prodCount);
        var add = Math.min(room, task.cfg.products.length);
        cp.prodCount += add;
        st.addedCount += add;
        st.skippedCount += task.cfg.products.length - add;
        cp.updated = S.fmtDateTime(new Date());
      });
    }
    task.stats = st;
    task.processed = task.invitationIds.length;
    task.status = 'Hoàn thành';
    task.startedAt = S.fmtDateTime(new Date());
    S.log('Chạy tác vụ ' + task.code, 'Chiến dịch', task.shopId);
    S.save();
    return st;
  }

  function detail(task) {
    var ty = typeOf(task.type);
    var rows = task.invitationIds.map(function (id) {
      var cp = byId(id);
      return '<tr><td>' + esc(cp ? cp.name : id) + '</td><td class="num gm-num">' + esc(cp ? cp.ttId : '') + '</td>' +
        '<td>' + U.tag(task.status === 'Hoàn thành' ? 'Thành công' : task.status) + '</td></tr>';
    }).join('');
    return U.modal({
      title: 'Tác vụ ' + task.code, wide: true,
      body: U.kv([['Loại tác vụ', ty.l], ['Trạng thái', U.tag(task.status), true], ['Cấu hình', task.summary],
        ['Phạm vi', task.scope === 'EXPIRING' ? 'Sắp hết hạn' : 'Đang hiệu lực'],
        ['Số lời mời', S.num(task.invitationIds.length)], ['Đã xử lý', S.num(task.processed)],
        ['Kết quả', statChips(task), true], ['Người tạo', task.by], ['Tạo lúc', task.at],
        ['Bắt đầu lúc', task.startedAt || '—']]) +
        '<div class="gm-table-wrap" style="margin-top:12px"><table class="gm-table"><thead><tr>' +
        '<th>Lời mời</th><th class="num">ID lời mời</th><th>Kết quả</th></tr></thead><tbody>' + rows + '</tbody></table></div>',
      foot: '<span style="flex:1"></span>' + U.btn('Đóng', { variant: 'primary', act: 'modal:close' })
    });
  }

  /* --------------------------------------------------------- điều phối */
  function action(parts, c, refresh, toast) {
    var t = c.v.tk, v = c.v, verb = parts[0], arg = parts.slice(1).join(':');

    switch (verb) {
      case 'new':
        v.tk = blank(); v.q = ''; v.sel = {}; v.page = 1;
        refresh(); return true;
      case 'cancel': v.tk = null; v.q = ''; v.sel = {}; v.page = 1; refresh(); return true;
      case 'toPick': if (t) { t.screen = 'pick'; } refresh(); return true;
      case 'type': if (t) { t.type = arg; } refresh(); return true;
      case 'toForm':
        if (!t.type) { toast('Chưa chọn loại tác vụ'); return true; }
        t.screen = 'form'; v.q = ''; v.sel = {}; v.page = 1;
        if (t.type === 'ADD_INVITATION_PRODUCT' && !t.products.length) return { productModal: true };
        refresh(); return true;

      case 'scope': t.scope = arg; v.sel = {}; v.page = 1; refresh(); return true;
      case 'clean': t.cleanMode = parseInt(arg, 10); refresh(); return true;
      case 'resetFilter': t.f = blank().f; refresh(); return true;
      case 'saveTpl': toast('Đã lưu bộ lọc thành mẫu dùng lại'); return true;

      case 'selPage': {
        var ids = Array.prototype.map.call(document.querySelectorAll('[data-sel]'), function (b) {
          return b.getAttribute('data-sel');
        });
        ids.forEach(function (id) { v.sel[id] = true; });
        refresh(); return true;
      }
      case 'selNone': v.sel = {}; refresh(); return true;

      case 'addProduct': return { productModal: true };
      case 'delProduct': t.products = t.products.filter(function (x) { return x.id !== arg; }); refresh(); return true;
      case 'clearProducts': t.products = []; refresh(); return true;
      case 'ads': t.products.forEach(function (x) { if (x.id === arg) x.adsOn = !x.adsOn; }); refresh(); return true;
      case 'bulkCom': return { bulkCom: true };

      case 'create': {
        var bad = problems(c);
        if (bad.length) { toast(bad[0]); return true; }
        if (t.type === 'CLEAN_INVITATION' && t.cleanMode === 2) return { confirmClean: true };
        return { created: create(c) };
      }

      case 'run': {
        var tk = taskById(arg);
        if (!tk) return true;
        var st = run(tk);
        toast('Đã chạy xong ' + tk.code + ' · ' + resultLine(tk, st));
        refresh(); return true;
      }
      case 'pause': setStatus(arg, 'Tạm dừng'); toast('Đã tạm dừng tác vụ'); refresh(); return true;
      case 'resume': setStatus(arg, 'Đang chạy'); toast('Tác vụ đang chạy tiếp'); refresh(); return true;
      case 'stop': setStatus(arg, 'Đã dừng'); toast('Đã dừng tác vụ, phần chưa xử lý sẽ không chạy tiếp'); refresh(); return true;
      case 'retry': {
        var tk2 = taskById(arg);
        if (tk2) { run(tk2); toast('Đã chạy lại phần lỗi của ' + tk2.code); refresh(); }
        return true;
      }
      case 'view': {
        var tk3 = taskById(arg);
        if (tk3) return { modal: detail(tk3) };
        return true;
      }
    }
    return false;
  }

  function resultLine(tk, st) {
    if (tk.type === 'CLEAN_INVITATION') return 'hủy ' + st.cancelledInvitationCount + ' lời mời, gỡ ' + S.num(st.removedCreatorCount) + ' Creator';
    if (tk.type === 'REFILL_CREATOR') return 'thêm ' + S.num(st.addedCreatorCount) + ' Creator';
    if (tk.type === 'UPDATE_INVITATION_PERIOD_NAME') return 'cập nhật ' + st.updatedInvitationCount + ' lời mời';
    return 'thêm ' + S.num(st.addedCount) + ' lượt sản phẩm';
  }
  function taskById(id) {
    var out = null;
    S.data.tasks.forEach(function (t) { if (t.id === id) out = t; });
    return out;
  }
  function setStatus(id, st) {
    var t = taskById(id);
    if (t) { t.status = st; S.save(); }
  }

  function page(c) {
    var t = c.v.tk;
    if (!t) return listPage(c);
    return t.screen === 'form' ? formPage(c) : pickPage(c);
  }

  global.PAGES.tasks = page;
  global.TASKS = { page: page, action: action, create: create, run: run, blank: blank, TYPES: TYPES };
})(window);
