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
    
    const result = await executePython(code, uniqueId, tempDir);
    
    return NextResponse.json({ output: result.trim() });
    
  } catch (error) {
    console.error('Python execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute Python code' },
      { status: 500 }
    );
  }
}

// Execute Python code
async function executePython(code: string, uniqueId: string, tempDir: string): Promise<string> {
  const filename = path.join(tempDir, `${uniqueId}.py`);
  
  // Write the Python code to a temporary file
  await writeFile(filename, code);
  
  try {
    // Execute the Python code using the python3 command
    // Note: This assumes python3 is installed on the server
    const result = await executeCommand(`python3 ${filename}`, EXECUTION_TIMEOUT);
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
    exec(command, { timeout }, (error, stdout, stderr) => {
      if (error && error.killed) {
        reject(new Error('Execution timed out'));
      } else if (error) {
        // For Python errors, we want to return the error message as part of the output
        resolve(stderr || error.message);
      } else if (stderr) {
        // Sometimes Python prints to stderr even for non-error output (e.g., for warnings)
        resolve(stdout + stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}