import { useState } from "react";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true});

const GroqChat = () =>  {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setResponse("");
    
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: input }],
        model: "deepseek-r1-distill-llama-70b",
      });
      setResponse(chatCompletion.choices[0]?.message?.content || "No response");
    } catch (error) {
      setResponse("Error fetching response");
      console.error(error);
    }
    
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          className="border p-2 rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded"
          disabled={loading}
        >
          {loading ? "Loading..." : "Send"}
        </button>
      </form>
      {response && (
        <div className="mt-4 p-2 border rounded bg-gray-100">
          <strong>Response:</strong> {response}
        </div>
      )}
    </div>
  );
}

export default GroqChat;