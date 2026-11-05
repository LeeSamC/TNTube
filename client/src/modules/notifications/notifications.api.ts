import { api } from "../../libs/api";

export type Notification = {
    notificationId: string
    type: string
    isRead: boolean
    createdAt: string
    actor: {
        userId: string
        username: string
    }
    postId: string | null
    commentId: string | null
    reaction: {
        reactionId: string | null
        type: "LIKE" | "DISLIKE" | null
    }
}

export async function getAllNotifications(){
    return api<{
        notifications: Notification[]
    }>('/notifications')
}

export async function getUnreadNotifications(){
    return api<{
        unreadCount: number
    }>('/notifications/unread')
}

export async function readNotification(id: string){
    return api(`/notifications/${id}/read`, {
        method: 'PATCH'
    })
}

export async function readAllNotifications() {
    return api('/notifications/read-all', {
        method: 'PATCH'
    })
}