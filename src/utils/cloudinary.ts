import multer from 'multer';
import cloudinary from 'cloudinary';

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryService {
    static upload = multer({ dest: 'uploads/' });

    static async uploadImage(file: Express.Multer.File) {
        try {
            const result = await cloudinary.v2.uploader.upload(file.path);
            return result.secure_url;
        } catch (error) {
            throw new Error('Error uploading image');
        }
    }

    static async deleteImage(publicId: string) {
        try {
            await cloudinary.v2.uploader.destroy(publicId);
        } catch (error) {
            throw new Error('Error deleting image');
        }
    }
}

export default CloudinaryService;