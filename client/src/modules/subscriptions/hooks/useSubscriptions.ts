import {skipToken, useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import { useAuthStore } from '../../../stores/auth.store'

import { getSubscriptionStatus, subscribeToUser, unsubscribeFromUser } from '../subscriptions.api'

export const SubscriptionKeys = {
    all: ['subscriptions'] as const,
    detail: (creatorId: string | null) =>
        [...SubscriptionKeys.all, 'detail', creatorId] as const
}

export function useGetSubscription(creatorId: string | null) {
    const viewerId = useAuthStore(state => 
        state.isInitialized
            ? state.user?.userId ?? null
            : null
    )

    return useQuery({
        queryKey: [...SubscriptionKeys.detail(creatorId), viewerId],

        queryFn: 
            viewerId &&
            creatorId &&
            viewerId !== creatorId
                ? () => getSubscriptionStatus(creatorId)
                : skipToken


    })
}

export function useSubscribeToUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: subscribeToUser,

        onSuccess: (_result, creatorId) =>
            queryClient.invalidateQueries({
                queryKey: SubscriptionKeys.detail(creatorId),
            }),
    })
}

export function useUnsubscribeFromUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: unsubscribeFromUser,

        onSuccess: (_result, creatorId) =>
            queryClient.invalidateQueries({
                queryKey: SubscriptionKeys.detail(creatorId),
            }),
    })
}