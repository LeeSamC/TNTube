import { api } from "../../libs/api";

export type Comment = {
    userId: string
    createdAt: string
    postId: string
    updatedAt: string
    deletedAt: string | null
    commentId: string
    parentCommentId: string | null
    content: string
}

export async function getComments(id: string) {
    return api<{
        comments: Comment[]
    }>(`/comments/${id}`)
}

export async function addComment(
    id: string,
    data: {
        content: string
        parentCommentId: string | null
    }
) {
    return api<{
        comment: Comment
    }>(`/comments/${id}`, {
        method: 'POST',
        body: data
    })
}

export async function editComment(
    id: string,
    data: {
        content: string
    }
){
    return api<{
        comment: Comment
    }>(`/comments/${id}`, {
        method: 'PATCH',
        body: data
    })
}

export async function deleteComment(id: string){
    return api(`/comments/${id}`, {
        method: 'DELETE'
    })
}