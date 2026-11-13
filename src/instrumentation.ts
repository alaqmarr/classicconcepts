export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { scheduleBackgroundWarm } = await import("@/lib/redis-cache");
    // Import public-data so warmPublicCache registers as the warm handler, then schedule warm-up
    await import("@/lib/public-data");
    scheduleBackgroundWarm(150);
  }
}
