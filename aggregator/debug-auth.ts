import axios from "axios";

const AUTH_URL = "http://localhost:3001/api/v1/auth";
const AGGREGATOR_URL = "http://localhost:3000/api/v1";

const CREDENTIALS = {
    email: "admin@gmail.com",
    password: "88889999",
};

async function run() {
    try {
        console.log("1. Logging in...");
        const loginRes = await axios.post(`${AUTH_URL}/login`, CREDENTIALS);
        const token = loginRes.data.data.token;
        console.log("✅ Login successful. Token:", token.substring(0, 20) + "...");

        console.log("\n2. Verifying token directly with Auth Service...");
        try {
            const verifyRes = await axios.post(`${AUTH_URL}/token/verify`, { token });
            console.log("✅ Direct verification successful:", verifyRes.data.message);
        } catch (err: any) {
            console.error("❌ Direct verification failed:", err.response?.data || err.message);
        }

        console.log("\n3. Creating booking via Aggregator (Parking Service)...");
        try {
            const bookingRes = await axios.post(
                `${AGGREGATOR_URL}/bookings`,
                {
                    spotId: "00000000-0000-0000-0000-000000000000", // Dummy UUID
                    startTime: new Date().toISOString(),
                    endTime: new Date(Date.now() + 3600000).toISOString(),
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            console.log("✅ Booking creation response:", bookingRes.status);
        } catch (err: any) {
            console.error("❌ Booking creation failed:", err.response?.data || err.message);
        }

    } catch (error: any) {
        console.error("❌ Fatal error:", error.response?.data || error.message);
    }
}

run();
