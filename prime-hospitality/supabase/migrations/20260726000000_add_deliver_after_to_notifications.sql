-- Delayed delivery for notifications.
--
-- Shortlisting a seeker is good news that an employer can take back — clicking
-- "All" moves the applicant out of Shortlisted again. Sending the message the
-- instant the button is pressed meant a misclick left the seeker holding a
-- permanent "You've been shortlisted!" while their application quietly read
-- "Reviewed" — the app contradicting itself, with nobody telling them.
--
-- A notification now carries an optional `deliver_after`. Until that moment
-- passes it exists in the table but is invisible to the seeker: it does not
-- appear in their list and does not count toward the unread badge. Undo inside
-- that window deletes the row and the seeker never learns anything happened.
--
-- NULL means deliver immediately, so every other notification type is unaffected.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS deliver_after TIMESTAMPTZ;

-- Every seeker-facing read filters on this, so keep the pending rows cheap to
-- exclude. Partial: delivered rows are the overwhelming majority and need no index.
CREATE INDEX IF NOT EXISTS notifications_deliver_after_idx
  ON public.notifications (deliver_after)
  WHERE deliver_after IS NOT NULL;
