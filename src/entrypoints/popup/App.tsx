import { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { checklistTemplates, llmConfig } from '../../config';
import {
  llmSettingsStorage,
  jobsStorage,
  jobInFocusStorage,
} from '../../utils/storage';
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
  const [showSettings, setShowSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('success');
  const [extracting, setExtracting] = useState(false);
  const [extractable, setExtractable] = useState(true);
  const [testing, setTesting] = useState(false);

  // Settings state
  const [llmEndpoint, setLlmEndpoint] = useState(
    'http://localhost:1234/v1/chat/completions'
  );
  const [llmModel, setLlmModel] = useState('');

  useEffect(() => {
    loadSettings();
    checkIfExtractable();
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

  const checkIfExtractable = async () => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (
        !tab ||
        !tab.url ||
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://')
      ) {
        setExtractable(false);

        if (tab.url && tab.url.includes('job-details.html')) {
          showStatus(
            'You are viewing your saved jobs. Navigate to a job posting to extract data.',
            'info'
          );
        }
      } else {
        setExtractable(true);
      }
    } catch (error) {
      console.error('Error checking if page is extractable:', error);
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

  const handleExtractJob = async () => {
    setExtracting(true);

    try {
      const llmSettings: LLMSettings =
        (await llmSettingsStorage.getValue()) || {
          endpoint: 'http://localhost:1234/v1/chat/completions',
          modelsEndpoint: 'http://localhost:1234/v1/models',
          model: '',
          maxTokens: 2000,
          temperature: 0.3,
          enabled: true,
        };

      if (!llmSettings.endpoint || llmSettings.endpoint.trim() === '') {
        showStatus(
          '⚠️ LLM endpoint not configured. Please configure settings first.',
          'error'
        );
        setShowSettings(true);
        return;
      }

      await openSidePanel(false);

      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (
        tab.url?.startsWith('chrome://') ||
        tab.url?.startsWith('chrome-extension://')
      ) {
        showStatus(
          'Cannot extract data from Chrome internal pages. Please navigate to a job posting.',
          'error'
        );
        return;
      }

      try {
        const preCheckResponse = await browser.tabs.sendMessage(tab.id!, {
          action: 'getJobUrl',
        });

        let jobId = await determineJobId(preCheckResponse);

        const response = await browser.tabs.sendMessage(tab.id!, {
          action: 'streamExtractJobData',
          llmSettings: llmSettings,
          jobId: jobId,
        });

        if (response && response.success) {
          await handleSuccessfulExtraction(response, llmSettings);
        } else {
          throw new Error('Failed to start streaming extraction');
        }
      } catch (error) {
        console.error(
          '[Popup] Streaming extraction failed, trying to inject content script:',
          error
        );

        await retryWithContentScriptInjection(tab.id!, llmSettings);
      }
    } catch (error) {
      console.error('Error extracting job data:', error);
      showStatus(
        'Error: ' +
          (error as Error).message +
          '. Make sure LM Studio is running and configured correctly.',
        'error'
      );
    } finally {
      setExtracting(false);
    }
  };

  const determineJobId = async (preCheckResponse: any): Promise<string> => {
    if (preCheckResponse && preCheckResponse.url) {
      const jobs = (await jobsStorage.getValue()) || {};

      const existingJobId = Object.keys(jobs).find((id) => {
        const job = jobs[id];
        return (
          job.url &&
          normalizeUrl(job.url) === normalizeUrl(preCheckResponse.url)
        );
      });

      if (existingJobId) {
        console.info('[Popup] Re-extracting existing job:', existingJobId);
        return existingJobId;
      }
    }

    const newJobId = generateJobId();
    console.info('[Popup] Creating new job extraction:', newJobId);
    return newJobId;
  };

  const handleSuccessfulExtraction = async (
    response: any,
    llmSettings: LLMSettings
  ) => {
    const extractionJobId = response.jobId;

    console.info(
      '[Popup] Sending prepareForExtraction to sidepanel:',
      extractionJobId
    );
    await browser.runtime
      .sendMessage({
        action: 'prepareForExtraction',
        jobId: extractionJobId,
        url: response.url,
        source: response.source,
      })
      .catch((err) => {
        console.warn(
          '[Popup] Failed to send prepareForExtraction (sidepanel may not be open):',
          err
        );
      });

    await jobInFocusStorage.setValue(extractionJobId);
    console.info('[Popup] Set jobInFocus for main app:', extractionJobId);

    showStatus('✨ Starting extraction...', 'success');

    await browser.runtime
      .sendMessage({
        action: 'streamExtractJob',
        jobId: extractionJobId,
        url: response.url,
        source: response.source,
        rawText: response.rawText,
        llmSettings: llmSettings,
      })
      .catch((err) => {
        console.error('[Popup] Failed to send streaming message:', err);
      });

    showStatus('✨ Extraction in progress! Check side panel.', 'success');

    setTimeout(() => {
      window.close();
    }, 1000);
  };

  const retryWithContentScriptInjection = async (
    tabId: number,
    llmSettings: LLMSettings
  ) => {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/content.js'],
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const retryPreCheckResponse = await browser.tabs.sendMessage(tabId, {
      action: 'getJobUrl',
    });

    const retryJobId = await determineJobId(retryPreCheckResponse);

    const response = await browser.tabs.sendMessage(tabId, {
      action: 'streamExtractJobData',
      llmSettings: llmSettings,
      jobId: retryJobId,
    });

    if (response && response.success) {
      await handleSuccessfulExtraction(response, llmSettings);
    } else {
      throw new Error(
        'Failed to start streaming extraction after injecting content script'
      );
    }
  };

  const handleOpenApp = async () => {
    try {
      const appUrl = browser.runtime.getURL('job-details.html');
      await browser.tabs.create({ url: appUrl });
      console.info('Opened app in new tab');
      window.close();
    } catch (error) {
      console.error('Error opening app:', error);
      showStatus('Could not open app: ' + (error as Error).message, 'error');
    }
  };

  const openSidePanel = async (closePopup = true) => {
    try {
      const currentWindow = await browser.windows.getCurrent();
      await browser.sidePanel.open({ windowId: currentWindow.id });
      console.info('Side panel opened');

      if (closePopup) {
        setTimeout(() => {
          window.close();
        }, 100);
      }
    } catch (error) {
      console.error('Error opening side panel:', error);
      showStatus('Could not open side panel. Try using Ctrl+Shift+H.', 'error');
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

      setTimeout(() => {
        setShowSettings(false);
      }, 1000);
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
        <h1>Sir Hires</h1>
        <button
          id="settingsBtn"
          className="btn-icon"
          title="Settings"
          onClick={() => setShowSettings(!showSettings)}
        >
          ⚙️
        </button>
      </header>

      {statusMessage && (
        <div className={`status ${statusType}`}>{statusMessage}</div>
      )}

      {showSettings && (
        <div id="settingsSection">
          <h3>⚙️ LLM Settings</h3>
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
              placeholder={llmConfig.extraction.defaultModel}
            />
            <small>
              Leave empty to use default ({llmConfig.extraction.defaultModel})
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
        </div>
      )}

      <div id="mainActions">
        <button
          id="extractBtn"
          className="btn btn-primary btn-large"
          onClick={handleExtractJob}
          disabled={!extractable || extracting}
          title={!extractable ? 'Cannot extract from this page' : ''}
        >
          {extracting ? 'Extracting...' : 'Extract Job Data'}
        </button>
        <button
          id="openAppBtn"
          className="btn btn-success"
          onClick={handleOpenApp}
        >
          Open App
        </button>
        <button
          id="openSidePanelBtn"
          className="btn btn-secondary"
          onClick={() => openSidePanel(true)}
        >
          Open Side Panel
        </button>

        <div className="tip-box">
          <span className="tip-icon">💡</span>
          <span className="tip-text">
            Tip: Press <kbd>Ctrl+Shift+H</kbd> to toggle the side panel
          </span>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function generateJobId(): string {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.origin + urlObj.pathname.replace(/\/$/, '');
  } catch (e) {
    return url;
  }
}
