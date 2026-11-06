import {RouterProvider} from 'react-router-dom'
import {router} from './app/Router'
import {AppProviders} from './app/Providers'
import AuthInitializer from './app/AuthInitializer'


export default function App(){
  return (
    <AppProviders>
      <AuthInitializer />
      <RouterProvider router={router} />
    </AppProviders>
  )
}
