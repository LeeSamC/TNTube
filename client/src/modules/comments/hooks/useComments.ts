import {useQuery, useMutation, useQueryClient, skipToken, type QueryClient} from "@tanstack/react-query"
import {
    addComment,
    deleteComment,
    editComment,
    getComments,
    type AddCommentInput,
    type EditCommentInput
} from "../comments.api"
import {PostKeys} from "../../posts/hooks/usePosts"

export const CommentKeys = {
    all: ['comments'] as const,
    list: (postId: string | undefined) =>
        [...CommentKeys.all, 'list', postId] as const
}

async function invalidateCommentsAndPosts(queryClient: QueryClient, postId: string) {
    await Promise.all([
        queryClient.invalidateQueries({queryKey: CommentKeys.list(postId)}),
        queryClient.invalidateQueries({queryKey: PostKeys.lists()}),
        queryClient.invalidateQueries({queryKey: PostKeys.detail(postId)})
    ])
}

export function useGetComments(postId: string | undefined) {
    return useQuery({
        queryKey: CommentKeys.list(postId),
        queryFn: postId ? () => getComments(postId) : skipToken
    })
}

export function useAddComment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({postId, data}: {postId: string; data: AddCommentInput}) =>
            addComment(postId, data),
        onSuccess: (_result, {postId}) => invalidateCommentsAndPosts(queryClient, postId)
    })
}

export function useEditComment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({commentId, data}: {commentId: string; data: EditCommentInput}) =>
            editComment(commentId, data),
        onSuccess: ({comment}) =>
            queryClient.invalidateQueries({queryKey: CommentKeys.list(comment.postId)})
    })
}

export function useDeleteComment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({commentId}: {postId: string; commentId: string}) =>
            deleteComment(commentId),
        onSuccess: (_result, {postId}) => invalidateCommentsAndPosts(queryClient, postId)
    })
}
