import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter } from 'react-router'
import { configureStore } from '@reduxjs/toolkit'
import rootReduers from './reducer/index.js'
import { Provider } from 'react-redux'
import { HelmetProvider } from 'react-helmet-async'
import PWAUpdatePrompt from './Components/extra/PWAUpdatePrompt.jsx'


const store = configureStore({
  reducer: rootReduers
})


createRoot(document.getElementById('root')).render(
    <HelmetProvider>
      <Provider store={store}>
        <BrowserRouter>
          <App/>
          {/* dark-theme default sir — react-hot-toast ships plain white-on-white by default,
              which had no styling here at all before and looked broken against this app's
              richblack background on every single toast in the app, not just logout. One shared
              default (per-call toast() options can still override per-toast) keeps every toast
              readable and on-theme without having to restyle each call site individually. */}
          <Toaster
            position="top-right"
            reverseOrder={true}
            toastOptions={{
              // CSS custom properties sir, not hardcoded hex — index.css redefines these same
              // --color-richblack-* tokens under the light-theme selector, so the toast follows
              // the user's theme toggle automatically instead of only ever looking right in dark
              // mode (utils/useTheme.js flips a class on <html>, no extra wiring needed here)
              style: {
                background: 'var(--color-richblack-800)',
                color: 'var(--color-richblack-5)',
                border: '1px solid var(--color-richblack-700)',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: 'var(--color-caribgreen-100)', secondary: 'var(--color-richblack-800)' },
              },
              error: {
                iconTheme: { primary: 'var(--color-pink-200)', secondary: 'var(--color-richblack-800)' },
              },
            }}
          />
          <PWAUpdatePrompt />
        </BrowserRouter>
      </Provider>
    </HelmetProvider>
)
