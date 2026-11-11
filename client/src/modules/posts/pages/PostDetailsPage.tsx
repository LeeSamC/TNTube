import { useState } from "react";
import {Link, useParams} from 'react-router-dom'
import {z} from 'zod'
import { PostMeta } from "../components/PostPresentation";
import { ApiError } from "../../../libs/api";
import { useGetPost } from "../hooks/usePosts"; 

function PostVideo({url}: {url: string}) {
    const [failed, setFailed] = useState(false)
    const source = URL.canParse(url) ? new URL(url) : null
    const playable = source && ['http:', 'https:'].includes(source.protocol) && !source.username && !source.password

    if(!playable || failed) {
        return (
            <p role="status" className="mb-5 rounded-xl bg-(--panel) p-5">
                {failed ? 'Could not play this video' : 'This video is unavailable'}
            </p>
        )
    }

    return (
        <video
            src={source.href}
            controls
            preload='metadata'
            onError={() => setFailed(true)}
            className="mb-5 aspect-video w-full rounded-xl bg-black object-contain"
        />
    )
}

export default function PostDetailPage() {
    const {postId} = useParams()
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
                        <PostVideo key={post.media.url} url={post.media.url} />
                    )}
                    <h1 className="tube-title wrap-break-word text-3xl font-bold">{post.title}</h1>
                    <PostMeta username={post.username} createdAt={post.createdAt} />
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