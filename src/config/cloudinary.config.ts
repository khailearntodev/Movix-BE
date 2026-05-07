import { v2 as cloudinary } from "cloudinary";
import multer, { Multer } from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const validateCloudinaryConfig = (): void => {
  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing Cloudinary config: ${missing.join(', ')}`);
  }
};

validateCloudinaryConfig();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'posts_images',
    allowed_formats: ALLOWED_FORMATS,
    resource_type: 'auto',
  } as any,
});

const uploadCloud: Multer = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    const mimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (mimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_FORMATS.join(', ')}`));
    }
  },
});

export default uploadCloud;