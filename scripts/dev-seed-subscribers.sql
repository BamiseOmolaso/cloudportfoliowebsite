-- LOCAL DEVELOPMENT ONLY. Fills the subscribers list (and one sent newsletter with its
-- delivery results) with made-up people so the admin screens can be seen with data.
-- All addresses are @example.com. Never run this against the live database.
--
--   docker exec -i pf-localdb psql -U postgres -d portfolio -v ON_ERROR_STOP=1 < scripts/dev-seed-subscribers.sql
--
-- Safe to run twice: rows are skipped if they already exist. To remove them again:
--   delete from newsletters where id = 'dev-nl-1';
--   delete from newsletter_subscribers where email like '%@example.com' and id like 'dev-%';

INSERT INTO newsletter_subscribers
  (id, email, name, location, is_subscribed, created_at, subscribed_at, unsubscribed_at, unsubscribe_reason, unsubscribe_feedback, updated_at, confirmed_at, confirmation_token_hash, confirmation_expires_at, confirmation_sent_at)
VALUES
  ('dev-s01', 'ada.obi@example.com',       'Ada Obi',      'Lagos, Nigeria',     true,  now() - interval '62 days', now() - interval '62 days', NULL, NULL, NULL, now(), NULL, NULL, NULL, NULL),
  ('dev-s02', 'tunde.bello@example.com',   'Tunde',        'Ibadan, Nigeria',    true,  now() - interval '48 days', now() - interval '48 days', NULL, NULL, NULL, now(), NULL, NULL, NULL, NULL),
  ('dev-s03', 'maria.santos@example.com',  'Maria',        'Toronto, Canada',    true,  now() - interval '33 days', now() - interval '33 days', NULL, NULL, NULL, now(), NULL, NULL, NULL, NULL),
  ('dev-s04', 'chidi.eze@example.com',     NULL,           NULL,                 true,  now() - interval '30 days', now() - interval '30 days', NULL, NULL, NULL, now(), NULL, NULL, NULL, NULL),
  ('dev-s05', 'priya.nair@example.com',    'Priya',        'London, UK',         true,  now() - interval '21 days', now() - interval '21 days', NULL, NULL, NULL, now(), NULL, NULL, NULL, NULL),
  ('dev-s06', 'sam.okafor@example.com',    'Sam',          'Calgary, Canada',    true,  now() - interval '14 days', now() - interval '14 days', NULL, NULL, NULL, now(), NULL, NULL, NULL, NULL),
  ('dev-s07', 'lena.fischer@example.com',  'Lena',         'Berlin, Germany',    true,  now() - interval '9 days',  now() - interval '9 days',  NULL, NULL, NULL, now(), NULL, NULL, NULL, NULL),
  ('dev-s08', 'kemi.adeyemi@example.com',  NULL,           NULL,                 true,  now() - interval '4 days',  now() - interval '4 days',  NULL, NULL, NULL, now(), NULL, NULL, NULL, NULL),
  ('dev-s09', 'jon.price@example.com',     'Jon',          'Austin, USA',        true,  now() - interval '1 day',   now() - interval '1 day',   NULL, NULL, NULL, now(), NULL, NULL, NULL, NULL),
  -- came back after unsubscribing: Joined is the old date, "rejoined" the recent one
  ('dev-s10', 'folake.ojo@example.com',    'Folake',       'Abuja, Nigeria',     true,  now() - interval '75 days', now() - interval '6 days',  NULL, NULL, NULL, now(), NULL, NULL, NULL, NULL),
  -- left, with reasons
  ('dev-s11', 'dan.reeves@example.com',    'Dan',          'Sydney, Australia',  false, now() - interval '55 days', now() - interval '55 days', now() - interval '12 days', 'too_many_emails', 'Weekly was more than I could keep up with.', now(), NULL, NULL, NULL, NULL),
  ('dev-s12', 'ngozi.udo@example.com',     'Ngozi',        'Enugu, Nigeria',     false, now() - interval '40 days', now() - interval '40 days', now() - interval '3 days',  'not_relevant',    NULL, now(), NULL, NULL, NULL, NULL),
  ('dev-s13', 'old.address@example.com',   NULL,           NULL,                 false, now() - interval '26 days', now() - interval '26 days', now() - interval '20 days', 'bounced',         NULL, now(), NULL, NULL, NULL, NULL),
  ('dev-s14', 'spam.report@example.com',   'Alex',         NULL,                 false, now() - interval '18 days', now() - interval '18 days', now() - interval '10 days', 'complained',      NULL, now(), NULL, NULL, NULL, NULL)
  ,
  -- signed up but have not clicked the confirmation link yet (they are NOT on the list)
  ('dev-s15', 'wale.adams@example.com', 'Wale', 'Port Harcourt, Nigeria', false, now() - interval '2 hours', now() - interval '2 hours', NULL, NULL, NULL, now(), NULL, 'devpending1', now() + interval '46 hours', now() - interval '2 hours'),
  ('dev-s16', 'zara.khan@example.com',    NULL,   NULL,                  false, now() - interval '1 day',   now() - interval '1 day',   NULL, NULL, NULL, now(), NULL, 'devpending2', now() + interval '24 hours', now() - interval '1 day')
