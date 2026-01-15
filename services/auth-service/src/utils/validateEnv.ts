/**
 * Validates required environment variables on startup
 */
export function validateEnvironment() {
    const requiredVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'EMAIL_USER',
        'EMAIL_PASSWORD',
        'PORT'
    ];

    const missing: string[] = [];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    if (missing.length > 0) {
        console.error('error: Missing required environment variables:');
        missing.forEach(v => console.error(`   - ${v}`));
        console.error('\nnote: Please check your .env file');
        process.exit(1);
    }

    // Validate JWT_SECRET length
    const jwtSecret = process.env.JWT_SECRET as string;
    if (jwtSecret.length < 32) {
        console.error('error: JWT_SECRET must be at least 32 characters long');
        process.exit(1);
    }

    console.log('success: Environment variables validated successfully');
}
