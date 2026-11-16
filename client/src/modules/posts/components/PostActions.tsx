import {useRef, useState} from 'react'
import { useNavigate } from 'react-router-dom'
import { ThumbsDown, ThumbsUp } from 'lucide-react'

import type { Post } from '../posts.api'
import type { ReactionType } from '../../reactions/reactions.api'

import { useDeleteReaction, useSaveReaction } from '../../reactions/hooks/useReactions'

import { useGetSubscription, useSubscribeToUser, useUnsubscribeFromUser } from '../../subscriptions/hooks/useSubscriptions'

import { useAuthStore } from '../../../stores/auth.store'

function buttonClass(selected: boolean) {
    return [
        'inline-flex min-h-11 items-center justify-center gap-2',
        'cursor-pointer rounded-lg border px-4 text-sm font-semibold',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected
            ? 'border-(--text) bg-(--text) text-(--canvas)'
            : 'border-(--control) bg-(--panel) hover:bg-(--inset)',
    ].join(' ')
}

export default function PostActions({post}: {post: Post}) {
    const navigate = useNavigate()
    const user = useAuthStore(state => state.user)

    const saveReaction = useSaveReaction()
    const deleteReaction = useDeleteReaction()

    const subscription = useGetSubscription(post.userId)
    const subscribe = useSubscribeToUser()
    const unsubscribe = useUnsubscribeFromUser()

    const reactionLock = useRef(false)
    const subscriptionLock = useRef(false)

    const [actionError, setActionError] = useState<string | null>(
        null,
    )

    const currentReaction = user
        ? post.currentUserReaction
        : null

    const reactionBusy = 
        saveReaction.isPending || deleteReaction.isPending

    const subscriptionBusy = 
        subscribe.isPending || unsubscribe.isPending

    const isSubscribed = 
        subscription.data?.isSubscribed ?? false

    const canSubscribe = 
        Boolean(post.userId) &&
        post.userId !== user?.userId

    const subscriptionDisabled = 
        subscriptionBusy ||
        (
            Boolean(user) &&
            (
                subscription.isPending ||
                subscription.isFetching ||
                subscription.isError
            )
        )
    
    let subscriptionLabel = isSubscribed
        ? 'Subscribed'
        : 'Subscribe'

    if(subscriptionBusy) {
        subscriptionLabel = 'Updating...'
    }else if (user && subscription.isPending){
        subscriptionLabel = 'Loading...'
    }else if (user && subscription.isError){
        subscriptionLabel = 'Subscription unavailable'
    }

    async function handleReaction(type: ReactionType) {
        if(!user) {
            navigate('/login')
            return
        }

        if(reactionLock.current || reactionBusy) return

        reactionLock.current = true
        setActionError(null)

        try{
            if(currentReaction === type) {
                await deleteReaction.mutateAsync(post.postId)
            }else{
                await saveReaction.mutateAsync({
                    postId: post.postId,
                    data: {type}
                })
            }
        }catch (error) {
            setActionError(
                error instanceof Error
                    ? error.message
                    : 'Could not update your reaction'
            )
        }finally {
            reactionLock.current = false
        }
    }

    async function handleSubscription() {
        if(!user){
            navigate('/login')
            return
        }

        if(!post.userId || !canSubscribe || subscriptionDisabled || subscriptionLock.current){
            return
        }
        
        subscriptionLock.current = true
        setActionError(null)

        try{
            if(isSubscribed){
                await unsubscribe.mutateAsync(post.userId)
            }else{
                await subscribe.mutateAsync(post.userId)
            }
        }catch (error) {
            setActionError(
                error instanceof Error
                    ? error.message
                    : 'Could not update your subscription'
            )
        }finally {
            subscriptionLock.current = false
        }
    }

    return (
        <div className='mt-5'>
            <div className='flex flex-wrap items-center gap-3'>
                <div
                    role="group"
                    aria-label="Post reactions"
                    aria-busy={reactionBusy}
                    className='flex flex-wrap gap-2'
                >

                    <button
                        type='button'
                        aria-pressed={currentReaction === 'LIKE'}
                        disabled={reactionBusy}
                        onClick={() => void handleReaction('LIKE')} 
                        className={buttonClass(
                            currentReaction === 'LIKE'
                        )}
                    >
                        <ThumbsUp size={18} aria-hidden="true" />
                        <span>Like</span>
                        <span>
                            {post.likeCount.toLocaleString()}
                        </span>

                    </button>

                    <button
                        type="button"
                        aria-pressed={currentReaction === 'DISLIKE'}
                        disabled={reactionBusy}
                        onClick={() => void handleReaction('DISLIKE')}
                        className={buttonClass(
                            currentReaction === 'DISLIKE',
                        )}
                    >
                        <ThumbsDown size={18} aria-hidden="true" />

                        <span>Dislike</span>

                        <span>
                            {post.dislikeCount.toLocaleString()}
                        </span>
                    </button>

                </div>

                {canSubscribe && (
                    <button
                        type='button'
                        aria-label={
                            isSubscribed
                                ? `Unsubscribe from ${post.username ?? 'creator'}`
                                : `Subscribe to ${post.username ?? 'creator'}`
                        }

                        disabled={subscriptionDisabled}
                        onClick={() => void handleSubscription()}
                        className={buttonClass(isSubscribed)}
                    >
                        {subscriptionLabel}
                    </button>
                )}
            </div>

            {user && canSubscribe && subscription.isError && (
                <div className='mt-3 text-sm text-(--muted)'>
                    <p role='heart'>
                        Could not check your subscription status
                    </p>

                    <button
                        type='button'
                        disabled={subscription.isFetching}
                        onClick={() => void subscription.refetch()}
                        className='mt-1 cursor-pointer underline disabled:opacity-50'
                    >
                        Typ again
                    </button>
                </div>
            )}

            {actionError && (
                <p role='alert' className='mt-3 text-sm text-red-200'>
                    {actionError}
                </p>
            )}
        </div>
    )
}