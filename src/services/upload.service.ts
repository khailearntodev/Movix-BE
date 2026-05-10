import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config/cloudinary.config';

export const UploadService = {
  uploadImage: async (fileBuffer: Buffer, folderName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderName,
          resource_type: 'auto',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) return reject(error);
          if (result) return resolve(result.secure_url);
          return reject(new Error('Cloudinary upload failed without a result'));
        }
      );
      uploadStream.end(fileBuffer);
    });
  },

  uploadMultipleImages: async (fileBuffers: Buffer[], folderName: string): Promise<string[]> => {
    const uploadPromises = fileBuffers.map(buffer => 
      UploadService.uploadImage(buffer, folderName)
    );
    return Promise.all(uploadPromises);
  }
};