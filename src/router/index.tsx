/**
 * Router simplificado para Emergency Wallet
 * Solo rutas mínimas enfocadas en emergencias
 */

import { createBrowserRouter } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import Home from '@/pages/Home'
import Emergencies from '@/pages/Emergencies'
import CreateEmergency from '@/pages/CreateEmergency'
import EmergencyDetail from '@/pages/EmergencyDetail'
import Transactions from '@/pages/Transactions'
import Accounts from '@/pages/Accounts'
import AccountDetail from '@/pages/AccountDetail'
import Settings from '@/pages/Settings'

// Obtener el base path desde import.meta.env.BASE_URL (configurado por Vite)
const basename = import.meta.env.BASE_URL || '/'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <MainLayout />,
      children: [
        {
          index: true,
          element: <Home />,
        },
        {
          path: 'emergencies',
          children: [
            {
              index: true,
              element: <Emergencies />,
            },
            {
              path: 'create',
              element: <CreateEmergency />,
            },
            {
              path: ':id',
              element: <EmergencyDetail />,
            },
          ],
        },
        {
          path: 'transactions',
          element: <Transactions />,
        },
        {
          path: 'accounts',
          children: [
            {
              index: true,
              element: <Accounts />,
            },
            {
              path: ':address',
              element: <AccountDetail />,
            },
          ],
        },
        {
          path: 'settings',
          element: <Settings />,
        },
      ],
    },
  ],
  {
    basename: basename,
  }
)
