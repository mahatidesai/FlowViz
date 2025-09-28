import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField';
import { IoMdSend } from "react-icons/io";
import { TbSquareRoundedArrowLeftFilled } from "react-icons/tb";
import { useState, useContext } from 'react';
import { MessageContext } from '../context/messageContext';
import { JsonDataContext } from '../context/flowJsonContext';
import axios from 'axios';
import FlowVizLogo from '../assets/FlowVizLogo.png'

const Sidebar = () => {
    // Contexts
    const { message, setMessage } = useContext(MessageContext);
    const { setInitialNodes, setInitialEdges } = useContext(JsonDataContext);

    // States
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [newMessage, setNewMessage] = useState('');

    // Sending Message and getting the response
    const handleMessageSend = async () => {
        if (!newMessage.trim()) return;

        // Add user + loading messages together
        setMessage(prev => [
            ...prev,
            { sender: 'user', text: newMessage },
            { sender: 'server', text: "We are generating the flow diagram. This may take a few seconds." }
        ]);

        try {
            // Fetch the data
            const response = await axios.post('http://localhost:3000/api/generate-flow', { text: newMessage });
            setNewMessage('');
            if (response.status === 200) {
                // Remove loading message
                setMessage(prev => prev.filter(msg => msg.text !== "Your flow diagram is ready."));

                // Parse JSON safely
                try {
                    const jsonData = response.data.flow;   
                    console.log("THis is jsonData: ", jsonData)

                    console.log("Nodes:", jsonData.nodes);
                    console.log("Edges:", jsonData.edges);

                    setInitialNodes(jsonData.nodes);    
                    setInitialEdges(jsonData.edges);

                    setMessage(prev => [...prev, { sender: 'server', text: "✅ Flow diagram generated successfully!" }]);
                } catch (err) {
                    console.error("JSON parse error:", err.message);
                    setMessage(prev => [...prev, { sender: 'server', text: "⚠️ Invalid JSON returned. Please try again." }]);
                }
            } else {
                setMessage(prev => prev.map(msg =>
                    msg.text === "We are generating the flow diagram. This may take a few seconds."
                        ? { ...msg, text: "❌ Cannot generate the diagram. Please try again later." }
                        : msg
                ));
            }
        } catch (error) {
            console.error("Request error:", error.message);
            setMessage(prev => prev.map(msg =>
                msg.text === "We are generating the flow diagram. This may take a few seconds."
                    ? { ...msg, text: "❌ Server error. Please check backend." }
                    : msg
            ));
        }

        
    };

    return (
        isModalOpen ?
            <Box className="flex flex-col justify-between p-2 h-[60vh] md:h-screen w-full md:w-[32vw] lg:w-[28vw] bg-[#252525]">
                {/* ---------------- Top Bar ----------------------- */}
                <div className='flex flex-row flex-wrap gap-2 justify-between w-full items-center'>
                    <div className='w-auto md:w-full flex flex-row items-center gap-2 text-xl md:text-2xl font-bold text-[#1891be] text-start '>
                        <img className='w-6 h-6 md:w-8 md:h-8' src={FlowVizLogo} alt='FlowViz Logo'></img>
                        <span>FlowViz</span>
                    </div>
                    <div onClick={() => { setIsModalOpen(!isModalOpen) }} className='cursor-pointer'>
                        <TbSquareRoundedArrowLeftFilled size={25} color={'#1891be'} />
                    </div>
                </div>

                {/* -------------- Messages ------------------------- */}
                <div className="flex flex-col w-full h-full mt-4 mb-3 overflow-y-auto custom-scrollbar">
                    {message.map((msg, index) => (
                        <div key={index} className={`p-3 text-sm mt-3 w-[85%] ${
                            msg.sender === 'user'
                                ? 'text-start self-end bg-[#151515] rounded-tr-2xl rounded-tl-2xl rounded-bl-2xl'
                                : 'text-start bg-gray-800 rounded-tr-2xl rounded-tl-2xl rounded-br-2xl'
                        }`}>
                            {msg.text}
                        </div>
                    ))}
                </div>

                {/* ---------------------- Bottom Bar ----------------------------- */}
                <div className=" w-full flex flex-row gap-2 items-center self-end justify-between">
                    <TextField
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        id="outlined-multiline-flexible"
                        label="Enter text"
                        multiline
                        sx={{
                            width: '100%',
                            "& .MuiInputBase-input": { color: "white", padding: "1px 2px" },
                            "& .MuiInputLabel-root": { color: "white" },
                            "& .MuiInputLabel-root.Mui-focused": { color: "white" },
                            "& .MuiOutlinedInput-root": {
                                "& fieldset": { borderColor: "white" },
                                "&:hover fieldset": { borderColor: "gray" },
                                "&.Mui-focused fieldset": { borderColor: "white" },
                            },
                        }}
                    />
                    <Box onClick={()=> {
                        handleMessageSend()
                        setNewMessage('')}} 
                        className="cursor-pointer h-10 w-10 shrink-0 rounded-3xl bg-[#1891be] flex items-center justify-center">
                        <div className='text-white'>
                            <IoMdSend size={20} />
                        </div>
                    </Box>
                </div>
            </Box>
            :
            <div className='flex flex-row justify-between self-start items-center p-2 w-full'>
                <div className='text-xl md:text-2xl font-bold text-[#1891be] text-start'>
                    FloViz
                </div>
                <div className={'self-start mt-2 ml-2 cursor-pointer'} onClick={() => { setIsModalOpen(!isModalOpen) }}>
                    <TbSquareRoundedArrowLeftFilled size={25} color={'#1891be'} />
                </div>
            </div>
    );
};
export default Sidebar;
