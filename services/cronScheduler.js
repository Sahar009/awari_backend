import cron from 'node-cron';
import releaseCompletedBookings from './scripts/releaseBookingFunds.js';
import autoCancelBookings from './scripts/autoCancelBookings.js';

/**
 * Cron Job Scheduler
 * 
 * Manages all scheduled background tasks for the AWARI platform.
 * Each job includes detailed logging for monitoring and debugging.
 */

const jobs = [];

/**
 * Initialize and start all cron jobs
 */
export function initCronJobs() {
  console.log('');
  console.log('⏰ ═══════════════════════════════════════════');
  console.log('⏰  CRON SCHEDULER - Initializing Jobs');
  console.log('⏰ ═══════════════════════════════════════════');

  // ─── Job 1: Release Booking Funds ───
  // Runs daily at midnight (00:00)
  // Releases pending wallet funds when booking check-in date is reached
  const releaseFundsJob = cron.schedule('0 0 * * *', async () => {
    const startTime = Date.now();
    console.log('');
    console.log('⏰ ───────────────────────────────────────────');
    console.log(`⏰ [CRON] Release Booking Funds - STARTED at ${new Date().toISOString()}`);
    console.log('⏰ ───────────────────────────────────────────');

    try {
      const result = await releaseCompletedBookings();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (result.success) {
        console.log(`⏰ [CRON] Release Booking Funds - COMPLETED in ${duration}s`);
        console.log(`⏰ [CRON]   Processed: ${result.processed}, Failed: ${result.failed}`);
      } else {
        console.error(`⏰ [CRON] Release Booking Funds - FAILED in ${duration}s`);
        console.error(`⏰ [CRON]   Error: ${result.error}`);
      }
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`⏰ [CRON] Release Booking Funds - CRASHED in ${duration}s`);
      console.error(`⏰ [CRON]   Error: ${error.message}`);
    }

    console.log('⏰ ───────────────────────────────────────────');
    console.log('');
  }, {
    scheduled: true,
    timezone: 'Africa/Lagos' // WAT (UTC+1)
  });

  jobs.push({ name: 'Release Booking Funds', schedule: '0 0 * * * (daily at midnight WAT)', job: releaseFundsJob });

  // ─── Job 2: Auto-Cancel Unconfirmed Bookings ───
  // Runs every hour
  // Cancels bookings not confirmed within the configured timeout, refunds paid bookings
  const autoCancelJob = cron.schedule('0 * * * *', async () => {
    const startTime = Date.now();
    console.log('');
    console.log('⏰ ───────────────────────────────────────────');
    console.log(`⏰ [CRON] Auto-Cancel Bookings - STARTED at ${new Date().toISOString()}`);
    console.log('⏰ ───────────────────────────────────────────');

    try {
      const result = await autoCancelBookings();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (result.success) {
        console.log(`⏰ [CRON] Auto-Cancel Bookings - COMPLETED in ${duration}s`);
        console.log(`⏰ [CRON]   Cancelled: ${result.cancelled}, Refunded: ${result.refunded}, Failed: ${result.failed}`);
      } else {
        console.error(`⏰ [CRON] Auto-Cancel Bookings - FAILED in ${duration}s`);
        console.error(`⏰ [CRON]   Error: ${result.error}`);
      }
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`⏰ [CRON] Auto-Cancel Bookings - CRASHED in ${duration}s`);
      console.error(`⏰ [CRON]   Error: ${error.message}`);
    }

    console.log('⏰ ───────────────────────────────────────────');
    console.log('');
  }, {
    scheduled: true,
    timezone: 'Africa/Lagos'
  });

  jobs.push({ name: 'Auto-Cancel Unconfirmed Bookings', schedule: '0 * * * * (every hour WAT)', job: autoCancelJob });

  // ─── Log Summary ───
  console.log('');
  console.log(`⏰ [CRON] Registered ${jobs.length} job(s):`);
  jobs.forEach((j, i) => {
    console.log(`⏰ [CRON]   ${i + 1}. ${j.name} — ${j.schedule}`);
  });
  console.log('');
  console.log('⏰ ═══════════════════════════════════════════');
  console.log('⏰  CRON SCHEDULER - All Jobs Active');
  console.log('⏰ ═══════════════════════════════════════════');
  console.log('');
}

/**
 * Stop all cron jobs gracefully
 */
export function stopCronJobs() {
  console.log('⏰ [CRON] Stopping all cron jobs...');
  jobs.forEach((j) => {
    j.job.stop();
    console.log(`⏰ [CRON]   Stopped: ${j.name}`);
  });
  console.log('⏰ [CRON] All cron jobs stopped.');
}

/**
 * Get status of all registered cron jobs
 */
export function getCronJobStatus() {
  return jobs.map((j) => ({
    name: j.name,
    schedule: j.schedule,
    running: j.job.running ?? true
  }));
}

export default { initCronJobs, stopCronJobs, getCronJobStatus };
