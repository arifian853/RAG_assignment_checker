import { Routes, Route} from 'react-router-dom'
import './App.css'
import { Home } from './pages/Home'
import GroqChat from './pages/GroqChat'
import AssignmentChecker from './pages/AssignmentChecker'

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/groq-chat" element={<GroqChat />} />
        <Route path="/assignment" element={<AssignmentChecker />} />
      </Routes>
    </>
  )
}

export default App
