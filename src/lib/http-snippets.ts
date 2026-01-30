interface SnippetOptions {
  query: string;
  variables?: any;
  endpoint: string;
}

interface Snippets {
  curl: string;
  javascript: string;
  javascriptAxios: string;
  python: string;
  nodeAxios: string;
}

/**
 * Generate HTTP request code snippets for various languages/tools
 */
export function generateHttpSnippets(options: SnippetOptions): Snippets {
  const { query, variables, endpoint } = options;

  // Prepare the request body
  const requestBody = {
    query,
    ...(variables && Object.keys(variables).length > 0 ? { variables } : {}),
  };

  const requestBodyJson = JSON.stringify(requestBody, null, 2);
  const requestBodyCompact = JSON.stringify(requestBody);

  return {
    curl: generateCurlSnippet(endpoint, requestBodyJson),
    javascript: generateJavaScriptFetchSnippet(endpoint, query, variables),
    javascriptAxios: generateJavaScriptAxiosSnippet(endpoint, query, variables),
    python: generatePythonSnippet(endpoint, query, variables),
    nodeAxios: generateNodeAxiosSnippet(endpoint, query, variables),
  };
}

function generateCurlSnippet(endpoint: string, requestBodyJson: string): string {
  // Escape single quotes in the JSON for bash
  const escapedBody = requestBodyJson.replace(/'/g, "'\\''");

  return `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Key: YOUR_ORG_ID" \\
  -d '${escapedBody}'`;
}

function generateJavaScriptFetchSnippet(
  endpoint: string,
  query: string,
  variables?: any
): string {
  const hasVariables = variables && Object.keys(variables).length > 0;

  return `const query = \`${query.trim()}\`;
${hasVariables ? `const variables = ${JSON.stringify(variables, null, 2)};` : ''}

fetch('${endpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Key': 'YOUR_ORG_ID'
  },
  body: JSON.stringify({ ${hasVariables ? 'query, variables' : 'query'} })
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(error => console.error(error));`;
}

function generateJavaScriptAxiosSnippet(
  endpoint: string,
  query: string,
  variables?: any
): string {
  const hasVariables = variables && Object.keys(variables).length > 0;

  return `import axios from 'axios';

const query = \`${query.trim()}\`;
${hasVariables ? `const variables = ${JSON.stringify(variables, null, 2)};` : ''}

axios.post('${endpoint}', {
  ${hasVariables ? 'query,\n  variables' : 'query'}
}, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Key': 'YOUR_ORG_ID'
  }
})
  .then(response => console.log(response.data))
  .catch(error => console.error(error));`;
}

function generatePythonSnippet(
  endpoint: string,
  query: string,
  variables?: any
): string {
  const hasVariables = variables && Object.keys(variables).length > 0;

  // Escape triple quotes in query
  const escapedQuery = query.trim().replace(/"""/g, '\\"\\"\\"');

  return `import requests

query = """${escapedQuery}"""
${hasVariables ? `variables = ${JSON.stringify(variables, null, 2)}` : ''}

response = requests.post(
    '${endpoint}',
    json={'query': query${hasVariables ? ', \'variables\': variables' : ''}},
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
        'Key': 'YOUR_ORG_ID'
    }
)

print(response.json())`;
}

function generateNodeAxiosSnippet(
  endpoint: string,
  query: string,
  variables?: any
): string {
  const hasVariables = variables && Object.keys(variables).length > 0;

  return `const axios = require('axios');

const query = \`${query.trim()}\`;
${hasVariables ? `const variables = ${JSON.stringify(variables, null, 2)};` : ''}

axios.post('${endpoint}', {
  ${hasVariables ? 'query,\n  variables' : 'query'}
}, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Key': 'YOUR_ORG_ID'
  }
})
  .then(response => console.log(response.data))
  .catch(error => console.error(error));`;
}
