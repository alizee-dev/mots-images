import { createContext } from 'react'

// Lets a page rendered inside Layout's <Outlet /> (currently only
// TestSessionPage) ask Layout to confirm before the "← Quitter le test"
// link is allowed to navigate away, without Layout needing to know
// anything about test state itself.
export const TestGuardContext = createContext({ setTestGuard: () => {} })
