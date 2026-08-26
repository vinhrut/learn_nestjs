-- ============================================================
-- Task Management System — PostgreSQL DDL
-- Tương thích PostgreSQL 13+
-- ============================================================

BEGIN;

-- gen_random_uuid() là built-in từ PG 13. Với PG < 13 cần pgcrypto:
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');

CREATE TYPE role_code AS ENUM ('BA', 'ADMIN', 'USER');

CREATE TYPE project_status AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

CREATE TYPE project_member_role AS ENUM ('OWNER', 'MANAGER', 'MEMBER', 'VIEWER');

CREATE TYPE task_status AS ENUM (
    'DRAFT', 'WAITING_APPROVAL', 'NEW', 'DOING', 'DONE', 'CLOSED', 'REJECTED'
);

CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TYPE assignment_status AS ENUM (
    'NOT_ASSIGNED', 'WAITING_APPROVAL', 'APPROVED', 'ASSIGNED', 'REJECTED', 'CANCELLED'
);

CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE history_action AS ENUM (
    'CREATED', 'UPDATED', 'ASSIGNED', 'REASSIGNED', 'SUBMITTED',
    'APPROVED', 'REJECTED', 'STATUS_CHANGED', 'COMMENTED', 'CLOSED'
);

CREATE TYPE notification_type AS ENUM (
    'TASK_ASSIGNED', 'APPROVAL_REQUEST', 'APPROVAL_APPROVED',
    'APPROVAL_REJECTED', 'STATUS_CHANGED', 'TASK_DUE', 'SYSTEM'
);

CREATE TYPE reminder_status AS ENUM ('PENDING', 'SENT', 'FAILED');

-- ============================================================
-- 2. USERS & AUTH
-- ============================================================

CREATE TABLE users (
    id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    username      varchar(100) NOT NULL UNIQUE,
    email         varchar(255) NOT NULL UNIQUE,
    password_hash varchar(255) NOT NULL,
    full_name     varchar(255),
    phone         varchar(30),
    avatar_url    varchar(500),
    status        user_status  NOT NULL DEFAULT 'ACTIVE',
    created_at    timestamp    NOT NULL DEFAULT now(),
    updated_at    timestamp    NOT NULL DEFAULT now(),
    deleted_at    timestamp
);

-- email / username đã có index nhờ ràng buộc UNIQUE
CREATE INDEX idx_users_status ON users (status);

CREATE TABLE roles (
    id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    code        role_code    NOT NULL UNIQUE,
    name        varchar(100) NOT NULL,
    description text,
    created_at  timestamp    NOT NULL DEFAULT now(),
    updated_at  timestamp    NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
    user_id    uuid      NOT NULL,
    role_id    uuid      NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),

    CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);

