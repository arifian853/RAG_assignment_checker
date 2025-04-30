import { useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
import Groq from "groq-sdk";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const AssignmentChecker = () => {
  const [files, setFiles] = useState([]);
  const [extractedTexts, setExtractedTexts] = useState([]);
  const [grading, setGrading] = useState([]);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [extractingText, setExtractingText] = useState(false);

  // Optimized file upload handler with memoization
  const handleFileUpload = useCallback(async (event) => {
    const uploadedFiles = Array.from(event.target.files).slice(0, 5);
    
    if (uploadedFiles.length === 0) return;
    
    setFiles(uploadedFiles);
    setExtractingText(true);
    setExtractedTexts([]);
    setGrading([]);

    try {
      const texts = await Promise.all(uploadedFiles.map(readPdfText));
      setExtractedTexts(texts);
    } catch (error) {
      console.error("Error extracting text:", error);
      alert("Terjadi kesalahan saat membaca file PDF. Pastikan file valid.");
    } finally {
      setExtractingText(false);
    }
  }, []);

  const readPdfText = async (file) => {
    if (!file.type.includes('pdf')) {
      throw new Error(`File ${file.name} bukan PDF yang valid`);
    }
    
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async function () {
        try {
          const typedArray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let text = "";
          
          // Process pages in batches for better performance
          const totalPages = pdf.numPages;
          const batchSize = 5;
          
          for (let i = 0; i < totalPages; i += batchSize) {
            const pagePromises = [];
            for (let j = 0; j < batchSize && i + j < totalPages; j++) {
              const pageNum = i + j + 1;
              pagePromises.push(extractPageText(pdf, pageNum));
            }
            const pageTexts = await Promise.all(pagePromises);
            text += pageTexts.join("\n");
          }
          
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const extractPageText = async (pdf, pageNum) => {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    return content.items.map((item) => item.str).join(" ");
  };

  const handleCheckAssignments = async () => {
    if (!instruction.trim()) {
      alert("Harap masukkan instruksi penilaian sebelum melanjutkan.");
      return;
    }

    if (extractedTexts.length === 0) {
      alert("Harap unggah file PDF terlebih dahulu.");
      return;
    }

    setLoading(true);
    setGrading([]);

    try {
      const results = await Promise.all(
        extractedTexts.map(async (text, index) => {
          const response = await groq.chat.completions.create({
            messages: [
              { 
                role: "system", 
                content: "You are an assignment evaluator. Provide detailed feedback and a numerical score (0-100)." 
              },
              { 
                role: "user", 
                content: `${instruction}\n\nTeks tugas:\n${text.substring(0, 15000)}` 
              },
            ],
            model: "llama-3.3-70b-versatile",
          });

          return {
            name: files[index].name,
            grade: response.choices[0]?.message?.content || "Tidak ada respons",
          };
        })
      );

      setGrading(results);
    } catch (error) {
      console.error("Error during grading:", error);
      setGrading([{ name: "Error", grade: "Gagal mendapatkan nilai: " + error.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">
        Pemeriksa Tugas Otomatis
      </h1>
      <p>Model : Llama 3.3 70B Versatile</p>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Unggah File PDF (Maks. 5 file)</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            disabled={extractingText || loading}
          />
          <label 
            htmlFor="file-upload" 
            className="cursor-pointer text-blue-600 hover:text-blue-800"
          >
            {extractingText ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Mengekstrak teks...
              </span>
            ) : (
              <>
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="mt-1">Klik untuk memilih file atau seret dan lepas di sini</p>
              </>
            )}
          </label>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Instruksi Penilaian</label>
        <textarea
          className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="4"
          placeholder="Contoh: Nilai tugas ini berdasarkan kejelasan argumen, penggunaan referensi, dan struktur penulisan. Berikan skor 0-100."
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          disabled={loading}
        />
      </div>

      {extractedTexts.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-2">File yang Diunggah:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center mb-2">
                  <svg className="h-6 w-6 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <strong className="truncate">{file.name}</strong>
                </div>
                <p className="text-sm text-gray-600 line-clamp-3">
                  {extractedTexts[index]?.slice(0, 200)}...
                </p>
              </div>
            ))}
          </div>
          
          <button
            className={`w-full mt-4 p-3 rounded-lg font-medium text-white ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={handleCheckAssignments}
            disabled={loading || !instruction.trim()}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sedang Menilai...
              </span>
            ) : (
              "Periksa dan Nilai"
            )}
          </button>
        </div>
      )}

      {grading.length > 0 && (
        <div className="mt-6 border-t pt-6">
          <h3 className="font-bold text-xl mb-4 text-blue-700">Hasil Penilaian:</h3>
          <div className="space-y-4">
            {grading.map((result, index) => (
              <div key={index} className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-bold text-lg mb-2 flex items-center">
                  <svg className="h-5 w-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  {result.name}
                </h4>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {result.grade}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentChecker;
