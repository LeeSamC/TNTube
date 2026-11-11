import { createBrowserRouter } from 'react-router-dom'
import PublicRoute from '../components/PublicRoute'
import AppLayout from '../layouts/AppLayout'
import LoginPage from '../modules/auth/pages/LoginPage'
import RegistrationPage from '../modules/auth/pages/RegistrationPage'
import DashboardPage from '../pages/DashboardPage'
import PostDetailPage from '../modules/posts/pages/PostDetailsPage'

export const router = createBrowserRouter([
    {
        element: <PublicRoute />,
        children: [
            { path: '/login', element: <LoginPage /> },
            { path: '/register', element: <RegistrationPage /> },
        ],
    },
    {
        element: <AppLayout />,
        children: [
            { path: '/', element: <DashboardPage /> },
            { path: '/posts/:postId', element: <PostDetailPage /> },
        ],

    },
])
