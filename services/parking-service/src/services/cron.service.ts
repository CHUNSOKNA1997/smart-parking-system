
import BookingModel from "../models/Booking.model.js";

class CronService {
    private static intervalId: NodeJS.Timeout | null = null;
    private static readonly INTERVAL_MS = 60 * 1000; // Run every 1 minute
    private static readonly EXPIRATION_MINUTES = 2; // Expire after 2 minutes

    static start() {
        if (this.intervalId) {
            console.log("[CRON] Service already running");
            return;
        }

        console.log(`[CRON] Starting booking cleanup service (Interval: ${this.INTERVAL_MS}ms, Timeout: ${this.EXPIRATION_MINUTES}m)`);

        // Run immediately on startup
        this.checkExpiredBookings();

        // Set interval
        this.intervalId = setInterval(() => {
            this.checkExpiredBookings();
        }, this.INTERVAL_MS);
    }

    static stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log("[CRON] Service stopped");
        }
    }

    private static async checkExpiredBookings() {
        try {
            const count = await BookingModel.releaseExpiredReservations(this.EXPIRATION_MINUTES);
            if (count > 0) {
                console.log(`[CRON] Released ${count} expired bookings`);
            }
        } catch (error) {
            console.error("[CRON] Error during booking cleanup:", error);
        }
    }
}

export default CronService;
