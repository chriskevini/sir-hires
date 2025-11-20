// Profile Editor (formerly Master Resume Editor)
let savedContent = '';
let draftContent = '';
let autoSaveInterval = null;
let lastSavedTime = null;

// Load profile on page load
async function loadProfile() {
  try {
    // First, check chrome.storage.local for saved profile
    const result = await chrome.storage.local.get(['userProfile']);
    
    if (result.userProfile && result.userProfile.content) {
      savedContent = result.userProfile.content;
      lastSavedTime = result.userProfile.updatedAt;
      document.getElementById('profileEditor').value = savedContent;
      updateLastSavedText();
    } else {
      // Check for draft in localStorage
      const draft = localStorage.getItem('userProfileDraft');
      if (draft) {
        draftContent = draft;
        document.getElementById('profileEditor').value = draft;
        updateLastSavedText('Draft recovered');
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    showStatus('Error loading profile', 'error');
  }
}

// Auto-save to chrome.storage.local every 3 seconds
function startAutoSave() {
  autoSaveInterval = setInterval(async () => {
    const editor = document.getElementById('profileEditor');
    const currentContent = editor.value.trim();
    
    if (currentContent !== savedContent) {
      try {
        // Save to chrome.storage.local
        const profileData = {
          content: currentContent,
          updatedAt: new Date().toISOString()
        };
        
        await chrome.storage.local.set({ userProfile: profileData });
        
        savedContent = currentContent;
        lastSavedTime = profileData.updatedAt;
        
        // Also save to localStorage as backup
        localStorage.setItem('userProfileDraft', currentContent);
        
        updateLastSavedText();
      } catch (error) {
        console.error('Auto-save error:', error);
        // Keep localStorage backup even if chrome.storage fails
        localStorage.setItem('userProfileDraft', currentContent);
      }
    }
  }, 3000); // Auto-save every 3 seconds
}

// Format date: HH:MM if today, relative date if not today
function formatLastSavedTime(isoTimestamp) {
  const now = new Date();
  const saved = new Date(isoTimestamp);
  
  // Check if it's today
  const isToday = now.toDateString() === saved.toDateString();
  
  if (isToday) {
    // Format as HH:MM
    const hours = saved.getHours().toString().padStart(2, '0');
    const minutes = saved.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } else {
    // Format as relative date
    const diffMs = now - saved;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
  }
}

// Update last saved text
function updateLastSavedText(customText = null) {
  const lastSavedEl = document.getElementById('lastSaved');
  
  if (customText) {
    lastSavedEl.textContent = customText;
    lastSavedEl.className = 'last-saved unsaved-indicator';
    return;
  }
  
  if (!lastSavedTime) {
    lastSavedEl.textContent = '';
    return;
  }
  
  const timeText = formatLastSavedTime(lastSavedTime);
  lastSavedEl.textContent = `Last saved: ${timeText}`;
  lastSavedEl.className = 'last-saved';
}

// Show status message
function showStatus(message, type = 'success') {
  const lastSavedEl = document.getElementById('lastSaved');
  
  lastSavedEl.textContent = message;
  lastSavedEl.className = `last-saved ${type === 'error' ? 'unsaved-indicator' : ''}`;
  
  if (type === 'success') {
    setTimeout(() => {
      updateLastSavedText();
    }, 2000);
  }
}

// Export profile as markdown
function exportMarkdown() {
  const editor = document.getElementById('profileEditor');
  const content = editor.value.trim();
  
  if (!content) {
    showStatus('Nothing to export', 'error');
    return;
  }
  
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `profile-${timestamp}.md`;
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });
  
  showStatus('Exported as ' + filename, 'success');
}

// Export profile as plain text
function exportText() {
  const editor = document.getElementById('profileEditor');
  const content = editor.value.trim();
  
  if (!content) {
    showStatus('Nothing to export', 'error');
    return;
  }
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `profile-${timestamp}.txt`;
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });
  
  showStatus('Exported as ' + filename, 'success');
}

// Toggle template panel visibility
function toggleTemplatePanel() {
  const panel = document.getElementById('templatePanel');
  panel.classList.toggle('hidden');
}

// Close template panel
function closeTemplatePanel() {
  const panel = document.getElementById('templatePanel');
  panel.classList.add('hidden');
}

// Navigate back to viewer
function goBack() {
  window.location.href = 'job-details.html';
}

// Validation state
let validationDebounceTimer = null;
let isValidationPanelCollapsed = true;

// Toggle validation panel
function toggleValidationPanel() {
  const panel = document.getElementById('validationPanel');
  const toggle = document.querySelector('.validation-toggle');
  
  isValidationPanelCollapsed = !isValidationPanelCollapsed;
  
  if (isValidationPanelCollapsed) {
    panel.classList.add('collapsed');
    toggle.textContent = '▼';
  } else {
    panel.classList.remove('collapsed');
    toggle.textContent = '▲';
  }
}

// Validate profile content (wrapper function)
function runValidation(content) {
  // If content is empty, show no validation
  if (!content || content.trim().length === 0) {
    return {
      errors: [],
      warnings: [],
      info: [],
      customFields: [],
      customSections: []
    };
  }
  
  try {
    // Parse the profile
    const parsed = parseProfile(content);
    
    // Validate the parsed profile
    const validation = validateProfile(parsed);
    
    return validation;
  } catch (error) {
    // Parse error
    return {
      errors: [`Parse error: ${error.message}`],
      warnings: [],
      info: [],
      customFields: [],
      customSections: []
    };
  }
}

