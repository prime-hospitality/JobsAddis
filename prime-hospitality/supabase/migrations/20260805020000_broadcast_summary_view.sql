-- ==========================================
-- 20260805020000_broadcast_summary_view.sql
-- A grouped view over broadcast notifications, so the admin dashboard can
-- list, edit and delete broadcasts as single announcements.
--
-- A broadcast has no row of its own: sendBroadcast fans one announcement out
-- into a notifications row per recipient (see admin/actions.ts). All rows of a
-- send share the same created_at -- now() is the transaction timestamp, and
-- the fan-out is a single INSERT -- so (job_title, created_at) identifies an
-- announcement.
--
-- The dashboard used to reconstruct that grouping client-side from the most
-- recent 200 notification rows, which breaks as soon as one send has more than
-- 200 recipients: the whole window is a single announcement and every earlier
-- broadcast disappears from the list. Grouping in SQL removes that ceiling and
-- gives the recipient/delivery counts the edit and delete flows need.
-- ==========================================

-- The view scans only broadcast rows, which are a small minority of the table.
-- Partial index so that stays a targeted lookup as notifications grow.
CREATE INDEX IF NOT EXISTS notifications_broadcast_idx
  ON public.notifications (created_at DESC, job_title)
  WHERE type = 'broadcast';

-- pending_dms is what tells an editing admin whether the change can still
-- reach Telegram: dm_sent_at IS NULL means the dispatcher hasn't sent that
-- recipient's DM yet, so it will pick up the new text. Delivered DMs cannot be
-- edited or recalled -- we don't retain their Telegram message ids.
CREATE OR REPLACE VIEW public.broadcast_summary
WITH (security_invoker = true) AS
SELECT
  n.job_title                                       AS message,
  n.created_at                                      AS created_at,
  count(*)::int                                     AS recipients,
  count(*) FILTER (WHERE n.dm_sent_at IS NULL)::int AS pending_dms,
  count(*) FILTER (WHERE n.read)::int               AS read_count
FROM public.notifications n
WHERE n.type = 'broadcast'
GROUP BY n.job_title, n.created_at;

-- Admin server actions read this with the service-role key. Nothing on the
-- public surface has any business enumerating every announcement ever sent.
REVOKE ALL ON public.broadcast_summary FROM anon, authenticated;
