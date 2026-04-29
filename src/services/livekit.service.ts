import { AccessToken } from 'livekit-server-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class LiveKitService {
    public async generateAccessToken(roomId: string, userId: string): Promise<string> {
        const party = await prisma.watchParty.findFirst({
            where: { id: roomId },
        });

        if (!party) {
            throw new Error('Không tìm thấy phòng');
        }
        if (!party.is_active) {
            throw new Error('Phòng này đã kết thúc hoặc không còn hoạt động');
        }
        if (!party.is_voice_chat_enabled) {
            throw new Error('Tính năng Voice Chat không được bật cho phòng này');
        }

        const username = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, display_name: true },
        });

        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
            throw new Error('Server chưa cấu hình LiveKit API Key hoặc Secret');
        }

        const at = new AccessToken(
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET,
            {
                identity: userId,
                name: username?.display_name || username?.username,
            }
        );

        at.addGrant({
          roomJoin: true,
          room: roomId,
          canPublish: true, 
          canSubscribe: true,
          canPublishData: false,
        });
        return at.toJwt();
    }
}