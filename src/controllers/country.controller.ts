import { Request, Response } from 'express';
// Đảm bảo import đúng instance prisma từ file lib
import { prisma } from "../lib/prisma";


export const countryController = {

  getAllCountries: async (req: Request, res: Response) => {
    try {
      // SỬA Ở ĐÂY: từ 'countries' -> 'country'
      const countries = await prisma.country.findMany(); 
      
      res.status(200).json(countries);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  },
  
};