/* GOPUSH — tài khoản và đăng nhập.
   Hai chế độ, cùng một giao diện:
   - firebase: khi auth-config.js có cấu hình. Tài khoản thật, Google thật, email xác thực
     và đặt lại mật khẩu do Firebase Authentication gửi.
   - demo: khi chưa cấu hình. Tài khoản lưu trong trình duyệt này, mật khẩu băm PBKDF2-SHA256;
     Google và email đặt lại mật khẩu báo là cần cấu hình.
   Trang Đăng nhập, Đăng ký, Quên mật khẩu cũng dựng ở đây. */
(function (global) {
  'use strict';

  var P = global.PAGES, U = global.UI, S = global.DB, ic = global.icon, I = global.I18N;
  var CFG = (global.GOPUSH_AUTH || {}).firebase;
  var MODE = CFG && CFG.apiKey ? 'firebase' : 'demo';
  var FB_V = '10.12.2';

  var user = null, fa = null, listeners = [];
  function emit() { listeners.forEach(function (f) { try { f(user); } catch (e) { /* bỏ qua */ } }); }

  var ls = {
    get: function (k, st) { try { return (st || localStorage).getItem(k); } catch (e) { return null; } },
    set: function (k, v, st) { try { (st || localStorage).setItem(k, v); } catch (e) { /* bỏ qua */ } },
    del: function (k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) { /* bỏ qua */ } }
  };

  /* ---------------------------------------------------------- lỗi → thông báo */
  var ERR = {
    'invalid-email': ['Email không hợp lệ.', 'That email address is not valid.'],
    'weak-password': ['Mật khẩu cần ít nhất 8 ký tự, có cả chữ và số.', 'Password needs 8+ characters with letters and numbers.'],
    'email-in-use': ['Email này đã có tài khoản. Hãy đăng nhập.', 'This email already has an account. Please sign in.'],
    'wrong-credentials': ['Email hoặc mật khẩu không đúng.', 'Incorrect email or password.'],
    'missing-name': ['Nhập họ và tên.', 'Enter your full name.'],
    'terms': ['Bạn cần đồng ý với Điều khoản và Chính sách bảo mật.', 'Please accept the Terms and Privacy policy.'],
    'too-many': ['Thử sai quá nhiều lần. Đợi vài phút rồi thử lại.', 'Too many attempts. Please wait a few minutes.'],
    'popup-closed': ['Cửa sổ Google đã đóng trước khi đăng nhập xong.', 'The Google window was closed before finishing.'],
    'network': ['Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', 'Cannot reach the server. Check your connection.'],
    'unauthorized-domain': ['Tên miền này chưa được thêm vào Authorized domains của Firebase.', 'This domain is not in Firebase Authorized domains.'],
    'google-not-configured': ['Đăng nhập Google cần cấu hình Firebase trong assets/js/auth-config.js. Hiện đang chạy chế độ demo.', 'Google sign-in needs Firebase config in assets/js/auth-config.js. Running in demo mode.'],
    'not-allowed': ['Phương thức đăng nhập này chưa được bật trong Firebase.', 'This sign-in method is not enabled in Firebase.'],
    'unknown': ['Có lỗi xảy ra. Thử lại sau.', 'Something went wrong. Please try again.']
  };
  var FB_CODE = {
    'auth/invalid-email': 'invalid-email', 'auth/weak-password': 'weak-password', 'auth/email-already-in-use': 'email-in-use',
    'auth/invalid-credential': 'wrong-credentials', 'auth/wrong-password': 'wrong-credentials', 'auth/user-not-found': 'wrong-credentials',
    'auth/invalid-login-credentials': 'wrong-credentials', 'auth/too-many-requests': 'too-many', 'auth/popup-closed-by-user': 'popup-closed',
    'auth/cancelled-popup-request': 'popup-closed', 'auth/network-request-failed': 'network', 'auth/unauthorized-domain': 'unauthorized-domain',
    'auth/operation-not-allowed': 'not-allowed'
  };
  function fail(code) { var e = new Error(code); e.code = code; return Promise.reject(e); }
  function msg(e, lang) {
    var code = (e && (FB_CODE[e.code] || e.code)) || 'unknown', m = ERR[code] || ERR.unknown;
    return lang !== 'en' ? m[0] : m[1];
  }

  /* ---------------------------------------------------------- kiểm tra đầu vào */
  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
  function strong(p) { return p.length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p); }
  function pwScore(p) {
    var n = 0;
    if (p.length >= 8) n++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) n++;
    if (/\d/.test(p) && /[^a-zA-Z0-9]/.test(p)) n++;
    if (p.length >= 12) n++;
    return Math.min(3, n);
  }

  /* ---------------------------------------------------------- chế độ demo */
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function hashPw(pw, salt) {
    var c = global.crypto && global.crypto.subtle;
    if (!c) {
      /* không có Web Crypto (mở file:// hoặc http thường): băm đơn giản, chỉ để chạy thử */
      var h = 5381, t = salt + pw;
      for (var k = 0; k < 20000; k++) h = ((h << 5) + h + t.charCodeAt(k % t.length)) | 0;
      return Promise.resolve('weak:' + (h >>> 0).toString(16));
    }
    var enc = new TextEncoder();
    return c.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']).then(function (key) {
      return c.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
    }).then(hex);
  }
  /* tài khoản dựng sẵn cho chế độ demo (chỉ có khi CHƯA cấu hình Firebase).
     admin: tài khoản hệ thống GOPUSH, toàn quyền, thấy cả mục chỉ dành cho nội bộ (model AI…).
     biz: khách hàng doanh nghiệp đã mua gói Cao cấp, thấy đúng như khách thật. */
  /* Mỗi tài khoản demo là MỘT luồng để kiểm tra (xem README › Cơ cấu quyền):
     lớp 1 liên kết gian hàng → lớp 2 gói → lớp 3 vai trò. */
  var DEMO_REV = 5;
  var DEMO_ACCOUNTS = [
    { key: 'admin', email: 'admin@gopush.asia', password: 'Admin@2026', name: 'Quản trị GOPUSH', company: 'GoMax Digital', role: 'admin', plan: 'premium', linked: true,
      lb: ['Admin hệ thống', 'System admin'], flow: ['Toàn quyền, trang quản trị, model AI', 'Everything, admin pages, AI model'] },
    { key: 'biz', email: 'doanhnghiep@gopush.asia', password: 'Demo@2026', name: 'Khách hàng Doanh nghiệp', company: 'Công ty TNHH Demo', role: 'customer', plan: 'premium', linked: true,
      lb: ['Doanh nghiệp · Cao cấp', 'Business · Premium'], flow: ['Khách đầy đủ tính năng', 'Customer with every feature'] },
    { key: 'basic', email: 'coban@gopush.asia', password: 'Basic@2026', name: 'Khách gói Cơ bản', company: 'Shop Cơ Bản', role: 'customer', plan: 'basic', linked: true,
      lb: ['Gói Cơ bản', 'Basic plan'], flow: ['GOPUSH AI, Report AI bị khóa', 'GOPUSH AI and Report AI locked'] },
    { key: 'trial', email: 'dungthu@gopush.asia', password: 'Trial@2026', name: 'Khách dùng thử', company: 'Shop Dùng Thử', role: 'customer', plan: 'trial', linked: true,
      lb: ['Gói dùng thử', 'Trial plan'], flow: ['1 cửa hàng; Phân loại, Tự động hóa, AI bị khóa', '1 shop; segments, automation, AI locked'] },
    { key: 'new', email: 'moi@gopush.asia', password: 'New@2026', name: 'Tài khoản mới', company: 'Shop Mới', role: 'customer', plan: 'none', linked: false, fresh: true,
      lb: ['Tài khoản mới', 'New account'], flow: ['Mỗi lần đăng nhập như mới tạo: bắt ủy quyền → chọn gói', 'Fresh on every sign-in: link shop → pick a plan'] },
    { key: 'link', email: 'lienket@gopush.asia', password: 'Link@2026', name: 'Tài khoản chưa liên kết', company: 'Shop Chưa Liên Kết', role: 'customer', plan: 'trial', linked: false,
      lb: ['Chưa liên kết gian hàng', 'Shop not linked'], flow: ['Popup hướng dẫn liên kết khi đăng nhập', 'Shop-linking guide on sign-in'] }
  ];
  /* tạo tài khoản demo còn thiếu; đổi cấu hình (DEMO_REV) thì cập nhật và xóa kho cũ của tài khoản đó */
  function seedDemo() {
    /* bỏ tài khoản demo theo tên miền cũ gopush.vn */
    var old = users(), dirty = false;
    Object.keys(old).forEach(function (k) { if (old[k].demo && /@gopush\.vn$/.test(k)) { delete old[k]; dirty = true; } });
    if (dirty) saveUsers(old);
    var all = users(), todo = DEMO_ACCOUNTS.filter(function (a) { return !all[a.email] || all[a.email].demoRev !== DEMO_REV; });
    return Promise.all(todo.map(function (a) {
      var salt = 'demo-' + a.key;
      return hashPw(a.password, salt).then(function (h) {
        var uid = 'u-demo-' + a.key;
        try {
          Object.keys(localStorage).forEach(function (k) { if (k.indexOf('gopush.db.v8.') === 0 && k.slice(-uid.length - 1) === '.' + uid) localStorage.removeItem(k); });
        } catch (e) { /* bỏ qua */ }
        all[a.email] = { uid: uid, name: a.name, email: a.email, company: a.company, role: a.role, plan: a.plan, linked: a.linked,
          market: 'VN', salt: salt, hash: h, created: new Date().toISOString(), demo: true, demoRev: DEMO_REV };
      });
    })).then(function () { if (todo.length) saveUsers(all); });
  }

  function users() { try { return JSON.parse(ls.get('gopush.users') || '{}'); } catch (e) { return {}; } }
  function saveUsers(u) { ls.set('gopush.users', JSON.stringify(u)); }
  function startSession(rec, remember) {
    user = { uid: rec.uid, name: rec.name, email: rec.email, company: rec.company || '', provider: 'password', verified: false, photo: '',
      role: rec.role || 'customer', plan: rec.plan || '', linked: rec.linked !== false };
    ls.del('gopush.session');
    ls.set('gopush.session', JSON.stringify(user), remember === false ? sessionStorage : localStorage);
    emit();
    return user;
  }

  var demo = {
    restore: function () {
      try { user = JSON.parse(ls.get('gopush.session') || ls.get('gopush.session', sessionStorage) || 'null'); } catch (e) { user = null; }
      return seedDemo().catch(function () { /* bỏ qua */ });
    },
    signUp: function (o) {
      var all = users(), email = o.email.toLowerCase();
      if (all[email]) return fail('email-in-use');
      var salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
      return hashPw(o.password, salt).then(function (h) {
        /* tài khoản tự đăng ký: chưa liên kết gian hàng, chưa có gói — đi đủ luồng: liên kết → chọn gói */
        var rec = { uid: 'u-' + Math.random().toString(36).slice(2, 10), name: o.name, email: email, company: o.company, role: 'customer', plan: 'none', linked: false,
          market: o.market, salt: salt, hash: h, created: new Date().toISOString() };
        all[email] = rec; saveUsers(all);
        return startSession(rec, true);
      });
    },
    signIn: function (email, pw, remember) {
      var rec = users()[email.toLowerCase()];
      /* chạy băm cả khi không có tài khoản để thời gian phản hồi như nhau */
      return hashPw(pw, rec ? rec.salt : 'none').then(function (h) {
        if (!rec || h !== rec.hash) return fail('wrong-credentials');
        /* tài khoản demo: mỗi lần đăng nhập về đúng gói, trạng thái liên kết và dữ liệu chỉ định
           (đổi gói, liên kết, thao tác thử ở lần trước không mang sang) */
        var d = DEMO_ACCOUNTS.filter(function (a) { return a.email === rec.email; })[0];
        if (d) {
          var all = users(); rec = all[rec.email]; rec.linked = d.linked; rec.plan = d.plan; saveUsers(all);
          try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('gopush.db.v8.') === 0 && k.slice(-rec.uid.length - 1) === '.' + rec.uid) localStorage.removeItem(k); }); } catch (e) { /* bỏ qua */ }
        }
        return startSession(rec, remember);
      });
    },
    google: function () { return fail('google-not-configured'); },
    reset: function () { return Promise.resolve({ demo: true }); },
    signOut: function () { ls.del('gopush.session'); user = null; emit(); return Promise.resolve(); }
  };

  /* ---------------------------------------------------------- chế độ Firebase */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('network')); };
      document.head.appendChild(s);
    });
  }
  function mapFb(u) {
    if (!u) return null;
    var meta = {}; try { meta = JSON.parse(ls.get('gopush.meta.' + u.uid) || '{}'); } catch (e) { /* bỏ qua */ }
    return { uid: u.uid, name: u.displayName || meta.name || (u.email || '').split('@')[0], email: u.email, company: meta.company || '',
      photo: u.photoURL || '', verified: u.emailVerified, provider: (u.providerData[0] || {}).providerId || 'password' };
  }
  var fb = {
    restore: function () {
      var base = 'https://www.gstatic.com/firebasejs/' + FB_V + '/';
      return loadScript(base + 'firebase-app-compat.js').then(function () { return loadScript(base + 'firebase-auth-compat.js'); }).then(function () {
        global.firebase.initializeApp(CFG);
        fa = global.firebase.auth();
        fa.useDeviceLanguage();
        return new Promise(function (res) {
          fa.onAuthStateChanged(function (u) { user = mapFb(u); emit(); res(); });
        });
      }).catch(function () { user = null; });
    },
    signUp: function (o) {
      return fa.createUserWithEmailAndPassword(o.email, o.password).then(function (cr) {
        ls.set('gopush.meta.' + cr.user.uid, JSON.stringify({ name: o.name, company: o.company, market: o.market }));
        return cr.user.updateProfile({ displayName: o.name }).then(function () {
          cr.user.sendEmailVerification().catch(function () { /* bỏ qua */ });
          user = mapFb(cr.user); emit(); return user;
        });
      });
    },
    signIn: function (email, pw, remember) {
      var P = global.firebase.auth.Auth.Persistence;
      return fa.setPersistence(remember === false ? P.SESSION : P.LOCAL).then(function () {
        return fa.signInWithEmailAndPassword(email, pw);
      }).then(function (cr) { user = mapFb(cr.user); emit(); return user; });
    },
    google: function () {
      var pr = new global.firebase.auth.GoogleAuthProvider();
      pr.setCustomParameters({ prompt: 'select_account' });
      return fa.signInWithPopup(pr).then(function (cr) { user = mapFb(cr.user); emit(); return user; });
    },
    reset: function (email) { return fa.sendPasswordResetEmail(email).then(function () { return { demo: false }; }); },
    signOut: function () { return fa.signOut().then(function () { user = null; emit(); }); }
  };

  var impl = MODE === 'firebase' ? fb : demo;
  var ready = impl.restore();

  var AUTH = {
    mode: MODE,
    demoAccounts: MODE === 'demo' ? DEMO_ACCOUNTS.map(function (a) { return { email: a.email, password: a.password, role: a.role }; }) : [],
    isAdmin: function () { return !!(user && user.role === 'admin'); },
    /* gói của tài khoản đang đăng nhập; tài khoản mới mặc định dùng thử */
    plan: function () {
      if (!user) return 'trial';
      if (MODE === 'firebase') { try { return JSON.parse(ls.get('gopush.meta.' + user.uid) || '{}').plan || 'none'; } catch (e) { return 'none'; } }
      return user.plan || 'none';
    },
    /* đã liên kết (ủy quyền) gian hàng TikTok Shop chưa */
    linked: function () {
      if (!user) return false;
      if (MODE === 'firebase') { try { return !!JSON.parse(ls.get('gopush.meta.' + user.uid) || '{}').linked; } catch (e) { return false; } }
      return user.linked !== false;
    },
    setLinked: function (v) {
      if (!user) return;
      user.linked = !!v;
      if (MODE === 'firebase') {
        var meta = {}; try { meta = JSON.parse(ls.get('gopush.meta.' + user.uid) || '{}'); } catch (e) { /* bỏ qua */ }
        meta.linked = !!v; ls.set('gopush.meta.' + user.uid, JSON.stringify(meta)); return;
      }
      var all = users(); if (all[user.email]) { all[user.email].linked = !!v; saveUsers(all); }
      ls.set('gopush.session', JSON.stringify(user), ls.get('gopush.session') ? localStorage : sessionStorage);
    },
    setPlan: function (id) {
      if (!user) return;
      user.plan = id;
      if (MODE === 'firebase') {
        var meta = {}; try { meta = JSON.parse(ls.get('gopush.meta.' + user.uid) || '{}'); } catch (e) { /* bỏ qua */ }
        meta.plan = id; ls.set('gopush.meta.' + user.uid, JSON.stringify(meta)); return;
      }
      var all = users(); if (all[user.email]) { all[user.email].plan = id; saveUsers(all); }
      var st = ls.get('gopush.session') ? localStorage : sessionStorage;
      ls.set('gopush.session', JSON.stringify(user), st);
    },
    ready: ready,
    user: function () { return user; },
    onChange: function (f) { listeners.push(f); },
    signUp: function (o) {
      if (!o.name) return fail('missing-name');
      if (!validEmail(o.email)) return fail('invalid-email');
      if (!strong(o.password)) return fail('weak-password');
      if (!o.terms) return fail('terms');
      return impl.signUp(o);
    },
    signIn: function (email, pw, remember) {
      if (!validEmail(email)) return fail('invalid-email');
      if (!pw) return fail('wrong-credentials');
      return impl.signIn(email, pw, remember);
    },
    google: function () { return impl.google(); },
    reset: function (email) { return validEmail(email) ? impl.reset(email) : fail('invalid-email'); },
    signOut: function () { return impl.signOut(); }
  };

  /* ===================================================================== trang */
  function lang() { return (global.APP && global.APP.lang && global.APP.lang()) || ls.get('gopush.lang') || 'vi'; }
  function T(k) { return I.t(k, lang()); }
  var BRAND = {
    vi: ['Biến Creator thành doanh thu trên TikTok Shop', 'Tìm, mời và theo dõi Creator ở 9 thị trường. Mọi số liệu về một nơi, có AI phân tích sẵn.',
      ['Xây dựng trên TikTok Shop Partner API', 'Kho Creator riêng, sao lưu mỗi ngày', 'GOPUSH AI viết report và nội dung']],
    en: ['Turn creators into revenue on TikTok Shop', 'Find, invite and track creators across 9 markets. All your numbers in one place, with AI built in.',
      ['Built on the TikTok Shop Partner API', 'Your own creator database, backed up daily', 'GOPUSH AI writes reports and content']]
  };

  function langPick() {
    var l = lang();
    return '<label class="ig-au-sel">' + ic('globe') + '<select data-aulang aria-label="' + U.attr(T('language')) + '">' +
      I.LANGS.map(function (o) { return '<option value="' + o.v + '"' + (o.v === l ? ' selected' : '') + '>' + U.esc(o.l) + '</option>'; }).join('') +
      '</select>' + ic('down') + '</label>';
  }
  function marketSelect(attr, cur) {
    var l = lang();
    return '<select ' + attr + '>' + global.MARKETS.list.map(function (m) {
      return '<option value="' + m.code + '"' + (m.code === cur ? ' selected' : '') + '>' + m.flag + '  ' + U.esc(l !== 'en' ? m.name : m.en) + '</option>';
    }).join('') + '</select>';
  }
  function pwField(name, ph, meter) {
    return '<div class="ig-au-field"><label for="au-' + name + '">' + U.esc(T('a_password')) + '</label>' +
      '<div class="ig-au-input">' + ic('lock') +
        '<input id="au-' + name + '" name="' + name + '" type="password" autocomplete="' + (meter ? 'new-password' : 'current-password') +
        '" placeholder="' + U.attr(ph) + '" required>' +
        '<button type="button" class="ig-au-eye" data-aueye aria-label="Hiện mật khẩu">' + ic('eye') + '</button></div>' +
      (meter ? '<div class="ig-au-meter" data-aumeter><i></i><i></i><i></i></div><span class="ig-au-hint">' + U.esc(T('a_pwHint')) + '</span>' : '') +
      '</div>';
  }
  function field(name, label, type, ph, icon, auto) {
    return '<div class="ig-au-field"><label for="au-' + name + '">' + U.esc(label) + '</label>' +
      '<div class="ig-au-input">' + (icon ? ic(icon) : '') +
      '<input id="au-' + name + '" name="' + name + '" type="' + type + '" autocomplete="' + (auto || 'off') + '" placeholder="' + U.attr(ph) + '"' +
      (type === 'email' ? ' required inputmode="email"' : '') + '></div></div>';
  }

  function shell(o) {
    var l = lang(), b = BRAND[l] || BRAND.en;
    return '<div class="ig-au">' +
      '<aside class="ig-au-brand">' +
        '<a href="#/" class="logo">' + U.logo() + '</a>' +
        '<div class="msg"><h2>' + U.esc(b[0]) + '</h2><p>' + U.esc(b[1]) + '</p>' +
          '<ul>' + b[2].map(function (t, i) { return '<li>' + ic(['shield', 'database', 'ai'][i]) + '<span>' + U.esc(t) + '</span></li>'; }).join('') + '</ul></div>' +
        '<div class="mk"><span>' + global.MARKETS.list.map(function (m) { return '<i title="' + U.attr(m.en) + '">' + m.flag + '</i>'; }).join('') + '</span>' +
          '<small>TikTok Shop · Đông Nam Á · US · Brasil · Japan</small></div>' +
      '</aside>' +
      '<main class="ig-au-main">' +
        '<div class="ig-au-top"><a class="back" href="#/">' + ic('back') + 'GOPUSH</a><span class="spacer"></span>' + langPick() + '</div>' +
        '<div class="ig-au-card">' +
          (MODE === 'demo' ? '<div class="ig-au-demo">' + ic('info') + '<span>' + (l !== 'en'
            ? '<b>Chế độ demo.</b> Tài khoản chỉ lưu trên trình duyệt này. Điền cấu hình Firebase trong <code>assets/js/auth-config.js</code> để dùng tài khoản thật và Google.'
            : '<b>Demo mode.</b> Accounts are stored in this browser only. Add Firebase config in <code>assets/js/auth-config.js</code> for real accounts and Google.') + '</span></div>' : '') +
          '<h1>' + U.esc(o.title) + '</h1><p class="sub">' + U.esc(o.sub) + '</p>' +
          (o.google ? '<button type="button" class="ig-au-google" data-augoogle>' + P.gLogo() + '<span>' + U.esc(T('a_google')) + '</span></button>' +
            '<div class="ig-au-or"><span>' + U.esc(T('a_or')) + '</span></div>' : '') +
          '<form class="ig-au-form" data-auth="' + o.kind + '" novalidate>' + o.body +
            '<div class="ig-au-err" role="alert" hidden></div>' +
            '<button type="submit" class="ig-au-submit"><span>' + U.esc(o.cta) + '</span><i class="spin"></i></button></form>' +
          (o.foot ? '<p class="ig-au-foot">' + o.foot + '</p>' : '') + (o.after || '') +
        '</div>' +
        '<p class="ig-au-legal">© 2026 GoMax Digital · <a href="#/privacy">' + U.esc(I.nav('Chính sách bảo mật', 'Privacy policy', l)) + '</a> · <a href="#/terms">' +
          U.esc(I.nav('Điều khoản sử dụng', 'Terms of service', l)) + '</a></p>' +
      '</main></div>';
  }

  /* danh sách tài khoản demo chỉ hiện qua link dành cho người duyệt: #/login?review=1 (nhớ trong phiên) */
  function reviewMode() {
    var on = /[?&]review=1\b/.test(location.hash);
    try { if (on) sessionStorage.setItem('gopush.review', '1'); return on || sessionStorage.getItem('gopush.review') === '1'; } catch (e) { return on; }
  }
  function demoBox() {
    if (MODE !== 'demo' || !reviewMode()) return '';
    var vi = lang() !== 'en';   /* ngoài tiếng Anh: dùng câu gốc để từ điển dịch */
    return '<div class="ig-au-quick"><span class="h">' + (vi ? 'Tài khoản demo · mỗi tài khoản một luồng kiểm tra' : 'Demo accounts · one test flow each') + '</span>' +
      DEMO_ACCOUNTS.map(function (a) {
        return '<button type="button" data-audemo="' + a.key + '"><span class="ic k-' + a.key + '">' +
          ic({ admin: 'shield', biz: 'building', basic: 'layers', trial: 'clock', new: 'userPlus', link: 'link' }[a.key]) + '</span>' +
          '<span class="t"><b>' + a.lb[vi ? 0 : 1] + '</b><em>' + a.flow[vi ? 0 : 1] + '</em>' +
          '<small>' + a.email + '</small><small>' + a.password + '</small></span>' + ic('right') + '</button>';
      }).join('') +
      '<button type="button" class="reset" data-audemoreset>' + ic('refresh') + (vi ? 'Đặt lại các tài khoản demo về trạng thái ban đầu' : 'Reset demo accounts to their initial state') + '</button></div>';
  }

  P.login = function () {
    return shell({ kind: 'login', title: T('a_loginTitle'), sub: T('a_loginSub'), google: true, cta: T('a_login'), after: demoBox(),
      body: field('email', T('a_email'), 'email', 'ten@congty.com', 'mail', 'email') + pwField('password', '••••••••') +
        '<div class="ig-au-row"><label class="ig-au-check"><input type="checkbox" name="remember" checked><span></span>' + U.esc(T('a_remember')) + '</label>' +
        '<a class="gm-link" href="#/forgot">' + U.esc(T('a_forgot')) + '</a></div>',
      foot: U.esc(T('a_noAcc')) + ' <a class="gm-link" href="#/signup">' + U.esc(T('a_create')) + '</a>' });
  };
  P.signup = function () {
    return shell({ kind: 'signup', title: T('a_signupTitle'), sub: T('a_signupSub'), google: true, cta: T('a_create'),
      body: '<div class="ig-au-two">' + field('name', T('a_name'), 'text', 'Nguyễn Minh Anh', 'user', 'name') +
          field('company', T('a_company'), 'text', 'GoMax Digital', 'building', 'organization') + '</div>' +
        field('email', T('a_email'), 'email', 'ten@congty.com', 'mail', 'email') +
        '<div class="ig-au-field"><label for="au-market">' + U.esc(T('a_market')) + '</label><div class="ig-au-input">' + ic('globe') +
          marketSelect('id="au-market" name="market"', S.market().code) + '</div></div>' +
        pwField('password', T('a_pwHint'), true) +
        '<label class="ig-au-check terms"><input type="checkbox" name="terms"><span></span><em>' + T('a_terms') + '</em></label>',
      foot: U.esc(T('a_hasAcc')) + ' <a class="gm-link" href="#/login">' + U.esc(T('a_login')) + '</a>' });
  };
  P.forgot = function () {
    return shell({ kind: 'reset', title: T('a_resetTitle'), sub: T('a_resetSub'), cta: T('a_send'),
      body: field('email', T('a_email'), 'email', 'ten@congty.com', 'mail', 'email'),
      foot: '<a class="gm-link" href="#/login">' + ic('back') + ' ' + U.esc(T('a_back')) + '</a>' });
  };

  /* ---------------------------------------------------------- sự kiện trên trang */
  function next() {
    var m = location.hash.match(/[?&]next=([^&]+)/);
    var n = m ? decodeURIComponent(m[1]) : '';
    if (!n || n === '/' || /^\/(login|signup|forgot)/.test(n)) n = '/home';
    return n;
  }
  function showErr(form, text, ok) {
    var b = form.querySelector('.ig-au-err');
    b.hidden = !text; b.classList.toggle('is-ok', !!ok); b.innerHTML = text ? ic(ok ? 'check' : 'alert') + '<span>' + text + '</span>' : '';
  }
  function busy(form, on) {
    var b = form.querySelector('.ig-au-submit'); b.disabled = on; b.classList.toggle('is-busy', on);
    var g = document.querySelector('[data-augoogle]'); if (g) g.disabled = on;
  }
  function done(u) {
    if (u && global.APP && global.APP.onLogin) global.APP.onLogin(u);
    location.hash = '#' + next();
  }

  document.addEventListener('submit', function (e) {
    var form = e.target.closest && e.target.closest('form[data-auth]');
    if (!form) return;
    e.preventDefault();
    var f = form.elements, kind = form.getAttribute('data-auth'), l = lang();
    showErr(form, ''); busy(form, true);
    var p;
    if (kind === 'login') p = AUTH.signIn(f.email.value.trim(), f.password.value, f.remember.checked).then(done);
    else if (kind === 'signup') {
      var mk = f.market.value;
      p = AUTH.signUp({ name: f.name.value.trim(), company: f.company.value.trim(), email: f.email.value.trim(),
        password: f.password.value, market: mk, terms: f.terms.checked }).then(function (u) {
        if (mk !== S.market().code && global.APP && global.APP.setMarket) global.APP.setMarket(mk, true);
        done(u);
      });
    } else {
      p = AUTH.reset(f.email.value.trim()).then(function (r) {
        busy(form, false);
        showErr(form, r && r.demo
          ? (l !== 'en' ? 'Chế độ demo không gửi email thật. Khi cấu hình Firebase, liên kết đặt lại sẽ được gửi tới email này.' : 'Demo mode does not send real email. With Firebase configured, a reset link is sent to this address.')
          : (l !== 'en' ? 'Đã gửi liên kết đặt lại mật khẩu. Kiểm tra hộp thư (cả mục Spam).' : 'Reset link sent. Check your inbox (and spam).'), true);
      });
    }
    p.catch(function (err) { busy(form, false); showErr(form, msg(err, l)); });
  });

  document.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-augoogle]'))) {
      var form = document.querySelector('form[data-auth]');
      showErr(form, ''); busy(form, true);
      AUTH.google().then(done).catch(function (err) { busy(form, false); showErr(form, msg(err, lang())); });
      return;
    }
    if ((el = e.target.closest('[data-audemoreset]'))) {
      /* xóa hồ sơ + kho dữ liệu của tài khoản demo rồi tạo lại: liên kết, gói về như ban đầu */
      var all = users(), uids = DEMO_ACCOUNTS.map(function (a) { return 'u-demo-' + a.key; });
      DEMO_ACCOUNTS.forEach(function (a) { delete all[a.email]; });
      saveUsers(all);
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('gopush.db.v8.') === 0 && uids.some(function (u) { return k.slice(-u.length) === u; })) localStorage.removeItem(k); }); } catch (x) { /* bỏ qua */ }
      el.disabled = true;
      seedDemo().then(function () {
        var fm = document.querySelector('form[data-auth]');
        if (fm) showErr(fm, lang() !== 'en' ? 'Đã đặt lại 6 tài khoản demo.' : 'Demo accounts have been reset.', true);
        el.disabled = false;
      });
      return;
    }
    if ((el = e.target.closest('[data-audemo]'))) {
      var acc = DEMO_ACCOUNTS.filter(function (a) { return a.key === el.getAttribute('data-audemo'); })[0], fm = document.querySelector('form[data-auth="login"]');
      if (!acc || !fm) return;
      fm.elements.email.value = acc.email; fm.elements.password.value = acc.password;
      fm.requestSubmit ? fm.requestSubmit() : fm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      return;
    }
    if ((el = e.target.closest('[data-aueye]'))) {
      var inp = el.parentNode.querySelector('input');
      inp.type = inp.type === 'password' ? 'text' : 'password';
      el.innerHTML = ic(inp.type === 'password' ? 'eye' : 'lock');
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.name !== 'password') return;
    var m = e.target.closest('.ig-au-field').querySelector('[data-aumeter]');
    if (m) m.setAttribute('data-score', e.target.value ? pwScore(e.target.value) : '');
  });
  document.addEventListener('change', function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-aulang') && global.APP && global.APP.setLang) global.APP.setLang(e.target.value);
  });

  global.AUTH = AUTH;
})(window);
