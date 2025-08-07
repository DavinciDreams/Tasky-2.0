import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';
import '../styles/shadcn-theme.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);