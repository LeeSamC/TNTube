import {useEffect, useRef, useState} from 'react'
import {Link} from 'react-router-dom'
import {Bell} from 'lucide-react'
import { useGetAllNotifications, useGetUnreadNotifications, useReadAllNotifications, useReadNotification } from '../hooks/useNotifications'
import type { Notification } from '../notifications.api'

function activityText(notification: Notification) {
    switch (notification.type) {
        case 'subscribe':
            return 'subscribed to you.'
        case 'comment':
            return 'commented on your post.'
        case 'reaction':
            return notification.reaction.type === 'LIKE'
                ? 'liked your post.'
                : 'reacted to your post.'
        default:
            return 'interacted with your content.'
    }
}

function NotificationList({
    unreadCount,
    onClose,
}: {
    unreadCount: number
    onClose: () => void
}) {
    const {data, isPending, isError, refetch} = useGetAllNotifications()
    const markAll = useReadAllNotifications()
    const markOne = useReadNotification()
    
    const notifications = data?.notifications ?? []
    const hasUnread = unreadCount > 0 || notifications.some(item => !item.isRead)
    const updating = markAll.isPending || markOne.isPending

    return (
        <>
            <header className='sticky top-0 border-b border-(--line) bg-(--panel) p-4'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                    <h2 id='notifications-title' className='tube-title text-lg font-semibold'>
                        Notifications
                    </h2>

                    <button
                        type='button'
                        aria-disabled={!hasUnread || updating}
                        onClick={() => {
                            if(hasUnread && !updating) markAll.mutate()
                        }}
                        className='cursor-pointer text-sm underline aria-disabled:opacity-50'
                    >
                        {markAll.isPending ? 'Marking as read...' : 'Mark all as read'}
                    </button>
                </div>

                <p aria-live='polite' className='mt-1 text-sm text-(--muted)'>
                    {unreadCount} unread
                </p>

            </header>

            {isPending && (
                <p role="status" className="p-4">Loading notifications…</p>
            )}

            {isError && (
                <div className="p-4">
                    <p role="alert">Could not load notifications.</p>
                    <button
                        type="button"
                        onClick={() => void refetch()}
                        className="mt-2 cursor-pointer underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            {(markAll.isError || markOne.isError) && (
                <p role="alert" className="p-4 text-sm text-red-200">
                    Could not update notifications. Try again.
                </p>
            )}

            {data && notifications.length === 0 && (
                <p className="p-4 text-sm text-(--muted)">
                    No notifications yet.
                </p>
            )}

            <ul>
                {notifications.map(item => (
                    <li
                        key={item.notificationId}
                        className={`border-b border-(--line) p-4 ${
                            item.isRead ? '' : 'bg-(--inset)'
                        }`}
                    >
                        <p className="wrap-break-word text-sm">
                            {!item.isRead && (
                                <span className="sr-only">Unread notification. </span>
                            )}
                            <strong>@{item.actor.username}</strong> {activityText(item)}
                        </p>

                        <time
                            dateTime={item.createdAt}
                            className="mt-1 block text-xs text-(--muted)"
                        >
                            {new Date(item.createdAt).toLocaleDateString(
                                undefined,
                                { dateStyle: 'medium' },
                            )}
                        </time>

                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                            {item.postId && (
                                <Link
                                    to={`/posts/${item.postId}`}
                                    onClick={onClose}
                                    className="underline"
                                >
                                    View post
                                </Link>
                            )}

                            {!item.isRead && (
                                <button
                                    type="button"
                                    disabled={updating}
                                    onClick={() => markOne.mutate(item.notificationId)}
                                    className="cursor-pointer underline disabled:opacity-50"
                                >
                                    Mark as read
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </>
    )
}

export default function NotificationsDropDown() {
    const [isOpen, setIsOpen] = useState(false)
    const container = useRef<HTMLDivElement>(null)
    const trigger = useRef<HTMLButtonElement>(null)
    const panel = useRef<HTMLElement>(null)
    const {data} = useGetUnreadNotifications()
    const unreadCount = data?.unreadCount ?? 0

    useEffect(() => {
        if(!isOpen) return

        panel.current?.focus()

        function handleOutsideClick(event: PointerEvent){
            if(!container.current?.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        function handleEscape(event: KeyboardEvent){
            if(event.key === 'Escape') {
                setIsOpen(false)
                trigger.current?.focus()
            }
        }

        document.addEventListener('pointerdown', handleOutsideClick)
        document.addEventListener('keydown', handleEscape)

        return () => {
            document.removeEventListener('pointerdown', handleOutsideClick)
            document.removeEventListener('keydown', handleEscape)
        }
    },[isOpen])

    return (
        <div ref={container} className='relative shrink-0'>
            <button
                ref={trigger}
                type='button'
                aria-label={`Notifications, ${unreadCount} unread`}
                aria-expanded={isOpen}
                aria-haspopup={'dialog'}
                aria-controls={isOpen ? 'notifications-panel' : undefined}
                onClick={() => setIsOpen(previous => !previous)}
                className='relative grid size-11 cursor-pointer place-items-center rounded-full hover:bg-(--inset)'
            >
                <Bell size={22} aria-hidden='true' />

                {unreadCount > 0 && (
                    <span
                        aria-hidden='true'
                        className='absolute -right-1 top-0 rounded-full bg-(--text) px-1.5 text-xs font-bold text-(--canvas)'
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <section
                    ref={panel}
                    id="notifications-panel"
                    role="dialog"
                    aria-labelledby="notifications-title"
                    tabIndex={-1}
                    className="tube-notifications-panel"
                >
                    <NotificationList
                        unreadCount={unreadCount}
                        onClose={() => setIsOpen(false)}
                    />
                </section>
            )}
        </div>
    )
}