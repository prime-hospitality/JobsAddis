import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deleteGroupMessage, escapeHtml, sendDirectMessage, sendGroupAnnouncement } from "../_shared/telegram.ts";
import { serviceKey } from "../_shared/serviceKey.ts";

// The every-minute platform sweep, invoked by pg_cron (see migration
// 20260723000000). Despite the name it does more than expiration: it publishes
// scheduled posts on their scheduled minute, expires jobs past their own
// deadline, notifies employers when their subscription lapses, sends expiry
// warnings, and dispatches pending Telegram DMs. The name is kept because the
// pg_cron entry and the deployed function URL both depend on it.

/** Notification types that earn a Telegram DM. Deliberately narrow: a Mini App
 *  user's chat is a scarce resource, and over-messaging gets the bot muted or
 *  blocked, which then costs us the alerts that do matter. Everything outside
 *  this set stays in-app only.
 *
 *  - vacancy_alert -- a job in a category the seeker explicitly subscribed to
 *  - shortlisted   -- the outcome they're waiting on (good news only; declines
 *                     stay silent by design, see 20260726000000)
 *  - broadcast     -- deliberate, infrequent, admin-initiated announcements */
const DM_ELIGIBLE_TYPES = ["vacancy_alert", "shortlisted", "broadcast"] as const;

/** Cap per sweep. A broadcast to every user inserts one row per recipient at
 *  once; this keeps a single run inside the function's wall clock and lets the
 *  remainder drain over the following minutes. */
const DM_BATCH_LIMIT = 400;

function buildDmText(row: any): string {
  const company = escapeHtml(row.company_name || "");
  const title = escapeHtml(row.job_title || "");

  switch (row.type) {
    case "vacancy_alert":
      return `🔔 <b>New vacancy in your field</b>\n\n<b>${title}</b>\n🏢 ${company}`;
    case "shortlisted":
      return `🎉 <b>You've been shortlisted!</b>\n\n${company} shortlisted your application for <b>${title}</b>.`;
    case "broadcast":
      // Broadcasts carry their message body in job_title (the notifications
      // table has no dedicated body column; see sendBroadcast in admin actions).
      return `📢 <b>JobsAddis</b>\n\n${title}`;
    default:
      return `<b>JobsAddis</b>\n\n${title}`;
  }
}

/** Label for the button under the DM. Only a vacancy alert is an invitation to
 *  apply — a shortlisted seeker applied already, and telling them to "Apply"
 *  for the job they were just shortlisted for reads as a mistake. Every button
 *  deep-links to the job itself, so the wording tracks that. */
function buildDmButtonText(row: any): string {
  if (!row.job_id) return "Open JobsAddis →";
  return row.type === "vacancy_alert" ? "View & Apply →" : "View Job →";
}

/** How many group posts one sweep will send or retract. */
const ANNOUNCE_BATCH_LIMIT = 20;

/** Sweeps to try before giving up, shared by the announce and retract passes.
 *  The Bot API call is already retried a few times within a single sweep, so
 *  this is the outer bound on top of that: minutes of transient outage
 *  tolerated, not seconds. */
const MAX_ANNOUNCE_ATTEMPTS = 3;

/** Announces newly-active jobs to the Telegram group and queues vacancy alerts
 *  for subscribed seekers.
 *
 *  Keyed on "the job became active", not "the job was created", because a job
 *  can reach seekers down four different routes -- employer web post, admin
 *  approval, scheduled publish, and the Telegram-surface post_job action --
 *  and previously only the last of those announced or alerted anything. It
 *  also means a `pending` job is never broadcast before an admin approves it.
 *
 *  Claim-then-act, exactly like dispatchPendingDms: overlapping sweeps must not
 *  post the same vacancy to the group twice.
 *
 *  Unlike a DM, though, a failed claim here is not written off. dispatchPendingDms
 *  can drop a nudge because the in-app notification row still carries it; a group
 *  post has no such backstop -- lose it and the vacancy simply never appears in
 *  the group. So a failed post releases the claim (`announced_at` back to null)
 *  for the next sweep to retry, bounded by `announce_attempts` so a job Telegram
 *  rejects for a permanent reason doesn't retry every minute forever. */
