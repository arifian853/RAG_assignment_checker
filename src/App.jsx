import { Routes, Route} from 'react-router-dom'
import './App.css'
import { Home } from './pages/Home'
import GroqChat from './pages/GroqChat'
import AssignmentChecker from './pages/AssignmentChecker'
import { Attendance } from './pages/Attendance'
import { CodingAssignment } from './pages/CodingAssignment'

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/groq-chat" element={<GroqChat />} />
        <Route path="/assignment" element={<AssignmentChecker />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/python" element={<CodingAssignment />} />
      </Routes>
    </>
  )
}

export default App
