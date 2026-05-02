import { EventEmitter } from 'events';
import redis from '../lib/redis';
import { getUserSubscription } from '../services/subscription.service';

export const USER_XP_BUFFER_KEY = 'gamification:user_xp_buffer';

export type GamificationAction = 'WATCH_MOVIE' | 'CREATE_COMMENT' | 'RATE_MOVIE';

export interface XpEventPayload {
  userId: string;
  action: GamificationAction;
  metadata?: any;
}

class GamificationEmitter extends EventEmitter {
  static getBaseXpForAction(action: GamificationAction, metadata?: any): number {
    switch (action) {
      case 'WATCH_MOVIE': {
        const minutes = metadata?.minutes || 0;
        return Math.floor(minutes * 1);
      }
      case 'CREATE_COMMENT':
        return 5;
      case 'RATE_MOVIE':
        return 2;
      default:
        return 0;
    }
  }
}

export const gamificationEmitter = new GamificationEmitter();

gamificationEmitter.on('USER_EARNED_XP', async (payload: XpEventPayload) => {
  try {
    const { userId, action, metadata } = payload;
    const baseXp = GamificationEmitter.getBaseXpForAction(action, metadata);

    if (baseXp <= 0) return;

    let multiplier = 1;
    try {
      const sub = await getUserSubscription(userId);
      if (sub && sub.status === 'ACTIVE') {
        multiplier = 1.5;
      }
    } catch (e) {
      console.warn('[Gamification] Could not get user subscription');
    }

    const totalXp = Math.floor(baseXp * multiplier);

    if (totalXp > 0) {
      await redis.hIncrBy(USER_XP_BUFFER_KEY, userId, totalXp);
    }
  } catch (error) {
    console.error('[GAMIFICATION EVENT ERROR]', error);
  }
});
