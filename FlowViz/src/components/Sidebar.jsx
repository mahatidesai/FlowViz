import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField';
import { IoMdSend } from "react-icons/io";
import { TbLayoutSidebarLeftExpand, TbLayoutSidebarLeftCollapse } from "react-icons/tb";
import { useState, useContext, useEffect, useRef } from 'react';
import { MessageContext } from '../context/messageContext';
import { JsonDataContext } from '../context/flowJsonContext';
import axios from 'axios';
import FlowVizLogo from '../assets/FlowVizLogo.png'

const Sidebar = () => {

    const { message, setMessage } = useContext(MessageContext);
    const { initialNodes, setInitialNodes, initialEdges, setInitialEdges } = useContext(JsonDataContext);

    const [isModalOpen, setIsModalOpen] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [message]);

    const handleMessageSend = async () => {

        if (!newMessage.trim() || isGenerating) return;

        const userMsg = newMessage;
        setNewMessage("");
        setIsGenerating(true);

        const updatedMessages = [
            ...message,
            { sender: "user", text: userMsg }
        ];

        setMessage(prev => [
            ...prev,
            { sender: 'user', text: userMsg },
            { sender: 'server', text: "Generating your flow diagram...", isLoading: true }
        ]);

        try {

            const response = await axios.post('http://localhost:3000/api/generate-flow', {
                text: userMsg,
                history: updatedMessages,
                currentDiagram: {
                    nodes: initialNodes,
                    edges: initialEdges
                }
            });

            const jsonData = response?.data?.flow;

            if (!jsonData?.nodes || !jsonData?.edges) {
                throw new Error("Invalid diagram returned");
            }

            const addedNodes = jsonData.nodes.length - initialNodes.length;

            setInitialNodes(jsonData.nodes);
            setInitialEdges(jsonData.edges);

            setMessage(prev =>
                prev.filter(msg => !msg.isLoading).concat([
                    {
                        sender: 'server',
                        text: `✅ Diagram updated ${
                            addedNodes > 0
                                ? `(${addedNodes} new steps added)`
                                : "(structure modified)"
                        }`
                    }
                ])
            );

        } catch (error) {

            setMessage(prev =>
                prev.filter(msg => !msg.isLoading).concat([
                    { sender: 'server', text: "❌ Error generating diagram." }
                ])
            );

        } finally {
            setIsGenerating(false);
        }
    };

    return (

        <aside className={`transition-all duration-300 ease-in-out border-r border-white/10 ${isModalOpen ? 'w-full md:w-[350px] lg:w-[400px]' : 'w-[60px]'} flex flex-col h-screen`}>

            {/* Header */}

            <div className={`p-4 flex items-center justify-between border-b border-white/5 ${!isModalOpen && 'flex-col gap-4'}`}>

                {isModalOpen && (
                    <div className='flex items-center gap-3'>
                        <img className='w-8 h-8 drop-shadow-[0_0_8px_rgba(24,145,190,0.5)]' src={FlowVizLogo} alt='Logo' />
                        <span className='text-xl font-bold tracking-tight text-white'>
                            Flow<span className='text-[#1891be]'>Viz</span>
                        </span>
                    </div>
                )}

                <button
                    onClick={() => setIsModalOpen(!isModalOpen)}
                    className='p-1.5 rounded-lg hover:bg-white/5 transition-colors text-[#1891be]'
                >
                    {isModalOpen
                        ? <TbLayoutSidebarLeftCollapse size={26} />
                        : <TbLayoutSidebarLeftExpand size={26} />
                    }
                </button>

            </div>

            {isModalOpen && (

                <>
                    {/* Chat Messages */}

                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
                    >

                        {message.map((msg, index) => (

                            <div
                                key={index}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >

                                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm
                                    ${msg.sender === 'user'
                                        ? 'bg-gradient-to-bl from-blue-500/50 to-transparent text-white rounded-tr-none'
                                        : 'bg-slate-800 text-slate-200 border border-white/5 rounded-tl-none'}
                                    ${msg.isLoading ? 'animate-pulse border-[#1891be]/30' : ''}
                                `}>

                                    {msg.text}

                                </div>

                            </div>

                        ))}

                    </div>

                    {/* Input */}

                    <div className="p-2 border-t border-white/5">

                        <div className="flex items-end gap-2 bg-[#010107] rounded-xl p-1.5 border border-slate-700/50">

                            <TextField
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Describe your process..."
                                multiline
                                maxRows={4}
                                variant="standard"
                                fullWidth
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleMessageSend();
                                    }
                                }}
                                InputProps={{
                                    disableUnderline: true,
                                    sx: {
                                        color: 'white',
                                        fontSize: '0.9rem',
                                        px: 1,
                                        py: 1
                                    }
                                }}
                            />

                            <button
                                onClick={handleMessageSend}
                                disabled={!newMessage.trim() || isGenerating}
                                className="mb-1 p-2 bg-[#1891be] hover:bg-[#157da5] text-white rounded-lg transition-all disabled:opacity-50"
                            >
                                <IoMdSend size={20} />
                            </button>

                        </div>

                    </div>
                </>
            )}

        </aside>
    );
};

export default Sidebar;