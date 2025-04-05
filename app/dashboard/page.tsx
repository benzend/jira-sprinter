'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const apiKeySchema = z.object({
  key: z.string().min(1, 'API key is required'),
  model: z.string().min(1, 'Model name is required'),
});

const jiraCredentialsSchema = z.object({
  domain: z.string().min(1, 'Jira domain is required'),
  email: z.string().email('Valid email is required'),
  apiToken: z.string().min(1, 'API token is required'),
  projectKey: z.string().min(1, 'Project key is required'),
});

const documentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

type ApiKeyForm = z.infer<typeof apiKeySchema>;
type JiraCredentialsForm = z.infer<typeof jiraCredentialsSchema>;
type DocumentForm = z.infer<typeof documentSchema>;

export default function DashboardPage() {
  const router = useRouter();
  const [apiKeyError, setApiKeyError] = useState<string>('');
  const [jiraError, setJiraError] = useState<string>('');
  const [documentError, setDocumentError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingTickets, setIsCreatingTickets] = useState(false);
  const [generatedTickets, setGeneratedTickets] = useState<Array<any>>([]);
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; model: string }>>(
    []
  );
  const [jiraCredentials, setJiraCredentials] = useState<{
    domain: string;
    email: string;
    projectKey: string;
  } | null>(null);

  const apiKeyForm = useForm<ApiKeyForm>({
    resolver: zodResolver(apiKeySchema),
  });

  const jiraForm = useForm<JiraCredentialsForm>({
    resolver: zodResolver(jiraCredentialsSchema),
  });

  const documentForm = useForm<DocumentForm>({
    resolver: zodResolver(documentSchema),
  });

  useEffect(() => {
    // Fetch user's API keys and Jira credentials
    const fetchData = async () => {
      try {
        const [apiKeysResponse, jiraResponse] = await Promise.all([
          fetch('/api/api-keys'),
          fetch('/api/jira-credentials'),
        ]);

        if (apiKeysResponse.ok) {
          const data = await apiKeysResponse.json();
          setApiKeys(data.apiKeys);
        }

        if (jiraResponse.ok) {
          const data = await jiraResponse.json();
          setJiraCredentials(data.credentials);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  const onSubmitApiKey = async (data: ApiKeyForm) => {
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save API key');
      }

      const result = await response.json();
      setApiKeys([...apiKeys, result.apiKey]);
      apiKeyForm.reset();
    } catch (error) {
      if (error instanceof Error) {
        setApiKeyError(error.message);
      } else {
        setApiKeyError('An error occurred while saving the API key');
      }
    }
  };

  const onDeleteApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/api-keys?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }

      setApiKeys(apiKeys.filter((key) => key.id !== id));
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const onSubmitJiraCredentials = async (data: JiraCredentialsForm) => {
    try {
      const response = await fetch('/api/jira-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save Jira credentials');
      }

      const result = await response.json();
      setJiraCredentials({
        domain: data.domain,
        email: data.email,
        projectKey: data.projectKey,
      });
      jiraForm.reset();
    } catch (error) {
      if (error instanceof Error) {
        setJiraError(error.message);
      } else {
        setJiraError('An error occurred while saving the Jira credentials');
      }
    }
  };

  const onSubmitDocument = async (data: DocumentForm) => {
    try {
      setIsProcessing(true);
      setGeneratedTickets([]);
      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process document');
      }

      const result = await response.json();
      setGeneratedTickets(result.tickets);
      documentForm.reset();
    } catch (error) {
      if (error instanceof Error) {
        setDocumentError(error.message);
      } else {
        setDocumentError('An error occurred while processing the document');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const onCreateJiraTickets = async () => {
    try {
      setIsCreatingTickets(true);
      const response = await fetch('/api/jira-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets: generatedTickets }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create Jira tickets');
      }

      const result = await response.json();
      // Clear generated tickets after successful creation
      setGeneratedTickets([]);
      alert('Tickets created successfully in Jira!');
    } catch (error) {
      if (error instanceof Error) {
        setDocumentError(error.message);
      } else {
        setDocumentError('An error occurred while creating Jira tickets');
      }
    } finally {
      setIsCreatingTickets(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6">
            {/* API Key Management Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                API Key Management
              </h2>
              <form
                onSubmit={apiKeyForm.handleSubmit(onSubmitApiKey)}
                className="space-y-4"
              >
                {apiKeyError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{apiKeyError}</div>
                  </div>
                )}
                <div>
                  <label
                    htmlFor="model"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Model
                  </label>
                  <select
                    {...apiKeyForm.register('model')}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base text-gray-800 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select a model</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                  {apiKeyForm.formState.errors.model && (
                    <p className="mt-1 text-sm text-red-600">
                      {apiKeyForm.formState.errors.model.message}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="key"
                    className="block text-sm font-medium text-gray-700"
                  >
                    API Key
                  </label>
                  <input
                    {...apiKeyForm.register('key')}
                    type="password"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  {apiKeyForm.formState.errors.key && (
                    <p className="mt-1 text-sm text-red-600">
                      {apiKeyForm.formState.errors.key.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save API Key
                </button>
              </form>

              {/* Display saved API keys */}
              {apiKeys.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900">
                    Saved API Keys
                  </h3>
                  <ul className="mt-3 divide-y divide-gray-200">
                    {apiKeys.map((apiKey) => (
                      <li
                        key={apiKey.id}
                        className="py-3 flex justify-between items-center"
                      >
                        <span className="text-sm text-gray-500">
                          {apiKey.model}
                        </span>
                        <button
                          onClick={() => onDeleteApiKey(apiKey.id)}
                          className="text-sm text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Jira Credentials Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Jira Credentials
              </h2>
              <form
                onSubmit={jiraForm.handleSubmit(onSubmitJiraCredentials)}
                className="space-y-4"
              >
                {jiraError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{jiraError}</div>
                  </div>
                )}
                <div>
                  <label
                    htmlFor="domain"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Jira Domain
                  </label>
                  <input
                    {...jiraForm.register('domain')}
                    type="text"
                    placeholder="your-domain.atlassian.net"
                    className="text-gray-800 mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  {jiraForm.formState.errors.domain && (
                    <p className="mt-1 text-sm text-red-600">
                      {jiraForm.formState.errors.domain.message}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Jira Email
                  </label>
                  <input
                    {...jiraForm.register('email')}
                    type="email"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  {jiraForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {jiraForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="apiToken"
                    className="block text-sm font-medium text-gray-700"
                  >
                    API Token
                  </label>
                  <input
                    {...jiraForm.register('apiToken')}
                    type="password"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  {jiraForm.formState.errors.apiToken && (
                    <p className="mt-1 text-sm text-red-600">
                      {jiraForm.formState.errors.apiToken.message}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="projectKey"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Project Key
                  </label>
                  <input
                    {...jiraForm.register('projectKey')}
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g., PROJ"
                  />
                  {jiraForm.formState.errors.projectKey && (
                    <p className="mt-1 text-sm text-red-600">
                      {jiraForm.formState.errors.projectKey.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {jiraCredentials
                    ? 'Update Jira Credentials'
                    : 'Save Jira Credentials'}
                </button>
              </form>

              {/* Display saved Jira credentials */}
              {jiraCredentials && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900">
                    Current Jira Configuration
                  </h3>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-gray-500">
                      Domain: {jiraCredentials.domain}
                    </p>
                    <p className="text-sm text-gray-500">
                      Email: {jiraCredentials.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      Project Key: {jiraCredentials.projectKey}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Document Processing Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Create Jira Tickets
              </h2>
              <form
                onSubmit={documentForm.handleSubmit(onSubmitDocument)}
                className="space-y-4"
              >
                {documentError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{documentError}</div>
                  </div>
                )}
                <div>
                  <label
                    htmlFor="content"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Document Content
                  </label>
                  <textarea
                    {...documentForm.register('content')}
                    rows={6}
                    className="mt-1 text-gray-800 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Paste your document content here..."
                  />
                  {documentForm.formState.errors.content && (
                    <p className="mt-1 text-sm text-red-600">
                      {documentForm.formState.errors.content.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                >
                  {isProcessing ? 'Processing...' : 'Generate Tickets'}
                </button>
              </form>

              {/* Display Generated Tickets */}
              {generatedTickets.length > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-gray-900">
                      Generated Tickets
                    </h3>
                    <button
                      onClick={onCreateJiraTickets}
                      disabled={isCreatingTickets}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400"
                    >
                      {isCreatingTickets ? 'Creating...' : 'Create in Jira'}
                    </button>
                  </div>
                  <div className="space-y-4">
                    {generatedTickets.map((ticket, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-md p-4"
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-medium text-gray-900">
                            {ticket.title}
                          </h4>
                          <div className="flex space-x-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {ticket.type}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {ticket.priority}
                            </span>
                            {ticket.estimatedPoints && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {ticket.estimatedPoints} points
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                          {ticket.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
