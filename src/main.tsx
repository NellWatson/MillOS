import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode disabled for 3D app - causes double-renders that tank performance in dev
// Production builds are unaffected (StrictMode only runs in development)
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
