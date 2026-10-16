import { createRoot } from 'react-dom/client';
import { App } from './App';
import { TaylorPage } from './TaylorPage';
import './index.css';

const page = location.pathname.startsWith('/taylor-swift') ? <TaylorPage /> : <App />;
createRoot(document.getElementById('root')!).render(page);