// Update validation UI
function updateValidationUI(validation) {
  const editor = document.getElementById('profileEditor');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const errorCount = document.getElementById('errorCount');
  const warningCount = document.getElementById('warningCount');
  const infoCount = document.getElementById('infoCount');
  const validationContent = document.getElementById('validationContent');
  
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const hasInfo = validation.info.length > 0;
  const hasCustomFields = validation.customFields.length > 0;
  const hasCustomSections = validation.customSections.length > 0;
  
  // Update textarea border color
  editor.classList.remove('has-errors', 'has-warnings', 'is-valid');
  if (hasErrors) {
    editor.classList.add('has-errors');
  } else if (hasWarnings) {
    editor.classList.add('has-warnings');
  } else if (editor.value.trim().length > 0) {
    editor.classList.add('is-valid');
  }
  
  // Update status icon and text
  if (hasErrors) {
    statusIcon.textContent = '✗';
    statusIcon.style.color = '#d93025';
    statusText.textContent = 'Validation Errors';
    statusText.style.color = '#d93025';
  } else if (hasWarnings) {
    statusIcon.textContent = '⚠';
    statusIcon.style.color = '#ea8600';
    statusText.textContent = 'Validation Warnings';
    statusText.style.color = '#ea8600';
  } else if (editor.value.trim().length > 0) {
    statusIcon.textContent = '✓';
    statusIcon.style.color = '#0f9d58';
    statusText.textContent = 'Valid Profile';
    statusText.style.color = '#0f9d58';
  } else {
    statusIcon.textContent = '○';
    statusIcon.style.color = '#666';
    statusText.textContent = 'No Content';
    statusText.style.color = '#666';
  }
  
  // Update counts
  if (hasErrors) {
    errorCount.textContent = `${validation.errors.length} error${validation.errors.length > 1 ? 's' : ''}`;
    errorCount.style.display = 'block';
  } else {
    errorCount.style.display = 'none';
  }
  
  if (hasWarnings) {
    warningCount.textContent = `${validation.warnings.length} warning${validation.warnings.length > 1 ? 's' : ''}`;
    warningCount.style.display = 'block';
  } else {
    warningCount.style.display = 'none';
  }
  
  const customCount = validation.customFields.length + validation.customSections.length;
  if (hasInfo || customCount > 0) {
    infoCount.textContent = `${customCount} custom`;
    infoCount.style.display = 'block';
  } else {
    infoCount.style.display = 'none';
  }
  
  // Build validation messages HTML
  let messagesHTML = '';
  
  // Errors
  validation.errors.forEach(error => {
    messagesHTML += `<div class="validation-message validation-error">${escapeHtml(error.message)}</div>`;
  });
  
  // Warnings
  validation.warnings.forEach(warning => {
    messagesHTML += `<div class="validation-message validation-warning">${escapeHtml(warning.message)}</div>`;
  });
  
  // Info messages
  validation.info.forEach(info => {
    messagesHTML += `<div class="validation-message validation-info">${escapeHtml(info.message)}</div>`;
  });
  
  // Custom fields
  if (hasCustomFields) {
    const fieldsText = validation.customFields.join(', ');
    messagesHTML += `<div class="validation-message validation-info">✨ Custom fields detected: ${escapeHtml(fieldsText)}</div>`;
  }
  
  // Custom sections
  if (hasCustomSections) {
    const sectionsText = validation.customSections.join(', ');
    messagesHTML += `<div class="validation-message validation-info">✨ Custom sections detected: ${escapeHtml(sectionsText)}</div>`;
  }
  
  // If no messages, show empty state
  if (!messagesHTML) {
    messagesHTML = '<div class="validation-empty">No validation messages</div>';
  }
  
  validationContent.innerHTML = messagesHTML;
}

// Debounced validation
function scheduleValidation() {
  if (validationDebounceTimer) {
    clearTimeout(validationDebounceTimer);
  }
  
  validationDebounceTimer = setTimeout(() => {
    const editor = document.getElementById('profileEditor');
    const content = editor.value;
    const validation = runValidation(content);
    updateValidationUI(validation);
  }, 500); // Validate 500ms after user stops typing
}

// Escape HTML for safe display
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  loadProfile();
  startAutoSave();
  
  // Run initial validation after content loads
  setTimeout(() => {
    const editor = document.getElementById('profileEditor');
    const validation = runValidation(editor.value);
    updateValidationUI(validation);
  }, 100);
  
  // Update last saved time every minute
  setInterval(() => {
    if (lastSavedTime) {
      updateLastSavedText();
    }
  }, 60000);
  
  // Back button
  document.getElementById('backBtn').addEventListener('click', goBack);
  
  // Export buttons
  document.getElementById('exportMdBtn').addEventListener('click', exportMarkdown);
  document.getElementById('exportTxtBtn').addEventListener('click', exportText);
  
  // Template panel close button
  document.getElementById('templatePanelClose').addEventListener('click', closeTemplatePanel);
  
  // Show template button (when hidden)
  document.getElementById('templateGuideBtn').addEventListener('click', toggleTemplatePanel);
  
  // Validation panel toggle
  document.getElementById('validationHeader').addEventListener('click', toggleValidationPanel);
  
  // Real-time validation on content change
  document.getElementById('profileEditor').addEventListener('input', scheduleValidation);
});
