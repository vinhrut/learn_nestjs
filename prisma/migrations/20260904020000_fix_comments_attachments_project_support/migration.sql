-- Vá lỗi drift có sẵn trong repo: schema.prisma đã khai báo task_comments.type,
-- task_comments.project_id và attachments.project_id (đồng thời task_id nullable
-- ở cả hai bảng) từ trước, nhưng chưa migration nào thực sự tạo ra các cột này.
-- Thiếu chúng khiến mọi thao tác tạo comment/attachment lỗi P2022 ngay khi
-- migrate từ đầu (comment.repository.ts và attachment.repository.ts đều ghi
-- vào các cột này).

ALTER TABLE "task_comments" ALTER COLUMN "task_id" DROP NOT NULL;
ALTER TABLE "task_comments" ADD COLUMN "project_id" uuid;
ALTER TABLE "task_comments" ADD COLUMN "type" text;

ALTER TABLE "task_comments"
    ADD CONSTRAINT "task_comments_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE;

CREATE INDEX "idx_task_comments_project_id" ON "task_comments" ("project_id");

ALTER TABLE "attachments" ALTER COLUMN "task_id" DROP NOT NULL;
ALTER TABLE "attachments" ADD COLUMN "project_id" uuid;

ALTER TABLE "attachments"
    ADD CONSTRAINT "attachments_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE;

CREATE INDEX "idx_attachments_project_id" ON "attachments" ("project_id");
