# inGo — ứng dụng front-end chạy thử được

HTML/CSS/JS thuần cho inGo v0.2: **10 module · 27 màn hình trong app · 4 trang công khai**.
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
index.html              vỏ trang, nạp font + 9 script
assets/css/tokens.css   token màu, chữ, khoảng cách, bo góc, kích thước (có theme tối)
assets/css/app.css      component gm-* + khung 3 tầng, drawer, wizard, trang công khai
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
assets/img/             logo wordmark, mark ngôi sao, banner trang chủ, ảnh trang đăng nhập
```

## Thiết kế

Dựa trên design system **GoMax Console**, chỉ đổi màu chủ đạo từ xanh `#0191FB`
sang **đen `#18181B`**, phối cùng xám nhạt và trắng:

| Token | Sáng | Tối |
| --- | --- | --- |
| `--primary` | `#18181b` | `#fafafa` |
| `--on-primary` | `#ffffff` | `#18181b` |
| `--primary-soft` / `--primary-border` | `#f3f3f5` / `#dcdce1` | `#26272b` / `#3a3c41` |

Màu trạng thái (`success`, `warning`, `danger`) giữ nguyên theo hệ thống gốc.
Vì link không còn màu xanh, `.gm-link` dùng gạch chân mờ thay cho màu nhấn.

**Pastel** chỉ dùng cho biểu đồ và ô icon, không dùng cho chữ hay nút:
`--pastel-sky` `#c4d7ef` · `--pastel-sage` `#c8ddcd` · `--pastel-sand` `#eddfc6` ·
`--pastel-lilac` `#d6d0ea` · `--pastel-blush` `#efd6d9` · `--pastel-mist` `#e4e4e9`
(theme tối dùng bản trầm hơn).

**Biểu đồ: than chì dẫn dắt, pastel bổ trợ.** Chuỗi chính luôn là màu than chì
`--chart-1` `#26272b` nên dashboard vẫn giữ tông đen; màu chỉ xuất hiện ở chuỗi phụ
và các chi tiết nhỏ: `--chart-2` lam khói `#7f9fc9` · `--chart-3` lá khói `#8ab39b` ·
`--chart-4` cát `#d3b184` · `--chart-5` oải hương `#a49bc6` · `--chart-6` hồng phấn
`#c9959e` · `--chart-7` ngọc nhạt `#8fb6ba`. Theme tối dùng bản cùng hue, sáng hơn.
Quy ước dùng:

- Đường và cột nhiều chuỗi: **chỉ hai màu** — than chì cho chỉ số chính, một pastel cho chỉ số phụ.
- Thẻ KPI: sparkline lấy đúng pastel của ô icon bên cạnh (`TONE_LINE` trong `pages.js`) — nét 1,6px nên chỉ là một chấm màu nhẹ.
- Bảng xếp hạng và phễu: giữ nguyên một tông than chì, nhạt dần theo thứ hạng / theo bước
  (`--chart-1` → `--chart-1-mid` → `--chart-1-soft`), không đổi hue để mắt đọc theo thứ tự.
- Tròn theo ngành hàng: than chì cho nhóm lớn nhất, bốn pastel cho phần còn lại.
- Nhãn trục rút gọn giữ một chữ số thập phân khi số còn nhỏ, tránh hai mốc liền nhau cùng in `2K`. Chữ trên pastel dùng `--on-pastel`
cố định `#18181b` cho cả hai theme.

**Icon** dùng bộ **Lucide** (`lucide-static` 0.544, giấy phép ISC). Path được tải về
và nhúng thẳng vào `icons.js` nên đồng bộ như thư viện gốc mà không phụ thuộc CDN,
vẫn chạy khi mở bằng `file://`. Nét 1.75, hiển thị 16px. Đổi icon chỉ cần sửa bảng
ánh xạ tên ở đầu file.

**Ô icon nền màu**: nền là tông rất nhạt (`--soft-*`), icon là tông đậm cùng màu
(`--soft-*-ink`), không dùng đen. Sáu cặp: sky, sage, sand, lilac, blush, mist —
mỗi cặp đạt tối thiểu 4.5:1 ở cả hai theme.

## Khung 3 tầng

```
thanh trên 56px  · logo ...................... [shop] [tìm nhanh] [hạn mức]
                   [🇻🇳 VI] | thông báo · sáng/tối · trợ giúp | avatar + tên
rail 76px        · 6 module nghiệp vụ ở trên, 3 module quản trị ở dưới
sidebar con 224px· tối đa 4 mục của module đang chọn, mỗi mục có icon bên trái
nội dung         · tiêu đề + nút chính → tab → bộ lọc → bảng / wizard / biểu đồ
```

Mọi control trên thanh trên đều là pill cao 32px, cùng nền và cùng viền — kể cả ô
hạn mức gửi. Nút tài khoản không có khung, chỉ đổi nền khi rê chuột.

**Nút thu gọn sidebar** là một thẻ nhỏ có mũi tên nằm ngay trên vách ngăn giữa
sidebar con và vùng nội dung, canh giữa theo chiều dọc. Bấm để ẩn sidebar; thẻ
trượt sang vách của rail và mũi tên đảo chiều. Lựa chọn được nhớ cho lần mở sau.

Drawer hồ sơ Creator mở từ **mọi bảng có Creator** (bấm vào tên) và không rời trang.

## inGo AI

Module thứ 7 trên rail, ngay dưới Báo cáo. Ba màn:

