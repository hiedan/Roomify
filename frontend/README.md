# Roomify frontend

Giao diện React theo bản Figma Roomify Login (frame 3:2):
https://www.figma.com/design/EQUzrLF1Gp7poj6ArASM88?node-id=3-2

Yêu cầu Node.js 20.19+ hoặc 22.12+. Chạy trong thư mục frontend:

```sh
npm install
npm run dev
```

Mở địa chỉ mà Vite hiển thị. `npm run build` tạo bản production,
`npm run preview` xem thử bản build.

Đây là bản giao diện: email và mật khẩu được kiểm tra bằng HTML, checkbox có
thể chọn. Các nút đăng nhập, Google, Apple, đăng ký và quên mật khẩu hiển thị
thông báo chưa kết nối; backend hiện chưa có API xác thực. Không gửi hoặc lưu
mật khẩu, không lưu phiên đăng nhập. Chưa có luồng đăng ký hay quên mật khẩu.

Bốn icon SVG trong src/assets được tải trực tiếp từ bản Figma đã chốt, không
phụ thuộc URL tài nguyên tạm thời. Font dùng Inter nếu máy có, dự phòng Arial.
