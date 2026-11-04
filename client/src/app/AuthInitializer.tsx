import {useEffect} from 'react'
import {useAuthStore} from '../stores/auth.store'

export default function AuthInitializer() {
    const checkAuth = useAuthStore((state) => state.checkAuth)

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    return null
}