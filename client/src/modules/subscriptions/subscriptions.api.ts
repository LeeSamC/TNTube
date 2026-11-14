import { api } from "../../libs/api";


export async function getSubscriptionStatus(creatorId: string) {
    return api<{
        isSubscribed: boolean
    }>(`/subscriptions/${creatorId}`)
}

export async function subscribeToUser(id: string){
    return api<{
        message: string
        isSubscribed: true
    }>(`/subscriptions/${id}`, {
        method: 'POST'
    })
}

export async function unsubscribeFromUser(id: string){
    return api<{
        message: string
        isSubscribed: false
    }>(`/subscriptions/${id}`, {
        method: 'DELETE'
    })
}