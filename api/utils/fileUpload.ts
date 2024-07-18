import cloudinary from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import path from 'path';

dotenv.config();

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudStorage = new CloudinaryStorage({
    cloudinary: cloudinary.v2,
    params: async (req, file) => {
        return {
            folder: 'chat-app',
            public_id: file.fieldname + '-' + Date.now(),
        };
    }
});

const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})

const storage = process.env.NODE_ENV === 'production' ? cloudStorage : localStorage;

const parser = multer({ storage })



class FileUploadService {
    getMulterMiddleware() {
        return parser.single('picture');
    }
}

export default FileUploadService;