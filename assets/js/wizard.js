/* GOPUSH — luồng tạo lời mời hợp tác và đợt nhắn tin.
   Dạng từng bước toàn trang: xong bước này mới mở được bước sau.

   Khác biệt với thao tác tay trên TikTok: TikTok bắt lọc và chọn Creator riêng
   cho từng lời mời 50 người. Ở đây lọc một lần ra tới hàng nghìn Creator rồi
   hệ thống tự cắt thành nhiều chiến dịch, mỗi chiến dịch đúng 50 người theo
   giới hạn của nền tảng. */
(function (global) {
  'use strict';

  var U = global.UI, ic = global.icon, S = global.DB, TT = global.TT;

  var INVITE_STEPS = ['Tạo lời mời', 'Chọn sản phẩm', 'Hàng mẫu miễn phí', 'Chọn Creator'];
  var MESSAGE_STEPS = ['Thiết lập tin nhắn', 'Chọn Creator', 'Xem lại và tạo'];
  var PER = TT.LIMIT.creatorPerCampaign;      /* 50 — giới hạn cứng của TikTok */
  /* ba kênh cố định, phải điền đủ: Zalo (TikTok bắt buộc) + Email + Facebook */
  var FIXED_CONTACTS = [42, 7, 44];
  var PAGE = 10;

  /* --------------------------------------------------------- khởi tạo */
  function emptyFilter() {
    return {
      cats: [], avgCommission: null, contentLabel: null, agency: null, languages: [],
      risingStar: false, notInvited90: false,
      ageGroups: [], gender: null, genderPct: TT.F.gender.defaultPercentage,
      followers: { min: '', max: '' }, gmv: [], unitsSold: [],
      videoViews: { min: '', max: '' }, liveViewers: { min: '', max: '' },
      engagement: { min: '', max: '' }, fulfillment: null, brands: []
    };
  }

  function blank(kind, shopId) {
    var prods = S.data.products[shopId] || [];
    return {
      kind: kind, step: 0, done: 0,
      /* bước 1 — lời mời */
      name: '', expiry: '', priority: 1,
      contacts: FIXED_CONTACTS.map(function (f) { return { field: f, cc: 'VN +84', value: '' }; }),
      content: '',
      gap: '5s', perGroup: String(PER), shareChat: true,
      /* bước 2 — sản phẩm */
      products: prods.slice(0, 2).map(function (p) {
        return { id: p.id, com: p.com, adsOn: true, adsCom: Math.max(1, p.com - 6) };
      }),
      /* bước 3 — hàng mẫu */
      freeSample: true, sampleMode: 'manual',
      /* tin nhắn */
      method: 'api', msgMode: 'card', contentMode: 'card', title: '', body: '',
      cards: prods.slice(0, 1).map(function (p) { return p.id; }),
      /* chọn Creator */
      source: 'tiktok', ftab: 0, sort: 18, q: '', paste: '', sel: {}, page: 1,
      f: emptyFilter(),
      d: { cat: '', fol: '', gmv: '', rate: '', type: '', country: '', tag: '', rel: '', contact: '' },
      /* chia lô */
      perCampaign: PER, batchName: ''
    };
  }

  function start(kind, shopId, v) { v.wz = blank(kind, shopId); return v.wz; }

  /* --------------------------------------------------------- khối dựng */
  function row(label, hint, fields, required) {
    return '<div class="ig-wzrow"><div class="lb"><b>' + (required ? '<i class="req">*</i>' : '') + U.esc(label) + '</b>' +
      (hint ? '<p>' + hint + '</p>' : '') + '</div><div class="fields">' + fields + '</div></div>';
  }
  function field(label, control, help, required) {
    return '<div class="gm-field"><span class="gm-label">' + (required ? '<i class="req">*</i>' : '') +
      U.esc(label) + '</span>' + control + (help ? '<span class="gm-help">' + help + '</span>' : '') + '</div>';
  }
  function pick(value, key, opts, ph) {
    return '<button class="gm-input gm-select" data-pick="wzf:' + U.attr(key) + '" data-opts="' +
      U.attr(JSON.stringify(opts)) + '"><span class="val' + (value ? '' : ' ph') + '">' +
      U.esc(value || ph || 'Chọn') + '</span>' + ic('down') + '</button>';
  }
  function textInput(value, key, ph, max, iconName) {
    return '<label class="gm-input">' + (iconName ? ic(iconName) : '') +
      '<input type="text" data-wz="' + U.attr(key) + '" placeholder="' + U.attr(ph || '') +
      '" value="' + U.attr(value == null ? '' : value) + '"' + (max ? ' maxlength="' + max + '"' : '') + '>' +
      (max ? '<span class="cnt">' + String(value || '').length + '/' + max + '</span>' : '') + '</label>';
  }
  function area(value, key, ph, max, rows) {
    return '<label class="gm-input gm-input-area"><textarea rows="' + (rows || 5) + '" data-wz="' + U.attr(key) +
      '" placeholder="' + U.attr(ph || '') + '"' + (max ? ' maxlength="' + max + '"' : '') + '>' + U.esc(value || '') + '</textarea>' +
      (max ? '<span class="cnt">' + String(value || '').length + '/' + max + '</span>' : '') + '</label>';
  }
  function radio(on, title, sub, act, badge) {
    var tag = '';
    if (badge) {
      var parts = String(badge).split('|');
      tag = ' <span class="gm-tag gm-tag-' + (parts[1] || 'ok') + '">' + U.esc(parts[0]) + '</span>';
    }
    return '<label class="ig-optcard' + (on ? ' on' : '') + '" data-do="' + U.attr(act) + '">' +
      '<span class="gm-radio' + (on ? ' on' : '') + '"></span>' +
      '<span class="tx"><b>' + U.esc(title) + tag + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</span></label>';
  }
  function check(on, text, act) {
    return '<label class="ig-wzcheck" data-do="' + U.attr(act) + '"><span class="gm-check' + (on ? ' on' : '') + '"></span>' +
      '<span>' + U.esc(text) + '</span></label>';
  }

  /* --------------------------------------------------------- điều khiển lọc gọn */
  /* select nhỏ một lựa chọn, ghi vào w.f hoặc w.d */
  function sel1(bucket, key, value, opts, ph) {
    var cur = null;
    opts.forEach(function (o) { if (String(o.v) === String(value)) cur = o; });
    return '<button class="gm-input gm-select gm-input-sm' + (cur ? ' is-set' : '') +
      '" data-pick="wz1:' + bucket + '.' + U.attr(key) + '" data-opts="' +
      U.attr(JSON.stringify([{ v: '', l: 'Tất cả' }].concat(opts))) + '">' +
      '<span class="val">' + U.esc(cur ? cur.l : ph) + '</span>' + ic('down') + '</button>';
  }
  /* select nhỏ nhiều lựa chọn */
  function selN(key, arr, opts, ph) {
    var n = (arr || []).length;
    var label = n === 0 ? ph : (n === 1 ? labelOf(opts, arr[0]) : ph + ': ' + n);
    return '<button class="gm-input gm-select gm-input-sm' + (n ? ' is-set' : '') +
      '" data-pickm="' + U.attr(key) + '" data-opts="' + U.attr(JSON.stringify(opts)) +
      '" data-sel="' + U.attr(JSON.stringify(arr || [])) + '">' +
      '<span class="val">' + U.esc(label) + '</span>' + ic('down') + '</button>';
  }
  function labelOf(opts, v) {
    var out = String(v);
    opts.forEach(function (o) { if (String(o.v) === String(v)) out = o.l; });
    return out;
  }
  /* ô nhập khoảng, để trống là không giới hạn */
  function range(key, r, ph, unit) {
    var on = (r.min !== '' && r.min != null) || (r.max !== '' && r.max != null);
    return '<span class="ig-rng' + (on ? ' is-set' : '') + '"><span class="k">' + U.esc(ph) + '</span>' +
      '<input type="number" min="0" data-rng="' + U.attr(key) + '.min" placeholder="từ" value="' + U.attr(r.min) + '">' +
      '<i>–</i><input type="number" min="0" data-rng="' + U.attr(key) + '.max" placeholder="đến" value="' + U.attr(r.max) + '">' +
      (unit ? '<span class="u">' + U.esc(unit) + '</span>' : '') + '</span>';
  }

  /* --------------------------------------------------------- kiểm tra từng bước */
  function problems(w) {
    var p = [];
    if (w.kind === 'invite') {
      if (w.step === 0) {
        if (!w.name.trim()) p.push('Chưa đặt tên lời mời');
        else if (w.name.trim().length > TT.LIMIT.nameMax) p.push('Tên lời mời tối đa ' + TT.LIMIT.nameMax + ' ký tự');
        if (!w.expiry) p.push('Chưa chọn ngày hết hiệu lực');
        else if (w.expiry <= todayISO()) p.push('Ngày hết hiệu lực phải từ ngày mai trở đi');
        FIXED_CONTACTS.forEach(function (f, i) {
          var c = w.contacts[i];
          var meta = contactMeta(f);
          if (!c || !c.value.trim()) p.push('Chưa nhập ' + meta.l + ' — kênh liên hệ bắt buộc');
          else if (f === 7 && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.value.trim())) p.push('Email liên hệ chưa đúng định dạng');
        });
        w.contacts.slice(FIXED_CONTACTS.length).forEach(function (c) {
          if (!c.value.trim()) p.push('Kênh ' + contactMeta(c.field).l + ' đang để trống, hãy nhập hoặc bỏ đi');
        });
        if (w.content.length > TT.LIMIT.messageMax) p.push('Nội dung lời mời tối đa ' + TT.LIMIT.messageMax + ' ký tự');
      } else if (w.step === 1) {
        if (w.products.length < TT.LIMIT.productMin) p.push('Chọn ít nhất 1 sản phẩm');
        if (w.products.length > TT.LIMIT.productMax) p.push('Tối đa ' + TT.LIMIT.productMax + ' sản phẩm mỗi lời mời');
        w.products.forEach(function (x) {
          if (!(x.com >= 1 && x.com <= 80)) p.push('Hoa hồng phải nằm trong khoảng 1 – 80%');
        });
      } else if (w.step === 3 && !count(w)) p.push('Chưa chọn Creator nào');
    } else {
      if (w.step === 0) {
        if (!w.name.trim()) p.push('Chưa đặt tên đợt nhắn tin');
        if (!w.title.trim()) p.push('Chưa nhập tiêu đề tin nhắn');
        if (!w.body.trim()) p.push('Chưa nhập nội dung tin nhắn');
        if (w.contentMode === 'card' && !w.cards.length) p.push('Chưa chọn thẻ sản phẩm');
      } else if (w.step === 1 && !count(w)) p.push('Chưa chọn Creator nào');
    }
    return p;
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function count(w) { return Object.keys(w.sel).filter(function (k) { return w.sel[k]; }).length; }
  function steps(w) { return w.kind === 'invite' ? INVITE_STEPS : MESSAGE_STEPS; }
  function creatorStep(w) { return w.kind === 'invite' ? 3 : 1; }

  /* --------------------------------------------------------- bước 1: lời mời */
  function contactMeta(field) {
    var meta = null;
    TT.CONTACT.forEach(function (x) { if (x.v === field) meta = x; });
    return meta || TT.CONTACT[0];
  }
  function contactRows(w) {
    var used = w.contacts.map(function (c) { return c.field; });
    return '<div class="ig-contacts">' + w.contacts.map(function (c, i) {
      var meta = contactMeta(c.field);
      var fixed = i < FIXED_CONTACTS.length;
      var opts = TT.CONTACT.filter(function (x) { return x.v === c.field || used.indexOf(x.v) < 0; })
        .map(function (x) { return { v: x.v, l: x.l }; });
      return '<div class="ig-contact' + (fixed ? ' is-fixed' : '') + '">' +
        (fixed
          ? '<span class="ig-cname is-lock">' + U.esc(meta.l) + '<i class="req">*</i></span>'
          : '<button class="gm-input gm-select gm-input-sm ig-cname" data-pick="wzc:' + i + '" data-opts="' +
            U.attr(JSON.stringify(opts)) + '"><span class="val">' + U.esc(meta.l) + '</span>' + ic('down') + '</button>') +
        (meta.cc ? '<button class="gm-input gm-select gm-input-sm ig-ccode" data-pick="wzcc:' + i + '" data-opts="' +
          U.attr(JSON.stringify(TT.COUNTRY_CODE.map(function (x) { return { v: x.l, l: x.l }; }))) + '">' +
          '<span class="val">' + U.esc(c.cc) + '</span>' + ic('down') + '</button>' : '') +
        '<label class="gm-input gm-input-sm"><input type="text" data-wzc="' + i + '" placeholder="' +
          U.attr(meta.ph) + '" value="' + U.attr(c.value) + '"></label>' +
        (fixed ? '<span class="ig-cpad"></span>' : U.iconBtn('trash', 'Bỏ kênh này', 'wz:delContact:' + i)) +
        '</div>';
    }).join('') +
    (w.contacts.length < TT.CONTACT.length
      ? '<button class="ig-caddmore" data-do="wz:addContact">' + ic('plus') + 'Thêm kênh liên hệ</button>' : '') +
    '</div>';
  }

  function stepInvite1(w) {
    return row('Tên lời mời', 'Đặt tên dễ nhận ra theo mục đích hoặc sự kiện. Creator không nhìn thấy tên này.',
      textInput(w.name, 'name', 'Ví dụ: Mời Creator F&B tháng 10', TT.LIMIT.nameMax), true) +

    row('Thông số gửi', 'Giãn cách và cỡ nhóm quyết định tốc độ gửi. Gửi chậm hơn giúp shop an toàn hơn.',
      '<div class="ig-wzgrid">' +
        field('Thời hạn hiệu lực', '<label class="gm-input ig-date">' + ic('calendar') +
          '<input type="date" data-wz="expiry" min="' + tomorrowISO() + '" value="' + U.attr(w.expiry) + '">' +
          '<span class="pick">' + ic('down') + '</span></label>',
          'Sớm nhất là ngày mai. Hết hạn thì Creator không chấp nhận được nữa.', true) +
        field('Khoảng cách giữa các lời mời', pick(w.gap, 'gap', ['5s', '4s', '3s', '2s', '1s'])) +
      '</div>' +
      check(w.shareChat, 'Chia sẻ lời mời vào cửa sổ trò chuyện với Creator', 'wz:toggle:shareChat'), true) +

    row('Thông tin liên hệ', 'Creator được mời dùng thông tin này để hỏi thêm. TikTok bắt buộc có Zalo.',
      contactRows(w), true) +

    row('Nội dung lời mời', 'Giới thiệu shop và nói rõ lý do muốn hợp tác. Tin này hiện trong hộp thư của Creator.',
      '<div class="ig-wzins">' + U.btn('Chèn tên Creator', { sm: true, variant: 'ghost', icon: 'plus', act: 'wz:insertName' }) +
      U.btn('Dùng mẫu có sẵn', { sm: true, variant: 'ghost', icon: 'template', act: 'wz:useTemplate' }) +
      U.btn('Kiểm tra nội dung', { sm: true, variant: 'ghost', icon: 'shield', act: 'wz:checkText' }) + '</div>' +
      area(w.content, 'content',
        'Gợi ý: 1) Giới thiệu cửa hàng hoặc thương hiệu  2) Mục đích của lời mời  3) Vì sao muốn hợp tác với Creator này',
        TT.LIMIT.messageMax, 5)) +

    row('Loại nội dung ưu tiên', 'Cho Creator biết shop ưu tiên video gắn link hay LIVE. Creator vẫn được đăng loại khác.',
      '<div class="ig-optcards is-2">' + TT.CONTENT_OPTION.map(function (o, i) {
        var card = radio(w.priority === o.v, o.l, o.d, 'wz:set:priority:' + o.v);
        return i === 2 ? '<div class="span">' + card + '</div>' : card;
      }).join('') + '</div>');
  }

  function tomorrowISO() {
    var d = new Date(); d.setDate(d.getDate() + 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* --------------------------------------------------------- bước 2: sản phẩm */
  function stepInvite2(w, shopId) {
    var prods = S.data.products[shopId] || [];
    var rows = w.products.map(function (x) {
      var p = null; prods.forEach(function (q) { if (q.id === x.id) p = q; });
      if (!p) return '';
      var est = Math.round(p.price * x.com / 100);
      return '<tr><td class="col-check"><span class="gm-check on" data-do="wz:delProduct:' + x.id + '"></span></td>' +
        '<td><div class="gm-entity"><span class="gm-avatar gm-avatar-sq">' + ic('box') + '</span>' +
          '<div><div class="name">' + U.esc(p.name) + '</div><div class="meta">' + U.esc(p.sku) + '</div></div></div></td>' +
        '<td class="num">' + S.vnd(p.price) + '</td>' +
        '<td><label class="gm-input gm-input-sm ig-pctin"><input type="number" min="1" max="80" data-wzp="com:' + x.id +
          '" value="' + x.com + '"><span class="cnt">%</span></label>' +
          '<div class="gm-help">Hoa hồng ước tính: ' + S.vnd(est) + '</div></td>' +
        '<td><span class="gm-switch' + (x.adsOn ? ' on' : '') + '" data-do="wz:adsToggle:' + x.id + '"></span></td>' +
        '<td><label class="gm-input gm-input-sm ig-pctin"><input type="number" min="1" max="80" data-wzp="adsCom:' + x.id +
          '" value="' + x.adsCom + '"' + (x.adsOn ? '' : ' disabled') + '><span class="cnt">%</span></label></td></tr>';
    }).join('');

    return '<div class="ig-wzsection">' +
      U.banner('Hoa hồng gửi lên TikTok ở dạng phần trăm nhân 100, hợp lệ trong khoảng <b>1% – 80%</b>. Mỗi lời mời tối đa ' +
        TT.LIMIT.productMax + ' sản phẩm.') +
      '<div class="ig-wztools"><b class="gm-num">' + w.products.length + '</b> / ' + TT.LIMIT.productMax + ' sản phẩm' +
        '<span class="spacer"></span>' +
        U.btn('Chỉnh hoa hồng hàng loạt', { sm: true, icon: 'sliders', act: 'wz:bulkCom' }) +
        U.btn('Thêm sản phẩm', { sm: true, variant: 'primary', icon: 'plus', act: 'wz:addProduct' }) + '</div>' +
      (w.products.length
        ? '<div class="gm-table-wrap"><table class="gm-table ig-wztable"><thead><tr>' +
          '<th class="col-check"></th><th>Sản phẩm</th><th class="num">Giá</th>' +
          '<th>Hoa hồng tiêu chuẩn</th><th>Hoa hồng quảng cáo</th><th>Tỷ lệ quảng cáo</th>' +
          '</tr></thead><tbody>' + rows + '</tbody></table></div>'
        : U.empty('Chưa chọn sản phẩm nào', 'Thêm ít nhất một sản phẩm để Creator biết sẽ bán gì.',
            U.btn('Thêm sản phẩm', { sm: true, variant: 'primary', act: 'wz:addProduct' }))) +
    '</div>';
  }

  /* --------------------------------------------------------- bước 3: hàng mẫu */
  function stepInvite3(w, shopId) {
    var samples = S.data.samples.filter(function (s) { return s.shopId === shopId; });
    var approved = samples.filter(function (s) { return ['PENDING', 'CANCELLED'].indexOf(s.status) < 0; }).length;
    var rate = samples.length ? Math.round(approved / samples.length * 1000) / 10 : 0;

    return row('Cung cấp hàng mẫu miễn phí',
      'Mỗi Creator được mời có thể xin một hàng mẫu cho mỗi sản phẩm trong lời mời. Không giới hạn tổng số mẫu.',
      U.switchRow('Bật hàng mẫu miễn phí cho lời mời này', w.freeSample, null, 'wz:toggle:freeSample')) +
    (w.freeSample ? row('Cách duyệt yêu cầu', 'Duyệt tự động giúp lời mời hiển thị tốt hơn với Creator.',
      '<div class="ig-optcards is-2">' +
        radio(w.sampleMode === 'auto', 'Tự động phê duyệt yêu cầu',
          'Hệ thống tự duyệt một SKU cho mỗi sản phẩm với mỗi Creator, mẫu sẵn sàng vận chuyển ngay.<br>' +
          '<span class="gm-help">Lời mời hiển thị: hàng mẫu miễn phí tự động phê duyệt</span>',
          'wz:set:sampleMode:auto', 'Tăng hiển thị|hot') +
        radio(w.sampleMode === 'manual', 'Xem xét yêu cầu thủ công',
          'Xem từng yêu cầu trước khi gửi mẫu.<br>' +
          '<span class="gm-help">Lời mời hiển thị: tỉ lệ phê duyệt của shop là ' + S.pct(rate) + '</span>',
          'wz:set:sampleMode:manual', 'Nên dùng|ok') +
      '</div>') : '');
  }

  /* --------------------------------------------------------- bước 1 của tin nhắn */
  function stepMsg1(w, shopId) {
    var prods = S.data.products[shopId] || [];
    var cards = w.cards.map(function (id) {
      var p = null; prods.forEach(function (q) { if (q.id === id) p = q; });
      if (!p) return '';
      return '<div class="ig-cardrow"><span class="gm-avatar gm-avatar-sq">' + ic('box') + '</span>' +
        '<div class="t"><b>' + U.esc(p.name) + '</b><span class="gm-help">' + U.esc(p.sku) + ' · ' +
        S.vnd(p.price) + ' · hoa hồng ' + p.com + '%</span></div>' +
        U.iconBtn('trash', 'Bỏ sản phẩm', 'wz:delCard:' + p.id) + '</div>';
    }).join('');

    return row('Tên đợt nhắn tin', 'Chỉ hiện trong GOPUSH để bạn theo dõi, Creator không nhìn thấy.',
      textInput(w.name, 'name', 'Ví dụ: Nhắc Creator đã nhận mẫu', TT.LIMIT.nameMax), true) +

    row('Phương thức gửi', 'GOPUSH chỉ gửi qua API chính thức của TikTok Shop, không dùng plugin giả lập thao tác.',
      '<div class="ig-optcards is-2">' +
        radio(true, 'Nhắn tin hàng loạt qua API', 'Chạy nền, không chiếm trình duyệt, tắt máy vẫn chạy tiếp.',
          'wz:set:method:api', 'Nên dùng|ok') +
        '<label class="ig-optcard is-off"><span class="gm-radio"></span><span class="tx"><b>Plugin RPA trên trình duyệt</b>' +
        '<span>Giả lập thao tác tay qua trình duyệt. GOPUSH không hỗ trợ vì trái nguyên tắc chỉ dùng API chính thức.</span></span></label>' +
      '</div>') +

    row('Chế độ tin nhắn', 'Chế độ thẻ tiêu tốn ít hạn mức hơn và thường có tỉ lệ phản hồi cao hơn.',
      '<div class="ig-optcards is-2">' +
        radio(w.msgMode === 'card', 'Chế độ thẻ',
          'Gửi được nhiều sản phẩm trong một tin, tốn ít hạn mức tin nhắn riêng hơn.', 'wz:set:msgMode:card') +
        radio(w.msgMode === 'normal', 'Chế độ bình thường',
          'Hỗ trợ văn bản, hình ảnh và thẻ sản phẩm; mỗi loại chiếm một hạn mức gửi.', 'wz:set:msgMode:normal') +
      '</div>' +
      '<p class="gm-help">Khuyến nghị tối đa 999 tin nhắn riêng mỗi ngày cho một cửa hàng.</p>') +

    row('Nội dung tin nhắn', 'Giới thiệu ngắn, nói rõ đề nghị hợp tác rồi mời trao đổi thêm.',
      '<div class="ig-optcards is-2">' +
        radio(w.contentMode === 'card', 'Thẻ sản phẩm', 'Kèm sản phẩm Creator dễ quan tâm nhất để mở đầu.', 'wz:set:contentMode:card') +
        radio(w.contentMode === 'image', 'Hình ảnh', 'Một ảnh có chữ, nhìn là hiểu ngay thông tin hợp tác.', 'wz:set:contentMode:image') +
      '</div>' +
      field('Tiêu đề', textInput(w.title, 'title', 'Tiêu đề ngắn gọn nói đúng nội dung tin nhắn', 50), null, true) +
      field('Tin nhắn',
        '<div class="ig-wzins">' + U.btn('Chèn tên Creator', { sm: true, variant: 'ghost', icon: 'plus', act: 'wz:insertName' }) +
        U.btn('Dùng mẫu có sẵn', { sm: true, variant: 'ghost', icon: 'template', act: 'wz:useTemplate' }) +
        U.btn('Kiểm tra nội dung', { sm: true, variant: 'ghost', icon: 'shield', act: 'wz:checkText' }) + '</div>' +
        area(w.body, 'body', 'Giới thiệu trước, giải thích chi tiết hợp tác, cuối cùng mời trao đổi sâu hơn.',
          TT.LIMIT.messageMax, 4), null, true) +
      (w.contentMode === 'card'
        ? field('Thẻ sản phẩm', '<div class="ig-cardlist">' + cards +
            U.btn('Thêm sản phẩm (' + w.cards.length + '/5)', { sm: true, icon: 'plus', act: 'wz:addCard' }) + '</div>', null, true)
        : field('Hình ảnh', U.btn('Tải ảnh lên', { sm: true, icon: 'upload', act: 'toast:Chọn ảnh JPG hoặc PNG dưới 2MB' }))), true) +

    row('Thiết lập chế độ gửi', 'Gửi chậm và chia nhóm nhỏ giúp giảm rủi ro bị giới hạn lưu lượng.',
      '<div class="ig-wzgrid">' +
        field('Khoảng cách giữa các tin', pick(w.gap, 'gap', ['5s', '4s', '3s', '2s', '1s'])) +
        field('Số người gửi mỗi nhóm', pick(w.perGroup, 'perGroup', ['50', '40', '30', '20', '10'])) +
      '</div>');
  }

  /* --------------------------------------------------------- lọc Creator */
  function inRange(v, r) {
    if (r.min !== '' && r.min != null && v < Number(r.min)) return false;
    if (r.max !== '' && r.max != null && v > Number(r.max)) return false;
    return true;
  }
  function anyOf(arr, v) { return !arr.length || arr.indexOf(v) > -1; }

  function pool(w, shopId) {
    var db = S.data;
    if (w.source === 'manual') {
      var set = {};
      String(w.paste || '').split(/[\s,;]+/).forEach(function (x) {
        var n = x.replace(/^@/, '').toLowerCase();
        if (n) set[n] = 1;
      });
      return db.creators.filter(function (c) { return set[c.user.toLowerCase()]; }).slice(0, 5000);
    }

    var f = w.f, d = w.d;
    var out = db.creators.filter(function (c) {
      if (S.isBlacklisted(c.id, shopId)) return false;
      if (w.q && (c.name + ' ' + c.user).toLowerCase().indexOf(w.q.toLowerCase()) < 0) return false;
      var r = S.rel(c, shopId);

      if (w.source === 'db') {
        if (d.cat && c.cat !== d.cat) return false;
        if (d.fol && folBand(c.followers) !== d.fol) return false;
        if (d.country && c.country !== d.country) return false;
        if (d.type && typeLabel(c) !== d.type) return false;
        if (d.rel && r.state !== d.rel) return false;
        if (d.gmv && c.gmv30 < Number(d.gmv)) return false;
        if (d.rate && c.postRate < Number(d.rate)) return false;
        if (d.tag) {
          var tg = db.tags.filter(function (t) { return t.name === d.tag; })[0];
          if (!tg || r.tags.indexOf(tg.id) < 0) return false;
        }
        if (d.contact && (d.contact === 'Có liên hệ') !== !!c.contact) return false;
        return true;
      }

      /* nguồn TikTok Marketplace — đúng các trường search_creators trả về */
      if (f.cats.length && f.cats.indexOf(c.cat2) < 0) return false;
      if (f.avgCommission) {
        var capCom = 0;
        TT.F.avgCommission.opts.forEach(function (o) { if (o.v === f.avgCommission) capCom = o.max; });
        if (c.avgCommission >= capCom) return false;
      }
      if (f.contentLabel && c.contentLabel !== f.contentLabel) return false;
      if (f.agency && c.agency !== f.agency) return false;
      if (f.languages.length && !f.languages.some(function (l) { return c.langs.indexOf(l) > -1; })) return false;
      if (f.risingStar && !c.risingStar) return false;
      if (f.notInvited90 && r.invitedAt) return false;
      if (f.ageGroups.length && !f.ageGroups.some(function (a) { return c.ageGroups.indexOf(a) > -1; })) return false;
      if (f.gender && (c.gender !== f.gender || c.genderPct < f.genderPct)) return false;
      if (!inRange(c.followers, f.followers)) return false;
      if (!anyOf(f.gmv, c.gmvBand)) return false;
      if (!anyOf(f.unitsSold, c.unitsBand)) return false;
      if (!inRange(c.avgViews, f.videoViews)) return false;
      if (!inRange(c.liveViewers, f.liveViewers)) return false;
      if (!inRange(c.engagement, f.engagement)) return false;
      if (f.fulfillment && c.fulfillment < f.fulfillment) return false;
      if (f.brands.length && !f.brands.some(function (b) { return c.brands.indexOf(b) > -1; })) return false;
      return true;
    });

    var by = { 18: 'gmv30', 20: 'unitsSold', 22: 'engagement', 24: 'avgViews', 26: 'followers' }[w.sort];
    if (by) out.sort(function (a, b) { return b[by] - a[by]; });
    return out;
  }

  function folBand(n) { return n < 50000 ? 'Dưới 50K' : n < 100000 ? '50K – 100K' : n < 300000 ? '100K – 300K' : 'Trên 300K'; }
  function typeLabel(c) { return c.contentLabel === 2 ? 'LIVE' : 'Video'; }

  /* --------------------------------------------------------- khung bộ lọc */
  function quickChips(w) {
    var items = w.source === 'db'
      ? [['Chưa mời', 'd.rel', 'Mới'], ['GMV trên 100tr', 'd.gmv', '100000000'],
         ['Tỉ lệ đăng ≥ 60%', 'd.rate', '60'], ['Có liên hệ', 'd.contact', 'Có liên hệ']]
      : [['Chưa mời 90 ngày', '@notInvited90', 1], ['Ngôi sao sáng tạo', '@risingStar', 1],
         ['GMV trên 100tr', '#gmv', 3], ['Bán trên 1.000 món', '#unitsSold', 4]];
    return '<div class="ig-quick"><span class="lb">Hay dùng</span>' + items.map(function (it) {
      var k = it[1], on;
      if (k.charAt(0) === '@') on = !!w.f[k.slice(1)];
      else if (k.charAt(0) === '#') on = w.f[k.slice(1)].indexOf(it[2]) > -1;
      else on = w.d[k.slice(2)] === String(it[2]);
      return '<button class="ig-qchip' + (on ? ' on' : '') + '" data-do="wz:quick:' + U.attr(k) + ':' + U.attr(it[2]) + '">' +
        (on ? ic('check') : '') + U.esc(it[0]) + '</button>';
    }).join('') + '</div>';
  }

  function filterBox(w) {
    if (w.source === 'manual') {
      var lines = String(w.paste || '').split(/\n+/).filter(function (x) { return x.trim(); });
      return '<div class="ig-wzfilter">' +
        '<div class="ig-wzfhead"><span>Dán danh sách Creator</span>' +
        '<span class="gm-help">Mỗi dòng một username, tối đa 5.000 dòng</span>' +
        '<span class="spacer"></span>' +
        U.btn('Tải file Excel', { sm: true, variant: 'ghost', icon: 'upload', act: 'toast:Chọn file .xlsx hoặc .csv có cột username' }) +
        '</div>' + area(w.paste, 'paste', '@huyenmy.review\n@anhtuan.food\n@ngocanh.daily', null, 5) +
        '<div class="ig-wzfbar"><span class="gm-help"><b class="gm-num">' + lines.length + '</b> dòng đã nhập</span></div></div>';
    }

    if (w.source === 'db') {
      var d = w.d, db = S.data;
      return '<div class="ig-wzfilter">' +
        '<div class="ig-wzfhead"><span>' + ic('filter') + 'Điều kiện lọc kho GOPUSH</span>' +
        '<span class="spacer"></span>' + U.btn('Đặt lại', { sm: true, variant: 'link', act: 'wz:resetFilter' }) + '</div>' +
        quickChips(w) +
        '<div class="ig-wzfrow">' +
          sel1('d', 'cat', d.cat, uniqueCats().map(function (x) { return { v: x, l: x }; }), 'Hạng mục') +
          sel1('d', 'fol', d.fol, ['Dưới 50K', '50K – 100K', '100K – 300K', 'Trên 300K'].map(function (x) { return { v: x, l: x }; }), 'Follower') +
          sel1('d', 'gmv', d.gmv, [{ v: '50000000', l: 'Trên 50tr' }, { v: '100000000', l: 'Trên 100tr' }, { v: '500000000', l: 'Trên 500tr' }], 'GMV 30 ngày') +
          sel1('d', 'rate', d.rate, [{ v: '40', l: 'Từ 40%' }, { v: '60', l: 'Từ 60%' }, { v: '75', l: 'Từ 75%' }], 'Tỉ lệ đăng') +
          sel1('d', 'type', d.type, [{ v: 'Video', l: 'Video' }, { v: 'LIVE', l: 'LIVE' }], 'Nội dung') +
          sel1('d', 'country', d.country, ['Việt Nam', 'Thái Lan', 'Malaysia'].map(function (x) { return { v: x, l: x }; }), 'Quốc gia') +
          sel1('d', 'tag', d.tag, db.tags.map(function (t) { return { v: t.name, l: t.name }; }), 'Nhãn') +
          sel1('d', 'rel', d.rel, ['Mới', 'Đã mời', 'Đã chấp nhận', 'Đang hợp tác', 'Ngừng'].map(function (x) { return { v: x, l: x }; }), 'Quan hệ') +
          sel1('d', 'contact', d.contact, [{ v: 'Có liên hệ', l: 'Có liên hệ' }, { v: 'Chưa có liên hệ', l: 'Chưa có liên hệ' }], 'Liên hệ') +
        '</div></div>';
    }

    /* nguồn TikTok Marketplace */
    var f = w.f, tabs = ['Nhà sáng tạo', 'Người theo dõi', 'Hiệu suất'], fields;
    if (w.ftab === 1) {
      fields = selN('ageGroups', f.ageGroups, TT.F.ageGroups.opts, 'Độ tuổi') +
        sel1('f', 'gender', f.gender, TT.F.gender.opts, 'Giới tính') +
        (f.gender ? range('genderPctRange', { min: Math.round(f.genderPct / 100), max: '' }, 'Tỉ lệ tối thiểu', '%') : '') +
        range('followers', f.followers, 'Tổng follower', 'người');
    } else if (w.ftab === 2) {
      fields = selN('gmv', f.gmv, TT.F.gmv.opts, 'GMV') +
        selN('unitsSold', f.unitsSold, TT.F.unitsSold.opts, 'Số món bán') +
        sel1('f', 'fulfillment', f.fulfillment, TT.F.fulfillment.opts, 'Tần suất đăng bài') +
        range('videoViews', f.videoViews, 'Lượt xem TB video', 'lượt') +
        range('liveViewers', f.liveViewers, 'Người xem TB LIVE', 'người') +
        range('engagement', f.engagement, 'Tỷ lệ tương tác', '%') +
        selN('brands', f.brands, TT.BRANDS, 'Thương hiệu');
    } else {
      fields = '<button class="gm-input gm-select gm-input-sm' + (f.cats.length ? ' is-set' : '') +
          '" data-do="wz:cats"><span class="val">' +
          (f.cats.length ? 'Hạng mục: ' + f.cats.length : 'Hạng mục sản phẩm') + '</span>' + ic('down') + '</button>' +
        sel1('f', 'avgCommission', f.avgCommission, TT.F.avgCommission.opts, 'Hoa hồng TB') +
        sel1('f', 'contentLabel', f.contentLabel, TT.F.contentLabel.opts, 'Loại nội dung') +
        sel1('f', 'agency', f.agency, TT.F.agency.opts, 'Agency') +
        selN('languages', f.languages, TT.F.languages.opts, 'Ngôn ngữ');
    }

    return '<div class="ig-wzfilter">' +
      '<div class="ig-wzfhead"><span class="gm-muted">Lọc theo</span>' +
        '<div class="gm-seg">' + tabs.map(function (t, i) {
          return '<button class="' + (w.ftab === i ? 'on' : '') + '" data-do="wz:ftab:' + i + '">' + t + '</button>';
        }).join('') + '</div>' +
        '<span class="spacer"></span>' +
        sel1('w', 'sort', w.sort, TT.SORT, 'Sắp xếp') +
        U.btn('Đặt lại', { sm: true, variant: 'link', act: 'wz:resetFilter' }) +
      '</div>' + (w.ftab === 0 ? quickChips(w) : '') +
      '<div class="ig-wzfrow">' + fields + '</div></div>';
  }

  function uniqueCats() {
    var seen = {}, out = [];
    S.data.creators.forEach(function (c) { if (!seen[c.cat]) { seen[c.cat] = 1; out.push(c.cat); } });
    return out.sort().slice(0, 40);
  }

  /* --------------------------------------------------------- kế hoạch chia lô */
  function plan(w, shopId) {
    var n = count(w);
    var per = Math.max(1, Math.min(PER, parseInt(w.perCampaign, 10) || PER));
    var q = S.quota(shopId);
    return {
      picked: n, per: per,
      campaigns: Math.ceil(n / per) || 0,
      left: q.left, cap: q.cap, hard: q.hard, used: q.used,
      over: Math.max(0, n - q.left),
      maxCampaigns: Math.floor(q.cap / per)
    };
  }

  function planBar(w, shopId) {
    var p = plan(w, shopId);
    return '<div class="ig-plan' + (p.over ? ' is-over' : '') + '">' +
      '<span class="ic">' + ic('layers') + '</span>' +
      '<span class="m"><b class="gm-num">' + S.num(p.picked) + '</b> Creator đã chọn</span>' +
      '<span class="ar">' + ic('right') + '</span>' +
      '<span class="m"><b class="gm-num">' + S.num(p.campaigns) + '</b> chiến dịch</span>' +
      '<span class="sub">mỗi chiến dịch ' + p.per + ' người — giới hạn của TikTok</span>' +
      '<span class="spacer"></span>' +
      (p.over
        ? '<span class="warn">' + ic('alert') + 'Vượt ' + S.num(p.over) + ' so với hạn mức còn lại hôm nay</span>'
        : '<span class="ok">Còn gửi được <b class="gm-num">' + S.num(p.left) + '</b> lời mời hôm nay</span>') +
      '</div>';
  }

  /* --------------------------------------------------------- bước chọn Creator */
  function stepCreators(w, shopId) {
    var q = S.quota(shopId);
    var list = pool(w, shopId);
    var n = count(w);
    var pages = Math.max(1, Math.ceil(list.length / PAGE));
    if (w.page > pages) w.page = pages;
    var shown = list.slice((w.page - 1) * PAGE, w.page * PAGE);

    var SRC = [
      ['tiktok', 'sky', 'store', 'TikTok Marketplace', 'Lấy trực tiếp qua API affiliate'],
      ['db', 'sage', 'database', 'Database GOPUSH', 'Kho Creator đã đồng bộ và sao lưu'],
      ['manual', 'lilac', 'file', 'Creator chỉ định', 'Dán username hoặc tải file Excel']
    ];
    var sources = '<div class="ig-srccards">' + SRC.map(function (x) {
      var on = w.source === x[0];
      return '<label class="ig-srccard tone-' + x[1] + (on ? ' on' : '') + '" data-do="wz:source:' + x[0] + '">' +
        '<span class="ic">' + ic(x[2]) + '</span>' +
        '<span class="tx"><b>' + U.esc(x[3]) + '</b><span>' + U.esc(x[4]) + '</span></span>' +
        '<span class="gm-radio' + (on ? ' on' : '') + '"></span></label>';
    }).join('') + '</div>';

    var table = list.length
      ? U.table({
          check: true, sel: w.sel,
          cols: [
            { k: 'name', t: 'Creator', r: function (c) {
              return U.creatorCell(c, c.risingStar ? 'Ngôi sao sáng tạo' : ''); } },
            { k: 'cat', t: 'Hạng mục', r: function (c) {
              return '<div><div>' + U.esc(c.cat) + '</div><div class="gm-help">' + U.esc(TT.catL1Name(c.cat2)) + '</div></div>'; } },
            { k: 'followers', t: 'Follower', cls: 'num', r: function (c) { return S.money(c.followers); } },
            { k: 'gmv30', t: 'GMV 30 ngày', cls: 'num', r: function (c) { return S.money(c.gmv30); } },
            { k: 'unitsSold', t: 'Đã bán', cls: 'num', r: function (c) { return S.num(c.unitsSold); } },
            { k: '', t: 'Hoa hồng TB', cls: 'num', r: function (c) { return c.avgCommission + '%'; } },
            { k: '', t: 'Tương tác', cls: 'num', r: function (c) { return S.pct(c.engagement); } },
            { k: '', t: 'Quan hệ', r: function (c) { return U.tag(S.rel(c, shopId).state); } }
          ],
          rows: shown
        }) + U.pager({ page: w.page, size: PAGE, total: list.length })
      : U.empty(
          w.source === 'manual' ? 'Chưa khớp Creator nào' : 'Không có Creator khớp điều kiện',
          w.source === 'manual' ? 'Kiểm tra lại username đã dán, hoặc đổi sang nguồn khác.'
            : 'Bỏ bớt điều kiện lọc để mở rộng kết quả.',
          U.btn('Đặt lại bộ lọc', { sm: true, act: 'wz:resetFilter' }));

    var canPick = Math.min(list.length, q.left);

    return '<div class="ig-wzsection">' +
      row('Nguồn Creator', 'Chọn nơi lấy danh sách để mời hàng loạt lần này.', sources, true) +
      '<div class="ig-wzpick">' +
        filterBox(w) +
        (w.source !== 'manual' ? '<div class="ig-wzsearch">' +
          '<label class="gm-input gm-input-sm ig-fsearch">' + ic('search') +
          '<input type="search" data-wz="q" placeholder="Tìm theo tên hoặc @username" value="' + U.attr(w.q) + '"></label>' +
          '<span class="gm-help"><b class="gm-num">' + S.num(list.length) + '</b> Creator khớp điều kiện</span>' +
          '<span class="spacer"></span>' +
          U.btn('Chọn ' + S.num(canPick) + ' Creator đầu bảng', { sm: true, icon: 'check', act: 'wz:selectTop' }) +
          U.btn('Bỏ chọn tất cả', { sm: true, variant: 'ghost', act: 'wz:selectNone' }) +
          '</div>' : '') +
        planBar(w, shopId) +
        table +
      '</div></div>';
  }

  /* --------------------------------------------------------- bước xem lại (tin nhắn) */
  function stepReview(w, shopId) {
    var prods = S.data.products[shopId] || [];
    var names = w.cards.map(function (id) {
      var p = null; prods.forEach(function (q) { if (q.id === id) p = q; });
      return p ? p.name : '';
    }).filter(Boolean);
    var sh = S.shop(shopId), p = plan(w, shopId);
    return '<div class="ig-wzsection">' +
      row('Xem lại trước khi tạo', 'Kiểm tra lần cuối rồi bấm Tạo chiến dịch ở cuối trang.',
        U.card({ body: U.kv([
          ['Tên đợt', w.name || '—'],
          ['Phương thức', 'API chính thức của TikTok Shop'],
          ['Chế độ tin nhắn', w.msgMode === 'card' ? 'Chế độ thẻ' : 'Chế độ bình thường'],
          ['Nội dung', w.contentMode === 'card' ? 'Thẻ sản phẩm' : 'Hình ảnh'],
          ['Tiêu đề', w.title || '—'],
          ['Thẻ sản phẩm', names.join(', ') || '—'],
          ['Số Creator', S.num(p.picked) + ' người → ' + S.num(p.campaigns) + ' đợt'],
          ['Giãn cách / cỡ nhóm', w.gap + ' · ' + w.perGroup + ' người mỗi nhóm'],
          ['Hạn mức còn lại hôm nay', S.num(p.left) + ' lượt']
        ]) })) +
      row('Nội dung Creator sẽ nhận', 'Xem trước đúng như tin nhắn gửi đi.',
        '<div class="ig-preview"><div class="ig-preview-head">' + U.esc(sh.name) + '</div>' +
          '<div class="ig-preview-body"><b>' + U.esc(w.title || 'Tiêu đề tin nhắn') + '</b>' +
          '<p>' + U.esc(w.body || 'Nội dung tin nhắn…') + '</p>' +
          (w.contentMode === 'card' && names.length
            ? '<div class="ig-preview-card">' + ic('box') + '<span>' + U.esc(names[0]) + '</span></div>' : '') +
          '</div></div>');
  }

  /* --------------------------------------------------------- khung toàn trang */
  function render(c) {
    var w = c.v.wz, shopId = c.shop.id;
    var names = steps(w), bad = problems(w), last = names.length - 1;

    var bar = '<div class="ig-wzbar"><div class="ig-wzsteps">' + names.map(function (s, i) {
      var cls = i === w.step ? ' on' : (i < w.step || i <= w.done ? ' done' : '');
      var can = i <= w.done || i < w.step;
      return '<button class="ig-wzstep' + cls + (can ? '' : ' is-off') + '"' +
        (can ? ' data-do="wz:goto:' + i + '"' : '') + '>' +
        '<span class="n">' + (i < w.step ? ic('check') : i + 1) + '</span><span class="t">' + U.esc(s) + '</span></button>' +
        (i < last ? '<span class="ig-wzline' + (i < w.step ? ' done' : '') + '"></span>' : '');
    }).join('') + '</div></div>';

    var body;
    if (w.kind === 'invite') {
      body = w.step === 0 ? stepInvite1(w)
        : w.step === 1 ? stepInvite2(w, shopId)
        : w.step === 2 ? stepInvite3(w, shopId)
        : stepCreators(w, shopId);
    } else {
      body = w.step === 0 ? stepMsg1(w, shopId)
        : w.step === 1 ? stepCreators(w, shopId)
        : stepReview(w, shopId);
    }

    var p = plan(w, shopId);
    var onCreatorStep = w.step === creatorStep(w);
    var sum = onCreatorStep || (w.kind === 'message' && w.step === 2)
      ? '<span class="sum"><b class="gm-num">' + S.num(p.picked) + '</b> Creator → <b class="gm-num">' +
        S.num(p.campaigns) + '</b> chiến dịch</span>'
      : (bad.length ? '<span class="sum warn">' + ic('alert') + U.esc(bad[0]) + '</span>' : '');

    var foot = '<div class="ig-wzfoot">' +
      (w.step > 0 ? U.btn('Quay lại', { icon: 'back', act: 'wz:back' }) : U.btn('Hủy', { act: 'wz:cancel' })) +
      U.btn('Lưu nháp', { icon: 'bookmark', act: 'wz:draft' }) +
      '<span class="spacer"></span>' + sum +
      (w.step < last
        ? U.btn('Tiếp tục', { variant: 'primary', icon: 'right', act: 'wz:next', cls: bad.length ? 'is-blocked' : '' })
        : U.btn(w.kind === 'invite'
            ? 'Tạo ' + (p.campaigns > 1 ? S.num(p.campaigns) + ' chiến dịch' : 'và gửi lời mời')
            : 'Tạo ' + (p.campaigns > 1 ? S.num(p.campaigns) + ' đợt gửi' : 'chiến dịch'),
            { variant: 'primary', icon: 'send', act: 'wz:create', cls: bad.length ? 'is-blocked' : '' })) +
      '</div>';

    return U.pageHead({
      title: w.kind === 'invite' ? 'Tạo lời mời hợp tác' : 'Tạo đợt nhắn tin',
      desc: 'Bước ' + (w.step + 1) + ' / ' + names.length + ' — ' + names[w.step],
      actions: U.btn('Thoát', { icon: 'x', act: 'wz:cancel' })
    }) + bar + '<div class="ig-wzbody">' + body + '</div>' + foot;
  }

  /* --------------------------------------------------------- tạo chiến dịch theo lô */
  function create(c, status) {
    var w = c.v.wz, shopId = c.shop.id, db = S.data;
    var ids = Object.keys(w.sel).filter(function (k) { return w.sel[k]; });
    var per = Math.max(1, Math.min(PER, parseInt(w.perCampaign, 10) || PER));
    var q = S.quota(shopId);
    if (status === 'Đang chạy' && ids.length > q.left) ids = ids.slice(0, q.left);

    var groups = [];
    for (var i = 0; i < ids.length; i += per) groups.push(ids.slice(i, i + per));
    if (!groups.length) groups = [[]];

    var batchId = S.uid('lo');
    var baseName = (w.name || '').trim() || 'Chiến dịch không tên';
    var srcName = { tiktok: 'TikTok Marketplace', db: 'Database GOPUSH', manual: 'Creator chỉ định' }[w.source];
    var productNames = (w.kind === 'invite' ? w.products.map(function (x) { return x.id; }) : w.cards)
      .map(function (id) {
        var p = null; (db.products[shopId] || []).forEach(function (q2) { if (q2.id === id) p = q2; });
        return p ? p.name : '';
      }).filter(Boolean);

    var made = [];
    groups.forEach(function (chunk, idx) {
      var cp = {
        id: S.uid('cp'), shopId: shopId, kind: w.kind,
        name: groups.length > 1 ? baseName + ' – nhóm ' + (idx + 1) : baseName,
        batchId: batchId, batchName: baseName, batchIndex: idx + 1, batchTotal: groups.length,
        status: status, sent: status === 'Đang chạy' ? chunk.length : 0, total: chunk.length,
        accepted: 0, promoted: 0, by: db.settings.profile.name, at: S.fmtDateTime(new Date()),
        /* các trường theo hợp đồng lời mời của TikTok, dùng lại ở Điều chỉnh kế hoạch */
        ttId: '76' + String(Date.now()).slice(-8) + String(Math.floor(100000000 + Math.random() * 899999999)),
        prodCount: productNames.length, start: S.fmtDate(new Date()),
        end: w.expiry ? w.expiry.split('-').reverse().join('/') : S.fmtDate(new Date()),
        endDays: w.expiry ? Math.max(0, Math.round((new Date(w.expiry) - new Date()) / 86400000)) : 0,
        updated: S.fmtDateTime(new Date()),
        gap: w.gap, perRun: per, products: productNames,
        expiry: w.expiry, priority: w.priority, freeSample: w.freeSample, sampleMode: w.sampleMode,
        contacts: w.contacts, body: w.kind === 'invite' ? w.content : w.body, title: w.title,
        source: srcName, creatorIds: chunk, note: ''
      };
      db.campaigns.unshift(cp);
      made.push(cp);

      if (status === 'Đang chạy') {
        chunk.forEach(function (id) {
          var cr = S.creator(id); if (!cr) return;
          var r = S.rel(cr, shopId);
          r.saved = true;
          if (w.kind === 'invite' && r.state === 'Mới') { r.state = 'Đã mời'; r.invitedAt = S.fmtDate(new Date()); }
        });
      }
    });

    if (status === 'Đang chạy') {
      var sh = S.shop(shopId);
      sh.used = Math.min(q.cap, sh.used + ids.length);
    }

    S.log((w.kind === 'invite' ? 'Tạo lời mời hợp tác' : 'Tạo đợt nhắn tin') + ' “' + baseName + '” · ' +
      S.num(ids.length) + ' Creator từ ' + srcName + ' · chia ' + groups.length + ' chiến dịch', 'Chiến dịch', shopId);
    S.save();
    c.v.wz = null;
    return { batchId: batchId, name: baseName, campaigns: made.length, creators: ids.length, kind: w.kind };
  }

  /* --------------------------------------------------------- xử lý thao tác */
  function action(parts, el, c, refresh, toast) {
    var w = c.v.wz, shopId = c.shop.id, db = S.data;
    if (!w) return false;
    var verb = parts[0], arg = parts.slice(1).join(':');

    switch (verb) {
      case 'next':
        if (problems(w).length) { toast(problems(w)[0]); return true; }
        w.step++; w.done = Math.max(w.done, w.step); refresh(); return true;
      case 'back': w.step = Math.max(0, w.step - 1); refresh(); return true;
      case 'goto': w.step = Math.min(parseInt(arg, 10), w.done); refresh(); return true;
      case 'cancel': c.v.wz = null; refresh(); return true;

      case 'toggle': w[arg] = !w[arg]; refresh(); return true;
      case 'set': {
        var kv = arg.split(':'), val = kv.slice(1).join(':');
        w[kv[0]] = kv[0] === 'priority' ? parseInt(val, 10) : val;
        refresh(); return true;
      }
      case 'source': w.source = arg; w.page = 1; refresh(); return true;
      case 'ftab': w.ftab = parseInt(arg, 10); refresh(); return true;
      case 'resetFilter':
        w.f = emptyFilter();
        w.d = { cat: '', fol: '', gmv: '', rate: '', type: '', country: '', tag: '', rel: '', contact: '' };
        w.q = ''; w.page = 1; refresh(); return true;
      case 'cats': return { catModal: true };
      case 'quick': {
        var qp = arg.split(':'), key = qp[0], v2 = qp.slice(1).join(':');
        if (key.charAt(0) === '@') { var k2 = key.slice(1); w.f[k2] = !w.f[k2]; }
        else if (key.charAt(0) === '#') {
          var k3 = key.slice(1), num2 = parseInt(v2, 10), i2 = w.f[k3].indexOf(num2);
          if (i2 > -1) w.f[k3].splice(i2, 1); else w.f[k3].push(num2);
        } else {
          var k4 = key.slice(2);
          if (w.d[k4] === v2) w.d[k4] = ''; else w.d[k4] = v2;
        }
        w.page = 1; refresh(); return true;
      }

      case 'addContact': {
        var usedF = w.contacts.map(function (x) { return x.field; });
        var free = TT.CONTACT.filter(function (x) { return usedF.indexOf(x.v) < 0; })[0];
        if (!free) { toast('Đã thêm hết kênh liên hệ'); return true; }
        w.contacts.push({ field: free.v, cc: 'VN +84', value: '' });
        refresh(); return true;
      }
      case 'delContact': {
        var di = parseInt(arg, 10);
        if (di < FIXED_CONTACTS.length) { toast('Zalo, Email và Facebook là kênh bắt buộc'); return true; }
        w.contacts.splice(di, 1); refresh(); return true;
      }

      case 'insertName':
        if (w.kind === 'invite') w.content = (w.content || '') + '{tên Creator}';
        else w.body = (w.body || '') + '{tên Creator}';
        refresh(); return true;
      case 'useTemplate': return { tplModal: w.kind };
      case 'pickTemplate': {
        var tp = S.tpl(arg);
        if (!tp) return true;
        if (w.kind === 'invite') w.content = tp.body; else w.body = tp.body;
        tp.uses = (tp.uses || 0) + 1;
        S.save();
        return { tplPicked: tp.name };
      }
      case 'checkText': {
        var text = (w.content || '') + ' ' + (w.body || '');
        var banned = String(db.settings.ai.banned || '').split(',').map(function (x) { return x.trim().toLowerCase(); })
          .filter(Boolean);
        var hit = banned.filter(function (b) { return text.toLowerCase().indexOf(b) > -1; });
        toast(hit.length ? 'Nội dung có từ nhạy cảm: ' + hit.join(', ') : 'Nội dung hợp lệ, không có từ nhạy cảm');
        return true;
      }

      case 'addProduct': return { productModal: 'invite' };
      case 'delProduct': w.products = w.products.filter(function (x) { return x.id !== arg; }); refresh(); return true;
      case 'adsToggle': w.products.forEach(function (x) { if (x.id === arg) x.adsOn = !x.adsOn; }); refresh(); return true;
      case 'bulkCom': return { bulkCom: true };
      case 'addCard':
        if (w.cards.length >= 5) { toast('Tối đa 5 thẻ sản phẩm'); return true; }
        return { productModal: 'card' };
      case 'delCard': w.cards = w.cards.filter(function (x) { return x !== arg; }); refresh(); return true;

      case 'selectTop': {
        var q3 = S.quota(shopId);
        var list = pool(w, shopId).slice(0, q3.left);
        w.sel = {};
        list.forEach(function (x) { w.sel[x.id] = true; });
        toast('Đã chọn ' + S.num(list.length) + ' Creator → ' + Math.ceil(list.length / PER) + ' chiến dịch');
        refresh(); return true;
      }
      case 'selectNone': w.sel = {}; refresh(); return true;

      case 'draft': return { create: 'Nháp' };
      case 'create':
        if (problems(w).length) { toast(problems(w)[0]); return true; }
        return { create: 'Đang chạy' };
    }
    return false;
  }

  /* chọn dòng trong bảng Creator */
  function toggleSel(c, id) {
    var w = c.v.wz, q = S.quota(c.shop.id);
    if (w.sel[id]) { w.sel[id] = false; return true; }
    if (count(w) >= q.left) return false;
    w.sel[id] = true;
    return true;
  }
  function toggleAll(c, ids) {
    var w = c.v.wz, q = S.quota(c.shop.id);
    var allOn = ids.length && ids.every(function (i) { return w.sel[i]; });
    if (allOn) { ids.forEach(function (i) { w.sel[i] = false; }); return true; }
    var room = q.left - count(w), added = 0, skipped = false;
    ids.forEach(function (i) {
      if (w.sel[i]) return;
      if (added < room) { w.sel[i] = true; added++; } else skipped = true;
    });
    return !skipped;
  }

  global.WIZ = {
    start: start, render: render, action: action, create: create, plan: plan,
    count: count, toggleSel: toggleSel, toggleAll: toggleAll, pool: pool,
    emptyFilter: emptyFilter, PER: PER
  };
})(window);
