/* GOPUSH — ngôn ngữ giao diện.
   Tiếng Việt là bản gốc. Có hai lớp dịch:
   1. Bảng NAV / STR dưới đây: điều hướng, tiêu đề trang, thanh trên, đăng nhập (dịch tay, ưu tiên).
   2. Từ điển toàn bộ nội dung: assets/i18n/<lang>.js, mỗi file là { "câu tiếng Việt": "bản dịch" }.
      Sau mỗi lần vẽ, lớp dịch quét chữ hiển thị (và placeholder, title, aria-label) rồi thay theo từ điển:
      khớp nguyên câu trước, không khớp thì thay từng cụm đã biết trong câu (câu ghép với số, tên, ngày).
      Thêm câu mới: chạy tools/i18n-extract.py để lấy các câu chưa có, dịch rồi bổ sung vào từng file. */
(function (global) {
  'use strict';

  var LANGS = [
    { v: 'vi', l: 'Tiếng Việt', s: 'VI' },
    { v: 'en', l: 'English', s: 'EN' },
    { v: 'th', l: 'ไทย', s: 'TH' },
    { v: 'id', l: 'Bahasa Indonesia', s: 'ID' },
    { v: 'ja', l: '日本語', s: 'JA' },
    { v: 'pt', l: 'Português', s: 'PT' },
    { v: 'zh', l: '中文 (简体)', s: 'ZH' }
  ];

  /* khóa là nhãn tiếng Việt; giá trị [th, id, ja, pt] */
  var NAV = {
    'Tổng quan': ['ภาพรวม', 'Ringkasan', '概要', 'Visão geral'],
    'Trang chủ': ['หน้าแรก', 'Beranda', 'ホーム', 'Início'],
    'Việc cần xử lý': ['งานที่ต้องทำ', 'Perlu tindakan', '対応が必要', 'Pendências'],
    'Creator': ['ครีเอเตอร์', 'Kreator', 'クリエイター', 'Criadores'],
    'Tìm Creator': ['ค้นหาครีเอเตอร์', 'Cari kreator', 'クリエイター検索', 'Buscar criadores'],
    'Kho Creator': ['คลังครีเอเตอร์', 'Basis kreator', 'クリエイター台帳', 'Base de criadores'],
    'Phân loại Creator': ['กลุ่มครีเอเตอร์', 'Segmen kreator', 'クリエイター分類', 'Segmentos'],
    'Gắn Tag': ['แท็ก', 'Tag', 'タグ', 'Tags'],
    'Blacklist': ['บัญชีดำ', 'Daftar hitam', 'ブロックリスト', 'Bloqueados'],
    'Hợp tác': ['ความร่วมมือ', 'Kolaborasi', 'コラボ', 'Parcerias'],
    'Chiến dịch lời mời': ['แคมเปญเชิญ', 'Kampanye undangan', '招待キャンペーン', 'Campanhas de convite'],
    'Chi tiết chiến dịch': ['รายละเอียดแคมเปญ', 'Detail kampanye', 'キャンペーン詳細', 'Detalhe da campanha'],
    'Nhắn tin hàng loạt': ['ส่งข้อความจำนวนมาก', 'Pesan massal', '一斉メッセージ', 'Mensagens em massa'],
    'Tự động hóa': ['อัตโนมัติ', 'Otomatisasi', '自動化', 'Automação'],
    'Điều chỉnh kế hoạch': ['ปรับแผน', 'Penyesuaian rencana', 'プラン調整', 'Ajustes de plano'],
    'Thư viện mẫu': ['คลังเทมเพลต', 'Pustaka templat', 'テンプレート', 'Modelos'],
    'Hàng mẫu': ['สินค้าตัวอย่าง', 'Sampel', 'サンプル', 'Amostras'],
    'Yêu cầu hàng mẫu': ['คำขอสินค้าตัวอย่าง', 'Permintaan sampel', 'サンプル依頼', 'Pedidos de amostra'],
    'Theo dõi vận đơn': ['ติดตามพัสดุ', 'Lacak pengiriman', '配送追跡', 'Rastreio de envios'],
    'Kết quả': ['ผลลัพธ์', 'Hasil', '成果', 'Resultados'],
    'Dashboard': ['แดชบอร์ด', 'Dasbor', 'ダッシュボード', 'Painel'],
    'Theo chiến dịch': ['ตามแคมเปญ', 'Per kampanye', 'キャンペーン別', 'Por campanha'],
    'Báo cáo custom': ['รายงานกำหนดเอง', 'Laporan kustom', 'カスタムレポート', 'Relatório personalizado'],
    'GOPUSH AI': ['GOPUSH AI', 'GOPUSH AI', 'GOPUSH AI', 'GOPUSH AI'],
    'AI Chat': ['แชท AI', 'Obrolan AI', 'AIチャット', 'Chat IA'],
    'Report AI': ['รายงาน AI', 'Laporan AI', 'AIレポート', 'Relatórios IA'],
    'AI Tìm Creator': ['AI ค้นหาครีเอเตอร์', 'AI cari kreator', 'AIクリエイター検索', 'IA busca criadores'],
    'Content AI': ['คอนเทนต์ AI', 'Konten AI', 'AIコンテンツ', 'Conteúdo IA'],
    'Cài đặt AI': ['ตั้งค่า AI', 'Pengaturan AI', 'AI設定', 'Configurações de IA'],
    'Cài đặt hệ thống': ['ตั้งค่าระบบ', 'Pengaturan sistem', 'システム設定', 'Configurações do sistema'] , 'Cài đặt doanh nghiệp': ['ตั้งค่าธุรกิจ', 'Pengaturan bisnis', 'ビジネス設定', 'Configurações da empresa'],
    'Cửa hàng': ['ร้านค้า', 'Toko', 'ショップ', 'Lojas'],
    'Chi tiết shop': ['รายละเอียดร้าน', 'Detail toko', 'ショップ詳細', 'Detalhe da loja'],
    'Thành viên': ['สมาชิก', 'Anggota', 'メンバー', 'Membros'],
    'Vai trò & quyền': ['บทบาทและสิทธิ์', 'Peran & izin', 'ロールと権限', 'Funções e permissões'],
    'Nhật ký hoạt động': ['บันทึกกิจกรรม', 'Log aktivitas', 'アクティビティログ', 'Registro de atividades'],
    'Gói & thanh toán': ['แพ็กเกจและการชำระเงิน', 'Paket & tagihan', 'プランと支払い', 'Plano e cobrança'],
    'Thông báo': ['การแจ้งเตือน', 'Notifikasi', '通知', 'Notificações'],
    'Hồ sơ': ['โปรไฟล์', 'Profil', 'プロフィール', 'Perfil'],
    'Thông báo hệ thống': ['ประกาศระบบ', 'Pengumuman sistem', 'システムのお知らせ', 'Avisos do sistema'],
    'Nghiệp vụ': ['การดำเนินงาน', 'Operasional', '業務', 'Operações'],
    'Quản trị': ['การจัดการ', 'Administrasi', '管理', 'Administração'],
    'Đăng nhập': ['เข้าสู่ระบบ', 'Masuk', 'ログイン', 'Entrar'],
    'Đăng ký': ['สมัครใช้งาน', 'Daftar', '新規登録', 'Criar conta'],
    'Chính sách bảo mật': ['นโยบายความเป็นส่วนตัว', 'Kebijakan privasi', 'プライバシーポリシー', 'Política de privacidade'],
    'Điều khoản sử dụng': ['ข้อกำหนดการใช้งาน', 'Ketentuan layanan', '利用規約', 'Termos de uso'],
    'Landing': ['หน้าแรก', 'Beranda', 'トップ', 'Início']
  };
  var IDX = { th: 0, id: 1, ja: 2, pt: 3 };

  /* chuỗi dùng chung: khóa → { vi, en, th, id, ja, pt } */
  var STR = {
    market: { vi: 'Thị trường', en: 'Market', th: 'ตลาด', id: 'Pasar', ja: 'マーケット', pt: 'Mercado', zh: '市场' },
    language: { vi: 'Ngôn ngữ', en: 'Language', th: 'ภาษา', id: 'Bahasa', ja: '言語', pt: 'Idioma', zh: '语言' },
    searchAsk: { vi: 'Tìm hoặc hỏi AI…', en: 'Search or ask AI…', th: 'ค้นหาหรือถาม AI…', id: 'Cari atau tanya AI…', ja: '検索またはAIに質問…', pt: 'Buscar ou perguntar à IA…', zh: '搜索或询问 AI…' },
    signout: { vi: 'Đăng xuất', en: 'Sign out', th: 'ออกจากระบบ', id: 'Keluar', ja: 'ログアウト', pt: 'Sair', zh: '退出登录' },
    quota: { vi: 'lời mời hôm nay', en: 'invites today', th: 'คำเชิญวันนี้', id: 'undangan hari ini', ja: '本日の招待', pt: 'convites hoje', zh: '今日邀约' },
    allShops: { vi: 'Tất cả cửa hàng', en: 'All shops', th: 'ร้านค้าทั้งหมด', id: 'Semua toko', ja: '全ショップ', pt: 'Todas as lojas', zh: '全部店铺' },
    langNote: { vi: '', en: '', th: '', id: '', ja: '', pt: '', zh: '' },
    zone_sea: { vi: 'Đông Nam Á', en: 'Southeast Asia', th: 'เอเชียตะวันออกเฉียงใต้', id: 'Asia Tenggara', ja: '東南アジア', pt: 'Sudeste Asiático', zh: '东南亚' },
    zone_am: { vi: 'Châu Mỹ', en: 'Americas', th: 'อเมริกา', id: 'Amerika', ja: '南北アメリカ', pt: 'Américas', zh: '美洲' },
    zone_ea: { vi: 'Đông Á', en: 'East Asia', th: 'เอเชียตะวันออก', id: 'Asia Timur', ja: '東アジア', pt: 'Ásia Oriental', zh: '东亚' },
    switchMarket: { vi: 'Đổi sang site', en: 'Switch to', th: 'เปลี่ยนเป็น', id: 'Beralih ke', ja: '切り替え', pt: 'Mudar para', zh: '已切换到' },

    /* đăng nhập / đăng ký */
    a_loginTitle: { vi: 'Chào mừng trở lại', en: 'Welcome back', th: 'ยินดีต้อนรับกลับ', id: 'Selamat datang kembali', ja: 'おかえりなさい', pt: 'Bem-vindo de volta', zh: '欢迎回来' },
    a_loginSub: { vi: 'Đăng nhập để quản lý Creator và chiến dịch TikTok Shop.', en: 'Sign in to manage your TikTok Shop creators and campaigns.', th: 'เข้าสู่ระบบเพื่อจัดการครีเอเตอร์และแคมเปญ TikTok Shop', id: 'Masuk untuk mengelola kreator dan kampanye TikTok Shop.', ja: 'TikTok Shopのクリエイターとキャンペーンを管理します。', pt: 'Entre para gerenciar criadores e campanhas do TikTok Shop.', zh: '登录以管理 TikTok Shop 达人和推广活动。' },
    a_signupTitle: { vi: 'Tạo tài khoản GOPUSH', en: 'Create your GOPUSH account', th: 'สร้างบัญชี GOPUSH', id: 'Buat akun GOPUSH', ja: 'GOPUSHアカウントを作成', pt: 'Crie sua conta GOPUSH', zh: '创建 GOPUSH 账号' },
    a_signupSub: { vi: 'Dùng thử 7 ngày, không cần thẻ thanh toán.', en: '7-day free trial, no card required.', th: 'ทดลองใช้ฟรี 7 วัน ไม่ต้องใช้บัตร', id: 'Uji coba 7 hari, tanpa kartu.', ja: '7日間無料、カード不要。', pt: 'Teste grátis de 7 dias, sem cartão.', zh: '免费试用 7 天，无需绑定银行卡。' },
    a_google: { vi: 'Tiếp tục với Google', en: 'Continue with Google', th: 'ดำเนินการต่อด้วย Google', id: 'Lanjutkan dengan Google', ja: 'Googleで続行', pt: 'Continuar com o Google', zh: '使用 Google 继续' },
    a_or: { vi: 'hoặc dùng email', en: 'or use email', th: 'หรือใช้อีเมล', id: 'atau gunakan email', ja: 'またはメールで', pt: 'ou use o e-mail', zh: '或使用邮箱' },
    a_email: { vi: 'Email công việc', en: 'Work email', th: 'อีเมลที่ทำงาน', id: 'Email kerja', ja: '勤務先メール', pt: 'E-mail corporativo', zh: '工作邮箱' },
    a_password: { vi: 'Mật khẩu', en: 'Password', th: 'รหัสผ่าน', id: 'Kata sandi', ja: 'パスワード', pt: 'Senha', zh: '密码' },
    a_name: { vi: 'Họ và tên', en: 'Full name', th: 'ชื่อ-นามสกุล', id: 'Nama lengkap', ja: '氏名', pt: 'Nome completo', zh: '姓名' },
    a_company: { vi: 'Công ty / thương hiệu', en: 'Company / brand', th: 'บริษัท / แบรนด์', id: 'Perusahaan / merek', ja: '会社 / ブランド', pt: 'Empresa / marca', zh: '公司 / 品牌' },
    a_remember: { vi: 'Ghi nhớ đăng nhập', en: 'Remember me', th: 'จดจำฉัน', id: 'Ingat saya', ja: 'ログイン状態を保持', pt: 'Lembrar de mim', zh: '记住我' },
    a_forgot: { vi: 'Quên mật khẩu?', en: 'Forgot password?', th: 'ลืมรหัสผ่าน?', id: 'Lupa kata sandi?', ja: 'パスワードをお忘れですか？', pt: 'Esqueceu a senha?', zh: '忘记密码？' },
    a_login: { vi: 'Đăng nhập', en: 'Sign in', th: 'เข้าสู่ระบบ', id: 'Masuk', ja: 'ログイン', pt: 'Entrar', zh: '登录' },
    a_create: { vi: 'Tạo tài khoản', en: 'Create account', th: 'สร้างบัญชี', id: 'Buat akun', ja: 'アカウント作成', pt: 'Criar conta', zh: '创建账号' },
    a_noAcc: { vi: 'Chưa có tài khoản?', en: 'No account yet?', th: 'ยังไม่มีบัญชี?', id: 'Belum punya akun?', ja: 'アカウントをお持ちでない方', pt: 'Ainda não tem conta?', zh: '还没有账号？' },
    a_hasAcc: { vi: 'Đã có tài khoản?', en: 'Already have an account?', th: 'มีบัญชีแล้ว?', id: 'Sudah punya akun?', ja: 'アカウントをお持ちの方', pt: 'Já tem conta?', zh: '已有账号？' },
    a_terms: { vi: 'Tôi đồng ý với <a class="gm-link" href="#/terms">Điều khoản sử dụng</a> và <a class="gm-link" href="#/privacy">Chính sách bảo mật</a>.', en: 'I agree to the <a class="gm-link" href="#/terms">Terms of service</a> and <a class="gm-link" href="#/privacy">Privacy policy</a>.', th: 'ฉันยอมรับ<a class="gm-link" href="#/terms">ข้อกำหนด</a>และ<a class="gm-link" href="#/privacy">นโยบายความเป็นส่วนตัว</a>', id: 'Saya setuju dengan <a class="gm-link" href="#/terms">Ketentuan</a> dan <a class="gm-link" href="#/privacy">Kebijakan privasi</a>.', ja: '<a class="gm-link" href="#/terms">利用規約</a>と<a class="gm-link" href="#/privacy">プライバシーポリシー</a>に同意します。', pt: 'Concordo com os <a class="gm-link" href="#/terms">Termos</a> e a <a class="gm-link" href="#/privacy">Política de privacidade</a>.', zh: '我同意<a class="gm-link" href="#/terms">使用条款</a>和<a class="gm-link" href="#/privacy">隐私政策</a>。' },
    a_resetTitle: { vi: 'Đặt lại mật khẩu', en: 'Reset your password', th: 'รีเซ็ตรหัสผ่าน', id: 'Atur ulang kata sandi', ja: 'パスワードの再設定', pt: 'Redefinir senha', zh: '重置密码' },
    a_resetSub: { vi: 'Nhập email đã đăng ký, GOPUSH gửi liên kết đặt lại mật khẩu.', en: 'Enter your email and we will send a reset link.', th: 'กรอกอีเมลแล้วเราจะส่งลิงก์รีเซ็ตให้', id: 'Masukkan email, kami kirim tautan atur ulang.', ja: '登録メールに再設定リンクを送ります。', pt: 'Informe seu e-mail e enviaremos um link.', zh: '输入注册邮箱，GOPUSH 会发送重置密码链接。' },
    a_send: { vi: 'Gửi liên kết', en: 'Send link', th: 'ส่งลิงก์', id: 'Kirim tautan', ja: 'リンクを送信', pt: 'Enviar link', zh: '发送链接' },
    a_back: { vi: 'Quay lại đăng nhập', en: 'Back to sign in', th: 'กลับไปเข้าสู่ระบบ', id: 'Kembali ke masuk', ja: 'ログインに戻る', pt: 'Voltar para entrar', zh: '返回登录' },
    a_market: { vi: 'Thị trường chính', en: 'Primary market', th: 'ตลาดหลัก', id: 'Pasar utama', ja: 'メイン市場', pt: 'Mercado principal', zh: '主要市场' },
    a_pwHint: { vi: 'Ít nhất 8 ký tự, có chữ và số', en: 'At least 8 characters with letters and numbers', th: 'อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข', id: 'Minimal 8 karakter, huruf dan angka', ja: '8文字以上、英字と数字を含む', pt: 'Mínimo 8 caracteres, letras e números', zh: '至少 8 个字符，包含字母和数字' }
  };

  function navLabel(vi, en, lang) {
    if (lang === 'vi') return vi;
    if (lang === 'en') return en || vi;
    var row = NAV[vi];
    return row && IDX[lang] != null ? row[IDX[lang]] : vi;
  }
  /* thiếu bản dịch tay thì trả câu tiếng Việt để từ điển dịch tiếp (tiếng Anh thì dùng bản en) */
  function str(key, lang) {
    var o = STR[key]; if (!o) return key;
    return o[lang] != null ? o[lang] : (lang === 'en' && o.en != null ? o.en : o.vi);
  }

  /* ========================================================== từ điển toàn bộ nội dung */
  var DICT = {}, LOADING = {}, CUR = 'vi';
  var VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;
  /* chữ chỉ tiếng Việt mới có (không trùng tiếng Bồ Đào Nha): còn sau khi dịch nghĩa là câu chưa có trong từ điển */
  var VIX = /[ạảầấậẩẫăằắặẳẵẹẻẽềếệểễịỉĩọỏồốộổỗơờớợởỡụủũưừứựửữỳỵỷỹđĐ]/;
  var MISS = null;
  var ATTRS = ['placeholder', 'title', 'aria-label'];
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };
  var ORIG = new WeakMap(), AORIG = new WeakMap(), MINE = new WeakSet();

  function add(lang, obj) { var d = DICT[lang] || (DICT[lang] = {}); for (var k in obj) if (obj.hasOwnProperty(k)) d[k] = obj[k]; FIDX[lang] = null; }
  /* cụm không dùng khi dịch câu ghép: từ chức năng ngắn dễ trùng nghĩa khác (chỉ dịch khi đứng riêng một ô chữ) */
  var STOP = { 'Đã': 1, 'đã': 1, 'và': 1, 'của': 1, 'cho': 1, 'với': 1, 'các': 1, 'một': 1, 'sau': 1, 'trước': 1, 'đến': 1, 'từ': 1,
    'trong': 1, 'khóa': 1, 'mở': 1, 'là': 1, 'có': 1, 'không': 1, 'Hồ': 1 };
  /* chỉ mục cụm cho câu ghép: Map cụm → bản dịch, và số từ dài nhất cần thử */
  var FIDX = {};
  function fidx(lang) {
    if (FIDX[lang]) return FIDX[lang];
    var d = DICT[lang] || {}, m = new Map(), maxW = 1;
    Object.keys(d).forEach(function (k) {
      if (d[k] === k || k.length < 3 || STOP[k]) return;
      var n = k.split(' ').length; if (n > 80) return;
      m.set(k, d[k]); if (n > maxW) maxW = n;
      /* thêm bản bỏ dấu câu ở hai đầu: "” hết hạn sau" → "hết hạn sau" */
      var e = EDGE.exec(k), t = EDGE.exec(d[k]);
      if (e && e[2] && e[2] !== k && !m.has(e[2]) && e[2].length > 2 && !STOP[e[2]]) m.set(e[2], t && t[2] ? t[2] : d[k]);
    });
    return (FIDX[lang] = { m: m, maxW: maxW });
  }
  var EDGE = /^([“”"'(\[«]*)([\s\S]*?)([“”"')\].,:;!?…»]*)$/;
  /* thay từng cụm đã biết, ưu tiên cụm dài nhất bắt đầu tại mỗi từ; chỉ khớp trọn từ */
  function frag(src, lang) {
    var ix = fidx(lang), tk = src.split(/(\s+)/), out = [], i = 0;
    while (i < tk.length) {
      if (!tk[i] || /^\s+$/.test(tk[i])) { out.push(tk[i]); i++; continue; }
      var left = Math.floor((tk.length - i + 1) / 2), done = false;
      for (var n = Math.min(ix.maxW, left); n >= 1; n--) {
        var j = i + 2 * (n - 1), c = tk.slice(i, j + 1).join(''), e;
        if (ix.m.has(c)) { out.push(ix.m.get(c)); i = j + 1; done = true; break; }
        e = EDGE.exec(c);
        if (e && e[2] && ix.m.has(e[2])) { out.push(e[1] + ix.m.get(e[2]) + e[3]); i = j + 1; done = true; break; }
      }
      if (!done) { out.push(tk[i]); i++; }
    }
    return out.join('');
  }
  /* "tháng 10", "tháng 9/2026" → tên tháng theo ngôn ngữ */
  var LOC = { en: 'en-US', th: 'th-TH-u-ca-gregory', id: 'id-ID', ja: 'ja-JP', pt: 'pt-BR', zh: 'zh-CN' };
  function months(str, lang) {
    return str.replace(/(^|[^\p{L}])tháng (\d{1,2})(?:\/(\d{4}))?(?![\d\p{L}])/gu, function (m, pre, mo, y) {
      try {
        var o = { month: 'long' }; if (y) o.year = 'numeric';
        return pre + new Date(Number(y) || 2026, Number(mo) - 1, 1).toLocaleDateString(LOC[lang] || 'en-US', o);
      } catch (e) { return m; }
    });
  }
  function tr(src, lang) {
    if (lang === 'vi' || !src || !VI.test(src)) return src;
    var d = DICT[lang]; if (!d) return src;
    var t = src.replace(/\s+/g, ' ').trim(), lead = src.match(/^\s*/)[0], tail = src.match(/\s*$/)[0];
    if (d[t] != null) return lead + d[t] + tail;
    var core = t.replace(/^[\s·:–—,;|()“”"]+|[\s·:–—,;|()“”"]+$/g, '');
    if (core && core !== t && d[core] != null) return lead + t.replace(core, d[core]) + tail;
    /* câu có tên trong ngoặc kép hoặc có số: tra mẫu “{q0}”, {0} rồi điền lại
       (tên trong ngoặc được dịch riêng nếu có trong từ điển) */
    var qs = [], nums = [];
    var pat = t.replace(/“([^”]*)”/g, function (m, x) { qs.push(x); return '“\uE000”'; })
      .replace(/\d[\d.,:/]*/g, function (x) { nums.push(x); return '{' + (nums.length - 1) + '}'; });
    var qi = 0; pat = pat.replace(/\uE000/g, function () { return '{q' + (qi++) + '}'; });
    if ((qs.length || nums.length) && d[pat] != null) {
      return lead + d[pat].replace(/\{q(\d+)\}/g, function (m, i) { return qs[i] != null ? tr(qs[i], lang) : m; })
        .replace(/\{(\d+)\}/g, function (m, i) { return nums[i] != null ? nums[i] : m; }) + tail;
    }
    /* nhiều cụm nối bằng " · ": dịch từng cụm */
    if (t.indexOf(' · ') > 0) return lead + t.split(' · ').map(function (x) { return tr(x, lang); }).join(' · ') + tail;
    var out = frag(months(src, lang), lang);
    if (MISS && VIX.test(out)) MISS[t] = 1;
    return out;
  }
  function skip(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      if (SKIP[n.nodeName] || n.isContentEditable || n.hasAttribute('data-notr')) return true;
    }
    return false;
  }
  function doText(node) {
    var src = ORIG.has(node) ? ORIG.get(node) : node.data;
    if (!ORIG.has(node)) { if (!VI.test(src)) return; ORIG.set(node, src); }
    var out = tr(src, CUR); if (out !== node.data) { MINE.add(node); node.data = out; ORIG.set(node, src); }
  }
  function doAttrs(el) {
    var o = AORIG.get(el);
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute(a); if (v == null) continue;
      var src = o && o[a] != null && o.out && o.out[a] === v ? o[a] : v;
      if (!VI.test(src)) continue;
      var out = tr(src, CUR);
      if (!o) { o = { out: {} }; AORIG.set(el, o); }
      o[a] = src; o.out[a] = out;
      if (out !== v) { MINE.add(el); el.setAttribute(a, out); }
    }
  }
  var busy = false;
  function apply(root) {
    if (!root || (CUR === 'vi' && !root.__trDone)) return;
    busy = true;
    try {
      if (root.nodeType === 3) { if (!skip(root.parentNode)) doText(root); return; }
      if (root.nodeType !== 1 || skip(root)) return;
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
        acceptNode: function (n) {
          if (n.nodeType === 1 && SKIP[n.nodeName]) { if (n.nodeName === 'TEXTAREA') doAttrs(n); return NodeFilter.FILTER_REJECT; }
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      doAttrs(root);
      for (var n = w.nextNode(); n; n = w.nextNode()) {
        if (n.nodeType === 3) { if (!n.parentNode.isContentEditable) doText(n); } else doAttrs(n);
      }
    } finally { busy = false; }
  }
  var obs = new MutationObserver(function (list) {
    if (busy || CUR === 'vi') return;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'childList') for (var j = 0; j < m.addedNodes.length; j++) apply(m.addedNodes[j]);
      /* thay đổi do chính lớp dịch ghi vào thì bỏ qua, tránh dịch chồng lên bản đã dịch */
      else if (MINE.has(m.target)) { MINE.delete(m.target); continue; }
      else if (m.type === 'characterData') { ORIG.delete(m.target); apply(m.target); }
      else if (m.type === 'attributes') apply(m.target);
    }
  });
  function load(lang, cb) {
    if (lang === 'vi' || DICT[lang]) { cb && cb(); return; }
    if (LOADING[lang]) { LOADING[lang].push(cb); return; }
    LOADING[lang] = [cb];
    var sc = document.createElement('script');
    var ver = (document.querySelector('script[src*="i18n.js"]') || {}).src || '';
    sc.src = 'assets/i18n/' + lang + '.js' + (ver.indexOf('?') > -1 ? ver.slice(ver.indexOf('?')) : '');
    sc.onload = sc.onerror = function () { var q = LOADING[lang]; LOADING[lang] = null; if (!DICT[lang]) DICT[lang] = {}; q.forEach(function (f) { f && f(); }); };
    document.head.appendChild(sc);
  }
  /* đổi ngôn ngữ: nạp từ điển (nếu chưa có) rồi dịch lại toàn trang, kể cả phần đã dịch sang ngôn ngữ khác */
  function use(lang) {
    CUR = lang || 'vi';
    load(CUR, function () {
      if (CUR !== lang) return;
      document.body.__trDone = true;
      apply(document.body);
      if (global.APP && global.APP.title) global.APP.title();
    });
  }
  function start() {
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  global.I18N = { LANGS: LANGS, nav: navLabel, t: str, add: add, use: use, tr: function (s) { return tr(s, CUR); }, lang: function () { return CUR; },
    /* công cụ rà soát: bật ghi lại câu gốc chưa dịch được, rồi lấy danh sách */
    trackMisses: function () { MISS = MISS || {}; }, misses: function () { return Object.keys(MISS || {}); } };
})(window);
