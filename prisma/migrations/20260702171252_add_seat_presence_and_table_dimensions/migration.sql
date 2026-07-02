-- CreateEnum
CREATE TYPE "presence_state" AS ENUM ('INSIDE', 'OUTSIDE');

-- AlterTable
ALTER TABLE "table" ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "width" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "seat_presence_projection" (
    "id" UUID NOT NULL,
    "seat_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "presence_state" "presence_state" NOT NULL DEFAULT 'OUTSIDE',
    "checked_in_at" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "seat_presence_projection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seat_presence_projection_seat_id_key" ON "seat_presence_projection"("seat_id");

-- CreateIndex
CREATE INDEX "seat_presence_projection_event_id_idx" ON "seat_presence_projection"("event_id");
