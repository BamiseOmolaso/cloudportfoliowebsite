import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Optional: Add providers here (e.g., ThemeProvider, QueryClient, etc.)
// This is a basic wrapper - add providers as needed
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

