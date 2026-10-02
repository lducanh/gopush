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
nền trung tính và **Oracle Red** làm màu nhấn. Tên token trong `tokens.css` giữ đúng
như bản gốc (`bg-topbar`, `bg-canvas`, `accent`, `text-secondary`, `radius-md`…); token
nào bản gốc chưa có thì ghi chú "bổ sung" ngay trong file.

| Nhóm | Giá trị chính |
| --- | --- |
| Khung | top bar Oracle Bark `#312D2A` · canvas Neutral 30 `#F1EFED` · card / sidebar `#ffffff` |
| Chữ | `#312D2A` chính · Slate `#697778` phụ · `#7d7873` meta 12px |
| Nhấn | Oracle Red `#C74634` (progress, nút, link) · `#9D3428` (focus, mục chọn) · Neutral 30 `#F1EFED` (nền mục chọn) |
| Viền | `border` `#d3d4d5` cho input / nút · `border-light` `#ececed` cho card / divider |
| Chữ | font hệ thống, 14px/22px, **chỉ hai độ đậm 400 và 500** |
| Bo góc | 4px tag · 6px nút, input, mục menu · 8px card · pill cho badge |
| Bóng | gần như không; chỉ menu nổi và drawer |

Quy ước:

- **Nút**: mặc định là outline trung tính 36px. Nút chính (`gm-btn-primary`) nền **Oracle Red**
  `accent-dark` — màu chủ đạo, như nút "Thêm tài khoản nhà quảng cáo" của Trung tâm doanh
  nghiệp TikTok; tối đa một nút mỗi vùng. Nút nhỏ `gm-btn-sm` nền xám, không viền (Xem chi
  tiết, Hồ sơ); `gm-btn-soft` nền Neutral 30 cho hành động nhanh trong bảng (Mời, Xem lỗi).
- **Trạng thái trong bảng** là chấm màu + chữ thường, không nền ("● Đã phê duyệt"); ngoài
  bảng mới dùng tag có nền.
- **Ô số liệu** (KPI, stat tile) cùng một kiểu trên mọi trang: nền canvas, icon Oracle Red, số
  20px, dòng so sánh kỳ trước.
- **Bảng**: cột ngày giờ, người, SKU, trạng thái giữ một dòng (`U.table` tự gắn class `nw`
  theo tên cột); ô Creator và sản phẩm tối đa 2 dòng, phần dư cắt bằng … và hiện đủ khi rê chuột.
- **Mục đang chọn** (menu, tab cấp hai, checkbox, radio, trang hiện tại, bước wizard)
  luôn dùng Oracle Red. Tab chính dùng vạch 2px màu chữ chính, giống trang Tài khoản của
  Trung tâm doanh nghiệp TikTok.
- **Link** chữ Oracle Red đậm, gạch chân khi rê chuột.
- **Tag** 22px bo 4px, nền nhạt + chữ đậm cùng tông: xanh lá thành công, cam cảnh báo,
  đỏ Oracle cho lỗi, Slate/Pine cho loại.
- **Thẻ KPI / stat tile**: nền canvas, không viền, số 20px/500 tabular-nums.
- **Biểu đồ**: đường cong mềm, Oracle Red cho chuỗi chính, Pine/Ocean/Plum cho chuỗi so
  sánh (như biểu đồ Chi phí / Lần hiển thị của TikTok). Biểu đồ đường luôn đặt cạnh một
  donut cơ cấu theo tỉ lệ 2/3 – 1/3 để chữ trục không bị phóng to. Sparkline, phễu và bảng xếp hạng chỉ dùng một
  tông Oracle Red, nhạt dần theo thứ hạng.
- Chữ đặt trên nền Oracle Red dùng `--on-accent`: trắng ở theme sáng, gần Bark ở theme tối để
  đủ tương phản.

**Theme tối** là phần bổ sung (bộ gốc chỉ có theme sáng): cùng cấu trúc ba lớp, Oracle Red
sáng hơn một bậc.

**Icon** dùng bộ **Lucide** (`lucide-static` 0.544, giấy phép ISC), nhúng sẵn trong
`icons.js`, nét 1.5px, 16px (18px trên top bar).

## Logo

`assets/img/logo-gomax.webp` là logo **GOPUSH · BY GOMAX DIGITAL** lấy từ file GOMAX
được chỉ định. Trên top bar Oracle Bark tối dùng nguyên bản. Trên nền sáng (hero trang
giới thiệu, thẻ đăng nhập) thêm class `ig-logo--ink` để đảo độ sáng logo.

## Khung ứng dụng

