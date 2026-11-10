import {useQuery, useMutation, useQueryClient, skipToken} from "@tanstack/react-query"
import { createPost, deletePost, editPost, getAllPosts, getPost, type UpdatePostInput } from "../posts.api"

import { useAuthStore } from "../../../stores/auth.store"

export const PostKeys = {
    all: ['posts'] as const,
    
    lists: () =>
        [...PostKeys.all, 'list'] as const,
    list: (page: number, limit: number, viewerId: string | null, term = '') =>
        [...PostKeys.lists(), viewerId, term, {page, limit}] as const,
    details: () => 
        [...PostKeys.all, 'detail'] as const,

    detail: (id: string | undefined) =>
        [...PostKeys.details(), id] as const 
}

export function useGetAllPosts(page = 1, limit = 10, term = '') {
    const viewerId = useAuthStore(state => state.user?.userId ?? null)
    const isInitialized = useAuthStore(state => state.isInitialized)

    return useQuery({
        queryKey: PostKeys.list(page, limit, viewerId, term),
        queryFn: isInitialized ? () => getAllPosts(page, limit, term) : skipToken,
        placeholderData: (previousData, previousQuery) =>
            previousQuery?.queryKey[2] === viewerId ? previousData : undefined
    })
}


export function useGetPost(id: string | undefined) {
    const viewerId = useAuthStore(state => state.user?.userId)
    const isInitialized = useAuthStore(state => state.isInitialized)

    return useQuery({
        queryKey: [...PostKeys.detail(id), viewerId] as const,
        queryFn: isInitialized && id ? () => getPost(id) : skipToken
    })
}

export function useCreatePost() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createPost,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: PostKeys.lists()
            })
    })
}

export function useEditPost() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({id, data}: {id: string; data: UpdatePostInput}) =>
            editPost(id, data),

        onSuccess: async (_result, {id}) => {
            await Promise.all([
                queryClient.invalidateQueries({queryKey: PostKeys.lists()}),
                queryClient.invalidateQueries({queryKey: PostKeys.detail(id)})
            ])
        }
    })
}

export function useDeletePost() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deletePost,

        onSuccess: (_result, id) => {
            queryClient.removeQueries({queryKey: PostKeys.detail(id)})
            return queryClient.invalidateQueries({queryKey: PostKeys.lists()})
        }
    })
}