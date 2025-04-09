import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const Attendance = () => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceResult, setAttendanceResult] = useState([]);
  const [binaryAttendance, setBinaryAttendance] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usingAI, setUsingAI] = useState(false);
  const fileInputRef = useRef(null);

  // List of mentees
  const menteesList = [
    "Andhika Laksmana Putra Alka",
    "Aggitya Yosafat Hutabarat",
    "Keimazriel Delan",
    "Devin Faiz Faturahman",
    "Nabilah Putri Wijaya",
    "Andhika Reihan Hervito",
    "Vinsensius Fendy Kurniawan",
    "Handy Arfiano Hastyawan",
    "Muhammad Alfin",
    "Vincent Tanjaya",
    "Farraheira Panundaratrisna Fauziah",
    "Adyatma Kevin Aryaputra Ramadhan",
    "Reyhan Zada Virgiwibowo",
    "Samuel Farrel Bagasputra",
    "Devi Kartika",
    "Fairah Almira",
    "Scudetto Ciano Syam",
    "Abila Prastika Navilata",
    "Syahana Arman",
    "Kevin Yoga Pratama",
    "Rafi Irsyad Saharso",
    "Harjuno Abdullah",
    "Devina Benhans",
    "Muhammad Fatih Zain",
    "Rifat Fauzan",
    "Mustafa Fauzy Tompoh",
    "Bryan Eugene",
    "Martin Marcelino Tarigan",
    "Muhammad Nasywan Sulthan Muyassar Arhata",
    "Patricia Noerant Pinkan Andjani",
    "Muhammad Rahmananda Arief Wibisono",
    "Ahmad Fadli Hutasuhut",
    "Natasha Rahima",
    "Muhammad Rahmad"
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setAttendanceData(null);
    setAttendanceResult([]);
    setBinaryAttendance('');
    setCopied(false);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        processAttendanceData(results.data);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setLoading(false);
        alert('Error parsing CSV file. Please check the file format.');
      }
    });
  };

  const processAttendanceData = async (data) => {
    setAttendanceData(data);

    // Extract and clean participant names from Zoom CSV
    const participantNames = data
      .filter(row => {
        // Check for the name field in Zoom CSV
        return row['Name (original name)'] && row['Name (original name)'].trim() !== '';
      })
      .map(row => {
        // Get the name and clean it
        const fullName = row['Name (original name)'].trim();
        
        // Remove prefixes like "AI_" or "Artificial Intelligence_"
        let cleanName = fullName
          .replace(/^AI_/i, '')
          .replace(/^Artificial Intelligence_/i, '')
          .replace(/^IL - /i, ''); // Remove "IL - " prefix
        
        // Extract name from parentheses if it exists
        const parenthesesMatch = cleanName.match(/\(([^)]+)\)/);
        if (parenthesesMatch) {
          // Use the name in parentheses if it seems more complete
          const nameInParentheses = parenthesesMatch[1]
            .replace(/^[^a-zA-Z]+/, '') // Remove non-alphabetic characters at start
            .replace(/\d{8,}_/, '')     // Remove 8+ digit numbers followed by underscore
            .replace(/_\d+/, '')        // Remove underscore followed by numbers
            .replace(/^\d+[A-Z]+\d+_/, ''); // Remove patterns like "3IA09_"
          
          // Use name in parentheses if it's not just a number or code
          if (nameInParentheses.match(/[a-zA-Z]{3,}/)) {
            cleanName = nameInParentheses;
          }
        }
        
        // Remove parentheses and their contents
        cleanName = cleanName.replace(/\s*\([^)]*\)/g, '');
        
        // Remove any student IDs or other numeric identifiers
        cleanName = cleanName
          .replace(/\d{8,}_/, '')     // Remove 8+ digit numbers followed by underscore
          .replace(/\d{8,}/, '')      // Remove 8+ digit numbers
          .replace(/_\d+/, '')        // Remove underscore followed by numbers
          .replace(/^[^a-zA-Z]+/, '') // Remove non-alphabetic characters at start
          .replace(/\s*\(Infinite Learning Indonesia\)/, '') // Remove organization name
          .trim();
        
        return {
          original: fullName,
          clean: cleanName
        };
      });

    console.log("Extracted participant names:", participantNames);

    if (usingAI) {
      await processWithAI(participantNames);
    } else {
      processWithoutAI(participantNames);
    }
    
    setLoading(false);
  };

  const processWithoutAI = (participantNames) => {
    // Check attendance for each mentee using improved string matching
    const attendanceResults = menteesList.map(mentee => {
      // Split mentee name into parts for more flexible matching
      const menteeParts = mentee.toLowerCase().split(' ');
      
      // Try to find a match among participants
      const matchingParticipant = participantNames.find(participant => {
        const participantLower = participant.clean.toLowerCase();
        const participantParts = participantLower.split(' ');
        
        // Full name exact match
        if (participantLower === mentee.toLowerCase()) {
          return true;
        }
        
        // Full name contains match
        if (participantLower.includes(mentee.toLowerCase()) || 
            mentee.toLowerCase().includes(participantLower)) {
          return true;
        }
        
        // Special case for Keimazriel Delan who might appear as Keimaz Delan
        if (mentee === "Keimazriel Delan" && 
            (participantLower.includes("keimaz") || participantLower.includes("delan"))) {
          return true;
        }
        
        // Special case for Farraheira with abbreviated middle/last name
        if (mentee === "Farraheira Panundaratrisna Fauziah" && 
            (participantLower.includes("farraheira") && 
             (participantLower.includes("p.f") || participantLower.includes("pf")))) {
          return true;
        }
        
        // Check for abbreviated names (first name + initials)
        if (menteeParts.length >= 3) {
          const firstName = menteeParts[0];
          // Check if first name matches and there are initials that could match middle/last names
          if (participantLower.includes(firstName)) {
            // Look for patterns like "P.F" or "P.F." or "PF" that could be initials
            const initialsPattern = /([a-z]\.)+[a-z]\.?/i;
            const initialsMatch = participantLower.match(initialsPattern);
            
            if (initialsMatch) {
              // Get initials from the mentee's name
              const menteeInitials = menteeParts.slice(1).map(part => part[0].toLowerCase()).join('');
              // Get the matched initials from participant name
              const matchedInitials = initialsMatch[0].toLowerCase().replace(/\./g, '');
              
              // Check if initials match
              if (menteeInitials.includes(matchedInitials) || matchedInitials.includes(menteeInitials)) {
                return true;
              }
            }
          }
        }
        
        // Check if first and last name are present
        if (menteeParts.length >= 2) {
          const firstName = menteeParts[0];
          const lastName = menteeParts[menteeParts.length - 1];
          
          // Both first and last name match
          if (participantLower.includes(firstName) && participantLower.includes(lastName)) {
            return true;
          }
          
          // For names with 3+ parts, check if first and middle names match
          if (menteeParts.length >= 3) {
            const middleName = menteeParts[1];
            if (participantLower.includes(firstName) && participantLower.includes(middleName)) {
              return true;
            }
          }
        }
        
        // Check for significant name part matches
        let significantPartMatches = 0;
        for (const part of menteeParts) {
          if (part.length <= 3) continue; // Skip short parts
          
          if (participantParts.some(pPart => 
            pPart === part || pPart.includes(part) || part.includes(pPart)
          )) {
            significantPartMatches++;
          }
        }
        
        // If we match 2+ significant parts, consider it a match
        if (significantPartMatches >= 2) {
          return true;
        }
        
        return false;
      });

      return {
        name: mentee,
        present: !!matchingParticipant,
        value: matchingParticipant ? 1 : 0,
        matchedWith: matchingParticipant ? matchingParticipant.original : null
      };
    });

    setAttendanceResult(attendanceResults);
    updateBinaryAttendance(attendanceResults);
  };

  const processWithAI = async (participantNames) => {
    try {
      // Prepare the prompt for the AI with clearer instructions and examples
      const prompt = `
I need to match these expected attendee names with actual Zoom participant names.
The Zoom names have prefixes like "AI_" or "Artificial Intelligence_" and sometimes include student IDs or other information in parentheses.

Expected Attendees:
${menteesList.join("\n")}

Actual Zoom Participants (original names):
${participantNames.map(p => p.original).join("\n")}

Cleaned Zoom Participants (for reference):
${participantNames.map(p => p.clean).join("\n")}

Examples of matching:
- "AI_Kevin Yoga Pratama" should match "Kevin Yoga Pratama"
- "AI_Devina Benhans" should match "Devina Benhans"
- "AI_Devin Faiz Faturahman (Devin Faiz Faturahman)" should match "Devin Faiz Faturahman"
- "Artificial Intelligence_Muhammad Rahmad" should match "Muhammad Rahmad"

Return a JSON object with this exact format:
{
  "results": [
    {"name": "Full Expected Name 1", "present": true/false},
    {"name": "Full Expected Name 2", "present": true/false},
    ...
  ]
}
`;

      console.log("Sending AI request with participants:", participantNames.length);
      
      // Call Groq API
      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      // Parse the AI response
      const responseContent = response.choices[0]?.message?.content || "{}";
      console.log("AI response:", responseContent);
      
      try {
        // Try to parse the JSON response
        const parsedResponse = JSON.parse(responseContent);
        
        if (Array.isArray(parsedResponse.results)) {
          const results = parsedResponse.results;
          
          // Map the AI results to our expected format
          const attendanceResults = menteesList.map(mentee => {
            const match = results.find(r => 
              r.name.toLowerCase() === mentee.toLowerCase() ||
              r.name.toLowerCase().includes(mentee.toLowerCase())
            );
            const isPresent = match ? match.present : false;
            
            return {
              name: mentee,
              present: isPresent,
              value: isPresent ? 1 : 0
            };
          });
          
          setAttendanceResult(attendanceResults);
          updateBinaryAttendance(attendanceResults);
        } else {
          console.error("Unexpected AI response format:", parsedResponse);
          processWithoutAI(participantNames);
        }
      } catch (error) {
        console.error("Error parsing AI response:", error, responseContent);
        processWithoutAI(participantNames);
      }
    } catch (error) {
      console.error("Error calling Groq API:", error);
      processWithoutAI(participantNames);
    }
  };

  const updateBinaryAttendance = (results) => {
    // Keep the display format as space-separated for the UI
    const binaryString = results.map(result => result.value).join(' ');
    setBinaryAttendance(binaryString);
  };

  const copyToClipboard = () => {
    // For clipboard, format as one value per line
    const verticalBinaryString = binaryAttendance.split(' ').join('\n');
    navigator.clipboard.writeText(verticalBinaryString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">
        Zoom Attendance Checker
      </h1>

      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            ref={fileInputRef}
          />
          <button
            onClick={triggerFileInput}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Upload Zoom CSV File'}
          </button>
          <p className="mt-2 text-sm text-gray-500">
            Upload the participants CSV file exported from Zoom
          </p>
          
          <div className="mt-4 flex items-center justify-center">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600"
                checked={usingAI}
                onChange={() => setUsingAI(!usingAI)}
                disabled={loading}
              />
              <span className="ml-2 text-gray-700">Use AI for name matching (Llama 3.1 8B)</span>
            </label>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center p-4">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm rounded-md text-white bg-blue-500">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {usingAI ? 'Processing with AI...' : 'Processing...'}
          </div>
        </div>
      )}

      {attendanceData && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Attendance Results</h2>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">
                Present: {attendanceResult.filter(r => r.present).length}/{menteesList.length}
              </span>
              <button
                onClick={copyToClipboard}
                className={`px-3 py-1 rounded ${
                  copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Binary'}
              </button>
            </div>
          </div>

          <div className="bg-gray-100 p-3 rounded-lg mb-4 font-mono text-sm overflow-x-auto">
            {binaryAttendance.split(' ').map((value, index) => (
              <div key={index} className="flex items-center mb-1">
                <span className="w-8 inline-block text-right mr-2">{index + 1}.</span>
                <span className={value === '1' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {value}
                </span>
                <span className="ml-2 text-xs text-gray-600 truncate">
                  {menteesList[index]}
                </span>
              </div>
            ))}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceResult.map((result, index) => (
                  <tr key={index} className={result.present ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.name}
                      {result.matchedWith && (
                        <div className="text-xs text-gray-500 mt-1">
                          Matched with: {result.matchedWith}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        result.present 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.present ? 'Present' : 'Absent'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!attendanceData && !loading && (
        <div className="text-center text-gray-500 p-10">
          <p>Upload a Zoom CSV file to check attendance</p>
        </div>
      )}
    </div>
  );
};
