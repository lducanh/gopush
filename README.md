# GOPUSH — ứng dụng front-end chạy thử được

HTML/CSS/JS thuần cho GOPUSH v0.2: **10 module · 27 màn hình trong app · 4 trang công khai**.
Không backend, không build step, không framework — mở là chạy và **thao tác được thật**.

Toàn bộ dữ liệu nằm trong trình duyệt (`assets/js/store.js` sinh dữ liệu lần đầu rồi
lưu vào `localStorage`). Mọi thao tác — mời Creator, duyệt hàng mẫu, tạo chiến dịch,
gắn nhãn, đổi vai trò, sửa thiết lập — đều ghi vào dữ liệu đó và còn nguyên sau khi
tải lại trang. Muốn về trạng thái ban đầu: menu tài khoản → **Đặt lại dữ liệu thử**.

Chỗ duy nhất chưa nối là những gì bắt buộc phải có phía TikTok Shop: OAuth/ISV,
đồng bộ sản phẩm và đơn hàng thật, gửi lời mời và tin nhắn ra ngoài. Những nút đó
vẫn bấm được và vẫn cập nhật trạng thái trong app, chỉ không đi ra mạng.

## Thông tin liên hệ

Tên miền **gopush.asia** · Email **contact@gopush.asia** · Điện thoại / Zalo **0867.888.582**.

## Mở lên

Nhấp đúp `index.html`, hoặc chạy một server tĩnh cho mượt hơn:

```bash
python3 -m http.server 8000
# rồi mở http://localhost:8000
```

Trang đầu là landing công khai; nút **Vào ứng dụng** dẫn vào `#/home`.

## Cấu trúc

```
index.html              vỏ trang, nạp CSS + 10 script (font hệ thống, không tải font ngoài)
assets/css/tokens.css   token màu, chữ, khoảng cách, bo góc, kích thước (có theme tối)
assets/css/app.css      component gm-* + khung app, drawer, wizard, trang công khai
assets/js/icons.js      72 icon Lucide (lucide-static 0.544, ISC) nhúng sẵn, không gọi CDN
assets/js/tiktok.js     hợp đồng dữ liệu của TikTok Affiliate: enum, giới hạn, cây hạng mục
assets/js/store.js      sinh dữ liệu, lưu localStorage, truy vấn và thống kê
assets/js/data.js       sitemap 10 module + chuỗi VI/EN của phần khung
assets/js/ui.js         hàm dựng HTML dùng lại: bảng, thẻ số liệu, phễu, bộ lọc, stepper…
assets/js/charts.js     biểu đồ SVG thuần: đường, cột mảnh, tròn, thanh ngang, sparkline, vòng
assets/js/wizard.js     luồng tạo lời mời (4 bước) và tạo đợt nhắn tin (3 bước)
assets/js/pages.js      nội dung 28 màn hình + 5 trang công khai + drawer
                        (gồm Quản lý mẫu và Theo dõi vận đơn theo Affiliate Seller API)
assets/js/tasks.js      Điều chỉnh kế hoạch: 4 tác vụ xử lý hàng loạt trên lời mời đã tạo
assets/js/app.js        router theo hash, shell 3 tầng, bộ xử lý mọi thao tác
assets/img/             logo GOPUSH, favicon, banner trang chủ, ảnh trang đăng nhập
```

## Thiết kế

Toàn bộ CSS dựng theo design system **GoMax Console**: phẳng, gọn, nhiều thông tin,
nền trung tính kiểu Trung tâm doanh nghiệp TikTok, **màu đen** làm màu chủ đạo. Tên token trong `tokens.css` giữ đúng
như bản gốc (`bg-topbar`, `bg-canvas`, `accent`, `text-secondary`, `radius-md`…); token
nào bản gốc chưa có thì ghi chú "bổ sung" ngay trong file.

| Nhóm | Giá trị chính |
| --- | --- |
| Khung | top bar đen `#121415` · canvas `#f8f8f9` · card / sidebar `#ffffff` |
| Chữ | `#121415` chính · `#6d6e70` phụ · `#8a8a8a` meta 12px |
| Nhấn | đen `#121415` (nút, link, mục chọn) · `#f0f0f0` (nền chọn) · cyan `#0fd9d0` chỉ làm điểm sáng trên top bar |
| Trạng thái | xanh lá `#00a870` · cam `#e37318` · đỏ `#ca242e` |
| Viền | `border` `#d3d4d5` cho input / nút · `border-light` `#ececed` cho card / divider |
| Chữ | font hệ thống, 14px/22px, **chỉ hai độ đậm 400 và 500** |
| Bo góc | 4px tag · 6px nút, input, mục menu · 8px card · pill cho badge |
| Bóng | gần như không; chỉ menu nổi và drawer |
| Mục đang chọn | viền mảnh `--line-active` (đen 30%) + vòng mờ `--ring`, không dùng viền đen đặc; thẻ có icon màu lấy viền / nền theo màu icon |

Quy ước:

- **Nút**: mặc định là outline trung tính 36px. Nút chính (`gm-btn-primary`) nền **đen**
  `accent-dark` — màu chủ đạo, như nút "Thêm tài khoản nhà quảng cáo" của Trung tâm doanh
  nghiệp TikTok; tối đa một nút mỗi vùng. Nút nhỏ `gm-btn-sm` nền xám, không viền (Xem chi
  tiết, Hồ sơ); `gm-btn-soft` nền xám nhạt cho hành động nhanh trong bảng (Mời, Xem lỗi).
- **Trạng thái trong bảng** là chấm màu + chữ thường, không nền ("● Đã phê duyệt"); ngoài
  bảng mới dùng tag có nền.
- **Ô số liệu** (KPI, stat tile) cùng một kiểu trên mọi trang: nền canvas, icon đen, số
  20px, dòng so sánh kỳ trước.
- **Bảng**: cột ngày giờ, người, SKU, trạng thái giữ một dòng (`U.table` tự gắn class `nw`
  theo tên cột); ô Creator và sản phẩm tối đa 2 dòng, phần dư cắt bằng … và hiện đủ khi rê chuột.
- **Mục đang chọn** (menu, tab cấp hai, checkbox, radio, trang hiện tại, bước wizard)
  luôn dùng đen. Tab chính dùng vạch 2px màu chữ chính, giống trang Tài khoản của
  Trung tâm doanh nghiệp TikTok.
- **Link** chữ đen đậm, gạch chân khi rê chuột.
- **Tag** 22px bo 4px, nền nhạt + chữ đậm cùng tông: xanh lá thành công, cam cảnh báo,
  đỏ cho lỗi, tím nhạt cho loại.
- **Thẻ KPI / stat tile**: nền canvas, không viền, số 20px/500 tabular-nums.
- **Biểu đồ**: đường cong mềm, đen cho chuỗi chính, oải hương/teal/cát cho chuỗi so
  sánh (như biểu đồ Chi phí / Lần hiển thị của TikTok). Biểu đồ đường luôn đặt cạnh một
  donut cơ cấu theo tỉ lệ 2/3 – 1/3 để chữ trục không bị phóng to. Sparkline, phễu và bảng xếp hạng chỉ dùng một
  tông đen, nhạt dần theo thứ hạng.
