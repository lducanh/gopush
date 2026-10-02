# GOPUSH — Giải thích chi tiết các tính năng

Tài liệu mô tả toàn bộ tính năng của GOPUSH: mỗi màn hình làm được gì, ràng buộc nào
đến từ TikTok, phần nào đã chạy thật trên dữ liệu và phần nào còn chờ nối API.

Cập nhật: 26/09/2026 · Bản demo: https://lducanh.github.io/gopush/ · Mã nguồn: https://github.com/lducanh/gopush

---

## 1. GOPUSH giải quyết việc gì

GOPUSH là công cụ quản lý affiliate Creator cho các shop trên TikTok Shop. Bài toán
thực tế của người vận hành:

| Làm tay trên TikTok Shop | GOPUSH |
| --- | --- |
| Mỗi lời mời hợp tác chỉ chọn được **tối đa 50 Creator**, muốn mời 5.000 người phải lặp lại 100 lần | Lọc **một lần** ra tới 10.000 Creator, hệ thống tự cắt thành tối đa 200 chiến dịch × 50 người và điền sẵn |
| Sửa lời mời cũ phải mở từng cái: gỡ Creator không hiệu quả, bù người mới, gia hạn, thêm sản phẩm | Chọn nhiều lời mời rồi chạy **một tác vụ** cho cả lô |
| Duyệt yêu cầu hàng mẫu từng dòng, không biết Creator nào đáng duyệt | Duyệt hàng loạt, có sẵn tỷ lệ đăng bài, GMV 30 ngày, lượt xem trung bình ngay trên bảng |
| Nhiều shop thì phải đăng nhập ra vào từng shop | Một chỗ quản nhiều shop, đổi shop ở thanh trên, báo cáo xem gộp được |
| Không có dấu vết ai làm gì | Nhật ký hoạt động ghi mọi thao tác quan trọng |

Nguyên tắc xuyên suốt: **mọi thao tác đi qua API chính thức của TikTok Shop**, không
dùng plugin giả lập thao tác trên trình duyệt.

---

## 2. Tính năng chính trong một trang

| Nhóm | Tính năng | Giá trị mang lại |
| --- | --- | --- |
| Kết nối | Ủy quyền nhiều shop qua OAuth chính thức, tự làm mới token, đồng bộ sản phẩm và dữ liệu affiliate | Một chỗ quản nhiều shop, không phải đăng nhập ra vào |
| Tìm Creator | Bộ lọc đúng các trường API của TikTok (3 nhóm, 20+ điều kiện), lưu bộ lọc thành mẫu | Tìm đúng tệp trong vài phút thay vì lướt tay |
| Mời hàng loạt | Lọc một lần tới 10.000 Creator, tự chia thành tối đa 200 chiến dịch × 50 người, tự điền và gửi theo giãn cách | Thay thế việc lặp lại 200 lần trên TikTok |
| Nhắn tin hàng loạt | Gửi theo mẫu hoặc thẻ sản phẩm qua API chính thức, chia nhóm và giãn cách | Tiếp cận sâu hơn, giảm rủi ro bị giới hạn |
| Điều chỉnh kế hoạch | 4 tác vụ chạy trên lời mời đã có: dọn dẹp, bù Creator, gia hạn và đổi tên, thêm sản phẩm | Giữ các lời mời cũ luôn "sống" mà không phải mở từng cái |
| Hàng mẫu | Duyệt / từ chối có lý do, gửi tin nhắn mẫu, xem nội dung Creator đã đăng, đánh giá | Quyết định nhanh dựa trên số liệu ngay trên bảng |
| Vận đơn | Bám hành trình tới lúc ký nhận, cảnh báo quá 5 ngày chưa đăng, nhắc hàng loạt | Thu hồi giá trị từ mẫu đã gửi |
| Tự động hóa | Quy tắc mời tự động theo lịch và tin nhắn tự động theo sự kiện | Việc lặp lại hằng ngày chạy không cần người |
| Báo cáo | Báo cáo tổng, theo chiến dịch, và báo cáo tự dựng; xuất Excel | Biết tiền đi đâu và bước nào đang rơi |
| GOPUSH AI | Hỏi bằng tiếng Việt, AI quét dữ liệu trong hệ thống và trả lời kèm số liệu | Không phải tự mò báo cáo |
| Quản trị | Phân quyền 4 vai trò theo module, giao shop cho từng người, nhật ký mọi thao tác | Nhiều người dùng chung an toàn, có dấu vết |
| An toàn | Hạn mức hai tầng, giãn cách, blacklist luôn loại trừ, tự dừng khi API lỗi liên tiếp | Giảm rủi ro shop bị hạn chế |

---

## 3. Khái niệm nền, cần hiểu trước khi đọc tiếp

**Shop (cửa hàng)** — Một shop TikTok đã ủy quyền cho GOPUSH. Hầu hết dữ liệu gắn với
một shop cụ thể; đổi shop ở thanh trên là toàn bộ màn hình đổi theo. Đường dẫn của
những trang này có dạng `#/s/{mã-shop}/...`.

**Creator** — Người bán hàng qua nội dung (còn gọi KOL, KOC). Kho Creator dùng chung
cho cả hệ thống, nhưng **quan hệ** với Creator thì tính riêng theo từng shop: một
người có thể đang hợp tác với shop A và chưa từng được mời ở shop B.

**Hạn mức hai tầng** — Con số quan trọng nhất khi gửi hàng loạt:

| Tầng | Ý nghĩa | Sửa được không |
| --- | --- | --- |
| Trần TikTok cấp | Giới hạn lời mời mỗi ngày mà TikTok cho shop, lấy từ API (mặc định 10.000) | Không, chỉ đọc |
| Trần an toàn của GOPUSH | Mức GOPUSH tự dừng lại dù TikTok còn cho phép | Có, tự đặt theo từng shop |

Số thật dùng để chặn thao tác luôn là **cái nhỏ hơn**. Thanh trên hiển thị dạng
`đã gửi / trần thực tế`, ví dụ `828 / 4.000`.

**Lời mời hợp tác** (invitation / kế hoạch nhắm mục tiêu) — Một chiến dịch mời trên
TikTok, chứa tối đa 50 Creator và tối đa 100 sản phẩm, có thời hạn hiệu lực.

**Lô (batch)** — Nhóm các chiến dịch sinh ra từ cùng một lần lọc. Danh sách chiến
dịch có nút **Gom theo lô** để xem một dòng cho cả lô thay vì 200 dòng rời.

---

## 4. Kiến trúc và luồng dữ liệu

### 4.1 Ba tầng, và ranh giới bảo mật

