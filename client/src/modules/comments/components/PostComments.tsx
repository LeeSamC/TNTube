import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";

import type { CommentWithReplies } from "../comments.api";
import { useAddComment, useGetComments } from "../hooks/useComments";
import { useAuthStore } from "../../../stores/auth.store";

function CommentForm({
    postId,
    parentCommentId = null,
    onSuccess,
    onCancel
}: {
    postId: string
    parentCommentId?: string | null
    onSuccess?: () => void
    onCancel?: () => void
}) {
    const inputId = useId()
    const [content, setContent] = useState('')
    const [error, setError] = useState<string | null>(null)
    const submitting = useRef(false)
    const addComment = useAddComment()

    async function submit() {
        const trimmed = content.trim()

        if(submitting.current || addComment.isPending) return

        if(!trimmed || trimmed.length > 2000){
            setError('Write a comment between 1 and 2000 characters')
            return
        }

        submitting.current = true
        setError(null)

        try{
            await addComment.mutateAsync({
                postId,
                data: {
                    content: trimmed,
                    parentCommentId
                }
            })

            setContent('')
            onSuccess?.()
        }catch (error){
            setError(
                error instanceof Error
                    ? error.message
                    : 'Could not publish your comment'
            )
        }finally {
            submitting.current = false
        }
    }

    return (
        <form
            onSubmit={event => {
                event.preventDefault()
                void submit()
            }}
            aria-busy={addComment.isPending}
            className="space-y-3"
        >
            <label htmlFor={inputId} className="block text-sm font-semibold">
                {parentCommentId ? 'Write a reply' : 'Add a comment'}
            </label>

            <textarea
                id={inputId}
                value={content}
                onChange={event => setContent(event.target.value)}
                maxLength={2000}
                required
                rows={3}
                disabled={addComment.isPending}
                className="block w-full resize-y rounded-lg border border-(--line) bg-(--panel) p-3 text-sm disabled:opacity-50"
            />

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="submit"
                    disabled={addComment.isPending || !content.trim()}
                    className="cursor-pointer rounded-lg bg-(--text) px-4 py-2 text-sm font-semibold text-(--canvas) disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {addComment.isPending
                        ? 'Publishing...'
                        : parentCommentId
                            ? 'Reply'
                            : 'Comment'
                    }
                </button>

                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={addComment.isPending}
                        className="cursor-pointer text-sm underline disabled:opacity-50"
                    >
                        Cancel
                    </button>
                )}

                <span className="text-xs text-(--muted)">
                    {content.length}/2000
                </span>
            </div>

            {error && (
                <p role="alert" className="text-sm text-red-200">
                    {error}
                </p>
            )}

               

        </form>
    )
}

function CommentItem({
    comment,
    canReply,
    depth = 0
}: {
    comment: CommentWithReplies
    canReply: boolean
    depth?: number

}) {
    const [replying, setReplying] = useState(false)

    return (
        <li>
            <article className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-semibold break-all">
                        @{comment.username}
                    </span>

                    <time 
                        dateTime={comment.createdAt}
                        className="text-xs text-(--muted)"   
                    >
                        {new Date(comment.createdAt).toLocaleDateString(
                            undefined,
                            {dateStyle: 'medium'},
                        )}
                    </time>
                </div>

                <p className="mt-2 whitespace-pre-wrap wrap-break-word">
                    {comment.content}
                </p>

                {canReply && !replying && (
                    <button
                        type="button"
                        onClick={() => setReplying(true)}
                        className="mt-2 cursor-pointer text-sm text-(--muted) underline"
                    >
                        Reply
                    </button>
                )}

                {canReply && replying && (
                    <div className="mt-3">
                        <CommentForm
                            postId={comment.postId}
                            parentCommentId={comment.commentId}
                            onSuccess={() => setReplying(false)}
                            onCancel={() => setReplying(false)}
                        />
                    </div>
                )}
            </article>

            {comment.replies.length > 0 && (
                <ul
                    className={
                        depth < 3
                            ? 'mt-4 space-y-4 border-l border-(--line) pl-4'
                            : 'mt-4 space-y-4'
                    }
                >
                    {comment.replies.map(reply => (
                        <CommentItem
                            key={reply.commentId}
                            comment={reply}
                            canReply={canReply}
                            depth={depth + 1} 
                        />
                    ))}

                </ul>
            )}
        </li>
    )
}

export default function PostComments({postId}: {postId: string}) {
    const viewerId = useAuthStore(state => state.user?.userId ?? null)
    const comments = useGetComments(postId)

    return (
        <section className="mt-8 border-t border-(--line) pt-6">
            <h2 className="tube-title mb-5 text-2xl font-bold">
                Comments
            </h2>

            <div key={viewerId ?? 'guest'}>
                {viewerId ? (
                    <CommentForm postId={postId} />
                ): (
                    <p className="text-sm text-(--muted)">
                        <Link to="/login" className="underline">
                            Sign in
                        </Link>
                        {' '}to leave a comment
                    </p>
                )}

                {comments.isPending && (
                    <p role="status" className="mt-6 text-sm text-(--muted)">
                        Loading comments...
                    </p>
                )}

                {comments.isError && (
                    <div className="mt-6 text-sm">
                        <p role="alert">Could not load comments</p>

                        <button
                            type="button"
                            onClick={() => void comments.refetch()}
                            disabled={comments.isFetched}
                            className="mt-2 cursor-pointer underline disabled:opacity-50"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {comments.data?.comments.length === 0 && (
                    <p className="mt-6 text-sm text-(--muted)">
                        No comments yet. Start the conversation
                    </p>
                )}

                {comments.data && (
                    <ul className="mt-6 space-y-6">
                        {comments.data.comments.map(comment => (
                            <CommentItem
                                key={comment.commentId}
                                comment={comment}
                                canReply={viewerId !== null}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </section>
    )
}