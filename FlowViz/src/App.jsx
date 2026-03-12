import { useContext, useState } from 'react'
import './App.css'
import FlowDiagram from './components/FlowDiagram'
import InitialScreen from './components/InitialScreen'
import Sidebar from './components/Sidebar'
import { MessageContext } from './context/messageContext'
import { JsonDataContext } from './context/flowJsonContext'

function App() {
  const {message} = useContext(MessageContext)
  const {initialNodes, initialEdges} = useContext(JsonDataContext)
  const [mainScreen, setMainScreen] = useState(false)
  console.log("Initial Nodes: ", initialNodes)
  console.log("Initial Edges: ", initialEdges)
  console.log("main Screen", mainScreen)

  return (
    <>
      <div className='flex flex-col md:flex-row items-stretch min-h-screen w-screen'>
        {mainScreen ? 
         <div className='w-full h-screen flex'>
           <Sidebar />
            {message.length === 0 ?  
              <InitialScreen/> : 
              <FlowDiagram initialNodes={initialNodes} initialEdges={initialEdges}/>
            } 
         </div> 
        : <div 
            className="relative flex flex-col items-center justify-center min-h-screen w-full bg-cover bg-center text-white"
            style={{ backgroundImage: "url('https://i.pinimg.com/736x/22/56/52/225652eb9147936e8dd85b5278b5629d.jpg')" }}
          >
          {/* Dark Overlay for Readability */}
          <div className="absolute inset-0 bg-black/40"></div>

          {/* Content Container */}
          <div className="relative z-10 text-center px-4 -mt-24">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight drop-shadow-lg">
              FLOW<span className="font-bold text-sky-500">VIZ</span>
            </h1>
            <p className="mt-4 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Visualize your workflow with precision. Turn complex data into actionable insights instantly.
            </p>
            
            <div className="mt-10 flex gap-4 justify-center">
              <button
                onClick={()=> {setMainScreen(true)}} 
                className="px-8 py-3 bg-gradient-to-bl from-blue-900/60 to-white/5 hover:opacity-90 backdrop-blur-md rounded-full font-semibold transition border border-white/30 cursor-pointer hover:scale-104 transition ease-in">
                Get Started
              </button>
            </div>
          </div>
        </div>
        }
      </div>
    </>
  )
}

export default App
