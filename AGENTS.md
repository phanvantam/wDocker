# wDocker - AI Agent Instructions

Đây là file hướng dẫn (Context) dành cho bất kỳ AI Agent nào làm việc trên hệ thống `wDocker`.

## 1. Project Overview (Tổng Quan)
- **Tên dự án**: `wDocker`
- **Mục đích**: Desktop Application (Tauri + Vue 3) giúp thiết lập nhanh môi trường dev web qua Docker (như Laravel Valet, XAMPP nhưng dùng Docker container).
- **Tech Stack**:
  - Giao diện: `Vue 3`, `TailwindCSS`, `Vite`.
  - Logic Frontend (Composables): Lưu trữ tại `src/composables` (VD: `useProjectStore`, `useProjectWizard`).
  - Backend/Core: `Rust` và `Tauri`.
  - Docker API: `Bollard` (Rust Crate).

## 2. Core Architectures (Kiến trúc cốt lõi)
Dự án được triển khai dựa trên 3 module chính đã hoàn thiện:
1. **Nginx Proxy Manager (`src/views/NginxProxyView.vue`)**: Là Container trung tâm (wdocker-nginx-proxy) public port 80/443 ra Host OS. Các dự án (Containers) khác kết nối với Nginx này qua mạng `wdocker_network`.
2. **Local DNS Manager (`src/views/DnsManagerView.vue`)**: Tauri Command tự động append/remove cấu hình domain (vd: `127.0.0.1 myapp.test`) vào file `/etc/hosts` của Host OS để Nginx có thể định tuyến.
3. **Projects Manager (`src/views/ProjectsView.vue`)**: 
   - Quản lý form thiết lập (wizards) cho Laravel, PHP, Node. 
   - Docker Images và PHP extensions được load từ cấu hình JSON trong `src/data/`.
   - **Log Output** của mọi container dự án được bind mount tự động ra host tại `~/.wDocker/logs/[project_name]/`.
   - Mọi logic tính toán cấu hình compose yaml/nginx conf được xử lý qua `src/composables/useDockerGenerator.ts`.

## 3. Coding Conventions (Quy tắc Code)
- **Rust (Backend)**:
  - Hàm giao tiếp API, file I/O đặc quyền đặt tại `src-tauri/src`. Luôn được export qua mảng `invoke_handler`.
- **Vue (Frontend)**:
  - Tách bạch Business Logic: Tuyệt đối không nhồi nhét xử lý phức tạp vào file `.vue`. Sử dụng/tạo thêm các **Composables** trong `src/composables` nếu cần.
  - Sử dụng Composition API (`<script setup lang="ts">`).
  - Component tái sử dụng cao nên lưu trong `src/components/`, modals lưu trong `src/components/modals/`.
  - Tuân thủ thiết kế dark theme hiện có (sử dụng tailwind custom variables `var(--color-...)`).

## 4. Workflows (Quy trình làm việc)
- Luôn đọc file `AGENTS.md` này để nắm design architecture.
- Trước khi thêm thư viện hoặc tính năng lớn, luôn tạo `task.md` và tuân thủ các boundaries/phrases logic.
- Khuyến khích tham khảo các composables hiện tại trước khi trực tiếp modify các views.
