import React from 'react';
import ReactDOM from 'react-dom/client';
import ProfileApp from './App';
import './styles.css';

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ProfileApp />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
