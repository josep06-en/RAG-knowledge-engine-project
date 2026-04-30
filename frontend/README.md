# RAG AI Knowledge Engine - Frontend

A modern React + Vite frontend for the RAG Knowledge Engine with enterprise-grade UX design.

## Features

- **Modern Tech Stack**: React + Vite + TypeScript + TailwindCSS
- **State Management**: Zustand with persistent storage
- **API Integration**: Axios with React Query for data fetching
- **Enterprise Design**: Dark mode by default with clean, minimal UI
- **Chat Interface**: Streaming-like responses with source citations
- **Document Upload**: Drag & drop with progress tracking
- **Responsive Design**: Mobile-friendly with collapsible sidebar

## Architecture

```
frontend/
├── src/
│   ├── components/           # React components
│   │   ├── ChatInterfaceNew.tsx    # Main chat interface with streaming UX
│   │   ├── DocumentUpload.tsx        # Drag & drop document upload
│   │   └── Sidebar.tsx              # Collapsible sidebar with navigation
│   ├── hooks/               # Custom React hooks
│   │   ├── useChat.ts              # Chat functionality with React Query
│   │   └── useDocuments.ts        # Document management
│   ├── services/            # API service layer
│   │   └── api.ts                 # Axios-based API client
│   ├── store/               # Zustand state management
│   │   └── index.ts              # Global state with persistence
│   ├── App.tsx             # Main application component
│   └── index.tsx           # Application entry point
├── public/
│   └── index.html          # HTML template
├── package.json            # Dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── tailwind.config.js    # TailwindCSS configuration
```

## Key Features

### Chat Interface
- **Streaming UX**: Simulated streaming response display
- **Source Citations**: Shows relevant document chunks with similarity scores
- **Auto-scroll**: Messages automatically scroll to bottom
- **Response Time**: Displays query processing time
- **Error Handling**: Clear error messages with retry functionality
- **History Panel**: Recent messages in sidebar

### Document Upload
- **Drag & Drop**: Intuitive file upload interface
- **File Validation**: Supports PDF, TXT, and MD files
- **Progress Tracking**: Real-time upload progress indication
- **Batch Upload**: Multiple files simultaneously
- **Results Display**: Shows upload success/failure with details

### State Management
- **Zustand**: Lightweight, fast state management
- **Persistence**: Chat history and UI preferences saved locally
- **React Query**: Server state management and caching
- **Theme Support**: Dark/light mode toggle

### API Integration
- **Axios Client**: HTTP client with interceptors
- **Error Handling**: Global error handling with user feedback
- **Type Safety**: Full TypeScript support
- **Retry Logic**: Automatic retry for failed requests

### Responsive Design
- **Mobile First**: Optimized for mobile devices
- **Collapsible Sidebar**: Toggle sidebar on small screens
- **Touch Friendly**: Large touch targets for mobile
- **Adaptive Layout**: Content adjusts to screen size

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file in the root:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Design System

### Color Palette (Dark Mode)
- **Primary**: Blue (#3B82F6)
- **Background**: Gray (#111827)
- **Surface**: Gray (#1F2937)
- **Text**: Gray (#D1D5DB)
- **Accent**: Blue (#60A5FA)

### Typography
- **Font**: System UI stack (sans-serif)
- **Text Sizes**: Responsive scaling
- **Font Weights**: 300, 400, 500, 600, 700

### Components

#### Chat Bubbles
- User messages: Blue background, right-aligned
- Assistant messages: Gray background, left-aligned
- Streaming: Animated loading indicator
- Sources: Expandable cards with metadata

#### Upload Area
- Drag zone with visual feedback
- File list with remove option
- Progress bar with percentage
- Results modal with success/error states

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- **Bundle Size**: Optimized with Vite
- **Code Splitting**: Lazy loading for large components
- **Caching**: React Query for API responses
- **Tree Shaking**: Dead code elimination

## Security

- **Input Validation**: File type and size validation
- **XSS Prevention**: React's built-in protection
- **CSRF Protection**: Token-based API requests
- **Content Security**: Proper MIME type handling

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
# Serve the dist folder
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Troubleshooting

### Common Issues

1. **Dependencies not found**: Run `npm install`
2. **API connection failed**: Check backend server is running
3. **CORS errors**: Verify API URL configuration
4. **Build failures**: Clear node_modules and reinstall

### Development Tips

- Use browser dev tools for debugging
- Check Network tab for API requests
- Monitor console for errors
- Use React DevTools for component inspection

## Contributing

1. Follow the existing code style
2. Use TypeScript for new code
3. Add tests for new features
4. Update documentation for changes

## License

MIT License
