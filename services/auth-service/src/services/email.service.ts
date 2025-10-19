import nodemailer from "nodemailer";

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send verification email
export const sendVerificationEmail = async (
	email: string,
	token: string
): Promise<boolean> => {
	try {
		const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Email - Smart Parking",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Smart Parking!</h2>
          <p>Thank you for registering. Please verify your email address to complete your registration.</p>
          <p>Click the button below to verify your email:</p>
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; 
                    color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Verify Email
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            This link will expire in 24 hours. If you didn't create an account, please ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️  Verification email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    throw error;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (
	email: string,
	token: string
): Promise<boolean> => {
	try {
		const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: "Reset Your Password - Smart Parking",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You have requested to reset your password for your Smart Parking account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #2196F3; 
                    color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Reset Password
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️  Password reset email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    throw error;
  }
};

// Send welcome email (after verification)
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
    console.log(`✉️  Welcome email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    // Don't throw error for welcome email
    return false;
  }
};
