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
          <Toaster position="top-right" reverseOrder={true}/>
          <PWAUpdatePrompt />
        </BrowserRouter>
      </Provider>
    </HelmetProvider>
)
