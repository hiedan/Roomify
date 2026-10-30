# Roomify – Quy ước dự án (Node.js / Express)

Web tìm nhà trọ cho sinh viên: người thuê (tenant) xem và tìm nhà trọ, chủ trọ (landlord) đăng tin, admin duyệt tin. Có bản đồ, chatbot AI gợi ý, bộ lọc tìm kiếm và thông tin tự động (gần trường, gần Bách Hóa Xanh).

## Tech stack

- Backend: Node.js, Express, JavaScript (CommonJS: dùng `require` và `module.exports`, không dùng `import`/`export`).
- Database: PostgreSQL + PostGIS, truy cập bằng `pg`, migration bằng `node-pg-migrate`.
- Bảo mật: JWT qua `jsonwebtoken`, băm mật khẩu BCrypt bằng `bcryptjs` hiện có.
- Validate: `zod`; kiểm thử: Jest + Supertest; kiểm tra style: ESLint.
- Frontend: React (gọi REST API của backend).
- Bên thứ ba: Google Maps / Places API, LLM API (chatbot).

Database thiết kế theo `docs/analysis-and-design/ERD_Roomify.mmd`. Muốn đổi schema thì cập nhật ERD và viết migration mới.

## Cấu trúc thư mục

```text
backend/src/
├── routes/        # Khai báo endpoint, gắn middleware (xác thực, phân quyền, validate)
├── controllers/   # Nhận request, gọi service, trả response
├── services/      # Logic nghiệp vụ (kể cả code gọi Google Places và LLM API)
├── database/      # Kết nối và truy vấn PostgreSQL
├── middlewares/   # Xác thực JWT, kiểm tra role, xử lý lỗi
├── config.js      # Đọc biến môi trường (file hiện có)
├── db.js          # Connection pool PostgreSQL hiện có
└── utils/         # Hàm dùng chung
```

Frontend React nằm trong `frontend/`, migration trong `backend/migrations/`, test trong `backend/tests/`.

## Luồng xử lý

routes -> controllers -> services -> database

Route chỉ khai báo endpoint và validate dữ liệu đầu vào.
Controller không chứa logic nghiệp vụ và không truy vấn database trực tiếp.
Service chứa logic nghiệp vụ và gọi database.
Luôn dùng async/await, không dùng callback.

## Phân quyền (3 role)

tenant, landlord, admin

Kiểm tra role bằng middleware ở route.
Tin đăng của landlord mặc định `pending`. Chỉ tin `approved` hiển thị công khai trên danh sách, bản đồ và gợi ý chatbot; trạng thái còn lại là `rejected`, theo migration hiện có.
Landlord chỉ sửa/xóa tin của chính mình; kiểm tra quyền sở hữu ở service.
Mật khẩu luôn băm bằng `bcryptjs`. Không log và không trả mật khẩu hoặc `password_hash` về client.
Chọn rõ các trường trả về trong DTO/object response, không trả nguyên bản ghi có dữ liệu nhạy cảm.

## Định dạng response

Mọi API trả về cùng một format:

```json
{ "success": true, "data": { }, "error": null }
{ "success": false, "data": null, "error": { "code": "NOT_FOUND", "message": "Không tìm thấy nhà trọ" } }
```

Dùng helper trong `backend/src/utils/response.js`. Lỗi xử lý tập trung trong error-handling middleware, không lặp try/catch ở mọi controller. Với Express 4, chuyển lỗi bất đồng bộ tới `next(error)` bằng wrapper dùng chung hoặc cơ chế tương đương.
Dùng HTTP status đúng nghĩa (200, 201, 400, 401, 403, 404, 409).

## Validate

Validate body, query và params bằng Zod tại route trước controller. Dữ liệu sai trả 400 theo format response ở trên.
Kiểm tra nghiệp vụ (trùng email, sai quyền, trạng thái không hợp lệ) làm trong service.

## Quy ước code

Đặt tên: biến và hàm camelCase, hằng số UPPER_SNAKE_CASE, bảng và cột DB snake_case.
Không viết thẳng secret, API key, thông tin DB trong code. Đọc từ biến môi trường (file .env, không commit file này).
Truy vấn database phải dùng tham số (parameterized query), không nối chuỗi.
API trả danh sách phải có phân trang.
Không để console.log thừa trong code đã hoàn thành.

## Database và migration

- Mọi thay đổi schema dùng migration mới trong `backend/migrations/`, theo `node-pg-migrate`.
- Không sửa migration đã merge; tạo migration mới và cập nhật ERD tương ứng.
- Không tự động đổi schema khi server khởi động.
- Nghiệp vụ ghi nhiều bảng dùng transaction, cùng một client cho `BEGIN` / `COMMIT` / `ROLLBACK`, luôn release client.

## Thông tin tự động (gần trường, gần Bách Hóa Xanh)

Khi admin duyệt tin, gọi Google Places (Nearby Search) để lấy địa điểm lân cận và lưu vào DB. Không gọi lại mỗi lần người dùng xem trang chi tiết.
Nếu API bên ngoài bị lỗi thì không được làm hỏng việc duyệt tin: ghi log và có thể thử lại sau.

## Chatbot

Gọi LLM API ở backend, không để lộ API key ra frontend.
Gợi ý nhà trọ dựa trên dữ liệu thật trong DB (chỉ tin đã duyệt).
Giới hạn độ dài tin nhắn và số tin nhắn mỗi người dùng để tránh tốn chi phí.

## Test

- Unit test service bằng Jest; mock database và API ngoài.
- Integration test route/controller bằng Supertest; test truy vấn và migration dùng database test riêng.
- Mỗi tính năng mới cần test cho thành công, dữ liệu sai và không đủ quyền.

## Lệnh thường dùng

Chạy trong thư mục `backend/`:

```bash
npm run dev     # chạy server ở chế độ phát triển
npm run test    # chạy test
npm run lint    # kiểm tra style code
npm start           # chạy server
npm run migrate     # áp dụng migration
```

## Git

Nhánh làm việc chính: dev. Mỗi tính năng làm trên nhánh riêng feature/<ten-tinh-nang>, sau đó tạo pull request vào dev.
Commit message ngắn gọn, rõ nghĩa, ví dụ: feat(auth): thêm đăng nhập JWT.

## Khi AI viết code cho dự án này

Backend chỉ dùng Node.js + Express + JavaScript CommonJS theo quy ước trên, không sinh code Java/Spring Boot. Frontend dùng React. Không thêm service Python khi chưa có yêu cầu thống nhất từ nhóm.
Làm đúng luồng routes -> controllers -> services -> database và format response ở trên.
Không thêm thư viện mới khi chưa hỏi nhóm.
Nếu yêu cầu mâu thuẫn với quy ước, hãy nói rõ thay vì tự ý bỏ qua.
