# 🚀 Netlify Deployment Guide

## 📋 Prerequisites

- Node.js 18+
- Netlify account
- GitHub repository: https://github.com/josep06-en/RAG-knowledge-engine-project.git

## 🏗️ Project Structure

```
ai-knowledge-engine/
├── frontend/                 # React frontend (Vite)
├── netlify/functions/        # Netlify serverless functions
├── netlify.toml            # Netlify configuration
└── backend/                # Original FastAPI backend (for reference)
```

## 🚀 Deployment Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Clean project for Netlify deployment"
git push origin main
```

### 2. Deploy to Netlify

1. **Go to Netlify Dashboard**
2. **Add New Site → Import Existing Project**
3. **Connect to GitHub**: https://github.com/josep06-en/RAG-knowledge-engine-project.git
4. **Configure Build Settings**:
   - **Build command**: `cd frontend && npm run build`
   - **Publish directory**: `frontend/dist`
   - **Node version**: `18`

### 3. Configure Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables:

```
NODE_ENV=production
BACKEND_URL=https://your-backend-url.com  # Optional: If using external backend
```

### 4. Deploy Functions

The `netlify/functions/` directory contains serverless functions that proxy requests to your backend.

## 🔧 Configuration Files

### netlify.toml
- Configures build settings
- Sets up API redirects to functions
- Enables security headers

### netlify/functions/api.js
- Main API proxy function
- Handles all `/api/v1/*` routes
- Includes CORS headers
- Supports chat, documents, and upload endpoints

## 🌐 API Endpoints

All frontend API calls are routed through Netlify functions:

- `GET /api/v1/documents/list` → List documents
- `DELETE /api/v1/documents/:id` → Delete document  
- `POST /api/v1/chat/query` → Chat query
- `POST /api/v1/ingestion/upload` → Upload documents

## 🔄 Development vs Production

### Development (Local)
```typescript
// Uses local backend
const API_BASE_URL = 'http://localhost:8001/api/v1';
```

### Production (Netlify)
```typescript
// Uses Netlify functions
const API_BASE_URL = '/api/v1';
```

## 🎯 Next Steps

1. **Deploy to Netlify** using the steps above
2. **Test the application** at `https://your-site.netlify.app`
3. **Optional**: Deploy backend separately to Render/Railway for full functionality

## 📱 Features Available

✅ **Chat Interface** - Enhanced mock responses with intelligent analysis
✅ **Document Management** - Upload, select, and delete documents  
✅ **API Key Management** - Add/remove OpenAI API keys
✅ **Responsive Design** - Works on desktop and mobile
✅ **Modern UI** - Professional styling and interactions

## 🔧 Troubleshooting

### Functions Not Working
- Check `netlify/functions/` directory exists
- Verify `package.json` dependencies are installed
- Check Netlify function logs

### CORS Issues
- Verify CORS headers in `api.js`
- Check environment variables
- Ensure frontend uses relative URLs

### Build Failures
- Verify Node.js version (18+)
- Check `frontend/package.json` scripts
- Review build logs in Netlify

## 💡 Notes

- **Frontend-only deployment**: Limited to mock responses
- **Full-stack deployment**: Connect to external backend for real AI responses
- **Database**: Currently uses local FAISS (for mock responses only)
- **Scaling**: Netlify automatically scales frontend functions

---

**🎉 Your RAG Knowledge Engine is ready for production deployment!**
