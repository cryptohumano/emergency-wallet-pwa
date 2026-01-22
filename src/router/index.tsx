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
import CreateAccount from '@/pages/CreateAccount'
import ImportAccount from '@/pages/ImportAccount'
import Settings from '@/pages/Settings'
import About from '@/pages/About'
import Send from '@/pages/Send'
import Receive from '@/pages/Receive'
import Networks from '@/pages/Networks'
import Contacts from '@/pages/Contacts'
import Documents from '@/pages/Documents'
import FlightLogs from '@/pages/FlightLogs'
import MountainLogs from '@/pages/MountainLogs'
import MedicalRecords from '@/pages/MedicalRecords'
import Attestations from '@/pages/Attestations'

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
              path: 'create',
              element: <CreateAccount />,
            },
            {
              path: 'import',
              element: <ImportAccount />,
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
        {
          path: 'about',
          element: <About />,
        },
        {
          path: 'send',
          element: <Send />,
        },
        {
          path: 'receive',
          element: <Receive />,
        },
        {
          path: 'networks',
          element: <Networks />,
        },
        {
          path: 'contacts',
          element: <Contacts />,
        },
        {
          path: 'documents',
          element: <Documents />,
        },
        {
          path: 'flight-logs',
          element: <FlightLogs />,
        },
        {
          path: 'mountain-logs',
          element: <MountainLogs />,
        },
        {
          path: 'medical-records',
          element: <MedicalRecords />,
        },
        {
          path: 'attestations',
          element: <Attestations />,
        },
      ],
    },
  ],
  {
    basename: basename,
  }
)
