import {useState} from 'react'
import { PlayerArtwork } from './PostPresentation'

type VideoThumbnailProps = {
    url: string
}

export default function VideoThumbnail({url}: VideoThumbnailProps) {
    const [ready, setReady] = useState(false)
    const [failed, setFailed] = useState(false)

    const source = URL.canParse(url) ? new URL(url) : null

    const validSource = 
        source &&
        ['http:', 'https:'].includes(source.protocol) &&
        !source.username &&
        !source.password

    if(!validSource || failed) {
        return <PlayerArtwork/>
    }

    return (
        <div className='relative h-full w-full'>
            {!ready && (
                <div className='absolute inset-0'>
                    <PlayerArtwork/>
                </div>
            )}

            <video
                src={source.href}
                muted
                playsInline
                preload='metadata'
                controls={false}
                disablePictureInPicture
                tabIndex={-1}
                aria-hidden='true'
                onLoadedMetadata={event => {
                    const video =event.currentTarget


                    // Choose a frame near the beginning.
                    // For very short videos, use their midpoint.
                    const frameTime = 
                        Number.isFinite(video.duration) &&
                        video.duration > 0
                            ? Math.min(1, video.duration / 2)
                            : 0

                    try{
                        video.currentTime = frameTime
                    }catch {
                        setFailed(true)
                    }
                }}

                onLoadedData={event => {
                    if(!event.currentTarget.seeking) {
                        setReady(true)
                    }
                }}
                onSeeked={() => setReady(true)}
                onError={() => setFailed(true)}
                className={[
                    'pointer-events-none absolute inset-0',
                    'h-full w-full bg-black object-cover',
                    ready ? 'opacity-100' : 'opacity-0',
                ].join(' ')}
            />
        </div>
    )
}