import { useAuthStore } from '../stores/auth.store'

export default function DashboardPage() {
    const firstName = useAuthStore(state => state.user?.firstName)

    return (
        <main className="mx-auto max-w-7xl px-6 py-12">
            <h1 className="text-3xl font-bold">
                {firstName ? `Welcome, ${firstName}.` : 'Welcome to TNTube'}
            </h1>
        </main>
    )
}
