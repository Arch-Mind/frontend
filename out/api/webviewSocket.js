"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchMindWebSocketClient = void 0;
class ArchMindWebSocketClient {
    constructor(type, id, gatewayUrl = 'https://go-api-gateway-production-2173.up.railway.app') {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.reconnectTimer = null;
        this.listeners = new Map();
        this.globalListeners = new Set();
        this.isIntentionallyClosed = false;
        this.type = type;
        this.id = id;
        const wsProtocol = gatewayUrl.startsWith('https') ? 'wss' : 'ws';
        const baseUrl = gatewayUrl.replace(/^https?:\/\//, '');
        this.url = `${wsProtocol}://${baseUrl}/ws/${type}/${id}`;
    }
    connect() {
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
                    const update = JSON.parse(event.data);
                    this.handleUpdate(update);
                }
                catch (error) {
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
        }
        catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
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
    handleUpdate(update) {
        const specificKey = update.job_id || update.repo_id;
        if (specificKey) {
            const specificListeners = this.listeners.get(specificKey);
            if (specificListeners) {
                specificListeners.forEach(listener => {
                    try {
                        listener(update);
                    }
                    catch (error) {
                        console.error('Error in WebSocket listener:', error);
                    }
                });
            }
        }
        this.globalListeners.forEach(listener => {
            try {
                listener(update);
            }
            catch (error) {
                console.error('Error in WebSocket listener:', error);
            }
        });
    }
    subscribe(id, callback) {
        if (!this.listeners.has(id)) {
            this.listeners.set(id, new Set());
        }
        this.listeners.get(id)?.add(callback);
        return () => {
            this.listeners.get(id)?.delete(callback);
        };
    }
    subscribeAll(callback) {
        this.globalListeners.add(callback);
        return () => {
            this.globalListeners.delete(callback);
        };
    }
    disconnect() {
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
exports.ArchMindWebSocketClient = ArchMindWebSocketClient;
//# sourceMappingURL=webviewSocket.js.map