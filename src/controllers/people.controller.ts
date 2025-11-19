import { Request, Response } from 'express';
import * as personService from '../services/people.service';

export const personController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const query = req.query.q as string | undefined;
      const role = req.query.role as string | undefined; // 'actor', 'director' hoặc 'all'

      const result = await personService.getAllPeople(page, limit, query, role);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting people:', error);
      res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách nghệ sĩ' });
    }
  },
  getDetail: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Thiếu ID nghệ sĩ' });
      }

      const person = await personService.getPersonDetail(id);
      res.status(200).json(person);
    } catch (error: any) {
      if (error.message === 'PERSON_NOT_FOUND') {
        return res.status(404).json({ message: 'Không tìm thấy nghệ sĩ này' });
      }
      console.error('Error getting person detail:', error);
      res.status(500).json({ message: 'Lỗi máy chủ khi lấy thông tin chi tiết' });
    }
  },
};