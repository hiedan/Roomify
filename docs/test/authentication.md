# Đăng ký và đăng nhập Gmail

## Chạy cục bộ

1. Mở Docker Desktop. Tại gốc dự án chạy `docker compose up -d --wait`.
   Database PostgreSQL/PostGIS ở localhost:5432. Volume pgdata giữ dữ liệu;
   không dùng down -v nếu cần giữ dữ liệu. Tài khoản postgres/postgres trong
   compose chỉ dành cho môi trường phát triển.
  2. Trong backend, sao chép .env.example thành .env nếu chưa có và cấu hình
   JWT_SECRET ngẫu nhiên riêng; không commit .env. DATABASE_URL trỏ đến nhatro,
   TEST_DATABASE_URL trỏ đến nhatro_test.
3. Trong backend chạy npm install, npm run migrate rồi npm run dev.
   Migration là lệnh riêng, không tự đổi schema khi server khởi động.
4. Trong frontend chạy npm install rồi npm run dev. Vite chuyển tiếp /api đến
   http://127.0.0.1:3000. Mở địa chỉ Vite hiển thị.

## API

- POST /api/v1/auth/register: { fullName, email, password } → 201 { token, user }.
- POST /api/v1/auth/login: { email, password, remember? } → 200 { token, user }.
- GET /api/v1/auth/me: Authorization: Bearer <token> → 200 { user }.

Tất cả trả { success, data, error }. 400 dữ liệu sai, 401 sai thông tin hoặc
token hết hạn, 403 tài khoản bị khóa, 409 Gmail trùng.
Email được trim/lowercase và chỉ chấp nhận @gmail.com; mật khẩu 8–72 ký tự và
tối đa 72 byte UTF-8. Không chuẩn hóa dấu chấm/plus alias Gmail. Tài khoản
đăng ký mặc định tenant; truyền role sẽ bị từ chối. Mật khẩu băm BCrypt cost 12,
không trả password_hash về client. Chưa gửi thư xác minh hoặc Google OAuth.

## Thử giao diện

Sign Up → nhập họ tên/Gmail/mật khẩu → thấy thông tin tài khoản → đăng xuất →
Sign In lại. Thử mật khẩu sai và Gmail đã đăng ký để xem thông báo lỗi.
JWT lưu trong sessionStorage, hết hạn 1 giờ; Remember me dùng localStorage
và token 7 ngày. Reload kiểm tra token qua /me. Đăng xuất xóa token trên trình
duyệt, chưa thu hồi token tại server. Browser storage yêu cầu kiểm soát XSS
và HTTPS khi triển khai. Google/Apple bị vô hiệu hóa; quên mật khẩu chưa hỗ trợ.

## Kiểm thử

backend: npm test, npm run lint. frontend: npm run build.
Test chỉ chạy trên database kết thúc bằng _test, áp dụng migration trước và
xóa dữ liệu nghiệp vụ trong database test. Không chạy test với database thật.
