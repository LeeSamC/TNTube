import {useState} from 'react'
import {Link, useParams, useSearchParams} from 'react-router-dom'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {z} from 'zod'

import { api } from '../../../libs/api'
import { useAuthStore, type User } from '../../../stores/auth.store'
import type {Post, Pagination} from '../../posts/posts.api'
import { PostCard } from '../../posts/components/PostCard'
import { PostKeys } from '../../posts/hooks/usePosts'
import { useGetSubscription, useSubscribeToUser, useUnsubscribeFromUser } from '../../subscriptions/hooks/useSubscriptions'

type Profile = User & {
    createdAt: string
    postCount: number
    subscriberCount: number
    subscriptionCount: number
}

type ProfileInput = Pick<User, 'firstName' | 'lastName' | 'username'>

const buttonClass = [
    'inline-flex min-h-11 items-center justify-center',
    'rounded-lg border border-(--control) px-4 py-2',
    'font-semibold hover:bg-(--inset)',
    'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

export default function ProfilePage() {
    const {userId} = useParams()
    const initialized = useAuthStore(state => state.isInitialized)
    const viewerId = useAuthStore(state => state.user?.userId ?? null)
    const validation = z.uuid().safeParse(userId)

    if(!validation.success){
        return <h1 className="text-3xl font-bold">Profile unavailable</h1>
    }

    if(!initialized) {
        return <p role='status'>Loading profile...</p>
    }

    return (
        <ProfileContent
            key={`${validation.data}-${viewerId ?? 'guest'}`}
            userId={validation.data}
        />
    )
}

function ProfileContent({userId}: {userId: string}) {
    const user = useAuthStore(state => state.user)
    const queryClient = useQueryClient()
    const [params, setParams] = useSearchParams()
    const [editing, setEditing] = useState(false)

    const isOwner = user?.userId === userId
    const tab = isOwner && params.get('tab') === 'likes'
        ? 'likes'
        : 'posts'

    const requestedPage = Number(params.get('page') ?? '1')
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1

    const profileQuery = useQuery({
        queryKey: ['profiles', userId],
        queryFn: () =>
            api<{profile: Profile}>(`/users/${userId}`),
        retry: false
    })

    const postQuery = useQuery({
        queryKey: [
            ...PostKeys.lists(),
            'profile',
            userId,
            user?.userId ?? null,
            tab,
            page,
        ],

        queryFn: () => {
            const query = new URLSearchParams({
                page: String(page),
                limit: '12',
            })

            if(tab === 'likes') {
                query.set('liked', 'true')
            }else{
                query.set('authorId', userId)
            }

            return api<{
                posts: Post[]
                pagination: Pagination
            }>(`/posts/all?${query}`)
        },
        enabled: Boolean(profileQuery.data),
        retry: false
    })

    const subscription = useGetSubscription(userId)
    const subscribe = useSubscribeToUser()
    const unsubscribe = useUnsubscribeFromUser()

    const saveProfile = useMutation({
        mutationFn: (body: ProfileInput) =>
            api<{user: User}>('/users/me', {
                method: 'PATCH',
                body,
            }),

        onSuccess: async result => {
            if(useAuthStore.getState().user?.userId === result.user.userId){
                useAuthStore.setState({user: result.user})
            }

            setEditing(false)

            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ['profiles'],
                }),
                queryClient.invalidateQueries({
                    queryKey: PostKeys.all
                })
            ])
        }
    })

    const profile = profileQuery.data?.profile
    const iSubscribed = subscription.data?.isSubscribed ?? false

    const subscriptionBusy =
        subscribe.isPending ||
        unsubscribe.isPending ||
        subscription.isPending ||
        subscription.isFetching

    const subscriptionError = subscribe.error ?? unsubscribe.error

    function changePage(nextPage: number){
        setParams({
            ...(tab === 'likes' ? {tab: 'likes'}: {}),
            page: String(nextPage),
        })
    }

    if(profileQuery.isPending) {
        return <p role='status'>Loading profile...</p>
    }

    if(profileQuery.isError || !profile) {
        return(
            <main>
                <h1 className="text-3xl font-bold">Profile unavailable</h1>
                <p role="alert" className="mt-3">
                    {profileQuery.error?.message ?? 'User not found'}
                </p>
                <button
                    type="button"
                    className={`${buttonClass} mt-4`}
                    onClick={() => void profileQuery.refetch()}
                >
                    Try again
                </button>
            </main>
        )
    }

    return (
        
    )
}