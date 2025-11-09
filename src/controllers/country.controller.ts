import { Request, Response } from 'express';
import { prisma } from "../lib/prisma";


export const countryController = {

  getAllCountries: async (req: Request, res: Response) => {
    try {
      const countries = await prisma.country.findMany(); 
      
      res.status(200).json(countries);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  },
};