```
┌────────────┐   HTTPS    ┌──────────────────┐   API chính thức   ┌──────────────┐
│  Trình     │ ─────────► │  Backend GOPUSH    │ ─────────────────► │  TikTok Shop │
│  duyệt     │ ◄───────── │  + CSDL riêng    │ ◄───────────────── │  Open API    │
└────────────┘            └──────────────────┘                    └──────────────┘
   giao diện                giữ token, đồng bộ,                      nguồn sự thật
   không giữ token          xếp hàng, ghi nhật ký
```

Ba nguyên tắc không thay đổi:

1. **Token của shop không bao giờ xuống trình duyệt.** Backend giữ `access_token`,
   `refresh_token`, `shop_cipher` theo từng shop và tự làm mới trước khi hết hạn.
2. **Giao diện đọc từ CSDL của GOPUSH, không gọi thẳng TikTok.** Dữ liệu được một job
   đồng bộ kéo về trước; màn hình luôn hiện mốc "dữ liệu cập nhật đến lúc nào".
3. **Mọi request mang ngữ cảnh shop ở header** (`X-Shop-ID`, `X-Shop-Region`), thân
   request không chứa shopId. Backend dựa vào header để lấy đúng token.

### 4.2 Luồng 1 — Ủy quyền shop

```
Người dùng          Frontend           Backend              TikTok
    │  bấm Ủy quyền    │                  │                    │
    ├─────────────────►│  xin link OAuth  │                    │
    │                  ├─────────────────►│                    │
    │                  │◄─────────────────┤  link ủy quyền     │
    │  đăng nhập seller, đồng ý ──────────┼───────────────────►│
    │                  │                  │◄─── callback + code│
    │                  │                  ├───────────────────►│ đổi code lấy token
    │                  │                  │  lưu shop, token, shop_cipher
    │◄─────────────────┴──────────────────┤  shop xuất hiện trong danh sách
```

Sau bước này shop có mặt ở màn **Cửa hàng**, kèm hạn token và nhóm quyền đã cấp.

### 4.3 Luồng 2 — Đồng bộ dữ liệu về CSDL

Chạy theo lịch định kỳ, và chạy ngay khi người dùng bấm **Cập nhật dữ liệu**.

```
job đồng bộ
   ├─ 1. lấy danh sách yêu cầu mẫu theo từng trạng thái, phân trang đến hết
   ├─ 2. lấy đơn hàng và thông tin vận chuyển của các yêu cầu đã duyệt
   ├─ 3. lấy số liệu Creator: GMV 30 ngày, lượt xem TB, tỷ lệ đăng bài
   ├─ 4. upsert theo ID (không nhân bản, không mất dữ liệu cũ)
   ├─ 5. phần nào lỗi thì đánh dấu và đi tiếp, không dừng cả job
   └─ 6. tính lại số đếm 6 tab, ghi lastUpdateTime
```

Ràng buộc thực tế: nếu shop có quá nhiều yêu cầu mẫu, API chỉ trả về các yêu cầu gần
nhất, nên giao diện nói rõ dữ liệu có thể chưa đầy đủ. Nút cập nhật bị chặn bấm liên
tiếp trong 5 phút, chặn ở cả phía server chứ không chỉ ở giao diện.

### 4.4 Luồng 3 — Tạo lời mời hàng loạt, phần lõi của GOPUSH

Đây là chỗ GOPUSH khác hẳn thao tác tay.

```
   Lọc một lần                    GOPUSH tự cắt                   Gửi lần lượt
┌──────────────────┐        ┌──────────────────────┐        ┌────────────────┐
│ 3.000 Creator    │ ─────► │ nhóm 1  → 50 người   │ ─────► │ tạo chiến dịch │
│ khớp điều kiện   │        │ nhóm 2  → 50 người   │        │ điền Creator   │
│                  │        │ …                    │        │ chờ giãn cách  │
│                  │        │ nhóm 60 → 50 người   │        │ gửi tiếp       │
└──────────────────┘        └──────────────────────┘        └────────────────┘
                                   60 chiến dịch              trừ dần hạn mức
```

Các chốt kiểm soát trong luồng này:

| Chốt | Quy tắc |
| --- | --- |
| Trước khi chọn | Bỏ Creator trong blacklist của shop |
| Khi chọn | Không cho chọn quá hạn mức còn lại trong ngày |
| Khi chia lô | Mỗi chiến dịch đúng 50 người, chiến dịch cuối nhận phần dư |
| Khi gửi | Giãn cách theo cấu hình của shop (ví dụ 45 – 90 giây) |
| Khi gặp lỗi tần suất | Thử lại tối đa 3 lần, giãn cách lũy thừa từ 60 giây, sau đó mới báo lỗi |
| Sau khi gửi | Đổi quan hệ Creator sang "Đã mời", trừ hạn mức, ghi nhật ký |

Toàn bộ chiến dịch sinh ra mang chung một **mã lô**, nên danh sách gom lại thành một
dòng thay vì 60 dòng rời.

### 4.5 Luồng 4 — Vòng đời một yêu cầu hàng mẫu

```
   Creator xin mẫu
         │
         ▼
   ┌───────────┐  shop đồng ý   ┌────────────────────┐  gửi hàng  ┌──────────┐
   │ Chờ duyệt │ ─────────────► │ Chờ gửi hàng       │ ─────────► │ Đang giao│
   └───────────┘                └────────────────────┘            └──────────┘
         │ từ chối / hết hạn                                            │ ký nhận
         ▼                                                              ▼
   ┌───────────┐                                          ┌────────────────────┐
   │  Đã hủy   │                                          │ Chờ đăng nội dung  │
   └───────────┘                                          └────────────────────┘
                                                                        │ đăng video/LIVE
                                                                        ▼
                                                              ┌──────────────────┐
                                                              │  Đã hoàn thành   │
                                                              └──────────────────┘
```

Hai mốc GOPUSH theo dõi riêng vì đây là chỗ hay mất tiền:

- **Ký nhận quá 5 ngày mà chưa đăng nội dung** → vào danh sách nhắc, nhắc được hàng loạt.
- **Đã đăng nội dung** → kéo về số lượt xem, lượt thích, bình luận, số đơn và GMV
  phát sinh từ chính video đó, để biết mẫu đã gửi có sinh ra tiền hay không.

### 4.6 Luồng 5 — Tác vụ điều chỉnh kế hoạch

```
chọn loại tác vụ → cấu hình → chọn nhiều lời mời → tạo (trạng thái Chờ chạy)
                                                        │
                                                        ▼
                             chạy: duyệt từng lời mời một, độc lập nhau
                                   ├─ lấy lại trạng thái mới nhất từ TikTok
                                   ├─ áp quy tắc của tác vụ
                                   ├─ ghi kết quả từng dòng: thành công / bỏ qua / lỗi
                                   └─ một dòng lỗi không làm dừng cả tác vụ
```

