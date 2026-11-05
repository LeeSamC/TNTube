import {useState} from 'react'
import { NavLink } from 'react-router-dom'
import {ChevronDown, Home, LogOut, User} from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'

export default function Navigation() {
    const user = useAuthStore(state => state.user)
    const logout = useAuthStore(state => state.logout)

    const [isOpen, setIsOpen] = useState(false)

    const links = [
        {
            to: '/',
            label: 'Home',
            icon: Home
        }
    ]

    const avatarLetter = user?.firstName.charAt(0).toUpperCase()

    return (
        <nav className='sticky top-0 z-50 w-full border-b bg-white'>
            <div className='mx-auto flex h-16 max-w-7xl items-center px-6'>
                <div className='mr-10 text-xl font-bold'>
                    TNTube
                </div>

                <div className='flex h-full items-center gap-2'>
                    {links.map((link) => {
                        const Icon = link.icon

                        return(
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({isActive}) => 
                                    `flex h-full items-center gap-2 border-b-2 px-4 text-sm font-medium transition ${
                                        isActive
                                            ? 'border-black text-black'
                                            : 'border-transparent text-gray-500 hover:text-black'
                                    }`
                                }
                            >
                                <Icon size={18}/>
                                {link.label}

                            </NavLink>
                        )
                    })}
                </div>

                <div className='ml-auto flex items-center gap-3'>
                    {!user ? (
                        <div className='flex items-center gap-3'>
                            <NavLink
                                to="/login"
                                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-100"
                            >
                                Login
                            </NavLink>

                            <NavLink
                                to="/register"
                                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                            >
                                Register
                            </NavLink>
                        </div>
                    ): (
                        <>
                            <div className='relative'>
                                <button
                                    type='button'
                                    onClick={() => setIsOpen(!isOpen)}
                                    className='flex items-center gap-2 rounded-full p-1 hover:bg-gray-100'
                                >
                                    <div className='flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-semibold text-white'>
                                        {avatarLetter}
                                    </div>

                                    <ChevronDown
                                        size={16}
                                        className={`transition-transform ${
                                            isOpen ? 'rotate-180' : ''
                                        }`}
                                    />

                                </button>

                                {isOpen && (
                                    <div className='absolute right-0 mt-2 w-48 rounded-lg border bg-white py-2 shadow-lg'>
                                        <NavLink
                                            to="/profile"
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <User size={18} />
                                            Profile
                                        </NavLink>

                                        <button
                                            type='button'
                                            onClick={() => {setIsOpen(false); logout();}}
                                            className='flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100'
                                        >

                                            <LogOut size={18} />
                                            Logout

                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}