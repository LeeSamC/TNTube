import { createBrowserRouter } from 'react-router-dom'
import PublicRoute from '../components/PublicRoute'
import AppLayout from '../layouts/AppLayout'
import LoginPage from '../modules/auth/pages/LoginPage'
import RegistrationPage from '../modules/auth/pages/RegistrationPage'
import DashboardPage from '../pages/DashboardPage'
import PostDetailPage from '../modules/posts/pages/PostDetailsPage'
import ProtectedRoute from '../components/ProtectedRoute'
import CreatePostPage from '../modules/posts/pages/CreatePostPage'

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
            {
                element: <ProtectedRoute/>,
                children: [
                    {
                        path: '/posts/create',
                        element: <CreatePostPage/>
                    },
                ]
            }
        ],

    },
])
