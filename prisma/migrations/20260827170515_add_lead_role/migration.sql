-- CreateEnum
CREATE TYPE "otp_purpose" AS ENUM ('PASSWORD_RESET');

-- AlterEnum
ALTER TYPE "role_code" ADD VALUE 'LEAD';

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "purpose" "otp_purpose" NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "consumed_at" TIMESTAMP(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_otp_codes_user_id" ON "otp_codes"("user_id");

-- CreateIndex
CREATE INDEX "idx_otp_codes_expires_at" ON "otp_codes"("expires_at");

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "fk_otp_codes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
