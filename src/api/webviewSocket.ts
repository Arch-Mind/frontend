export interface JobUpdate {
    type: 'progress' | 'status' | 'graph_update' | 'error';
    job_id?: string;
    repo_id?: string;
    status?: string;
    progress?: number;
    message?: string;
    error?: string;
    changed_nodes?: string[];
    changed_edges?: string[];
    result_summary?: Record<string, any>;
    timestamp: string;
}

export class ArchMindWebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private listeners: Map<string, Set<(update: JobUpdate) => void>> = new Map();
    private globalListeners: Set<(update: JobUpdate) => void> = new Set();
    private isIntentionallyClosed = false;
    private url: string;
    private type: 'job' | 'repo';
    private id: string;

    constructor(type: 'job' | 'repo', id: string, gatewayUrl: string = 'http://localhost:8080') {
        this.type = type;
        this.id = id;

        const wsProtocol = gatewayUrl.startsWith('https') ? 'wss' : 'ws';
        const baseUrl = gatewayUrl.replace(/^https?:\/\//, '');
        this.url = `${wsProtocol}://${baseUrl}/ws/${type}/${id}`;
    }

    public connect(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        this.isIntentionallyClosed = false;

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
            };

            this.ws.onmessage = (event) => {
                try {
                    const update: JobUpdate = JSON.parse(event.data);
                    this.handleUpdate(update);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.ws.onclose = () => {
                this.ws = null;
                if (!this.isIntentionallyClosed) {
                    this.scheduleReconnect();
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        if (this.isIntentionallyClosed || this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    private handleUpdate(update: JobUpdate): void {
        const specificKey = update.job_id || update.repo_id;
        if (specificKey) {
            const specificListeners = this.listeners.get(specificKey);
            if (specificListeners) {
                specificListeners.forEach(listener => {
                    try {
                        listener(update);
                    } catch (error) {
                        console.error('Error in WebSocket listener:', error);
                    }
                });
            }
        }

        this.globalListeners.forEach(listener => {
            try {
                listener(update);
            } catch (error) {
                console.error('Error in WebSocket listener:', error);
            }
        });
    }

    public subscribe(id: string, callback: (update: JobUpdate) => void): () => void {
        if (!this.listeners.has(id)) {
            this.listeners.set(id, new Set());
        }
        this.listeners.get(id)?.add(callback);

        return () => {
            this.listeners.get(id)?.delete(callback);
        };
    }

    public subscribeAll(callback: (update: JobUpdate) => void): () => void {
        this.globalListeners.add(callback);

        return () => {
            this.globalListeners.delete(callback);
        };
    }

    public disconnect(): void {
        this.isIntentionallyClosed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
