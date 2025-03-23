import React from 'react'
import { Link } from 'react-router-dom'

export const Home = () => {
  return (
    <div>HEHE
        <Link to="/groq-chat">Groq Chat</Link>
        <Link to="/assignment">Assigment Checker</Link>
    </div>
  )
}
