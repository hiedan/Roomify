Roomify – Quy ước dự án (Node.js / Express)

Web tìm nhà trọ cho sinh viên: người thuê (tenant) xem và tìm nhà trọ, chủ trọ (landlord) đăng tin, admin duyệt tin. Có bản đồ, chatbot AI gợi ý, bộ lọc tìm kiếm và thông tin tự động (gần trường, gần Bách Hóa Xanh).

Tech stack
Backend: Node.js, Express, JavaScript (CommonJS: dùng require và module.exports, không dùng import/export)
Database: PostgreSQL. Thư viện truy cập DB: [ghi rõ thư viện nhóm dùng, ví dụ pg]
Bảo mật: JWT cho đăng nhập, bcrypt để mã hóa mật khẩu
Frontend: React (gọi REST API của backend)
Bên thứ ba: Google Maps / Places API, LLM API (chatbot)
Database thiết kế theo ERD_Roomify.mmd. Muốn đổi schema thì sửa ERD trước.
Cấu trúc thư mục
src/
├── routes/        # Khai báo endpoint, gắn middleware (xác thực, phân quyền, validate)
├── controllers/   # Nhận request, gọi service, trả response
├── services/      # Logic nghiệp vụ (kể cả code gọi Google Places và LLM API)
├── database/      # Kết nối và truy vấn PostgreSQL
├── middlewares/   # Xác thực JWT, kiểm tra role, xử lý lỗi
├── config/        # Đọc biến môi trường
└── utils/         # Hàm dùng chung
Luồng xử lý

routes -> controllers -> services -> database

Route chỉ khai báo endpoint và validate dữ liệu đầu vào.
Controller không chứa logic nghiệp vụ và không truy vấn database trực tiếp.
Service chứa logic nghiệp vụ và gọi database.
Luôn dùng async/await, không dùng callback.
Phân quyền (3 role)

tenant, landlord, admin

Kiểm tra role bằng middleware ở route.
Tin đăng của landlord mặc định ở trạng thái chờ duyệt. Chỉ tin đã được admin duyệt mới hiển thị công khai trên danh sách, bản đồ và trong gợi ý của chatbot. (Tên trạng thái theo ERD.)
Landlord chỉ được sửa hoặc xóa tin của chính mình.
Mật khẩu luôn mã hóa bằng bcrypt. Không log và không trả mật khẩu về client.
Định dạng response

Mọi API trả về cùng một format:

json
{ "success": true, "data": { }, "error": null }
{ "success": false, "data": null, "error": { "code": "NOT_FOUND", "message": "Không tìm thấy nhà trọ" } }
Lỗi được xử lý tập trung trong một error-handling middleware, không viết try/catch lặp lại ở mọi controller.
Dùng HTTP status đúng nghĩa (200, 201, 400, 401, 403, 404, 409).
Validate
Validate dữ liệu đầu vào ở route trước khi vào controller. Dữ liệu sai trả về 400 theo format response ở trên.
Kiểm tra nghiệp vụ (trùng email, sai quyền, trạng thái không hợp lệ) làm trong service.
Quy ước code
Đặt tên: biến và hàm camelCase, hằng số UPPER_SNAKE_CASE, bảng và cột DB snake_case.
Không viết thẳng secret, API key, thông tin DB trong code. Đọc từ biến môi trường (file .env, không commit file này).
Truy vấn database phải dùng tham số (parameterized query), không nối chuỗi.
API trả danh sách phải có phân trang.
Không để console.log thừa trong code đã hoàn thành.
Thông tin tự động (gần trường, gần Bách Hóa Xanh)
Khi admin duyệt tin, gọi Google Places (Nearby Search) để lấy địa điểm lân cận và lưu vào DB. Không gọi lại mỗi lần người dùng xem trang chi tiết.
Nếu API bên ngoài bị lỗi thì không được làm hỏng việc duyệt tin: ghi log và có thể thử lại sau.
Chatbot
Gọi LLM API ở backend, không để lộ API key ra frontend.
Gợi ý nhà trọ dựa trên dữ liệu thật trong DB (chỉ tin đã duyệt).
Giới hạn độ dài tin nhắn và số tin nhắn mỗi người dùng để tránh tốn chi phí.
Lệnh thường dùng
bash
npm run dev     # chạy server ở chế độ phát triển
npm run test    # chạy test
npm run lint    # kiểm tra style code
Git
Nhánh làm việc chính: dev. Mỗi tính năng làm trên nhánh riêng feature/<ten-tinh-nang>, sau đó tạo pull request vào dev.
Commit message ngắn gọn, rõ nghĩa, ví dụ: feat(auth): thêm đăng nhập JWT.
Khi AI viết code cho dự án này
Chỉ dùng Node.js + Express + JavaScript (CommonJS) theo quy ước trên. Không sinh code Java hay Spring Boot.
Làm đúng luồng routes -> controllers -> services -> database và format response ở trên.
Không thêm thư viện mới khi chưa hỏi nhóm.
Nếu yêu cầu mâu thuẫn với quy ước, hãy nói rõ thay vì tự ý bỏ qua.