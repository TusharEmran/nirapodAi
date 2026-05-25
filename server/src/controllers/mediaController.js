const cloudinary = require('cloudinary').v2;

function readCloudinaryConfig() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary credentials are not set');
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });
}

function uploadBuffer(buffer, folder) {
    readCloudinaryConfig();

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: folder || 'nirapodai',
                resource_type: 'image',
                transformation: [{ quality: 'auto', fetch_format: 'auto' }],
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            },
        );

        stream.end(buffer);
    });
}

async function uploadMedia(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'A file is required' });
        }

        const folder = String(req.body.folder || 'nirapodai').trim();
        const result = await uploadBuffer(req.file.buffer, folder);

        return res.status(200).json({
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    uploadMedia,
};