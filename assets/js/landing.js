/* GOPUSH — trang chủ công khai (#/), dải kêu gọi dùng thử và chân trang dùng chung
   cho các trang công khai. Hình minh họa sản phẩm dựng bằng HTML/CSS, không dùng ảnh chụp. */
(function (global) {
  'use strict';

  var P = global.PAGES, U = global.UI, S = global.DB, ic = global.icon;

  /* mô phỏng màn hình GOPUSH cho phần hero */
  function mock() {
    var bars = [38, 52, 44, 61, 58, 72, 66, 84, 79, 92];
    var crs = [['Huyền My', 'Đồ uống', 96], ['Thanh Hân', 'Làm đẹp', 94], ['Bảo Trang', 'Nhà cửa', 91]];
    return '<div class="ig-ld-mock" aria-hidden="true">' +
      '<div class="win"><div class="bar"><i></i><i></i><i></i><span>app.gopush.asia</span></div>' +
        '<div class="body">' +
          '<div class="side">' + ['home', 'users', 'send', 'box', 'chart', 'ai'].map(function (n, i) {
            return '<span class="' + (i === 1 ? 'on' : '') + '">' + ic(n) + '</span>'; }).join('') + '</div>' +
          '<div class="main">' +
            '<div class="kpis">' +
              '<div><small>GMV liên kết</small><b>5,17 tỷ</b><em>+18,2%</em></div>' +
              '<div><small>Creator hợp tác</small><b>1.284</b><em>+96</em></div>' +
              '<div><small>Tỉ lệ chấp nhận</small><b>38,4%</b><em>+4,1%</em></div></div>' +
            '<div class="chart">' + bars.map(function (h) { return '<i style="height:' + h + '%"></i>'; }).join('') + '</div>' +
            '<div class="list"><div class="h">' + ic('ai') + 'AI gợi ý Creator phù hợp</div>' + crs.map(function (c) {
              return '<div class="r"><span class="av">' + c[0].split(' ').map(function (w) { return w[0]; }).join('') + '</span>' +
                '<span class="n">' + c[0] + '<small>' + c[1] + '</small></span><span class="sc"><i style="width:' + c[2] + '%"></i></span><b>' + c[2] + '</b></div>';
            }).join('') + '</div>' +
          '</div></div></div>' +
      '<div class="float f1">' + ic('sparkle') + '<span><b>20 Creator</b> khớp yêu cầu<small>AI quét Kho trong 3 giây</small></span></div>' +
      '<div class="float f2">' + ic('send') + '<span><b>480 lời mời</b> đã gửi hôm nay<small>Tự động · đúng giới hạn shop</small></span></div>' +
    '</div>';
  }

  P.ctaBand = function () {
    return '<section class="ig-ld-cta"><div class="ig-wrap">' +
      '<div><h2>Sẵn sàng chạy affiliate bài bản hơn?</h2><p>Kết nối shop đầu tiên trong 5 phút. Dùng thử 7 ngày, không cần thẻ.</p></div>' +
      '<div class="act"><a class="ig-ld-btn is-light" href="#/signup">Dùng thử miễn phí</a><a class="ig-ld-btn is-ghost" href="#/pricing">Xem bảng giá</a></div>' +
    '</div></section>';
  };

  P.pubFoot = function () {
    return '<footer class="ig-ld-foot"><div class="ig-wrap">' +
      '<div class="brand"><a href="#/">' + U.logo() + '</a><p>Nền tảng quản lý affiliate Creator cho TikTok Shop. Phát triển bởi GoMax Digital.</p>' +
        '<span class="flags">' + global.MARKETS.list.map(function (m) { return '<i title="' + U.attr(m.en) + '">' + m.flag + '</i>'; }).join('') + '</span></div>' +
      '<div class="col"><b>Sản phẩm</b><a href="#/">Tính năng</a><a href="#/pricing">Bảng giá</a><a href="#/signup">Dùng thử</a></div>' +
      '<div class="col"><b>Chính sách</b><a href="#/privacy">Chính sách bảo mật</a><a href="#/terms">Điều khoản sử dụng</a></div>' +
      '<div class="col"><b>Liên hệ</b><a href="mailto:contact@gopush.asia">contact@gopush.asia</a><a href="tel:+84867888582">0867.888.582</a><a href="https://zalo.me/0867888582" target="_blank" rel="noopener">Zalo 0867.888.582</a></div>' +
    '</div><div class="ig-wrap copy"><span>© 2026 GoMax Digital</span><span>GOPUSH v0.3</span></div></footer>';
  };

  var GROUPS = [
    ['search', 'Tìm Creator', 'Tìm đúng người, nhanh', ['Lọc đủ trường qua API TikTok Shop', 'AI tìm theo điều kiện, sản phẩm, nội dung', 'Phân loại Macro, Micro, Freecast… tự động']],
    ['send', 'Mời và nhắn tin', 'Liên hệ hàng loạt, an toàn', ['Chiến dịch lời mời có hàng đợi, giãn cách', 'Nhắn tin hàng loạt theo mẫu', 'Tự động mời Creator mới mỗi ngày']],
    ['box', 'Chiến dịch và hàng mẫu', 'Theo tới từng đơn', ['Duyệt mẫu, theo vận đơn tới lúc lên video', 'Phễu mời → chấp nhận → mẫu → video → đơn', 'Nhắc Creator nhận mẫu chưa đăng']],
    ['ai', 'GOPUSH AI', 'Phân tích và viết thay bạn', ['Report AI chỉ ra khâu nghẽn, việc nên làm', 'Content AI viết kịch bản, caption, lời mời', 'AI Chat hỏi gì về số liệu cũng được']]
  ];

  P.landing = function (c) {
    var plans = global.PLANS;
    return '<div class="ig-public ig-site">' + P.pubNav(c.lang) +
      /* hero */
      '<section class="ig-ld-hero"><div class="ig-wrap">' +
        '<div class="copy">' +
          '<span class="ig-eyebrow">' + ic('shield') + 'Xây dựng trên TikTok Shop Partner API</span>' +
          '<h1>Tăng tốc affiliate TikTok Shop cùng <span class="hl">GOPUSH AI</span></h1>' +
          '<p>Tìm, mời và theo dõi hàng nghìn Creator mỗi ngày ở 9 thị trường. Hàng mẫu, nội dung, GMV về một nơi — AI phân tích và gợi ý việc nên làm.</p>' +
          '<div class="act"><a class="ig-ld-btn" href="#/signup">Dùng thử miễn phí ' + ic('right') + '</a><a class="ig-ld-btn is-line" href="#/pricing">Xem bảng giá</a></div>' +
          '<ul class="trust"><li>' + ic('check') + '7 ngày miễn phí</li><li>' + ic('check') + 'Không cần thẻ</li><li>' + ic('check') + 'Hủy bất cứ lúc nào</li></ul>' +
        '</div>' + mock() +
      '</div></section>' +
      /* số liệu */
      '<section class="ig-ld-stats"><div class="ig-wrap">' + [
        ['9', 'thị trường TikTok Shop'], ['7 ngày', 'dùng thử miễn phí'], ['24/7', 'đội ngũ GOPUSH hỗ trợ'], ['0', 'cookie hay công cụ giả lập thao tác']
      ].map(function (s) { return '<div><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('') + '</div></section>' +
      /* thay nhiều công cụ */
      '<section class="ig-ld-sec"><div class="ig-wrap">' +
        '<div class="ig-ld-head"><span class="ig-eyebrow">Vì sao GOPUSH</span><h2>Một nền tảng thay cho cả chục file Excel</h2></div>' +
        '<div class="ig-ld-vs">' +
          '<div class="old"><h3>Cách làm cũ</h3><ul>' + ['Lọc Creator thủ công, chép ra Excel', 'Nhắn tin mời từng người một', 'Theo dõi hàng mẫu trên Google Sheet', 'Gom số liệu GMV cuối tháng mới biết', 'Mỗi shop một nơi, không xem gộp được'].map(function (t) {
            return '<li>' + ic('x') + t + '</li>'; }).join('') + '</ul></div>' +
          '<div class="new"><h3>' + U.logo() + '</h3><ul>' + ['Tìm và lưu Creator vào Kho trong vài giây', 'Chiến dịch mời hàng loạt, tự động mỗi ngày', 'Hàng mẫu, vận đơn, video đồng bộ tự động', 'Dashboard và Report AI cập nhật liên tục', 'Một tài khoản cho mọi shop, mọi thị trường'].map(function (t) {
            return '<li>' + ic('check') + t + '</li>'; }).join('') + '</ul></div>' +
        '</div></div></section>' +
      /* nhóm tính năng */
      '<section class="ig-ld-sec is-tint"><div class="ig-wrap">' +
        '<div class="ig-ld-head"><span class="ig-eyebrow">Tính năng</span><h2>Đủ cho cả vòng đời hợp tác Creator</h2>' +
          '<p>Từ lúc tìm người tới lúc có đơn: mỗi bước một công cụ, cùng một dữ liệu.</p></div>' +
        '<div class="ig-ld-feats">' + GROUPS.map(function (g, i) {
          return '<article><div class="top"><span class="ic">' + ic(g[0]) + '</span><span class="no">0' + (i + 1) + '</span></div>' +
            '<h3>' + g[1] + '</h3><p>' + g[2] + '</p><ul>' + g[3].map(function (t) { return '<li>' + ic('check') + t + '</li>'; }).join('') + '</ul></article>';
        }).join('') + '</div></div></section>' +
      /* các bước */
      '<section class="ig-ld-sec"><div class="ig-wrap">' +
        '<div class="ig-ld-head"><span class="ig-eyebrow">Bắt đầu</span><h2>Chạy chiến dịch đầu tiên trong 4 bước</h2></div>' +
        '<ol class="ig-ld-steps">' + [
          ['Kết nối shop', 'Ủy quyền OAuth với TikTok Shop, không cần mật khẩu shop.'],
          ['Tìm và lưu Creator', 'Lọc qua API hoặc để AI gợi ý, lưu vào Kho.'],
          ['Gửi lời mời', 'Tạo chiến dịch hàng loạt hoặc bật tự động mỗi ngày.'],
          ['Đo kết quả', 'Theo dõi mẫu, video, GMV; Report AI chỉ việc nên làm.']
        ].map(function (s, i) { return '<li><span class="n">' + (i + 1) + '</span><b>' + s[0] + '</b><p>' + s[1] + '</p></li>'; }).join('') + '</ol>' +
      '</div></section>' +
      /* bảng giá rút gọn */
      '<section class="ig-ld-sec is-tint"><div class="ig-wrap">' +
        '<div class="ig-ld-head"><span class="ig-eyebrow">Bảng giá</span><h2>Giá rõ ràng, nâng gói khi cần</h2>' +
          '<p>Gói năm tiết kiệm 20%. <a class="gm-link" href="#/pricing">So sánh chi tiết các gói</a></p></div>' +
        plans.cards('month', { action: function (p) {
          return '<a class="ig-tier-btn' + (p.popular ? ' is-primary' : '') + '" href="#/signup">' + (p.price ? 'Chọn gói' : 'Dùng thử miễn phí') + '</a>';
        } }) +
      '</div></section>' +
      P.ctaBand() + P.pubFoot() + '</div>';
  };
})(window);
