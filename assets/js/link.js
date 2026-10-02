/* GOPUSH — liên kết (ủy quyền) gian hàng TikTok Shop: lớp quyền đầu tiên.
   Chưa liên kết thì mọi tính năng bị khóa, chỉ còn Trang chủ, Cửa hàng, Gói & thanh toán, Hồ sơ.
   - guide():  popup hướng dẫn liên kết từng bước, tự mở sau mỗi lần đăng nhập nếu chưa liên kết.
   - needed(): popup nhỏ "Bạn chưa liên kết gian hàng" khi bấm vào tính năng; mở lại guide().
   Link ủy quyền lấy từ auth-config.js (tiktokAuthUrl); bản demo xác nhận bằng nút "Tôi đã ủy quyền xong". */
(function (global) {
  'use strict';

  var P = global.PAGES, U = global.UI, S = global.DB, ic = global.icon;
  function url() { return (global.GOPUSH_AUTH && global.GOPUSH_AUTH.tiktokAuthUrl) || 'https://partner.tiktokshop.com/'; }
  function linked() { return !global.AUTH || global.AUTH.linked(); }

  /* ---------------------------------------------------------- khung popup dùng chung */
  function open(html, cls) {
    close(true);
    var el = document.createElement('div');
    el.className = 'ig-lk ' + (cls || ''); el.id = 'lk'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = html;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    var f = el.querySelector('[data-lk-focus]') || el.querySelector('button'); if (f) f.focus();
    return el;
  }
  function close(now) {
    var el = document.getElementById('lk'); if (!el) return;
    if (now) { el.remove(); return; }
    el.classList.remove('is-in'); setTimeout(function () { el.remove(); }, 180);
  }

  /* ---------------------------------------------------------- popup hướng dẫn liên kết */
  var STEPS = [
    ['Mở trang ủy quyền TikTok Shop', 'Trang ủy quyền mở ở tab mới.'],
    ['Đăng nhập tài khoản người bán', 'Dùng tài khoản Seller Center của gian hàng cần liên kết, chọn đúng gian hàng.'],
    ['Đồng ý cấp quyền cho GOPUSH', 'Xem lại các quyền GOPUSH yêu cầu rồi bấm Ủy quyền trên trang TikTok Shop.'],
    ['Quay lại GOPUSH', 'Bấm “Tôi đã ủy quyền” để GOPUSH kiểm tra và đồng bộ dữ liệu.']
  ];
  var opened = false;
  var SCOPES = ['Thông tin sản phẩm', 'Creator và lời mời Affiliate', 'Yêu cầu hàng mẫu, vận đơn', 'Đơn hàng và GMV liên kết'];
  function guideHTML(state) {
    var x = '<button class="x" data-lk="close" aria-label="Đóng">' + ic('x') + '</button>';
    if (state === 'done') {
      return '<div class="ig-lk-box is-auth">' + x + '<div class="ig-auth is-done"><span class="ok">' + ic('check') + '</span>' +
        '<h2>Đã liên kết gian hàng</h2><p>GOPUSH đang đồng bộ sản phẩm, Creator, hàng mẫu và đơn hàng. Tính năng được mở theo gói của bạn.</p>' +
        '<div class="ig-lk-sync"><i></i></div></div></div>';
    }
    var step = state === 'checking' ? 3 : (opened ? 1 : 0);
    return '<div class="ig-lk-box is-auth">' + x + '<div class="ig-auth">' +
      '<div class="brands"><span class="mark">' + U.logo(null, true) + '</span>' +
        '<span class="arrows">' + ic('left') + ic('right') + '</span>' +
        '<span class="mark">' + ic('tiktok') + 'TikTok Shop</span></div>' +
      '<div class="head"><h2>Liên kết gian hàng TikTok Shop</h2>' +
      '<p class="lead">Ủy quyền một lần để GOPUSH đồng bộ dữ liệu gian hàng. Bạn không cần cung cấp mật khẩu.</p></div>' +
      '<div class="cols"><ol class="steps">' + STEPS.map(function (st, k) {
        var cls = k < step ? 'is-done' : (k === step ? 'is-cur' : '');
        return '<li class="' + cls + '"><span class="n">' + (k < step ? ic('check') : (k + 1)) + '</span><div class="c"><b>' + st[0] + '</b><span>' + st[1] + '</span>' +
          (k === 0 ? '<a class="open" href="' + U.attr(url()) + '" target="_blank" rel="noopener" data-lk="open" data-lk-focus>' + ic('tiktok') +
            'Mở trang ủy quyền' + ic('arrowUpRight') + '</a>' : '') + '</div></li>';
      }).join('') + '</ol>' +
      '<div class="right"><div class="scope"><div class="h"><b>GOPUSH sẽ được đọc</b><span>Chỉ đọc · thu hồi được trong Seller Center</span></div>' +
        '<ul>' + SCOPES.map(function (t) { return '<li>' + ic('check') + t + '</li>'; }).join('') + '</ul></div>' +
        (state === 'checking' ? '<div class="checking"><i></i>Đang kiểm tra ủy quyền với TikTok Shop…</div>' : '') +
        '<p class="note">Bản demo: link mở trang ủy quyền dịch vụ của TikTok Shop. Khi GOPUSH được cấp quyền ISV, GOPUSH tự nhận kết quả ủy quyền thay cho nút “Tôi đã ủy quyền”.</p>' +
      '</div></div>' +
      '<div class="foot"><a class="help" href="mailto:contact@gopush.asia">Cần hỗ trợ?</a>' +
        '<button class="gm-btn" data-lk="close">Để sau</button>' +
        '<button class="gm-btn gm-btn-primary" data-lk="verify"' + (state === 'checking' ? ' disabled' : '') + '>Tôi đã ủy quyền</button></div>' +
    '</div></div>';
  }
  function guide() { closeDeny(); open(guideHTML(''), 'is-auth'); }
  function paint(state) { var box = document.querySelector('#lk .ig-lk-box'); if (box) box.outerHTML = guideHTML(state); }

  /* ---------------------------------------------------------- popup nhỏ: chưa liên kết */
  function needed() {
    closeDeny();
    open('<div class="ig-lk-box is-need">' +
      '<button class="x" data-lk="close" aria-label="Đóng">' + ic('x') + '</button>' +
      '<span class="badge">' + ic('link') + '</span>' +
      '<h2>Bạn chưa liên kết gian hàng</h2>' +
      '<p>Vui lòng làm theo hướng dẫn để liên kết gian hàng TikTok Shop. Sau khi liên kết, tính năng được mở theo gói của bạn.</p>' +
      '<div class="foot"><button class="gm-btn" data-lk="close">Để sau</button>' +
        '<button class="gm-btn gm-btn-primary" data-lk="guide" data-lk-focus>Xem hướng dẫn liên kết' + ic('right') + '</button></div>' +
    '</div>', 'is-need');
  }
  function closeDeny() { var d = document.getElementById('deny'); if (d) d.remove(); }

  /* ---------------------------------------------------------- sự kiện */
  document.addEventListener('click', function (e) {
    var root = document.getElementById('lk'); if (!root) return;
    var t = e.target.closest && e.target.closest('[data-lk]');
    if (!t) { if (!(e.target.closest && e.target.closest('.ig-lk-box'))) close(); return; }
    var act = t.getAttribute('data-lk');
    if (act === 'close') close();
    else if (act === 'guide') guide();
    else if (act === 'open') { opened = true; setTimeout(function () { paint(''); }, 50); }
    else if (act === 'verify') {
      paint('checking');
      setTimeout(function () {
        global.AUTH.setLinked(true);
        paint('done');
        setTimeout(function () { close(); if (global.APP && global.APP.afterLink) global.APP.afterLink(); }, 1500);
      }, 1300);
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.getElementById('lk')) close(); });

  /* mỗi lần đăng nhập: chưa liên kết thì tự mở hướng dẫn một lần */
  var promptedFor = null;
  function onLogin(u) {
    if (!u || linked() || promptedFor === u.uid) return;
    promptedFor = u.uid; opened = false;
    setTimeout(guide, 350);
  }
  if (global.AUTH) global.AUTH.onChange(function (u) { if (!u) promptedFor = null; });

  /* ---------------------------------------------------------- khối nhắc trên Trang chủ */
  var baseHome = P.home;
  P.home = function (c) {
    var html = baseHome(c);
    if (linked()) return html;
    return '<div class="ig-lkcall"><span class="ic">' + ic('link') + '</span>' +
      '<div class="tx"><b>Liên kết gian hàng TikTok Shop để bắt đầu</b><span>Ủy quyền qua API chính thức để đồng bộ sản phẩm, Creator, hàng mẫu và đơn hàng.</span></div>' +
      '<span class="spacer"></span><button class="go" data-lkopen>Liên kết ngay' + ic('right') + '</button></div>' + html;
  };
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-lkopen]')) guide(); });

  global.LINK = { guide: guide, needed: needed, linked: linked, onLogin: onLogin };
})(window);