- Chữ đặt trên nền đen dùng `--on-accent`: trắng ở theme sáng, đen ở theme tối để
  đủ tương phản.

**Theme tối** là phần bổ sung (bộ gốc chỉ có theme sáng): nền đen sâu, nút sáng để đủ tương phản.

**Icon** dùng bộ **Lucide** (`lucide-static` 0.544, giấy phép ISC), nhúng sẵn trong
`icons.js`, nét 1.5px, 16px (18px trên top bar).

## Logo

`assets/img/logo-gomax.webp` là logo **GOPUSH · BY GOMAX DIGITAL** lấy từ file GOMAX
được chỉ định. Trên top bar đen dùng nguyên bản. Trên nền sáng (hero trang
giới thiệu, thẻ đăng nhập) thêm class `ig-logo--ink` để đảo độ sáng logo.

## Khung ứng dụng

```
top bar đen 56px · logo | 🇻🇳 VN 1300'S Coffee ● ⌄ ....... [🔍 Tìm hoặc hỏi AI… ⌘K] ✦ 🔔⁷ [🐻 ⌄]
                          828/4.000 lời mời hôm nay ▬
sidebar 240px    · Nghiệp vụ: Tổng quan · Creator · Hợp tác · Hàng mẫu · Kết quả
                   Cài đặt hệ thống: một dòng ghim ở đáy sidebar, các trang chuyển bằng thanh tab
nội dung         · nền canvas; tiêu đề 24px + nhãn phạm vi nằm ngoài card, phần dưới gom vào card trắng
panel AI 400px   · mở bên phải từ ô tìm hoặc thanh hỏi dưới bảng, nội dung vẫn thao tác được
```

**Topbar gọn.** Logo, phạm vi shop (dòng dưới là hạn mức lời mời hôm nay, chuyển Brand Yellow khi
quá 80%), ô nhỏ **Tìm hoặc hỏi AI**, hai icon quan trọng và avatar.

- Ô tìm (⌘K / Ctrl K): gõ ra kết quả theo nhóm Creator · Chiến dịch · Trang, cộng dòng
  "Tìm trong Tìm Creator" và dòng **Hỏi GOPUSH AI** luôn ghim ở đáy; ô trống thì gợi ý
  hỏi AI về trang đang xem, Việc cần xử lý, tạo lời mời, tìm Creator. Dùng ↑ ↓ ↵ Esc.
- ✦ mở / đóng panel GOPUSH AI. 🔔 đếm việc tồn, bấm ra 5 việc gấp nhất kèm chấm mức độ
  và lối sang Việc cần xử lý.
- Menu avatar: hồ sơ, gói, ngôn ngữ (7 thứ tiếng), giao diện tối, trợ giúp & liên hệ, đặt lại dữ
  liệu thử, đăng xuất.

### Sitemap theo vòng đời hợp tác

| Module | Trang | Phạm vi |
| --- | --- | --- |
| Tổng quan | Trang chủ · **Việc cần xử lý** | gộp được |
| Creator | Tìm Creator · Kho Creator (Bảng / **Pipeline**, tải lên, sao lưu) · **Phân loại Creator** · Blacklist | theo shop |
| | Gắn Tag | dùng chung |
| Hợp tác | Chiến dịch lời mời · Nhắn tin hàng loạt | gộp được |
| | **Chi tiết chiến dịch** (ẩn khỏi menu, mở từ tên chiến dịch) · Tự động hóa (lời mời + tin nhắn) · Điều chỉnh kế hoạch | theo shop |
| | Thư viện mẫu | dùng chung |
| Hàng mẫu | Yêu cầu hàng mẫu · Theo dõi vận đơn | theo shop |
| Kết quả | Dashboard (đã gộp Báo cáo tổng) · Theo chiến dịch | gộp được |
| | Báo cáo custom | dùng chung |
| **GOPUSH AI** (nhóm riêng) | AI Chat · Report AI · Cài đặt AI | dùng chung |
| | AI Tìm Creator · Content AI | theo shop |
| Cài đặt hệ thống | Cửa hàng · Thành viên · Vai trò & quyền · Nhật ký · Gói & thanh toán · Thông báo · Hồ sơ | dùng chung |

Đường dẫn cũ giữ nguyên nên mọi liên kết vẫn chạy; `/reports` chuyển sang `/dashboard`,
`/ai` mở AI Chat (`ALIASES` trong `data.js`). Mỗi trang khai báo `scope`,
`hidden`, `navAs` ngay trong sitemap.

### Phạm vi xem

Bộ chọn trên top bar có thêm **Tất cả cửa hàng**. URL `/s/all/…` là phạm vi gộp, URL có shop
cụ thể thì thoát về shop đó. Trang gộp được thêm tên shop vào bảng; trang thao tác theo
shop (duyệt mẫu, tìm Creator…) hiện bộ chọn shop; trang dùng chung ghi rõ "Dùng chung mọi
shop" cạnh tiêu đề.

### Việc cần xử lý

Một hàng đợi duy nhất (`P.inboxItems`) tính từ dữ liệu: token hết hạn, mẫu chờ duyệt, Creator
nhận mẫu quá hạn, vận đơn đồng bộ lỗi, chiến dịch lỗi hoặc sắp hết hạn, quy tắc tự động
lỗi, hạn mức trên 80%. Mức độ Khẩn / Cảnh báo / Thường; giao người phụ trách và đánh dấu xong
được lưu trong `inboxState`. Chuông, badge sidebar và Trang chủ đều đọc từ đây.

### Chi tiết chiến dịch

`#/s/{shop}/campaigns/c/{id}`: phễu 6 bước bấm được (lọc tab tương ứng), dải thông tin
gửi / giãn cách / hạn / GMV, và 5 tab Creator trong đợt · Hàng mẫu · Nội dung · Kết quả ·
Nhật ký. Tạm dừng, Bù Creator, Gia hạn, Nhân bản, Xóa ngay trên đầu trang.

### Pipeline Creator

Kho Creator có nút Bảng / Pipeline. Pipeline chia 5 cột theo giai đoạn quan hệ, mỗi cột có
số Creator và tổng GMV; kéo thẻ sang cột khác để đổi giai đoạn (chuyển Mới → Đã mời sẽ hỏi
xác nhận vì gửi lời mời thật). Hồ sơ Creator có dòng thời gian: lời mời, chiến dịch, xin
mẫu, ký nhận, nội dung kèm lượt xem và đơn.

**Nút thu gọn** nằm trên vách sidebar; thu về cột icon 64px, màn hình dưới 1100px tự dùng dạng này.

## GOPUSH AI

Nhóm menu riêng trên sidebar (module `ai`, `flat: true` nên mỗi trang là một dòng có icon).
Code trang ở `assets/js/ai.js`, thao tác đi qua `dispatch('aix:…')`.

- **AI Chat** — kiểu ChatGPT: lịch sử bên trái, màn chào với 6 gợi ý, trả lời có các bước
  suy nghĩ hiện dần. Hỏi được cả số liệu lẫn cách dùng hệ thống (tạo chiến dịch, phân quyền).
- **Report AI** — khung tạo report: chọn chiến dịch, loại report, kỳ, định dạng và model GPT
  (GPT-5, GPT-5 mini, GPT-4.1, GPT-4o); chạy xong thêm vào danh sách và hiện bản report.
