import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
// import "../node_modules/antd/dist/reset.css"
const root = ReactDOM.createRoot(document.getElementById('app'))
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)