import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

registerSW({ immediate: true })

const blockZoom = (e: Event) => e.preventDefault()
document.addEventListener('gesturestart', blockZoom)
document.addEventListener('gesturechange', blockZoom)
document.addEventListener('gestureend', blockZoom)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
