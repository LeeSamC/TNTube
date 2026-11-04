import { createBrowserRouter } from "react-router-dom";

export const router = 
    createBrowserRouter([
        {
            element: <PublicRouter/>,
            children: [
                {
                    path: '/login',
                    element: <LoginPage/>
                },
                {
                    path: '/register',
                    element: <RegistrationPage/>
                }
            ]
        }
    ])