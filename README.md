# Real-Time Collaborative Coding Environment

A modern web-based collaborative coding environment built with Next.js, Socket.IO, and Monaco Editor, allowing multiple users to write, share, and run code together in real-time.

## Features

- **Monaco Editor Integration**: Professional code editing experience with syntax highlighting
- **Real-Time Collaboration**: Multiple users can edit code simultaneously with typing indicators
- **Multiple Language Support**: JavaScript (client/server execution) and Python (server execution)
- **AI-Enhanced Autocomplete**: Get intelligent code suggestions as you type
- **Light and Dark Themes**: Choose your preferred editor theme
- **Remote Execution**: Run code on the server or in the browser
- **File Management**: Upload and download code files
- **Room-Based Collaboration**: Create or join rooms to code with others
- **User Presence**: See how many people are in the room in real-time

## Technologies Used

- **Next.js 15.3.2**: For server-side rendering and API routes
- **React 19**: For the user interface
- **Monaco Editor**: For code editing via @monaco-editor/react
- **Socket.IO**: For real-time communication between users
- **TailwindCSS 4**: For responsive styling
- **Node.js**: For server-side code execution
- **AI Integration**: Optional code suggestions using Gemini API

## Getting Started

### Prerequisites

- Node.js (latest LTS version recommended)
- npm or yarn
- Python 3 (for Python code execution)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/real-time-coding-environment.git
cd real-time-coding-environment
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables (optional for AI features)
```bash
# Create a .env.local file and add:
GEMINI_API_KEY=your_gemini_api_key
MODEL_NAME=gemini-1.5-pro
TEMPERATURE=0.2
MAX_TOKENS_COMPLETION=256
```

4. Run the development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application

## Usage

1. Open the application in your browser
2. Enter a room ID or click "Generate Room" to create a new room
3. Share the room ID with others to collaborate in real-time
4. Select your preferred programming language (JavaScript or Python)
5. Choose between light and dark theme
6. Write your code in the editor
7. For JavaScript, select client-side or server-side execution
8. Click "Run Code" to execute and view results in the output panel
9. Use "Upload File" to import existing code files
10. Use "Download Code" to save your work locally

## Collaborative Features

- **Real-Time Editing**: See changes from collaborators instantly
- **User Count**: Track how many people are in your room
- **Typing Indicators**: See when others are typing
- **Language Synchronization**: When one user changes the language, it updates for everyone
- **Persistence**: Room data persists as long as users are connected

## Security Considerations

- Server-side execution is sandboxed and has a timeout limit
- Code execution is isolated to prevent malicious actions
- No permanent storage of code on the server (in-memory only)

## Future Enhancements

- Code version history
- Voice and video chat integration
- Advanced AI-powered code recommendations
- Multiple file support with directory structure
- Terminal integration
- User authentication and permanent project storage
- Custom themes and editor settings
- Mobile optimization for coding on tablets/phones

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Acknowledgements

- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Next.js](https://nextjs.org/)
- [Socket.IO](https://socket.io/)
- [TailwindCSS](https://tailwindcss.com/)
- [Google's Gemini API](https://ai.google.dev/)