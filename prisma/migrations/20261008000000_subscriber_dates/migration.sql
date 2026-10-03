-- When a subscriber most recently opted in, and when they left (if they did).
-- Existing rows: opted in when they first signed up; people already unsubscribed get the
-- last time their row changed, which is the best record available.
ALTER TABLE "newsletter_subscribers"
  ADD COLUMN "subscribed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "unsubscribed_at" TIMESTAMPTZ;

UPDATE "newsletter_subscribers" SET "subscribed_at" = "created_at";
UPDATE "newsletter_subscribers" SET "unsubscribed_at" = "updated_at" WHERE "is_subscribed" = false;