Không cho tạo tác vụ mới cùng loại nếu có lời mời đang nằm trong một tác vụ cùng loại
chưa chạy xong, tránh hai tác vụ giẫm chân nhau.

### 4.7 Dữ liệu nào đến từ đâu

| Nhóm dữ liệu | Nguồn | Ghi chú |
| --- | --- | --- |
| Hồ sơ và chỉ số Creator | TikTok | GMV, lượt xem, tỷ lệ đăng, follower, hạng mục |
| Sản phẩm và tồn kho | TikTok | Đồng bộ theo shop |
| Lời mời và trạng thái Creator trong lời mời | TikTok | Lấy lại tại thời điểm chạy tác vụ |
| Yêu cầu mẫu, đơn hàng, vận đơn, nội dung đã đăng | TikTok | Qua job đồng bộ |
| Nhãn, ghi chú nội bộ, người phụ trách | GOPUSH | Không đẩy lên TikTok |
| Blacklist | GOPUSH | Áp ở phía GOPUSH trước khi gọi API |
| Bộ lọc đã lưu, mẫu nội dung, quy tắc tự động | GOPUSH | Dùng lại nhiều lần |
| Hạn mức an toàn, giãn cách | GOPUSH | Trần cứng thì lấy từ TikTok |
| Nhật ký hoạt động | GOPUSH | Ai làm gì, lúc nào, trên shop nào |

---

## 5. Bản đồ màn hình

10 module, 28 màn hình trong ứng dụng và 5 trang công khai.

| Module | Màn hình | Đường dẫn |
| --- | --- | --- |
| **Tổng quan** | Trang chủ · Dashboard | `#/home` · `#/dashboard` |
| **Creator** | Tìm Creator · Kho Creator · Nhãn · Blacklist | `#/s/{shop}/creators/discover` · `.../library` · `#/creators/tags` · `.../blacklist` |
| **Chiến dịch** | Lời mời hàng loạt · Nhắn tin hàng loạt · Điều chỉnh kế hoạch · Thư viện mẫu | `#/s/{shop}/campaigns/invites` · `.../messages` · `.../tasks` · `#/templates` |
| **Hàng mẫu** | Yêu cầu hàng mẫu · Theo dõi vận đơn | `#/s/{shop}/samples` · `.../samples/shipments` |
| **Tự động hóa** | Lời mời tự động · Tin nhắn tự động | `#/s/{shop}/auto/invites` · `.../auto/messages` |
| **Báo cáo** | Báo cáo tổng · Theo chiến dịch · Báo cáo custom | `#/reports` · `#/reports/campaigns` · `#/reports/custom` |
| **GOPUSH AI** | Hỏi đáp · Report đã tạo · Cài đặt AI | `#/ai` · `#/ai/reports` · `#/ai/settings` |
| **Cửa hàng** | Danh sách shop · Chi tiết shop | `#/shops` · `#/shops/{shop}` |
| **Nhóm** | Thành viên · Vai trò & quyền · Nhật ký hoạt động | `#/team/members` · `#/team/roles` · `#/team/audit` |
| **Cài đặt** | Hồ sơ · Gói & thanh toán · Thông báo | `#/settings/profile` · `#/settings/billing` · `#/settings/notifications` |
| Công khai | Landing · Đăng nhập · Đăng ký · Bảo mật · Điều khoản | `#/` · `#/login` · `#/signup` · `#/privacy` · `#/terms` |

Khung giao diện gồm ba tầng: thanh trên (logo, chọn shop, tìm nhanh, hạn mức, ngôn
ngữ, theme sáng/tối, thông báo, tài khoản) → cột icon module → cột menu con (thu gọn
được) → vùng nội dung.

---

## 6. Tổng quan

### 6.1 Trang chủ

Màn mặc định khi vào app, trả lời ba câu: hôm nay làm gì, đang chạy cái gì, có gì bất thường.

- **Banner** dẫn sang màn tìm Creator.
- **Thao tác nhanh** — 8 thẻ đi thẳng tới việc hay làm nhất: Tìm Creator, Tạo lời mời
  hàng loạt, Duyệt hàng mẫu, Theo dõi vận đơn, Nhắn tin hàng loạt, Điều chỉnh kế hoạch,
  Thư viện mẫu, Ủy quyền shop mới. Mỗi thẻ có icon, tên, một câu mô tả tính năng và
  chèn số liệu sống (ví dụ "hiện có 18 yêu cầu đang chờ xử lý").
- **Việc cần làm hôm nay** — danh sách gộp từ dữ liệu thật: yêu cầu mẫu chờ duyệt,
  vận đơn đã nhận quá 5 ngày mà chưa lên nội dung, shop sắp hết hạn ủy quyền, chiến
  dịch đang lỗi. Mỗi dòng có nút xử lý ngay.
- **Đang chạy** — các chiến dịch đang gửi, kèm tiến độ và tỷ lệ chấp nhận.
- **Nhịp 7 ngày qua** và **Gần đây** — biểu đồ ngắn và các thao tác mới nhất.

### 6.2 Dashboard

Số liệu gộp mọi shop hoặc từng shop, chọn kỳ 7/30/90 ngày.

- **6 thẻ KPI**: GMV liên kết, đơn liên kết, hoa hồng, Creator đã mời, tỷ lệ chấp
  nhận, số video/live — mỗi thẻ có đường sparkline và mức tăng giảm so với kỳ trước.
- **Doanh thu liên kết** — biểu đồ đường GMV và hoa hồng, xem theo ngày/tuần/tháng.
- **Cơ cấu GMV theo ngành hàng** — biểu đồ tròn 5 nhóm lớn nhất.
- **Phễu hợp tác** — Đã mời → Chấp nhận → Xin mẫu → Nhận mẫu → Lên video/live → Có đơn,
  kèm tỷ lệ chuyển đổi từng bước.
- **Video và live theo tuần**, **Top Creator theo GMV**, **Hiệu suất theo cửa hàng**.
- **Sức khỏe hệ thống** — hạn mức đã dùng hôm nay, số shop còn hạn ủy quyền, lần đồng
  bộ gần nhất, số quy tắc tự động đang bật.

---

## 7. Creator

### 7.1 Tìm Creator

Màn tìm kiếm trong kho Creator của TikTok. Bộ lọc bám đúng các trường API trả về, chia
ba nhóm, đổi nhóm bằng segmented control để không chiếm chiều cao:

