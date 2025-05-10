import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import os from 'os';

// Define execution timeout (5 seconds)
const EXECUTION_TIMEOUT = 5000;

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }
    
    // Generate a unique filename to prevent conflicts
    const uniqueId = uuidv4();
    const tempDir = os.tmpdir();
    
    const result = await executeJavaScript(code, uniqueId, tempDir);
    
    // Return the result directly without wrapping it in an output property
    return NextResponse.json({ output: result.trim() });
    
  } catch (error) {
    console.error('Execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute code' },
      { status: 500 }
    );
  }
}

// Execute JavaScript code
async function executeJavaScript(code: string, uniqueId: string, tempDir: string): Promise<string> {
  const filename = path.join(tempDir, `${uniqueId}.js`);
  
  // Simplified wrapper that directly outputs to stdout without console.log
  const wrappedCode = `
    try {
      // Redirect console methods to capture output
      const originalConsole = { 
        log: console.log, 
        error: console.error, 
        warn: console.warn, 
        info: console.info 
      };
      
      let output = "";
      
      // Override console methods to capture output only (no original console output)
      console.log = (...args) => {
        output += args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') + '\\n';
      };
      
      console.error = (...args) => {
        output += 'Error: ' + args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') + '\\n';
      };
      
      console.warn = (...args) => {
        output += 'Warning: ' + args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') + '\\n';
      };
      
      console.info = (...args) => {
        output += 'Info: ' + args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') + '\\n';
      };
      
      // Execute the user's code
      ${code}
      
      // Output the captured content
      process.stdout.write(output);
    } catch (error) {
      process.stdout.write('Runtime Error: ' + error.message + '\\n');
    }
  `;
  
  await writeFile(filename, wrappedCode);
  
  try {
    const result = await executeCommand(`node ${filename}`, EXECUTION_TIMEOUT);
    return result;
  } finally {
    // Clean up the temporary file
    try {
      await unlink(filename);
    } catch (error) {
      console.error('Failed to delete temporary file:', error);
    }
  }
}

// Helper function to execute shell commands with timeout
function executeCommand(command: string, timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout }, (error, stdout, stderr) => { // Remove 'const process ='
      if (error && error.killed) {
        reject(new Error('Execution timed out'));
      } else if (error) {
        resolve(stderr || error.message);
      } else {
        resolve(stdout);
      }
    });
  });
}