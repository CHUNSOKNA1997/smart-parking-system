import bcrypt from "bcrypt";
import prisma from "../config/prisma"; // or your UserModel

const DEFAULT_USER = {
    firstName: "Super",
    lastName: "User",
    email: "admin@gmail.com",
    password: "88889999", // default password
};

export async function initDefaultUser() {
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: DEFAULT_USER.email },
        });

        if (existingUser) {
            console.log(
                `✅ Default user already exists: ${DEFAULT_USER.email}`
            );
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(DEFAULT_USER.password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                firstName: DEFAULT_USER.firstName,
                lastName: DEFAULT_USER.lastName,
                email: DEFAULT_USER.email,
                passwordHash,
                isVerified: true, // Mark as verified so admin can login immediately
            },
        });

        console.log(`✅ Default user created: ${user.email}`);
    } catch (error) {
        console.error("❌ Failed to initialize default user:", error);
    } finally {
        await prisma.$disconnect();
    }
}
