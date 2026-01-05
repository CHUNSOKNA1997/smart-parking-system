/**
 * Booking Service Client
 * Handles communication with the booking service to fetch booking details
 */

import axios from 'axios';

interface BookingDetails {
    id: string;
    userId: string;
    spotId: string;
    durationHours: string;
    totalPrice: string;
    currency: string;
    status: string;
    createdAt: string;
}

interface BookingResponse {
    success: boolean;
    message: string;
    data: {
        booking?: BookingDetails;
    };
}

class BookingServiceClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:3002';
    }

    /**
     * Fetch booking details by ID
     * @param bookingId - Booking UUID
     * @param authToken - JWT token for authentication
     * @returns Booking details including totalPrice and currency
     */
    async getBooking(bookingId: string, authToken: string): Promise<BookingDetails> {
        try {
            console.log(`[BOOKING CLIENT] Fetching booking: ${bookingId}`);
            
            const response = await axios.get<BookingResponse>(
                `${this.baseUrl}/api/v1/bookings/${bookingId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                    },
                    timeout: 5000, // 5 second timeout
                }
            );

            if (!response.data.success || !response.data.data.booking) {
                throw new Error('Booking not found');
            }

            const booking = response.data.data.booking;
            
            console.log(`[BOOKING CLIENT] Booking fetched: ${bookingId} - ${booking.totalPrice} ${booking.currency}`);
            
            return booking;
        } catch (error: any) {
            console.error(`[BOOKING CLIENT] Error fetching booking ${bookingId}:`, error.message);
            
            if (error.response?.status === 404) {
                throw new Error(`Booking not found: ${bookingId}`);
            }
            
            if (error.response?.status === 403 || error.response?.status === 401) {
                throw new Error('Unauthorized to access this booking');
            }
            
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Booking service is unavailable');
            }
            
            throw new Error(`Failed to fetch booking: ${error.message}`);
        }
    }

    /**
     * Fetch multiple bookings by IDs
     * @param bookingIds - Array of booking UUIDs
     * @param authToken - JWT token for authentication
     * @returns Array of booking details
     */
    async getBookings(bookingIds: string[], authToken: string): Promise<BookingDetails[]> {
        console.log(`[BOOKING CLIENT] Fetching ${bookingIds.length} bookings`);
        
        // Fetch all bookings in parallel
        const bookingPromises = bookingIds.map(id => this.getBooking(id, authToken));
        
        try {
            const bookings = await Promise.all(bookingPromises);
            console.log(`[BOOKING CLIENT] Successfully fetched ${bookings.length} bookings`);
            return bookings;
        } catch (error: any) {
            console.error('[BOOKING CLIENT] Error fetching multiple bookings:', error.message);
            throw error;
        }
    }
}

export const bookingServiceClient = new BookingServiceClient();
export type { BookingDetails };
