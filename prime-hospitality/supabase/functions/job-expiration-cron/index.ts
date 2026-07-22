import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This edge function is meant to be called on a schedule (e.g. daily) via pg_cron or Vercel Cron.
serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create a Supabase client with the service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = new Date().toISOString();
    console.log(`Starting job expiration sweep at ${now}`);

    // 1. Find Expired Subscriptions
    // All employers whose package_expires_at has passed.
    const { data: expiredEmployers, error: empError } = await supabase
      .from('employers')
      .select('id, user_id, users(telegram_id)')
      .lt('package_expires_at', now);
      
    if (empError) throw empError;
    
    let expiredEmployerJobsCount = 0;
    
    if (expiredEmployers && expiredEmployers.length > 0) {
      for (const employer of expiredEmployers) {
        // Expire all their active jobs
        const { data: jobs, error: updateError } = await supabase
          .from('jobs')
          .update({ status: 'expired' })
          .eq('employer_id', employer.id)
          .eq('status', 'active')
          .select();
          
        if (updateError) {
          console.error(`Failed to update jobs for employer ${employer.id}`, updateError);
          continue;
        }
        
        if (jobs && jobs.length > 0) {
          expiredEmployerJobsCount += jobs.length;
          // Send dashboard notification that subscription expired
          if (employer.users && (employer.users as any).telegram_id) {
            await supabase.from('notifications').insert({
              user_telegram_id: (employer.users as any).telegram_id,
              company_name: "System",
              job_title: "Subscription Expired",
              type: "subscription_expired",
              read: false
            });
          }
        }
      }
    }
    
    // 2. Find Expired Deadlines
    // For employers who still have active packages, but specific jobs have passed deadline.
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
    
    return new Response(JSON.stringify({ 
      success: true, 
      expiredEmployerJobsCount,
      expiredDeadlineCount,
      warningsSent: expiringWarningsSent
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