- **Trang chủ** `#/ai` — ô chat kiểu ChatGPT: hội thoại mẫu cho thấy AI quét dữ liệu
  rồi trả lời kèm bảng và dẫn chứng; chip gợi ý prompt; ô soạn dính đáy màn có chọn
  phạm vi shop và kỳ dữ liệu.
- **Report** `#/ai/reports` — danh sách report AI tạo (xem, tải, xuất file, chia sẻ,
  xóa) cùng một report chi tiết mẫu: tóm tắt của AI, chỉ số chính, biểu đồ, bảng đề
  xuất và phần khuyến nghị đánh số.
- **Setting** `#/ai/settings` — dạy AI: nguồn dữ liệu được quét, trọng số chấm điểm
  Creator, ngưỡng cảnh báo, cách trả lời, hướng dẫn riêng, ví dụ huấn luyện và giới
  hạn an toàn.

Thanh thao tác hàng loạt nổi ở cuối bảng đã bỏ; thay vào đó là **ô hỏi inGo AI**
một dòng, bấm vào là chuyển sang màn chat.

## Hỗ trợ

Nút tròn cố định ở góc dưới bên phải của mọi trang, kể cả trang công khai. Rê chuột
hoặc bấm là mở popup gọn với ba kênh: gọi điện, Zalo OA và email. Mỗi kênh là một
link thật (`tel:`, `zalo.me`, `mailto:`) nên bấm là mở ứng dụng tương ứng.

## Mật độ

Giao diện cho người thao tác cả ngày nên ưu tiên nhìn được nhiều dữ liệu:

- Một trang danh sách chỉ có **ba dải ngang**: đầu trang → tab → thanh lọc. Thanh lọc
  nền trắng, chỉ ngăn bằng hairline, không còn dải xám riêng.
- Control trong thanh lọc cao **26px**, chữ 12.5px; panel lọc nâng cao mỗi nhóm một
  hàng, nút Đặt lại nằm ở góc thay vì chiếm thêm một dòng.
- Ô bảng cao 8px trên dưới, avatar 28px → dòng ~42px, hơn khoảng 25% số dòng thấy
  được trên cùng màn hình so với trước.
- Card padding 14px, khoảng cách giữa các khối 12px, thẻ KPI 10px.

## Bộ lọc

Không xếp hết điều kiện ra màn hình. Mỗi trang chọn một mức phù hợp:

| Trang | Kiểu lọc |
| --- | --- |
| Tìm Creator | 1 hàng gọn (tìm + 3 điều kiện hay dùng) + nút **Bộ lọc** mở panel 4 nhóm; chips tóm tắt điều kiện đang bật |
| Kho Creator, Nhật ký | 1 hàng gọn, không có panel |
| Yêu cầu hàng mẫu, Vận đơn | 1 hàng gọn + chips cho điều kiện đặc biệt |
| Báo cáo custom | panel mở sẵn, chia 2 nhóm Phạm vi / Chỉ số |

Control trong thanh lọc dùng cỡ nhỏ 28px (`.gm-input-sm`) để một hàng chứa đủ.
Panel nâng cao đóng/mở bằng `data-act="filters"`, nút đổi sang nền đen khi đang mở.

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
| inGo AI | `#/ai` · `#/ai/reports` · `#/ai/settings` |
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
| inGo AI | Hỏi bằng câu chữ thường, câu trả lời **tính từ dữ liệu đang có** (top Creator theo GMV, đơn quá hạn, so sánh chiến dịch); tạo report, xóa report, tải CSV |
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
| **Kho Database của inGo** | Bộ lọc tự thiết kế: ngành hàng, follower, GMV, tỉ lệ đăng, loại nội dung, quốc gia, nhãn, quan hệ, thông tin liên hệ |
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

TikTok bắt lọc lại Creator cho từng lời mời 50 người. inGo lọc **một lần** ra tới
10.000 Creator rồi tự cắt thành tối đa 200 chiến dịch × 50 Creator, tự điền và gửi.
Thanh chân wizard luôn hiện `N Creator → M chiến dịch`, và danh sách chiến dịch có
nút **Gom theo lô** để xem một dòng cho cả lô thay vì 200 dòng rời.

Hạn mức có hai tầng: **trần cứng TikTok cấp** (chỉ đọc, lấy từ API) và **trần an
toàn của inGo** (sửa được, luôn nhỏ hơn). Số thật dùng để chặn thao tác là cái nhỏ hơn.

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
- Dữ liệu lưu ở khóa `ingo.db.v7`. Khi đổi cấu trúc, khóa được nâng phiên bản và
  các khóa cũ tự xóa lúc nạp, nên không phải xóa cache tay.
- Logo là bộ khóa **inGo · BY GOMAX DIGITAL**, dùng **đúng file gốc 2000×600**,
  không xử lý lại ảnh. File có sẵn nền trắng nên ở theme tối được đặt trên một nền
  trắng bo góc (`:root[data-theme="dark"] .ig-logo`) thay vì `filter: invert(1)` —
  invert sẽ biến chữ đỏ cam của GoMax thành xanh lơ.
- **Chống cache**: mọi file tĩnh gắn `?v=`. Đổi ảnh hoặc sửa CSS/JS thì tăng số này
  ở `index.html` và ở `ASSET_V` trong `ui.js` cho khớp, trình duyệt sẽ tải bản mới.
- `assets/img/banner.png` là banner inGo, đã thu còn 1280px cho nhẹ. Thay banner
  khác chỉ cần ghi đè file này, không phải sửa code.
- Bảng biểu đồ vẽ bằng CSS thuần, chưa dùng thư viện chart nào.
