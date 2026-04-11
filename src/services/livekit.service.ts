import { AccessToken } from 'livekit-server-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class LiveKitService {
    public async generateAccessToken(roomId: string, userId: string, userName: string): Promise<string> {
        const party = await prisma.party.findFirst({
            where: { id: roomId },
        });

        if (!party || !party.is_active || !party.is_voice_chat_enabled) {
            throw new Error('Không tìm thấy phòng hoặc phòng không hỗ trợ voice chat');
        }

        const at = new AccessToken(
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET,
            {
                identity: userId,
                name: userName,
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