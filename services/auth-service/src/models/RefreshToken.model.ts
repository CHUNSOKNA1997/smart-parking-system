import prisma from "../config/prisma.js";

class RefreshTokenModel {
    static async upsertToken(userId: string, tokenHash: string) {
        return prisma.refreshToken.upsert({
            where: { userId },
            update: { tokenHash },
            create: { userId, tokenHash },
        });
    }

    static async findByTokenHash(tokenHash: string) {
        return prisma.refreshToken.findUnique({
            where: { tokenHash },
        });
    }

    static async deleteByUserId(userId: string) {
        return prisma.refreshToken.deleteMany({
            where: { userId },
        });
    }

    static async deleteByTokenHash(tokenHash: string) {
        return prisma.refreshToken.deleteMany({
            where: { tokenHash },
        });
    }
}

export default RefreshTokenModel;
