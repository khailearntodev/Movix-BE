import { Request, Response } from 'express';
import * as recommendService from '../services/recommend.service';

export const recommendController = {
  trainModel: async (req: Request, res: Response) => {
    try {
      const result = await recommendService.triggerTraining();
      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to trigger training' });
    }
  }
};