- **AI Tìm Creator** — 4 khối: theo điều kiện / cửa hàng / sản phẩm / nội dung. Kết quả
  chấm điểm phù hợp, lý do AI chọn, lưu từng người hoặc lưu tất cả vào Kho.
- **Content AI** — viết từ sản phẩm của shop, theo tiêu chí (văn phong, độ dài, ngôn ngữ)
  hoặc chỉ bằng prompt; 1–3 phương án, sao chép hoặc lưu vào Thư viện mẫu.
- **Cài đặt AI** — nguồn dữ liệu, tiêu chí chấm điểm, cách trả lời.

**Model AI ẩn với khách hàng.** Model đặt trong code (`AI_MODEL` ở đầu `ai.js`). Chỉ tài khoản
admin hệ thống (`AUTH.isAdmin()`) thấy bộ chọn model và thẻ "Model AI (OpenAI)" trong Cài đặt AI.

Các lựa chọn trên trang AI dùng **bộ chọn dạng filter** (`AIX.pick`): nút gọn "Nhãn: giá trị ▾",
bấm mới mở danh sách, có ô tìm khi trên 7 mục, chọn một hoặc nhiều.

**Report AI** đi theo form 6 bước: chiến dịch → câu hỏi report cần trả lời → kỳ và mốc so sánh →
KPI mục tiêu → người đọc → ghi chú. Report trả lời thẳng câu hỏi ở đầu (Đạt / Đạt một phần /
Chưa đạt), rồi chỉ số so với mốc, phễu có đánh dấu khâu nghẽn và GMV bị bỏ lỡ, đánh giá từng
chiến dịch (Mở rộng / Giữ / Tối ưu khâu mẫu / Dừng), Creator tạo ra kết quả, và danh sách việc
nên làm kèm tác động ước tính (₫), người làm, hạn. Tải CSV hoặc In / PDF.

Mỗi lần chạy AI là một job có thanh tiến độ, danh sách bước và khung xương nhấp nháy
(`runJob` trong `ai.js`); phần tiến độ cập nhật thẳng vào `#aix-job`, không vẽ lại cả trang.
Hiện là dữ liệu mô phỏng, chưa gọi API OpenAI thật.

Nút **GOPUSH AI** trên top bar (và thanh hỏi nhanh dưới bảng) vẫn mở panel bên phải để hỏi
về trang đang xem.

## Thị trường và ngôn ngữ

Nút **🇻🇳 VN** trên thanh trên đổi **site**: 9 thị trường TikTok Shop — Việt Nam, Thái Lan,
Indonesia, Malaysia, Philippines, Singapore (Đông Nam Á), Hoa Kỳ, Brasil, Nhật Bản. Mỗi site có
kho dữ liệu riêng (`gopush.db.v8.<mã>` trong localStorage): shop, sản phẩm, tên Creator, khu vực,
hãng vận chuyển và tiền tệ của nước đó. Danh sách và dữ liệu địa phương ở `assets/js/markets.js`.

Số tiền lưu theo một đơn vị gốc (VND) và quy đổi khi hiển thị (`S.money`, `S.amt`, `S.vnd`), nên
mọi bộ lọc, ngưỡng và phân tích chạy giống nhau ở mọi site. Tỷ giá trong `markets.js` là tỷ giá
cố định để demo. **Cách hiển thị theo từng thị trường** (`store.js`):

| Thị trường | Ngôn ngữ mặc định | Tiền | Rút gọn số (follower, GMV…) | Ngày · giờ |
| --- | --- | --- | --- | --- |
| VN | Tiếng Việt | 1.234.000 ₫ | 12K · 1,7tr · 2,1 tỷ | 24/09/2026 · 14:30 |
| TH | ไทย | ฿1,234 | 12K · 1.7M | 24/09/2026 · 14:30 |
| ID | Bahasa Indonesia | Rp 1.234 | 12 rb · 1,7 jt · 2,1 M | 24/09/2026 · 14:30 |
| MY, PH, SG | English | RM / ₱ / S$ | 12K · 1.7M | 24/09/2026 · 14:30 |
| US | English | $1,234 | 12K · 1.7M | 09/24/2026 · 2:30 PM |
| BR | Português | R$ 1.234 | 12 mil · 1,7 mi | 24/09/2026 · 14:30 |
| JP | 日本語 | ¥1,234 | 1.2万 · 1.7億 | 2026/09/24 · 14:30 |

Đổi thị trường thì **đổi luôn ngôn ngữ** theo bảng trên (vẫn chọn lại ngôn ngữ khác được ở nút 🌐).
Kho dữ liệu của mỗi site sinh theo đúng định dạng đó: tên Creator, tên nhân sự, shop, khu vực, hãng
vận chuyển, tiền, ngày. Mọi mốc thời gian trong dữ liệu mẫu tính lùi từ ngày giờ thật (`S.today()`).

### Dịch toàn bộ nội dung

Ngôn ngữ: Tiếng Việt (gốc), English, ไทย, Bahasa Indonesia, 日本語, Português, 中文. Hai lớp dịch
(`assets/js/i18n.js`):

1. **Bảng dịch tay** (`NAV`, `STR`): menu, tiêu đề trang, thanh trên, đăng nhập / đăng ký.
2. **Từ điển toàn bộ nội dung** `assets/i18n/<lang>.js` (~2.800 câu mỗi ngôn ngữ, chỉ nạp file của
   ngôn ngữ đang chọn). Sau mỗi lần vẽ, lớp dịch quét chữ hiển thị, `placeholder`, `title`,
   `aria-label` (kể cả popup, toast, biểu đồ): khớp nguyên câu trước, không khớp thì thay từng cụm đã
   biết trong câu ghép (câu có số, tên, ngày); "tháng 10" đổi thành tên tháng theo ngôn ngữ. Phần tử
   có `data-notr` thì không dịch. Đổi về tiếng Việt khôi phục chữ gốc, không cần tải lại trang.

Thêm hoặc sửa câu chữ:

```bash
python3 tools/i18n-extract.py tools/i18n/source.json   # lấy mọi câu tiếng Việt trong assets/js
# dịch các câu còn thiếu, thêm file tools/i18n/tr/<lang>.<n>.json ({"câu gốc": "bản dịch"});
# file số lớn hơn ghi đè file số nhỏ hơn
python3 tools/i18n-build.py tools/i18n/tr               # sinh assets/i18n/<lang>.js, báo câu còn thiếu
```

Bản dịch hiện có do máy dịch theo bảng thuật ngữ (lời mời, hàng mẫu, vận đơn…); trước khi phát
hành nên nhờ người bản ngữ duyệt từng file. Khi làm bản thật, nên chuyển dần sang khóa dịch
(`t('invite.send')`) cho các câu ghép để đúng trật tự từ ở mọi ngôn ngữ.

## Gói dịch vụ

`assets/js/plans.js`. Bốn gói, giá theo tháng; gói năm = giá tháng × 12 × 0,8 rồi làm tròn về giá
gần nhất có phần nghìn kết thúc bằng 099 / 299 / 399 / 599 / 699 / 999 (`nice()`):

