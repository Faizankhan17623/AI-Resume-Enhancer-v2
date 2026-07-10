const cloudinary = require('cloudinary').v2
const fs = require('fs')

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const uploadFile = async (path) => {
    try {
        const { size } = fs.statSync(path)
        if (size > MAX_FILE_SIZE) {
            fs.unlinkSync(path) 
            console.log('File exceeds the 10 MB limit')
            return null
        }

        const result = await cloudinary.uploader.upload(path, {
            resource_type: 'auto',
        })
        fs.unlinkSync(path) 
        return result.secure_url
    } catch (error) {
        if (fs.existsSync(path)) fs.unlinkSync(path) 
        console.log(error.message)
        return null
    }
}

module.exports = { uploadFile }
