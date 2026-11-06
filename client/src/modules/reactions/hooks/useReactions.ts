import {useQuery, useMutation, useQueryClient, skipToken, type QueryClient} from "@tanstack/react-query"
import {useAuthStore} from "../../../stores/auth.store"
import {PostKeys} from "../../posts/hooks/usePosts"
import {deleteReaction, getReaction, saveReaction, type ReactionType} from "../reactions.api"

export const ReactionKeys = {
    all: ['reactions'] as const,
    detail: (postId: string | undefined) =>
        [...ReactionKeys.all, 'detail', postId] as const
}

async function invalidateReactionQueries(queryClient: QueryClient, postId: string) {
    await Promise.all([
        queryClient.invalidateQueries({queryKey: ReactionKeys.detail(postId)}),
        queryClient.invalidateQueries({queryKey: PostKeys.lists()}),
        queryClient.invalidateQueries({queryKey: PostKeys.detail(postId)})
    ])
}

export function useGetReaction(postId: string | undefined) {
    const viewerId = useAuthStore(state => state.isInitialized ? state.user?.userId : undefined)

    return useQuery({
        queryKey: [...ReactionKeys.detail(postId), viewerId] as const,
        queryFn: viewerId && postId ? () => getReaction(postId) : skipToken
    })
}

export function useSaveReaction() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({postId, data}: {postId: string; data: {type: ReactionType}}) =>
            saveReaction(postId, data),
        onSuccess: (_result, {postId}) => invalidateReactionQueries(queryClient, postId)
    })
}

export function useDeleteReaction() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteReaction,
        onSuccess: (_result, postId) => invalidateReactionQueries(queryClient, postId)
    })
}
