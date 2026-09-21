CREATE TABLE "layout_geometry_history" (
  "id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "applied" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "layout_geometry_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "layout_geometry_history_event_id_position_key"
  ON "layout_geometry_history"("event_id", "position");
CREATE INDEX "layout_geometry_history_event_id_idx"
  ON "layout_geometry_history"("event_id");
