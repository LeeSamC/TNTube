import { api } from "../../libs/api";

type UploadVideoResponse = {
    message: string
    media: {mediaId: string}
}

export function uploadVideo(file: File) {
    const body = new FormData()

    body.append('video', file)

    return api<UploadVideoResponse>('/media/video', {
        method: 'POST',
        body,
    })
}