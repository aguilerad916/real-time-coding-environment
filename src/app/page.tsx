"use client";
import { useState, useRef, useEffect, ChangeEvent } from "react";
import { io, Socket } from "socket.io-client";
import AIEnhancedEditor from "@/components/AiEnhancedEditor";
import { UserIcon } from "@/components/Icons";
import AnimatedUserCounter from "@/components/AnimatedUserCounter";

export default function Home() {
  const [code, setCode] = useState("// Write your JavaScript code here\nconsole.log('Hello, world!');");
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript');
  const [theme, setTheme] = useState("vs-dark");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionMode, setExecutionMode] = useState<'client' | 'server'>('client');
  const [roomId, setRoomId] = useState("");
  const [userCount, setUserCount] = useState(0);
  const [isRemoteUserTyping, setIsRemoteUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!roomId) return;
    
    const initializeRoom = async () => {
      try {
        // Initialize socket connection
        fetch("/api/socket");
        socketRef.current = io({ path: "/api/socket" });
        
        socketRef.current.on("connect", () => {
          socketRef.current?.emit("join-room", roomId);
        });
        
        socketRef.current.on("code-update", (newCode) => {
          console.log("Received code-update event", newCode);
          setCode(prev => prev !== newCode ? newCode : prev);
        });
        
        socketRef.current.on("language-update", (newLanguage: 'javascript' | 'python') => {
          console.log("Received language-update event", newLanguage);
          setLanguage(newLanguage);
          
          // If switching to Python, force server-side execution
          if (newLanguage === 'python') {
            setExecutionMode('server');
          }
        });
        
        socketRef.current.on("room-data", (data: { code: string, language: 'javascript' | 'python', users: number }) => {
          console.log("Received room-data event", data);
          if (data.code) {
            setCode(data.code);
          }
          if (data.language) {
            setLanguage(data.language);
            
            // If switching to Python, force server-side execution
            if (data.language === 'python') {
              setExecutionMode('server');
            }
          }
          if (data.users !== undefined) {
            setUserCount(data.users);
          }
        });
        
        // Listen for user count updates
        socketRef.current.on("user-count", (count: number) => {
          console.log("Received user-count event", count);
          
          // Just update the count without showing notifications
          setUserCount(count);
        });
        
        // Listen for typing indicator
        socketRef.current.on("user-typing", (isTyping: boolean) => {
          setIsRemoteUserTyping(isTyping);
        });
        
      } catch (error) {
        console.error("Connection error:", error);
      }
    };
  
    initializeRoom();
  
    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      
      // Send code to other collaborators
      if (roomId) {
        console.log("Emitting code-change event", { roomId, code: value, language });
        socketRef.current?.emit("code-change", { roomId, code: value, language });
        
        // Send typing indicator
        socketRef.current?.emit("typing", { roomId, isTyping: true });
        
        // Clear any existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Set a new timeout to stop the typing indicator after 1.5 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current?.emit("typing", { roomId, isTyping: false });
        }, 1500);
      }
    }
  };
  
  const handleLanguageChange = (newLang: 'javascript' | 'python') => {
    setLanguage(newLang);
    
    // Set default code snippet based on selected language if code is empty or just the default
    const isDefaultJsCode = code.trim() === "// Write your JavaScript code here\nconsole.log('Hello, world!');" || code.trim() === "";
    const isDefaultPyCode = code.trim() === "# Write your Python code here\nprint('Hello, world!')" || code.trim() === "";
    
    if (isDefaultJsCode || isDefaultPyCode) {
      if (newLang === 'python') {
        setCode("# Write your Python code here\nprint('Hello, world!')");
      } else {
        setCode("// Write your JavaScript code here\nconsole.log('Hello, world!');");
      }
    }
    
    // Python can only run server-side
    if (newLang === 'python') {
      setExecutionMode('server');
    }
    
    // Notify other users of language change
    if (roomId) {
      socketRef.current?.emit("code-change", { roomId, code, language: newLang });
    }
  };

  const executeCode = async () => {
    setIsRunning(true);
    setOutput("");
    
    try {
      if (language === 'python') {
        // Python code always runs server-side
        await executePythonServerSide();
      } else if (executionMode === 'client') {
        executeJavaScriptClientSide();
      } else {
        await executeJavaScriptServerSide();
      }
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  const executeJavaScriptClientSide = () => {
    // Create a safe execution environment
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    
    let outputText = "";
    
    // Override console methods to capture output
    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      outputText += message + '\n';
      originalConsoleLog(...args);
    };
    
    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      outputText += 'Error: ' + message + '\n';
      originalConsoleError(...args);
    };
    
    console.warn = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      outputText += 'Warning: ' + message + '\n';
      originalConsoleWarn(...args);
    };
    
    console.info = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      outputText += 'Info: ' + message + '\n';
      originalConsoleInfo(...args);
    };
    
    try {
      // Execute the JavaScript code
      eval(code);
    } catch (error) {
      outputText += `Runtime Error: ${error instanceof Error ? error.message : String(error)}\n`;
    } finally {
      // Restore original console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.info = originalConsoleInfo;
      
      setOutput(outputText);
    }
  };
  
  const executeJavaScriptServerSide = async () => {
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute JavaScript code');
      }
      
      // Make sure we're getting just the output string
      setOutput(typeof data.output === 'string' ? data.output : JSON.stringify(data.output));
    } catch (error) {
      setOutput(`Server Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const executePythonServerSide = async () => {
    try {
      const response = await fetch('/api/execute-python', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute Python code');
      }
      
      // Make sure we're getting just the output string
      setOutput(typeof data.output === 'string' ? data.output : JSON.stringify(data.output));
    } catch (error) {
      setOutput(`Server Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const downloadCode = () => {
    // Determine file extension based on language
    const fileExtension = language === 'python' ? '.py' : '.js';
    const mimeType = language === 'python' ? 'text/plain' : 'text/javascript';
    
    // Create a blob with the current code
    const blob = new Blob([code], { type: mimeType });
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element
    const a = document.createElement('a');
    a.href = url;
    a.download = `code${fileExtension}`; // Filename with appropriate extension
    
    // Append to the body, click, and remove
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle file upload
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.js') && !fileName.endsWith('.py')) {
      setOutput("Error: Only .js and .py files are supported");
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    // Determine language based on file extension
    const newLanguage = fileName.endsWith('.py') ? 'python' : 'javascript';
    setLanguage(newLanguage);
    
    // If switching to Python, force server-side execution
    if (newLanguage === 'python') {
      setExecutionMode('server');
    }
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setCode(content);
        
        // Notify other users if in a room
        if (roomId) {
          socketRef.current?.emit("code-change", { roomId, code: content, language: newLanguage });
        }
      }
    };
    
    reader.onerror = () => {
      setOutput("Error: Failed to read the file");
    };
    
    reader.readAsText(file);
    
    // Reset file input so the same file can be uploaded again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Code Collab Editor</h1>
        
        {/* User counter display */}
        {roomId && (
          <AnimatedUserCounter 
            count={userCount} 
            className="bg-gray-200 dark:bg-gray-700"
          />
        )}
      </div>
      
      {/* Room ID input with enhanced UI */}
      <div className="mb-4">
        <label htmlFor="roomId" className="block text-sm font-medium mb-1">
          Room ID
        </label>
        <div className="flex">
          <input
            id="roomId"
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="flex-1 p-2 border rounded-l bg-white dark:bg-gray-800 text-black dark:text-white"
            placeholder="Enter a room ID to collaborate"
          />
          <button
            onClick={() => {
              // Generate a random room ID if empty
              if (!roomId) {
                const newRoomId = Math.random().toString(36).substring(2, 10);
                setRoomId(newRoomId);
                
                // Give time for the state to update before connecting
                setTimeout(() => {
                  socketRef.current?.disconnect();
                  fetch("/api/socket");
                  socketRef.current = io({ path: "/api/socket" });
                  socketRef.current.emit("join-room", newRoomId);
                }, 100);
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700 transition-colors"
          >
            {roomId ? "Connected" : "Generate Room"}
          </button>
        </div>
        {roomId && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Share this Room ID with others to collaborate in real-time. {userCount > 1 ? `${userCount - 1} other ${userCount - 1 === 1 ? 'person is' : 'people are'} currently collaborating with you.` : 'No one else has joined yet.'}
          </p>
        )}
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <label htmlFor="language" className="block text-sm font-medium mb-1">
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as 'javascript' | 'python')}
            className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="theme" className="block text-sm font-medium mb-1">
            Theme
          </label>
          <select
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
          >
            <option value="vs-dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        
        <div className="flex-1">
          <label htmlFor="executionMode" className="block text-sm font-medium mb-1">
            Execution Mode
          </label>
          <select
            id="executionMode"
            value={executionMode}
            onChange={(e) => setExecutionMode(e.target.value as 'client' | 'server')}
            className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
            disabled={language === 'python'} // Disable for Python as it can only run server-side
          >
            <option value="client" disabled={language === 'python'}>Client-side (Browser)</option>
            <option value="server">Server-side</option>
          </select>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-4 flex-grow">
        <div className="flex-1 min-h-[400px] border rounded overflow-hidden relative">
          {/* Typing indicator */}
          {isRemoteUserTyping && roomId && userCount > 1 && (
            <div className="absolute bottom-4 left-4 bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs z-10 flex items-center">
              <span className="mr-2">Someone is typing</span>
              <span className="flex">
                <span className="animate-bounce mx-0.5">.</span>
                <span className="animate-bounce mx-0.5 animation-delay-200">.</span>
                <span className="animate-bounce mx-0.5 animation-delay-400">.</span>
              </span>
            </div>
          )}
          
          <AIEnhancedEditor
            value={code}
            onChange={handleEditorChange}
            language={language}
            theme={theme}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
            }}
          />
        </div>
        
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Output</h2>
            <div className="flex gap-2">
              {/* Hidden file input for upload */}
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".js,.py"
                className="hidden"
              />
              
              {/* Upload button */}
              <button
                onClick={handleUploadClick}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Upload File
              </button>
              
              <button
                onClick={downloadCode}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Download Code
              </button>
              
              <button
                onClick={executeCode}
                disabled={isRunning}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
              >
                {isRunning ? 'Running...' : 'Run Code'}
              </button>
            </div>
          </div>
          
          <div 
            ref={outputRef}
            className="flex-grow p-4 border rounded bg-black text-green-400 font-mono text-sm overflow-auto"
            style={{ whiteSpace: 'pre-wrap', minHeight: '400px', maxHeight: '400px' }}
          >
            {output || `Code output will appear here...\n${language === 'python' ? '(Python runs server-side only)' : ''}`}
          </div>
        </div>
      </div>
    </main>
  );
}