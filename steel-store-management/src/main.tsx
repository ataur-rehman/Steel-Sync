import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { db } from './services/database';
import { eventBus, BUSINESS_EVENTS } from './utils/eventBus';

// Initialize database and expose to window for developer access
db.initialize().then(() => {
  console.log('✅ Database initialized and ready');
}).catch(error => {
  console.error('❌ Database initialization failed:', error);
});

// Expose eventBus globally for cross-component communication
(window as any).eventBus = eventBus;
(window as any).BUSINESS_EVENTS = BUSINESS_EVENTS;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);