// 使用路由懒加载的react组件必须使用  默认导出，否则会报错。
import logo from "./logo.svg"
import React from "react"
import "./App.css"

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h2>由 panz-cli 创建的react App</h2>
      </header>
    </div>
  )
}

export default App
