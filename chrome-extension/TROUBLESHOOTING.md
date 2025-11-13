# Troubleshooting Guide

## LM Studio "Channel Error"

The "Channel Error" typically occurs when there's a communication issue between the extension and LM Studio. Here are solutions:

### Common Causes & Solutions

#### 1. **LM Studio Not Running or Model Not Loaded**
- **Solution**: 
  - Open LM Studio
  - Load a model (click on a model to load it)
  - Go to the "Developer" or "Local Server" tab
  - Make sure the server is running on port 1234
  - You should see "Server running on http://localhost:1234"

#### 2. **Wrong Endpoint URL**
- **Solution**:
  - Open extension settings
  - Verify endpoint is: `http://localhost:1234/v1/chat/completions`
  - Click "Test Connection" to verify it works

#### 3. **Model Taking Too Long to Respond**
- **Cause**: First request after loading model can be slow
- **Solution**: 
  - Wait for the model to "warm up" (first response can take 30-60 seconds)
  - Extension now has a 60-second timeout
  - Try again if it times out the first time

#### 4. **Chrome Extension Message Channel Timeout**
- **Cause**: LLM takes too long and Chrome closes the message channel
- **Solution**: 
  - Use a smaller/faster model in LM Studio
  - Reduce the `max_tokens` in the request
  - Check browser console for detailed error messages

#### 5. **CORS or Permission Issues**
- **Solution**:
  - Make sure you've reloaded the extension after installation
  - Check that manifest.json includes localhost permissions
  - Restart Chrome if needed

### Debugging Steps

1. **Open Browser Console**:
   - Right-click extension icon → Inspect popup
   - Check for errors in Console tab

2. **Check Background Script Logs**:
   - Go to `chrome://extensions/`
   - Find "Job Board Copy-Paste"
   - Click "service worker" link
   - Check console for `[Background]` log messages

3. **Check Content Script Logs**:
   - Open the job posting page
   - Press F12 to open DevTools
   - Check console for `[Content]` log messages

4. **Test LM Studio Directly**:
   ```bash
   curl -X POST http://localhost:1234/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [{"role": "user", "content": "Hello"}],
       "max_tokens": 50
     }'
   ```

### Error Messages Explained

- **"Channel Error"**: Message channel between content script and background script closed prematurely
- **"Cannot connect to LM Studio"**: LM Studio is not running or not on the expected port
- **"Request timed out"**: LLM took longer than 60 seconds to respond
- **"No response from background script"**: Background script didn't respond (check service worker logs)

### Recommended LM Studio Settings

- **Model**: Use a small-to-medium model (3B-7B parameters) for faster responses
- **Context Length**: 4096 or higher
- **GPU Acceleration**: Enable if available
- **Server Port**: 1234 (default)

### Fallback Strategy

If LLM continues to fail:
1. Disable "Use LLM for extraction" checkbox
2. Use traditional DOM extraction
3. Manually edit the extracted data if needed
