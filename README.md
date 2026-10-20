# Offline LaTeX Editor

A local web application that replicates Overleaf's core functionality: a split-pane LaTeX editor with live PDF preview, file browser, and syntax highlighting.

## Features

- Split-pane layout with file tree, code editor, and PDF preview
- Monaco Editor with LaTeX syntax highlighting
- Auto-compile on save (with debouncing)
- Multi-project support (each folder = one project)
- File upload via drag-and-drop
- Cross-platform support (Windows, macOS, Linux)

## Prerequisites

### 1. Install Node.js

Download and install Node.js (v18 or later) from [nodejs.org](https://nodejs.org/).

Verify installation:
```bash
node --version
npm --version
```

### 2. Install a LaTeX Distribution

You need a LaTeX distribution installed on your system to compile documents.

#### Windows

**Option A: MiKTeX (Recommended for Windows)**

1. Download MiKTeX from [miktex.org/download](https://miktex.org/download)
2. Run the installer
3. Choose "Install missing packages on-the-fly: Yes"
4. Complete the installation
5. Open MiKTeX Console and check for updates

**Option B: TeX Live**

1. Download the installer from [tug.org/texlive](https://tug.org/texlive/acquire-netinstall.html)
2. Run `install-tl-windows.bat`
3. Follow the installation wizard (full installation recommended)
4. Installation takes 1-2 hours depending on your internet speed

#### macOS

**Option A: MacTeX (Recommended)**

Using Homebrew:
```bash
brew install --cask mactex
```

Or download from [tug.org/mactex](https://tug.org/mactex/)

**Option B: BasicTeX (Minimal)**

```bash
brew install --cask basictex
```

Note: BasicTeX is smaller but you may need to install additional packages manually using `tlmgr`.

After installation, you may need to restart your terminal or add TeX to your PATH:
```bash
eval "$(/usr/libexec/path_helper)"
```

#### Linux

**Debian/Ubuntu:**
```bash
sudo apt update
sudo apt install texlive-full
```

For a minimal installation:
```bash
sudo apt install texlive-latex-base texlive-latex-recommended texlive-fonts-recommended
```

**Fedora:**
```bash
sudo dnf install texlive-scheme-full
```

**Arch Linux:**
```bash
sudo pacman -S texlive-most
```

### 3. Verify LaTeX Installation

Open a new terminal and run:
```bash
pdflatex --version
```

You should see version information for pdfTeX.

## Installation

### Step 1: Clone or Download the Project

```bash
git clone <repository-url>
cd austens-offline-latex-compiler
```

Or download and extract the ZIP file.

### Step 2: Install Dependencies

```bash
npm install
```

This installs dependencies for both the client and server.

### Step 3: Start the Application

```bash
npm run dev
```

This starts both the backend server and frontend development server.

### Step 4: Open in Browser

Open your browser and navigate to:
```
http://localhost:5173
```

## Usage

1. **Create a Project**: Click "New Project" on the projects page
2. **Edit Files**: Click on files in the file tree to edit them
3. **Compile**: Click "Recompile" or save a file (Ctrl+S) to compile
4. **View PDF**: The PDF preview updates automatically after compilation
5. **Upload Files**: Drag and drop files into the file tree or use the upload button

## Project Structure

```
austens-offline-latex-compiler/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI components
│       ├── stores/         # Zustand state management
│       ├── services/       # API client
│       └── hooks/          # Custom React hooks
├── server/                 # Express backend
│   └── src/
│       ├── routes/         # API endpoints
│       └── services/       # LaTeX compiler service
├── workspace/              # Your LaTeX projects
│   └── [project-name]/     # Each folder is a project
│       └── main.tex
└── package.json
```

## Troubleshooting

### "pdflatex not found" Error

1. Make sure you installed a LaTeX distribution (see Prerequisites)
2. Restart your terminal/command prompt after installation
3. Verify with `pdflatex --version`
4. On Windows, try running the MiKTeX Console to update PATH

### Compilation Errors

- Check the "Logs" tab in the bottom panel for detailed error messages
- LaTeX errors show the line number - click to jump to that line
- Common issues: missing packages, syntax errors, missing closing braces

### Port Already in Use

If port 3001 (server) or 5173 (client) is in use:

```bash
# Find and kill the process (macOS/Linux)
lsof -i :3001
kill -9 <PID>

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Missing LaTeX Packages

**MiKTeX (Windows):**
- MiKTeX auto-installs missing packages if configured
- Or open MiKTeX Console > Packages to install manually

**TeX Live (macOS/Linux):**
```bash
sudo tlmgr install <package-name>
```

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Editor**: Monaco Editor
- **PDF Viewer**: react-pdf (PDF.js)
- **State Management**: Zustand
- **Backend**: Express.js, Node.js
- **LaTeX**: pdflatex (TeX Live / MiKTeX / MacTeX)

## License

MIT
