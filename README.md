##  Run the Project

### Backend (FastAPI)

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
cd backend
uvicorn main:app --reload
```

### Frontend
```bash
# Open a new terminal
cd frontend
npm install
npm run dev
```
### Ollama (Local LLM)
```bash
# Start Ollama server
ollama serve

# Run a model
ollama run <model_name>
# Example:
ollama run llama3

```

## Demo Video

<video width="600" controls>
  <source src="assets/demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
