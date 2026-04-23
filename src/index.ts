import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import movieRouter from './routes/movie.routes';
import genreRouter from './routes/genre.routes';
import countryRouter from './routes/country.routes';
import authRoutes from './routes/auth.routes';
import userRouter from './routes/user.routes';
import interactionRoutes from './routes/interaction.routes';
import dashboardRoutes from './routes/dashboard.routes';
import homepageRouter from './routes/homepage.routes';
import commentRoutes from './routes/comment.routes';
import cookieParser from 'cookie-parser';
import personRoutes from './routes/people.routes';
import bannerRoutes from './routes/banner.routes';
import aiRoutes from './routes/ai.routes';
import recommendRouter from './routes/recommend.routes';
import historyRoutes from './routes/history.routes';
import { WebSocketService } from './services/websocket.service';
import { NotificationService } from './services/notification.service';
import { setNotificationService } from './utils/notify/notification.helper';
import notificationRoutes from './routes/notification.routes';
import watchPartyRoutes from './routes/watch-party.routes';
import subscriptionPlanRoutes from './routes/subscription-plan.routes';
import paymentRoutes from './routes/payment.routes';
import livekitRoutes from './routes/livekit.routes';
import adminSubscriptionRoutes from './routes/admin.subscription.routes';
import { startCronJobs } from './services/cron.service';
import adminTransactionRoutes from './routes/admin.transaction.routes';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 5000;

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

const webSocketService = new WebSocketService(server);
const notificationService = new NotificationService(webSocketService);
setNotificationService(notificationService);

app.locals.webSocketService = webSocketService;
app.locals.notificationService = notificationService;

app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profile', userRouter);
app.use('/api/interact', interactionRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/movies', movieRouter);
app.use('/api/genres', genreRouter);
app.use('/api/countries', countryRouter);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/homepage', homepageRouter);
app.use('/api/people', personRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/recommend', recommendRouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/watch-party', watchPartyRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin/transactions', adminTransactionRoutes);
app.use("/api/livekit", livekitRoutes);
app.use("/api/admin/subscriptions", adminSubscriptionRoutes);
app.get('/api', (req, res) => {
  res.send('Movix BE is running!');
});

app.get('/api/websocket/status', (req, res) => {
  res.json({
    success: true,
    data: {
      onlineUsers: webSocketService.getOnlineUserCount(),
      isConnected: true
    }
  });
});

startCronJobs();

server.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

export { webSocketService, notificationService };