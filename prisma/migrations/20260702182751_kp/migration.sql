-- CreateTable
CREATE TABLE "event_settings_projection" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT,
    "ends_at" TIMESTAMP(3),
    "max_seats" INTEGER,
    "allow_guest_seat_selection" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "event_settings_projection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_settings_projection_event_id_key" ON "event_settings_projection"("event_id");