| Gói | Tháng | Năm | Cửa hàng | Tác vụ song song | Tài khoản | Mời / nhắn tin mỗi ngày |
| --- | --- | --- | --- | --- | --- | --- |
| Dùng thử | 0 (7 ngày) | — | 1 | 2 | 1 chính | 1.000 |
| Cơ bản | 399.000 | 3.699.000 | 2 | 2 | 1 chính | 3.000 |
| Chuyên nghiệp | 1.299.000 | 12.399.000 | 8 | 8 | 1 chính + 1 phụ | 10.000 |
| Cao cấp | 2.699.000 | 25.999.000 | 20 | 20 | 1 chính + 9 phụ | Không giới hạn |

Hạn mức áp vào hệ thống (`PLANS.check / room / take`):

- **Lời mời và tin nhắn mỗi ngày tính chung cho cả tài khoản**, cộng mọi cửa hàng: gói Chuyên nghiệp
  10.000/ngày, một shop dùng 6.000 thì các shop còn lại chỉ còn 4.000. Mọi điểm gửi (mời lẻ, mời
  hàng loạt, quy tắc tự động, kéo thẻ sang "Đã mời", nhắn tin, nhắc vận đơn, tạo đợt) đều trừ vào
  hạn mức này; gửi hàng loạt chỉ gửi đến khi hết hạn mức. Gói Cao cấp không giới hạn.
- Mỗi shop vẫn có **giới hạn an toàn riêng** trong Cài đặt shop; chạm giới hạn này chỉ báo, không
  mời nâng gói.
- **Tác vụ song song** = số shop chạy chiến dịch cùng lúc.
- Thêm cửa hàng, mời thành viên vượt mức → popup không đủ quyền. Đã ở gói cao nhất mà chạm giới
  hạn → popup chữ (không mời nâng gói), kèm liên hệ hỗ trợ.

Gói, đơn chờ thanh toán, hóa đơn, phương thức thanh toán và ngày gia hạn **thuộc về tài khoản**
(`gopush.db.v8.billing.<uid>`), giống nhau ở mọi thị trường. Nâng gói trả phí tạo **đơn chờ thanh
toán**, không tự kích hoạt; cổng thanh toán để trống chờ tích hợp. Dùng thử kích hoạt ngay, cố định
7 ngày. Không hạ gói giữa kỳ. Trang **Bảng giá** công
khai ở `#/pricing`; trong app, **Gói & thanh toán** có hạn mức đã dùng, đổi tháng/năm, nâng gói
(trừ phần còn lại của gói cũ), bảng so sánh và hóa đơn. Thanh toán hiện là mô phỏng.

Trang chủ công khai (`assets/js/landing.js`): hero kèm mô phỏng màn hình, dải số liệu, "một nền
tảng thay Excel", 4 nhóm tính năng, 4 bước bắt đầu, bảng giá rút gọn, dải kêu gọi dùng thử.

## Thông báo hệ thống

Thanh nhỏ trên cùng của app (`assets/js/announce.js`), kiểu Trung tâm doanh nghiệp TikTok:
chuyển 1/N (tự chuyển 8 giây), nội dung, nút kèm mũi tên, nút đóng. Đóng thì thanh thu lại và
khung app lấy lại chiều cao. Admin hệ thống quản lý ở **Cài đặt hệ thống › Thông báo hệ thống**
(`#/admin/announcements`, chỉ admin thấy): nội dung, chữ trên nút, liên kết, màu, đối tượng (mọi
người / chỉ khách hàng / khách dùng thử), thị trường; có xem trước. Màu có sẵn (vàng nhạt, xanh
dương nhạt, đỏ cam, xanh ngọc, tím, hồng TikTok) hoặc **tự chọn màu** — chữ tự đổi đậm / trắng
cho đủ tương phản. **Hiện tối đa** 1–5 thông báo hoặc tất cả (theo thứ tự mới nhất). Bấm × chỉ ẩn tạm: tải lại trang
hoặc đăng nhập lại là hiện lại. Bản demo lưu thông báo ở localStorage của trình duyệt.

## Tài khoản và cơ cấu quyền

`assets/js/auth.js` (đăng nhập), `link.js` (liên kết gian hàng), `plans.js` (gói, popup không đủ
quyền). Mọi trang trong app yêu cầu đăng nhập (`#/login?next=…`). Sau khi đăng nhập, quyền được
kiểm tra theo **3 lớp, đúng thứ tự** (`canOpen` / `denyFor` trong `app.js`):

| Lớp | Điều kiện | Khi chưa đạt | Trang vẫn mở |
| --- | --- | --- | --- |
| 1. Liên kết gian hàng | Đã ủy quyền gian hàng TikTok Shop (`AUTH.linked()`) | Popup **Bạn chưa liên kết gian hàng** → mở **Hướng dẫn liên kết** | Trang chủ, Cửa hàng, Gói & thanh toán, Hồ sơ |
| 2. Gói | Gói có tính năng / còn hạn mức (`PLANS.has`, `PLANS.check`) | Về Trang chủ + popup **Không đủ quyền** (gấu) | Như trên khi chưa có gói |
| 3. Vai trò | Trang `adminOnly` cần admin hệ thống | Về Trang chủ + popup chữ **Trang dành cho quản trị** | — |

Tính năng theo gói: Dùng thử = Tìm Creator, Kho Creator, chiến dịch, hàng mẫu, báo cáo (1 cửa hàng,
không tài khoản phụ); Cơ bản thêm Phân loại / Gắn Tag, Tự động hóa; Chuyên nghiệp và Cao cấp thêm
GOPUSH AI và Report AI. Hạn mức cửa hàng, tài khoản phụ, lời mời mỗi ngày theo bảng ở mục Gói.

**Popup hiển thị ở đâu**

| Popup | Hiện khi | Đóng / tiếp theo |
| --- | --- | --- |
| Hướng dẫn liên kết (4 bước, nút mở link ủy quyền) | Tự mở sau mỗi lần đăng nhập nếu chưa liên kết; nút "Liên kết ngay" ở Trang chủ; thao tác ở trang Cửa hàng | × / "Để sau" / bấm ra ngoài / Esc. "Tôi đã ủy quyền xong" → kiểm tra → đồng bộ dữ liệu → mở tính năng theo gói |
| Bạn chưa liên kết gian hàng | Chưa liên kết mà bấm module, mở trang, bấm thao tác, bấm GOPUSH AI | "Để sau" / "Xem hướng dẫn liên kết" |
| Không đủ quyền (gấu, đốm sáng) | Vượt hạn mức, tính năng gói không có, chưa có gói | Về Trang chủ; × / ra ngoài / Esc để đóng; bấm banner mở Gói & thanh toán |
| Popup chữ (không mời nâng gói) | Trang chỉ dành cho admin; gói Cao cấp chạm giới hạn | "Đã hiểu" / "Liên hệ hỗ trợ" |
| Thông báo hệ thống (thanh dưới top bar) | Mỗi lần tải trang / đăng nhập | × ẩn tạm tới lần tải sau |

Link ủy quyền: `tiktokAuthUrl` trong `auth-config.js` (demo:
`https://services.tiktokshop.com/open/authorize?service_id=7520124419516778246`; khi được cấp ISV
thay bằng link OAuth chính thức, kết quả ủy quyền thay cho nút "Tôi đã ủy quyền").

