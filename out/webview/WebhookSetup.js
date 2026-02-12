"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookSetup = void 0;
const react_1 = __importStar(require("react"));
const vscode_api_1 = require("./vscode-api");
const defaultEvents = ['push', 'pull_request'];
const WebhookSetup = ({ backendUrl }) => {
    const vscode = (0, react_1.useMemo)(() => (0, vscode_api_1.getVsCodeApi)(), []);
    const [repoUrl, setRepoUrl] = (0, react_1.useState)('');
    const [secret, setSecret] = (0, react_1.useState)('');
    const [events, setEvents] = (0, react_1.useState)(defaultEvents);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [message, setMessage] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const [webhooks, setWebhooks] = (0, react_1.useState)([]);
    const api = (0, react_1.useMemo)(() => new WebhookApiClient(backendUrl), [backendUrl]);
    (0, react_1.useEffect)(() => {
        vscode.postMessage({ command: 'requestConfig' });
    }, [vscode]);
    (0, react_1.useEffect)(() => {
        loadWebhooks();
    }, [api]);
    const loadWebhooks = async () => {
        try {
            setError(null);
            const response = await api.listWebhooks();
            setWebhooks(response.webhooks);
        }
        catch (err) {
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
            const payload = {
                repo_url: repoUrl,
                url: `${backendUrl}/webhooks/github`,
                secret,
                events,
            };
            await api.createWebhook(payload);
            setMessage('Webhook saved successfully');
            await loadWebhooks();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save webhook');
        }
        finally {
            setIsSaving(false);
        }
    };
    const handlePing = async (id) => {
        try {
            setMessage(null);
            setError(null);
            await api.pingWebhook(id);
            setMessage('Webhook ping succeeded');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Webhook ping failed');
        }
    };
    const handleDelete = async (id) => {
        try {
            setMessage(null);
            setError(null);
            await api.deleteWebhook(id);
            setMessage('Webhook deleted');
            await loadWebhooks();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete webhook');
        }
    };
    return (react_1.default.createElement("div", { className: "diagram-container webhook-setup" },
        react_1.default.createElement("div", { className: "diagram-header" },
            react_1.default.createElement("div", null,
                react_1.default.createElement("h2", null, "Webhook Setup"),
                react_1.default.createElement("p", null, "Configure GitHub webhooks for live architecture updates."))),
        react_1.default.createElement("div", { className: "webhook-form" },
            react_1.default.createElement("label", null,
                "GitHub Repository URL",
                react_1.default.createElement("input", { type: "text", value: repoUrl, onChange: (event) => setRepoUrl(event.target.value), placeholder: "https://github.com/org/repo.git" })),
            react_1.default.createElement("div", { className: "webhook-row" },
                react_1.default.createElement("label", null,
                    "Webhook Secret",
                    react_1.default.createElement("input", { type: "text", value: secret, onChange: (event) => setSecret(event.target.value), placeholder: "Generate or paste secret" })),
                react_1.default.createElement("button", { className: "diagram-pill", onClick: handleGenerateSecret }, "Generate")),
            react_1.default.createElement("div", { className: "webhook-events" },
                react_1.default.createElement("span", null, "Events"),
                ['push', 'pull_request'].map((eventName) => (react_1.default.createElement("label", { key: eventName },
                    react_1.default.createElement("input", { type: "checkbox", checked: events.includes(eventName), onChange: () => setEvents((prev) => prev.includes(eventName)
                            ? prev.filter((ev) => ev !== eventName)
                            : [...prev, eventName]) }),
                    eventName)))),
            react_1.default.createElement("div", { className: "webhook-actions" },
                react_1.default.createElement("button", { className: "diagram-pill active", onClick: handleSave, disabled: isSaving }, isSaving ? 'Saving...' : 'Save Webhook')),
            react_1.default.createElement("div", { className: "webhook-instructions" }, "Add this URL and secret to GitHub repo settings \u2192 Webhooks.")),
        message && react_1.default.createElement("div", { className: "diagram-state" }, message),
        error && react_1.default.createElement("div", { className: "diagram-state diagram-error" }, error),
        react_1.default.createElement("div", { className: "webhook-list" },
            react_1.default.createElement("h3", null, "Existing Webhooks"),
            webhooks.length === 0 ? (react_1.default.createElement("div", { className: "diagram-state" }, "No webhooks configured yet.")) : (react_1.default.createElement("table", null,
                react_1.default.createElement("thead", null,
                    react_1.default.createElement("tr", null,
                        react_1.default.createElement("th", null, "ID"),
                        react_1.default.createElement("th", null, "Repo"),
                        react_1.default.createElement("th", null, "URL"),
                        react_1.default.createElement("th", null, "Events"),
                        react_1.default.createElement("th", null, "Actions"))),
                react_1.default.createElement("tbody", null, webhooks.map((hook) => (react_1.default.createElement("tr", { key: hook.id },
                    react_1.default.createElement("td", null, hook.id),
                    react_1.default.createElement("td", null, hook.repo_url || hook.repo_id),
                    react_1.default.createElement("td", null, hook.url),
                    react_1.default.createElement("td", null, (hook.events || []).join(', ')),
                    react_1.default.createElement("td", null,
                        react_1.default.createElement("button", { className: "diagram-pill", onClick: () => handlePing(hook.id) }, "Ping"),
                        react_1.default.createElement("button", { className: "diagram-pill", onClick: () => handleDelete(hook.id) }, "Delete")))))))))));
};
exports.WebhookSetup = WebhookSetup;
class WebhookApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async request(path, options = {}) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || response.statusText);
        }
        return response.json();
    }
    listWebhooks() {
        return this.request('/api/v1/webhooks');
    }
    createWebhook(payload) {
        return this.request('/api/v1/webhooks', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
    deleteWebhook(id) {
        return this.request(`/api/v1/webhooks/${id}`, { method: 'DELETE' });
    }
    pingWebhook(id) {
        return this.request(`/api/v1/webhooks/${id}/ping`, { method: 'POST' });
    }
}
function generateSecret() {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
//# sourceMappingURL=WebhookSetup.js.map