ON CONFLICT (email) DO NOTHING;

-- One newsletter that has been sent to the first nine subscribers, with a realistic mix of results.
INSERT INTO newsletters (id, subject, content, status, sent_at, created_at, updated_at)
VALUES ('dev-nl-1', 'What broke in production this month',
        '<h2>Hi {name},</h2><p>This month: a firewall rule that locked me out, and a backup I finally tested.</p>',
        'sent', now() - interval '2 days', now() - interval '3 days', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO newsletter_sends
  (id, newsletter_id, subscriber_id, status, resend_id, error_message, sent_at, delivered_at, opened_at, bounced_at, bounce_reason)
VALUES
  ('dev-x01', 'dev-nl-1', 'dev-s01', 'sent',   're_dev_01', NULL, now() - interval '2 days', now() - interval '2 days',               now() - interval '47 hours', NULL, NULL),
  ('dev-x02', 'dev-nl-1', 'dev-s02', 'sent',   're_dev_02', NULL, now() - interval '2 days', now() - interval '2 days',               now() - interval '30 hours', NULL, NULL),
  ('dev-x03', 'dev-nl-1', 'dev-s03', 'sent',   're_dev_03', NULL, now() - interval '2 days', now() - interval '2 days',               NULL, NULL, NULL),
  ('dev-x04', 'dev-nl-1', 'dev-s04', 'sent',   're_dev_04', NULL, now() - interval '2 days', now() - interval '2 days',               NULL, NULL, NULL),
  ('dev-x05', 'dev-nl-1', 'dev-s05', 'sent',   're_dev_05', NULL, now() - interval '2 days', now() - interval '2 days',               now() - interval '20 hours', NULL, NULL),
  ('dev-x06', 'dev-nl-1', 'dev-s06', 'sent',   're_dev_06', NULL, now() - interval '2 days', now() - interval '2 days',               NULL, NULL, NULL),
  ('dev-x07', 'dev-nl-1', 'dev-s11', 'sent',   're_dev_07', NULL, now() - interval '2 days', now() - interval '2 days',               now() - interval '40 hours', NULL, NULL),
  ('dev-x08', 'dev-nl-1', 'dev-s13', 'sent',   're_dev_08', NULL, now() - interval '2 days', NULL, NULL, now() - interval '2 days', 'Permanent: General: The recipient address does not exist'),
  ('dev-x09', 'dev-nl-1', 'dev-s07', 'failed', NULL,        'Invalid `to` field. The email address needs to follow the `email@example.com` format.', now() - interval '2 days', NULL, NULL, NULL, NULL),
  ('dev-x10', 'dev-nl-1', 'dev-s08', 'sent',   're_dev_10', NULL, now() - interval '2 days', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
