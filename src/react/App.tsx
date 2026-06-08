import React, { useState } from 'react'
import AdminPanel from './pages/AdminPanel'
import Home from './pages/Home'
import Register from './pages/Register'

const App = () => {
  const [currentPage, setCurrentPage] = useState('home')

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-gray-300">
      {currentPage === 'home' && <Home setPage={setCurrentPage} />}
      {currentPage === 'admin' && <AdminPanel setPage={setCurrentPage} />}
      {currentPage === 'register' && <Register setPage={setCurrentPage} />}
    </div>
  )
}

export default App
