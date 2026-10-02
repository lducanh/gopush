/* GOPUSH — mô hình dữ liệu Affiliate dùng cho giao diện: tên trường, enum, giới hạn.
   Được thiết kế để ánh xạ sang TikTok Shop Partner API (nhóm Affiliate Seller: tìm Creator,
   lời mời mục tiêu, hàng mẫu, đơn hàng). GOPUSH đang chờ cấp quyền ISV; khi có quyền sẽ đối
   chiếu lại từng trường với tài liệu Partner API chính thức trước khi kết nối.
   Bản demo không gọi bất kỳ API nào của TikTok — dữ liệu sinh sẵn trong store.js.
   Phần nào GOPUSH tự quyết định thì để ở store.js hoặc wizard.js. */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------- giới hạn cứng */
  var LIMIT = {
    nameMax: 30,             /* invitation_create.name */
    messageMax: 500,         /* invitation_create.message */
    productMin: 1,
    productMax: 100,         /* product_list */
    commissionMin: 100,      /* %×100 → 1% */
    commissionMax: 8000,     /* %×100 → 80% */
    creatorPerCampaign: 50,  /* TikTok cho tối đa 50 Creator mỗi lời mời */
    pageSize: 12             /* search_creators.pagination.size */
  };

  /* ---------------------------------------------------------- sắp xếp */
  var SORT = [
    { v: 1, l: 'Liên quan nhất' },
    { v: 18, l: 'GMV cao nhất' },
    { v: 20, l: 'Bán nhiều nhất' },
    { v: 22, l: 'Tương tác cao nhất' },
    { v: 24, l: 'Lượt xem cao nhất' },
    { v: 26, l: 'Nhiều follower nhất' }
  ];

  /* ---------------------------------------------------------- enum bộ lọc
     Bậc GMV và số món bán giữ nguyên giá trị gửi lên API (1…5), nhãn hiển thị
     quy đổi sang thang tiền Việt. Nếu TikTok VN trả về bậc khác thì chỉ sửa
     phần `l` và `min`/`max` ở đây. */
  var F = {
    avgCommission: {
      field: 'avg_commission_group', ui: 'Tỷ lệ hoa hồng trung bình', multi: false,
      opts: [{ v: 1, l: 'Dưới 5%', max: 5 }, { v: 2, l: 'Dưới 10%', max: 10 },
        { v: 3, l: 'Dưới 15%', max: 15 }, { v: 4, l: 'Dưới 20%', max: 20 }]
    },
    contentLabel: {
      field: 'content_label', ui: 'Loại nội dung', multi: false,
      opts: [{ v: 1, l: 'Video' }, { v: 2, l: 'LIVE' }]
    },
    agency: {
      field: 'managed_by_agency', ui: 'Agency của Creator', multi: false,
      opts: [{ v: 1, l: 'Có agency' }, { v: 2, l: 'Độc lập' }]
    },
    languages: {
      field: 'languages', ui: 'Ngôn ngữ nội dung', multi: true,
      opts: [{ v: '0', l: 'Tiếng Việt' }, { v: '1', l: 'Tiếng Anh' }]
    },
    ageGroups: {
      field: 'follower_age_groups', ui: 'Độ tuổi người theo dõi', multi: true,
      opts: [{ v: 1, l: '18 – 24' }, { v: 2, l: '25 – 34' }, { v: 4, l: '35 – 44' },
        { v: 5, l: '45 – 54' }, { v: 6, l: '55+' }]
    },
    gender: {
      field: 'gender_filter', ui: 'Giới tính người theo dõi', multi: false,
      opts: [{ v: 3, l: 'Nữ' }, { v: 2, l: 'Nam' }],
      defaultPercentage: 5000   /* %×100 */
    },
    gmv: {
      field: 'gmv_group_v2', ui: 'GMV', multi: true,
      opts: [{ v: 1, l: 'Dưới 50tr', min: 0, max: 5e7 },
        { v: 2, l: '50tr – 100tr', min: 5e7, max: 1e8 },
        { v: 3, l: '100tr – 500tr', min: 1e8, max: 5e8 },
        { v: 4, l: '500tr – 1 tỷ', min: 5e8, max: 1e9 },
        { v: 5, l: 'Trên 1 tỷ', min: 1e9, max: Infinity }]
    },
    unitsSold: {
      field: 'units_sold_group', ui: 'Số món bán ra', multi: true,
      opts: [{ v: 1, l: 'Dưới 10', min: 0, max: 10 }, { v: 2, l: '10 – 100', min: 10, max: 100 },
        { v: 3, l: '100 – 1.000', min: 100, max: 1000 }, { v: 4, l: 'Trên 1.000', min: 1000, max: Infinity }]
    },
    fulfillment: {
      field: 'sample_fulfillment_rate', ui: 'Tần suất đăng bài ước tính', multi: false,
      opts: [{ v: 2, l: 'Đạt' }, { v: 3, l: 'Tốt' }, { v: 4, l: 'Rất tốt' }]
    }
  };

  /* khoảng số: gửi lên dạng {left_bound, right_bound}, -1 nghĩa là không chặn trên */
  var RANGE = {
    followers: { field: 'follower_filter', ui: 'Tổng số người theo dõi', unit: 'người' },
    videoViews: { field: 'video_avg_views', ui: 'Lượt xem TB mỗi video', unit: 'lượt' },
    liveViewers: { field: 'live_avg_viewers', ui: 'Người xem TB mỗi LIVE', unit: 'người' },
    engagement: { field: 'video_avg_engagement', ui: 'Tỷ lệ tương tác', unit: '%', x100: true }
  };

  var FLAG = {
    risingStar: { field: 'is_rising_star', ui: 'Ngôi sao sáng tạo' },
    notInvited90: { field: 'has_invited_before_90d', ui: 'Chưa mời trong 90 ngày qua' }
  };

  /* ---------------------------------------------------------- kênh liên hệ */
  var CONTACT = [
    { v: 42, l: 'Zalo', ph: 'Số điện thoại tài khoản Zalo', cc: true, required: true },
    { v: 7, l: 'Email', ph: 'ten@congty.vn' },
    { v: 44, l: 'Facebook', ph: 'Link hoặc tên tài khoản' },
    { v: 45, l: 'Telegram', ph: '@username' },
    { v: 6, l: 'WhatsApp', ph: 'Số điện thoại', cc: true },
    { v: 41, l: 'Line', ph: 'Line ID' },
    { v: 43, l: 'Viber', ph: 'Số điện thoại', cc: true },
    { v: 46, l: 'Số điện thoại', ph: 'Số điện thoại liên hệ', cc: true }
  ];
  var COUNTRY_CODE = [{ v: 72, l: 'VN +84' }, { v: 72, l: 'TH +66' }, { v: 72, l: 'MY +60' }];

  /* ---------------------------------------------------------- lời mời */
  var CONTENT_OPTION = [
    { v: 1, l: 'Video link bán hàng', d: 'Ưu tiên video có gắn link sản phẩm.' },
    { v: 2, l: 'LIVE link bán hàng', d: 'Ưu tiên phiên LIVE có giỏ hàng.' },
    { v: 0, l: 'Khác', d: 'Creator tự chọn hình thức đăng.' }
  ];
  var SAMPLE_SETTING = { manualReview: 1, autoApprove: 2, productQuota: 3, dsRoi: 4 };
  var GROUP_TYPE = { normal: 1, plan: 2, campaign: 4, openapi: 5, brand: 6, auction: 9 };

  /* ---------------------------------------------------------- hạng mục sản phẩm
     Cây 2 cấp lấy từ /creator/marketplace/option (option_type = 2).
     Gửi lên dạng category_list: [{ string_list: [l1_id, l2_id] }]. */
  var CATEGORIES = [
    ['600001', 'Đồ gia dụng', [['600372', 'Đồ dùng phòng tắm (Bathroom Supplies)'], ['851848', 'Sắp xếp nhà cửa'],
      ['851976', 'Đồ dùng phòng tắm'], ['852104', 'Trang trí nội thất'], ['852232', 'Đồ gia dụng'],
      ['852360', 'Dụng cụ & phụ kiện giặt là'], ['852488', 'Đồ dùng lễ hội & tiệc tùng'], ['852616', 'Đồ gia dụng khác']]],
    ['600024', 'Đồ dùng nhà bếp', [['858504', 'Đồ để uống trà & cà phê'], ['858632', 'Dao nhà bếp'],
      ['858760', 'Tiệc nướng barbecue'], ['858888', 'Đồ dùng quầy rượu & đồ uống rượu'], ['859016', 'Đồ làm bánh'],
      ['859144', 'Đồ nấu ăn'], ['859272', 'Dao kéo & bộ đồ ăn'], ['859400', 'Bộ đồ uống'],
      ['859528', 'Đồ dùng & dụng cụ nhà bếp']]],
    ['600154', 'Hàng dệt & đồ nội thất mềm', [['808328', 'Chăn ga gối đệm'], ['809992', 'Hàng dệt gia dụng'],
      ['811016', 'Vải & đồ may']]],
    ['600942', 'Thiết bị gia dụng', [['844168', 'Thiết bị nhà bếp'], ['844808', 'Đồ gia dụng'],
      ['845064', 'Đồ gia dụng lớn'], ['845320', 'Thiết bị thương mại']]],
    ['601152', 'Trang phục nữ & đồ lót', [['842248', 'Áo nữ'], ['842376', 'Quần nữ'], ['842504', 'Váy nữ'],
      ['842632', 'Trang phục đặc biệt dành cho nữ'], ['842760', 'Bộ vét và quần yếm nữ'], ['842888', 'Đồ lót nữ'],
      ['843016', 'Đồ ngủ & đồ mặc nhà cho nữ']]],
    ['601303', 'Thời trang Hồi giáo', [['601304', 'Khăn trùm đầu (Hijab)'], ['601310', 'Trang phục phụ nữ Hồi giáo'],
      ['601325', 'Trang phục đàn ông Hồi giáo'], ['601331', 'Đồ mặc ngoài'], ['601339', 'Trang phục trẻ em Hồi giáo'],
      ['601343', 'Phụ kiện Hồi giáo'], ['601348', 'Trang phục & trang bị cầu nguyện'], ['838920', 'Đồ thể thao Hồi giáo'],
      ['839176', 'Thiết bị Umroh']]],
    ['601352', 'Giày dép', [['900488', 'Giày nữ'], ['900616', 'Giày nam'], ['900744', 'Phụ kiện giày']]],
    ['601450', 'Chăm sóc sắc đẹp & cá nhân', [['848648', 'Trang điểm'], ['848776', 'Dưỡng da'],
      ['848904', 'Chăm sóc & tạo kiểu tóc'], ['849032', 'Chăm sóc tay & chân'], ['849160', 'Đồ tắm & chăm sóc cơ thể'],
      ['849288', 'Chăm sóc dành cho nam giới'], ['849416', 'Thiết bị chăm sóc cá nhân'], ['849544', 'Chăm sóc mắt & tai'],
      ['849672', 'Chăm sóc mũi & răng miệng'], ['849800', 'Chăm sóc dành cho phụ nữ'], ['856208', 'Nước hoa'],
      ['981128', 'Chăm sóc cá nhân đặc biệt'], ['1086856', 'Chăm sóc móng tay']]],
    ['601739', 'Điện thoại & đồ điện tử', [['909064', 'Phụ kiện điện thoại'], ['909192', 'Camera & nhiếp ảnh'],
      ['909320', 'Âm thanh & video'], ['909448', 'Game & máy chơi game'], ['909576', 'Thiết bị thông minh & đeo'],
      ['909704', 'Thiết bị giáo dục'], ['978952', 'Phụ kiện đa năng'], ['984584', 'Phụ kiện máy tính bảng & máy tính'],
      ['995976', 'Điện thoại & máy tính bảng']]],
    ['601755', 'Máy tính & thiết bị văn phòng', [['824840', 'Máy tính để bàn, xách tay & bảng'],
      ['825352', 'Linh kiện máy tính'], ['826760', 'Thiết bị ngoại vi & phụ kiện'], ['828168', 'Phần mềm & bộ nhớ'],
      ['829192', 'Thành phần mạng'], ['830344', 'Thiết bị văn phòng'], ['831112', 'Văn phòng phẩm & vật tư']]],
    ['602118', 'Đồ dùng thú cưng', [['812168', 'Thức ăn cho chó & mèo'], ['812808', 'Nội thất cho chó & mèo'],
      ['813960', 'Quần áo cho chó & mèo'], ['815624', 'Cát vệ sinh cho chó & mèo'], ['816392', 'Đồ chải chuốt'],
      ['818184', 'Chăm sóc sức khỏe cho chó & mèo'], ['818696', 'Phụ kiện cho chó & mèo'],
      ['819848', 'Vật tư cho cá & loài sống dưới nước'], ['821000', 'Vật tư cho bò sát & lưỡng cư'],
      ['821896', 'Vật tư cho chim'], ['822792', 'Vật tư cho động vật nhỏ'], ['1001992', 'Vật tư cho gia cầm & gia súc']]],
    ['602284', 'Thai phụ & thai nhi', [['877320', 'Quần áo & giày trẻ em'], ['877576', 'Vật dụng khi cho bé đi du lịch'],
      ['877832', 'Cho bú & cho ăn'], ['878216', 'Nội thất cho trẻ em'], ['878600', 'An toàn cho bé'],
      ['878984', 'Đồ chơi trẻ em'], ['879112', 'Chăm sóc bé & sức khỏe'], ['879496', 'Sữa công thức & thực phẩm cho trẻ'],
      ['880008', 'Vật tư cho mẹ'], ['961928', 'Phụ kiện thời trang cho em bé']]],
    ['603014', 'Thể thao & ngoài trời', [['834568', 'Đồ thể thao & ngoài trời'], ['834696', 'Giày thể thao'],
      ['834824', 'Phụ kiện thể thao & ngoài trời'], ['834952', 'Thiết bị các môn bóng'],
      ['835080', 'Thiết bị thể thao dưới nước'], ['835208', 'Thiết bị thể thao mùa đông'], ['835336', 'Thiết bị tập thể hình'],
      ['835464', 'Đèn & đèn lồng'], ['835592', 'Thiết bị giải trí ngoài trời'], ['846224', 'Đồ bơi, lướt sóng & lặn'],
      ['936712', 'Cửa hàng dành cho người hâm mộ']]],
    ['604206', 'Đồ chơi & sở thích', [['859656', 'Búp bê & gấu bông'], ['859784', 'Đồ chơi giáo dục'],
      ['859912', 'Đồ chơi thể thao & ngoài trời'], ['860040', 'Đồ chơi điện & điều khiển từ xa'],
      ['860168', 'Trò chơi & ghép hình'], ['860296', 'Đồ chơi cổ điển & mới lạ'], ['860552', 'Nhạc cụ & phụ kiện'],
      ['951560', 'DIY']]],
    ['604453', 'Đồ nội thất', [['871048', 'Nội thất trong nhà'], ['871176', 'Nội thất ngoài trời'],
      ['871304', 'Nội thất trẻ em'], ['871432', 'Nội thất thương mại']]],
    ['604579', 'Công cụ & phần cứng', [['871560', 'Dụng cụ điện'], ['871688', 'Dụng cụ cầm tay'],
      ['871816', 'Dụng cụ đo lường'], ['871944', 'Dụng cụ làm vườn'], ['872072', 'Thiết bị hàn'],
      ['872200', 'Bộ sắp xếp dụng cụ'], ['872328', 'Phần cứng'], ['980488', 'Máy bơm & hệ thống đường ống']]],
    ['604968', 'Cải tạo nhà cửa', [['808208', 'Năng lượng mặt trời & gió'], ['872456', 'Đèn & hệ thống chiếu sáng'],
      ['872584', 'Đồ dùng & thiết bị điện'], ['872712', 'Đồ đạc nhà bếp'], ['872840', 'Hệ thống nhà thông minh'],
      ['872968', 'Vật tư xây dựng'], ['873096', 'Đồ đạc nhà tắm'], ['873224', 'An ninh & an toàn'],
      ['873352', 'Vật dụng làm vườn']]],
    ['605196', 'Ô tô & xe máy', [['809488', 'Bộ phận thay thế cho ô tô'], ['809616', 'Linh kiện mô tô'],
      ['929928', 'Thiết bị điện tử trên ô tô'], ['930056', 'Phụ kiện bên ngoài ô tô'], ['930184', 'Phụ kiện nội thất ô tô'],
      ['940296', 'Dụng cụ sửa chữa ô tô'], ['940424', 'Đèn xe'], ['940680', 'Xe quads, lưu động & thuyền'],
      ['940808', 'Rửa & bảo dưỡng ô tô'], ['940936', 'Phụ kiện xe máy']]],
    ['605248', 'Phụ kiện thời trang', [['810128', 'Nối tóc & tóc giả'], ['843144', 'Vải may váy'],
      ['888592', 'Phụ kiện đám cưới'], ['905224', 'Phụ kiện quần áo'], ['905352', 'Kính mắt'],
      ['905480', 'Đồng hồ & phụ kiện'], ['905608', 'Phục sức & phụ kiện'], ['905864', 'Phụ kiện tóc']]],
    ['700437', 'Đồ ăn & đồ uống', [['809744', 'Sữa và bơ sữa'], ['914824', 'Đồ uống'], ['914952', 'Thực phẩm ăn liền'],
      ['915080', 'Đồ dùng nấu ăn cần thiết'], ['915208', 'Nướng bánh'], ['915336', 'Đồ ăn vặt']]],
    ['700645', 'Sức khỏe', [['700646', 'Thực phẩm bổ sung'], ['924424', 'Vật tư y tế'], ['924552', 'Sức khỏe tình dục'],
      ['950792', 'Thuốc & phương pháp điều trị thay thế']]],
    ['802184', 'Thời trang trẻ em', [['802312', 'Quần áo bé trai'], ['803592', 'Quần áo bé gái'],
      ['805128', 'Giày dép bé trai'], ['806024', 'Giày dép bé gái'], ['806792', 'Phụ kiện thời trang trẻ em']]],
    ['824328', 'Trang phục nam & đồ lót', [['839944', 'Áo nam'], ['840072', 'Quần nam'],
      ['840328', 'Trang phục đặc biệt dành cho nam'], ['840456', 'Đồ lót nam'], ['840584', 'Đồ ngủ & mặc nhà cho nam'],
      ['840712', 'Bộ vét và quần yếm nam']]],
    ['824584', 'Hành lý & túi xách', [['902408', 'Túi xách nữ'], ['902536', 'Túi xách nam'],
      ['902664', 'Hành lý & túi du lịch'], ['902792', 'Túi đa năng'], ['902920', 'Phụ kiện túi']]],
    ['834312', 'Sản phẩm trực tuyến', [['809232', 'Voucher']]],
    ['951432', 'Bộ sưu tập', [['809872', 'Bộ sưu tập văn hóa đương đại'], ['810000', 'Khung giường & đầu giường'],
      ['937736', 'Bộ sưu tập thể thao'], ['953352', 'Giải trí']]],
    ['953224', 'Phụ kiện trang sức & phái sinh', [['961800', 'Pha lê không tự nhiên'], ['964232', 'Đá bán quý'],
      ['964360', 'Đá quý nhân tạo'], ['964488', 'Ngọc trai'], ['964616', 'Hổ phách'], ['964744', 'Mellite']]]
  ];

  /* thương hiệu đã cộng tác — /creator/marketplace/option option_type = 1 */
  var BRANDS = [
    { v: 'b01', l: '1300’S Coffee' }, { v: 'b02', l: 'Lumi Skin' }, { v: 'b03', l: 'Nara Home' },
    { v: 'b04', l: 'Cocoon' }, { v: 'b05', l: 'Vinamilk' }, { v: 'b06', l: 'Điện Máy Xanh' },
    { v: 'b07', l: 'Highlands Coffee' }, { v: 'b08', l: 'Bitis' }, { v: 'b09', l: 'Kangaroo' },
    { v: 'b10', l: 'Sunhouse' }, { v: 'b11', l: 'Thiên Long' }, { v: 'b12', l: 'Hảo Hảo' },
    { v: 'b13', l: 'Lock&Lock' }, { v: 'b14', l: 'Elmich' }
  ];

  /* ---------------------------------------------------------- tra cứu nhanh */
  var catIndex = {};
  CATEGORIES.forEach(function (l1) {
    l1[2].forEach(function (l2) { catIndex[l2[0]] = { l1: l1[0], l1Name: l1[1], name: l2[1] }; });
  });

  function catName(l2id) { return catIndex[l2id] ? catIndex[l2id].name : ''; }
  function catL1(l2id) { return catIndex[l2id] ? catIndex[l2id].l1 : ''; }
  function catL1Name(l2id) { return catIndex[l2id] ? catIndex[l2id].l1Name : ''; }
  function optLabel(group, v) {
    var o = null;
    (F[group] ? F[group].opts : []).forEach(function (x) { if (String(x.v) === String(v)) o = x; });
    return o ? o.l : '';
  }

  global.TT = {
    LIMIT: LIMIT, SORT: SORT, F: F, RANGE: RANGE, FLAG: FLAG,
    CONTACT: CONTACT, COUNTRY_CODE: COUNTRY_CODE, CONTENT_OPTION: CONTENT_OPTION,
    SAMPLE_SETTING: SAMPLE_SETTING, GROUP_TYPE: GROUP_TYPE,
    CATEGORIES: CATEGORIES, BRANDS: BRANDS,
    catName: catName, catL1: catL1, catL1Name: catL1Name, optLabel: optLabel
  };
})(window);
