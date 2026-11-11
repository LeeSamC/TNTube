import { Link } from "react-router-dom";
import { useGetAllNotifications, useGetUnreadNotifications, useReadAllNotifications } from "../hooks/useNotifications";
import type { Notification } from "../notifications.api";

function activityText(notification: Notification){
    switch(notification.type) {
        case 'subscribe' :
            return 'subscribed to you'
        case 'comment' :
            return 'commented on your post'
        case 'reaction' :
            return notification.reaction.type === 'LIKE'
                ? 'liked your post'
                : 'disliked your post'

        default:
            return 'interacted with your content'
    }
}

export default function NotificationPage() {
    const {data, isPending, isError, refetch} = useGetAllNotifications()
    const {data: unread} = useGetUnreadNotifications()
    const markAll = useReadAllNotifications()
    const notifications = data?.notifications ?? []
    const hasUnread = (unread?.unreadCount ?? 0) > 0 || notifications.some(item => !item.isRead)

    return (
        <main className="mx-auto max-w-4xl">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="tube-title text-3xl font-bold lg:text-5xl">Notifications</h1>
                    {unread && <p aria-live="polite" className="mt-2 text-(--muted)">{unread.unreadCount} unread</p>}
                </div>
                {data && (
                    <button
                        type="button"
                        aria-disabled={!hasUnread || markAll.isPending}
                        onClick={() => {
                            if(hasUnread && !markAll.isPending) markAll.mutate()
                        }}
                        className="cursor-pointer rounded-lg border border-(--control) px-3 py-2 text-sm aria-disabled:opacity-60"
                    >
                        {markAll.isPending ? 'Marking as read..' : 'Mark all as read'}
                    </button>
                )}
            </header>

            {isPending && <p role="status">Loading notifications...</p>}
            {isError && (
                <div>
                    <p role="aleart">Could not load notifications</p>
                    <button 
                        type="button" 
                        onClick={() => void refetch()} 
                        className="cursor-pointer underline"
                    >
                        Try again
                    </button>
                </div>
            )}
            {markAll.isError && <p role="alert">Could not mark all notifications as read</p>}
            {data && notifications.length === 0 && <p>No notifications yet</p>}

            <ul className="mt-4">
                {notifications.map(item => (
                    <li
                        key={item.notificationId}
                        className={`flex flex-wrap items-center justify-between gap-3 border-b border-(--line) p-4 ${
                            item.isRead ? '' : 'border-l-2 border-l-(--text) bg-(--panel)'
                        }`}
                    >
                        <div className="min-w-0 wrap-break-word">
                            <p>
                                {!item.isRead && <span className="sr-only">Unread</span>}
                                <strong>@{item.actor.username}</strong> {activityText(item)}
                            </p>
                            <time dateTime={item.createdAt} className="text-sm text-(--muted)">
                                {new Date(item.createdAt).toLocaleDateString(undefined, {dateStyle: 'medium'})}
                            </time>
                        </div>
                        {item.postId && <Link to={`/posts/${item.postId}`} className="text-sm underline">View post</Link>}
                    </li>
                ))}
            </ul>
        </main>
    )
}