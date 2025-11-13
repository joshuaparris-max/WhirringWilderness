import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './ui/App.tsx'
import './index.css'

// Add error boundary
const root = document.getElementById('root');
if (!root) {
  document.body.innerHTML = '<h1>Error: Root element not found</h1>';
} else {
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (error) {
    root.innerHTML = `<div style="padding: 20px; color: red;"><h1>Error loading game</h1><pre>${String(error)}</pre></div>`;
  }
}

