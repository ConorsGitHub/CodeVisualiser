# Code Visualizer

A **Python code execution visualizer** with a **React frontend** and **FastAPI backend**.  
It allows users to execute Python code, highlighting the execution line by line, displaying variable values through the whole execution, and inspect output in real time.

## Table of Contents

- [Project Structure](#project-structure)
- [Features](#features)
- [Setup Instructions](#setup-instructions)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Project Structure
- CodeVisualiser/
    - backend/
        - Main.py (Main API server)
        - test_request.py (loads initial code to site)
        - requirements.txt (Python dependencies)
    - frontend/ (React frontend)
        - package.json (Node dependencies)
        - package-lock.json (Lockfile)
        - src/
          - App.jsx (Website)
    - .gitignore
    - README.md

## Features

- Secure Python code execution in a sandboxed backend.
- Step-by-step execution with line highlighting.
- View variables and their values at each step.
- Real-time output display.
- Adjustable execution speed (slow, medium, fast).
- Resizable panels for code, variables, and output.

## Setup Instructions

### Backend (FastAPI)

1. Navigate to the backend folder:

```bash
cd venv
```
2. Create a virtual environment and activate it:
```bash
python -m venv
source venv/bin/activate   # Linux/macOS
venv\Scripts\activate      # Windows
```
3. Install dependencies
```bash
pip install -r requirements.txt
```
4. Run the FastAPI Server
```bash
uvicorn secure_backend:app --reload
```
### Frontend (React)
1. Navigate to the frontend folder:
```bash
cd frontend
```
2. Install dependencies:
```bash
npm install
```
3. Start the development server:
```bash
npm start
```
## Usage

1. Open the frontend in your browser (`http://localhost:3000`).
2. Write or modify Python code in the editor panel.
3. Click **Run** to execute.
4. Use **Pause**, **Resume**, or **Cancel** buttons as needed.
5. Adjust **speed** to control execution interval.
6. Resize panels by dragging the dividers between Execution Viewer, Variables, and Output panels.

## Contributing

contributions are welcome!

## License
This project is licensed under the MIT License.
