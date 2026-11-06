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

export type CommentWithReplies = Omit<Comment, 'deletedAt'> & {
    username: string
    replies: CommentWithReplies[]
}

export type AddCommentInput = {
    content: string
    parentCommentId: string | null
}

export type EditCommentInput = {
    content: string
}

export async function getComments(id: string) {
    return api<{
        comments: CommentWithReplies[]
    }>(`/comments/${id}`)
}

export async function addComment(id: string, data: AddCommentInput) {
    return api<{
        comment: Comment
    }>(`/comments/${id}`, {
        method: 'POST',
        body: data
    })
}

export async function editComment(id: string, data: EditCommentInput) {
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
