// 使用路由懒加载的react组件必须使用默认导出，否则会报错。
import React, { Suspense, lazy } from "react"
import { Button } from "antd"
// import { Home } from "./pages/home"
// import { About } from "./pages/about"  
import { Link, Routes, Route } from "react-router-dom"


function App() {
  const Home = lazy(() => import(/* webpackChunkName: "home" */ "./pages/home"))
  const About = lazy(() =>
    import(/* webpackChunkName: "about" */ "./pages/about")
  )
  return (
    <div>
      <Button type="primary">按钮</Button>
      <ul>
        <li>
          <Link to="/home">home</Link>
        </li>
        <li>
          <Link to="/about">about</Link>
        </li>
      </ul>
      {/* 路由懒加载   */}
      <Suspense fallback={<div>loading...</div>}>
        <Routes>
          <Route path="/home" element={<Home />}></Route>
          <Route path="/about" element={<About />}></Route>
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
