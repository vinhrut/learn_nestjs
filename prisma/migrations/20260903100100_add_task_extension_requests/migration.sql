-- CreateTable
CREATE TABLE task_extension_requests
(
    id                 uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id            uuid            NOT NULL,
    requester_id       uuid            NOT NULL,
    current_due_date   timestamp,
    requested_due_date timestamp       NOT NULL,
    reason             text            NOT NULL,
    status             approval_status NOT NULL DEFAULT 'PENDING',
    requested_at       timestamp       NOT NULL DEFAULT now(),
    reviewed_by        uuid,
    reviewed_at        timestamp,
    reject_reason      text,
    created_at         timestamp       NOT NULL DEFAULT now(),
    updated_at         timestamp       NOT NULL DEFAULT now(),

    CONSTRAINT fk_ter_task      FOREIGN KEY (task_id)      REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_ter_requester FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_ter_reviewer  FOREIGN KEY (reviewed_by)  REFERENCES users (id) ON DELETE SET NULL
);

-- CreateIndex
CREATE INDEX idx_ter_task_id      ON task_extension_requests (task_id);
CREATE INDEX idx_ter_requester_id ON task_extension_requests (requester_id);
CREATE INDEX idx_ter_status       ON task_extension_requests (status);
CREATE INDEX idx_ter_requested_at ON task_extension_requests (requested_at);

-- CreateIndex
CREATE UNIQUE INDEX uq_ter_one_pending_per_task
    ON task_extension_requests (task_id) WHERE status = 'PENDING';

-- CreateTrigger
CREATE TRIGGER trg_ter_updated_at BEFORE UPDATE ON task_extension_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
