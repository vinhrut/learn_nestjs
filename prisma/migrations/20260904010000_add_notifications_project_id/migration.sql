-- Thông báo liên quan tới dự án (PROJECT_MEMBER_ADDED) cần tham chiếu dự án
-- để client điều hướng tới đúng trang chi tiết dự án.
ALTER TABLE "notifications" ADD COLUMN "project_id" uuid;

ALTER TABLE "notifications"
    ADD CONSTRAINT "fk_notifications_project"
    FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE;

CREATE INDEX "idx_notifications_project_id" ON "notifications" ("project_id");