-- Mỗi user chỉ thuộc về 1 manager => user_id UNIQUE
CREATE TABLE manager_users (
    manager_id uuid      NOT NULL,
    user_id    uuid      NOT NULL UNIQUE,
    created_at timestamp NOT NULL DEFAULT now(),

    CONSTRAINT pk_manager_users PRIMARY KEY (manager_id, user_id),
    CONSTRAINT fk_manager_users_manager FOREIGN KEY (manager_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_manager_users_user    FOREIGN KEY (user_id)    REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_manager_users_not_self CHECK (manager_id <> user_id)
);

CREATE INDEX idx_manager_users_manager_id ON manager_users (manager_id);

CREATE TABLE refresh_tokens (
    id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid         NOT NULL,
    token_hash varchar(255) NOT NULL,
    expires_at timestamp    NOT NULL,
    revoked_at timestamp,
    created_at timestamp    NOT NULL DEFAULT now(),

    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id    ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- ============================================================
-- 3. PROJECTS
-- ============================================================

CREATE TABLE projects (
    id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(255)   NOT NULL,
    code        varchar(50)    NOT NULL UNIQUE,
    description text,
    owner_id    uuid           NOT NULL,
    status      project_status NOT NULL DEFAULT 'PLANNING',
    created_at  timestamp      NOT NULL DEFAULT now(),
    updated_at  timestamp      NOT NULL DEFAULT now(),
    deleted_at  timestamp,

    CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE INDEX idx_projects_owner_id   ON projects (owner_id);
CREATE INDEX idx_projects_status     ON projects (status);
CREATE INDEX idx_projects_created_at ON projects (created_at);

CREATE TABLE project_members (
    project_id   uuid                NOT NULL,
    user_id      uuid                NOT NULL,
    project_role project_member_role NOT NULL DEFAULT 'MEMBER',
    joined_at    timestamp           NOT NULL DEFAULT now(),

    CONSTRAINT pk_project_members PRIMARY KEY (project_id, user_id),
    CONSTRAINT fk_project_members_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_project_members_user    FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE CASCADE
);

CREATE INDEX idx_project_members_user_id    ON project_members (user_id);
CREATE INDEX idx_project_members_project_id ON project_members (project_id);

-- ============================================================
-- 4. TASKS
-- ============================================================

CREATE TABLE tasks (
    id                uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        uuid              NOT NULL,
    title             varchar(255)      NOT NULL,
    description       text,
    priority          task_priority     NOT NULL DEFAULT 'MEDIUM',
    status            task_status       NOT NULL DEFAULT 'DRAFT',
    due_date          timestamp,
    board_position    double precision  NOT NULL DEFAULT 0,   -- vị trí kéo thả Kanban
    creator_id        uuid              NOT NULL,
    assigner_id       uuid,
    assignee_id       uuid,
    assignment_status assignment_status NOT NULL DEFAULT 'NOT_ASSIGNED',
    created_at        timestamp         NOT NULL DEFAULT now(),
    updated_at        timestamp         NOT NULL DEFAULT now(),
    deleted_at        timestamp,

    CONSTRAINT fk_tasks_project  FOREIGN KEY (project_id)  REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_creator  FOREIGN KEY (creator_id)  REFERENCES users (id)    ON DELETE RESTRICT,
    CONSTRAINT fk_tasks_assigner FOREIGN KEY (assigner_id) REFERENCES users (id)    ON DELETE SET NULL,
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users (id)    ON DELETE SET NULL
);

CREATE INDEX idx_tasks_project_id        ON tasks (project_id);
CREATE INDEX idx_tasks_status            ON tasks (status);
CREATE INDEX idx_tasks_priority          ON tasks (priority);
CREATE INDEX idx_tasks_creator_id        ON tasks (creator_id);
CREATE INDEX idx_tasks_assigner_id       ON tasks (assigner_id);
CREATE INDEX idx_tasks_assignee_id       ON tasks (assignee_id);
CREATE INDEX idx_tasks_assignment_status ON tasks (assignment_status);
CREATE INDEX idx_tasks_due_date          ON tasks (due_date);
CREATE INDEX idx_tasks_created_at        ON tasks (created_at);
CREATE INDEX idx_tasks_project_status    ON tasks (project_id, status);
CREATE INDEX idx_tasks_assignee_status   ON tasks (assignee_id, status);
CREATE INDEX idx_tasks_assigner_status   ON tasks (assigner_id, status);

CREATE TABLE task_assignment_requests (
    id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       uuid            NOT NULL,
    requester_id  uuid            NOT NULL,
    assigner_id   uuid            NOT NULL,
    assignee_id   uuid            NOT NULL,
    status        approval_status NOT NULL DEFAULT 'PENDING',
    requested_at  timestamp       NOT NULL DEFAULT now(),
    reviewed_by   uuid,
    reviewed_at   timestamp,
    reject_reason text,
    created_at    timestamp       NOT NULL DEFAULT now(),
    updated_at    timestamp       NOT NULL DEFAULT now(),

    CONSTRAINT fk_tar_task      FOREIGN KEY (task_id)      REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_tar_requester FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_tar_assigner  FOREIGN KEY (assigner_id)  REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_tar_assignee  FOREIGN KEY (assignee_id)  REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_tar_reviewer  FOREIGN KEY (reviewed_by)  REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_tar_task_id      ON task_assignment_requests (task_id);
CREATE INDEX idx_tar_requester_id ON task_assignment_requests (requester_id);
CREATE INDEX idx_tar_assigner_id  ON task_assignment_requests (assigner_id);
CREATE INDEX idx_tar_assignee_id  ON task_assignment_requests (assignee_id);
CREATE INDEX idx_tar_status       ON task_assignment_requests (status);
CREATE INDEX idx_tar_reviewed_by  ON task_assignment_requests (reviewed_by);
CREATE INDEX idx_tar_requested_at ON task_assignment_requests (requested_at);

-- Mỗi task chỉ có tối đa 1 yêu cầu đang chờ duyệt
CREATE UNIQUE INDEX uq_tar_one_pending_per_task
    ON task_assignment_requests (task_id)
    WHERE status = 'PENDING';

-- Công việc phụ (checklist)
CREATE TABLE task_checklists (
    id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    uuid         NOT NULL,
    title      varchar(255) NOT NULL,
    is_done    boolean      NOT NULL DEFAULT false,
    position   integer      NOT NULL DEFAULT 0,
    created_at timestamp    NOT NULL DEFAULT now(),
    updated_at timestamp    NOT NULL DEFAULT now(),

    CONSTRAINT fk_task_checklists_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE INDEX idx_task_checklists_task_id ON task_checklists (task_id);

-- Thảo luận
CREATE TABLE task_comments (
    id         uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    uuid      NOT NULL,
    user_id    uuid      NOT NULL,
    content    text      NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    deleted_at timestamp,

    CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_comments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE INDEX idx_task_comments_task_id    ON task_comments (task_id);
CREATE INDEX idx_task_comments_created_at ON task_comments (created_at);

-- Tệp đính kèm (link MinIO / S3)
CREATE TABLE attachments (
    id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     uuid         NOT NULL,
    uploaded_by uuid         NOT NULL,
    file_url    text         NOT NULL,
    file_name   varchar(255) NOT NULL,
    mime_type   varchar(100),
    size_bytes  bigint,
    created_at  timestamp    NOT NULL DEFAULT now(),
    deleted_at  timestamp,

    CONSTRAINT fk_attachments_task     FOREIGN KEY (task_id)     REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_attachments_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE INDEX idx_attachments_task_id ON attachments (task_id);

-- Chống spam khi cronjob quét deadline
CREATE TABLE task_reminders (
    id                uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id           uuid            NOT NULL,
    user_id           uuid            NOT NULL,
    due_date_snapshot timestamp       NOT NULL,
    status            reminder_status NOT NULL DEFAULT 'PENDING',
    scheduled_for     timestamp       NOT NULL,
    sent_at           timestamp,
    created_at        timestamp       NOT NULL DEFAULT now(),

    CONSTRAINT fk_task_reminders_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_reminders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_task_reminders_task_id       ON task_reminders (task_id);
CREATE INDEX idx_task_reminders_user_id       ON task_reminders (user_id);
CREATE INDEX idx_task_reminders_status        ON task_reminders (status);
CREATE INDEX idx_task_reminders_scheduled_for ON task_reminders (scheduled_for);

-- Không gửi trùng nhắc nhở cho cùng (task, user, mốc deadline)
CREATE UNIQUE INDEX uq_task_reminders_dedupe
    ON task_reminders (task_id, user_id, due_date_snapshot, scheduled_for);

CREATE TABLE task_histories (
    id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id          uuid           NOT NULL,
    actor_id         uuid           NOT NULL,
    action           history_action NOT NULL,
    old_status       task_status,
    new_status       task_status,
    old_assignee_id  uuid,
    new_assignee_id  uuid,
    old_assigner_id  uuid,
    new_assigner_id  uuid,
    comment          text,
    metadata         jsonb,
    created_at       timestamp      NOT NULL DEFAULT now(),

    CONSTRAINT fk_th_task         FOREIGN KEY (task_id)         REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_th_actor        FOREIGN KEY (actor_id)        REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_th_old_assignee FOREIGN KEY (old_assignee_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_th_new_assignee FOREIGN KEY (new_assignee_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_th_old_assigner FOREIGN KEY (old_assigner_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_th_new_assigner FOREIGN KEY (new_assigner_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_th_task_id    ON task_histories (task_id);
CREATE INDEX idx_th_actor_id   ON task_histories (actor_id);
CREATE INDEX idx_th_action     ON task_histories (action);
CREATE INDEX idx_th_created_at ON task_histories (created_at);
CREATE INDEX idx_th_task_time  ON task_histories (task_id, created_at);

-- ============================================================
-- 5. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id         uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid              NOT NULL,
    task_id    uuid,
    type       notification_type NOT NULL,
    title      varchar(255)      NOT NULL,
    message    text,
    is_read    boolean           NOT NULL DEFAULT false,
    created_at timestamp         NOT NULL DEFAULT now(),
    read_at    timestamp,

    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id    ON notifications (user_id);
CREATE INDEX idx_notifications_task_id    ON notifications (task_id);
CREATE INDEX idx_notifications_type       ON notifications (type);
CREATE INDEX idx_notifications_is_read    ON notifications (is_read);
CREATE INDEX idx_notifications_created_at ON notifications (created_at);
CREATE INDEX idx_notifications_user_read  ON notifications (user_id, is_read);

-- ============================================================
-- 6. TRIGGER TỰ ĐỘNG CẬP NHẬT updated_at
--    (bỏ qua phần này nếu để Prisma tự set @updatedAt)
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at      BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_roles_updated_at      BEFORE UPDATE ON roles      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects_updated_at   BEFORE UPDATE ON projects   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tasks_updated_at      BEFORE UPDATE ON tasks      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tar_updated_at        BEFORE UPDATE ON task_assignment_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_checklists_updated_at BEFORE UPDATE ON task_checklists FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_comments_updated_at   BEFORE UPDATE ON task_comments   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 7. DỮ LIỆU KHỞI TẠO
-- ============================================================

INSERT INTO roles (code, name, description) VALUES
    ('ADMIN', 'Administrator',  'Toàn quyền hệ thống'),
    ('BA',    'Business Analyst', 'Tạo và phân công công việc'),
    ('USER',  'User',           'Người dùng thường')
ON CONFLICT (code) DO NOTHING;

COMMIT;
