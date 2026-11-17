import { useState, useRef } from "react";
import {Link, useParams} from 'react-router-dom'
import {z} from 'zod'
import { PostMeta } from "../components/PostPresentation";
import { ApiError } from "../../../libs/api";
import { useGetPost, useRecordPostView } from "../hooks/usePosts"; 

import PostActions from "../components/PostActions";
import { useAuthStore } from "../../../stores/auth.store";

function PostVideo({
    postId,
    url
}: {
    postId: string
    url: string
}) {
    const [failed, setFailed] = useState(false)
    const {mutate} = useRecordPostView()

    const tracking = useRef({
        watchedSeconds: 0,
        previousTime: null as number | null,
        previousWallTime: 0,
        submitting: false,
        submitted: false,
        retryAfter: 0
    })

    const source = URL.canParse(url) ? new URL(url) : null

    const playable = 
        source &&
        ['http:', 'https:'].includes(source.protocol) &&
        !source.username &&
        !source.password

    function resetSample() {
        tracking.current.previousTime    = null
    }

    function trackPlayback(video: HTMLVideoElement) {
        const state = tracking.current

        if(video.seeking || video.readyState < 3 || document.visibilityState !== 'visible'){
            resetSample()
            return
        }

        const now = performance.now()

        if(state.previousTime !== null) {
            const mediaDelta = video.currentTime - state.previousTime
            const wallDelta = (now - state.previousWallTime) / 1000
            const rate = Math.max(video.playbackRate, 0.01)

            if(mediaDelta > 0 && mediaDelta <= wallDelta * rate + 0.25) {
                state.watchedSeconds += Math.min(
                    wallDelta,
                    mediaDelta / rate
                )
            }
        }

        state.previousTime = video.currentTime
        state.previousWallTime = now

        if(!Number.isFinite(video.duration) || video.duration <= 0) {
            return
        }

        const threshold = Math.min(30, video.duration / 2)

        if(state.watchedSeconds < threshold || state.submitting || state.submitted || now < state.retryAfter){
            return
        }

        state.submitting = true

        mutate(postId, {
            onSuccess: () => {
                state.submitted = true
                state.submitting = false
            },
            onError: () => {
                state.submitting = false
                state.retryAfter = performance.now() + 10_000
            }
        })
    }

    if(!playable || failed) {
        return (
            <p role="status" className="mb-5 rounded-xl bg-(--panel) p-5">
                {failed
                    ? 'Could not play this video'
                    : 'This video is unavailable'}
            </p>
        )
    }

    return (
        <video
            src={source.href}
            controls
            preload="metadata"
            onPlaying={resetSample}
            onSeeking={resetSample}
            onSeeked={resetSample}
            onWaiting={resetSample}
            onTimeUpdate={event => {
                trackPlayback(event.currentTarget)
            }}
            onPause={event => {
                trackPlayback(event.currentTarget)
                resetSample()
            }}
            onEnded={event => {
                trackPlayback(event.currentTarget)
                resetSample()
            }}
            onError={() => {
                resetSample()
                setFailed(true)
            }}
            className="mb-5 aspect-video w-full rounded-xl bg-black object-contain"
        />
    )
}

export default function PostDetailPage() {
    const {postId} = useParams()
    const viewerId = useAuthStore(state => state.user?.userId ?? null)
    const id = z.guid().safeParse(postId)
    const {data, error, isPending, refetch} = useGetPost(id.data)
    const unavailable = !id.success || (error instanceof ApiError && error.status === 404)
    const post = data?.post

    return (
        <main className="mx-auto max-w-5xl">
            <Link to='/' className="mb-5 inline-block text-sm underline">Back to Home</Link>

            {unavailable ? (
                <h1 className="tube-title text-3xl font-bold">Post unavailable</h1>
            ): isPending ? (
                <p role="status">Loading post...</p>
            ): error ? (
                <div>
                    <p role='alert'>Could not load this post</p>
                    <button
                        type="button"
                        onClick={() => void refetch()}
                        className="mt-2 cursor-pointer underline"
                    >
                        Try again
                    </button>
                </div>
            ): post && (
                <article>
                    {post.media?.type === 'video' && (
                        <PostVideo
                            key={`${post.postId}-${post.media.url}-${viewerId ?? 'guest'}`}
                            postId={post.postId}
                            url={post.media.url} 
                        />
                    )}
                    <h1 className="tube-title wrap-break-word text-3xl font-bold">{post.title}</h1>
                    <PostMeta username={post.username} createdAt={post.createdAt} viewCount={post.viewCount} />
                    <PostActions 
                        key={`${post.postId}-${viewerId ?? 'guest'}`}
                        post={post}
                    />
                    {post.description?.trim() && (
                        <p className="mt-4 max-w-prose whitespace-pre-wrap wrap-break-word text-(--muted)">
                            {post.description}
                        </p>
                    )}
                </article>
            )}
        </main>
    )
}