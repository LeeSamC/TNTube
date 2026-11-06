import {useMutation} from "@tanstack/react-query"
import {subscribeToUser, unsubscribeFromUser} from "../subscriptions.api"

export function useSubscribeToUser() {
    return useMutation({
        mutationFn: subscribeToUser
    })
}

export function useUnsubscribeFromUser() {
    return useMutation({
        mutationFn: unsubscribeFromUser
    })
}
