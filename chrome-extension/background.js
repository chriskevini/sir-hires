// Background service worker for the extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Board Copy-Paste extension installed');
  
  // Initialize storage if needed
  chrome.storage.local.get(['jobs'], (result) => {
    if (!result.jobs) {
      chrome.storage.local.set({ jobs: [] });
    }
  });
});

// Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getJobs') {
    chrome.storage.local.get(['jobs'], (result) => {
      sendResponse({ jobs: result.jobs || [] });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'saveJob') {
    chrome.storage.local.get(['jobs'], (result) => {
      const jobs = result.jobs || [];
      jobs.push(request.job);
      chrome.storage.local.set({ jobs }, () => {
        sendResponse({ success: true, count: jobs.length });
      });
    });
    return true;
  }

  if (request.action === 'callLLM') {
    // Handle LLM API calls from content script
    (async () => {
      try {
        const data = await callLLMAPI(request.endpoint, request.requestBody);
        sendResponse({ success: true, data: data });
      } catch (error) {
        console.error('[Background] LLM call failed:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});

// Function to call LLM API (runs in background with proper permissions)
async function callLLMAPI(endpoint, requestBody) {
  console.log('[Background] Calling LLM API:', endpoint);
  console.log('[Background] Request body:', JSON.stringify(requestBody, null, 2));
  
  try {
    // Add a timeout for the fetch request (60 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('[Background] LLM API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Background] LLM API error response:', errorText);
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Background] LLM API success, response length:', JSON.stringify(data).length);
    return data;
  } catch (error) {
    console.error('[Background] Error calling LLM API:', error);
    
    // Provide more specific error messages
    if (error.name === 'AbortError') {
      throw new Error('LLM request timed out after 60 seconds');
    } else if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to LM Studio. Make sure it is running on ' + endpoint);
    } else {
      throw error;
    }
  }
}
