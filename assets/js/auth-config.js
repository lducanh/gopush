/* GOPUSH — cấu hình đăng nhập.
   Để trống `firebase` thì app chạy chế độ DEMO: tài khoản lưu trong trình duyệt này
   (mật khẩu băm PBKDF2), không đăng nhập Google được, không gửi email thật.

   Bật tài khoản thật + Google:
   1. console.firebase.google.com → tạo project → thêm Web app → chép cấu hình vào đây.
   2. Authentication → Sign-in method → bật "Email/Password" và "Google".
   3. Authentication → Settings → Authorized domains → thêm tên miền đang chạy GOPUSH
      (ví dụ lducanh.github.io) và localhost để chạy thử.
   Các giá trị dưới đây là định danh công khai của web app, không phải khóa bí mật. */
window.GOPUSH_AUTH = {
  /* Link mở trang ủy quyền gian hàng TikTok Shop. Bản demo dùng trang ủy quyền dịch vụ (service_id) của TikTok Shop;
     khi GOPUSH được cấp ISV, thay bằng link OAuth ủy quyền chính thức của app. */
  tiktokAuthUrl: 'https://services.tiktokshop.com/open/authorize?service_id=7520124419516778246',
  firebase: null
  /* firebase: {
    apiKey: 'AIza…',
    authDomain: 'gopush-xxxx.firebaseapp.com',
    projectId: 'gopush-xxxx',
    appId: '1:…:web:…'
  } */
};
