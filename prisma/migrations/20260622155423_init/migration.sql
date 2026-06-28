-- CreateEnum
CREATE TYPE "seat_status" AS ENUM ('AVAILABLE', 'RESERVED', 'ASSIGNED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "seat_type" AS ENUM ('STANDARD', 'VIP', 'STAFF', 'STANDING', 'CHILD', 'RESERVED');

-- CreateEnum
CREATE TYPE "seat_shape" AS ENUM ('CIRCLE', 'SQUARE', 'RECTANGLE');

-- CreateEnum
CREATE TYPE "table_shape" AS ENUM ('ROUND', 'RECTANGLE', 'OVAL', 'ROW');

-- CreateEnum
CREATE TYPE "section_shape" AS ENUM ('RECTANGLE', 'CIRCLE', 'POLYGON');

-- CreateEnum
CREATE TYPE "seat_assignment_action" AS ENUM ('ASSIGNED', 'UNASSIGNED', 'MOVED');

-- CreateEnum
CREATE TYPE "layout_change_type" AS ENUM ('SECTION_CREATE', 'SECTION_UPDATE', 'SECTION_DELETE', 'SECTION_MOVED', 'SECTION_RENAME', 'SECTION_CLONED', 'TABLE_CREATE', 'TABLE_UPDATE', 'TABLE_DELETE', 'TABLE_MOVED', 'TABLE_RENAME', 'TABLE_DUPLICATED', 'SEAT_CREATE', 'SEAT_UPDATE', 'SEAT_DELETE', 'SEAT_ASSIGNED', 'SEAT_UNASSIGNED', 'SEAT_MOVED', 'SEAT_ASSIGN', 'AUTO_GENERATE_GEOMETRY_V4', 'LAYOUT_VERSION_SAVED');

-- CreateTable
CREATE TABLE "section" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "capacity" INTEGER,
    "shape" "section_shape" NOT NULL DEFAULT 'RECTANGLE',
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "rotation" DOUBLE PRECISION DEFAULT 0,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "capacity" INTEGER,
    "shape" "table_shape" NOT NULL DEFAULT 'ROUND',
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotation" DOUBLE PRECISION DEFAULT 0,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat" (
    "id" UUID NOT NULL,
    "status" "seat_status" NOT NULL DEFAULT 'AVAILABLE',
    "event_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "table_id" UUID,
    "number" INTEGER,
    "label" TEXT,
    "note" TEXT,
    "seat_type" "seat_type",
    "shape" "seat_shape" NOT NULL DEFAULT 'CIRCLE',
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "radius" DOUBLE PRECISION,
    "rotation" DOUBLE PRECISION,
    "z_index" INTEGER DEFAULT 0,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "guest_id" UUID,
    "invitation_id" UUID,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "seat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_assignment_log" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "seat_id" UUID NOT NULL,
    "guest_id" UUID,
    "invitation_id" UUID,
    "action" "seat_assignment_action" NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_assignment_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "layout_version" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "version" BIGINT NOT NULL,
    "label" TEXT,
    "data" JSONB NOT NULL,
    "patch" JSONB,
    "inverse_patch" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "layout_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "layout_change_log" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "type" "layout_change_type" NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "layout_change_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "section_event_id_idx" ON "section"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "section_event_id_name_key" ON "section"("event_id", "name");

-- CreateIndex
CREATE INDEX "table_event_id_idx" ON "table"("event_id");

-- CreateIndex
CREATE INDEX "table_section_id_idx" ON "table"("section_id");

-- CreateIndex
CREATE INDEX "table_event_id_section_id_idx" ON "table"("event_id", "section_id");

-- CreateIndex
CREATE UNIQUE INDEX "table_section_id_name_key" ON "table"("section_id", "name");

-- CreateIndex
CREATE INDEX "seat_event_id_idx" ON "seat"("event_id");

-- CreateIndex
CREATE INDEX "seat_section_id_idx" ON "seat"("section_id");

-- CreateIndex
CREATE INDEX "seat_table_id_idx" ON "seat"("table_id");

-- CreateIndex
CREATE INDEX "seat_guest_id_idx" ON "seat"("guest_id");

-- CreateIndex
CREATE INDEX "seat_event_id_section_id_idx" ON "seat"("event_id", "section_id");

-- CreateIndex
CREATE INDEX "seat_event_id_table_id_idx" ON "seat"("event_id", "table_id");

-- CreateIndex
CREATE UNIQUE INDEX "seat_event_id_invitation_id_key" ON "seat"("event_id", "invitation_id");

-- CreateIndex
CREATE UNIQUE INDEX "seat_event_id_guest_id_key" ON "seat"("event_id", "guest_id");

-- CreateIndex
CREATE INDEX "seat_assignment_log_event_id_idx" ON "seat_assignment_log"("event_id");

-- CreateIndex
CREATE INDEX "seat_assignment_log_seat_id_idx" ON "seat_assignment_log"("seat_id");

-- CreateIndex
CREATE INDEX "layout_version_event_id_idx" ON "layout_version"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "layout_version_event_id_version_key" ON "layout_version"("event_id", "version");

-- CreateIndex
CREATE INDEX "layout_change_log_event_id_idx" ON "layout_change_log"("event_id");

-- AddForeignKey
ALTER TABLE "table" ADD CONSTRAINT "table_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat" ADD CONSTRAINT "seat_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat" ADD CONSTRAINT "seat_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