> **Bản thật kiểm tra quyền ở máy chủ.** Bản demo kiểm tra liên kết, gói, vai trò và hạn mức ngay
> trên trình duyệt để người duyệt thử được mọi luồng. Khi có backend, mọi kiểm tra này phải chạy ở
> máy chủ (API từ chối khi không đủ quyền); phần giao diện chỉ để hiển thị popup cho đúng.

**Tài khoản demo — mỗi tài khoản một luồng** (chỉ ở chế độ demo). Danh sách đăng nhập nhanh **chỉ
hiện qua link dành cho người duyệt** `#/login?review=1` (nhớ trong phiên), khách thường không thấy.
Mỗi lần đăng nhập, tài khoản demo tự về trạng thái ban đầu; có nút đặt lại thủ công:

| Email / mật khẩu | Liên kết | Gói | Vai trò | Luồng kiểm tra |
| --- | --- | --- | --- | --- |
| `admin@gopush.asia` / `Admin@2026` | ✓ | Cao cấp | Admin hệ thống | Toàn quyền, trang quản trị (Thông báo hệ thống), model AI |
| `doanhnghiep@gopush.asia` / `Demo@2026` | ✓ | Cao cấp | Khách | Khách dùng đầy đủ tính năng; trang admin bị chặn |
| `coban@gopush.asia` / `Basic@2026` | ✓ | Cơ bản | Khách | GOPUSH AI, Report AI bị khóa |
| `dungthu@gopush.asia` / `Trial@2026` | ✓ | Dùng thử | Khách | 1 cửa hàng; Phân loại, Tự động hóa, AI bị khóa; vượt hạn mức → popup |
| `moi@gopush.asia` / `New@2026` | ✗ | Chưa có gói | Khách | **Mỗi lần đăng nhập như vừa tạo**: bắt ủy quyền → mọi module hiện popup gói → "Bắt đầu dùng thử" |
| `lienket@gopush.asia` / `Link@2026` | ✗ | Dùng thử | Khách | Popup hướng dẫn liên kết khi đăng nhập; liên kết xong mới dùng được |
| Tự đăng ký | ✗ | Chưa có gói | Khách | Đủ luồng: liên kết → chọn gói / dùng thử |

Mỗi tài khoản một kho dữ liệu riêng (`gopush.db.v8.<thị trường>.<uid>`), sinh ra đã cắt đúng
hạn mức gói; chưa liên kết thì kho trống. Gói và trạng thái liên kết lưu theo tài khoản.
**Tài khoản demo tự đặt lại mỗi lần đăng nhập:** về đúng gói, trạng thái liên kết và dữ liệu
chỉ định trong bảng trên; nâng gói, liên kết hay thao tác thử ở lần trước không mang sang.

- **Mua gói không tự nâng cấp:** tóm tắt đơn → bước thanh toán (cổng thanh toán để trống chờ tích
  hợp) → đơn "Chờ thanh toán"; gói chỉ đổi khi thanh toán được xác nhận. Dùng thử thì kích hoạt ngay.
- **Chế độ demo** (mặc định): tài khoản lưu trong trình duyệt, mật khẩu băm PBKDF2-SHA256.
  Google và email đặt lại mật khẩu báo cần cấu hình.
- **Tài khoản thật + Google:** điền cấu hình Firebase vào `assets/js/auth-config.js` (hướng dẫn
  trong file), bật Email/Password và Google trong Firebase Authentication, thêm tên miền vào
  Authorized domains.

## Module Creator

Phần mở rộng nằm ở `assets/js/creators.js`, thao tác qua `dispatch('crx:…')`.

- **Tìm Creator** — dữ liệu TikTok Shop (API); thêm bộ lọc **Phân loại**.
- **Kho Creator** — kho dữ liệu riêng trên GOPUSH. Dải sao lưu (tự động 02:00, tải bản sao lưu,
  sao lưu ngay) và **Tải lên** file CSV: khớp theo Username, không tạo trùng, tự tạo Tag mới,
  có file mẫu. File Excel cần lưu thành CSV UTF-8.
- **Phân loại Creator** — người dùng tự thêm nhóm (mặc định: Mega, Macro, Mid-tier, Micro, Nano,
  Freecast, LIVE seller) bằng điều kiện trên Follower, GMV, tỉ lệ đăng, GPM, lượt xem, người xem
  LIVE, ngành hàng, quốc gia, loại nội dung, liên hệ. Số Creator khớp cập nhật ngay khi gõ;
  bấm "Tìm Creator" để mở Tìm Creator đã lọc sẵn.
- **Gắn Tag** — tạo tag và gắn nhanh bằng cách dán danh sách username.
- **Blacklist** — Creator bị chặn.

Mọi trang của module đều có nút **Tải xuống** (CSV, mở được bằng Excel).

**Nguồn dữ liệu.** Chỉ **Tìm Creator** gọi API TikTok Shop. Phân loại Creator, Gắn Tag, AI Tìm
Creator, AI Chat và Report AI đều khai thác **Kho Creator** (dữ liệu đã đồng bộ về GOPUSH và sao
lưu hằng ngày; `CRX.kho(shopId)` trong `creators.js`). Đầu mỗi trang có dải `ig-srcnote` ghi rõ
trang đang đọc từ API hay từ Kho. Kho trống thì AI Tìm Creator hiện hướng dẫn lưu / tải lên trước.

## Hỗ trợ

Nút tròn cố định ở góc dưới bên phải của mọi trang, kể cả trang công khai. Rê chuột
hoặc bấm là mở popup gọn với ba kênh: gọi điện, Zalo OA và email. Mỗi kênh là một
link thật (`tel:` 0867.888.582, `zalo.me/0867888582`, `mailto:contact@gopush.asia`) nên bấm là mở ứng dụng tương ứng.

## Mật độ

Giao diện cho người thao tác cả ngày nên ưu tiên nhìn được nhiều dữ liệu:

- Một trang danh sách gồm tiêu đề ngoài card, rồi trong card: tab → thanh lọc → bảng →
  phân trang. Các khối chỉ ngăn bằng hairline.
- Control trong thanh lọc cao **32px**, chữ 13px; panel lọc nâng cao là một khối nền
  canvas bên trong card, nút Đặt lại nằm ở góc.
- Ô bảng đệm 12px trên dưới, header nền canvas, chữ 13px/500.
- Card padding 16px / 24px, khoảng cách giữa các card 12px, lưới 4px.

## Bộ lọc

Không xếp hết điều kiện ra màn hình. Mỗi trang chọn một mức phù hợp:

| Trang | Kiểu lọc |
| --- | --- |
| Tìm Creator | 1 hàng gọn (tìm + 3 điều kiện hay dùng) + nút **Bộ lọc** mở panel 4 nhóm; chips tóm tắt điều kiện đang bật |
| Kho Creator, Nhật ký | 1 hàng gọn, không có panel |
| Yêu cầu hàng mẫu, Vận đơn | 1 hàng gọn + chips cho điều kiện đặc biệt |
| Báo cáo custom | panel mở sẵn, chia 2 nhóm Phạm vi / Chỉ số |

