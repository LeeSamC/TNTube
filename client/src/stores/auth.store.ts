import {create} from 'zustand'
import {api} from '../libs/api'

export type User = {
    userId: string
    firstName: string
    lastName: string
    username: string
}

type AuthState = {
    user: User | null
    isLoading: boolean
    isInitialized: boolean

    checkAuth: () => Promise<void>

    login: (
        username: string,
        password: string,
    ) => Promise<User>

    register: (data: {
        firstName: string
        lastName: string
        username: string
        password: string
        confirmPassword: string

    }) => Promise<User>

    logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>(
    (set) => ({
        user: null,
        isLoading: false,
        isInitialized: false,

        checkAuth:
            async() => {
                set({isLoading: true})

                try{
                    const result = await api<{
                        user: User
                    }>('/auth/me')

                    console.log('Me Result:', result)

                    set({user: result.user})
                }catch {
                    set({user: null})
                }finally{
                    set({
                        isLoading: false,
                        isInitialized: true
                    })
                }
            },
        
        login:
            async (username, password) => {
                set({isLoading: true})

                try{
                    const result = await api<{
                        user: User
                    }>('/auth/login', {
                        method: 'POST',
                        body: {
                            username,
                            password
                        }
                    })

                    set({user: result.user})
                    return result.user
                }finally{
                    set({isLoading: false})
                }
            },

        register:
            async(data) => {
                set({isLoading: true})

                try{
                    const result = await api<{
                        user: User
                    }>('/auth/register', {
                        method: 'POST',
                        body: data
                    })

                    set({user: result.user})

                    return result.user
                }finally{
                    set({isLoading: false})
                }
            },

        logout:
            async () => {
                try{
                    await api('/auth/logout', {
                        method: 'POST'
                    })
                }finally{
                    set({user: null})
                }
            }
    })
)