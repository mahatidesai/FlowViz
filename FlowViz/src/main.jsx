import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { MessageProvider } from './context/messageContext'
import JsonDataProvider from './context/flowJsonContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MessageProvider>
      <JsonDataProvider>
        <App />
      </JsonDataProvider>
    </MessageProvider>
    </StrictMode>
)