Control trong thanh lọc dùng cỡ nhỏ 32px (`.gm-input-sm`) để một hàng chứa đủ.
Panel nâng cao đóng/mở bằng `data-act="filters"`, nút đổi viền và chữ sang Oracle Red khi đang mở.

## Đường dẫn

Router chạy theo hash. Trang gắn shop có dạng `#/s/{shopId}/…`, còn lại ở cấp tài khoản.

| Module | Đường dẫn |
| --- | --- |
| Tổng quan | `#/home` (mặc định) · `#/dashboard` |
| Creator | `#/s/{shop}/creators/discover` · `…/library` · `…/segments` · `#/creators/tags` · `…/blacklist` |
| Chiến dịch | `#/s/{shop}/campaigns/invites` · `…/messages` · `…/tasks` · `#/templates` |
| Hàng mẫu | `#/s/{shop}/samples` · `…/samples/shipments` |
| Tự động hóa | `#/s/{shop}/auto/invites` · `…/auto/messages` |
| Báo cáo | `#/reports` · `#/reports/campaigns` · `#/reports/custom` |
| GOPUSH AI | `#/ai/chat` · `#/ai/reports` · `#/s/{shop}/ai/creators` · `#/s/{shop}/ai/content` · `#/ai/settings` |
| Cửa hàng | `#/shops` · `#/shops/{shop}` |
| Nhóm | `#/team/members` · `#/team/roles` · `#/team/audit` |
| Cài đặt & Gói | `#/settings/profile` · `#/settings/billing` · `#/settings/notifications` |
| Công khai | `#/` · `#/login` · `#/signup` · `#/privacy` · `#/terms` |

Trang **Đăng nhập / Đăng ký** chia hai nửa: bên trái là ảnh minh họa trên nền
`bg-muted` kèm tiêu đề và ba chip giá trị, bên phải là form. Có nút **đăng nhập /
đăng ký bằng Google** (logo Google gốc 4 màu) đặt trên đường phân cách "hoặc".
Toàn bộ control vẫn là `gm-btn`, `gm-input`, `gm-field` của hệ thống — không thêm
màu, bo góc hay bóng nào ngoài thang đã có. Dưới 920px, nửa ảnh tự ẩn.

Đổi shop ở thanh trên sẽ viết lại `{shop}` trong URL của trang đang mở.

## Những gì đã chạy được

Điều hướng rail + sidebar, thu gọn/mở rộng sidebar con, đổi shop, đổi ngôn ngữ
VI/EN, đổi nền sáng/tối,
drawer hồ sơ Creator, mở wizard tạo lời mời, chuyển tab, tick chọn dòng, bật/tắt
switch, gỡ chip lọc, phân trang, menu shop và menu tài khoản. Lựa chọn được nhớ
qua `localStorage` (bỏ qua an toàn nếu trình duyệt chặn khi mở bằng `file://`).

Mọi nút chưa nối dữ liệu sẽ hiện toast nhắc đây là bản khung.

## Tổng quan gồm 2 màn

- **Trang chủ** `#/home` — điểm vào nhanh: banner, 8 ô thao tác nhanh, việc cần
  làm hôm nay, chiến dịch đang chạy kèm tiến độ, nhịp 7 ngày và danh sách vừa xem.
- **Dashboard** `#/dashboard` — số liệu: 6 thẻ KPI có sparkline, biểu đồ đường
  GMV/hoa hồng, biểu đồ tròn cơ cấu ngành hàng, phễu hợp tác, cột mảnh video–live,
  thanh ngang Top Creator, bảng theo cửa hàng và hai vòng sức khỏe hệ thống.

## Thao tác đã chạy thật

| Nhóm | Làm được gì |
| --- | --- |
| Creator | Tìm kiếm, lọc 10 điều kiện, sắp xếp theo cột, phân trang, chọn nhiều dòng; lưu vào Kho, gắn nhãn, mời hợp tác, thêm blacklist — hàng loạt hoặc từng dòng. Mỗi Creator có **icon TikTok mở kênh** ngay cạnh tên |
| Hồ sơ Creator | Drawer đầy đủ chỉ số, lịch sử với shop, danh sách video đã lên, gắn/gỡ nhãn, ghi chú nội bộ, đổi người phụ trách |
| Chiến dịch | Luồng tạo từng bước toàn trang (xem mục dưới); chạy, tạm dừng, nhân bản, xóa; chạy thì trừ hạn mức gửi và đổi trạng thái Creator tương ứng |
| Hàng mẫu | Đủ 6 trạng thái, đẩy trạng thái từng bước (duyệt → chờ giao → đã giao → đang thực hiện → hoàn thành), duyệt/từ chối hàng loạt, **gắn link video** và mở video trên TikTok |
| Vận đơn | Lọc đơn quá hạn chưa có video, gửi nhắc từng đơn hoặc hàng loạt |
| Tự động hóa | Bật/tắt, sửa, chạy thử — chạy thử mời thật số Creator khớp bộ lọc |
| GOPUSH AI | Hỏi bằng câu chữ thường, câu trả lời **tính từ dữ liệu đang có** (top Creator theo GMV, đơn quá hạn, so sánh chiến dịch); tạo report, xóa report, tải CSV |
| Cửa hàng | Thêm shop, cập nhật ủy quyền, đồng bộ, đổi giới hạn gửi, bật/tắt sản phẩm, gỡ liên kết |
| Nhóm | Mời thành viên, đổi vai trò, giao shop, khóa/mở, xem ma trận quyền theo vai trò |
| Cài đặt | Mọi công tắc và ô nhập đều ghi vào dữ liệu; thông báo theo từng kênh |
| Xuất file | **Xuất Excel** tải xuống CSV thật (mở được bằng Excel, có BOM UTF-8) |

Mọi thao tác quan trọng đều ghi vào **Nhật ký hoạt động**.

## Luồng tạo lời mời và đợt nhắn tin

Dựng theo form mời cộng tác của TikTok Affiliate nhưng chia thành **các bước riêng**:
xong bước này mới mở được bước sau, nút Tiếp tục nêu rõ còn thiếu gì. Bước đã xong
bấm lại được để sửa.

**Lời mời hợp tác — 4 bước**

1. **Tạo lời mời** — tên (tối đa 30 ký tự), thời hạn hiệu lực (chọn ngày), khoảng cách
   giữa các lời mời (5s → 1s), tuỳ chọn chia sẻ lời mời vào cửa sổ trò chuyện,
   **thông tin liên hệ bắt buộc đủ ba kênh Zalo + Email + Facebook** (ba dòng khóa
   sẵn, không xóa được; thêm kênh phụ thì xóa được, và đã thêm là phải điền),
   nội dung lời mời (tối đa 500 ký tự) với **Chèn tên Creator** · **Dùng mẫu có sẵn**
   (popup chọn từ Thư viện mẫu, chèn xong cộng lượt dùng) · **Kiểm tra nội dung**,
   cuối cùng là loại nội dung ưu tiên.
2. **Chọn sản phẩm** — bảng sản phẩm của shop với hoa hồng tiêu chuẩn 1–80%, công tắc
   hoa hồng quảng cáo cửa hàng và tỷ lệ riêng, hoa hồng ước tính theo giá, chỉnh hàng loạt.
