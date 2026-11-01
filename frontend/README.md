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

Đã nối API đăng ký/đăng nhập Gmail + mật khẩu. Đăng ký tạo tài khoản tenant.
Chạy backend ở cổng 3000; Vite chuyển tiếp /api. Google/Apple chưa hỗ trợ.
Hướng dẫn Docker, cấu hình và kiểm thử: ../docs/test/authentication.md.

Bốn icon SVG trong src/assets được tải trực tiếp từ bản Figma đã chốt, không
phụ thuộc URL tài nguyên tạm thời. Font dùng Inter nếu máy có, dự phòng Arial.
