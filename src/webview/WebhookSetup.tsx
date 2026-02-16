import React, { useEffect, useMemo, useState } from 'react';
import { WebhookConfig, WebhookRequest, WebhookResponse } from '../api/types';
import { getVsCodeApi } from '../utils/vscodeApi';

interface WebhookSetupProps {
    backendUrl: string;
}

const defaultEvents = ['push', 'pull_request'];

export const WebhookSetup: React.FC<WebhookSetupProps> = ({ backendUrl }) => {
    const vscode = useMemo(() => getVsCodeApi(), []);
    const [repoUrl, setRepoUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [events, setEvents] = useState<string[]>(defaultEvents);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);

    const api = useMemo(() => new WebhookApiClient(backendUrl), [backendUrl]);

    useEffect(() => {
        vscode.postMessage({ command: 'requestConfig' });
    }, [vscode]);

    useEffect(() => {
        loadWebhooks();
    }, [api]);

    const loadWebhooks = async () => {
        try {
            setError(null);
            const response = await api.listWebhooks();
            setWebhooks(response.webhooks);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load webhooks');
        }
    };

    const handleGenerateSecret = () => {
        const generated = generateSecret();
        setSecret(generated);
    };

    const handleSave = async () => {
        if (!repoUrl) {
            setError('Repository URL is required');
            return;
        }

        setIsSaving(true);
        setMessage(null);
        setError(null);

        try {
            const payload: WebhookRequest = {
                repo_url: repoUrl,
                url: `${backendUrl}/webhooks/github`,
                secret,
                events,
            };
            await api.createWebhook(payload);
            setMessage('Webhook saved successfully');
            await loadWebhooks();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save webhook');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePing = async (id: number) => {
        try {
            setMessage(null);
            setError(null);
            await api.pingWebhook(id);
            setMessage('Webhook ping succeeded');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Webhook ping failed');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            setMessage(null);
            setError(null);
            await api.deleteWebhook(id);
            setMessage('Webhook deleted');
            await loadWebhooks();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete webhook');
        }
    };

    return (
        <div className="diagram-container webhook-setup">
            <div className="diagram-header">
                <div>
                    <h2>Webhook Setup</h2>
                    <p>Configure GitHub webhooks for live architecture updates.</p>
                </div>
            </div>

            <div className="webhook-form">
                <label>
                    GitHub Repository URL
                    <input
                        type="text"
                        value={repoUrl}
                        onChange={(event) => setRepoUrl(event.target.value)}
                        placeholder="https://github.com/org/repo.git"
                    />
                </label>

                <div className="webhook-row">
                    <label>
                        Webhook Secret
                        <input
                            type="text"
                            value={secret}
                            onChange={(event) => setSecret(event.target.value)}
                            placeholder="Generate or paste secret"
                        />
                    </label>
                    <button className="diagram-pill" onClick={handleGenerateSecret}>
                        Generate
                    </button>
                </div>

                <div className="webhook-events">
                    <span>Events</span>
                    {['push', 'pull_request'].map((eventName) => (
                        <label key={eventName}>
                            <input
                                type="checkbox"
                                checked={events.includes(eventName)}
                                onChange={() =>
                                    setEvents((prev) =>
                                        prev.includes(eventName)
                                            ? prev.filter((ev) => ev !== eventName)
                                            : [...prev, eventName]
                                    )
                                }
                            />
                            {eventName}
                        </label>
                    ))}
                </div>

                <div className="webhook-actions">
                    <button className="diagram-pill active" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Webhook'}
                    </button>
                </div>

                <div className="webhook-instructions">
                    Add this URL and secret to GitHub repo settings → Webhooks.
                </div>
            </div>

            {message && <div className="diagram-state">{message}</div>}
            {error && <div className="diagram-state diagram-error">{error}</div>}

            <div className="webhook-list">
                <h3>Existing Webhooks</h3>
                {webhooks.length === 0 ? (
                    <div className="diagram-state">No webhooks configured yet.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Repo</th>
                                <th>URL</th>
                                <th>Events</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {webhooks.map((hook) => (
                                <tr key={hook.id}>
                                    <td>{hook.id}</td>
                                    <td>{hook.repo_url || hook.repo_id}</td>
                                    <td>{hook.url}</td>
                                    <td>{(hook.events || []).join(', ')}</td>
                                    <td>
                                        <button className="diagram-pill" onClick={() => handlePing(hook.id)}>
                                            Ping
                                        </button>
                                        <button className="diagram-pill" onClick={() => handleDelete(hook.id)}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

class WebhookApiClient {
    constructor(private baseUrl: string) { }

    async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers as Record<string, string> || {}),
            },
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || response.statusText);
        }
        return response.json() as Promise<T>;
    }

    listWebhooks(): Promise<WebhookResponse> {
        return this.request<WebhookResponse>('/api/v1/webhooks');
    }

    createWebhook(payload: WebhookRequest): Promise<WebhookConfig> {
        return this.request<WebhookConfig>('/api/v1/webhooks', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    deleteWebhook(id: number): Promise<void> {
        return this.request<void>(`/api/v1/webhooks/${id}`, { method: 'DELETE' });
    }

    pingWebhook(id: number): Promise<void> {
        return this.request<void>(`/api/v1/webhooks/${id}/ping`, { method: 'POST' });
    }
}

function generateSecret(): string {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
