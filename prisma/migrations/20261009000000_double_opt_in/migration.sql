-- Double opt-in: a sign-up now waits for the person to confirm by email.
-- A hash of the confirmation token is stored, never the token itself.
ALTER TABLE "newsletter_subscribers"
  ADD COLUMN "confirmed_at" TIMESTAMPTZ,
  ADD COLUMN "confirmation_token_hash" VARCHAR(64),
  ADD COLUMN "confirmation_expires_at" TIMESTAMPTZ,
  ADD COLUMN "confirmation_sent_at" TIMESTAMPTZ;

CREATE UNIQUE INDEX "newsletter_subscribers_confirmation_token_hash_key"
  ON "newsletter_subscribers"("confirmation_token_hash");

-- Everyone already on the list signed up under the old rules: treat them as confirmed.
UPDATE "newsletter_subscribers" SET "confirmed_at" = "subscribed_at" WHERE "is_subscribed" = true;
