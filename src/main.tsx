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
    console.log('Starting React app...');
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log('React app started successfully');
  } catch (error) {
    console.error('Error loading game:', error);
    root.innerHTML = `<div style="padding: 20px; color: red; background: white; font-family: monospace;"><h1>Error loading game</h1><pre>${String(error)}</pre></div>`;
  }
}

