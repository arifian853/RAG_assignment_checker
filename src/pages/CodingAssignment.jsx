import React, { useState, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const CodingAssignment = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are an expert Python programming instructor with extensive experience in code evaluation and academic assessment. Your role is to provide comprehensive, constructive feedback on student Python assignments. Analyze the code thoroughly for functionality, code quality, best practices, and educational value. Provide detailed feedback including strengths, areas for improvement, and specific suggestions for enhancement. Always conclude your evaluation with a numerical score based on the criteria provided."
  );
  const [instructions, setInstructions] = useState("");
  const [assessment, setAssessment] = useState("");
  const [thinking, setThinking] = useState("");
  const [loading, setLoading] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    // Check if file is a Python file
    if (!uploadedFile.name.endsWith('.py')) {
      toast.error("Please upload a Python (.py) file");
      return;
    }

    setFile(uploadedFile);
    setFileName(uploadedFile.name);

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent(e.target.result);
    };
    reader.readAsText(uploadedFile);
  };

  const handleAssess = async () => {
    if (!file) {
      toast.error("Please upload a Python file first");
      return;
    }

    if (!instructions.trim()) {
      toast.error("Please provide assessment instructions");
      return;
    }

    setLoading(true);
    setAssessment("");
    setThinking("");
    setShowThinking(false);

    try {
      const prompt = `${systemPrompt}

Instruksi Penilaian:
${instructions}

KODE PYTHON:
\`\`\`python
${fileContent}
\`\`\`

Harap berikan penilaian terperinci atas kode ini berdasarkan petunjuk di atas. Sertakan:
1. Evaluasi keseluruhan (kekuatan dan kelemahan)
2. Penilaian kualitas kode (keterbacaan, organisasi, komentar)
3. Penilaian fungsionalitas (apakah kode berfungsi seperti yang diharapkan?)
4. Umpan balik khusus tentang area yang perlu ditingkatkan
5. Kesesuaian dengan INSTRUKSI PENILAIAN di atas
6. Skor numerik dari rentang 65-95 jika sesuai dengan instruksi penilaian di atas
7. Berikan nilai tambahan untuk setiap improvisasi yang dilakukan, misal mengganti variabel atau menambahkan komentar, atau menggunakan fungsi yang lebih baik. Atau mengganti isi konten dengan nama sendiri atau nama project.

Jika Anda perlu berpikir tentang kode ini, letakkan pemikiran Anda di dalam tag <think>...</think>. Bagian ini akan ditampilkan secara terpisah dari penilaian utama.

Format respons Anda menggunakan Markdown agar lebih mudah dibaca. Gunakan judul, poin-poin, dan blok kode jika sesuai.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseContent = response.text() || "No assessment generated";
      
      // Extract thinking and assessment parts
      const thinkMatch = responseContent.match(/<think>([\s\S]*?)<\/think>/);
      
      if (thinkMatch) {
        // Extract thinking content
        const thinkContent = thinkMatch[1].trim();
        setThinking(thinkContent);
        
        // Remove thinking part from the main assessment
        const cleanAssessment = responseContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        setAssessment(cleanAssessment);
      } else {
        // No thinking tags found, use the whole response as assessment
        setAssessment(responseContent);
      }
    } catch (error) {
      console.error("Error assessing code:", error);
      toast.error("Error assessing code: " + (error.message || "Unknown error"));
    }

    setLoading(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const toggleThinking = () => {
    setShowThinking(!showThinking);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <ToastContainer position="top-right" autoClose={3000} />

      <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">
        Python Assignment Checker
      </h1>
      <p>Model : Gemini 2.5 Flash</p>

      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            accept=".py"
            onChange={handleFileUpload}
            className="hidden"
            ref={fileInputRef}
          />
          <button
            onClick={triggerFileInput}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {fileName ? "Change Python File" : "Upload Python File"}
          </button>
          {fileName && (
            <p className="mt-2 text-sm font-medium text-green-600">
              File loaded: {fileName}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Upload a Python (.py) file to assess
          </p>
        </div>
      </div>

      {fileContent && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Code Preview</h2>
          <div className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
              <code>{fileContent}</code>
            </pre>
          </div>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">System Prompt (Template Evaluator)</label>
        <textarea
          className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="4"
          placeholder="Masukkan system prompt untuk mengatur peran dan gaya evaluasi AI..."
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Template ini mengatur bagaimana AI akan berperan sebagai evaluator Python. Anda bisa memodifikasi sesuai kebutuhan.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-700">
          Instruksi Penilaian Spesifik
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Contoh: Nilai tugas ini berdasarkan implementasi algoritma binary search (40%), efisiensi kode (25%), keterbacaan dan dokumentasi (20%), dan penanganan edge cases (15%). Berikan skor 0-100 dengan penjelasan detail untuk setiap aspek."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          disabled={loading}
        ></textarea>
        <p className="text-xs text-gray-500 mt-1">
          Masukkan kriteria penilaian spesifik, bobot nilai, dan aspek-aspek yang ingin dievaluasi untuk kode Python.
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={handleAssess}
          className={`w-full px-4 py-3 rounded-lg font-medium text-white ${
            loading || !fileContent
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          disabled={loading || !fileContent}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Assessing with Gemini...
            </span>
          ) : (
            "Assess Assignment"
          )}
        </button>
      </div>

      {assessment && (
        <div className="border rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h2 className="text-lg font-semibold">Assessment Results</h2>
          </div>
          <div className="p-4 prose prose-blue max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {assessment}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {thinking && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center cursor-pointer" onClick={toggleThinking}>
            <h2 className="text-lg font-semibold">AI Thinking Process</h2>
            <button className="text-gray-500 hover:text-gray-700">
              {showThinking ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          {showThinking && (
            <div className="p-4 prose prose-blue max-w-none bg-yellow-50">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {thinking}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
