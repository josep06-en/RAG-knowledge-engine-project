# Deployment Guide

## Overview

This guide covers different deployment options for the AI Knowledge Engine.

## Docker Deployment (Recommended)

### Prerequisites

- Docker and Docker Compose installed
- Sufficient disk space for documents and vector data

### Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-knowledge-engine
```

2. Build and start the services:
```bash
docker-compose -f docker/docker-compose.yml up --build
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Production Docker Deployment

For production, create a production docker-compose file:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    environment:
      - DEBUG=False
      - CORS_ORIGINS=["https://yourdomain.com"]
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - app-network

  frontend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.frontend
    environment:
      - REACT_APP_API_URL=https://yourdomain.com/api
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  data:
  logs:
```

## Manual Deployment

### Backend Deployment

1. Set up Python environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r backend/requirements.txt
```

2. Set environment variables:
```bash
export DEBUG=False
export CORS_ORIGINS=["https://yourdomain.com"]
export OPENAI_API_KEY=your_api_key
```

3. Run with Gunicorn (production):
```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend Deployment

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Build for production:
```bash
npm run build
```

3. Serve with a web server (nginx example):
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        root /path/to/build;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Cloud Deployment

### AWS

#### Using ECS

1. Create ECS cluster
2. Define task definitions for backend and frontend
3. Create load balancer
4. Set up auto-scaling

#### Using Elastic Beanstalk

1. Create separate applications for frontend and backend
2. Use Docker deployments
3. Configure environment variables
4. Set up RDS for persistent storage

### Google Cloud Platform

#### Using Cloud Run

1. Containerize the applications
2. Deploy to Cloud Run
3. Configure environment variables
4. Set up Cloud SQL for database

#### Using GKE

1. Create Kubernetes cluster
2. Deploy using Helm charts
3. Configure ingress and services

### Azure

#### Using Container Instances

1. Build and push containers to ACR
2. Deploy to Container Instances
3. Configure networking

#### Using AKS

1. Create Kubernetes cluster
2. Deploy using manifests
3. Set up Azure Database

## Environment Variables

### Backend

```bash
# Application
DEBUG=False
CORS_ORIGINS=["https://yourdomain.com"]

# AI Services
OPENAI_API_KEY=your_openai_api_key
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Database
VECTOR_DB_TYPE=chroma
VECTOR_DB_PATH=/app/data/vector_db

# Logging
LOG_LEVEL=INFO
LOG_FILE=/app/logs/app.log
```

### Frontend

```bash
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_ENVIRONMENT=production
```

## Monitoring and Logging

### Application Monitoring

1. Use Prometheus for metrics collection
2. Set up Grafana dashboards
3. Configure alerting

### Logging

1. Configure structured logging
2. Use ELK stack or similar
3. Set up log rotation

### Health Checks

Configure health check endpoints:
- Backend: `/health`
- Frontend: Configure health check in load balancer

## Security Considerations

1. **API Keys**: Store securely in environment variables or secret management
2. **HTTPS**: Enable SSL/TLS in production
3. **CORS**: Configure properly for your domain
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Input Validation**: Validate all user inputs
6. **Authentication**: Implement user authentication (planned)

## Backup and Recovery

1. **Database Backups**: Regular backups of vector database
2. **Document Storage**: Backup uploaded documents
3. **Configuration**: Version control configuration files
4. **Disaster Recovery**: Plan for service restoration

## Scaling

### Horizontal Scaling

1. Load balance multiple backend instances
2. Use shared vector database
3. Implement session management

### Vertical Scaling

1. Increase memory for larger document sets
2. Use GPU for embedding generation
3. Optimize vector search algorithms

## Performance Optimization

1. **Caching**: Cache frequent queries
2. **CDN**: Use CDN for static assets
3. **Database Optimization**: Index vector database properly
4. **Compression**: Compress API responses

## Troubleshooting

### Common Issues

1. **Memory Issues**: Increase memory allocation
2. **Slow Search**: Optimize vector indexing
3. **Upload Failures**: Check file size limits
4. **CORS Errors**: Verify CORS configuration

### Debugging

1. Check application logs
2. Monitor resource usage
3. Test API endpoints individually
4. Verify network connectivity
