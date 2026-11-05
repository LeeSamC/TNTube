import { api } from "../../libs/api";

export type ReactionType = 'LIKE' | 'DISLIKE'

export type Reaction = {
    postId: string
    userId: string
    createdAt: string
    type: ReactionType
    reactionId: string
}

export async function getReaction(id: string) {
    return api<{
        reaction: Reaction | null
        currentUserReaction: ReactionType | null
    }>(`/reactions/${id}`)
}

export async function saveReaction(
    id: string,
    data: {
        type: ReactionType
    }
) {
    return api<{
        message: string
        reaction: Reaction
    }>(`/reactions/${id}`, {
        method: 'PUT',
        body: data
    })
}

export async function deleteReaction(id: string) {
    return api<{
        message: string
    }>(`/reactions/${id}`, {
        method: 'DELETE'
    })
}
