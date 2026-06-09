import React, { useState } from 'react'
import About from './pages/About'
import AdminPanel from './pages/AdminPanel'
import Clubs from './pages/Clubs'
import Contact from './pages/Contact'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import StudentPanel from './pages/StudentPanel'
import TeacherPanel from './pages/TeacherPanel'

const App = () => {
  const [currentPage, setCurrentPage] = useState('home')
  const [history, setHistory] = useState<string[]>([])

  const navigate = (page: string) => {
    setCurrentPage(previous => {
      if (previous !== page) {
        setHistory(items => [...items, previous])
      }
      return page
    })
  }

  const goBack = () => {
    setHistory(items => {
      const target = items[items.length - 1] ?? 'home'
      setCurrentPage(target)
      return items.slice(0, -1)
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-gray-300">
      {currentPage === 'home' && <Home setPage={navigate} />}
      {currentPage === 'about' && <About setPage={navigate} goBack={goBack} />}
      {currentPage === 'contact' && <Contact setPage={navigate} goBack={goBack} />}
      {currentPage === 'clubs' && <Clubs setPage={navigate} goBack={goBack} />}
      {currentPage === 'login' && <Login setPage={navigate} goBack={goBack} />}
      {currentPage === 'adminLogin' && <Login setPage={navigate} goBack={goBack} initialRole="admin" />}
      {currentPage === 'teacherLogin' && <Login setPage={navigate} goBack={goBack} initialRole="teacher" />}
      {currentPage === 'studentLogin' && <Login setPage={navigate} goBack={goBack} initialRole="student" />}
      {currentPage === 'admin' && <AdminPanel setPage={navigate} goBack={goBack} />}
      {currentPage === 'teacher' && <TeacherPanel setPage={navigate} goBack={goBack} />}
      {currentPage === 'student' && <StudentPanel setPage={navigate} goBack={goBack} />}
      {currentPage === 'register' && <Register setPage={navigate} goBack={goBack} />}
    </div>
  )
}

export default App