| Nhóm | Điều kiện lọc |
| --- | --- |
| Nhà sáng tạo | Hạng mục sản phẩm (cây 2 cấp, 27 nhóm lớn / 189 nhóm nhỏ), hoa hồng trung bình, loại nội dung (Video / LIVE), có agency hay độc lập, ngôn ngữ, ngôi sao sáng tạo, chưa mời trong 90 ngày |
| Người theo dõi | Độ tuổi (18–24 → 55+), giới tính kèm tỷ lệ tối thiểu, tổng follower |
| Hiệu suất | GMV, số món đã bán, lượt xem trung bình mỗi video, người xem trung bình mỗi LIVE, tỷ lệ tương tác, tần suất đăng bài, thương hiệu đã cộng tác |

Ngoài ra có: ô tìm theo tên/username, hàng chip điều kiện hay dùng, 6 kiểu sắp xếp
(liên quan nhất, GMV cao nhất, bán nhiều nhất, tương tác cao nhất, lượt xem cao nhất,
nhiều follower nhất), **lưu bộ lọc thành mẫu** để mở lại nhanh, và xuất Excel.

Từ kết quả lọc có thể: mở hồ sơ Creator, lưu vào Kho, gắn nhãn, thêm vào blacklist,
hoặc **tạo lời mời ngay từ kết quả**.

**Hồ sơ Creator** (mở dạng drawer bên phải) gồm: ảnh đại diện, username, hạng mục,
follower, GMV 30 ngày, tỷ lệ đăng bài, GPM, loại nội dung, lượt xem trung bình,
người xem LIVE, số món bán 30 ngày, tỷ lệ tương tác, hoa hồng trung bình, có agency
hay không, chân dung khán giả (giới tính, độ tuổi, vùng), lịch sử với shop, lịch sử
hàng mẫu và video, nhãn, ghi chú nội bộ, người phụ trách. Có nút mở kênh TikTok.

### 7.2 Kho Creator

Những Creator đã lưu, đã liên hệ hoặc đã hợp tác với shop đang chọn, kèm **trạng thái
quan hệ**: Mới → Đã mời → Đã chấp nhận → Đang hợp tác → Ngừng. Lọc theo nhãn, quan hệ,
người phụ trách; chọn nhiều dòng để gắn nhãn, nhắn tin hoặc mời hàng loạt.

### 7.3 Nhãn

Nhãn dùng chung cho cả nhóm, mỗi nhãn có màu và số Creator đang gắn. Dùng để phân loại
theo cách riêng của shop: "đã lên đơn", "chờ gửi mẫu", "ưu tiên Tết"…

### 7.4 Blacklist

Creator không bao giờ gửi tới. Đã vào blacklist thì **tự động bị loại khỏi mọi chiến
dịch và mọi quy tắc tự động hóa**, kể cả khi vẫn khớp bộ lọc. Ghi rõ lý do chặn, ai
chặn, lúc nào.

---

## 8. Chiến dịch

### 8.1 Lời mời hàng loạt — wizard 4 bước

Dựng theo form "mời cộng tác" của TikTok Affiliate nhưng chia thành các bước riêng,
xong bước này mới mở được bước sau. Nút *Tiếp tục* luôn nêu rõ còn thiếu gì.

**Bước 1 — Tạo lời mời**

| Trường | Ràng buộc |
| --- | --- |
| Tên lời mời | Tối đa 30 ký tự, Creator không nhìn thấy |
| Thời hạn hiệu lực | Chọn ngày, sớm nhất là ngày mai |
| Khoảng cách giữa các lời mời | 5s / 4s / 3s / 2s / 1s — gửi chậm hơn thì an toàn hơn |
| Chia sẻ lời mời vào cửa sổ trò chuyện | Bật/tắt |
| Thông tin liên hệ | **Bắt buộc đủ ba kênh Zalo + Email + Facebook** (ba dòng khóa sẵn, không xóa được). Thêm kênh phụ được: Telegram, WhatsApp, Line, Viber, số điện thoại — đã thêm thì phải điền |
| Nội dung lời mời | Tối đa 500 ký tự. Có **Chèn tên Creator**, **Dùng mẫu có sẵn** (mở popup chọn từ Thư viện mẫu), **Kiểm tra nội dung** (soát từ nhạy cảm) |
| Loại nội dung ưu tiên | Video link bán hàng / LIVE link bán hàng / Khác |

**Bước 2 — Chọn sản phẩm**

Lấy danh sách từ shop đã ủy quyền qua popup. Mỗi dòng đặt hoa hồng tiêu chuẩn 1–80%,
công tắc hoa hồng quảng cáo cửa hàng kèm tỷ lệ riêng, hiển thị hoa hồng ước tính theo
giá bán. Có **thiết lập hàng loạt** cho mọi dòng. Một lời mời chứa 1–100 sản phẩm;
khuyến nghị mỗi lần thêm không quá 10 để Creator không ngại nhận.

**Bước 3 — Hàng mẫu miễn phí**

Bật/tắt cấp mẫu. Chọn **xem xét thủ công** (có nhãn *Nên dùng*) hoặc **tự động phê
duyệt**, kèm tỷ lệ phê duyệt thật của shop để người dùng có cơ sở quyết định.

**Bước 4 — Chọn Creator** — bước quan trọng nhất, có ba nguồn:

| Nguồn | Cách lọc |
| --- | --- |
| **TikTok Marketplace** | Đúng định dạng API trả về, ba nhóm điều kiện như mục 5.1 |
| **Database GOPUSH** | Bộ lọc riêng của GOPUSH: ngành hàng, follower, GMV, tỷ lệ đăng, loại nội dung, quốc gia, nhãn, quan hệ, thông tin liên hệ |
| **Creator chỉ định** | Dán tối đa 5.000 username hoặc tải file Excel. Không có bộ lọc |

Chọn tới đâu, thanh chân hiện ngay **`N Creator → M chiến dịch`** và chặn khi chạm hạn
mức còn lại trong ngày. Bấm tạo là hệ thống cắt danh sách thành từng nhóm 50 người,
sinh N chiến dịch cùng lô, đặt tên `Tên lời mời – nhóm 1..N`, đánh dấu Creator "Đã mời"
và trừ hạn mức.

**Danh sách đợt mời** có tab theo trạng thái (Tất cả / Đang chạy / Tạm dừng / Nháp /
Hoàn thành / Lỗi), tiến độ gửi, tỷ lệ chấp nhận, nút tạm dừng – chạy – nhân bản – xóa,
và nút **Gom theo lô**.

### 8.2 Nhắn tin hàng loạt — wizard 3 bước

1. **Thiết lập tin nhắn** — tên đợt; phương thức gửi (chỉ API chính thức, phương án
   plugin RPA để hiện nhưng khóa và nói rõ lý do không hỗ trợ); chế độ thẻ hoặc bình
   thường; tiêu đề; nội dung (có Chèn tên Creator / Dùng mẫu có sẵn / Kiểm tra nội dung);
   thẻ sản phẩm tối đa 5; giãn cách và cỡ nhóm.
