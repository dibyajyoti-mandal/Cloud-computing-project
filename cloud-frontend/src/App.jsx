import { useState } from 'react'
import './App.css'
import StockDataPage from './StockDataPage.jsx'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Link } from 'react-router-dom'


function App() {
  return (
    <>

      <Routes>
        <Route path="/" element={
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-200 p-8">
                <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 py-2 mb-4">
                  Welcome to Your App
                </h1>
                <p className="text-xl text-gray-400 mb-8">
                  Navigate to the Stock Analysis page to see the data.
                </p>
                <Link
                  to="/getstockdata"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-300 ease-in-out transform hover:-translate-y-0.5"
                >
                  Go to Stock Data
                </Link>
              </div>

        } />
        <Route path="/getstockdata" element={<StockDataPage />} />
      </Routes>



    </>
  )
}

export default App
