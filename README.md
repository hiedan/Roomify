# Roomify

Web tìm nhà trọ cho sinh viên, hỗ trợ bộ lọc, bản đồ, duyệt tin và chatbot gợi ý nhà trọ.

## Tech stack

- Frontend: React.
- Backend: Node.js + Express, JavaScript CommonJS.
- Database: PostgreSQL + PostGIS, truy cập bằng `pg`, migration bằng `node-pg-migrate`.
- Xác thực: JWT (`jsonwebtoken`), băm mật khẩu bằng `bcryptjs`.
- Tích hợp: Google Maps / Places API và LLM API.
- Validate và kiểm thử: Zod, Jest, Supertest, ESLint.

## Tài liệu

- [Quy ước phát triển](AGENTS.md).
- [ERD](docs/analysis-and-design/ERD_Roomify.mmd).

Backend theo luồng `routes → controllers → services → database`, trả response `{ success, data, error }`. Ba role: `tenant`, `landlord`, `admin`; landlord đăng tin và admin duyệt trước khi hiển thị công khai.

## Lệnh backend

Chạy trong `backend/` sau khi cài dependencies và cấu hình biến môi trường cùng database:

```bash
npm run dev
npm run migrate
npm test
npm run lint
```