2. **Chọn Creator** — dùng chung ba nguồn như trên.
3. **Xem lại và tạo** — bản xem trước đúng như Creator sẽ nhận.

Khuyến nghị tối đa 999 tin nhắn riêng mỗi ngày cho một shop.

### 8.3 Điều chỉnh kế hoạch — 4 tác vụ hàng loạt

Chạy trên các lời mời **đã tạo**. Luồng ba màn: danh sách tác vụ → chọn loại (4 thẻ
căn giữa) → biểu mẫu.

| Tác vụ | Cấu hình | Kết quả ghi lại |
| --- | --- | --- |
| **Dọn dẹp lời mời kém hiệu quả** | 3 chế độ: ① gỡ Creator chưa thêm showcase và chưa quảng bá ② gỡ Creator chưa quảng bá ③ hủy toàn bộ lời mời đã chọn (có hộp xác nhận, không hoàn tác được) | Lời mời đã hủy / giữ lại, số Creator đã gỡ |
| **Bổ sung Creator vào lời mời cũ** | Trần 50 Creator mỗi lời mời; mẫu bộ lọc; bộ lọc Creator (danh mục, độ tuổi, giới tính, follower, GMV, lượt xem TB, tỷ lệ tương tác, người xem LIVE). Hiện luôn số Creator khớp bộ lọc | Creator đã thêm, bỏ qua, lỗi |
| **Gia hạn & đổi tên lời mời** | Thời hạn 3 → 365 ngày tính từ lúc tác vụ chạy; tên mới tối đa 30 ký tự (27 khi chọn nhiều, tự thêm hậu tố `-01`, `-02`…) | Lời mời cập nhật / bỏ qua / lỗi |
| **Thêm sản phẩm vào lời mời** | Chọn sản phẩm từ shop, hoa hồng 1–80%, công tắc hoa hồng quảng cáo, thiết lập hàng loạt | Số lượt thêm, bỏ qua, lỗi |

Biểu mẫu nào cũng kết thúc bằng **bảng chọn lời mời dùng chung**: hai phạm vi *Đang
hiệu lực* và *Sắp hết hạn* (còn dưới 4 ngày), tìm theo tên / ID lời mời / tên sản phẩm,
hiện số Creator đã mời – đã chấp nhận – đã quảng bá – số sản phẩm – thời hạn.

Tác vụ tạo ra ở trạng thái **Chờ chạy**; bấm ▶ để chạy và xem kết quả áp thẳng lên dữ
liệu. Có tạm dừng, tiếp tục, dừng, chạy lại phần lỗi, xem chi tiết từng lời mời.
Quy tắc an toàn: mỗi lời mời xử lý độc lập, một cái lỗi không làm dừng cả tác vụ;
trạng thái luôn được lấy lại tại thời điểm chạy.

### 8.4 Thư viện mẫu

Hai loại: **mẫu lời mời** (kèm phạm vi sản phẩm, hoa hồng, có cấp mẫu miễn phí hay
không) và **mẫu tin nhắn** (văn bản, thẻ sản phẩm, ảnh). Mỗi mẫu có danh sách biến
thay thế, đếm lượt dùng, nhân bản, sửa, xóa. Mẫu dùng chung cho cả chiến dịch và
tự động hóa.

---

## 9. Hàng mẫu

Hai màn này đọc dữ liệu đã đồng bộ từ TikTok về, **không gọi thẳng TikTok từ trình
duyệt**. Token của shop do backend giữ.

### 9.1 Yêu cầu hàng mẫu

Trên cùng là hai loại mẫu: **Hàng mẫu miễn phí** / **Hàng mẫu có thể hoàn tiền**, mỗi
loại đếm tab riêng. Sáu tab theo vòng đời:

| Mã trạng thái | Nhãn | Ý nghĩa |
| --- | --- | --- |
| `PENDING` | Chờ duyệt | Creator đã xin mẫu, shop chưa xử lý |
| `AWAITING_SHIPMENT` | Chờ gửi hàng | Đã duyệt, chưa gửi |
| `SHIPPED` | Đang giao | Đã gửi, chưa ký nhận |
| `CONTENT_PENDING` | Chờ đăng nội dung | Creator đã nhận mẫu, chưa đăng |
| `COMPLETED` | Đã hoàn thành | Creator đã đăng video hoặc LIVE |
| `CANCELLED` | Đã hủy | Bị từ chối, hết hạn hoặc hủy |

**Cột đổi theo tab** để chỉ hiện thứ có nghĩa:

- Mọi tab: thông tin Creator (username, nickname, ngành hàng, follower, nhãn Đã lưu /
  Danh sách đen, link kênh), thông tin sản phẩm (tên + ID có nút sao chép), SKU,
  hoa hồng, phương thức phê duyệt (thủ công / tự động).
- Chờ duyệt: thêm tỷ lệ đăng dự kiến, GMV 30 ngày, lượt xem TB mỗi video, ID lời mời nguồn.
- Đã duyệt trở đi: thêm mã đơn hàng.
- Đang giao / Chờ đăng: thêm mã vận đơn, đơn vị vận chuyển, hành trình mới nhất, thời
  gian ký nhận.
- Đã hoàn thành: thêm **nội dung đã đăng** và **đánh giá**.
- Đã hủy: thêm lý do từ chối.

**Thao tác**

| Thao tác | Ở đâu | Ghi chú |
| --- | --- | --- |
| Duyệt / Từ chối | Từng dòng, tab Chờ duyệt | Popup hỏi Đồng ý / Từ chối; từ chối phải chọn một trong bốn lý do: Creator không phù hợp, sản phẩm ngừng bán, sản phẩm hết hàng, lý do khác |
| Duyệt / Từ chối hàng loạt | Thanh chọn nhiều | Hỏi xác nhận "Áp dụng … cho N Creator đã chọn?"; dòng đã đổi trạng thái thì bỏ qua và báo số thực tế |
| Gửi tin nhắn mẫu | Chỉ tab Chờ duyệt, tối đa 100 | Thẻ mẫu luôn gửi kèm, thêm văn bản ≤ 2.000 ký tự và một ảnh tùy chọn |
| Lưu Creator · Danh sách đen | Từng dòng và hàng loạt | Ghi ngược vào Kho Creator và Blacklist của shop |
| Tạo tác vụ kết nối | Hàng loạt | Mở wizard lời mời, điền sẵn Creator đã chọn |
| Xem nội dung | Tab hoàn thành | Drawer hai tab Video / LIVE |
| Để lại đánh giá | Tab hoàn thành | 1–5 sao kèm ghi chú nội bộ; có lọc nhanh *Chưa đánh giá* |
| Cập nhật dữ liệu | Header | Kéo dữ liệu mới từ TikTok, chặn bấm liên tiếp trong 5 phút |

