import {Outlet} from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store'

export default function PublicRoute() {
    const user = useAuthStore(state => state.user)
    const isInitialized = useAuthStore(state => state.isInitialized)

    if(!isInitialized){
        return (
            <div className='flex min-h-screen items-center justify-center'>
                <p>
                    Loading
                </p>
            </div>
        )
    }

    if(!user){
        return <Outlet/>
    }

    return <Outlet/>
}