import { Routes, Route} from 'react-router-dom'
import './App.css'
import { Home } from './pages/Home'
import GroqChat from './pages/GroqChat'
import AssignmentChecker from './pages/AssignmentChecker'
import { Attendance } from './pages/Attendance'

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/groq-chat" element={<GroqChat />} />
        <Route path="/assignment" element={<AssignmentChecker />} />
        <Route path="/attendance" element={<Attendance />} />
      </Routes>
    </>
  )
}

export default App
