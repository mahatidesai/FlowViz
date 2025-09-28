import {createContext, useState} from 'react'

export const MessageContext = createContext(null);

export const MessageProvider = ({children}) => {
    // Creating the message state
    const [message, setMessage] = useState([])
    
    return(
        <MessageContext.Provider value={{message, setMessage}}>
            {children}
        </MessageContext.Provider>
    )
}

export default MessageProvider