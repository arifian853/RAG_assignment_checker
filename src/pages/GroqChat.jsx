/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import Groq from "groq-sdk";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true});

// Available Groq models
const AVAILABLE_MODELS = [
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
  { id: "llama-3.1-70b-instant", name: "Llama 3.1 70B Instant" },
  { id: "llama-3.1-405b-instant", name: "Llama 3.1 405B Instant" },
  { id: "deepseek-r1-distill-llama-70b", name: "Deepseek R1 Distill Llama 70B" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
  { id: "gemma-7b-it", name: "Gemma 7B" },
];

const GroqChat = () => {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [remainingChats, setRemainingChats] = useState(3);
  const [chatHistory, setChatHistory] = useState([]);

  // Load remaining chats from localStorage on component mount
  useEffect(() => {
    const storedChats = localStorage.getItem("remainingChats");
    if (storedChats !== null) {
      setRemainingChats(parseInt(storedChats));
    }

    const storedHistory = localStorage.getItem("chatHistory");
    if (storedHistory) {
      setChatHistory(JSON.parse(storedHistory));
    }
  }, []);

  // Update localStorage when remaining chats change
  useEffect(() => {
    localStorage.setItem("remainingChats", remainingChats.toString());
  }, [remainingChats]);

  // Update localStorage when chat history changes
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  }, [chatHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    if (remainingChats <= 0) {
      toast.error("You've reached your chat limit (3 chats). Please try again later.");
      return;
    }
    
    setLoading(true);
    
    // Add user message to chat history
    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: input }
    ];
    setChatHistory(updatedHistory);
    
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: updatedHistory.map(msg => ({ role: msg.role, content: msg.content })),
        model: selectedModel,
      });
      
      const responseContent = chatCompletion.choices[0]?.message?.content || "No response";
      
      // Add AI response to chat history
      setChatHistory([
        ...updatedHistory,
        { role: "assistant", content: responseContent }
      ]);
      
      setRemainingChats(prev => prev - 1);
      setInput("");
    } catch (error) {
      toast.error("Error fetching response: " + (error.message || "Unknown error"));
      console.error(error);
    }
    
    setLoading(false);
  };

  // Removing resetChatLimit function as it's no longer needed

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-lg shadow-md">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">
        Groq AI Chat
      </h1>
      
      <div className="mb-4 flex justify-between items-center">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1 text-gray-700">Select Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="ml-4 text-right">
          <p className="text-sm font-medium text-gray-700 mb-1">Remaining Chats</p>
          <div className="text-lg font-bold text-blue-600">{remainingChats} / 3</div>
          {/* Reset button removed */}
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-500 h-full flex items-center justify-center">
            <p>Start a conversation with Groq AI</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatHistory.map((message, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg ${
                  message.role === "user" 
                    ? "bg-blue-100 ml-8" 
                    : "bg-gray-100 mr-8"
                }`}
              >
                <div className="font-bold mb-1">
                  {message.role === "user" ? "You" : "Groq AI"}
                </div>
                {message.role === "user" ? (
                  <div>{message.content}</div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          className="flex-1 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          disabled={loading || remainingChats <= 0}
        />
        <button
          type="submit"
          className={`px-4 py-2 rounded-lg font-medium text-white ${
            loading || remainingChats <= 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          disabled={loading || remainingChats <= 0}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            "Send"
          )}
        </button>
      </form>
      
      {remainingChats <= 0 && (
        <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
          <p className="font-medium">You've reached your chat limit</p>
          <p className="text-sm">This limit is in place to prevent abuse as this is a public repository.</p>
        </div>
      )}
    </div>
  );
};

export default GroqChat;