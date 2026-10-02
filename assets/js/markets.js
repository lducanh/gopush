/* GOPUSH — các thị trường (site) TikTok Shop mà GOPUSH hỗ trợ.
   Mỗi thị trường có kho dữ liệu riêng (shop, sản phẩm, Creator, vận chuyển) và tiền tệ riêng.
   Số tiền trong kho lưu theo một đơn vị gốc (VND); store.js quy đổi bằng `rate` khi hiển thị,
   nên mọi bộ lọc và ngưỡng nội bộ giữ nguyên ý nghĩa ở mọi thị trường. */
(function (global) {
  'use strict';

  var MARKETS = [
    { code: 'VN', flag: '🇻🇳', name: 'Việt Nam', en: 'Vietnam', cur: '₫', iso: 'VND', rate: 1, loc: 'vi-VN', lang: 'vi', tz: '(UTC+7) Hồ Chí Minh', zone: 'sea' },
    { code: 'TH', flag: '🇹🇭', name: 'Thái Lan', en: 'Thailand', cur: '฿', iso: 'THB', rate: 700, loc: 'th-TH', lang: 'th', tz: '(UTC+7) Bangkok', zone: 'sea' },
    { code: 'ID', flag: '🇮🇩', name: 'Indonesia', en: 'Indonesia', cur: 'Rp', iso: 'IDR', rate: 1.6, loc: 'id-ID', lang: 'id', tz: '(UTC+7) Jakarta', zone: 'sea' },
    { code: 'MY', flag: '🇲🇾', name: 'Malaysia', en: 'Malaysia', cur: 'RM', iso: 'MYR', rate: 5600, loc: 'ms-MY', lang: 'en', tz: '(UTC+8) Kuala Lumpur', zone: 'sea' },
    { code: 'PH', flag: '🇵🇭', name: 'Philippines', en: 'Philippines', cur: '₱', iso: 'PHP', rate: 440, loc: 'en-PH', lang: 'en', tz: '(UTC+8) Manila', zone: 'sea' },
    { code: 'SG', flag: '🇸🇬', name: 'Singapore', en: 'Singapore', cur: 'S$', iso: 'SGD', rate: 19000, loc: 'en-SG', lang: 'en', tz: '(UTC+8) Singapore', zone: 'sea' },
    { code: 'US', flag: '🇺🇸', name: 'Hoa Kỳ', en: 'United States', cur: '$', iso: 'USD', rate: 25000, loc: 'en-US', lang: 'en', tz: '(UTC−5) New York', zone: 'am' },
    { code: 'BR', flag: '🇧🇷', name: 'Brasil', en: 'Brazil', cur: 'R$', iso: 'BRL', rate: 4600, loc: 'pt-BR', lang: 'pt', tz: '(UTC−3) São Paulo', zone: 'am' },
    { code: 'JP', flag: '🇯🇵', name: 'Nhật Bản', en: 'Japan', cur: '¥', iso: 'JPY', rate: 170, loc: 'ja-JP', lang: 'ja', tz: '(UTC+9) Tokyo', zone: 'ea' }
  ];
  var ZONES = { sea: 'Đông Nam Á', am: 'Châu Mỹ', ea: 'Đông Á' };

  /* sản phẩm theo ngôn ngữ: [cà phê ×10, làm đẹp ×4, nhà cửa ×4] — đúng thứ tự sản phẩm của bản gốc */
  var P_EN = [
    ['Cold Brew 250ml – 4 pack', 'Drip Coffee Bags (10)', 'Insulated Tumbler 500ml', 'Holiday Gift Set', 'Instant Coffee Sticks (20)',
     'Marble Ceramic Mug', 'Bold Ground Coffee 500g', 'Peach Cold Brew 250ml', 'Pour-over Filter Set', 'Premium Coffee Gift Box'],
    ['B5 Repair Serum 30ml', 'Sunscreen SPF50', 'Gentle Facial Cleanser', 'Hydrating Sheet Mask (10)'],
    ['Cotton Bedding Set', 'Wooden Night Lamp', 'Cast Iron Pot 24cm', 'Floor Rug 160cm']
  ];
  var P_ID = [
    ['Cold Brew 250ml – isi 4', 'Kopi Drip Bag (10)', 'Tumbler 500ml', 'Hampers Kopi', 'Kopi Sachet (20)',
     'Mug Keramik Marmer', 'Kopi Bubuk Bold 500g', 'Cold Brew Peach 250ml', 'Set Saringan Kopi', 'Kotak Hadiah Premium'],
    ['Serum B5 30ml', 'Sunscreen SPF50', 'Sabun Cuci Muka Lembut', 'Masker Wajah (10)'],
    ['Set Sprei Katun', 'Lampu Tidur Kayu', 'Panci Besi Cor 24cm', 'Karpet 160cm']
  ];
  var P_PT = [
    ['Cold Brew 250ml – pack 4', 'Café Drip em Sachê (10)', 'Copo Térmico 500ml', 'Kit Presente Café', 'Café Solúvel (20)',
     'Caneca Cerâmica Mármore', 'Café Moído Intenso 500g', 'Cold Brew Pêssego 250ml', 'Kit Coador', 'Caixa Presente Premium'],
    ['Sérum B5 30ml', 'Protetor Solar FPS50', 'Sabonete Facial Suave', 'Máscara Hidratante (10)'],
    ['Jogo de Cama Algodão', 'Luminária de Madeira', 'Panela de Ferro 24cm', 'Tapete 160cm']
  ];
  var P_JA = [
    ['コールドブリュー 250ml 4本', 'ドリップバッグ 10袋', '真空タンブラー 500ml', 'ギフトセット', 'スティックコーヒー 20本',
     '大理石柄マグ', '深煎りコーヒー粉 500g', 'ピーチ コールドブリュー', 'ドリッパーセット', 'プレミアムギフトボックス'],
    ['B5 リペアセラム 30ml', '日焼け止め SPF50', 'やさしい洗顔フォーム', '保湿シートマスク 10枚'],
    ['コットン寝具セット', '木製ナイトランプ', '鋳鉄鍋 24cm', 'ラグ 160cm']
  ];

  /* dữ liệu địa phương cho từng thị trường; VN dùng nguyên bộ gốc trong store.js */
  var LOCAL = {
    TH: { shops: ['Siam Brew Coffee', 'Bloom Skin TH', 'Baan Home Living', 'Chiang Craft'], products: P_EN,
      first: ['Somchai', 'Nattapong', 'Kanya', 'Siriporn', 'Ploy', 'Ananda', 'Thanawat', 'Pimchanok', 'Kittipong', 'Chanida', 'Arthit', 'Jirapat'],
      last: ['Srisuk', 'Wongsawat', 'Chaiyaporn', 'Rattanakul', 'Boonmee', 'Sukjai', 'Phongsri', 'Thongdee'],
      regions: ['Bangkok', 'Chiang Mai', 'Phuket', 'Khon Kaen', 'Pattaya'],
      carriers: ['Kerry Express', 'Flash Express', 'J&T Express', 'Thailand Post'] },
    ID: { shops: ['Kopi Nusantara', 'Glow Ayu Beauty', 'Rumah Rapi', 'Batik Lestari'], products: P_ID,
      first: ['Putri', 'Rizky', 'Dewi', 'Ayu', 'Fajar', 'Siti', 'Budi', 'Nadia', 'Intan', 'Andi', 'Dimas', 'Sari'],
      last: ['Pratama', 'Wijaya', 'Saputra', 'Lestari', 'Hidayat', 'Kusuma', 'Santoso', 'Permata'],
      regions: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Bali'],
      carriers: ['JNE', 'SiCepat', 'J&T Express', 'AnterAja'] },
    MY: { shops: ['Kopi Kaya Co.', 'Seri Glow', 'Rumah Kaya Living', 'Borneo Craft'], products: P_EN,
      first: ['Aisyah', 'Hafiz', 'Nurul', 'Amir', 'Farah', 'Syafiq', 'Wei Ling', 'Jia Hui', 'Kavitha', 'Arjun', 'Izzati', 'Danial'],
      last: ['Abdullah', 'Rahman', 'Tan', 'Lim', 'Wong', 'Ismail', 'Ng', 'Kumar'],
      regions: ['Kuala Lumpur', 'Penang', 'Johor Bahru', 'Selangor', 'Kota Kinabalu'],
      carriers: ['Pos Laju', 'J&T Express', 'Ninja Van', 'DHL eCommerce'] },
    PH: { shops: ['Barako Brew PH', 'Luma Skin PH', 'Bahay Home', 'Isla Crafts'], products: P_EN,
      first: ['Maria', 'Juan', 'Angel', 'Mark', 'Kristine', 'Paolo', 'Bea', 'Miguel', 'Joy', 'Carlo', 'Nicole', 'Jericho'],
      last: ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Villanueva', 'Ramos'],
      regions: ['Metro Manila', 'Cebu', 'Davao', 'Quezon City', 'Iloilo'],
      carriers: ['J&T Express', 'LBC', 'Ninja Van', 'Flash Express'] },
    SG: { shops: ['Kopi Lab SG', 'Dew Skin SG', 'Nest Home SG', 'Merlion Gifts'], products: P_EN,
      first: ['Wei Jie', 'Hui Min', 'Rachel', 'Jun Hao', 'Priya', 'Darren', 'Shu Ting', 'Nicholas', 'Aisha', 'Bryan'],
      last: ['Tan', 'Lim', 'Lee', 'Ng', 'Ong', 'Goh', 'Chua', 'Teo'],
      regions: ['Central', 'East', 'West', 'North', 'North-East'],
      carriers: ['Ninja Van', 'SingPost', 'J&T Express', 'Qxpress'] },
    US: { shops: ['Cold Brew Co.', 'Lumi Skin US', 'Nara Home US', 'Kaya Living US'], products: P_EN,
      first: ['Emma', 'Olivia', 'Ava', 'Mia', 'Liam', 'Noah', 'Ethan', 'Mason', 'Sophia', 'Chloe', 'Madison', 'Tyler'],
      last: ['Smith', 'Johnson', 'Brown', 'Miller', 'Davis', 'Garcia', 'Wilson', 'Taylor', 'Moore', 'Clark'],
      regions: ['California', 'Texas', 'New York', 'Florida', 'Illinois'],
      carriers: ['USPS', 'UPS', 'FedEx', 'DHL'] },
    BR: { shops: ['Café do Vale', 'Lumi Pele', 'Casa Nara', 'Kaya Decor'], products: P_PT,
      first: ['Ana', 'Beatriz', 'Lucas', 'Gabriel', 'Mariana', 'Rafael', 'Juliana', 'Pedro', 'Camila', 'Thiago', 'Larissa', 'Mateus'],
      last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Almeida', 'Lima'],
      regions: ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Paraná'],
      carriers: ['Correios', 'Jadlog', 'Loggi', 'J&T Express'] },
    JP: { shops: ['Kissa Coffee Tokyo', 'Hada Lumi', 'Nara Kurashi', 'Kaya Zakka'], products: P_JA, familyFirst: true,
      first: ['Yuki', 'Haruka', 'Sakura', 'Ren', 'Sota', 'Aoi', 'Hina', 'Riku', 'Mei', 'Kaito', 'Yuna', 'Daiki'],
      last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura'],
      regions: ['Tokyo', 'Osaka', 'Kanagawa', 'Aichi', 'Fukuoka'],
      carriers: ['Yamato Transport', 'Sagawa Express', 'Japan Post', 'Seino'] }
  };

  function byCode(code) { return MARKETS.filter(function (m) { return m.code === code; })[0] || MARKETS[0]; }

  global.MARKETS = { list: MARKETS, zones: ZONES, local: LOCAL, get: byCode };
})(window);
