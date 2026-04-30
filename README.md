# 🚀 AI Knowledge Engine

**A production-ready RAG (Retrieval-Augmented Generation) knowledge engine with intelligent document processing and advanced chat capabilities.**

[![Deploy with Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/josep06-en/RAG-knowledge-engine-project.git)

---

## ✨ **Live Demo & Features**

### 🎯 **What This Actually Does:**

- **📄 Smart Document Upload** - Drag & drop PDF, TXT, DOCX, MD files with progress tracking
- **💬 Intelligent Chat** - Ask questions about your documents with contextual AI responses
- **🗂 Advanced Document Management** - Select, search, and delete documents with modern UI
- **🔑 Secure API Key Management** - Add/remove OpenAI API keys with encrypted storage
- **🎨 Professional Interface** - Responsive design with smooth animations and interactions
- **🚀 Production Ready** - Deployed on Netlify with serverless functions

### 🧠 **Enhanced Mock Intelligence:**

The system includes an **intelligent mock LLM** that provides:
- **Query Type Detection** - Recognizes definitions, processes, explanations, comparisons
- **Context-Aware Responses** - Extracts relevant content based on your questions
- **Smart Content Synthesis** - Organizes information into structured, readable responses
- **Key Concept Identification** - Identifies and highlights important concepts

---

## 🌐 **Quick Deploy to Netlify**

### 🎯 **One-Click Deployment:**

1. **Click the Deploy Button** above or go to [Netlify](https://app.netlify.com/start/deploy?repository=https://github.com/josep06-en/RAG-knowledge-engine-project.git)
2. **Connect Your GitHub** - Authorize Netlify to access your repository
3. **Deploy** - Netlify will automatically build and deploy your app

**That's it! Your app will be live at `https://your-app-name.netlify.app`**

### ⚙️ **Manual Deploy Steps:**

```bash
# 1. Clone and setup
git clone https://github.com/josep06-en/RAG-knowledge-engine-project.git
cd ai-knowledge-engine

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Test locally (optional)
npm run dev

# 4. Deploy to Netlify
# Push to GitHub and connect repo to Netlify
# Build command: cd frontend && npm run build
# Publish directory: frontend/dist
```

---

## 🏗️ **Technical Architecture**

### 📱 **Frontend Stack:**
- **React 18** + **TypeScript** - Modern, type-safe UI development
- **Vite** - Lightning-fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework for rapid styling
- **Zustand** - Lightweight state management
- **React Dropzone** - Beautiful file upload interface

### 🔧 **Backend (Reference Implementation):**
- **FastAPI** - Modern Python web framework
- **Enhanced Mock LLM** - Intelligent response generation
- **FAISS Vector Store** - Document embeddings and similarity search
- **OpenAI Integration** - Real AI responses (with API key)

### 🌐 **Production Deployment:**
- **Netlify Functions** - Serverless API proxy
- **Automatic CI/CD** - GitHub integration with auto-deploys
- **Global CDN** - Fast content delivery worldwide
- **SSL & Security** - HTTPS enabled by default

---

## 📋 **Project Structure**

```
ai-knowledge-engine/
├── 📄 README.md              # This file
├── 📄 DEPLOYMENT.md          # Detailed deployment guide
├── 📄 netlify.toml          # Netlify configuration
├── 📁 netlify/functions/      # Serverless API functions
│   ├── 📄 api.js             # Main API proxy
│   └── 📄 package.json       # Function dependencies
├── 📁 frontend/              # React application
│   ├── 📁 src/               # Source code
│   │   ├── 📄 AppProfessional.tsx  # Main app component
│   │   ├── 📄 apiKeyManager.ts     # API key management
│   │   └── 📄 index.tsx            # App entry point
│   ├── 📄 package.json       # Dependencies
│   └── 📄 vite.config.ts     # Build configuration
├── 📁 backend/               # FastAPI reference
└── 📁 docs/                 # Documentation
```

---

## 🚀 **Getting Started Locally**

### 📋 **Prerequisites:**
- **Node.js 18+** - For frontend development
- **Python 3.11+** - For backend (optional, using mock by default)

### 🎯 **Frontend Development:**

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open http://localhost:5173
```

### 🔧 **Backend Development (Optional):**

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start server
uvicorn app.main:app --reload --port 8001
```

---

## 💡 **Usage Guide**

### 📄 **Document Management:**
1. **Upload Files** - Drag & drop or click to select documents
2. **Select Documents** - Choose which documents to search within
3. **Delete Documents** - Click the 🗑️ button to remove files

### 💬 **Chat Interface:**
1. **Ask Questions** - Type natural language questions about your documents
2. **View Sources** - See which documents provided the answers
3. **Manage API Keys** - Add OpenAI API key for real AI responses

### 🔑 **API Key Management:**
- **Without API Key** - Uses enhanced mock responses
- **With API Key** - Real OpenAI GPT responses
- **Quota Exceeded** - Graceful fallback to mock with notification

---

## 🎨 **UI Features**

### ✨ **Modern Interface:**
- **Responsive Design** - Works perfectly on desktop and mobile
- **Smooth Animations** - Professional transitions and hover effects
- **Dark/Light Mode** - Automatic theme detection
- **Loading States** - Beautiful spinners and progress indicators
- **Error Handling** - User-friendly error messages and recovery

### 🎯 **Interactive Elements:**
- **Drag & Drop Upload** - Intuitive file upload with visual feedback
- **Smart Document Selection** - Toggle individual documents or "All Documents"
- **Real-time Chat** - Streaming responses with typing indicators
- **Contextual Buttons** - "Introduce API Key" and "Update API Key" actions

---

## 🔧 **Configuration**

### ⚙️ **Environment Variables:**

Create `.env` file in backend directory:
```env
# OpenAI API Key (optional - uses mock if not provided)
OPENAI_API_KEY=your_openai_api_key_here

# Application settings
DEBUG=true
CORS_ORIGINS=["http://localhost:5173", "https://your-app.netlify.app"]
```

### 🌐 **Netlify Environment:**

In Netlify Dashboard → Site Settings → Environment Variables:
```
NODE_VERSION=18
BACKEND_URL=https://your-backend-url.com  # Optional
```

---

## 🚀 **Deployment Options**

### 🎯 **Recommended: Netlify (Free)**
- ✅ **Zero Cost** - Free hosting with generous limits
- ✅ **Automatic HTTPS** - SSL certificates included
- ✅ **Global CDN** - Fast content delivery
- ✅ **Git Integration** - Automatic deployments on push
- ✅ **Serverless Functions** - Backend API included

### 🔄 **Alternative: Full-Stack**
- **Frontend**: Netlify/Vercel
- **Backend**: Render/Railway/Fly.io
- **Database**: Pinecone/Weaviate (for vector storage)

---

## 📊 **Performance & Scaling**

### ⚡ **Optimizations:**
- **Code Splitting** - Lazy loaded components
- **Image Optimization** - Automatic image compression
- **Bundle Analysis** - Optimized JavaScript bundles
- **Caching Strategy** - Efficient asset caching

### 📈 **Scaling:**
- **Netlify Functions** - Auto-scaling serverless backend
- **Global CDN** - Content delivered from edge locations
- **Database Ready** - Easy migration to cloud vector databases

---

## 🤝 **Contributing**

### 📋 **How to Contribute:**
1. **Fork** this repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### 🎯 **Areas for Contribution:**
- **UI/UX Improvements** - Design and user experience
- **Performance** - Optimization and speed improvements
- **Features** - New functionality and capabilities
- **Documentation** - Better guides and examples

---

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🎉 **What's Next?**

### 🚀 **Planned Features:**
- **📊 Analytics Dashboard** - Usage statistics and insights
- **👥 Multi-User Support** - Authentication and user management
- **🔍 Advanced Search** - Semantic search with filters
- **📱 Mobile App** - React Native mobile application
- **🌍 Multi-language** - Internationalization support

### 💡 **Future Enhancements:**
- **🤖 AI-Powered Summaries** - Automatic document summarization
- **📚 Knowledge Graph** - Concept relationships and connections
- **🔄 Real-time Collaboration** - Multi-user document editing
- **🔌 Plugin System** - Extensible architecture

---

## 📞 **Support & Contact**

- **🐛 Issues** - [Report bugs on GitHub](https://github.com/josep06-en/RAG-knowledge-engine-project/issues)
- **💬 Discussions** - [Join GitHub Discussions](https://github.com/josep06-en/RAG-knowledge-engine-project/discussions)
- **📧 Email** - Contact for business inquiries

---

**🚀 Ready to build your AI knowledge engine? Deploy now and start chatting with your documents!**
