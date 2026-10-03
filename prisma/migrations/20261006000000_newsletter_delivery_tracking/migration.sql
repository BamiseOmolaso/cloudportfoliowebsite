-- Delivery tracking for newsletters: the email's id at Resend, and when Resend told us
-- it was delivered, opened, bounced or reported as spam.
ALTER TABLE "newsletter_sends"
  ADD COLUMN "resend_id" TEXT,
  ADD COLUMN "delivered_at" TIMESTAMPTZ,
  ADD COLUMN "opened_at" TIMESTAMPTZ,
  ADD COLUMN "bounced_at" TIMESTAMPTZ,
  ADD COLUMN "bounce_reason" TEXT,
  ADD COLUMN "complained_at" TIMESTAMPTZ;

CREATE INDEX "newsletter_sends_resend_id_idx" ON "newsletter_sends"("resend_id");
