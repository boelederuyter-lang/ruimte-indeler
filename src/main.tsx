import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useStore } from './store/useStore';
import './styles.css';

if (import.meta.env.DEV) {
  // Handig voor debuggen in de console: __store.getState()
  (window as unknown as { __store: typeof useStore }).__store = useStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
