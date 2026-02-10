import React from 'react';

export interface NotificationEntry {
    id: string;
    message: string;
    timestamp: string;
}

interface NotificationHistoryProps {
    entries: NotificationEntry[];
    onClear: () => void;
}

export const NotificationHistory: React.FC<NotificationHistoryProps> = ({ entries, onClear }) => {
    if (entries.length === 0) {
        return null;
    }

    return (
        <div className="notification-panel">
            <div className="notification-header">
                <span>Recent Updates</span>
                <button onClick={onClear}>Clear</button>
            </div>
            <ul>
                {entries.map((entry) => (
                    <li key={entry.id}>
                        <span>{entry.message}</span>
                        <time>{entry.timestamp}</time>
                    </li>
                ))}
            </ul>
        </div>
    );
};
