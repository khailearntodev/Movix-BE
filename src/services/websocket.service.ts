import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { checkToxicity } from "./perspective.service";

export class WebSocketService {
  private io: SocketIOServer;
  private prisma: PrismaClient;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: (requestOrigin, callback) => {
          if (!requestOrigin) {
            return callback(null, true);
          }

          const allowedOrigins = [
            "http://localhost:3000",
            "http://localhost:19000", 
            "http://localhost:8081",  
            "https://movix-fe.vercel.app",
            "https://movix-be.onrender.com",
            "https://movix.io.vn",   
            "https://api.movix.io.vn", 
            process.env.CLIENT_URL,
            process.env.FRONTEND_LAN_URL,
          ].filter(Boolean);

          if (allowedOrigins.includes(requestOrigin) || allowedOrigins.some(o => requestOrigin.startsWith(o as string))) {
            return callback(null, true);
          }

          if (requestOrigin.startsWith("http://192.168.") || requestOrigin.startsWith("http://10.0.") || requestOrigin === "http://localhost") {
            return callback(null, true);
          }

          console.log("🚫 Blocked Origin:", requestOrigin);
          return callback(new Error("Not allowed by CORS"), false);
        },
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
      },
    });

    this.prisma = new PrismaClient();
    this.setupSocketHandlers();
  }

  // --- HELPER: Kiểm tra quyền Host ---
  private async verifyHost(roomId: string, userId: string): Promise<boolean> {
    const party = await this.prisma.watchParty.findUnique({
      where: { id: roomId },
      select: { host_user_id: true },
    });
    return party?.host_user_id === userId;
  }

  // --- HELPER: Lấy danh sách thành viên ---
  private async getRoomMembers(roomId: string) {
    const members = await this.prisma.watchPartyMember.findMany({
      where: { party_id: roomId, is_online: true },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            username: true,
            avatar_url: true,
          },
        },
      },
    });

    return members.map((m) => ({
      id: m.user.id,
      name: m.user.display_name || m.user.username,
      avatar: m.user.avatar_url,
      role: m.role,
      online: m.is_online,
      isMuted: m.is_muted,
    }));
  }

  private setupSocketHandlers(): void {
    this.io.use(async (socket, next) => {
      if (socket.handshake.query.isRemote === "true") {
        socket.data.user = {
          id: "00000000-0000-0000-0000-000000000000",
          username: "Mobile Remote",
        };
        return next();
      }
      try {
        console.log("WebSocket Handshake Auth:", socket.handshake.auth);
        let token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace("Bearer ", "");

        if (!token && socket.handshake.headers.cookie) {
          const cookies = socket.handshake.headers.cookie
            .split(";")
            .reduce((acc: any, cookie) => {
              const [key, value] = cookie.trim().split("=");
              acc[key] = value;
              return acc;
            }, {});
          token = cookies["accessToken"];
        }

        if (!token) return next(new Error("No token provided"));

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await this.prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        });

        if (!user) return next(new Error("User not found"));

        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error("Authentication failed"));
      }
    });

    this.io.on("connection", (socket) => {
      const user = socket.data.user;
      console.log(`User ${user.username} connected with socket ${socket.id}`);

      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(socket.id);

      socket.join(`user:${user.id}`);
      if (
        user.id !== "remote_mobile" &&
        user.id !== "00000000-0000-0000-0000-000000000000"
      ) {
        this.sendUnreadCount(user.id);
      }

      this.handleSocketEvents(socket);
      this.handleWatchPartyEvents(socket);

      socket.on("disconnect", () => {
        console.log(`User ${user.username} disconnected`);
        const userSocketSet = this.userSockets.get(user.id);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(user.id);
          }
        }
      });

      socket.on("remote_command", (data) => {
        console.log("📱 Mobile Remote:", data);
        socket.broadcast.emit("web_execute_command", data);
      });
    });
  }

  // --- XỬ LÝ WATCH PARTY EVENTS ---
  private handleWatchPartyEvents(socket: Socket): void {
    // 1. User tham gia phòng
    socket.on("wp:join", async ({ roomId, userId }) => {
      const party = await this.prisma.watchParty.findUnique({
        where: { id: roomId },
        select: { max_participants: true, host_user_id: true },
      });

      const currentMembersCount = await this.prisma.watchPartyMember.count({
        where: { party_id: roomId, is_online: true },
      });

      if (
        party &&
        party.max_participants &&
        currentMembersCount >= party.max_participants
      ) {
        socket.emit("wp:join_rejected", {
          message: `Phòng đã đạt giới hạn tối đa ${party.max_participants} người. Vui lòng nâng cấp gói để vào các phòng lớn hơn!`,
        });
        return;
      }

      const member = await this.prisma.watchPartyMember.findUnique({
        where: {
          party_id_user_id: { party_id: roomId, user_id: userId },
        },
      });

      if (member && member.is_banned) {
        socket.emit("wp:join_pending", {
          message:
            "Bạn đang bị chặn. Đã gửi yêu cầu xin vào lại đến chủ phòng...",
        });

        if (party && party.host_user_id) {
          const hostSocketIds = this.userSockets.get(party.host_user_id);
          if (hostSocketIds) {
            const requesterInfo = socket.data.user;
            this.io
              .to([...hostSocketIds])
              .emit("wp:host_receive_join_request", {
                userId,
                username: requesterInfo.username,
                displayName: requesterInfo.display_name,
                avatarUrl: requesterInfo.avatar_url,
              });
          }
        }
        return;
      }

      socket.join(roomId);
      try {
        await this.prisma.watchPartyMember.upsert({
          where: { party_id_user_id: { party_id: roomId, user_id: userId } },
          create: { party_id: roomId, user_id: userId, is_online: true },
          update: { is_online: true },
        });
      } catch (e) {
        console.error("Error updating member status:", e);
      }

      const members = await this.getRoomMembers(roomId);
      this.io.to(roomId).emit("wp:update_members", members);
    });

    // 2. Host xử lý yêu cầu gia nhập
    socket.on("wp:process_join_request", async ({ roomId, userId, accept }) => {
      const hostId = socket.data.user.id;
      if (!(await this.verifyHost(roomId, hostId))) return;

      if (accept) {
        await this.prisma.watchPartyMember.update({
          where: { party_id_user_id: { party_id: roomId, user_id: userId } },
          data: { is_banned: false, is_online: true },
        });

        const userSocketIds = this.userSockets.get(userId);
        if (userSocketIds) {
          userSocketIds.forEach((sid) => {
            const s = this.io.sockets.sockets.get(sid);
            if (s) {
              s.join(roomId);
              s.emit("wp:join_accepted");
            }
          });
          const members = await this.getRoomMembers(roomId);
          this.io.to(roomId).emit("wp:update_members", members);
        }
      } else {
        const userSocketIds = this.userSockets.get(userId);
        if (userSocketIds) {
          this.io
            .to([...userSocketIds])
            .emit("wp:join_rejected", {
              message: "Chủ phòng đã từ chối yêu cầu của bạn.",
            });
        }
      }
    });

    // 3. Rời phòng
    socket.on("wp:leave", async ({ roomId, userId }) => {
      socket.leave(roomId);
      try {
        await this.prisma.watchPartyMember.update({
          where: { party_id_user_id: { party_id: roomId, user_id: userId } },
          data: { is_online: false },
        });
      } catch (e) { }

      const members = await this.getRoomMembers(roomId);
      this.io.to(roomId).emit("wp:update_members", members);
    });

    // 4. CHAT
    socket.on("wp:send_message", async (data) => {
      const { roomId, userId, message, user } = data;

      const member = await this.prisma.watchPartyMember.findUnique({
        where: { party_id_user_id: { party_id: roomId, user_id: userId } },
        select: { is_muted: true },
      });

      if (member?.is_muted) {
        socket.emit("wp:system_message", {
          text: "Bạn đã bị chủ phòng chặn chat.",
          type: "error",
        });
        return;
      }

      try {
        const toxicityResult = await checkToxicity(message);

        const isFlagged = toxicityResult.isToxic;
        const toxicityScore = toxicityResult.score;

        const savedMsg = await this.prisma.watchPartyMessage.create({
          data: {
            party_id: roomId,
            user_id: userId,
            message: message,
            is_flagged: isFlagged,
            toxicity_score: toxicityScore,
          },
        });

        if (!isFlagged) {
          this.io.to(roomId).emit("wp:new_message", {
            id: savedMsg.id,
            text: savedMsg.message,
            userId: userId,
            user: user?.name,
            avatar: user?.avatar,
            time: savedMsg.created_at.toISOString(),
            isHost: false,
            isFlagged: false,
          });
        } else {
          socket.emit("wp:system_message", {
            text: "Tin nhắn của bạn đã bị ẩn do vi phạm tiêu chuẩn cộng đồng (Chứa từ ngữ không phù hợp).",
            type: "error",
          });

          const party = await this.prisma.watchParty.findUnique({
            where: { id: roomId },
            select: { host_user_id: true },
          });
          if (party) {
            const hostSockets = this.userSockets.get(party.host_user_id);
            if (hostSockets)
              this.io
                .to([...hostSockets])
                .emit("wp:system_message", {
                  text: `User ${user?.name} vừa gửi tin nhắn độc hại.`,
                });
          }
        }
      } catch (e) {
        console.error("Error sending message:", e);
      }
    });

    socket.on("wp:report_message", async ({ messageId, reason }) => {
      try {
        await this.prisma.watchPartyMessage.update({
          where: { id: messageId },
          data: { is_flagged: true, flag_reason: reason },
        });
      } catch (e) { }
    });

    // 5. Đồng bộ Video (Play/Pause)
    socket.on("wp:sync_action", async (data) => {
      const { roomId, action, currentTime } = data;
      const userId = socket.data.user.id;
      if (!(await this.verifyHost(roomId, userId))) return;

      socket.to(roomId).emit("wp:sync_player", {
        action,
        currentTime,
        timestamp: Date.now(),
      });
    });

    // 6. Đồng bộ Tua (Seek)
    socket.on("wp:seek_action", async (data) => {
      const { roomId, currentTime } = data;
      const userId = socket.data.user.id;
      if (!(await this.verifyHost(roomId, userId))) return;

      socket.to(roomId).emit("wp:sync_player", {
        action: "seek",
        currentTime,
        timestamp: Date.now(),
      });
    });

    // 7. Đồng bộ ban đầu
    socket.on("wp:request_sync", ({ roomId, requesterId }) => {
      socket.to(roomId).emit("wp:get_host_time", { requesterId });
    });

    socket.on(
      "wp:send_host_time",
      ({ roomId, requesterId, currentTime, isPlaying }) => {
        this.io
          .to(roomId)
          .emit("wp:sync_initial", {
            targetUserId: requesterId,
            currentTime,
            isPlaying,
          });
      },
    );

    // 8. Quản trị thành viên
    socket.on("wp:kick_user", async (data) => {
      const { roomId, userIdToKick } = data;
      const requesterId = socket.data.user.id;

      if (!(await this.verifyHost(roomId, requesterId))) return;

      const hostSub = await this.prisma.userSubscription.findUnique({
        where: { user_id: requesterId },
        include: { plan: true },
      });

      const canKick =
        hostSub?.status === "ACTIVE" && hostSub.plan?.can_kick_mute_members;

      if (!canKick) {
        socket.emit("wp:system_message", {
          text: "Bạn không có quyền này. Vui lòng nâng cấp gói cước Movix Ultimate để sử dụng tính năng này.",
          type: "error",
        });
        return;
      }

      this.io.to(roomId).emit("wp:kicked", { userId: userIdToKick });

      const userSocketIds = this.userSockets.get(userIdToKick);
      if (userSocketIds) {
        userSocketIds.forEach((sid) => {
          const s = this.io.sockets.sockets.get(sid);
          if (s) s.leave(roomId);
        });
      }

      try {
        await this.prisma.watchPartyMember.update({
          where: {
            party_id_user_id: { party_id: roomId, user_id: userIdToKick },
          },
          data: { is_online: false },
        });
      } catch (e) { }

      const members = await this.getRoomMembers(roomId);
      this.io.to(roomId).emit("wp:update_members", members);
    });

    socket.on("wp:ban_user", async ({ roomId, userIdToBan }) => {
      const requesterId = socket.data.user.id;
      
      try {
        const { watchPartyService } = require('./watch-party.service');
        await watchPartyService.banUser(requesterId, userIdToBan, roomId);
        this.io.to(roomId).emit("wp:banned", { userId: userIdToBan });

        const userSocketIds = this.userSockets.get(userIdToBan);
        if (userSocketIds) {
          userSocketIds.forEach((sid) => {
            const s = this.io.sockets.sockets.get(sid);
            if (s) {
              s.leave(roomId);
              s.emit("wp:system_message", { text: "Bạn đã bị cấm khỏi phòng này.", type: "error" });
            }
          });
        }

        // 4. Cập nhật danh sách thành viên cho những người còn lại
        const members = await this.getRoomMembers(roomId);
        this.io.to(roomId).emit("wp:update_members", members);
      } catch (error: any) {
        socket.emit("wp:system_message", { 
          text: error.message === "NOT_AUTHORIZED" ? "Bạn không có quyền ban thành viên." : "Lỗi khi thực hiện cấm người dùng.",
          type: "error" 
        });
      }
    });

    socket.on("wp:mute_user", async ({ roomId, userIdToMute, mute }) => {
      const hostId = socket.data.user.id;
      
      try {
        const { watchPartyService } = require('./watch-party.service');
        await watchPartyService.muteUser(hostId, userIdToMute, roomId, mute);

        const targetSockets = this.userSockets.get(userIdToMute);
        if (targetSockets) {
          this.io.to([...targetSockets]).emit("wp:muted_status", { isMuted: mute });
        }

        const members = await this.getRoomMembers(roomId);
        this.io.to(roomId).emit("wp:update_members", members);
      } catch (error: any) {
        socket.emit("wp:system_message", { 
          text: error.message === "NOT_AUTHORIZED" ? "Bạn không có quyền thực hiện." : "Lỗi khi tắt tiếng.",
          type: "error" 
        });
      }
    });

    socket.on("wp:transfer_host", async ({ roomId, newHostId }) => {
      const currentHostId = socket.data.user.id;
      if (!(await this.verifyHost(roomId, currentHostId))) return;

      try {
        await this.prisma.$transaction(
          async (tx) => {
            await tx.watchParty.update({
              where: { id: roomId },
              data: { host_user_id: newHostId },
            });
            await tx.watchPartyMember.update({
              where: {
                party_id_user_id: { party_id: roomId, user_id: currentHostId },
              },
              data: { role: "participant" },
            });
            await tx.watchPartyMember.update({
              where: {
                party_id_user_id: { party_id: roomId, user_id: newHostId },
              },
              data: { role: "host" },
            });
          },
          { timeout: 20000 },
        );

        this.io.to(roomId).emit("wp:host_transferred", { newHostId });

        const members = await this.getRoomMembers(roomId);
        this.io.to(roomId).emit("wp:update_members", members);
      } catch (e) { }
    });

    // 9. Kết thúc phòng
    socket.on("wp:end_room", async (roomId) => {
      const userId = socket.data.user.id;
      if (!(await this.verifyHost(roomId, userId))) return;
      await this.endRoom(roomId);
    });
  }

  public async endRoom(roomId: string) {
    try {
      await this.prisma.watchParty.update({
        where: { id: roomId },
        data: { is_active: false },
      });
      this.io.to(roomId).emit("wp:room_ended");
    } catch (error) {
      console.error("Error in endRoom WebSocket:", error);
    }
  }

  public async banUser(userId: string, roomId: string) {
    try {
      this.io.to(roomId).emit("wp:banned", { userId });

      const userSocketIds = this.userSockets.get(userId);
      if (userSocketIds) {
        userSocketIds.forEach((sid) => {
          const s = this.io.sockets.sockets.get(sid);
          if (s) {
            s.leave(roomId);
            s.emit("wp:system_message", { text: "Bạn đã bị Admin cấm khỏi phòng này.", type: "error" });
          }
        });
      }

      const members = await this.getRoomMembers(roomId);
      this.io.to(roomId).emit("wp:update_members", members);
      
      console.log(`🚫 User ${userId} has been banned from room ${roomId} via API.`);
    } catch (error) {
      console.error("Error in banUser WebSocket:", error);
    }
  }

  public async muteUser(userId: string, roomId: string, isMuted: boolean) {
    try {
      const targetSockets = this.userSockets.get(userId);
      if (targetSockets) {
        this.io.to([...targetSockets]).emit("wp:muted_status", { isMuted });
      }
      const members = await this.getRoomMembers(roomId);
      this.io.to(roomId).emit("wp:update_members", members);
      
      console.log(`🔇 User ${userId} has been ${isMuted ? 'muted' : 'unmuted'} in room ${roomId} via API.`);
    } catch (error) {
      console.error("Error in muteUser WebSocket:", error);
    }
  }

  public async deleteMessage(messageId: string, roomId: string) {
    try {
      this.io.to(roomId).emit('wp:message_deleted', { messageId });
      console.log(`🗑️ Message ${messageId} deleted from room ${roomId}`);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }

  public async releaseMessage(message: any, roomId: string) {
    try {
      this.io.to(roomId).emit("wp:new_message", {
        id: message.id,
        userId: message.user_id,
        username: message.user?.username || "Unknown",
        avatar: message.user?.avatar_url,
        message: message.message,
        isSpoiler: message.is_spoiler,
        createdAt: message.created_at,
      });
      console.log(`✅ Message ${message.id} released to room ${roomId}`);
    } catch (error) {
      console.error("Error releasing message:", error);
    }
  }

  // --- XỬ LÝ NOTIFICATION EVENTS ---
  private handleSocketEvents(socket: any): void {
    const userId = socket.data.user.id;

    socket.on("notification:mark-read", async (notificationId: string) => {
      try {
        await this.prisma.notification.updateMany({
          where: { id: notificationId, user_id: userId, is_read: false },
          data: { is_read: true },
        });
        this.sendUnreadCount(userId);
        socket.emit("notification:marked-read", { notificationId });
      } catch (error) {
        socket.emit("notification:error", {
          message: "Failed to mark as read",
        });
      }
    });

    socket.on("notification:mark-all-read", async () => {
      try {
        await this.prisma.notification.updateMany({
          where: { user_id: userId, is_read: false, is_deleted: false },
          data: { is_read: true },
        });
        this.sendUnreadCount(userId);
        socket.emit("notification:all-marked-read");
      } catch (error) {
        socket.emit("notification:error", {
          message: "Failed to mark all as read",
        });
      }
    });

    socket.on("notification:get-latest", async (limit: number = 5) => {
      try {
        const notifications = await this.prisma.notification.findMany({
          where: { user_id: userId, is_deleted: false },
          orderBy: { created_at: "desc" },
          take: limit,
        });
        socket.emit("notification:latest", notifications);
      } catch (error) {
        socket.emit("notification:error", {
          message: "Failed to fetch notifications",
        });
      }
    });
  }

  // --- CÁC HÀM TIỆN ÍCH NOTIFICATION  ---
  async sendNotificationToUser(
    userId: string,
    notification: any,
  ): Promise<void> {
    this.io.to(`user:${userId}`).emit("notification:new", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      actionUrl: notification.action_url,
      createdAt: notification.created_at,
    });
    await this.sendUnreadCount(userId);
  }

  async sendNotificationToUsers(
    userIds: string[],
    notification: any,
  ): Promise<void> {
    const notificationData = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      actionUrl: notification.action_url,
      createdAt: notification.created_at,
    };

    userIds.forEach((userId) => {
      this.io.to(`user:${userId}`).emit("notification:new", notificationData);
    });
    await Promise.all(userIds.map((userId) => this.sendUnreadCount(userId)));
  }

  async broadcastSystemNotification(notification: any): Promise<void> {
    this.io.emit("notification:system", {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: new Date(),
    });
  }

  private async sendUnreadCount(userId: string): Promise<void> {
    try {
      const unreadCount = await this.prisma.notification.count({
        where: { user_id: userId, is_read: false, is_deleted: false },
      });
      this.io
        .to(`user:${userId}`)
        .emit("notification:unread-count", { count: unreadCount });
    } catch (error) {
      console.error("Error sending unread count:", error);
    }
  }

  isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
    );
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  getOnlineUserCount(): number {
    return this.userSockets.size;
  }
}
