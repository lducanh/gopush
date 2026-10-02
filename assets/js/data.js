/* GOPUSH — sitemap và chuỗi của phần khung (điều hướng, thanh trên).
   Dữ liệu nghiệp vụ nằm ở store.js. */
(function (global) {
  'use strict';

  /* Sitemap theo vòng đời hợp tác: tìm → mời → gửi mẫu → nhận nội dung → đo kết quả.
     path cũ giữ nguyên để mọi liên kết trong app vẫn chạy; trang bị gộp để ở ALIASES.
     scope: 'multi'   gộp được mọi shop (bảng có thêm cột Shop khi chọn Tất cả cửa hàng)
            'shop'    thao tác trên một shop — khi đang ở Tất cả cửa hàng sẽ hỏi chọn shop
            'account' dùng chung mọi shop
     hidden: không hiện trên sidebar; navAs: mục sidebar được tô sáng khi mở trang này */
  var MODULES = [
    {
      id: 'overview', icon: 'home', vi: 'Tổng quan', en: 'Overview', group: 'biz',
      pages: [
        { id: 'home', ic: 'home', path: '/home', vi: 'Trang chủ', en: 'Home',
          dvi: 'Thao tác nhanh, việc cần làm hôm nay và những gì đang chạy.',
          den: 'Quick actions, today’s to-do list and what is running now.', scope: 'multi' },
        { id: 'inbox', ic: 'inbox', path: '/inbox', vi: 'Việc cần xử lý', en: 'Action inbox', scope: 'multi',
          dvi: 'Mọi việc chờ xử lý ở một nơi: mẫu chờ duyệt, vận đơn quá hạn, token hết hạn, chiến dịch lỗi.',
          den: 'Everything that needs action in one queue.' }
      ]
    },
    {
      id: 'creators', icon: 'users', vi: 'Creator', en: 'Creators', group: 'biz',
      pages: [
        { id: 'discover', ic: 'search', shop: true, path: '/s/{shop}/creators/discover', vi: 'Tìm Creator', en: 'Find creators',
          dvi: 'Tìm Creator mới qua API TikTok Shop theo đầy đủ điều kiện; lưu vào Kho để phân loại, gắn tag và phân tích bằng AI.',
          den: 'Search TikTok Shop creators (API) with full filters; filter by segment, save presets.', scope: 'shop' },
        { id: 'library', ic: 'database', shop: true, path: '/s/{shop}/creators/library', vi: 'Kho Creator', en: 'Creator library',
          dvi: 'Cơ sở dữ liệu Creator của bạn trên GOPUSH: đồng bộ từ TikTok Shop, tải lên từ file, sao lưu tự động mỗi ngày.',
          den: 'Your own creator database on GOPUSH: saved, uploaded, backed up daily.', scope: 'shop' },
        { id: 'segments', ic: 'layers', shop: true, feature: 'segments', path: '/s/{shop}/creators/segments', vi: 'Phân loại Creator', en: 'Creator segments',
          dvi: 'Tự tạo nhóm Creator (Macro, Mid-tier, Micro, Freecast…) bằng điều kiện; GOPUSH chia nhóm Creator trong Kho.',
          den: 'Define creator segments by conditions; matched against TikTok creator data.', scope: 'shop' },
        { id: 'tags', ic: 'tag', path: '/creators/tags', feature: 'segments', vi: 'Gắn Tag', en: 'Tags',
          dvi: 'Tạo tag dùng chung cả nhóm và gắn tag cho Creator để lọc, giao việc, chạy chiến dịch.',
          den: 'Team-wide tags; tag creators to filter, assign and target campaigns.', scope: 'account' },
        { id: 'blacklist', ic: 'ban', shop: true, path: '/s/{shop}/creators/blacklist', vi: 'Blacklist', en: 'Blacklist',
          dvi: 'Creator bị chặn: không bao giờ gửi lời mời, tin nhắn hay hàng mẫu; tự loại khỏi mọi chiến dịch và tự động hóa.',
          den: 'Never-contact creators; auto-excluded from campaigns and automations.', scope: 'shop' }
      ]
    },
    {
      id: 'collab', icon: 'send', vi: 'Hợp tác', en: 'Outreach', group: 'biz',
      pages: [
        { id: 'invites', ic: 'send', shop: true, path: '/s/{shop}/campaigns/invites', vi: 'Chiến dịch lời mời', en: 'Bulk invites',
          dvi: 'Danh sách đợt mời và wizard 4 bước tạo lời mời có mục tiêu.',
          den: 'Invite batches and the 4-step targeted invite wizard.', scope: 'multi' },
        { id: 'campaign-detail', ic: 'send', shop: true, path: '/s/{shop}/campaigns/c/{id}', vi: 'Chi tiết chiến dịch', en: 'Campaign',
          hidden: true, navAs: 'invites', scope: 'shop',
          dvi: 'Phễu, Creator, hàng mẫu, nội dung và kết quả của một chiến dịch.', den: 'Funnel, creators, samples, content and results.' },
        { id: 'messages', ic: 'msgSend', shop: true, path: '/s/{shop}/campaigns/messages', vi: 'Nhắn tin hàng loạt', en: 'Bulk messages',
          dvi: 'Danh sách đợt nhắn tin và wizard 4 bước tạo đợt gửi.',
          den: 'Message batches and the 4-step send wizard.', scope: 'multi' },
        { id: 'auto-invites', ic: 'clock', shop: true, feature: 'auto', path: '/s/{shop}/auto/invites', vi: 'Tự động hóa', en: 'Automation',
          dvi: 'Tự mời Creator mới khớp bộ lọc đã lưu theo lịch chạy hằng ngày.',
          den: 'Invite newly matching creators on a daily schedule.', scope: 'shop' },
        { id: 'auto-messages', ic: 'flash', shop: true, feature: 'auto', path: '/s/{shop}/auto/messages', vi: 'Tự động hóa', en: 'Automation',
          dvi: 'Quy tắc dạng Khi → Gửi mẫu tin nhắn khi có sự kiện.',
          den: 'When → send rules triggered by creator events.', scope: 'shop', hidden: true, navAs: 'auto-invites' },
        { id: 'tasks', ic: 'sliders', shop: true, path: '/s/{shop}/campaigns/tasks', vi: 'Điều chỉnh kế hoạch', en: 'Plan adjustments',
          dvi: 'Dọn dẹp, bù Creator, gia hạn và thêm sản phẩm hàng loạt cho lời mời đã tạo.',
          den: 'Bulk clean-up, creator refill, renewal and product add-on for existing invitations.', scope: 'shop' },
        { id: 'templates', ic: 'template', path: '/templates', vi: 'Thư viện mẫu', en: 'Template library',
          dvi: 'Mẫu lời mời và mẫu tin nhắn dùng sẵn cho chiến dịch lẫn tự động hóa.',
          den: 'Invite and message templates shared by campaigns and automations.', scope: 'account' }
      ]
    },
    {
      id: 'samples', icon: 'box', vi: 'Hàng mẫu', en: 'Samples', group: 'biz',
      pages: [
        { id: 'requests', ic: 'box', shop: true, path: '/s/{shop}/samples', vi: 'Yêu cầu hàng mẫu', en: 'Sample requests', badge: '12',
          dvi: 'Duyệt yêu cầu hàng mẫu theo trạng thái.',
          den: 'Approve sample requests by status.', scope: 'shop' },
        { id: 'shipments', ic: 'truck', shop: true, path: '/s/{shop}/samples/shipments', vi: 'Theo dõi vận đơn', en: 'Shipment tracking',
          dvi: 'Vận đơn mẫu lấy từ shop, theo đến lúc Creator lên video hoặc live.',
          den: 'Sample shipments from the shop, tracked until the creator posts.', scope: 'shop' }
      ]
    },
    {
      id: 'results', icon: 'chart', vi: 'Kết quả', en: 'Results', group: 'biz',
      pages: [
        { id: 'dashboard', ic: 'gauge', path: '/dashboard', vi: 'Dashboard', en: 'Dashboard',
          dvi: 'Số liệu gộp mọi shop hoặc từng shop, xem theo kỳ.',
          den: 'Aggregated metrics across shops or per shop, by period.', scope: 'multi' },
        { id: 'report-campaign', ic: 'trend', path: '/reports/campaigns', vi: 'Theo chiến dịch', en: 'Campaign report',
          dvi: 'Kết quả và so sánh từng chiến dịch theo phễu chuyển đổi.',
          den: 'Per-campaign funnel results and comparison.', scope: 'multi' },
        { id: 'report-custom', ic: 'sliders', path: '/reports/custom', vi: 'Báo cáo custom', en: 'Custom report',
          dvi: 'Tự chọn bộ lọc, chỉ số và cách nhóm; lưu lại để mở nhanh lần sau.',
          den: 'Pick filters, metrics and grouping; save for later.', scope: 'account' },
      ]
    },
    {
      /* GOPUSH AI là một mục mẹ trong Nghiệp vụ: bấm vào mới xổ các trang con */
      id: 'ai', icon: 'ai', vi: 'GOPUSH AI', en: 'GOPUSH AI', group: 'biz',
      pages: [
        { id: 'ai-chat', ic: 'chat', path: '/ai/chat', feature: 'ai', vi: 'AI Chat', en: 'AI Chat',
          dvi: 'Trò chuyện với GOPUSH AI về cách dùng hệ thống và dữ liệu Creator, chiến dịch, hàng mẫu, doanh thu.',
          den: 'Chat about the system and your creator, campaign, sample and revenue data.', scope: 'multi' },
        { id: 'ai-reports', ic: 'file', path: '/ai/reports', feature: 'report', vi: 'Report AI', en: 'AI reports',
          dvi: 'Quét dữ liệu chiến dịch, đánh giá kết quả, chỉ ra nguyên nhân và việc nên làm.',
          den: 'Scan campaign data, evaluate results, find causes and next actions.', scope: 'account' },
        { id: 'ai-find', ic: 'search', shop: true, path: '/s/{shop}/ai/creators', feature: 'ai', vi: 'AI Tìm Creator', en: 'AI creator finder',
          dvi: 'AI quét Kho Creator theo điều kiện, cửa hàng, sản phẩm hoặc nội dung, chấm điểm độ phù hợp.',
          den: 'Find creators by criteria, shop, product or content style, with a fit score.', scope: 'shop' },
        { id: 'ai-content', ic: 'edit', shop: true, path: '/s/{shop}/ai/content', feature: 'ai', vi: 'Content AI', en: 'Content AI',
          dvi: 'Viết kịch bản video, caption, kịch bản LIVE, lời mời Creator từ sản phẩm của shop hoặc từ prompt.',
          den: 'Write scripts, captions, LIVE run-sheets and invites from shop products or a prompt.', scope: 'shop' },
        { id: 'ai-settings', ic: 'settings', path: '/ai/settings', feature: 'ai', vi: 'Cài đặt AI', en: 'AI settings',
          dvi: 'Dạy AI: nguồn dữ liệu được quét, tiêu chí chấm điểm, cách trả lời.',
          den: 'Train the assistant: data sources, scoring criteria, answer style.', scope: 'account' }
      ]
    },
    {
      /* không nằm trong menu chính: một dòng "Cài đặt" ghim ở đáy sidebar, các trang chuyển bằng thanh tab */
      id: 'business', icon: 'settings', vi: 'Cài đặt hệ thống', en: 'System settings', group: 'settings',
      pages: [
        { id: 'shop-list', ic: 'store', path: '/shops', vi: 'Cửa hàng', en: 'Shops',
          dvi: 'Ủy quyền OAuth, trạng thái token và lần đồng bộ gần nhất.',
          den: 'OAuth authorization, token status and last sync.', scope: 'account' },
        { id: 'shop-detail', ic: 'building', path: '/shops/{shop}', vi: 'Chi tiết shop', en: 'Shop detail',
          dvi: 'Sản phẩm đã đồng bộ, giới hạn gửi mỗi ngày, người được giao.',
          den: 'Synced products, daily send limits and assignees.', scope: 'account', hidden: true, navAs: 'shop-list' },
        { id: 'members', ic: 'users', path: '/team/members', vi: 'Thành viên', en: 'Members',
          dvi: 'Mời qua email, giao shop cho từng người, khóa hoặc mở tài khoản.',
          den: 'Invite by email, assign shops, lock or unlock accounts.', scope: 'account' },
        { id: 'roles', ic: 'shield', path: '/team/roles', vi: 'Vai trò & quyền', en: 'Roles & permissions',
          dvi: '4 vai trò mặc định với ma trận quyền theo module.',
          den: 'Four default roles with a per-module permission matrix.', scope: 'account' },
        { id: 'audit', ic: 'history', path: '/team/audit', vi: 'Nhật ký hoạt động', en: 'Activity log',
          dvi: 'Ai làm gì, lúc nào, trên shop nào.',
          den: 'Who did what, when, on which shop.', scope: 'account' },
        { id: 'billing', ic: 'card', path: '/settings/billing', vi: 'Gói & thanh toán', en: 'Plan & billing',
          dvi: 'Gói hiện tại, hạn mức đã dùng và lịch sử hóa đơn.',
          den: 'Current plan, quota usage and invoice history.', scope: 'account' },
        { id: 'notifications', ic: 'bell', path: '/settings/notifications', vi: 'Thông báo', en: 'Notifications',
          dvi: 'Chọn sự kiện nào báo qua email, Zalo OA hoặc trong app.',
          den: 'Choose which events notify by email, Zalo OA or in-app.', scope: 'account' },
        { id: 'sys-announce', ic: 'bell', path: '/admin/announcements', vi: 'Thông báo hệ thống', en: 'System announcements', adminOnly: true,
          dvi: 'Chỉ admin hệ thống: đăng thông báo ở thanh trên cùng cho người dùng, chọn đối tượng và thị trường.',
          den: 'System admins only: publish top-bar announcements by audience and market.', scope: 'account' },
        { id: 'profile', ic: 'user', path: '/settings/profile', vi: 'Hồ sơ', en: 'Profile',
          dvi: 'Thông tin, mật khẩu, bảo mật 2 lớp, ngôn ngữ và múi giờ.',
          den: 'Details, password, 2FA, language and time zone.', scope: 'account' }
      ]
    }
  ];

  /* trang cũ đã gộp → trang mới */
  var ALIASES = {
    '/reports': '/dashboard',
    '/ai': '/ai/chat'
  };

  var PUBLIC = [
    { id: 'landing', path: '/', vi: 'Landing', en: 'Landing' },
    { id: 'pricing', path: '/pricing', vi: 'Bảng giá', en: 'Pricing' },
    { id: 'login', path: '/login', vi: 'Đăng nhập', en: 'Sign in' },
    { id: 'signup', path: '/signup', vi: 'Đăng ký', en: 'Sign up' },
    { id: 'forgot', path: '/forgot', vi: 'Quên mật khẩu', en: 'Forgot password' },
    { id: 'privacy', path: '/privacy', vi: 'Chính sách bảo mật', en: 'Privacy policy' },
    { id: 'terms', path: '/terms', vi: 'Điều khoản sử dụng', en: 'Terms of service' }
  ];

  /* ---------------------------------------------------------- chuỗi khung */
  var T = {
    search: { vi: 'Tìm Creator, sản phẩm…', en: 'Search creators, products…' },
    quota: { vi: 'Hạn mức hôm nay', en: 'Today’s quota' },
    notif: { vi: 'Thông báo', en: 'Notifications' },
    biz: { vi: 'Nghiệp vụ', en: 'Business' },
    admin: { vi: 'Quản trị', en: 'Admin' },
    allShops: { vi: 'Tất cả cửa hàng', en: 'All shops' },
    signout: { vi: 'Đăng xuất', en: 'Sign out' },
    langNote: {
      vi: 'Tiếng Việt là ngôn ngữ chính. Bản EN mới dịch điều hướng và tiêu đề trang, sẽ hoàn thiện sau.',
      en: 'Vietnamese is the primary language. The EN build covers navigation and page headings only, for now.'
    },
    collapse: { vi: 'Thu gọn sidebar', en: 'Collapse sidebar' },
    expand: { vi: 'Mở rộng sidebar', en: 'Expand sidebar' },
    theme: { vi: 'Đổi nền sáng/tối', en: 'Toggle light/dark' },
    public: { vi: 'Trang công khai', en: 'Public pages' },
    openApp: { vi: 'Vào ứng dụng', en: 'Open the app' },
    lang: { vi: 'Tiếng Việt', en: 'English' },
    quotaLabel: { vi: 'Hạn mức hôm nay', en: 'Today’s quota' },
    help: { vi: 'Trợ giúp', en: 'Help' },
    support: { vi: 'Hỗ trợ', en: 'Support' },
    supportTitle: { vi: 'Liên hệ hỗ trợ', en: 'Contact support' }
  };


  global.DATA = { MODULES: MODULES, ALIASES: ALIASES, PUBLIC: PUBLIC, T: T };
})(window);
