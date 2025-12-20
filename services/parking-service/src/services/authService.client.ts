import axios, { AxiosInstance } from "axios";

interface UserData {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface TokenVerifyResponse {
    success: boolean;
    message: string;
    data?: {
        user: {
            userId: string;
            email: string;
            firstName?: string;
            lastName?: string;
        };
    };
}

interface UserResponse {
    success: boolean;
    message: string;
    data?: {
        user: UserData;
    };
}

class AuthServiceClient {
    private client: AxiosInstance;
    private baseURL: string;
    private maxRetries: number = 3;
    private retryDelay: number = 1000; // 1 second

    constructor() {
        this.baseURL = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 5000, // 5 second timeout
            headers: {
                "Content-Type": "application/json",
            },
        });
    }

    /**
     * Retry helper with exponential backoff
     */
    private async retryWithBackoff<T>(
        fn: () => Promise<T>,
        retries: number = this.maxRetries
    ): Promise<T> {
        try {
            return await fn();
        } catch (error: any) {
            if (retries <= 0) {
                throw error;
            }

            // Only retry on network errors or 5xx server errors
            const shouldRetry =
                !error.response ||
                (error.response.status >= 500 && error.response.status < 600);

            if (!shouldRetry) {
                throw error;
            }

            const delay = this.retryDelay * (this.maxRetries - retries + 1);
            console.warn(
                `Auth service request failed, retrying in ${delay}ms... (${retries} retries left)`
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.retryWithBackoff(fn, retries - 1);
        }
    }

    /**
     * Verify JWT token with auth-service
     */
    async verifyToken(token: string): Promise<TokenVerifyResponse> {
        return this.retryWithBackoff(async () => {
            try {
                const response = await this.client.post<TokenVerifyResponse>(
                    "/api/v1/auth/token/verify",
                    { token }
                );

                return response.data;
            } catch (error: any) {
                console.error(
                    "Auth service - verify token error:",
                    error.message
                );

                if (error.response) {
                    return {
                        success: false,
                        message:
                            error.response.data.message ||
                            "Token verification failed",
                    };
                }

                throw new Error("Auth service unavailable");
            }
        });
    }

    /**
     * Get user by ID from auth-service
     */
    async getUserById(userId: string): Promise<UserData | null> {
        return this.retryWithBackoff(async () => {
            try {
                const response = await this.client.get<UserResponse>(
                    `/api/v1/auth/users/${userId}`
                );

                if (response.data.success && response.data.data) {
                    return response.data.data.user;
                }

                return null;
            } catch (error: any) {
                console.error("Auth service - get user error:", error.message);

                if (error.response?.status === 404) {
                    return null;
                }

                throw new Error("Auth service unavailable");
            }
        });
    }

    /**
     * Check if auth-service is healthy
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.client.get("/health");
            return true;
        } catch (error) {
            console.error("Auth service health check failed");
            return false;
        }
    }
}

// Export singleton instance
export default new AuthServiceClient();