**Chi tiết nội dung** — mỗi video hoặc phiên LIVE hiện tiêu đề, thời gian phát hành,
lượt xem, lượt thích, bình luận, số đơn phát sinh, GMV và nút mở trên TikTok.

Header còn hiện mốc dữ liệu dạng `Dữ liệu cập nhật đến: 2026-09-25 09:39:42 (UTC+7)`
và lưu ý: nếu shop có quá nhiều yêu cầu mẫu, TikTok chỉ trả về các yêu cầu gần nhất
nên dữ liệu có thể chưa đầy đủ.

### 9.2 Theo dõi vận đơn

Cùng bộ dữ liệu nhưng chỉ lấy các yêu cầu đã có mã vận đơn.

- **4 thẻ số liệu**: số vận đơn đang theo dõi, số ngày trung bình từ lúc xin mẫu đến
  khi ký nhận, số đơn ký nhận quá 5 ngày mà chưa đăng nội dung, tỷ lệ lên nội dung
  sau khi nhận mẫu.
- **Lọc**: đơn vị vận chuyển, trạng thái, kết quả đồng bộ, chip *Quá 5 ngày chưa đăng*.
- **Cột Đồng bộ** hiện nhãn lỗi kèm nút thử lại từng dòng khi TikTok trả về thất bại.
- **Popup hành trình** dạng timeline: đã lấy hàng → đang vận chuyển → đến bưu cục →
  đang giao → đã ký nhận, mỗi mốc có mô tả và thời gian.
- **Gửi nhắc** từng Creator, hàng loạt, hoặc nhắc tất cả đơn quá hạn.

---

## 10. Tự động hóa

### 10.1 Lời mời tự động

Quy tắc dạng: mỗi ngày vào giờ đã hẹn, tìm Creator **mới khớp bộ lọc đã lưu và chưa
từng được mời**, gửi lời mời theo mẫu, giới hạn số lượng mỗi lần. Blacklist luôn được
loại trừ. Mỗi quy tắc có công tắc bật/tắt, nút chạy thử, lịch sử chạy (số đã gửi,
số lỗi, thời điểm).

### 10.2 Tin nhắn tự động

Quy tắc dạng **Khi → Gửi**: khi Creator chấp nhận lời mời, khi nhận mẫu, khi đăng
video đầu tiên, khi im lặng quá N ngày… thì gửi mẫu tin nhắn tương ứng. Cũng có lịch
sử chạy và chạy thử.

---

## 11. Báo cáo

| Màn | Nội dung |
| --- | --- |
| **Báo cáo tổng** | Kết quả theo kỳ: GMV, đơn, hoa hồng, video/live, Creator hoạt động; biểu đồ xu hướng theo ngày/tuần/tháng; bảng so sánh theo shop |
| **Theo chiến dịch** | Phễu chuyển đổi từng chiến dịch, so sánh hiệu quả giữa các chiến dịch, chỉ ra bước rơi nhiều nhất |
| **Báo cáo custom** | Tự chọn bộ lọc, chỉ số và cách nhóm (theo shop, ngành hàng, Creator, chiến dịch); lưu lại để mở nhanh lần sau; xuất Excel |

---

## 12. GOPUSH AI

| Màn | Nội dung |
| --- | --- |
| **Hỏi đáp** | Hỏi bằng tiếng Việt thường ("Creator nào đáng đầu tư?", "Chiến dịch nào kém?", "Tháng này có gì bất thường?"), AI quét dữ liệu trong hệ thống và trả về kèm bảng, số liệu, đề xuất hành động |
| **Report đã tạo** | Danh sách report AI sinh ra: xem lại, tải, xuất file, chia sẻ, xóa |
| **Cài đặt AI** | Dạy AI: nguồn dữ liệu được phép quét, tiêu chí chấm điểm Creator, giọng văn trả lời, danh sách từ cấm, có ghi nhật ký mọi câu hỏi hay không, chỉ đọc shop được giao hay tất cả |

Có hai rào an toàn mặc định: AI **không tự gửi** tin nhắn hay lời mời, và **không đề
xuất liên hệ Creator đang trong blacklist**.

---

## 13. Cửa hàng

### 13.1 Danh sách shop

Mỗi shop hiện cờ quốc gia, tên, tiền tệ, trạng thái ủy quyền (còn hạn / sắp hết hạn /
đã hết hạn), ngày token hết hạn, lần đồng bộ gần nhất, người phụ trách. Thao tác:
ủy quyền shop mới qua OAuth, cập nhật ủy quyền, đồng bộ ngay, gỡ liên kết.

### 13.2 Chi tiết shop

Bốn tab:

- **Tổng quan** — thông tin shop, nhóm quyền đã cấp (Shop authorization, Product,
  Affiliate), kết quả 30 ngày.
- **Sản phẩm** — danh sách sản phẩm đã đồng bộ kèm SKU, giá, hoa hồng, tồn kho, trạng thái.
- **Giới hạn gửi** — trần TikTok cấp (chỉ đọc), trần an toàn của GOPUSH (sửa được),
  giãn cách giữa hai lần gửi, luôn loại trừ blacklist, ghi nhật ký mọi thao tác, tự
  tạm dừng khi API trả lỗi liên tiếp. Hiện luôn *chia được bao nhiêu chiến dịch × 50
  Creator* từ hạn mức còn lại.
- **Người được giao** — thành viên nào được làm việc trên shop này.

---

## 14. Nhóm

### 14.1 Thành viên

Mời qua email, giao shop cho từng người, khóa hoặc mở tài khoản, xem lần hoạt động
gần nhất. Trạng thái: Hoạt động / Chờ nhận lời mời / Đã khóa.

### 14.2 Vai trò & quyền

Bốn vai trò mặc định, xem được ma trận quyền theo 10 module × 5 hành động (Xem, Tạo,
Sửa, Xóa, Gửi):

| Vai trò | Phạm vi |
| --- | --- |
| **Chủ** | Toàn quyền, kể cả gói và thanh toán |
| **Quản lý** | Mọi nghiệp vụ trên shop được giao; không xóa hàng mẫu, không đổi gói |
| **BD** | Tìm, mời, nhắn và chăm sóc Creator; không xóa, không vào phần quản trị |
| **Chỉ xem** | Xem báo cáo và dữ liệu, không thao tác |

### 14.3 Nhật ký hoạt động

Ai làm gì, lúc nào, trên shop nào. Lọc theo người, loại thao tác, shop, khoảng thời
gian. Mọi thao tác quan trọng đều ghi vào đây: tạo chiến dịch, duyệt mẫu, chặn Creator,
đổi hạn mức, cập nhật ủy quyền…

---

## 15. Cài đặt

