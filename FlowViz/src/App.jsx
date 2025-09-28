import { useContext } from 'react'
import './App.css'
import FlowDiagram from './components/FlowDiagram'
import InitialScreen from './components/InitialScreen'
import Sidebar from './components/Sidebar'
import { MessageContext } from './context/messageContext'
import { JsonDataContext } from './context/flowJsonContext'

function App() {
  const {message} = useContext(MessageContext)
  const {initialNodes, initialEdges} = useContext(JsonDataContext)
  console.log("Initial Nodes: ", initialNodes)
  console.log("Initial Edges: ", initialEdges)

  return (
    <>
      <div className='flex flex-col md:flex-row items-stretch min-h-screen w-screen'>
          <Sidebar />
          {message.length === 0 ?  
            <InitialScreen/> : 
            <FlowDiagram initialNodes={initialNodes} initialEdges={initialEdges}/> 
          }

      </div>
    </>
  )
}

export default App
