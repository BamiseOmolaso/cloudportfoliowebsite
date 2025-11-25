-- CreateTable
CREATE TABLE "performance_metrics" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lcp_metrics" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lcp_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "is_subscribed" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribe_token" VARCHAR(64),
    "unsubscribe_token_expires_at" TIMESTAMPTZ,
    "unsubscribe_reason" VARCHAR(50),
    "unsubscribe_feedback" TEXT,
    "location" TEXT,
    "preferences" JSONB DEFAULT '{"frequency": "weekly", "categories": []}',
    "preferences_token" TEXT,
    "preferences_token_expires_at" TIMESTAMPTZ,
    "subscription_count" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "deleted_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletters" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduled_for" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_sends" (
    "id" TEXT NOT NULL,
    "newsletter_id" TEXT NOT NULL,
    "subscriber_id" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,

    CONSTRAINT "newsletter_sends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriber_tags" (
    "subscriber_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriber_tags_pkey" PRIMARY KEY ("subscriber_id","tag_id")
);

-- CreateTable
CREATE TABLE "newsletter_audit_log" (
    "id" TEXT NOT NULL,
    "subscriber_id" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklisted_ips" (
    "id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "created_by" TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "blacklisted_ips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failed_attempts" (
    "id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,
    "action_type" TEXT NOT NULL,

    CONSTRAINT "failed_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "cover_image" TEXT,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "author" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "cover_image" TEXT,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "github_url" TEXT,
    "live_url" TEXT,
    "author" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "replied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_metrics_timestamp_idx" ON "performance_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "performance_metrics_url_idx" ON "performance_metrics"("url");

-- CreateIndex
CREATE INDEX "performance_metrics_url_timestamp_idx" ON "performance_metrics"("url", "timestamp");

-- CreateIndex
CREATE INDEX "lcp_metrics_timestamp_idx" ON "lcp_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "lcp_metrics_url_idx" ON "lcp_metrics"("url");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_unsubscribe_token_key" ON "newsletter_subscribers"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_is_subscribed_idx" ON "newsletter_subscribers"("is_subscribed");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_unsubscribe_token_idx" ON "newsletter_subscribers"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_preferences_token_idx" ON "newsletter_subscribers"("preferences_token");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_unsubscribe_token_expires_at_idx" ON "newsletter_subscribers"("unsubscribe_token_expires_at");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_unsubscribe_reason_idx" ON "newsletter_subscribers"("unsubscribe_reason");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_created_at_idx" ON "newsletter_subscribers"("created_at");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_is_deleted_idx" ON "newsletter_subscribers"("is_deleted");

-- CreateIndex
CREATE INDEX "newsletters_status_idx" ON "newsletters"("status");

-- CreateIndex
CREATE INDEX "newsletters_scheduled_for_idx" ON "newsletters"("scheduled_for");

-- CreateIndex
CREATE INDEX "newsletters_created_at_idx" ON "newsletters"("created_at");

-- CreateIndex
CREATE INDEX "newsletters_sent_at_idx" ON "newsletters"("sent_at");

-- CreateIndex
CREATE INDEX "newsletter_sends_status_idx" ON "newsletter_sends"("status");

-- CreateIndex
CREATE INDEX "newsletter_sends_newsletter_id_status_idx" ON "newsletter_sends"("newsletter_id", "status");

-- CreateIndex
CREATE INDEX "newsletter_sends_subscriber_id_status_idx" ON "newsletter_sends"("subscriber_id", "status");

-- CreateIndex
CREATE INDEX "newsletter_sends_sent_at_idx" ON "newsletter_sends"("sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_sends_newsletter_id_subscriber_id_key" ON "newsletter_sends"("newsletter_id", "subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_tags_name_key" ON "newsletter_tags"("name");

-- CreateIndex
CREATE INDEX "subscriber_tags_subscriber_id_idx" ON "subscriber_tags"("subscriber_id");

-- CreateIndex
CREATE INDEX "subscriber_tags_tag_id_idx" ON "subscriber_tags"("tag_id");

-- CreateIndex
CREATE INDEX "newsletter_audit_log_subscriber_id_idx" ON "newsletter_audit_log"("subscriber_id");

-- CreateIndex
CREATE INDEX "newsletter_audit_log_created_at_idx" ON "newsletter_audit_log"("created_at");

-- CreateIndex
CREATE INDEX "newsletter_audit_log_action_idx" ON "newsletter_audit_log"("action");

-- CreateIndex
CREATE UNIQUE INDEX "blacklisted_ips_ip_address_key" ON "blacklisted_ips"("ip_address");

-- CreateIndex
CREATE INDEX "blacklisted_ips_ip_address_idx" ON "blacklisted_ips"("ip_address");

-- CreateIndex
CREATE INDEX "blacklisted_ips_expires_at_idx" ON "blacklisted_ips"("expires_at");

-- CreateIndex
CREATE INDEX "failed_attempts_ip_address_idx" ON "failed_attempts"("ip_address");

-- CreateIndex
CREATE INDEX "failed_attempts_email_idx" ON "failed_attempts"("email");

-- CreateIndex
CREATE INDEX "failed_attempts_timestamp_idx" ON "failed_attempts"("timestamp");

-- CreateIndex
CREATE INDEX "failed_attempts_action_type_idx" ON "failed_attempts"("action_type");

-- CreateIndex
CREATE INDEX "failed_attempts_ip_address_action_type_idx" ON "failed_attempts"("ip_address", "action_type");

-- CreateIndex
CREATE INDEX "failed_attempts_timestamp_action_type_idx" ON "failed_attempts"("timestamp", "action_type");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_status_idx" ON "blog_posts"("status");

-- CreateIndex
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts"("published_at");

-- CreateIndex
CREATE INDEX "blog_posts_created_at_idx" ON "blog_posts"("created_at");

-- CreateIndex
CREATE INDEX "blog_posts_status_published_at_idx" ON "blog_posts"("status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_slug_idx" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_published_at_idx" ON "projects"("published_at");

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "projects"("created_at");

-- CreateIndex
CREATE INDEX "projects_status_published_at_idx" ON "projects"("status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_email_idx" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");

-- CreateIndex
CREATE INDEX "contact_messages_email_idx" ON "contact_messages"("email");

-- CreateIndex
CREATE INDEX "contact_messages_read_idx" ON "contact_messages"("read");

-- CreateIndex
CREATE INDEX "contact_messages_replied_idx" ON "contact_messages"("replied");

-- CreateIndex
CREATE INDEX "contact_messages_read_replied_idx" ON "contact_messages"("read", "replied");

-- CreateIndex
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages"("created_at");

-- AddForeignKey
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_newsletter_id_fkey" FOREIGN KEY ("newsletter_id") REFERENCES "newsletters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "newsletter_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriber_tags" ADD CONSTRAINT "subscriber_tags_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "newsletter_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriber_tags" ADD CONSTRAINT "subscriber_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "newsletter_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_audit_log" ADD CONSTRAINT "newsletter_audit_log_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "newsletter_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
