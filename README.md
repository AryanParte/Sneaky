# Sneaky

A discreet AI-powered desktop assistant for real-time help during interviews, meetings, or calls.

## Features

- **Screen Snippet OCR**: Capture screen content and get AI-powered suggestions
- **Answer Prompt Panel**: Small floating overlay with suggested responses
- **Undetectable UX**: Low-opacity overlay with hotkeys for hide/show
- **Simple User Config**: Configure your API key and preferences

## Tech Stack

- **Frontend/UI**: Electron.js, React, Tailwind CSS
- **AI Integration**: OpenAI API
- **Screen Capture**: Tesseract OCR, robotjs

## Keyboard Shortcuts

- **Screen Capture**: `Cmd+Shift+Space` (Mac) or `Ctrl+Shift+Space` (Windows/Linux)
- **Toggle Overlay**: `Cmd+Shift+O` (Mac) or `Ctrl+Shift+O` (Windows/Linux)
- **Toggle Interactive Mode**: `Cmd+Shift+I` (Mac) or `Ctrl+Shift+I` (Windows/Linux)

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Build for production:
   ```
   npm run build
   ```
5. Package the application:
   ```
   npm run package
   ```

## Configuration

1. Launch the application
2. Go to Settings
3. Enter your OpenAI API key
4. Configure other preferences as needed

## Note

This is an MVP version. Audio transcription feature is experimental and may require additional setup.
