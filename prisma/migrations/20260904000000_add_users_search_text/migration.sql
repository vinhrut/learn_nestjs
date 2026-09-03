-- Tìm kiếm user không dấu, không phân biệt hoa thường.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent() chỉ ở mức STABLE; bọc lại thành IMMUTABLE để dùng được trong
-- generated column và trong biểu thức index.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
AS $func$ SELECT unaccent('unaccent', $1) $func$;

-- Cột STORED tự sinh: lower + bỏ dấu của username + email + full_name.
ALTER TABLE "users" ADD COLUMN "search_text" text
GENERATED ALWAYS AS (
  lower(immutable_unaccent(
    translate(
      coalesce("username", '') || ' ' || coalesce("email", '') || ' ' || coalesce("full_name", ''),
      'đĐ', 'dD'
    )
  ))
) STORED;

CREATE INDEX "idx_users_search_text_trgm" ON "users" USING gin ("search_text" gin_trgm_ops);
