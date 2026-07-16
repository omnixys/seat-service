-- AlterTable
ALTER TABLE "event_settings_projection" ADD COLUMN     "seat_color_groups" JSONB;

-- CreateTable
CREATE TABLE "invitation_projection" (
    "id" UUID NOT NULL,
    "invitation_id" UUID NOT NULL,
    "guest_id" UUID,
    "selected_invited_by" JSONB,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "invitation_projection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitation_projection_invitation_id_key" ON "invitation_projection"("invitation_id");