```
top bar Oracle Bark 56px · logo | 🇻🇳 VN 1300'S Coffee ● ⌄ ....... [🔍 Tìm hoặc hỏi AI… ⌘K] ✦ 🔔⁷ [🐻 ⌄]
                          828/4.000 lời mời hôm nay ▬
sidebar 240px    · Nghiệp vụ: Tổng quan · Creator · Hợp tác · Hàng mẫu · Kết quả
                   Quản trị: Cài đặt doanh nghiệp  (bấm module để mở / thu menu con)
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
- Menu avatar: hồ sơ, gói, ngôn ngữ VI/EN, giao diện tối, trợ giúp & liên hệ, đặt lại dữ
  liệu thử, đăng xuất.

### Sitemap theo vòng đời hợp tác

| Module | Trang | Phạm vi |
| --- | --- | --- |
| Tổng quan | Trang chủ · **Việc cần xử lý** | gộp được |
| Creator | Tìm Creator · Kho Creator (Bảng / **Pipeline**) · Blacklist | theo shop |
| | Nhãn | dùng chung |
| Hợp tác | Chiến dịch lời mời · Nhắn tin hàng loạt | gộp được |
| | **Chi tiết chiến dịch** (ẩn khỏi menu, mở từ tên chiến dịch) · Tự động hóa (lời mời + tin nhắn) · Điều chỉnh kế hoạch | theo shop |
| | Thư viện mẫu | dùng chung |
| Hàng mẫu | Yêu cầu hàng mẫu · Theo dõi vận đơn | theo shop |
| Kết quả | Dashboard (đã gộp Báo cáo tổng) · Theo chiến dịch | gộp được |
| | Báo cáo custom · Report AI | dùng chung |
| Cài đặt doanh nghiệp | Cửa hàng · Thành viên · Vai trò & quyền · Nhật ký · Gói & thanh toán · Thông báo · Cài đặt AI · Hồ sơ | dùng chung |

Đường dẫn cũ giữ nguyên nên mọi liên kết vẫn chạy; `/reports` chuyển sang `/dashboard`,
`/ai` mở Trang chủ kèm panel AI (`ALIASES` trong `data.js`). Mỗi trang khai báo `scope`,
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

Không còn là module riêng: nút **GOPUSH AI** trên top bar (và thanh hỏi nhanh dưới bảng)
mở panel bên phải. Panel ghi rõ đang đọc gì — trang, phạm vi shop, số bộ lọc, số dòng đang
chọn, kỳ dữ liệu — và gợi ý câu hỏi theo module đang mở. Report AI nằm trong Kết quả, Cài
đặt AI nằm trong Cài đặt doanh nghiệp.

## Hỗ trợ

Nút tròn cố định ở góc dưới bên phải của mọi trang, kể cả trang công khai. Rê chuột
hoặc bấm là mở popup gọn với ba kênh: gọi điện, Zalo OA và email. Mỗi kênh là một
link thật (`tel:`, `zalo.me`, `mailto:`) nên bấm là mở ứng dụng tương ứng.

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
| Creator | `#/s/{shop}/creators/discover` · `…/library` · `#/creators/tags` · `…/blacklist` |
| Chiến dịch | `#/s/{shop}/campaigns/invites` · `…/messages` · `…/tasks` · `#/templates` |
| Hàng mẫu | `#/s/{shop}/samples` · `…/samples/shipments` |
| Tự động hóa | `#/s/{shop}/auto/invites` · `…/auto/messages` |
| Báo cáo | `#/reports` · `#/reports/campaigns` · `#/reports/custom` |
| GOPUSH AI | `#/ai` · `#/ai/reports` · `#/ai/settings` |
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

- **Tiếng Việt là ngôn ngữ chính.** Bản EN mới dịch điều hướng và tiêu đề trang,
  sẽ hoàn thiện sau. Khi làm thật, mọi chuỗi đưa hết qua file dịch.
- Tài khoản mặc định là **user01** với avatar gấu vẽ bằng SVG (`UI.bear()`).
- Bộ dữ liệu ban đầu: 4 cửa hàng, 1.200 Creator, 15 chiến dịch, 6 tác vụ, 96 yêu
  cầu hàng mẫu, 5 nhãn, 8 mẫu, 8 report. Sinh bằng bộ số giả ngẫu nhiên có hạt cố
  định nên lần nào cũng giống nhau.
- Dữ liệu lưu ở khóa `gopush.db.v7`. Khi đổi cấu trúc, khóa được nâng phiên bản và
  các khóa cũ tự xóa lúc nạp, nên không phải xóa cache tay.
- Logo là bộ khóa **GOPUSH · BY GOMAX DIGITAL**, dùng file `assets/img/logo-gomax.webp`
  lấy từ URL GOMAX được chỉ định, không xử lý lại ảnh.
- **Chống cache**: mọi file tĩnh gắn `?v=`. Đổi ảnh hoặc sửa CSS/JS thì tăng số này
  ở `index.html` và ở `ASSET_V` trong `ui.js` cho khớp, trình duyệt sẽ tải bản mới.
- `assets/img/banner.png` là banner GOPUSH, đã thu còn 1280px cho nhẹ. Thay banner
  khác chỉ cần ghi đè file này, không phải sửa code.
- Bảng biểu đồ vẽ bằng CSS thuần, chưa dùng thư viện chart nào.
