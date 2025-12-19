import { Request, Response } from 'express';
import * as personService from '../services/people.service';

export const personController = {
  // 1. Lấy danh sách
  getAll: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const query = (req.query.q || req.query.search) as string | undefined;
            const role = (req.query.role || req.query.role_type) as string | undefined;

      const result = await personService.getAllPeople(page, limit, query, role);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting people:', error);
      res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách nghệ sĩ' });
    }
  },

  // 2. Lấy chi tiết
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

  // 3. Tạo nhân sự (Cho Admin)
  create: async (req: Request, res: Response) => {
    try {
      const newPerson = await personService.createPerson(req.body);
      res.status(201).json(newPerson);
    } catch (error) {
      console.error('Error creating person:', error);
      res.status(500).json({ message: 'Lỗi máy chủ khi tạo nhân sự mới' });
    }
  },

  // 4. Cập nhật nhân sự (Cho Admin)
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatedPerson = await personService.updatePerson(id, req.body);
      res.status(200).json(updatedPerson);
    } catch (error: any) {
      if (error.message === 'PERSON_NOT_FOUND') {
        return res.status(404).json({ message: 'Không tìm thấy nghệ sĩ để cập nhật' });
      }
      console.error('Error updating person:', error);
      res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật thông tin' });
    }
  },

  // 5. Xóa nhân sự (Cho Admin)
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await personService.deletePerson(id);
      res.status(200).json({ message: 'Đã xóa thành công' });
    } catch (error: any) {
      if (error.message === 'PERSON_NOT_FOUND') {
        return res.status(404).json({ message: 'Không tìm thấy nghệ sĩ để xóa' });
      }
      if (error.message === 'FOREIGN_KEY_CONSTRAINT') {
        return res.status(400).json({ 
          message: 'Không thể xóa vì nghệ sĩ này đang tham gia một hoặc nhiều bộ phim.' 
        });
      }
      console.error('Error deleting person:', error);
      res.status(500).json({ message: 'Lỗi máy chủ khi xóa nghệ sĩ' });
    }
  }
};