import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { applyAppearance, loadAppearance } from './Model/Appearance/appearanceModel';
import reportWebVitals from './reportWebVitals';

// Apply the saved theme before the first paint so dark mode doesn't flash light.
applyAppearance(loadAppearance());

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
