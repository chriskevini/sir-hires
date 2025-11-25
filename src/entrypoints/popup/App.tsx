import { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { llmConfig } from '../../config';
import { llmSettingsStorage } from '../../utils/storage';
import './styles.css';

interface LLMSettings {
  endpoint: string;
  modelsEndpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;
  enabled?: boolean;
}

type StatusType = 'success' | 'error' | 'info';

export function App() {
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('success');
  const [testing, setTesting] = useState(false);

  // Settings state
  const [llmEndpoint, setLlmEndpoint] = useState(
    'http://localhost:1234/v1/chat/completions'
  );
  const [llmModel, setLlmModel] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = (await llmSettingsStorage.getValue()) || {
        endpoint: 'http://localhost:1234/v1/chat/completions',
        modelsEndpoint: 'http://localhost:1234/v1/models',
        model: '',
        maxTokens: 2000,
        temperature: 0.3,
      };

      setLlmEndpoint(settings.endpoint);
      setLlmModel(settings.model || '');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const showStatus = (message: string, type: StatusType = 'success') => {
    setStatusMessage(message);
    setStatusType(type);

    if (type !== 'error') {
      setTimeout(() => {
        setStatusMessage('');
      }, 5000);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const settings: LLMSettings = {
        endpoint:
          llmEndpoint.trim() || 'http://localhost:1234/v1/chat/completions',
        modelsEndpoint: 'http://localhost:1234/v1/models',
        model: llmModel.trim(),
        maxTokens: 2000,
        temperature: 0.3,
      };

      await llmSettingsStorage.setValue(settings);
      showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus('Error saving settings: ' + (error as Error).message, 'error');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);

    try {
      const endpoint =
        llmEndpoint.trim() || 'http://localhost:1234/v1/chat/completions';
      const model = llmModel.trim();

      const requestBody = {
        model: model || 'local-model',
        messages: [{ role: 'user', content: 'Hello, this is a test message.' }],
        max_tokens: 50,
        temperature: 0.7,
      };

      const response = await browser.runtime.sendMessage({
        action: 'callLLM',
        endpoint: endpoint,
        requestBody: requestBody,
      });

      if (response.success) {
        showStatus('✓ Connection successful! LLM is responding.', 'success');
      } else {
        showStatus(`Connection failed: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('Error testing LLM:', error);
      showStatus(
        'Connection failed: ' +
          (error as Error).message +
          '. Make sure LM Studio is running.',
        'error'
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Sir Hires - Settings</h1>
      </header>

      {statusMessage && (
        <div className={`status ${statusType}`}>{statusMessage}</div>
      )}

      <div id="settingsSection">
        <h3>⚙️ LLM Configuration</h3>
        <div className="info-box">
          <span className="info-icon">ℹ️</span>
          <span>
            Job extraction requires LM Studio running locally with a model
            loaded.
          </span>
        </div>
        <div className="form-group">
          <label htmlFor="llmEndpoint">LLM API Endpoint</label>
          <input
            type="text"
            id="llmEndpoint"
            value={llmEndpoint}
            onChange={(e) => setLlmEndpoint(e.target.value)}
            placeholder="http://localhost:1234/v1/chat/completions"
          />
          <small>Default: LM Studio (http://localhost:1234)</small>
        </div>
        <div className="form-group">
          <label htmlFor="llmModel">Model Name (optional)</label>
          <input
            type="text"
            id="llmModel"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            placeholder={llmConfig.jobExtraction.model || llmConfig.model}
          />
          <small>
            Leave empty to use default (
            {llmConfig.jobExtraction.model || llmConfig.model})
          </small>
        </div>
        <div className="button-group">
          <button
            id="saveSettingsBtn"
            className="btn btn-primary"
            onClick={handleSaveSettings}
          >
            Save Settings
          </button>
          <button
            id="testLlmBtn"
            className="btn btn-secondary"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        <div className="info-box" style={{ marginTop: '20px' }}>
          <span className="info-icon">💡</span>
          <span>
            <strong>Quick Tips:</strong>
            <ul style={{ marginTop: '8px', marginBottom: '0' }}>
              <li>Click the extension icon to open the side panel</li>
              <li>Right-click any page to extract job data directly</li>
              <li>
                Press <kbd>Ctrl+Shift+H</kbd> to toggle the side panel
              </li>
            </ul>
          </span>
        </div>
      </div>
    </div>
  );
}
