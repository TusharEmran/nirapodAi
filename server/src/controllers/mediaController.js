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
                resource_type: 'auto',
                ...(String(folder || '').includes('profile') ? { transformation: [{ quality: 'auto', fetch_format: 'auto' }] } : {}),
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
        const isAudio = String(req.file.mimetype || '').startsWith('audio/');

        if (isAudio) {
            readCloudinaryConfig();

            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: folder || 'nirapodai',
                        resource_type: 'video',
                    },
                    (error, uploadResult) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        resolve(uploadResult);
                    },
                );

                stream.end(req.file.buffer);
            });

            const url = result?.secure_url;
            const publicId = result?.public_id;

            if (!url || !publicId) {
                return res.status(502).json({ success: false, message: 'Upload finished without a usable audio URL' });
            }

            return res.status(200).json({
                success: true,
                url,
                publicId,
            });
        }

        const result = await uploadBuffer(req.file.buffer, folder);
        const url = result?.secure_url;
        const publicId = result?.public_id;

        if (!url || !publicId) {
            return res.status(502).json({ success: false, message: 'Upload finished without a usable image URL' });
        }

        return res.status(200).json({
            success: true,
            url,
            publicId,
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    uploadMedia,
};
