const axios = require('axios');
const FormData = require('form-data');

// Backend API URL - replace with your deployed backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001';

exports.handler = async (event, context) => {
  const { httpMethod, path, body, headers } = event;

  // Enable CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS requests
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Route to different endpoints
    if (path.startsWith('/api/v1/chat/query')) {
      return await handleChatQuery(body, corsHeaders);
    } else if (path.startsWith('/api/v1/documents/list')) {
      return await handleDocumentsList(headers, corsHeaders);
    } else if (path.startsWith('/api/v1/documents/') && httpMethod === 'DELETE') {
      const documentId = path.split('/').pop();
      return await handleDocumentDelete(documentId, headers, corsHeaders);
    } else if (path.startsWith('/api/v1/ingestion/upload')) {
      return await handleDocumentUpload(body, headers, corsHeaders);
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handleChatQuery(body, corsHeaders) {
  try {
    const requestBody = JSON.parse(body);
    const response = await axios.post(`${BACKEND_URL}/api/v1/chat/query`, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': requestBody.apiKey ? `Bearer ${requestBody.apiKey}` : undefined
      }
    });

    return {
      statusCode: response.status,
      headers: corsHeaders,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Chat query failed' })
    };
  }
}

async function handleDocumentsList(headers, corsHeaders) {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/documents/list`, {
      headers: {
        'Authorization': headers.authorization || undefined
      }
    });

    return {
      statusCode: response.status,
      headers: corsHeaders,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Documents list failed' })
    };
  }
}

async function handleDocumentDelete(documentId, headers, corsHeaders) {
  try {
    const response = await axios.delete(`${BACKEND_URL}/api/v1/documents/${documentId}`, {
      headers: {
        'Authorization': headers.authorization || undefined
      }
    });

    return {
      statusCode: response.status,
      headers: corsHeaders,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Document deletion failed' })
    };
  }
}

async function handleDocumentUpload(body, headers, corsHeaders) {
  try {
    // For file uploads, we need to handle multipart form data
    const requestBody = JSON.parse(body);
    
    const response = await axios.post(`${BACKEND_URL}/api/v1/ingestion/upload`, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': headers.authorization || undefined
      }
    });

    return {
      statusCode: response.status,
      headers: corsHeaders,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Document upload failed' })
    };
  }
}
