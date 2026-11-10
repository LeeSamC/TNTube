import { api } from "../../libs/api";

export type PostMedia = {
    media: string
    type: string
    storageKey: string
    mimeType: string
    width: number | null
    height: number | null
    duration: number | null
    url: string
}

export type Post = {
    postId: string
    title: string
    description: string | null
    createdAt: string
    updatedAt: string
    userId: string | null
    username: string | null
    likeCount: number
    dislikeCount: number
    currentUserReaction: 'LIKE' | 'DISLIKE' | null
    commentCount: number
    media: PostMedia | null

}

export type Pagination = {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
}

export type CreatePostInput = {
    title: string
    description?: string
    mediaId?: string
}

export type UpdatePostInput = Partial<CreatePostInput>

export async function getAllPosts(page = 1, limit = 10, term='') {
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    })

    if(term) query.set('q', term)

    return api<{
        posts: Post[]
        pagination: Pagination
    }>(`/posts/all?${query}`)
}

export async function getPost(id: string){
    return api<{
        post: Post
    }>(`/posts/${id}`)
}

export async function createPost(data: CreatePostInput) {
    return api<{
        message: string
        post: Post | null
    }>('/posts', {
        method: 'POST',
        body: data
    })
}

export async function editPost(id: string, data: UpdatePostInput) {
    return api<{
        message: string
        post: Post | null
    }>(`/posts/${id}`, {
        method: 'PATCH',
        body: data
    })
}

export async function deletePost(id: string) {
    return api<{
        message: string
    }>(`/posts/${id}`, {
        method: 'DELETE'
    })
}