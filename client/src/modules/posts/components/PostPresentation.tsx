import type {Post} from '../posts.api'

export function PlayerArtwork() {
    return (
        <svg viewBox="0 0 320 180" fill="none" className="w-full" aria-hidden="true">
            <path
                d="M0 30h320M0 60h320M0 90h320M0 120h320M0 150h320M40 0v180M80 0v180M120 0v180M160 0v180M200 0v180M240 0v180M280 0v180"
                stroke="var(--inset)"
            />
            <rect x="72" y="34" width="148" height="91" rx="10" fill="var(--panel)" stroke="var(--line)" />
            <rect x="85" y="44" width="148" height="91" rx="10" fill="var(--panel)" stroke="var(--control)" />
            <rect x="98" y="54" width="148" height="91" rx="10" fill="var(--inset)" stroke="var(--muted)" />
            <circle cx="172" cy="96" r="16" stroke="var(--control)" />
            <path d="m168 89 11 7-11 7z" fill="var(--text)" />
            <path d="M114 128h116" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
            <path d="M114 128h38" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function PostMeta({username, createdAt}: Pick<Post, 'username' | 'createdAt'>){
    return (
        <div className='mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-(--muted)'>
            <span className='break-all'>
                {username ? `@${username}`: 'Unknown creator'}
            </span>
            <time dateTime={createdAt}>
                {new Date(createdAt).toLocaleDateString(undefined, {dateStyle: 'medium'})}
            </time>

        </div>
    )
}