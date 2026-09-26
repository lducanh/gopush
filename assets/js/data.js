/* inGo — sitemap và chuỗi của phần khung (điều hướng, thanh trên).
   Dữ liệu nghiệp vụ nằm ở store.js. */
(function (global) {
  'use strict';

  /* shop:true → đường dẫn theo shop, dạng /s/{shopId}/… */
  var MODULES = [
    {
      id: 'overview', icon: 'home', vi: 'Tổng quan', en: 'Overview', group: 'biz',
      pages: [
        { id: 'home', ic: 'home', path: '/home', vi: 'Trang chủ', en: 'Home',
          dvi: 'Thao tác nhanh, việc cần làm hôm nay và những gì đang chạy.',
          den: 'Quick actions, today’s to-do list and what is running now.' },
        { id: 'dashboard', ic: 'gauge', path: '/dashboard', vi: 'Dashboard', en: 'Dashboard',
          dvi: 'Số liệu gộp mọi shop hoặc từng shop, xem theo kỳ.',
          den: 'Aggregated metrics across shops or per shop, by period.' }
      ]
    },
    {
      id: 'creators', icon: 'users', vi: 'Creator', en: 'Creators', group: 'biz',
      pages: [
        { id: 'discover', ic: 'search', shop: true, path: '/s/{shop}/creators/discover', vi: 'Tìm Creator', en: 'Find creators',
          dvi: 'Lọc Creator đầy đủ các trường, lưu bộ lọc thành mẫu dùng lại.',
          den: 'Full-field creator filtering; save filters as reusable presets.' },
        { id: 'library', ic: 'users', shop: true, path: '/s/{shop}/creators/library', vi: 'Kho Creator', en: 'Creator library', badge: '1.284',
          dvi: 'Mọi Creator đã lưu, đã liên hệ hoặc đã hợp tác, kèm trạng thái quan hệ.',
          den: 'Every saved, contacted or partnered creator with relationship status.' },
        { id: 'tags', ic: 'tag', path: '/creators/tags', vi: 'Nhãn', en: 'Tags',
          dvi: 'Nhãn dùng chung cả nhóm, đếm số Creator mỗi nhãn.',
          den: 'Team-wide tags with creator counts.' },
        { id: 'blacklist', ic: 'ban', shop: true, path: '/s/{shop}/creators/blacklist', vi: 'Blacklist', en: 'Blacklist',
          dvi: 'Creator không bao giờ gửi; tự loại khỏi mọi chiến dịch và tự động hóa.',
          den: 'Never-contact creators; auto-excluded from campaigns and automations.' }
      ]
    },
    {
      id: 'campaigns', icon: 'folder', vi: 'Chiến dịch', en: 'Campaigns', group: 'biz',
      pages: [
        { id: 'invites', ic: 'send', shop: true, path: '/s/{shop}/campaigns/invites', vi: 'Lời mời hàng loạt', en: 'Bulk invites',
          dvi: 'Danh sách đợt mời và wizard 4 bước tạo lời mời có mục tiêu.',
          den: 'Invite batches and the 4-step targeted invite wizard.' },
        { id: 'messages', ic: 'msgSend', shop: true, path: '/s/{shop}/campaigns/messages', vi: 'Nhắn tin hàng loạt', en: 'Bulk messages',
          dvi: 'Danh sách đợt nhắn tin và wizard 4 bước tạo đợt gửi.',
          den: 'Message batches and the 4-step send wizard.' },
        { id: 'tasks', ic: 'sliders', shop: true, path: '/s/{shop}/campaigns/tasks', vi: 'Điều chỉnh kế hoạch', en: 'Plan adjustments',
          dvi: 'Dọn dẹp, bù Creator, gia hạn và thêm sản phẩm hàng loạt cho lời mời đã tạo.',
          den: 'Bulk clean-up, creator refill, renewal and product add-on for existing invitations.' },
        { id: 'templates', ic: 'template', path: '/templates', vi: 'Thư viện mẫu', en: 'Template library',
          dvi: 'Mẫu lời mời và mẫu tin nhắn dùng sẵn cho chiến dịch lẫn tự động hóa.',
          den: 'Invite and message templates shared by campaigns and automations.' }
      ]
    },
    {
      id: 'samples', icon: 'box', vi: 'Hàng mẫu', en: 'Samples', group: 'biz',
      pages: [
        { id: 'requests', ic: 'box', shop: true, path: '/s/{shop}/samples', vi: 'Yêu cầu hàng mẫu', en: 'Sample requests', badge: '12',
          dvi: 'Duyệt yêu cầu hàng mẫu theo trạng thái.',
          den: 'Approve sample requests by status.' },
        { id: 'shipments', ic: 'truck', shop: true, path: '/s/{shop}/samples/shipments', vi: 'Theo dõi vận đơn', en: 'Shipment tracking',
          dvi: 'Vận đơn mẫu lấy từ shop, theo đến lúc Creator lên video hoặc live.',
          den: 'Sample shipments from the shop, tracked until the creator posts.' }
      ]
    },
    {
      id: 'auto', icon: 'orbit', vi: 'Tự động hóa', en: 'Automation', group: 'biz',
      pages: [
        { id: 'auto-invites', ic: 'clock', shop: true, path: '/s/{shop}/auto/invites', vi: 'Lời mời tự động', en: 'Auto invites',
          dvi: 'Tự mời Creator mới khớp bộ lọc đã lưu theo lịch chạy hằng ngày.',
          den: 'Invite newly matching creators on a daily schedule.' },
        { id: 'auto-messages', ic: 'flash', shop: true, path: '/s/{shop}/auto/messages', vi: 'Tin nhắn tự động', en: 'Auto messages',
          dvi: 'Quy tắc dạng Khi → Gửi mẫu tin nhắn khi có sự kiện.',
          den: 'When → send rules triggered by creator events.' }
      ]
    },
    {
      id: 'reports', icon: 'chart', vi: 'Báo cáo', en: 'Reports', group: 'biz',
      pages: [
        { id: 'report-all', ic: 'chart', path: '/reports', vi: 'Báo cáo tổng', en: 'Overall report',
          dvi: 'Toàn bộ kết quả theo kỳ, biểu đồ theo ngày/tuần/tháng và bảng theo shop.',
          den: 'Period results, day/week/month charts and a per-shop table.' },
        { id: 'report-campaign', ic: 'trend', path: '/reports/campaigns', vi: 'Báo cáo theo chiến dịch', en: 'Campaign report',
          dvi: 'Kết quả và so sánh từng chiến dịch theo phễu chuyển đổi.',
          den: 'Per-campaign funnel results and comparison.' },
        { id: 'report-custom', ic: 'sliders', path: '/reports/custom', vi: 'Báo cáo custom', en: 'Custom report',
          dvi: 'Tự chọn bộ lọc, chỉ số và cách nhóm; lưu lại để mở nhanh lần sau.',
          den: 'Pick filters, metrics and grouping; save for later.' }
      ]
    },
    {
      id: 'ai', icon: 'ai', vi: 'inGo AI', en: 'inGo AI', group: 'biz',
      pages: [
        { id: 'ai-home', ic: 'chat', path: '/ai', vi: 'Trang chủ', en: 'Home',
          dvi: 'Hỏi bằng ngôn ngữ thường, AI quét dữ liệu trong hệ thống và trả về kết quả.',
          den: 'Ask in plain language; the assistant scans your data and answers.' },
        { id: 'ai-reports', ic: 'file', path: '/ai/reports', vi: 'Report', en: 'Reports', badge: '8',
          dvi: 'Report do AI tạo: xem, tải, xuất file, chia sẻ hoặc xóa.',
          den: 'AI-generated reports: view, download, export, share or delete.' },
        { id: 'ai-settings', ic: 'settings', path: '/ai/settings', vi: 'Setting', en: 'Settings',
          dvi: 'Dạy AI: nguồn dữ liệu được quét, tiêu chí chấm điểm, cách trả lời.',
          den: 'Train the assistant: data sources, scoring criteria, answer style.' }
      ]
    },
    {
      id: 'shops', icon: 'store', vi: 'Cửa hàng', en: 'Shops', group: 'admin',
      pages: [
        { id: 'shop-list', ic: 'store', path: '/shops', vi: 'Danh sách shop', en: 'Shop list',
          dvi: 'Ủy quyền OAuth, trạng thái token và lần đồng bộ gần nhất.',
          den: 'OAuth authorization, token status and last sync.' },
        { id: 'shop-detail', ic: 'building', path: '/shops/{shop}', vi: 'Chi tiết shop', en: 'Shop detail',
          dvi: 'Sản phẩm đã đồng bộ, giới hạn gửi mỗi ngày, người được giao.',
          den: 'Synced products, daily send limits and assignees.' }
      ]
    },
    {
      id: 'team', icon: 'team', vi: 'Nhóm', en: 'Team', group: 'admin',
      pages: [
        { id: 'members', ic: 'users', path: '/team/members', vi: 'Thành viên', en: 'Members',
          dvi: 'Mời qua email, giao shop cho từng người, khóa hoặc mở tài khoản.',
          den: 'Invite by email, assign shops, lock or unlock accounts.' },
        { id: 'roles', ic: 'shield', path: '/team/roles', vi: 'Vai trò & quyền', en: 'Roles & permissions',
          dvi: '4 vai trò mặc định với ma trận quyền theo module.',
          den: 'Four default roles with a per-module permission matrix.' },
        { id: 'audit', ic: 'history', path: '/team/audit', vi: 'Nhật ký hoạt động', en: 'Activity log',
          dvi: 'Ai làm gì, lúc nào, trên shop nào.',
          den: 'Who did what, when, on which shop.' }
      ]
    },
    {
      id: 'settings', icon: 'settings', vi: 'Cài đặt', en: 'Settings', group: 'admin',
      pages: [
        { id: 'profile', ic: 'user', path: '/settings/profile', vi: 'Hồ sơ', en: 'Profile',
          dvi: 'Thông tin, mật khẩu, bảo mật 2 lớp, ngôn ngữ và múi giờ.',
          den: 'Details, password, 2FA, language and time zone.' },
        { id: 'billing', ic: 'card', path: '/settings/billing', vi: 'Gói & thanh toán', en: 'Plan & billing',
          dvi: 'Gói hiện tại, hạn mức đã dùng và lịch sử hóa đơn.',
          den: 'Current plan, quota usage and invoice history.' },
        { id: 'notifications', ic: 'bell', path: '/settings/notifications', vi: 'Thông báo', en: 'Notifications',
          dvi: 'Chọn sự kiện nào báo qua email, Zalo OA hoặc trong app.',
          den: 'Choose which events notify by email, Zalo OA or in-app.' }
      ]
    }
  ];

  var PUBLIC = [
    { id: 'landing', path: '/', vi: 'Landing', en: 'Landing' },
    { id: 'login', path: '/login', vi: 'Đăng nhập', en: 'Sign in' },
    { id: 'signup', path: '/signup', vi: 'Đăng ký', en: 'Sign up' },
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


  global.DATA = { MODULES: MODULES, PUBLIC: PUBLIC, T: T };
})(window);
