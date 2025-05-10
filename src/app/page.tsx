"use client";
import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { io, Socket } from "socket.io-client";

export default function Home() {
  const [code, setCode] = useState("// Write your JavaScript code here\nconsole.log('Hello, world!');");
  const [theme, setTheme] = useState("vs-dark");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionMode, setExecutionMode] = useState<'client' | 'server'>('client');
  const [roomId, setRoomId] = useState(""); // <-- Add this line
  const outputRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId) return;
    
    const initializeRoom = async () => {
      try {
        // Get initial code state
        const response = await fetch(`/api/room?roomId=${roomId}`);
        const { code } = await response.json();
        if (code) setCode(code);
        
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
      console.log("Emitting code-change event", { roomId, code: value });
      socketRef.current?.emit("code-change", { roomId, code: value });
    }
  };

  const executeCode = async () => {
    setIsRunning(true);
    setOutput("");
    
    try {
      if (executionMode === 'client') {
        executeClientSide();
      } else {
        await executeServerSide();
      }
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  const executeClientSide = () => {
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
      // Execute the code
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
  
  const executeServerSide = async () => {
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
        throw new Error(data.error || 'Failed to execute code');
      }
      
      // Make sure we're getting just the output string
      setOutput(typeof data.output === 'string' ? data.output : JSON.stringify(data.output));
    } catch (error) {
      setOutput(`Server Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const downloadCode = () => {
    // Create a blob with the current code
    const blob = new Blob([code], { type: 'text/javascript' });
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element
    const a = document.createElement('a');
    a.href = url;
    a.download = 'code.js'; // Default filename
    
    // Append to the body, click, and remove
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Code Collab Editor</h1>
      {/* Add Room ID input */}
      <div className="mb-4">
        <label htmlFor="roomId" className="block text-sm font-medium mb-1">
          Room ID
        </label>
        <input
          id="roomId"
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
          placeholder="Enter a room ID"
        />
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-4">
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
          >
            <option value="client">Client-side (Browser)</option>
            <option value="server">Server-side (Node.js)</option>
          </select>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-4 flex-grow">
        <div className="flex-1 min-h-[400px] border rounded overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            language="javascript"
            theme={theme}
            value={code}
            onChange={handleEditorChange}
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
            {output || 'Code output will appear here...'}
          </div>
        </div>
      </div>
    </main>
  );
}
