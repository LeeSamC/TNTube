import {Outlet, ScrollRestoration} from 'react-router-dom'
import Navigation, {SideBarLinks} from '../components/Navigation'

export default function AppLayout() {
    return (
        <div className='tube'>
            <Navigation />
            <div className='md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:items-start'>
                <aside className='sticky top-18 hidden h-[calc(100dvh-4.5rem)] overflow-auto border-r border-(--line) p-3 md:block'>
                    <SideBarLinks/>
                </aside>

                <div className='min-w-0 px-4 py-6 md:px-6 md:py-9'>
                    <Outlet />
                </div>
            </div>
            <ScrollRestoration/>
        </div>
    )
}