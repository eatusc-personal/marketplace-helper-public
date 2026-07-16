import React from 'react';

interface DebugPanelProps {
  debugLogs: string[];
  onClearLogs: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ debugLogs, onClearLogs }) => {
  return (
    <div className="debug-panel">
      <h3>Debug Logs</h3>
      <div className="debug-logs">
        {debugLogs.map((log, index) => (
          <div key={index} className="debug-log">{log}</div>
        ))}
      </div>
      <button
        className="button secondary"
        onClick={onClearLogs}
      >
        Clear Logs
      </button>
    </div>
  );
};

export default DebugPanel;