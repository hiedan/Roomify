# Bản đồ sau đăng nhập

Sau Sign In, Sign Up hoặc khôi phục phiên, frontend mở trang danh sách và
bản đồ OpenStreetMap dùng Leaflet. Đăng xuất quay lại form đăng nhập.
Desktop: danh sách bên trái, bản đồ bên phải. Mobile: bản đồ phía trên.

GET /api/v1/listings?page=1&limit=20 là API công khai cho tin đã duyệt.
Luồng: routes → controllers → services → database. Query được validate bằng
Zod; limit tối đa 50, page tối đa 1.000.000. Response dùng data là danh sách
và pagination { page, limit, total }. Tin pending/rejected luôn bị loại tại SQL.
Không đổi schema, không tự thêm phòng mẫu vào database phát triển.

Marker và danh sách dùng cùng trang dữ liệu. Bấm phòng đưa bản đồ đến vị trí,
mở popup; bấm marker chọn phòng trong danh sách. Popup dùng textContent để
không diễn giải tiêu đề/địa chỉ từ database thành HTML. Mặc định bản đồ mở tại
TP.HCM nếu chưa có phòng, không tự xin vị trí người dùng.

Chạy Docker database, backend và frontend theo authentication.md. Thử:

- Đăng nhập và reload: bản đồ hiện ngay, Đăng xuất quay về form.
- Database chưa có phòng: thông báo trống và bản đồ vẫn dùng được.
- Có phòng đã duyệt: bấm card/marker, kiểm tra popup và phân trang.
- Tắt backend: báo lỗi danh sách và nút Thử lại.
- Mạng/tile bị lỗi: thông báo trên bản đồ; danh sách vẫn có thể đọc.
- Màn hình hẹp: bản đồ và danh sách xếp dọc.

Kiểm thử: backend npm test và npm run lint; frontend npm run build.
API tests tự tạo phòng ở database test riêng; không cần seed dữ liệu thật.

Tile dùng https://tile.openstreetmap.org, hiển thị attribution. Không có API
key hoặc yêu cầu bật thanh toán. Dịch vụ tile công cộng không có SLA và có
chính sách sử dụng tại https://operations.osmfoundation.org/policies/tiles/;
giữ attribution, tuân thủ caching, không tải hàng loạt/offline. Khi triển khai
với lưu lượng lớn cần chọn nhà cung cấp tile phù hợp hoặc tự host.
