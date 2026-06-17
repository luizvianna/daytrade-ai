import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

// StrictMode removido: o double-render proposital do StrictMode em
// desenvolvimento conflita com a troca de páginas (montagem/desmontagem
// rápida de componentes complexos) no React 19, causando o erro
// "Failed to execute 'removeChild' on 'Node'". Isso só ocorre em modo
// dev (npm start); a build de produção (Netlify) nunca usa StrictMode
// e nunca teve esse problema.
root.render(<App />);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
