import {useQuery, useMutation, useQueryClient, skipToken} from "@tanstack/react-query"
import {useAuthStore} from "../../../stores/auth.store"
import {
    getAllNotifications,
    getUnreadNotifications,
    readAllNotifications,
    readNotification
} from "../notifications.api"

export const NotificationKeys = {
    all: ['notifications'] as const,
    list: (viewerId: string | undefined) =>
        [...NotificationKeys.all, 'list', viewerId] as const,
    unread: (viewerId: string | undefined) =>
        [...NotificationKeys.all, 'unread', viewerId] as const
}

export function useGetAllNotifications() {
    const viewerId = useAuthStore(state => state.isInitialized ? state.user?.userId : undefined)

    return useQuery({
        queryKey: NotificationKeys.list(viewerId),
        queryFn: viewerId ? getAllNotifications : skipToken
    })
}

export function useGetUnreadNotifications() {
    const viewerId = useAuthStore(state => state.isInitialized ? state.user?.userId : undefined)

    return useQuery({
        queryKey: NotificationKeys.unread(viewerId),
        queryFn: viewerId ? getUnreadNotifications : skipToken
    })
}

export function useReadNotification() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: readNotification,
        onSuccess: () =>
            queryClient.invalidateQueries({queryKey: NotificationKeys.all})
    })
}

export function useReadAllNotifications() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: readAllNotifications,
        onSuccess: () =>
            queryClient.invalidateQueries({queryKey: NotificationKeys.all})
    })
}
