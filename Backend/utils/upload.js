const cloudinary = require('cloudinary').v2
const logger = require('./logger')
const fs = require('fs')

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const uploadFile = async (path) => {
    try {
        const { size } = fs.statSync(path)
        if (size > MAX_FILE_SIZE) {
            fs.unlinkSync(path) 
            logger.info('File exceeds the 10 MB limit')
            return null
        }

        const result = await cloudinary.uploader.upload(path, {
            resource_type: 'auto',
        })
        fs.unlinkSync(path) 
        return result.secure_url
    } catch (error) {
        if (fs.existsSync(path)) fs.unlinkSync(path) 
        logger.error('upload file failed', { err: error })
        return null
    }
}

module.exports = { uploadFile }
