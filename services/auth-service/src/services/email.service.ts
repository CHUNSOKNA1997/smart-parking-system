import nodemailer from "nodemailer";

/**
 * Email service for sending OTP and notifications.
 * Handles verification emails, password reset OTPs, and welcome messages.
 */

/**
 * Nodemailer transporter configured with SMTP settings from environment variables
 */
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

/**
 * Sends a verification OTP to the user's email address during registration.
 *
 * @param email - Recipient's email address
 * @param otp - 6-digit verification code
 * @returns Promise resolving to true if email sent successfully
 * @throws Error if email sending fails
 */
export const sendVerificationOTP = async (
    email: string,
    otp: string
): Promise<boolean> => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: "Your Verification Code - Smart Parking",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Smart Parking!</h2>
          <p>Thank you for registering. Please use the verification code below to complete your registration.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h1 style="color: #4CAF50; font-size: 48px; margin: 0; letter-spacing: 8px;">${otp}</h1>
          </div>
          <p style="color: #666;">Enter this code in the app to verify your email address.</p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            This code will expire in 5 minutes. If you didn't create an account, please ignore this email.
          </p>
        </div>
      `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`[email] Verification OTP sent to: ${email}`);
        return true;
    } catch (error) {
        console.error("[email] Error sending verification OTP:", error);
        throw error;
    }
};

/**
 * Sends a password reset OTP to the user's email address.
 *
 * @param email - Recipient's email address
 * @param otp - 6-digit password reset code
 * @returns Promise resolving to true if email sent successfully
 * @throws Error if email sending fails
 */
export const sendPasswordResetOTP = async (
    email: string,
    otp: string
): Promise<boolean> => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Code - Smart Parking",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You have requested to reset your password for your Smart Parking account.</p>
          <p>Use the code below to reset your password:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h1 style="color: #2196F3; font-size: 48px; margin: 0; letter-spacing: 8px;">${otp}</h1>
          </div>
          <p style="color: #666;">Enter this code in the app to reset your password.</p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            This code will expire in 10 minutes. If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      `,
        };

        await transporter.sendMail(mailOptions);
        console.log(
            `[EMAIL] Password reset OTP sent to: ${email} (MOCKED: ${otp})`
        );
        console.log(`[email] Password reset OTP sent to: ${email}`);
        return true;
    } catch (error) {
        console.error("[email] Error sending password reset OTP:", error);
        throw error;
    }
};

/**
 * Sends a welcome email to newly verified users.
 *
 * @param email - Recipient's email address
 * @param firstName - User's first name for personalization
 * @returns Promise resolving to true if email sent successfully, false otherwise
 * @note Does not throw errors to prevent disrupting the verification flow
 */
export const sendWelcomeEmail = async (
    email: string,
    firstName: string
): Promise<boolean> => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: "Welcome to Smart Parking!",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome, ${firstName}!</h2>
          <p>Your email has been verified successfully. You can now enjoy all features of Smart Parking.</p>
          <ul style="line-height: 2;">
            <li>Find available parking spots in real-time</li>
            <li>Reserve your spot before you arrive</li>
            <li>Pay securely through the app</li>
            <li>View your parking history</li>
          </ul>
          <p>Happy parking!</p>
          <p style="color: #666;">The Smart Parking Team</p>
        </div>
      `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`[email] Welcome email sent to: ${email}`);
        return true;
    } catch (error) {
        console.error("[email] Error sending welcome email:", error);
        // Don't throw error for welcome email to prevent disrupting the verification flow
        return false;
    }
};