| Màn | Nội dung |
| --- | --- |
| **Hồ sơ** | Tên, email, ảnh đại diện, đổi mật khẩu, bảo mật hai lớp, ngôn ngữ, múi giờ |
| **Gói & thanh toán** | Gói hiện tại, hạn mức đã dùng, phương thức thanh toán, lịch sử hóa đơn (tải được) |
| **Thông báo** | Chọn sự kiện nào báo qua email, Zalo OA hoặc trong app: yêu cầu mẫu mới, chiến dịch lỗi, token sắp hết hạn, vận đơn quá hạn… |

---

## 16. Các trường hợp sử dụng chính

Tám tình huống thật mà đội vận hành gặp hằng tuần. Mỗi ca ghi rõ ai làm, làm ở đâu và
kết quả đo được.

### UC1 — Mở tệp Creator cho một ngành hàng mới

**Ai:** BD hoặc Quản lý · **Tần suất:** khi ra mắt dòng sản phẩm mới

| Bước | Làm ở đâu |
| --- | --- |
| 1. Lọc Creator theo hạng mục, follower, GMV, tỷ lệ tương tác | Tìm Creator |
| 2. Lưu bộ lọc thành mẫu để lần sau dùng lại | Nút *Lưu bộ lọc* |
| 3. Bấm *Tạo lời mời từ kết quả*, đặt tên, hạn hiệu lực, ba kênh liên hệ, nội dung | Wizard bước 1 |
| 4. Chọn sản phẩm và hoa hồng, bật hàng mẫu miễn phí | Wizard bước 2 – 3 |
| 5. Chọn 3.000 Creator, xem thanh chân báo *3.000 Creator → 60 chiến dịch* | Wizard bước 4 |
| 6. Bấm tạo, hệ thống tự chia lô và gửi theo giãn cách | — |

**Kết quả:** 60 chiến dịch được tạo trong một lần bấm, thay vì mở TikTok 60 lần.
Theo dõi tiến độ ở danh sách đợt mời, bật *Gom theo lô* để xem một dòng.

### UC2 — Vòng lặp hằng tuần: dọn rồi bù

**Ai:** Quản lý · **Tần suất:** mỗi tuần một lần

Lời mời cũ thường đầy Creator nhận rồi để đó. Suất mời bị chiếm mà không ra tiền.

| Bước | Làm ở đâu |
| --- | --- |
| 1. Chạy tác vụ **Dọn dẹp lời mời kém hiệu quả**, chế độ ① với các lời mời đang hiệu lực | Điều chỉnh kế hoạch |
| 2. Xem kết quả: bao nhiêu lời mời bị hủy, bao nhiêu Creator được gỡ | Cột *Kết quả* |
| 3. Chạy tiếp tác vụ **Bổ sung Creator vào lời mời cũ** với bộ lọc mong muốn | Điều chỉnh kế hoạch |
| 4. Hệ thống tự tính chỗ trống của từng lời mời rồi bù cho đủ 50 | — |

**Kết quả:** các lời mời cũ luôn đầy Creator còn "sống", không phải tạo lời mời mới.

### UC3 — Duyệt hàng mẫu buổi sáng

**Ai:** BD · **Tần suất:** hằng ngày

| Bước | Làm ở đâu |
| --- | --- |
| 1. Bấm *Cập nhật dữ liệu* để kéo yêu cầu mới nhất | Yêu cầu hàng mẫu |
| 2. Ở tab *Chờ duyệt*, đọc ngay trên bảng: tỷ lệ đăng dự kiến, GMV 30 ngày, lượt xem TB | — |
| 3. Tick các dòng đạt chuẩn → **Duyệt** hàng loạt | Thanh chọn nhiều |
| 4. Các dòng không đạt → **Từ chối** kèm lý do phù hợp | Popup 4 lý do |
| 5. Với nhóm còn phân vân, gửi **tin nhắn mẫu** hỏi thêm trước khi quyết | Tối đa 100/lần |

**Kết quả:** xử lý cả trăm yêu cầu trong vài phút, mỗi quyết định đều có số liệu đỡ lưng.

### UC4 — Thúc Creator đã nhận mẫu nhưng chưa lên nội dung

**Ai:** BD · **Tần suất:** 2 – 3 lần mỗi tuần

| Bước | Làm ở đâu |
| --- | --- |
| 1. Mở màn vận đơn, bấm chip *Quá 5 ngày chưa đăng* | Theo dõi vận đơn |
| 2. Kiểm tra hành trình để chắc chắn Creator đã thực sự nhận hàng | Popup hành trình |
| 3. Bấm *Gửi nhắc cho đơn quá hạn* để nhắc cả nhóm | Nút ở header |

**Kết quả:** thu hồi giá trị từ mẫu đã gửi. Thẻ *Tỉ lệ lên nội dung sau nhận mẫu* trên
cùng màn cho biết việc nhắc có hiệu quả không.

### UC5 — Gia hạn loạt lời mời sắp hết hạn

**Ai:** Quản lý · **Tần suất:** khi có lời mời còn dưới 4 ngày

| Bước | Làm ở đâu |
| --- | --- |
| 1. Chọn tác vụ **Gia hạn & đổi tên lời mời** | Điều chỉnh kế hoạch |
| 2. Chọn thời hạn mới (ví dụ 60 ngày) và tên mới nếu muốn | Biểu mẫu |
| 3. Đổi phạm vi bảng sang *Sắp hết hạn*, chọn hết | Bảng chọn lời mời |
| 4. Tạo và chạy tác vụ | — |

**Kết quả:** các lời mời đang chạy tốt không bị đứt giữa chừng. Chọn nhiều thì tên tự
thêm hậu tố `-01`, `-02` để không trùng.

### UC6 — Đẩy sản phẩm mới vào các lời mời đang chạy

**Ai:** Quản lý · **Tần suất:** khi có hàng mới

| Bước | Làm ở đâu |
| --- | --- |
| 1. Chọn tác vụ **Thêm sản phẩm vào lời mời** | Điều chỉnh kế hoạch |
| 2. Chọn sản phẩm từ shop, đặt hoa hồng, bật hoa hồng quảng cáo nếu cần | Popup sản phẩm |
| 3. Chọn các lời mời đang hiệu lực | Bảng chọn lời mời |

**Kết quả:** sản phẩm mới có mặt ngay trong tệp Creator đang hợp tác, không cần mời lại
từ đầu. Sản phẩm đã có trong lời mời sẽ được bỏ qua, không ghi đè hoa hồng cũ.

### UC7 — Báo cáo cuối tháng

**Ai:** Quản lý hoặc Chủ · **Tần suất:** hằng tháng