3. **Hàng mẫu miễn phí** — bật/tắt, chọn tự động phê duyệt hay xem xét thủ công (kèm tỉ
   lệ phê duyệt thật của shop).
4. **Chọn Creator** — bước quan trọng nhất, xem mục dưới.

**Đợt nhắn tin — 3 bước**: thiết lập tin nhắn (phương thức gửi, chế độ thẻ/bình thường,
tiêu đề, nội dung — cũng có Chèn tên Creator / Dùng mẫu có sẵn / Kiểm tra nội dung —,
thẻ sản phẩm tối đa 5, giãn cách và cỡ nhóm) → chọn Creator → xem lại
kèm bản xem trước đúng như Creator sẽ nhận.

### Ba nguồn Creator

| Nguồn | Bộ lọc |
| --- | --- |
| **Dữ liệu TikTok Shop** | Theo đúng định dạng API trả về, chia 3 nhóm: *Nhà sáng tạo* (hạng mục, hoa hồng trung bình, loại nội dung, agency, ngôn ngữ, ngôi sao sáng tạo, chưa mời trong 90 ngày) · *Người theo dõi* (độ tuổi, giới tính, tổng follower) · *Hiệu suất* (GMV, số món bán, lượt xem TB video, người xem TB LIVE, tỉ lệ tương tác, tần suất đăng, thương hiệu đã cộng tác) |
| **Kho Database của GOPUSH** | Bộ lọc tự thiết kế: ngành hàng, follower, GMV, tỉ lệ đăng, loại nội dung, quốc gia, nhãn, quan hệ, thông tin liên hệ |
| **Creator chỉ định** | Dán tối đa 5.000 username hoặc tải file Excel. Không có bộ lọc |

Bộ lọc nằm gọn trong một khung xám, mỗi nhóm một hàng select nhỏ 28px, đổi nhóm bằng
segmented control — không chiếm chiều cao. Dưới là ô tìm nhanh, số Creator khớp điều kiện,
nút chọn nhanh top đầu bảng, rồi bảng kết quả có checkbox. Chọn tới đâu, thanh chân
hiện ngay số chiến dịch sẽ sinh ra (mỗi chiến dịch đúng 50 Creator) và chặn khi chạm
hạn mức còn lại trong ngày.

## Bám theo hợp đồng dữ liệu của TikTok

`assets/js/tiktok.js` giữ nguyên phần **không được phép đổi** vì đi qua ISV: tên
trường, enum, giới hạn và cây hạng mục 27 cấp 1 / 189 cấp 2. Mọi màn hình đọc từ
đây thay vì tự chế chuỗi, nên khi TikTok đổi enum chỉ sửa một chỗ.

Các mốc cứng: tên lời mời ≤ 30 ký tự · nội dung ≤ 500 ký tự · 1 – 100 sản phẩm mỗi
lời mời · hoa hồng 1 – 80% · **50 Creator mỗi chiến dịch** · Zalo là kênh liên hệ
bắt buộc.

### Vì sao không giống TikTok Seller

TikTok bắt lọc lại Creator cho từng lời mời 50 người. GOPUSH lọc **một lần** ra tới
10.000 Creator rồi tự cắt thành tối đa 200 chiến dịch × 50 Creator, tự điền và gửi.
Thanh chân wizard luôn hiện `N Creator → M chiến dịch`, và danh sách chiến dịch có
nút **Gom theo lô** để xem một dòng cho cả lô thay vì 200 dòng rời.

Hạn mức có hai tầng: **trần cứng TikTok cấp** (chỉ đọc, lấy từ API) và **trần an
toàn của GOPUSH** (sửa được, luôn nhỏ hơn). Số thật dùng để chặn thao tác là cái nhỏ hơn.

### Định dạng tiền

Theo chuẩn Việt Nam: dấu chấm ngăn nghìn, dấu phẩy ngăn thập phân. `S.vnd()` cho số
đầy đủ (`1.234.568 đ`), `S.money()` cho dạng rút gọn (`500K`, `1,7tr`, `1,24 tỷ`).

## Quản lý mẫu và vận đơn

Hai màn `#/s/{shop}/samples` và `…/samples/shipments` dựng theo luồng **Affiliate
Seller API** của TikTok Shop. Nguyên tắc: **token TikTok không bao giờ xuống trình
duyệt** — backend giữ `access_token` + `shop_cipher` theo shop, kéo dữ liệu về DB
riêng, frontend chỉ đọc bản đã đồng bộ.

```
Ủy quyền shop → lưu token + shop_cipher
   ↓
Bấm “Cập nhật dữ liệu”  →  BE gọi sample_applications/search (phân trang hết)
                            + đơn hàng + vận chuyển  →  upsert theo id
   ↓
Màn hình đọc {statusSummary, items, pagination} từ DB
```

Mọi request gắn ngữ cảnh shop ở header (`X-Shop-ID`, `X-Shop-Region`), body không
chứa shopId.

### Sáu trạng thái, dùng đúng enum của API

Trên cùng là hai loại mẫu **Hàng mẫu miễn phí** / **Hàng mẫu có thể hoàn tiền**
(`sampleType`), mỗi loại đếm tab riêng. Cột **Phương thức phê duyệt** hiện
`MANUAL` Phê duyệt thủ công hay `AUTO` Phê duyệt tự động và lọc được.

`PENDING` Chờ duyệt → `AWAITING_SHIPMENT` Chờ gửi hàng → `SHIPPED` Đang giao →
`CONTENT_PENDING` Chờ đăng nội dung → `COMPLETED` Đã hoàn thành · `CANCELLED` Đã hủy.

Số đếm 6 tab lấy từ `statusSummary`; đổi tab thì về trang 1, xóa lựa chọn, giữ từ
khóa. **Cột đổi theo tab**: tab Chờ duyệt có thêm tỷ lệ đăng dự kiến, GMV 30 ngày,
lượt xem TB mỗi video, ID lời mời nguồn; tab đã duyệt có mã đơn hàng; tab đang giao
có mã vận đơn, đơn vị vận chuyển, hành trình mới nhất; tab chờ đăng có thời gian ký
nhận; tab hoàn thành có link nội dung; tab đã hủy có lý do từ chối.

### Nội dung Creator đã đăng

Tab **Đã hoàn thành** kéo về cả nội dung Creator đã đăng cho yêu cầu mẫu đó. Cột
*Nội dung đã đăng* hiện “2 video · 1 LIVE · 48,2K lượt xem”, bấm vào mở drawer
**Chi tiết nội dung** chia hai tab Video / LIVE; mỗi mục có tiêu đề, thời gian phát
hành, lượt xem, lượt thích, bình luận, số đơn phát sinh, GMV và nút mở trên TikTok.

Mỗi phần tử trong `contents[]`: `{type: 'VIDEO'|'LIVE', id, title, publishedAt,
views, likes, comments, orders, gmv, url}`. Khi nối API thật, đây là chỗ đổ dữ liệu
content của yêu cầu mẫu; nếu app chưa được cấp trường này thì lấy bù bằng danh sách
video liên kết của Creator theo `productId` trong cùng khoảng thời gian.

