import {RouterProvider} from 'react-router-dom'
import {router} from './app/Router'
import {AppProviders} from './app/Providers'


export default function App(){
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}