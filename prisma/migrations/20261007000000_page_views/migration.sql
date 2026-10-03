-- CreateTable: first-party page views (no IP address, no cookie).
CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "country" VARCHAR(2),
    "device" VARCHAR(10) NOT NULL,
    "visitor" VARCHAR(32) NOT NULL,
    "load_ms" INTEGER,
    "lcp_ms" INTEGER,
    "ttfb_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "page_views_created_at_idx" ON "page_views"("created_at");
CREATE INDEX "page_views_path_created_at_idx" ON "page_views"("path", "created_at");
