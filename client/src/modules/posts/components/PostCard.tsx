import type {Post} from '../posts.api'
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PlayerArtwork, PostMeta } from './PostPresentation'

export function PostCard({post}: {post: Post}) {
    const titleId = `post-${post.postId}`

    return (
        <article>
            <Link to={`/posts/${post.postId}`} aria-labelledby={titleId} className="group block rounded-xl">
                <div className='aspect-video overflow-hidden rounded-xl border border-(--line) bg-(--panel) group-hover:border-(--control)'>
                    {post.media?.type === 'video' ? (
                        <PlayerArtwork />
                    ): (
                        <div className='flex h-full flex-col justify-center gap-2 p-4 md:p-6'>
                            <FileText size={20} aria-hidden='true' className='text-(--muted)' />
                            <p className='line-clamp-3 wrap-break-word text-sm'>
                                {post.description?.trim() || 'Text post'}
                            </p>
                        </div>
                    )}
                </div>
                <h2 id={titleId} className='tube-title mt-3 wrap-break-word text-lg font-semibold group-hover:underline'>
                    {post.title}
                </h2>
            </Link>
            <PostMeta username={post.username} createdAt={post.createdAt}/>
        </article>
    )
}