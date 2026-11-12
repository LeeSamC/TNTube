import { Router, type ErrorRequestHandler } from "express";
import multer from 'multer'
import { randomUUID } from "node:crypto";
import {mkdirSync} from 'node:fs'
import {rename, rm} from 'node:fs/promises'
import path from 'node:path'

import { db } from "../../db";
import { media } from "../../db/schema";
import { authenticateAccessToken, type AuthenticateRequest } from "../../middleware/authenticateAccessToken";

const router = Router()

const MAX_VIDEO_SIZE = 100 * 1024 * 1024

export const uploadsDirectory = path.resolve(__dirname, '../../../uploads')

const temporaryDirectory = path.resolve(__dirname, '../../../upload-tmp')

mkdirSync(uploadsDirectory, {recursive: true})
mkdirSync(temporaryDirectory, {recursive: true})

class InvalidVideoError extends Error {}

const upload = multer({
    storage: multer.diskStorage({
        destination: temporaryDirectory,

        filename: (_req, _file, callback) => {
            callback(null, randomUUID())
        },
    }),

    limits: {
        fileSize: MAX_VIDEO_SIZE,
        files: 1,
        fields: 0,
        parts: 1
    },

    fileFilter: (_req, file, callback) => {
        if(!/\.(mp4|webm)$/i.test(file.originalname)) {
            callback(
                new InvalidVideoError('Choose an MP4 or WebM video'),
            )
            return
        }
        callback(null, true)
    }
})

router.post('/video', authenticateAccessToken, (req, res, next) => {
    const allowedOrigin = process.env.CLIENT_URL

    if(!allowedOrigin || req.get('origin') !== allowedOrigin) {
        res.status(403).json({message: 'Upload origin is not uploaded'})
        return
    }

    next()
},

upload.single('video'),

async (req: AuthenticateRequest, res) => {
    const file = req.file
    const userId = req.user?.userId

    if(!file) {
        return res.status(400).json({message:'Choose a video to upload'})
    }

    let storedPath = file.path

    try{
        if(!userId){
            await rm(storedPath, {force: true})

            return res.status(401).json({message: 'Authentication required'})
        }

        if(file.size === 0){
            throw new InvalidVideoError('The selected file is empty')
        }

        const {fileTypeFromFile} = await import('file-type')

        const detected = await fileTypeFromFile(file.path)
            .catch(() => undefined)

        const isMp4 = 
            detected?.ext === 'mp4' &&
            detected.mime === 'video/mp4'

        const isWebm = 
            detected?.ext === 'webm' &&
            detected.mime === 'video/webm'

        if(!detected || (!isMp4 && !isWebm)) {
            throw new InvalidVideoError('The file must contain a MP4 or WebM video')
        }

        const storageKey = `${randomUUID()}.${detected.ext}`
        const destination = path.join(uploadsDirectory, storageKey)

        await rename(file.path, destination)
        storedPath = destination

        const [uploadedMedia] = await db.insert(media).values({
            uploadedBy: userId,
            type: 'video',
            storageKey,
            mimeType: detected.mime,
        })
        .returning({
            mediaId: media.mediaId
        })

        return res.status(201).json({
            message: 'Video uploaded successfully',
            media: uploadedMedia,
        })

    } catch (error) {
        await rm(storedPath, {force: true})
            .catch(cleanupError => {
                console.error(
                    'Could not remove failed upload: ',
                    cleanupError
                )
            })

        if(error instanceof InvalidVideoError) {
            return res.status(400).json({message: error.message})
        }

        console.error('Video upload failed: ', error)

        return res.status(500).json({error: 'Could not upload video'})
    }
}
)

const handleUploadError: ErrorRequestHandler = (
    error: unknown,
    _req,
    res,
    _next
) => {
    if(error instanceof multer.MulterError) {
        const tooLarge = error.code === 'LIMIT_FILE_SIZE'

        res.status(tooLarge ? 413 : 400).json({
            message: tooLarge
                ? 'The video must be no larger than 100 MiB'
                : 'Upload exactly one video using the video field.'
        })

        return
    }

    if(error instanceof InvalidVideoError) {
        res.status(400).json({message: error.message})
        return
    }

    console.error('Upload middleware failed: ', error)

    res.status(500).json({message: 'Could not process the upload'})


}

router.use(handleUploadError)
export default router