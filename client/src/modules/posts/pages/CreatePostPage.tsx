import {useEffect, useRef, useState, type DragEvent, type SyntheticEvent} from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'

import { uploadVideo } from '../../media/media.api'
import { useCreatePost } from '../hooks/usePosts'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024

export default function CreatePostPage() {
    const navigate = useNavigate()
    const createPost = useCreatePost()

    const fileInput = useRef<HTMLInputElement>(null)
    const videoPreview = useRef<HTMLVideoElement>(null)

    const uploadedMediaId = useRef<string | null>(null)

    const submitting = useRef(false)

    const [file, setFile] = useState<File | null>(null)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [dragging, setDragging] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [previewError, setPreviewError] = useState(false)

    const busy = uploading || createPost.isPending

    useEffect(() => {
        const video = videoPreview.current

        if(!file || !video) return

        const url = URL.createObjectURL(file)
        video.src = url

        return () => {
            video.pause()
            video.removeAttribute('src')
            video.load()
            URL.revokeObjectURL(url)
        }
    }, [file])

    function selectVideo(selected: File) {
        if(submitting.current) return

        setError(null)

        const allowedExtension = /\.(mp4|webm)$/i.test(
            selected.name
        )

        if(!allowedExtension){
            setError('Choose an MP4 or WebM video')
            return
        }

        if(selected.size === 0){
            setError('The selected file is empty')
            return
        }

        if(selected.size > MAX_VIDEO_SIZE){
            setError('The video must be no longer than 100 MiB')
            return
        }

        uploadedMediaId.current = null
        setPreviewError(false)
        setFile(selected)
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault()
        setDragging(false)

        if(submitting.current) return

        const files = event.dataTransfer.files

        if(files.length !== 1) {
            setError('Drop exactly one video')
            return
        }

        selectVideo(files[0])
    }

    async function handleSubmit(event: SyntheticEvent<HTMLFormElement>){
        event.preventDefault()

        if(submitting.current) return

        setError(null)

        const cleanTitle = title.trim()
        const cleanDescription = description.trim()

        if(!file){
            setError('Choose a video before uploading')
            return
        }

        if(!cleanTitle || cleanTitle.length > 100) {
            setError('Enter a title between 1 and 100 characters')
            return
        }

        if(cleanDescription.length > 5000){
            setError('The description cannot exceed 5,000 characters')
            return
        }

        submitting.current = true

        try{
            let mediaId = uploadedMediaId.current

            if(!mediaId) {
                setUploading(true)

                const result = await uploadVideo(file)

                mediaId = result.media.mediaId
                uploadedMediaId.current = mediaId
            }

            setUploading(false)

            const result = await createPost.mutateAsync({
                title: cleanTitle,
                description: cleanDescription || undefined,
                mediaId
            })

            navigate(
                result.post
                    ? `/posts/${result.post.postId}`
                    : `/`,
                {replace: true}
            )
        }catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'Could not publish your post'
            )
        }finally {
            submitting.current = false
            setUploading(false)
        }
    }

    const fieldClass = 
        'w-full rounded-lg border border-(--control) ' +
        'bg-(--canvas) px-3 py-2.5'

    return (
        <main className='mx-auto max-w-3xl'>
            <h1 className='tube-title text-3xl font-bold'>
                Create a post
            </h1>

            <p className='mt-2 text-(--muted)'>
                Choose a video, add its details, and publish
            </p>

            <form
                onSubmit={handleSubmit}
                aria-busy={busy}
                className='mt-6'
            >

                <fieldset
                    disabled={busy}
                    className='min-w-0 space-y-6'
                >
                    <legend className='sr-only'>
                        Video and post details
                    </legend>

                    <div
                        onDragOver={event => {
                            event.preventDefault()

                            if(!submitting.current) {
                                setDragging(true)
                            }
                        }}

                        onDragLeave={event => {
                            const target = event.relatedTarget

                            if(!(target instanceof Node) || !event.currentTarget.contains(target)) {
                                setDragging(false)
                            }
                        }}
                        onDrop={handleDrop}
                        className={[
                            'rounded-xl border-2 border-dashed p-8',
                            'text-center transition-colors',
                            dragging
                                ? 'border-(--text) bg-(--inset)'
                                : 'border-(--control) bg-(--panel)',
                        ].join(' ')}
                    >
                        <Upload
                            size={32}
                            aria-hidden='true'
                            className='mx-auto'
                        />

                        <p className='mt-3 font-semibold'>
                            Drag and drop your video here
                        </p>

                        <p
                            id='video-help'
                            className='mt-1 text-sm text-(--muted)'
                        >
                            One MP4 or WebM file, up to 100 MiB
                        </p>

                        <input 
                            ref={fileInput}
                            type='file'
                            accept='.mp4, .webm, video/mp4, video/webm'
                            aria-label='Choose a video'
                            hidden
                            onChange={event => {
                                const selected = event.currentTarget.files?.[0]

                                if(selected) {
                                    selectVideo(selected)
                                }

                                event.currentTarget.value = ''
                            }} 
                        />

                        <button
                            type='button'
                            aria-describedby='video-help'
                            onClick={() => fileInput.current?.click()}
                            className={[
                                'mt-4 inline-flex min-h-11 items-center',
                                'rounded-lg bg-(--text) px-4',
                                'font-semibold text-(--canvas)',
                                'cursor-pointer disabled:opacity-50',
                            ].join(' ')}
                        >
                            {file ? 'Choose another video' : 'Select video'}
                        </button>

                    </div>

                    {file && (
                        <section aria-label='Selected video'>
                            <p className='wrap-break-word font-medium'>
                                {file.name}
                            </p>

                            <p className='mt-1 text-sm text-(--muted)'>
                                {(file.size / (1024 * 1024)).toFixed(1)} MiB
                            </p>

                            <video
                                ref={videoPreview}
                                controls
                                playsInline
                                preload='metadata'
                                aria-label='Selected video preview'
                                onError={() => setPreviewError(true)}
                                className={[
                                    'mt-3 max-h-96 w-full rounded-xl',
                                    'bg-black',
                                ].join(' ')}
                            />

                            {previewError && (
                                <p
                                    role='status'
                                    className='mt-2 text-sm text-(--muted)'
                                >
                                    Your browser could not preview this
                                    video. Playback dependson its codec 
                                </p>
                            )}
                        </section>
                    )}

                    <div>
                        <label
                            htmlFor='post-title'
                            className='mb-2 block font-semibold'
                        >
                            Title
                            <span className='ml-2 text-sm text-(--muted)'>
                                Required
                            </span>
                        </label>

                        <input
                            id='post-title'
                            name='title'
                            type='text'
                            required
                            maxLength={100}
                            value={title}
                            onChange={event => {
                                setTitle(event.currentTarget.value)
                            }}
                            placeholder='Give your video a title'
                            aria-describedby='title-count'
                            className={fieldClass}
                        />

                        <p
                            id='title-count'
                            className='mt-1 text-right text-sm text-(--muted)'
                        >
                            {title.length} / 100
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor='post-description'
                            className='mb-2 block font-semibold'
                        >
                            Desciption
                            <span className='ml-2 text-sm text-(--muted)'>
                                Optional
                            </span>
                        </label>

                        <textarea
                            id='post-description'
                            name='description'
                            rows={6}
                            maxLength={5000}
                            value={description}
                            onChange={event => {
                                setDescription(event.currentTarget.value)
                            }}
                            placeholder='Tell viewers about your video'
                            aria-describedby='description-count'
                            className={`${fieldClass} resize-y`}
                        />

                        <p
                            id="description-count"
                            className="mt-1 text-right text-sm text-(--muted)"
                        >   
                            {description.length}/5000
                        </p>
                        
                    </div>

                    {error && (
                        <p role='alert' className='text-sm text-red-200'>
                            {error}
                        </p>
                    )}

                    <div className='flex flex-wrap justify-end gap-3'>
                        <button
                            type='button'
                            onClick={() => navigate('/')}
                            className={[
                                'min-h-11 cursor-pointer rounded-lg',
                                'border border-(--control) px-4',
                                'disabled:opacity-50',
                            ].join(' ')}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={!file || !title.trim() || busy}
                            className={[
                                'min-h-11 cursor-pointer rounded-lg',
                                'bg-(--text) px-5 font-semibold',
                                'text-(--canvas) disabled:opacity-50',
                            ].join(' ')}
                        >
                            {uploading
                                ? 'Uploading video...'
                                : createPost.isPending
                                  ? 'Publishing...'
                                  : 'Publish post'}
                        </button>
                    </div>

                </fieldset>

            </form>
        </main>
    )
}