async function announceNewlyActiveJobs(supabase: any) {
  const { data: candidates, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("status", "active")
    .is("announced_at", null)
    .order("created_at", { ascending: true })
    .limit(ANNOUNCE_BATCH_LIMIT);

  if (error) {
    console.error("[Announce] Failed to load unannounced jobs:", error);
    return { announced: 0, alerted: 0 };
  }
  if (!candidates || candidates.length === 0) return { announced: 0, alerted: 0 };

  const { data: claimed, error: claimErr } = await supabase
    .from("jobs")
    .update({ announced_at: new Date().toISOString() })
    .in("id", candidates.map((c: any) => c.id))
    .is("announced_at", null)
    .select("id, title, category, neighborhood, job_type, salary_min, salary_max, quantity, deadline, description, min_years_experience, requirements, employer_id, announce_attempts, alerts_queued_at, employers(business_name)");

  if (claimErr) {
    console.error("[Announce] Failed to claim jobs:", claimErr);
    return { announced: 0, alerted: 0 };
  }

  let announced = 0;
  let alerted = 0;

  for (const job of claimed || []) {
    const emp = (job as any).employers;
    const businessName = (Array.isArray(emp) ? emp[0]?.business_name : emp?.business_name) || "JobsAddis";

    let messageId: number | null = null;
    try {
      messageId = await sendGroupAnnouncement(job as any, businessName);
    } catch (err) {
      console.error(`[Announce] Group post threw for job ${job.id}:`, err);
    }
    const posted = messageId !== null;

    if (posted) {
      announced++;
      // Recorded so the post can be taken down if the job is later deleted, and
      // so it counts against the employer's group-boost quota for the day. A
      // failure to record it costs only those two things, so it must not undo
      // an announcement that has already gone out.
      //
      // Appended rather than overwritten: a boosted job has several live posts
      // in the group and every one of them needs retracting. The column is kept
      // in step as "the most recent", which is all anything still reads it for.
      const { error: logErr } = await supabase
        .from("job_group_posts")
        .insert({ job_id: job.id, message_id: messageId, job_title: job.title });
      if (logErr) {
        console.error(`[Announce] Could not record group post for job ${job.id}:`, logErr);
      }
      const { error: idErr } = await supabase
        .from("jobs")
        .update({ announced_message_id: messageId })
        .eq("id", job.id);
      if (idErr) {
        console.error(`[Announce] Could not store message id for job ${job.id}:`, idErr);
      }
    } else {
      // Release the claim so the next sweep picks this job up again, unless
      // we've now burned the attempt budget -- at which point announced_at
      // stays set and the job is written off rather than retried forever.
      const attempts = (Number((job as any).announce_attempts) || 0) + 1;
      const exhausted = attempts >= MAX_ANNOUNCE_ATTEMPTS;
      const { error: releaseErr } = await supabase
        .from("jobs")
        .update({
          announce_attempts: attempts,
          ...(exhausted ? {} : { announced_at: null }),
        })
        .eq("id", job.id);

      if (releaseErr) {
        console.error(`[Announce] Failed to release claim on job ${job.id}:`, releaseErr);
      } else if (exhausted) {
        console.error(
          `[Announce] Job ${job.id} ("${job.title}") gave up after ${attempts} sweeps -- ` +
            `it will NOT appear in the group. Announce it manually or clear announced_at to retry.`,
        );
      } else {
        console.warn(`[Announce] Job ${job.id} will retry next sweep (attempt ${attempts}/${MAX_ANNOUNCE_ATTEMPTS}).`);
      }
    }

    // Queue vacancy alerts for seekers subscribed to this category. Only the
    // notification rows are written here -- dispatchPendingDms below turns them
    // into Telegram DMs on this same sweep.
    //
    // Tracked separately from announced_at: a retried group post must not fan a
    // second DM out to everyone who was already alerted on the first pass. Runs
    // even when the group post failed, since the two are independent deliveries.
    if ((job as any).alerts_queued_at) continue;
    try {
      let query = supabase
        .from("profiles")
        .select("telegram_id")
        .contains("alert_categories", [job.category]);

      // Respect the seeker's cap on how much experience an alerted job may ask
      // for. A seeker with no cap set (null) matches everything.
      //
      // Numeric, and guarded: this used to interpolate a raw label straight
      // into the PostgREST filter, and compared the job's scale against the
      // seeker's — two different label vocabularies — with string equality.
      const minYears = Number((job as any).min_years_experience);
      if (Number.isFinite(minYears)) {
        query = query.or(`alert_max_years.is.null,alert_max_years.gte.${minYears}`);
      }

      const { data: subscribers, error: subErr } = await query;
      if (subErr) throw subErr;

      if (subscribers && subscribers.length > 0) {
        const rows = subscribers.map((s: any) => ({
          user_telegram_id: s.telegram_id,
          company_name: businessName,
          job_title: job.title,
          type: "vacancy_alert",
          read: false,
          job_id: job.id,
        }));
        const { error: insErr } = await supabase.from("notifications").insert(rows);
        if (insErr) throw insErr;
        alerted += rows.length;
      }

      // Marked even when nobody matched, so a retried group post doesn't re-run
      // the subscriber query for a job whose alerts are settled.
      await supabase
        .from("jobs")
        .update({ alerts_queued_at: new Date().toISOString() })
        .eq("id", job.id);
    } catch (err) {
      console.error(`[Announce] Vacancy alerts failed for job ${job.id}:`, err);
    }
  }

  return { announced, alerted };
}

/** Takes down group posts whose job has been deleted.
 *
 *  `retracted_announcements` is filled by an AFTER DELETE trigger on `jobs`,
 *  so this drains a queue rather than deciding anything: by the time it runs
 *  the job row is already gone, and the message id survives only because the
 *  trigger copied it out.
 *
 *  Deleting from Telegram is done here rather than inline in the server action
 *  that deletes the job, because the bot token deliberately lives only in
 *  Supabase -- putting it in Vercel purely to make a delete synchronous would
 *  spread the credential for a post that can perfectly well disappear a minute
 *  later.
 *
 *  A message Telegram reports as already gone counts as done: someone deleted
 *  it by hand, which is the outcome we wanted. */
async function retractDeletedAnnouncements(supabase: any) {
  const { data: pending, error } = await supabase
    .from("retracted_announcements")
    .select("message_id, job_title, attempts")
    .is("deleted_at", null)
    .lt("attempts", MAX_ANNOUNCE_ATTEMPTS)
    .order("queued_at", { ascending: true })
    .limit(ANNOUNCE_BATCH_LIMIT);

  if (error) {
    console.error("[Retract] Failed to load pending retractions:", error);
    return { retracted: 0 };
  }
  if (!pending || pending.length === 0) return { retracted: 0 };

  let retracted = 0;

  for (const row of pending) {
    const messageId = Number(row.message_id);
    let result: { ok: boolean; gone: boolean; error?: string };
    try {
      result = await deleteGroupMessage(messageId);
    } catch (err) {
      console.error(`[Retract] Delete threw for message ${messageId}:`, err);
      result = { ok: false, gone: false, error: String(err) };
    }

    if (result.ok || result.gone) {
      const { error: markErr } = await supabase
        .from("retracted_announcements")
        .update({ deleted_at: new Date().toISOString() })
        .eq("message_id", messageId);
      if (markErr) {
        console.error(`[Retract] Could not mark ${messageId} done:`, markErr);
      } else {
        retracted++;
      }
      continue;
    }

    // Transient failure. Count the attempt so a message Telegram will never
    // accept stops being retried every minute for ever.
    const attempts = (Number(row.attempts) || 0) + 1;
    const { error: bumpErr } = await supabase
      .from("retracted_announcements")
      .update({ attempts })
      .eq("message_id", messageId);
    if (bumpErr) {
      console.error(`[Retract] Could not bump attempts for ${messageId}:`, bumpErr);
    } else if (attempts >= MAX_ANNOUNCE_ATTEMPTS) {
      console.error(
        `[Retract] Giving up on message ${messageId} ("${row.job_title || "untitled"}") ` +
          `after ${attempts} sweeps -- the group post will have to be removed by hand.`,
      );
    }
  }

  return { retracted };
}

/** Sends the bot DM for notification rows that are due and not yet dispatched.
 *
 *  Every failure mode is swallowed: notifications are a best-effort nudge on
 *  top of the in-app row, which remains the source of truth. */
async function dispatchPendingDms(supabase: any, now: string) {
  // Step 1 -- find candidates.
  const { data: candidates, error } = await supabase
    .from("notifications")
    .select("id")
    .is("dm_sent_at", null)
    .in("type", DM_ELIGIBLE_TYPES)
    .or(`deliver_after.is.null,deliver_after.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(DM_BATCH_LIMIT);

  if (error) {
    console.error("[DM dispatch] Failed to load pending notifications:", error);
    return { attempted: 0, sent: 0 };
  }
  if (!candidates || candidates.length === 0) return { attempted: 0, sent: 0 };

  // Step 2 -- claim them before sending anything.
  // pg_cron fires this sweep every minute and does not wait for the previous
  // run to finish, so two runs can overlap. Marking rows dispatched *after*
  // sending would let both runs select the same rows and message the same
  // person twice. The `.is("dm_sent_at", null)` guard makes the UPDATE the
  // atomic claim: only rows this run actually flipped come back, so a
  // concurrent sweep gets nothing and sends nothing.
  //
  // The cost is that a crash between claiming and sending drops those DMs.
  // That is the same trade-off already made below (rows are marked whether or
  // not delivery succeeded), and losing a best-effort nudge is much cheaper
  // than double-messaging users.
  const { data: claimed, error: claimErr } = await supabase
    .from("notifications")
    .update({ dm_sent_at: new Date().toISOString() })
    .in("id", candidates.map((c: any) => c.id))
    .is("dm_sent_at", null)
    .select("id, user_telegram_id, company_name, job_title, type, job_id");

  if (claimErr) {
    console.error("[DM dispatch] Failed to claim notifications:", claimErr);
    return { attempted: 0, sent: 0 };
  }
  const pending = claimed || [];
  if (pending.length === 0) return { attempted: 0, sent: 0 };

  // Step 3 -- send the claimed rows.
  let sent = 0;

  // Chunked to stay inside Telegram's ~30 messages/second bot limit.
  const CHUNK = 25;
  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK);
    const startedAt = Date.now();

    const results = await Promise.all(
      chunk.map((row: any) =>
        sendDirectMessage(row.user_telegram_id, buildDmText(row), {
          buttonText: buildDmButtonText(row),
          startParam: row.job_id ? `job_${row.job_id}` : undefined,
        })
      )
    );

    // Rows are already marked dispatched by the claim above, so nothing to
    // update here. A blocked or never-started chat is a permanent condition,
    // and a transient failure isn't worth retrying at the cost of risking a
    // duplicate message later.
    for (const res of results) {
      if (res.ok) sent++;
    }

    if (i + CHUNK < pending.length) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 1000) await new Promise((r) => setTimeout(r, 1000 - elapsed));
    }
  }

  return { attempted: pending.length, sent };
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Create a Supabase client with the service role key to bypass RLS
    const supabase = createClient(supabaseUrl, serviceKey());
    
    const now = new Date().toISOString();
    console.log(`Starting job expiration sweep at ${now}`);

    // 0. Publish Scheduled Posts
    // Any job whose scheduled_at has passed leaves the 'scheduled' state at its
    // scheduled time. It goes live ('active') if either the owning employer is
    // trusted to post without review (employers.auto_publish = true) OR an
    // admin already pre-approved this specific job ahead of time
    // (jobs.pre_approved = true) while it was still waiting to be published.
    // Otherwise it enters moderation ('pending') so an admin reviews it now.
    const { data: dueJobs, error: dueError } = await supabase
      .from('jobs')
      .select('id, pre_approved, employers(auto_publish)')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (dueError) throw dueError;

    const toActive: string[] = [];
    const toPending: string[] = [];
    for (const j of dueJobs ?? []) {
      const emp = (j as any).employers;
      const autoPublish = Array.isArray(emp) ? emp[0]?.auto_publish : emp?.auto_publish;
      (autoPublish || (j as any).pre_approved ? toActive : toPending).push((j as any).id);
    }

    if (toActive.length > 0) {
      const { error } = await supabase.from('jobs').update({ status: 'active' }).in('id', toActive);
      if (error) throw error;
    }
    if (toPending.length > 0) {
      const { error } = await supabase.from('jobs').update({ status: 'pending' }).in('id', toPending);
      if (error) throw error;
    }
    const publishedCount = toActive.length;
    const sentToReviewCount = toPending.length;

    // 1. Notify employers whose subscription has newly lapsed. Jobs are never
    // force-expired here -- each job stays active through its OWN deadline
    // regardless of subscription status, so status='expired' (step 2 below)
    // exclusively means "this job's own deadline passed," never "subscription
    // lapsed." Losing a subscription only locks out NEW applicants (handled
    // client-side by comparing an application's created_at against
    // package_expires_at) and blocks posting/reposting/extending, both of
    // which were already gated on package_expires_at elsewhere.
    const { data: expiredEmployers, error: empError } = await supabase
      .from('employers')
      .select('id, package_expires_at, users(telegram_id)')
      .lt('package_expires_at', now);

    if (empError) throw empError;

    let subscriptionExpiredNoticesSent = 0;

    for (const employer of expiredEmployers ?? []) {
      const telegramId = (employer.users as any)?.telegram_id;
      if (!telegramId) continue;

      // Dedup with no extra column: has a notice already gone out since THIS
      // lapse took effect? Renewing moves package_expires_at forward, which
      // pushes every earlier notice's created_at before the new
      // package_expires_at -- so this check resets itself once per lapse
      // cycle with no bookkeeping flag needed.
      const { count, error: dupErr } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_telegram_id', telegramId)
        .eq('type', 'subscription_expired')
        .gt('created_at', employer.package_expires_at as string);

      if (dupErr) {
        console.error(`Dup check failed for employer ${employer.id}`, dupErr);
        continue;
      }
      if (count && count > 0) continue;

      await supabase.from('notifications').insert({
        user_telegram_id: telegramId,
        company_name: "System",
        job_title: "Subscription Expired",
        type: "subscription_expired",
        read: false,
      });
      subscriptionExpiredNoticesSent++;
    }

    // 2. Find Expired Deadlines
    // The only step that ever sets status='expired' -- any active job whose
    // own deadline has passed, regardless of the employer's subscription state.
    const { data: expiredDeadlineJobs, error: deadlineError } = await supabase
      .from('jobs')
      .update({ status: 'expired' })
      .lt('deadline', now)
      .eq('status', 'active')
      .select();
      
    if (deadlineError) throw deadlineError;
    const expiredDeadlineCount = expiredDeadlineJobs ? expiredDeadlineJobs.length : 0;
    
    // 3. Warn About Upcoming Deadlines (within 48 hours)
    const fortyEightHoursFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    
    const { data: expiringJobs, error: warningError } = await supabase
      .from('jobs')
      .select('id, title, deadline, employer_id, employers(business_name, users(telegram_id))')
      .gt('deadline', now)
      .lte('deadline', fortyEightHoursFromNow)
      .eq('status', 'active');
      
    if (warningError) throw warningError;
    
    let expiringWarningsSent = 0;

    if (expiringJobs && expiringJobs.length > 0) {
      // Create 'job_expiring' notifications, but only once per job -- skip if
      // a job_expiring notification for this job_id was already sent.
      for (const job of expiringJobs) {
        const telegramId = (job.employers as any)?.users?.telegram_id;
        if (!telegramId) continue;

        const { count: alreadySent, error: dupCheckError } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id)
          .eq('type', 'job_expiring');

        if (dupCheckError) {
          console.error(`Failed to check existing job_expiring notification for job ${job.id}`, dupCheckError);
          continue;
        }
        if (alreadySent && alreadySent > 0) continue;

        await supabase.from('notifications').insert({
          user_telegram_id: telegramId,
          company_name: "System",
          job_title: job.title,
          type: "job_expiring",
          job_id: job.id,
          read: false
        });
        expiringWarningsSent++;
      }
    }
    
    // 4. Warn employers whose subscription expires within 24 hours. Dashboard
    // access itself is never blocked by expiry (only posting new jobs is) --
    // this is a heads-up so they can renew before that kicks in.
    // expiry_warning_sent gates this to once per billing cycle: it's reset to
    // false whenever an admin (re)assigns a package (see updateEmployer).
    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: expiringSoonEmployers, error: expiringSoonError } = await supabase
      .from('employers')
      .select('id, users(telegram_id)')
      .eq('expiry_warning_sent', false)
      .gt('package_expires_at', now)
      .lte('package_expires_at', twentyFourHoursFromNow);

    if (expiringSoonError) throw expiringSoonError;

    let subscriptionExpiryWarningsSent = 0;

    if (expiringSoonEmployers && expiringSoonEmployers.length > 0) {
      for (const employer of expiringSoonEmployers) {
        const telegramId = (employer.users as any)?.telegram_id;
        if (telegramId) {
          await supabase.from('notifications').insert({
            user_telegram_id: telegramId,
            company_name: "System",
            job_title: "Subscription Expiring Soon",
            type: "subscription_expiring",
            read: false
          });
          subscriptionExpiryWarningsSent++;
        }
        // Mark it sent regardless of whether a telegram_id was found, so a
        // missing telegram_id doesn't retry every minute for the rest of the
        // 24h window.
        await supabase.from('employers').update({ expiry_warning_sent: true }).eq('id', employer.id);
      }
    }

    // 5. Announce newly-active jobs and queue their vacancy alerts.
    // Runs after step 0 so a scheduled job published this very minute is
    // announced on the same sweep, and before the DM dispatch below so the
    // alerts it queues go out immediately rather than a minute later.
    let announceResult = { announced: 0, alerted: 0 };
    try {
      announceResult = await announceNewlyActiveJobs(supabase);
    } catch (annErr) {
      console.error("[Announce] Unexpected failure:", annErr);
    }

    // 5b. Take down group posts whose job has been deleted.
    // After the announce step, so a job posted and deleted between two sweeps
    // is announced and retracted in order rather than having its retraction
    // processed before the post it refers to exists.
    let retractResult = { retracted: 0 };
    try {
      retractResult = await retractDeletedAnnouncements(supabase);
    } catch (retErr) {
      console.error("[Retract] Unexpected failure:", retErr);
    }

    // 6. Dispatch pending Telegram DMs.
    // Runs last so notifications created earlier in this same sweep (expiry
    // warnings and the vacancy alerts just queued above) go out without
    // waiting a further minute. Never allowed to fail the sweep -- job and
    // subscription state is the important work here, messaging is best-effort
    // on top of it.
    let dmResult = { attempted: 0, sent: 0 };
    try {
      dmResult = await dispatchPendingDms(supabase, new Date().toISOString());
    } catch (dmErr) {
      console.error("[DM dispatch] Unexpected failure:", dmErr);
    }

    return new Response(JSON.stringify({
      success: true,
      publishedCount,
      sentToReviewCount,
      subscriptionExpiredNoticesSent,
      expiredDeadlineCount,
      warningsSent: expiringWarningsSent,
      subscriptionExpiryWarningsSent,
      jobsAnnounced: announceResult.announced,
      vacancyAlertsQueued: announceResult.alerted,
      announcementsRetracted: retractResult.retracted,
      dmAttempted: dmResult.attempted,
      dmSent: dmResult.sent
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (err: any) {
    console.error("Error in expiration cron:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