Kèm theo tab hoàn thành: cột **Đánh giá** (chưa đánh giá thì hiện nhãn cam), nút
**Để lại đánh giá** 1–5 sao kèm ghi chú nội bộ, và bộ lọc nhanh *Chưa đánh giá*.

### Thao tác

| Thao tác | Ở đâu | Ghi chú |
| --- | --- | --- |
| Duyệt / Từ chối | Từng dòng, tab Chờ duyệt | Popup hỏi Đồng ý / Từ chối; từ chối phải chọn 1 trong 4 lý do (`NOT_MATCH`, `OFFLINE`, `OUT_OF_STOCK`, `OTHER`) |
| Duyệt / Từ chối hàng loạt | Thanh chọn nhiều | Hỏi xác nhận “Áp dụng … cho N Creator đã chọn?”; dòng đã đổi trạng thái thì bỏ qua và báo số thực tế |
| Gửi tin nhắn mẫu | Chỉ tab Chờ duyệt, tối đa 100 | Thẻ mẫu luôn gửi kèm, thêm văn bản ≤ 2.000 ký tự và 1 ảnh tuỳ chọn |
| Lưu Creator · Danh sách đen | Từng dòng và hàng loạt | Đồng bộ ngược vào Kho Creator và Blacklist của shop |
| Tạo tác vụ kết nối | Hàng loạt | Mở wizard lời mời, điền sẵn các Creator đã chọn |
| Xem hành trình | Tab đang giao / chờ đăng / hoàn thành | Timeline theo `logisticsInfo.trail` |
| Xem nội dung · Để lại đánh giá | Tab hoàn thành | Drawer nội dung và đánh giá 1–5 sao |
| Cập nhật dữ liệu | Header | Chặn bấm liên tiếp trong 5 phút, hiện “Thử lại sau X phút” |

Màn **Theo dõi vận đơn** đọc cùng bộ dữ liệu nhưng lọc theo `logisticsInfo.trackingNo`:
4 thẻ số liệu, lọc theo đơn vị vận chuyển / trạng thái / kết quả đồng bộ / quá 5 ngày
chưa đăng, cột đồng bộ có nhãn lỗi kèm nút thử lại từng dòng (`syncStatus = FAILED`),
và nút gửi nhắc cho Creator đã ký nhận quá 5 ngày.

### API mà backend cần mở

| API | Method | Body |
| --- | --- | --- |
| `/api/samples` | POST | `{status, creatorName?, keywordType, keyword?, pageIndex, pageSize}` → `{statusSummary, items, pagination}` |
| `/api/samples/sync` | POST | Kích hoạt đồng bộ cho shop đang chọn; chặn lặp ở phía server |
| `/api/samples/review` | POST | `{applicationIds[], reviewResult, rejectReason?}` |
| `/api/samples/messages/batch` | POST | `{applicationIds (≤100), text?, image?}` |
| `/api/chat/upload-image` | POST | → `{imageUrl, cosUrl, width, height}` |
| `/api/samples/{id}/logistics` | GET | Hành trình vận chuyển |
| `/api/samples/export` | POST | Xuất theo bộ lọc hoặc danh sách ID |

Màn hình hiện đọc từ `S.data.samples` với **đúng hình dạng bản ghi của API**
(`creatorInfo`, `productInfo`, `logisticsInfo`, `fulfillmentPercentage`, `gmvCount`…),
nên khi nối API thật chỉ cần thay nguồn đọc, không phải sửa giao diện.

## Điều chỉnh kế hoạch

Màn hình `#/s/{shop}/campaigns/tasks` chạy bốn tác vụ hàng loạt trên các lời mời
**đã tạo**, mỗi tác vụ theo đúng đặc tả nghiệp vụ:

| Tác vụ | Cấu hình | Kết quả ghi lại |
| --- | --- | --- |
| **Dọn dẹp lời mời kém hiệu quả** | 3 chế độ: gỡ Creator chưa thêm showcase · gỡ Creator chưa quảng bá · hủy toàn bộ (có hộp xác nhận) | lời mời đã hủy / giữ lại, Creator đã gỡ |
| **Bổ sung Creator vào lời mời cũ** | trần 50 Creator mỗi lời mời, mẫu bộ lọc, bộ lọc Creator (danh mục, độ tuổi, giới tính, follower, GMV, lượt xem TB, tỉ lệ tương tác, người xem LIVE) | Creator đã thêm, bỏ qua, lỗi |
| **Gia hạn & đổi tên lời mời** | thời hạn 3 – 365 ngày, tên mới tối đa 30 ký tự (27 khi chọn nhiều, tự thêm hậu tố `-01`, `-02`…) | lời mời cập nhật / bỏ qua / lỗi |
| **Thêm sản phẩm vào lời mời** | chọn sản phẩm từ shop, hoa hồng 1 – 80%, công tắc hoa hồng quảng cáo, thiết lập hàng loạt | lượt thêm, bỏ qua, lỗi |

Luồng đi ba màn: **danh sách tác vụ → chọn loại (4 thẻ căn giữa) → biểu mẫu**. Biểu
mẫu nào cũng kết thúc bằng bảng chọn lời mời dùng chung, chia hai phạm vi *Đang hiệu
lực* và *Sắp hết hạn* (còn dưới 4 ngày), tìm theo tên / ID lời mời / tên sản phẩm.

Tác vụ tạo ra ở trạng thái **Chờ chạy**; bấm ▶ để chạy ngay và xem kết quả áp thẳng
lên dữ liệu lời mời. Có tạm dừng, tiếp tục, dừng, chạy lại phần lỗi và xem chi tiết
từng lời mời.

## Ghi chú

- **Tiếng Việt là ngôn ngữ gốc.** 6 ngôn ngữ khác dịch toàn bộ nội dung qua từ điển
  `assets/i18n/` (xem mục Thị trường và ngôn ngữ).
- Tài khoản mặc định là **user01** với avatar gấu vẽ bằng SVG (`UI.bear()`).
- Bộ dữ liệu ban đầu: 4 cửa hàng, 1.200 Creator, 15 chiến dịch, 6 tác vụ, 96 yêu
  cầu hàng mẫu, 5 nhãn, 8 mẫu, 8 report. Sinh bằng bộ số giả ngẫu nhiên có hạt cố
  định nên lần nào cũng giống nhau.
- Dữ liệu lưu ở khóa `gopush.db.v8.<thị trường>.<uid>`. Khi đổi cấu trúc, khóa được nâng phiên bản và
  các khóa cũ tự xóa lúc nạp, nên không phải xóa cache tay.
- Logo là bộ khóa **GOPUSH · BY GOMAX DIGITAL**, dùng file `assets/img/logo-gomax.webp`
  lấy từ URL GOMAX được chỉ định, không xử lý lại ảnh.
- **Chống cache**: mọi file tĩnh gắn `?v=`. Đổi ảnh hoặc sửa CSS/JS thì tăng số này
  ở `index.html` và ở `ASSET_V` trong `ui.js` cho khớp, trình duyệt sẽ tải bản mới.
- `assets/img/banner.png` là banner GOPUSH, đã thu còn 1280px cho nhẹ. Thay banner
  khác chỉ cần ghi đè file này, không phải sửa code.
- Bảng biểu đồ vẽ bằng CSS thuần, chưa dùng thư viện chart nào.