| Bước | Làm ở đâu |
| --- | --- |
| 1. Xem phễu hợp tác để biết bước nào đang rơi nhiều nhất | Dashboard |
| 2. So sánh hiệu quả từng chiến dịch | Báo cáo theo chiến dịch |
| 3. Dựng báo cáo theo chiều mình cần rồi lưu lại | Báo cáo custom |
| 4. Xuất Excel gửi khách hoặc ban giám đốc | Nút *Xuất Excel* |

**Kết quả:** trả lời được câu "tiền đi đâu, bước nào đang tắc" bằng số, không nói cảm tính.

### UC8 — Onboard một shop mới

**Ai:** Chủ hoặc Quản lý · **Tần suất:** khi nhận shop mới

| Bước | Làm ở đâu |
| --- | --- |
| 1. Ủy quyền shop qua OAuth | Cửa hàng → *Ủy quyền shop mới* |
| 2. Đồng bộ sản phẩm | Chi tiết shop → *Đồng bộ ngay* |
| 3. Đặt trần an toàn và giãn cách phù hợp với shop | Tab *Giới hạn gửi* |
| 4. Giao shop cho thành viên phụ trách | Nhóm → Thành viên |
| 5. Nhập blacklist nếu đã có danh sách sẵn | Creator → Blacklist |

**Kết quả:** shop sẵn sàng chạy chiến dịch, người phụ trách chỉ thấy đúng shop của mình.

---

## 17. Ràng buộc từ TikTok — phần không được tự đổi

Vì đi qua ISV nên các trường và giới hạn phải trùng khớp. Toàn bộ nằm một chỗ trong
`assets/js/tiktok.js`, đổi enum thì sửa một file.

| Hạng mục | Giá trị |
| --- | --- |
| Tên lời mời | ≤ 30 ký tự |
| Nội dung lời mời | ≤ 500 ký tự |
| Sản phẩm mỗi lời mời | 1 – 100 |
| Hoa hồng | 1 – 80% (số nguyên) |
| **Creator mỗi chiến dịch** | **50** (thị trường Việt Nam) |
| Kênh liên hệ bắt buộc | Zalo |
| Cây hạng mục sản phẩm | 27 nhóm cấp 1 / 189 nhóm cấp 2 |
| Kênh liên hệ hỗ trợ | Zalo, Email, Facebook, Telegram, WhatsApp, Line, Viber, số điện thoại |
| Tin nhắn mẫu mỗi lần gửi | ≤ 100 yêu cầu, chỉ khi đang Chờ duyệt |
| Ngưỡng "sắp hết hạn" | Còn dưới 4 ngày |

**Định dạng tiền theo chuẩn Việt Nam**: dấu chấm ngăn nghìn, dấu phẩy ngăn thập phân.
Số đầy đủ `1.234.568 đ`; dạng rút gọn `500K`, `1,7tr`, `1,24 tỷ`.

**Mọi ID của TikTok** (lời mời, sản phẩm, Creator, đơn hàng) dài 19 chữ số nên luôn
lưu và truyền dạng chuỗi, không dùng kiểu số.

---

## 18. Trạng thái hiện tại của bản này

**Đã chạy thật trên dữ liệu trong máy** — thao tác được và kết quả lưu lại sau khi tải
lại trang:

- Toàn bộ điều hướng, đổi shop, đổi ngôn ngữ VI/EN, theme sáng/tối, thu gọn menu.
- Lọc, sắp xếp, phân trang, chọn nhiều dòng, lưu bộ lọc, xuất CSV ở mọi bảng.
- Hai wizard tạo lời mời và nhắn tin, kể cả chia lô và trừ hạn mức.
- Bốn tác vụ điều chỉnh kế hoạch, chạy xong áp kết quả thẳng lên dữ liệu lời mời.
- Duyệt / từ chối / nhắn tin hàng loạt cho yêu cầu mẫu, đánh giá, xem nội dung, hành
  trình vận đơn.
- Lưu Creator, gắn nhãn, blacklist, quy tắc tự động hóa, nhật ký hoạt động.

**Đang dùng dữ liệu mô phỏng, chờ nối API thật**: 4 shop, 1.200 Creator, 15 chiến dịch,
6 tác vụ, 96 yêu cầu mẫu, 8 mẫu, 5 nhãn. Dữ liệu sinh bằng bộ số giả ngẫu nhiên có hạt
cố định nên lần nào mở cũng giống nhau; bấm avatar → *Đặt lại dữ liệu thử* để về ban đầu.

**Cần backend làm trước khi chạy thật**:

1. Giữ `access_token`, `refresh_token`, `shop_cipher` theo từng shop; tự làm mới token
   trước khi hết hạn. **Không bao giờ đưa token TikTok xuống trình duyệt.**
2. Job đồng bộ (bấm nút + định kỳ): kéo yêu cầu mẫu theo từng trạng thái, phân trang
   đến hết, upsert theo ID; bổ sung số liệu Creator, đơn hàng, vận chuyển. Lỗi từng
   phần thì đánh dấu và đi tiếp, không dừng cả job.
3. Mọi request mang header ngữ cảnh shop (`X-Shop-ID`, `X-Shop-Region`).
4. Chặn gọi lặp ở phía server, không chỉ dựa vào giao diện.
5. Duyệt / từ chối: gọi API TikTok trước, thành công mới đổi trạng thái trong DB.
6. Lỗi giới hạn tần suất: tự thử lại tối đa 3 lần, giãn cách lũy thừa từ 60 giây, sau
   đó mới báo lỗi.

**Còn phải xác nhận với TikTok Partner Center**: endpoint và version chính xác của các
API yêu cầu mẫu, duyệt mẫu, nhắn tin cho Creator, vận chuyển; và app phải được cấp
quyền Affiliate Seller.

---

## 19. Thuật ngữ

| Từ | Nghĩa |
| --- | --- |
| Creator | Người bán hàng qua nội dung. Thống nhất dùng từ này thay cho KOL, KOC, người ảnh hưởng |
| Lời mời hợp tác | Chiến dịch mời Creator trên TikTok, tối đa 50 người |
| Lô (batch) | Nhóm chiến dịch sinh ra từ cùng một lần lọc |
| Tác vụ | Một lần chạy hàng loạt trên nhiều lời mời đã có |
| Hạn mức | Số lời mời được gửi trong ngày cho một shop |
| Showcase | Giỏ hàng của Creator; "đã thêm showcase" là Creator đã đưa sản phẩm vào giỏ |
| GMV | Tổng giá trị hàng bán qua link liên kết |
| GPM | Doanh thu trên 1.000 lượt xem |
| Tỷ lệ đăng | Phần trăm Creator đăng video hoặc LIVE sau khi nhận mẫu |
| ISV | Nhà cung cấp phần mềm độc lập, bên được TikTok cấp quyền gọi API |

