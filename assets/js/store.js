/* GOPUSH — tầng dữ liệu và trạng thái.
   Dữ liệu sinh sẵn khi mở lần đầu, sau đó mọi thay đổi được lưu lại trong máy
   nên thao tác thử vẫn còn sau khi tải lại trang. Chỗ nào cần API thật của
   TikTok Shop (ủy quyền, đồng bộ, gửi lời mời) thì đánh dấu bằng cờ `pending`. */
(function (global) {
  'use strict';

  /* thị trường (site) đang chọn: mỗi thị trường một kho dữ liệu riêng */
  var MK = global.MARKETS;
  var M = MK.get((function () { try { return localStorage.getItem('gopush.market'); } catch (e) { return null; } })() || 'VN');
  /* kho theo thị trường và theo tài khoản: mỗi người dùng một bộ dữ liệu riêng */
  var UID = '';
  function keyOf() { return 'gopush.db.v8.' + M.code + (UID ? '.' + UID : ''); }
  var KEY = keyOf();
  /* gọi sau khi sinh dữ liệu mới, để cắt theo gói của tài khoản (plans.js gắn vào) */
  var SEED_HOOK = null;
  var LANG = (function () { try { return localStorage.getItem('gopush.lang') || 'vi'; } catch (e) { return 'vi'; } })();

  /* ---------------------------------------------------------- tiện ích */
  var seedNum = 20260924;
  function rnd() { seedNum = (seedNum * 1103515245 + 12345) & 0x7fffffff; return seedNum / 0x7fffffff; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function intBetween(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 9); }

  /* mọi mốc thời gian trong dữ liệu mẫu tính lùi từ ngày giờ thật, để bản demo luôn "mới" */
  function today() { return new Date(); }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  /* ngày giờ theo thói quen từng thị trường: Hoa Kỳ tháng/ngày và giờ 12h, Nhật năm/tháng/ngày, còn lại ngày/tháng/năm */
  function dfmt() { return M.code === 'US' ? 'mdy' : M.code === 'JP' ? 'ymd' : 'dmy'; }
  function fmtDate(d) {
    var dd = pad(d.getDate()), mm = pad(d.getMonth() + 1), y = d.getFullYear(), f = dfmt();
    return f === 'mdy' ? mm + '/' + dd + '/' + y : f === 'ymd' ? y + '/' + mm + '/' + dd : dd + '/' + mm + '/' + y;
  }
  function fmtDM(d) { return dfmt() === 'dmy' ? pad(d.getDate()) + '/' + pad(d.getMonth() + 1) : pad(d.getMonth() + 1) + '/' + pad(d.getDate()); }
  function fmtTime(d) {
    if (M.code !== 'US') return pad(d.getHours()) + ':' + pad(d.getMinutes());
    var h = d.getHours() % 12 || 12; return h + ':' + pad(d.getMinutes()) + (d.getHours() < 12 ? ' AM' : ' PM');
  }
  function fmtDateTime(d) { return fmtDM(d) + ' ' + fmtTime(d); }
  /* múi giờ của thị trường, lấy từ nhãn "(UTC+7) …" */
  function tzLabel() { var m = /\(UTC[^)]*\)/.exec(M.tz || ''); return m ? m[0] : '(UTC+7)'; }
  function daysAgo(n) { var d = today(); d.setDate(d.getDate() - n); return d; }
  function now() { return new Date().toISOString(); }
  /* dd/mm/yyyy của n ngày trước (n âm = n ngày sau) */
  function dateAgo(n) { return fmtDate(daysAgo(n)); }
  /* dd/mm hh:mm của n ngày trước, giờ cố định */
  function at(n, h, m) { var d = daysAgo(n); d.setHours(h, m || 0, 0, 0); return fmtDateTime(d); }
  /* mốc cách đây `mins` phút: "Hôm nay 09:05", "Hôm qua 22:40" hoặc "dd/mm hh:mm" */
  function relTime(mins) {
    var d = today(); d.setMinutes(d.getMinutes() - mins);
    var t = today(); t.setHours(0, 0, 0, 0);
    var hm = fmtTime(d);
    if (d >= t) return 'Hôm nay ' + hm;
    t.setDate(t.getDate() - 1);
    return d >= t ? 'Hôm qua ' + hm : fmtDateTime(d);
  }
  /* "tháng 9/2026" của tháng hiện tại + off */
  function month(off, noYear) { var d = today(); d.setDate(1); d.setMonth(d.getMonth() + (off || 0)); return 'tháng ' + (d.getMonth() + 1) + (noYear ? '' : '/' + d.getFullYear()); }

  /* dấu thập phân theo thị trường: VN, ID, BR dùng dấu phẩy; còn lại dấu chấm */
  function decSep() { return (1.5).toLocaleString(M.loc).charAt(1); }
  /* bỏ số 0 thừa sau dấu thập phân, không đụng vào phần nguyên */
  function dec(v, d) {
    var t = v.toFixed(d);
    if (t.indexOf('.') > -1) t = t.replace(/0+$/, '').replace(/\.$/, '');
    return t.replace('.', decSep());
  }

  /* tiền lưu theo đơn vị gốc (VND); quy đổi sang tiền tệ thị trường khi hiển thị */
  function fx(n) { return (Number(n) || 0) / M.rate; }
  function toBase(n) { return (Number(n) || 0) * M.rate; }

  /* rút gọn tiền đã quy đổi. Tiếng Việt: K · tr · tỷ; ngôn ngữ khác: K · M · B. Ví dụ 1.700.000 → "1,7tr" */
  function money(n) { return short(fx(n)); }
  /* đơn vị rút gọn theo cách người dùng từng thị trường quen đọc trên TikTok Shop:
     VN 1,7tr · 2,1 tỷ   ID 1,7 jt · 12 rb   BR 1,7 mi · 12 mil   JP 17万 · 1.2億   còn lại 1.7M · 12K */
  var SHORT = {
    VN: [[1e9, ' tỷ'], [1e6, 'tr'], [1e3, 'K']],
    ID: [[1e9, ' M'], [1e6, ' jt'], [1e3, ' rb']],
    BR: [[1e9, ' bi'], [1e6, ' mi'], [1e3, ' mil']],
    JP: [[1e8, '億'], [1e4, '万']],
    _: [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']]
  };
  /* rút gọn số không quy đổi tiền: follower, lượt xem, lượt thích */
  function short(n) {
    n = Number(n) || 0;
    var neg = n < 0 ? '-' : '', u = SHORT[M.code] || SHORT._; n = Math.abs(n);
    for (var i = 0; i < u.length; i++) {
      if (n >= u[i][0]) { var v = n / u[i][0]; return neg + dec(v, v >= 100 ? 0 : (v >= 10 || i ? 1 : 2)) + u[i][1]; }
    }
    return neg + (n < 100 && n % 1 ? dec(n, 2) : num(Math.round(n)));
  }

  /* số tiền đầy đủ kèm ký hiệu tiền tệ: 1.234.568 ₫ · $49.38 */
  function vnd(n) {
    var v = fx(n), t = v < 1000 && M.rate >= 1000 ? Number(v).toLocaleString(M.loc, { maximumFractionDigits: 2 }) : num(Math.round(v));
    return M.code === 'VN' ? t + ' ' + M.cur : M.cur + (M.cur.length > 1 ? ' ' : '') + t;
  }
  function num(n) { return Number(n || 0).toLocaleString(M.loc); }
  function pct(n) { return (Math.round(n * 10) / 10).toString().replace('.', decSep()) + '%'; }
  function cur() { return M.cur; }
  /* tiền rút gọn kèm ký hiệu đúng vị trí theo thị trường: 1,7tr ₫ · $6K · R$ 42,61 */
  function amt(n) { return M.code === 'VN' ? money(n) + ' ' + M.cur : M.cur + (M.cur.length > 1 ? ' ' : '') + money(n); }
  /* đơn vị trục biểu đồ tiền: nghìn hay triệu tùy độ lớn của tiền tệ */
  function unit() {
    if (M.code === 'JP') return { div: 1e4 * M.rate, label: '万' };
    var big = M.rate >= 300, L = { VN: ['nghìn', 'triệu'], ID: ['rb', 'jt'], BR: ['mil', 'mi'] }[M.code] || ['K', 'M'];
    return { div: (big ? 1e3 : 1e6) * M.rate, label: big ? L[0] : L[1] };
  }

  /* ---------------------------------------------------------- nguồn sinh dữ liệu */
  var HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
  var DEM = ['Thị', 'Văn', 'Minh', 'Ngọc', 'Thanh', 'Quang', 'Hoài', 'Bảo', 'Gia', 'Khánh'];
  var TEN = ['An', 'Anh', 'Bình', 'Chi', 'Dung', 'Duy', 'Giang', 'Hà', 'Hải', 'Hân', 'Hiếu', 'Huy', 'Khoa', 'Lam', 'Linh', 'Long',
    'Mai', 'My', 'Nam', 'Nga', 'Ngân', 'Nhi', 'Phúc', 'Quân', 'Quyên', 'Sơn', 'Tâm', 'Thảo', 'Thu', 'Tiên', 'Trang', 'Trúc', 'Tuấn', 'Vy', 'Yến'];
  var SLUG = ['review', 'daily', 'official', 'shop', 'store', 'vlog', 'life', 'home', 'food', 'beauty', 'tech', 'style'];
  var REGIONS = ['TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'];
  var TT = global.TT;

  /* bậc nào của enum chứa giá trị này */
  function bandOf(group, value) {
    var out = TT.F[group].opts[0].v;
    TT.F[group].opts.forEach(function (o) {
      if (value >= (o.min || 0) && value < (o.max === undefined ? Infinity : o.max)) out = o.v;
    });
    return out;
  }

  function noAccent(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }

  /* ---------------------------------------------------------- sinh dữ liệu ban đầu */
  function seed() {
    seedNum = 20260924;
    var db = { v: 1, createdAt: now(), market: M.code };

    db.shops = [
      { id: 'vn-1300s', flag: '🇻🇳', name: "VN 1300'S Coffee", country: 'Việt Nam', cur: '₫', status: 'ok',
        expires: dateAgo(-85), sync: relTime(10), owner: 'user01',
        inviteLimit: 10000, soft: 4000, used: 0, gap: '45 – 90 giây' },
      { id: 'vn-lumi', flag: '🇻🇳', name: 'VN Lumi Skin', country: 'Việt Nam', cur: '₫', status: 'warn',
        expires: dateAgo(-8), sync: relTime(145), owner: 'Lê Quốc Huy',
        inviteLimit: 10000, soft: 2000, used: 0, gap: '60 – 120 giây' },
      { id: 'th-nara', flag: '🇻🇳', name: 'VN Nara Home', country: 'Việt Nam', cur: '₫', status: 'ok',
        expires: dateAgo(-161), sync: relTime(1490), owner: 'Ngô Thảo Vy',
        inviteLimit: 10000, soft: 3000, used: 0, gap: '45 – 90 giây' },
      { id: 'my-kaya', flag: '🇻🇳', name: 'VN Kaya Living', country: 'Việt Nam', cur: '₫', status: 'err',
        expires: 'Đã hết hạn', sync: dateAgo(3), owner: 'Chưa giao',
        inviteLimit: 0, soft: 0, used: 0, gap: '—' }
    ];

    var PRODUCTS = {
      'vn-1300s': [
        ['Cold Brew 250ml – lốc 4', 'CB250-4', 196000, 18], ['Cà phê phin giấy hộp 10', 'PG-10', 129000, 15],
        ['Bình giữ nhiệt 500ml', 'BG-500', 349000, 12], ['Set quà tặng Trung thu', 'GT-MID', 590000, 20],
        ['Cà phê hòa tan túi 20', 'HT-20', 89000, 10], ['Ly sứ vân đá', 'LS-STONE', 159000, 14],
        ['Cà phê rang xay Đậm Đà 500g', 'RX-500', 185000, 16], ['Cold Brew Vị Đào 250ml', 'CB-DAO', 52000, 18],
        ['Bộ phin nhôm pha tay', 'PHIN-AL', 119000, 13], ['Hộp quà cà phê Premium', 'GIFT-PRE', 750000, 22]
      ],
      'vn-lumi': [
        ['Serum B5 phục hồi 30ml', 'SR-B5', 320000, 22], ['Kem chống nắng SPF50', 'KCN-50', 285000, 20],
        ['Sữa rửa mặt dịu nhẹ', 'SRM-01', 175000, 18], ['Mặt nạ cấp ẩm hộp 10', 'MN-10', 210000, 25]
      ],
      'th-nara': [
        ['Bộ chăn ga cotton', 'CG-COT', 1290000, 12], ['Đèn ngủ gỗ tự nhiên', 'DN-GO', 450000, 15],
        ['Nồi gang 24cm', 'NG-24', 980000, 10], ['Thảm trải sàn 1m6', 'TT-16', 620000, 14]
      ],
      'my-kaya': []
    };
    db.products = {};
    db.shops.forEach(function (s) {
      db.products[s.id] = PRODUCTS[s.id].map(function (p) {
        return { id: uid('p'), name: p[0], sku: p[1], price: p[2], com: p[3], active: true };
      });
    });

    /* nhãn dùng chung */
    db.tags = [
      { id: 't1', name: 'Ưu tiên', desc: 'Creator hiệu suất cao, chăm sóc riêng', by: 'user01' },
      { id: 't2', name: 'F&B', desc: 'Chuyên ngành đồ ăn, đồ uống', by: 'user01' },
      { id: 't3', name: 'Beauty', desc: 'Mỹ phẩm, chăm sóc da', by: 'Lê Quốc Huy' },
      { id: 't4', name: 'Thử nghiệm', desc: 'Đang thử trong một chiến dịch', by: 'Ngô Thảo Vy' },
      { id: 't5', name: 'Live chuyên sâu', desc: 'Chủ yếu bán qua live', by: 'user01' }
    ];

    /* Creator */
    db.creators = [];
    var used = {};
    var L2 = [];
    TT.CATEGORIES.forEach(function (l1) { l1[2].forEach(function (l2) { L2.push(l2[0]); }); });

    for (var i = 0; i < 1200; i++) {
      var name = pick(HO) + ' ' + pick(DEM) + ' ' + pick(TEN);
      var base = noAccent(name.split(' ').slice(-2).join('')).toLowerCase().replace(/\s/g, '');
      var u = base + '.' + pick(SLUG);
      while (used[u]) u = base + intBetween(1, 999) + '.' + pick(SLUG);
      used[u] = 1;

      /* khoảng 4% Creator trên 1 triệu follower (nhóm Mega), còn lại 8K–640K */
      var fol = rnd() > 0.96 ? intBetween(1000, 3200) * 1000 : intBetween(8, 640) * 1000;
      var rate = intBetween(18, 82);
      var avgViews = intBetween(3, 90) * 1000;
      /* GMV 30 ngày ước theo lượng xem và tỉ lệ đăng, không theo follower thô */
      var gmv = Math.round(avgViews * 20 * (rate / 100) * intBetween(40, 300));
      /* số món bán khớp GMV: chia cho giá trung bình mỗi món 90K–260K */
      var unitsSold = Math.max(4, Math.round(gmv / intBetween(90000, 260000)));
      var content = rnd() > 0.34 ? 1 : 2;              /* content_label */
      var engagement = intBetween(15, 120) / 10;        /* % */
      var cat2 = pick(L2);

      var c = {
        id: 'c' + (i + 1),
        /* --- định danh --- */
        oecId: '74' + intBetween(10000000000, 99999999999),   /* creator_oecuid.value */
        name: name,
        user: u,
        tiktok: 'https://www.tiktok.com/@' + u,
        /* --- trường khớp bộ lọc TikTok --- */
        catL1: TT.catL1(cat2),
        cat2: cat2,
        cat: TT.catName(cat2),
        avgCommission: intBetween(3, 24),                     /* % — avg_commission_group */
        contentLabel: content,                                /* 1 video · 2 live */
        agency: rnd() > 0.62 ? 1 : 2,                         /* managed_by_agency */
        langs: rnd() > 0.82 ? ['0', '1'] : ['0'],             /* languages */
        risingStar: rnd() > 0.84,                             /* is_rising_star */
        ageGroups: (function () {
          var all = [1, 2, 4, 5, 6], out = [pick(all)];
          if (rnd() > 0.45) { var b = pick(all); if (out.indexOf(b) < 0) out.push(b); }
          return out;
        })(),                                                 /* follower_age_groups */
        gender: rnd() > 0.42 ? 3 : 2,                         /* gender_filter.gender */
        genderPct: intBetween(4200, 8600),                    /* %×100 */
        followers: fol,                                       /* follower_filter */
        gmv30: gmv,                                           /* gmv_group_v2 */
        unitsSold: unitsSold,                                 /* units_sold_group */
        avgViews: avgViews,                                   /* video_avg_views */
        liveViewers: content === 2 ? intBetween(200, 5200) : intBetween(0, 900),
        engagement: engagement,                               /* video_avg_engagement */
        fulfillment: rnd() > 0.72 ? 4 : (rnd() > 0.4 ? 3 : 2),/* sample_fulfillment_rate */
        brands: (function () {
          var out = [], k = intBetween(0, 3);
          for (var j = 0; j < k; j++) { var b = pick(TT.BRANDS).v; if (out.indexOf(b) < 0) out.push(b); }
          return out;
        })(),                                                 /* brand_ids */
        /* --- trường riêng của GOPUSH --- */
        gpm: Math.round(gmv / Math.max(1, avgViews * 20 / 1000)),
        postRate: rate,
        country: 'Việt Nam',
        region: pick(REGIONS),
        promoting: intBetween(1, 24),
        contact: rnd() > 0.3,
        email: rnd() > 0.3 ? u.replace(/\./g, '') + '@gmail.com' : '',
        phone: rnd() > 0.55 ? '09' + intBetween(10000000, 99999999) : '',
        rel: {}
      };
      c.gmvBand = bandOf('gmv', c.gmv30);
      c.unitsBand = bandOf('unitsSold', c.unitsSold);

      db.shops.forEach(function (sh) {
        var st = 'Mới';
        var r = rnd();
        if (sh.id === 'vn-1300s') st = r > 0.94 ? 'Đang hợp tác' : r > 0.88 ? 'Đã chấp nhận' : r > 0.78 ? 'Đã mời' : r > 0.76 ? 'Ngừng' : 'Mới';
        else if (sh.id !== 'my-kaya') st = r > 0.96 ? 'Đang hợp tác' : r > 0.92 ? 'Đã mời' : 'Mới';
        c.rel[sh.id] = {
          state: st,
          saved: st !== 'Mới' || rnd() > 0.88,
          tags: st === 'Đang hợp tác' && rnd() > 0.4 ? ['t1'] : (rnd() > 0.92 ? [pick(db.tags).id] : []),
          owner: pick(['user01', 'Lê Quốc Huy', 'Ngô Thảo Vy']),
          note: '',
          invitedAt: st === 'Mới' ? null : fmtDate(daysAgo(intBetween(1, 120)))
        };
      });
      db.creators.push(c);
    }

    /* blacklist */
    db.blacklist = [
      { id: uid('b'), shopId: 'vn-1300s', creatorId: db.creators[70].id, reason: 'Nội dung sai sự thật về sản phẩm', by: 'user01', at: dateAgo(6) },
      { id: uid('b'), shopId: 'vn-1300s', creatorId: db.creators[71].id, reason: 'Spam tin nhắn, không hợp tác', by: 'Lê Quốc Huy', at: dateAgo(13) },
      { id: uid('b'), shopId: 'vn-lumi', creatorId: db.creators[72].id, reason: 'Bán lại hàng mẫu', by: 'user01', at: dateAgo(22) }
    ];

    /* mẫu */
    db.templates = [
      { id: 'ti1', kind: 'invite', name: 'F&B – hoa hồng 18%', scope: 'Cold Brew 250ml, Phin giấy', com: 18, free: true, uses: 412,
        body: 'Chào {tên Creator}, {tên shop} mời bạn hợp tác dòng Cold Brew 250ml với hoa hồng 18% và hàng mẫu miễn phí.' },
      { id: 'ti2', kind: 'invite', name: 'Gia dụng – hoa hồng 12%', scope: 'Bình giữ nhiệt, Ly sứ', com: 12, free: true, uses: 208,
        body: 'Chào {tên Creator}, bên mình có dòng gia dụng hoa hồng 12%, gửi mẫu miễn phí nếu bạn quan tâm.' },
      { id: 'ti3', kind: 'invite', name: 'Ra mắt sản phẩm mới', scope: 'Theo chiến dịch', com: 20, free: true, uses: 96,
        body: 'Chào {tên Creator}, shop sắp ra mắt sản phẩm mới, hoa hồng 20% cho 30 ngày đầu.' },
      { id: 'ti4', kind: 'invite', name: 'Mời lại Creator cũ', scope: 'Tất cả SP đang bán', com: 15, free: false, uses: 54,
        body: 'Chào {tên Creator}, đã lâu chưa hợp tác, bên mình có chính sách mới hoa hồng 15%.' },
      { id: 'tm1', kind: 'message', name: 'Chào mừng Creator mới', vars: '{tên Creator}, {tên shop}', mtype: 'Văn bản', uses: 620,
        body: 'Chào {tên Creator}, cảm ơn bạn đã nhận lời hợp tác với {tên shop}. Cần hỗ trợ gì bạn nhắn mình nhé.' },
      { id: 'tm2', kind: 'message', name: 'Nhắc lên video sau khi nhận mẫu', vars: '{tên Creator}, {số ngày}', mtype: 'Văn bản', uses: 344,
        body: 'Chào {tên Creator}, mẫu đã giao {số ngày} ngày rồi. Bạn sắp xếp lên video giúp shop nhé!' },
      { id: 'tm3', kind: 'message', name: 'Gửi thẻ sản phẩm', vars: '{tên SP}, {hoa hồng}', mtype: 'Thẻ SP', uses: 210,
        body: 'Gửi bạn thẻ sản phẩm {tên SP}, hoa hồng {hoa hồng}.' },
      { id: 'tm4', kind: 'message', name: 'Cảm ơn Creator có đơn đầu tiên', vars: '{tên Creator}', mtype: 'Văn bản', uses: 88,
        body: 'Chúc mừng {tên Creator} có đơn đầu tiên! Shop sẽ ưu tiên gửi mẫu cho các sản phẩm mới.' }
    ];

    /* chiến dịch */
    /* ID lời mời của TikTok dài 19 chữ số nên luôn giữ dạng chuỗi */
    function ttId() { return '76' + String(intBetween(10000000, 99999999)) + String(intBetween(100000000, 999999999)); }
    function camp(shopId, kind, name, status, sent, total, acc, by, dAgo, tpl, endDays, prodCount) {
      var end = today(); end.setDate(end.getDate() + (endDays == null ? 30 : endDays));
      return { id: uid('cp'), ttId: ttId(), shopId: shopId, kind: kind, name: name, status: status,
        sent: sent, total: total, accepted: acc, promoted: Math.round(acc * 0.55),
        by: by, at: fmtDateTime(daysAgo(dAgo)), updated: fmtDateTime(daysAgo(Math.max(0, dAgo - 1))),
        start: fmtDate(daysAgo(dAgo)), end: fmtDate(end), endDays: endDays == null ? 30 : endDays,
        prodCount: prodCount == null ? intBetween(3, 12) : prodCount,
        templateId: tpl, gap: '60 giây', perRun: 50, products: [], note: '' };
    }
    db.campaigns = [
      camp('vn-1300s', 'invite', 'Mời Creator F&B ' + month(0, true), 'Đang chạy', 420, 600, 160, 'user01', 0, 'ti1', 21, 9),
      camp('vn-1300s', 'invite', 'Ra mắt Cold Brew 250ml', 'Đang chạy', 180, 180, 74, 'Lê Quốc Huy', 2, 'ti3', 2, 6),
      camp('vn-1300s', 'invite', 'Mời lại Creator chưa phản hồi', 'Tạm dừng', 96, 320, 12, 'user01', 4, 'ti4', 3, 4),
      camp('vn-1300s', 'invite', 'Chiến dịch Tết 2027', 'Nháp', 0, 0, 0, 'Ngô Thảo Vy', 5, 'ti3', 90, 0),
      camp('vn-1300s', 'invite', 'Mời Creator Gia dụng', 'Hoàn thành', 250, 250, 115, 'Lê Quốc Huy', 12, 'ti2', 45, 12),
      camp('vn-1300s', 'invite', 'Mời Creator Live chuyên sâu', 'Lỗi', 38, 200, 0, 'user01', 13, 'ti1', 1, 5),
      camp('vn-1300s', 'invite', 'Mời Creator Mẹ và Bé', 'Đang chạy', 50, 50, 21, 'Ngô Thảo Vy', 6, 'ti2', 12, 7),
      camp('vn-1300s', 'invite', 'Mời Creator Nhà cửa', 'Đang chạy', 50, 50, 8, 'user01', 9, 'ti1', 3, 3),
      camp('vn-lumi', 'invite', 'Mời Creator Beauty ' + month(0, true), 'Đang chạy', 140, 260, 58, 'Lê Quốc Huy', 1, 'ti3', 18, 8),
      camp('th-nara', 'invite', 'Mời Creator Gia dụng TH', 'Hoàn thành', 190, 190, 84, 'Ngô Thảo Vy', 8, 'ti2', 40, 10),
      camp('vn-1300s', 'message', 'Nhắc Creator đã nhận mẫu', 'Đang chạy', 128, 210, 0, 'user01', 0, 'tm2'),
      camp('vn-1300s', 'message', 'Gửi thẻ SP Cold Brew', 'Hoàn thành', 96, 96, 0, 'Lê Quốc Huy', 3, 'tm3'),
      camp('vn-1300s', 'message', 'Ảnh bộ ấn phẩm ' + month(1, true), 'Nháp', 0, 0, 0, 'Ngô Thảo Vy', 4, 'tm1'),
      camp('vn-1300s', 'message', 'Cảm ơn Creator có đơn đầu tiên', 'Tạm dừng', 44, 120, 0, 'user01', 6, 'tm4'),
      camp('vn-lumi', 'message', 'Nhắc lên video – Lumi', 'Đang chạy', 60, 130, 0, 'Lê Quốc Huy', 1, 'tm2')
    ];

    /* tác vụ điều chỉnh kế hoạch (xử lý hàng loạt trên lời mời đã có) */
    function inv(shopId, n) {
      return db.campaigns.filter(function (c) { return c.shopId === shopId && c.kind === 'invite'; })
        .slice(0, n).map(function (c) { return c.id; });
    }
    function task(o) {
      return { id: uid('tk'), code: 'TV-' + String(intBetween(100000, 999999)), shopId: o.shop, type: o.type,
        status: o.status, scope: o.scope || 'ONGOING', cfg: o.cfg || {}, summary: o.summary,
        invitationIds: o.ids, processed: o.processed == null ? o.ids.length : o.processed,
        stats: o.stats || {}, by: o.by, at: fmtDateTime(daysAgo(o.dAgo)),
        startedAt: o.status === 'Chờ chạy' ? '' : fmtDateTime(daysAgo(o.dAgo)) };
    }
    db.tasks = [
      task({ shop: 'vn-1300s', type: 'CLEAN_INVITATION', status: 'Hoàn thành', dAgo: 1, by: 'user01',
        cfg: { cleanMode: 1 }, summary: 'Chế độ 1 · gỡ Creator chưa thêm showcase',
        ids: inv('vn-1300s', 3), stats: { cancelledInvitationCount: 1, keptInvitationCount: 2, removedCreatorCount: 212, failedInvitationCount: 0 } }),
      task({ shop: 'vn-1300s', type: 'REFILL_CREATOR', status: 'Đang chạy', dAgo: 0, by: 'Lê Quốc Huy',
        cfg: { maxCreatorsPerInvitation: 50 }, summary: 'Bù tối đa 50 Creator mỗi lời mời',
        ids: inv('vn-1300s', 4), processed: 2, stats: { addedCreatorCount: 61, skippedInvitationCount: 0, failedInvitationCount: 0 } }),
      task({ shop: 'vn-1300s', type: 'UPDATE_INVITATION_PERIOD_NAME', status: 'Chờ chạy', dAgo: 0, by: 'user01',
        scope: 'EXPIRING', cfg: { validDays: 60, newName: 'GoxEco-T10' }, summary: 'Gia hạn 60 ngày · đổi tên GoxEco-T10',
        ids: inv('vn-1300s', 2), processed: 0, stats: {} }),
      task({ shop: 'vn-1300s', type: 'ADD_INVITATION_PRODUCT', status: 'Hoàn thành', dAgo: 3, by: 'Ngô Thảo Vy',
        cfg: { productCount: 6 }, summary: '6 sản phẩm · hoa hồng 18%',
        ids: inv('vn-1300s', 5), stats: { addedCount: 26, skippedCount: 4, failedCount: 0 } }),
      task({ shop: 'vn-1300s', type: 'CLEAN_INVITATION', status: 'Đã dừng', dAgo: 6, by: 'user01',
        cfg: { cleanMode: 3 }, summary: 'Chế độ 3 · gỡ Creator chưa quảng bá',
        ids: inv('vn-1300s', 2), processed: 1, stats: { cancelledInvitationCount: 0, keptInvitationCount: 1, removedCreatorCount: 34, failedInvitationCount: 0 } }),
      task({ shop: 'vn-lumi', type: 'REFILL_CREATOR', status: 'Lỗi', dAgo: 4, by: 'Lê Quốc Huy',
        cfg: { maxCreatorsPerInvitation: 50 }, summary: 'Bù tối đa 50 Creator mỗi lời mời',
        ids: inv('vn-lumi', 1), stats: { addedCreatorCount: 0, skippedInvitationCount: 0, failedInvitationCount: 1 } })
    ];

    /* yêu cầu mẫu miễn phí — mô hình theo Affiliate Seller API của TikTok.
       Trạng thái dùng đúng enum của API, nhãn tiếng Việt tra ở SAMPLE_STATUS. */
    var CARRIERS = [
      { code: 'GHN', name: 'Giao Hàng Nhanh' }, { code: 'SPX', name: 'SPX Express' },
      { code: 'VTP', name: 'Viettel Post' }, { code: 'JT', name: 'J&T Express' }
    ];
    var TRAIL = [
      { code: 'PICKED_UP', name: 'Đã lấy hàng', d: 'Bưu cục đã nhận hàng từ người gửi' },
      { code: 'IN_TRANSIT', name: 'Đang vận chuyển', d: 'Hàng đang trên đường tới bưu cục đích' },
      { code: 'ARRIVED', name: 'Đến bưu cục', d: 'Hàng đã đến bưu cục giao hàng' },
      { code: 'DELIVERING', name: 'Đang giao', d: 'Nhân viên đang giao hàng cho người nhận' },
      { code: 'SIGNED', name: 'Đã ký nhận', d: 'Người nhận đã ký nhận hàng' }
    ];
    var REJECTS = ['NOT_MATCH', 'OFFLINE', 'OUT_OF_STOCK', 'OTHER'];
    var CAPTIONS = [
      'Uống thử {sp} nè #review #viral',
      'Khui hộp {sp} — có đáng tiền không? #unboxing',
      'Pha tại nhà siêu nhanh với {sp} #mẹovặt',
      'Ngày làm việc của mình cùng {sp} #daily',
      'Top 3 lý do nên thử {sp} #gợiý'
    ];
    var RATING_NOTES = [
      'Nội dung đúng brief, quay rõ sản phẩm.',
      'Video lên đều, tương tác tốt.',
      'Có đơn về từ video, sẽ mời tiếp.',
      'Nội dung ổn nhưng đăng hơi trễ.'
    ];
    function ttNum(n) { var o = ''; for (var k = 0; k < n; k++) o += String(intBetween(k ? 0 : 1, 9)); return o; }

    db.samples = [];
    for (var j = 0; j < 96; j++) {
      var shop = rnd() > 0.26 ? 'vn-1300s' : (rnd() > 0.5 ? 'vn-lumi' : 'th-nara');
      var prods = db.products[shop];
      if (!prods.length) { shop = 'vn-1300s'; prods = db.products[shop]; }
      var pr = pick(prods);
      var cr = pick(db.creators);
      var w = rnd();
      var st = w > 0.62 ? 'PENDING' : w > 0.56 ? 'AWAITING_SHIPMENT' : w > 0.46 ? 'SHIPPED'
        : w > 0.34 ? 'CONTENT_PENDING' : w > 0.12 ? 'COMPLETED' : 'CANCELLED';
      var ago = intBetween(0, 28);
      var reqAt = daysAgo(ago);
      var sp = {
        id: ttNum(19), shopId: shop, status: st,
        creatorId: cr.id,
        creatorInfo: {
          creatorId: cr.user, creatorOpenId: '7' + ttNum(18), creatorOecId: cr.oecId,
          username: cr.user, nickname: cr.name, avatarUrl: '',
          followerCount: cr.followers,
          mainIndustry: [{ ids: [cr.cat2], name: cr.cat }, { ids: [cr.catL1], name: TT.catL1Name(cr.cat2) }]
        },
        productInfo: { id: ttNum(19), title: pr.name, skuId: ttNum(19), skuName: pr.sku, skuImageUrl: '' },
        sku: pr.sku, productKey: pr.id,
        commissionRate: pr.com,
        fulfillmentPercentage: String(cr.postRate),
        gmvCount: String(cr.gmv30), gmvCurrency: 'VND',
        ecVideoView: cr.avgViews, avgEcLiveUv: cr.liveViewers,
        sampleType: rnd() > 0.86 ? 'REFUNDABLE' : 'FREE',
        approvalMethod: rnd() > 0.72 ? 'AUTO' : 'MANUAL',
        rating: 0, ratingNote: '', contents: [],
        orderId: '', targetCollabrationId: rnd() > 0.45 ? ttNum(19) : '',
        isLibrary: false, isBlack: false,
        logisticsInfo: { trackingNo: null, carrierName: null, latestDescription: null,
          signedAt: null, fetchedAt: null, syncStatus: 'SUCCESS', trail: [] },
        requestAt: Math.floor(reqAt.getTime() / 1000), requestDays: ago,
        rejectReason: '', video: '', msgSentAt: null, note: ''
      };

      if (st === 'CANCELLED') sp.rejectReason = pick(REJECTS);
      if (['AWAITING_SHIPMENT', 'SHIPPED', 'CONTENT_PENDING', 'COMPLETED'].indexOf(st) > -1) {
        sp.orderId = ttNum(19);
      }
      /* vận đơn chỉ có từ lúc shop đã gửi hàng */
      if (['SHIPPED', 'CONTENT_PENDING', 'COMPLETED'].indexOf(st) > -1) {
        var car = pick(CARRIERS);
        var steps = st === 'SHIPPED' ? intBetween(2, 4) : 5;
        var trail = [];
        for (var k = 0; k < steps; k++) {
          var tAt = daysAgo(Math.max(0, ago - k - 1));
          trail.push({ trackingNo: null, carrier: car.name, description: TRAIL[k].d,
            actionCode: TRAIL[k].code, actionCodeName: TRAIL[k].name,
            updateTimeMillis: tAt.getTime() });
        }
        var last = trail[trail.length - 1];
        sp.logisticsInfo = {
          trackingNo: car.code + '24' + ttNum(9), carrierName: car.name,
          latestDescription: last.description,
          signedAt: steps === 5 ? Math.floor(last.updateTimeMillis / 1000) : null,
          fetchedAt: Math.floor(today().getTime() / 1000),
          syncStatus: rnd() > 0.94 ? 'FAILED' : 'SUCCESS',
          trail: trail
        };
        sp.logisticsInfo.trail.forEach(function (x) { x.trackingNo = sp.logisticsInfo.trackingNo; });
      }
      /* nội dung Creator đã đăng — lấy về cùng yêu cầu mẫu khi đã hoàn thành */
      if (st === 'COMPLETED') {
        var nVid = rnd() > 0.78 ? 2 : 1;
        var nLive = rnd() > 0.82 ? 1 : 0;
        for (var q = 0; q < nVid; q++) {
          var vViews = intBetween(800, 180000);
          sp.contents.push({
            type: 'VIDEO', id: '74' + ttNum(16),
            title: pick(CAPTIONS).replace('{sp}', pr.name.split(' ').slice(0, 4).join(' ')),
            publishedAt: Math.floor(daysAgo(Math.max(0, ago - intBetween(1, 5))).getTime() / 1000),
            views: vViews, likes: Math.round(vViews * (0.01 + rnd() * 0.07)),
            comments: Math.round(vViews * (0.0004 + rnd() * 0.004)),
            orders: rnd() > 0.55 ? intBetween(1, 24) : 0,
            gmv: 0, url: 'https://www.tiktok.com/@' + cr.user + '/video/74' + ttNum(16)
          });
        }
        if (nLive) {
          var lViews = intBetween(300, 42000);
          sp.contents.push({
            type: 'LIVE', id: '74' + ttNum(16),
            title: 'LIVE bán ' + pr.name.split(' ').slice(0, 4).join(' '),
            publishedAt: Math.floor(daysAgo(Math.max(0, ago - intBetween(1, 4))).getTime() / 1000),
            views: lViews, likes: Math.round(lViews * (0.02 + rnd() * 0.06)),
            comments: Math.round(lViews * (0.002 + rnd() * 0.01)),
            orders: rnd() > 0.4 ? intBetween(2, 60) : 0,
            gmv: 0, url: 'https://www.tiktok.com/@' + cr.user + '/live'
          });
        }
        sp.contents.forEach(function (x) { x.gmv = x.orders * intBetween(120000, 480000); });
        sp.video = sp.contents[0].url;
        if (rnd() > 0.55) { sp.rating = intBetween(3, 5); sp.ratingNote = pick(RATING_NOTES); }
      }
      db.samples.push(sp);
    }
    db.samples.sort(function (a, b) { return b.requestAt - a.requestAt; });

    /* mốc đồng bộ dữ liệu mẫu theo từng shop (Unix giây) */
    db.sampleSync = {};
    db.shops.forEach(function (sh) { db.sampleSync[sh.id] = Math.floor(daysAgo(0).getTime() / 1000) - intBetween(600, 7200); });

    /* tự động hóa */
    db.autoInvites = [
      { id: uid('ai'), shopId: 'vn-1300s', name: 'Mời Creator F&B > 100K follower', filter: 'F&B · 100K+ · có liên hệ',
        templateId: 'ti1', schedule: '08:00 hằng ngày', limit: 50, on: true, last: relTime(210) + ' · 47 mời · 0 lỗi', runs: 128 },
      { id: uid('ai'), shopId: 'vn-1300s', name: 'Mời Creator Live mới nổi', filter: 'Live · GMV 30 ngày > 100tr',
        templateId: 'ti4', schedule: '14:00 hằng ngày', limit: 30, on: true, last: relTime(1290) + ' · 28 mời · 2 lỗi', runs: 86 },
      { id: uid('ai'), shopId: 'vn-1300s', name: 'Mời Creator Gia dụng', filter: 'Gia dụng · 50K+',
        templateId: 'ti2', schedule: '09:00 thứ 2, 5', limit: 40, on: false, last: at(5, 9) + ' · 36 mời · 0 lỗi', runs: 41 },
      { id: uid('ai'), shopId: 'vn-lumi', name: 'Mời Creator Beauty', filter: 'Beauty · 80K+',
        templateId: 'ti3', schedule: '10:00 hằng ngày', limit: 35, on: true, last: relTime(90) + ' · 31 mời · 1 lỗi', runs: 54 }
    ];
    db.autoMessages = [
      { id: uid('am'), shopId: 'vn-1300s', when: 'Creator chấp nhận lời mời', templateId: 'tm1', on: true, last: relTime(12) + ' · 18 tin' },
      { id: uid('am'), shopId: 'vn-1300s', when: 'Creator xin hàng mẫu', templateId: 'tm3', on: true, last: relTime(85) + ' · 6 tin' },
      { id: uid('am'), shopId: 'vn-1300s', when: 'Mẫu đã duyệt', templateId: 'tm1', on: false, last: fmtDM(daysAgo(2)) + ' · 12 tin' },
      { id: uid('am'), shopId: 'vn-1300s', when: 'Vận đơn giao xong 5 ngày chưa có video', templateId: 'tm2', on: true, last: relTime(150) + ' · 9 tin' },
      { id: uid('am'), shopId: 'vn-1300s', when: 'Creator có đơn đầu tiên', templateId: 'tm4', on: true, last: relTime(35) + ' · 4 tin' }
    ];

    /* nhóm */
    db.members = [
      { id: 'm1', name: 'user01', email: 'user01@gomax.vn', role: 'Chủ', shops: 'Tất cả', status: 'Hoạt động', last: relTime(2) },
      { id: 'm2', name: 'Lê Quốc Huy', email: 'huy@gomax.vn', role: 'Quản lý', shops: "VN 1300'S, VN Lumi", status: 'Hoạt động', last: relTime(76) },
      { id: 'm3', name: 'Ngô Thảo Vy', email: 'vy@gomax.vn', role: 'BD', shops: 'TH Nara Home', status: 'Hoạt động', last: relTime(1080) },
      { id: 'm4', name: 'Phạm Đăng Khoa', email: 'khoa@gomax.vn', role: 'BD', shops: "VN 1300'S", status: 'Chờ nhận lời mời', last: '—' },
      { id: 'm5', name: 'Đỗ Hà Linh', email: 'linh@gomax.vn', role: 'Chỉ xem', shops: 'Tất cả', status: 'Đã khóa', last: at(12, 8, 20) }
    ];

    db.audit = [
      { id: uid('a'), at: relTime(3), who: 'user01', act: 'Duyệt 6 yêu cầu hàng mẫu', shop: "VN 1300'S Coffee", kind: 'Hàng mẫu' },
      { id: uid('a'), at: relTime(10), who: 'Hệ thống', act: 'Đồng bộ sản phẩm', shop: "VN 1300'S Coffee", kind: 'Đồng bộ' },
      { id: uid('a'), at: relTime(150), who: 'Tự động hóa', act: 'Gửi 47 lời mời theo quy tắc F&B', shop: "VN 1300'S Coffee", kind: 'Chiến dịch' },
      { id: uid('a'), at: relTime(196), who: 'Lê Quốc Huy', act: 'Thêm 3 Creator vào blacklist', shop: 'VN Lumi Skin', kind: 'Creator' },
      { id: uid('a'), at: at(1, 16, 40), who: 'Ngô Thảo Vy', act: 'Tạo chiến dịch “Chiến dịch Tết 2027”', shop: 'TH Nara Home', kind: 'Chiến dịch' },
      { id: uid('a'), at: at(1, 9, 2), who: 'user01', act: 'Cập nhật giới hạn gửi lên 500/ngày', shop: "VN 1300'S Coffee", kind: 'Cài đặt' }
    ];

    /* report của GOPUSH AI */
    db.aiReports = [
      { id: uid('r'), name: 'Hiệu suất Creator – ' + month(0), kind: 'Phân tích', scope: "VN 1300'S Coffee · 30 ngày", at: relTime(6), by: 'GOPUSH AI', status: 'Hoàn thành' },
      { id: uid('r'), name: 'So sánh 2 chiến dịch F&B', kind: 'So sánh', scope: "VN 1300'S Coffee · 2 chiến dịch", at: at(1, 16, 2), by: 'GOPUSH AI', status: 'Hoàn thành' },
      { id: uid('r'), name: 'Cảnh báo Creator nhận mẫu không lên video', kind: 'Cảnh báo', scope: 'Tất cả shop · 14 ngày', at: at(1, 8), by: 'Lịch tự động', status: 'Hoàn thành' },
      { id: uid('r'), name: 'Dự báo GMV ' + month(1, true), kind: 'Dự báo', scope: 'Tất cả shop', at: at(2, 19, 20), by: 'GOPUSH AI', status: 'Hoàn thành' },
      { id: uid('r'), name: 'Chân dung Creator ngành Gia dụng', kind: 'Phân tích', scope: 'TH Nara Home · 60 ngày', at: at(3, 10, 14), by: 'GOPUSH AI', status: 'Hoàn thành' },
      { id: uid('r'), name: 'Tối ưu hoa hồng theo SKU', kind: 'Đề xuất', scope: "VN 1300'S Coffee", at: at(4, 9, 30), by: 'GOPUSH AI', status: 'Hoàn thành' },
      { id: uid('r'), name: 'Báo cáo tuần cho ban giám đốc', kind: 'Tổng hợp', scope: 'Tất cả shop · hằng tuần', at: 'Thứ 2 hằng tuần', by: 'Lịch tự động', status: 'Đã lên lịch' },
      { id: uid('r'), name: 'Phân tích Creator ngừng hợp tác', kind: 'Phân tích', scope: 'Tất cả shop · 90 ngày', at: at(5, 15, 40), by: 'user01', status: 'Nháp' }
    ];

    db.chat = [];

    db.settings = {
      profile: { name: 'user01', email: 'user01@gomax.vn', phone: '0901 234 567', lang: 'Tiếng Việt', tz: '(UTC+7) Hồ Chí Minh', twofa: true, newDevice: true },
      notify: {
        'Yêu cầu hàng mẫu mới': [1, 1, 1], 'Creator chấp nhận lời mời': [0, 1, 1],
        'Chiến dịch chạy xong hoặc lỗi': [1, 1, 1], 'Vận đơn giao xong chưa có video': [1, 0, 1],
        'Shop sắp hết hạn ủy quyền': [1, 1, 1], 'Chạm hạn mức gửi trong ngày': [0, 1, 1],
        'Thành viên mới tham gia nhóm': [1, 0, 1]
      },
      ai: {
        sources: { 'Kho Creator và hồ sơ Creator': true, 'Chiến dịch lời mời và tin nhắn': true,
          'Yêu cầu hàng mẫu và vận đơn': true, 'Đơn hàng, GMV và hoa hồng': true,
          'Nhật ký hoạt động của nhóm': true, 'Ghi chú nội bộ trong hồ sơ Creator': false },
        scope: 'Shop đang chọn', period: '30 ngày gần nhất',
        weights: { 'GMV 30 ngày': 30, 'Tỉ lệ đăng sau khi nhận mẫu': 25, 'GPM (doanh thu mỗi 1.000 lượt xem)': 20,
          'Mức độ đều đặn của nội dung': 15, 'Độ phù hợp ngành hàng của shop': 10 },
        alertDays: 5, alertAccept: '20%', alertGmv: '15% so với kỳ trước', autoReport: true,
        tone: 'Ngắn gọn, đi thẳng vào số liệu', answerLang: 'Theo ngôn ngữ giao diện', length: 'Vừa — tối đa 6 ý',
        alwaysTable: true, alwaysSource: true, allowForecast: false,
        guide: 'Gọi nhà sáng tạo là "Creator", không dùng KOL/KOC. Tiền tệ theo shop, quy đổi về VND khi xem gộp. ' +
          'Khi đề xuất tăng hoa hồng, không vượt quá 25% và luôn nêu ảnh hưởng tới lợi nhuận. ' +
          'Không đề xuất liên hệ Creator đang nằm trong blacklist.',
        examples: [
          { q: 'Creator nào đáng đầu tư?', a: 'Xếp hạng theo điểm tổng hợp, kèm bảng 5 dòng và 1 câu lý do mỗi dòng.' },
          { q: 'Chiến dịch nào kém?', a: 'So sánh theo phễu, chỉ ra bước rơi nhiều nhất, đề xuất 1 hành động.' },
          { q: 'Tháng này có gì bất thường?', a: 'Liệt kê tối đa 3 bất thường kèm số liệu và mốc thời gian.' }
        ],
        noSend: true, onlyAssigned: true, logAll: true, banned: 'cam kết doanh số, bao đơn, hoàn tiền 100%'
      },
      billing: { plan: 'Growth', cycle: 'Theo tháng · gia hạn ' + dateAgo(-7), price: '4.900.000 ₫ / tháng', method: 'Chuyển khoản – Vietcombank' }
    };

    db.invoices = [
      { id: 'INV-2609-004', d: dateAgo(23), p: 'Growth – theo tháng', a: '4.900.000 ₫', st: 'Đã thanh toán' },
      { id: 'INV-2608-004', d: dateAgo(54), p: 'Growth – theo tháng', a: '4.900.000 ₫', st: 'Đã thanh toán' },
      { id: 'INV-2607-004', d: dateAgo(85), p: 'Starter – theo tháng', a: '1.900.000 ₫', st: 'Đã thanh toán' }
    ];

    /* lời mời đã gửi hôm nay = tổng đã gửi của chiến dịch đang chạy */
    db.shops.forEach(function (sh) {
      sh.used = db.campaigns.filter(function (c) { return c.shopId === sh.id && c.status === 'Đang chạy'; })
        .reduce(function (a, c) { return a + c.sent; }, 0);
      if (sh.used > sh.soft) sh.used = Math.round(sh.soft * 0.42);
    });

    return localize(db);
  }

  /* ---------------------------------------------------------- đổi dữ liệu gốc sang thị trường khác
     Cấu trúc giữ nguyên; thay shop, sản phẩm, tên Creator, khu vực, hãng vận chuyển và tiền tệ. */
  var VN_SHOP_NAMES = ["VN 1300'S Coffee", 'VN Lumi Skin', 'VN Nara Home', 'VN Kaya Living'];
  var VN_SHOP_SHORT = ["VN 1300'S", 'VN Lumi'];
  var VN_IDS = ['vn-1300s', 'vn-lumi', 'th-nara', 'my-kaya'];
  function localize(db) {
    /* chuỗi cũ còn sót trong nhật ký, thành viên, report của bản trước */
    var json = JSON.stringify(db).split('TH Nara Home').join('VN Nara Home').split('MY Kaya Living').join('VN Kaya Living');
    if (M.code === 'VN') return JSON.parse(json.split('"th-nara"').join('"vn-nara"').split('"my-kaya"').join('"vn-kaya"'));
    db = JSON.parse(json);
    var L = MK.local[M.code], code = M.code.toLowerCase();
    var prodName = {};
    db.shops.forEach(function (sh, i) {
      sh.flag = M.flag; sh.name = L.shops[i]; sh.country = M.name; sh.cur = M.cur;
      (db.products[sh.id] || []).forEach(function (p, k) {
        var nm = (L.products[i] || [])[k]; if (nm) { prodName[p.id] = { old: p.name, now: nm }; p.name = nm; }
      });
    });
    var used = {};
    function slug(t) { return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
    db.creators.forEach(function (c) {
      var f = pick(L.first), l = pick(L.last);
      c.name = L.familyFirst ? l + ' ' + f : f + ' ' + l;
      var base = slug(f + l), u = base + '.' + pick(SLUG);
      while (used[u]) u = base + intBetween(1, 999) + '.' + pick(SLUG);
      used[u] = 1;
      c.user = u; c.tiktok = 'https://www.tiktok.com/@' + u;
      c.country = M.name; c.region = pick(L.regions);
      c.email = c.email ? u.replace(/\./g, '') + '@gmail.com' : '';
      c.phone = '';
    });
    var byId = {}; db.creators.forEach(function (c) { byId[c.id] = c; });
    var carrierMap = { 'Giao Hàng Nhanh': 0, 'SPX Express': 1, 'Viettel Post': 2, 'J&T Express': 3 };
    db.samples.forEach(function (sp) {
      var c = byId[sp.creatorId];
      if (c) {
        sp.creatorInfo.username = c.user; sp.creatorInfo.creatorId = c.user; sp.creatorInfo.nickname = c.name;
        (sp.contents || []).forEach(function (x) { x.url = x.url.replace(/@[^/]+/, '@' + c.user); });
        if (sp.video) sp.video = sp.video.replace(/@[^/]+/, '@' + c.user);
      }
      var pn = prodName[sp.productKey];
      if (pn) {
        var frag = pn.old.split(' ').slice(0, 4).join(' ');
        sp.productInfo.title = pn.now;
        (sp.contents || []).forEach(function (x) { x.title = x.title.split(frag).join(pn.now); });
      }
      sp.gmvCurrency = M.iso;
      var lg = sp.logisticsInfo;
      if (lg && lg.carrierName) {
        var cn = L.carriers[carrierMap[lg.carrierName] || 0];
        lg.carrierName = cn; (lg.trail || []).forEach(function (t) { t.carrier = cn; });
      }
    });
    db.settings.profile.tz = M.tz;
    db.settings.billing.price = vnd(4900000) + ' / tháng';
    db.settings.billing.method = 'Thẻ Visa •••• 4242';
    db.invoices.forEach(function (iv) { iv.a = vnd(/Starter/.test(iv.p) ? 1900000 : 4900000); });
    /* đổi mã và tên shop trên toàn bộ dữ liệu */
    json = JSON.stringify(db);
    VN_IDS.forEach(function (id, i) { json = json.split(id).join(code + '-' + (i + 1)); });
    VN_SHOP_NAMES.forEach(function (n, i) { json = json.split(n).join(L.shops[i]); });
    VN_SHOP_SHORT.forEach(function (n, i) { json = json.split(n).join(L.shops[i]); });
    /* nhân sự mẫu (thành viên, người phụ trách, nhật ký) mang tên địa phương */
    ['Lê Quốc Huy', 'Ngô Thảo Vy', 'Phạm Đăng Khoa', 'Đỗ Hà Linh'].forEach(function (n, i) {
      var f = L.first[(i * 3 + 1) % L.first.length], l = L.last[(i * 2 + 1) % L.last.length];
      json = json.split(n).join(L.familyFirst ? l + ' ' + f : f + ' ' + l);
    });
    return JSON.parse(json);
  }

  /* ---------------------------------------------------------- lưu / nạp */
  var DB;
  /* bỏ dữ liệu của các bản trước để không dính cấu trúc cũ */
  function dropOld() {
    try {
      for (var i = 1; i < 20; i++) {
        var k = 'gopush.db.v' + i;
        if (k !== KEY) localStorage.removeItem(k);
      }
      /* kho theo thị trường của bản v7 */
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf('gopush.db.v7.') === 0) localStorage.removeItem(k); });
      localStorage.removeItem('gopush.db');
    } catch (e) { /* bỏ qua */ }
  }
  function load() {
    dropOld();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { DB = JSON.parse(raw); return; }
    } catch (e) { /* bỏ qua */ }
    DB = seed();
    if (SEED_HOOK) SEED_HOOK(DB);
    save();
  }
  /* mỗi kho ~1,4 triệu ký tự, localStorage chứa được khoảng 3 kho. Đầy thì dọn kho khác
     (kho chưa đăng nhập trước, rồi kho thị trường khác) — dữ liệu mẫu, mở lại sẽ sinh lại.
     Không đụng kho đang mở và gói của tài khoản (gopush.db.v8.billing.*). */
  function save() {
    var json = JSON.stringify(DB);
    for (var tries = 0; tries < 12; tries++) {
      try { localStorage.setItem(KEY, json); return; } catch (e) {
        var keys = Object.keys(localStorage).filter(function (k) {
          return k.indexOf('gopush.db.v8.') === 0 && k !== KEY && k.indexOf('gopush.db.v8.billing.') !== 0;
        });
        if (!keys.length) return;
        /* kho không gắn tài khoản (2 phần sau tiền tố) dọn trước */
        keys.sort(function (x, y) { return x.split('.').length - y.split('.').length; });
        localStorage.removeItem(keys[0]);
      }
    }
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* bỏ qua */ }
    DB = seed(); if (SEED_HOOK) SEED_HOOK(DB); save();
  }

  /* ---------------------------------------------------------- yêu cầu mẫu */
  /* enum của TikTok → nhãn hiển thị; thứ tự đúng theo vòng đời */
  var SAMPLE_STATUS = [
    { v: 'PENDING', l: 'Chờ duyệt' },
    { v: 'AWAITING_SHIPMENT', l: 'Chờ gửi hàng' },
    { v: 'SHIPPED', l: 'Đang giao' },
    { v: 'CONTENT_PENDING', l: 'Chờ đăng nội dung' },
    { v: 'COMPLETED', l: 'Đã hoàn thành' },
    { v: 'CANCELLED', l: 'Đã hủy' }
  ];
  var SAMPLE_TYPES = [{ v: 'FREE', l: 'Hàng mẫu miễn phí' }, { v: 'REFUNDABLE', l: 'Hàng mẫu có thể hoàn tiền' }];
  var APPROVAL = [{ v: 'MANUAL', l: 'Phê duyệt thủ công' }, { v: 'AUTO', l: 'Phê duyệt tự động' }];
  function approvalLabel(v) {
    var out = v;
    APPROVAL.forEach(function (x) { if (x.v === v) out = x.l; });
    return out;
  }
  var REJECT_REASONS = [
    { v: 'NOT_MATCH', l: 'Creator không phù hợp yêu cầu hợp tác', ic: 'ban' },
    { v: 'OFFLINE', l: 'Sản phẩm đã ngừng bán', ic: 'box' },
    { v: 'OUT_OF_STOCK', l: 'Sản phẩm tạm hết hàng', ic: 'alert' },
    { v: 'OTHER', l: 'Lý do khác', ic: 'dots' }
  ];
  function sampleLabel(v) {
    var out = v;
    SAMPLE_STATUS.forEach(function (x) { if (x.v === v) out = x.l; });
    return out;
  }
  /* số đếm 6 tab + mốc dữ liệu, đúng hình dạng statusSummary của API */
  function sampleSummary(shopId, sampleType) {
    var out = { lastUpdateTime: DB.sampleSync ? DB.sampleSync[shopId] || 0 : 0, total: 0 };
    SAMPLE_STATUS.forEach(function (x) { out[x.v] = 0; });
    DB.samples.forEach(function (s) {
      if (s.shopId !== shopId) return;
      if (sampleType && s.sampleType !== sampleType) return;
      out[s.status] = (out[s.status] || 0) + 1;
      out.total++;
    });
    return out;
  }
  /* mốc thời gian theo chuẩn của màn: YYYY-MM-DD HH:mm:ss (UTC+7) */
  function ts(unixSec) {
    if (!unixSec) return '';
    var d = new Date(unixSec * 1000);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' ' + tzLabel();
  }
  function tsShort(unixSec) {
    if (!unixSec) return '';
    var d = new Date(unixSec * 1000);
    return fmtDateTime(d);
  }
  function daysFrom(unixSec) {
    if (!unixSec) return 0;
    return Math.max(0, Math.floor((Date.now() / 1000 - unixSec) / 86400));
  }

  /* ---------------------------------------------------------- truy vấn */
  function shop(id) {
    for (var i = 0; i < DB.shops.length; i++) if (DB.shops[i].id === id) return DB.shops[i];
    return DB.shops[0];
  }
  function creator(id) {
    for (var i = 0; i < DB.creators.length; i++) if (DB.creators[i].id === id) return DB.creators[i];
    return null;
  }
  function tag(id) {
    for (var i = 0; i < DB.tags.length; i++) if (DB.tags[i].id === id) return DB.tags[i];
    return null;
  }
  function tpl(id) {
    for (var i = 0; i < DB.templates.length; i++) if (DB.templates[i].id === id) return DB.templates[i];
    return null;
  }
  function rel(c, shopId) {
    if (!c.rel[shopId]) c.rel[shopId] = { state: 'Mới', saved: false, tags: [], owner: 'user01', note: '', invitedAt: null };
    return c.rel[shopId];
  }
  function isBlacklisted(creatorId, shopId) {
    return DB.blacklist.some(function (b) { return b.creatorId === creatorId && b.shopId === shopId; });
  }

  /* Trần cứng do TikTok cấp (invitation/limit) và trần mềm do GOPUSH tự đặt.
     Số thật dùng để chặn thao tác luôn là cái nhỏ hơn. */
  function quota(shopId) {
    var sh = shop(shopId);
    var cap = Math.min(sh.inviteLimit || 0, sh.soft || 0);
    return { hard: sh.inviteLimit || 0, soft: sh.soft || 0, cap: cap, used: sh.used || 0,
      left: Math.max(0, cap - (sh.used || 0)) };
  }

  /* đã ký nhận quá 5 ngày mà Creator chưa đăng nội dung */
  function isLate(s) {
    return s.status === 'CONTENT_PENDING' && s.logisticsInfo.signedAt && !s.video &&
      daysFrom(s.logisticsInfo.signedAt) >= 5;
  }

  function logAct(act, kind, shopId) {
    DB.audit.unshift({ id: uid('a'), at: fmtDateTime(new Date()), who: DB.settings.profile.name, act: act,
      shop: shopId ? shop(shopId).name : 'Tất cả shop', kind: kind || 'Khác' });
    if (DB.audit.length > 200) DB.audit.length = 200;
  }

  /* thống kê cho Tổng quan và Báo cáo */
  function stats(shopId) {
    var cs = DB.creators;
    var scope = shopId === 'all' ? DB.shops.map(function (s) { return s.id; }) : [shopId];
    var invited = 0, accepted = 0, working = 0, gmv = 0;
    cs.forEach(function (c) {
      scope.forEach(function (sid) {
        var r = c.rel[sid]; if (!r) return;
        if (r.state !== 'Mới') invited++;
        if (r.state === 'Đã chấp nhận' || r.state === 'Đang hợp tác') accepted++;
        if (r.state === 'Đang hợp tác') { working++; gmv += c.gmv30; }
      });
    });
    var sm = DB.samples.filter(function (s) { return scope.indexOf(s.shopId) > -1; });
    var reqs = sm.length;
    var got = sm.filter(function (s) { return ['CONTENT_PENDING', 'COMPLETED'].indexOf(s.status) > -1; }).length;
    var vids = sm.filter(function (s) { return s.video; }).length;
    return {
      gmv: gmv, orders: Math.round(gmv / 320000), com: Math.round(gmv * 0.158),
      invited: invited, accepted: accepted, working: working,
      acceptRate: invited ? accepted / invited * 100 : 0,
      samples: reqs, received: got, videos: vids,
      pending: sm.filter(function (s) { return s.status === 'PENDING'; }).length,
      lateNoVideo: sm.filter(function (s) { return isLate(s); }).length
    };
  }

  /* ---------------------------------------------------------- xuất file */
  function toCSV(cols, rows) {
    function cell(v) {
      v = v == null ? '' : String(v);
      return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }
    return '﻿' + [cols.map(cell).join(';')].concat(rows.map(function (r) { return r.map(cell).join(';'); })).join('\r\n');
  }
  function download(filename, text, type) {
    var blob = new Blob([text], { type: (type || 'text/csv') + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  load();

  global.DB = {
    get data() { return DB; },
    save: save, reset: reset, uid: uid,
    shop: shop, creator: creator, tag: tag, tpl: tpl, rel: rel, isBlacklisted: isBlacklisted,
    log: logAct, stats: stats,
    money: money, short: short, amt: amt, vnd: vnd, num: num, pct: pct, cur: cur, fx: fx, toBase: toBase, unit: unit,
    market: function () { return M; },
    /* đổi site: lưu kho hiện tại, nạp (hoặc sinh) kho của thị trường mới */
    useMarket: function (code) {
      save(); M = MK.get(code); KEY = keyOf();
      try { localStorage.setItem('gopush.market', M.code); } catch (e) { /* bỏ qua */ }
      load();
    },
    setLang: function (l) { LANG = l; },
    /* đổi sang kho của tài khoản đang đăng nhập; trả về true nếu có đổi */
    useUser: function (uid) {
      if ((uid || '') === UID) return false;
      save(); UID = uid || ''; KEY = keyOf(); load(); return true;
    },
    setSeedHook: function (fn) { SEED_HOOK = fn; }, fmtDate: fmtDate, fmtDateTime: fmtDateTime, fmtDM: fmtDM, dm: function (n) { return fmtDM(daysAgo(n)); }, today: today, ago: dateAgo, at: at, relTime: relTime, month: month, quota: quota,
    SAMPLE_STATUS: SAMPLE_STATUS, REJECT_REASONS: REJECT_REASONS, sampleLabel: sampleLabel,
    SAMPLE_TYPES: SAMPLE_TYPES, APPROVAL: APPROVAL, approvalLabel: approvalLabel,
    sampleSummary: sampleSummary, isLate: isLate, ts: ts, tsShort: tsShort, daysFrom: daysFrom,
    toCSV: toCSV, download: download
  };
})(window);
