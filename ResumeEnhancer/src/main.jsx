import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import toast, { Toaster } from 'react-hot-toast'
import { BrowserRouter } from 'react-router'
import { configureStore } from '@reduxjs/toolkit'
import rootReduers from './reducer/index.js'
import { Provider } from 'react-redux'
import { HelmetProvider } from 'react-helmet-async'
import { registerSW } from 'virtual:pwa-register'


const store = configureStore({
  reducer: rootReduers
})

// vite.config.js's VitePWA sets registerType: 'prompt' + injectRegister: false sir — that combo
// means the plugin deliberately does NOT auto-register the service worker, the app has to call
// this itself. Was missing entirely before (real bug found while testing Web Push: no
// registration anywhere meant navigator.serviceWorker.ready never resolved, so the "Enable on
// this device" toggle just hung forever with no error). immediate:true registers on load rather
// than waiting for the browser's own idle heuristics, so push/PWA-install features work right
// away instead of only after some unpredictable delay.
// onNeedRefresh sir — with registerType 'prompt' a freshly deployed version installs in the
// background but WAITS; without this handler nothing ever told the user, so a returning visitor kept
// running the old cached app (found live: the "Last used" login badge was deployed but never showed,
// and the same would hit any other change). This shows a small, dismissible toast; clicking Refresh
// activates the waiting version and reloads. It is deliberately NOT an automatic reload — that could
// wipe a half-filled form or interrupt a proctored test.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    toast(
      (t) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>A new version is available</span>
          <button
            onClick={() => {
              toast.dismiss(t.id)
              // updateSW(true) activates the waiting version and reloads — but only when this page
              // is controlled by the service worker. A page that never was (first visit after an
              // install) gets no automatic reload, so reload ourselves as a fallback; if the
              // plugin's own reload fires first, this timer simply dies with the old page.
              updateSW(true).finally(() => setTimeout(() => window.location.reload(), 500))
            }}
            style={{ background: 'var(--color-yellow-50)', color: 'var(--color-richblack-900)', borderRadius: '999px', padding: '4px 12px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            Refresh
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            aria-label="Dismiss"
            style={{ color: 'var(--color-richblack-300)', fontSize: '16px', lineHeight: 1, cursor: 'pointer' }}
          >
            ×
          </button>
        </span>
      ),
      { id: 'sw-update', duration: Infinity }
    )
  },
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
        </BrowserRouter>
      </Provider>
    </HelmetProvider>
)
