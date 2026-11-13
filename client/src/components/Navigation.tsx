import {useEffect, useLayoutEffect, useRef, useState, type SyntheticEvent} from 'react'
import {Link, NavLink, useLocation, useNavigate, useSearchParams} from 'react-router-dom'
import {House, Menu, Search, X, Plus} from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'
import NotificationsDropDown from '../modules/notifications/componenets/NotificationsDropdown'

export function SideBarLinks({onNavigate}: {onNavigate?: () => void}) {
    return (
        <nav className='tube-links grid gap-1' aria-label='Main navigation'>
            <NavLink to="/" end onClick={onNavigate}>
                <House size={20} aria-hidden="true" />
                Home
            </NavLink>
        </nav>
    )
}

function SiteSearch() {
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()
    const input = useRef<HTMLInputElement>(null)
    const term = location.pathname === '/' ? (params.get('q') ?? '').trim() : ''

    useLayoutEffect(() => {
        if(input.current) input.current.value = term
    }, [location.key, term])

    function handleSearch(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const query = String(data.get('q') ?? '').trim()
        navigate(query ? `/?${new URLSearchParams({q: query})}` : '/')
    }

    return (
        <form
            role='search'
            onSubmit={handleSearch}
            className='tube-search flex min-w-0 rounded-lg border border-(--control) bg-(--canvas)]'
        >
            <input
                ref={input}
                name="q"
                type='search'
                maxLength={100}
                defaultValue={term}
                aria-label='Search TNTube'
                placeholder='Search TNTube'
                className='min-w-0 flex-1 rounded-1-lg px-3 py-2.5'
            />

            <button
                type='submit'
                aria-label='Search'
                className='grid w-12 cursor-pointer place-items-center rounded-r-lg border-l border-(--control) bg-(--inset)'
            >
                <Search size={20} aria-hidden="true" />
            </button>
        </form>
    )
}

export default function Navigation() {
    const user = useAuthStore(state => state.user)
    const isInitialized = useAuthStore(state => state.isInitialized)
    const logout = useAuthStore(state => state.logout)
    const location = useLocation()
    const drawer = useRef<HTMLDialogElement>(null)
    const [signingOut, setSigningOut] = useState(false)
    const [signOutError, setSignOutError] = useState(false)

    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 48rem)')

        function closeOnDesktop() {
            if(desktop.matches && drawer.current?.open) drawer.current.close()
        }

        desktop.addEventListener('change', closeOnDesktop)
        return () => desktop.removeEventListener('change', closeOnDesktop)
    }, [])

    async function handleSignOut() {
        setSignOutError(false)
        setSigningOut(true)
        try{
            await logout()
        }catch {
            setSignOutError(true)
        }finally{
            setSigningOut(false)
        }
    }

    return (
        <header className='tube-header'>
            <div className='flex items-center gap-2'>
                <button
                    type='button'
                    aria-label='Open navigation'
                    aria-haspopup='dialog'
                    aria-controls='tube-drawer'
                    onClick={() => drawer.current?.showModal()}
                    className='grid size-11 cursor-pointer place-items-center rounded-lg md:hidden'
                >
                    <Menu size={22} aria-hidden='true'/>
                </button>
                <Link to="/" className="tube-title flex items-center gap-2 text-xl font-bold">
                    <svg viewBox="0 0 28 22" width="28" height="22" aria-hidden="true">
                        <rect x="1" y="1" width="26" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M11 6.5 19 11l-8 4.5z" fill="currentColor" />
                    </svg>
                    TNTube
                </Link> 
            </div>

            <div className="tube-search-area">
                <SiteSearch />
            </div>

            <div className='flex items-center gap-3 justify-self-end'>
                {isInitialized && user && (
                    <>
                        <Link
                            to='/posts/create'
                            aria-label='Create a post'
                            className={[
                                'inline-flex min-h-11 min-w-11 items-center',
                                'justify-center gap-2 rounded-lg',
                                'bg-(--inset) px-3 text-sm font-semibold',
                                'hover:bg-(--line)',
                            ].join(' ')}
                        >
                            <Plus size={20} aria-hidden='true'/>

                            <span className='hidden sm:inline'>
                                Create
                            </span>
                        </Link>

                        <NotificationsDropDown key={`${user.userId}-${location.key}`} />
                    </>
                )}
                
                {isInitialized && (user ? (
                    <>
                        <button
                            type='button'
                            aria-label='Your account'
                            popoverTarget='tube-account'
                            className="size-11 cursor-pointer rounded-full bg-(--text) text-sm font-bold text-(--canvas)"
                        >
                           {(user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase()} 
                        </button>

                        <div key={location.key} id='tube-account' popover='auto' className='tube-account-menu'>
                            <p className="wrap-break-word font-semibold">{user.firstName} {user.lastName}</p>
                            <p className="wrap-break-word text-sm text-(--muted)">@{user.username}</p>
                            <button
                                type='button'
                                disabled={signingOut}
                                onClick={handleSignOut}
                                className="mt-3 w-full cursor-pointer rounded-md px-3 py-2 text-left hover:bg-(--inset)"
                            >
                                {signingOut ? 'Signing out...' : 'Sign out'}

                            </button>
                        </div>
                    </>
                ): (
                    <Link to="/login" className="inline-flex min-h-11 items-center rounded-lg bg-(--text) px-4 text-sm font-bold text-(--canvas)">
                        Sign in
                    </Link>
                ))}

            </div>

            {signOutError && (
                <p role='alert' className='col-span-full text-sm text-red-200'>
                    Could not reach TNTube to finish signing out
                </p>
            )}

            <dialog
                ref={drawer}
                id='tube-drawer'
                className='tube-drawer'
                aria-labelledby='tube-drawer-title'
                onClick={event => {
                    if(event.target === event.currentTarget) event.currentTarget.close()
                }}
            >
                <div className='min-h-full p-4'>
                    <div className='mb-3 flex items-center justify-between'>
                        <h2 id='tube-drawer-title' className='tube-title text-xl font-semibold'>
                            Menu
                        </h2>

                        <button
                            type='button'
                            aria-label='Close navigation'
                            onClick={() => drawer.current?.close()}
                            className='grid size-11 cursor-pointer place-items-center rounded-lg'
                        >
                            <X size={22} aria-hidden='true'/>
                        </button>
                    </div>

                    <SideBarLinks onNavigate={() => drawer.current?.close()}/>
                </div>

            </dialog>
        </header>
    )
}