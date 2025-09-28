import {useState, createContext} from 'react';

export const JsonDataContext = createContext(null) 

const JsonDataProvider = ({children}) => {
    const [initialNodes, setInitialNodes] = useState([])
    const [initialEdges, setInitialEdges] = useState([])

    return(
        <JsonDataContext.Provider 
        value={{initialNodes, initialEdges, setInitialNodes, setInitialEdges}}>
            {children}
        </JsonDataContext.Provider>
    )
}
export default JsonDataProvider