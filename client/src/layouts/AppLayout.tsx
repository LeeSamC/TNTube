import {Outlet} from 'react-router-dom'
import Navigation from '../components/Navigation'

export default function AppLayout() {
    return (
        <div className='min-h-screen bg-gray-100'>
            <Navigation />
            <Outlet />
        </div>
    )
}