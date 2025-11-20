// Master Resume Editor
let savedContent = '';
let draftContent = '';
let autoSaveInterval = null;
let lastSavedTime = null;

// Load resume on page load
async function loadResume() {
  try {
    // First, check chrome.storage.local for saved resume
    const result = await chrome.storage.local.get(['masterResume']);
    
    if (result.masterResume && result.masterResume.content) {
      savedContent = result.masterResume.content;
      lastSavedTime = result.masterResume.updatedAt;
      document.getElementById('resumeEditor').value = savedContent;
      updateLastSavedText();
    } else {
      // Check for draft in localStorage
      const draft = localStorage.getItem('masterResumeDraft');
      if (draft) {
        draftContent = draft;
        document.getElementById('resumeEditor').value = draft;
        updateLastSavedText('Draft recovered');
      }
    }
  } catch (error) {
    console.error('Error loading resume:', error);
    showStatus('Error loading resume', 'error');
  }
}

// Auto-save draft to localStorage
function startAutoSave() {
  autoSaveInterval = setInterval(() => {
    const editor = document.getElementById('resumeEditor');
    const currentContent = editor.value.trim();
    
    if (currentContent !== savedContent) {
      localStorage.setItem('masterResumeDraft', currentContent);
      draftContent = currentContent;
      updateLastSavedText('Draft auto-saved');
    }
  }, 3000); // Auto-save every 3 seconds
}

// Save resume to chrome.storage.local
async function saveResume() {
  const editor = document.getElementById('resumeEditor');
  const content = editor.value.trim();
  
  if (!content) {
    showStatus('Resume cannot be empty', 'error');
    return;
  }
  
  try {
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    const resumeData = {
      content: content,
      updatedAt: new Date().toISOString()
    };
    
    await chrome.storage.local.set({ masterResume: resumeData });
    
    savedContent = content;
    lastSavedTime = resumeData.updatedAt;
    
    // Clear draft from localStorage since it's now saved
    localStorage.removeItem('masterResumeDraft');
    
    showStatus('Resume saved successfully!', 'success');
    updateLastSavedText();
    
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  } catch (error) {
    console.error('Error saving resume:', error);
    showStatus('Error saving resume: ' + error.message, 'error');
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
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
  
  const now = new Date();
  const saved = new Date(lastSavedTime);
  const diffMs = now - saved;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  let timeText = '';
  if (diffMins < 1) {
    timeText = 'just now';
  } else if (diffMins < 60) {
    timeText = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    timeText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    timeText = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  
  lastSavedEl.textContent = `Last saved: ${timeText}`;
  lastSavedEl.className = 'last-saved';
}

// Check if content has unsaved changes
function checkUnsavedChanges() {
  const editor = document.getElementById('resumeEditor');
  const currentContent = editor.value.trim();
  const lastSavedEl = document.getElementById('lastSaved');
  
  if (currentContent !== savedContent && currentContent !== '') {
    if (!lastSavedEl.textContent.includes('unsaved changes')) {
      lastSavedEl.textContent = '* Unsaved changes';
      lastSavedEl.className = 'last-saved unsaved-indicator';
    }
  } else if (lastSavedTime) {
    updateLastSavedText();
  }
}

// Show status message
function showStatus(message, type = 'success') {
  const lastSavedEl = document.getElementById('lastSaved');
  const originalText = lastSavedEl.textContent;
  
  lastSavedEl.textContent = message;
  lastSavedEl.className = `last-saved ${type === 'error' ? 'unsaved-indicator' : ''}`;
  
  if (type === 'success') {
    setTimeout(() => {
      updateLastSavedText();
    }, 2000);
  }
}

// Export resume as markdown
function exportMarkdown() {
  const editor = document.getElementById('resumeEditor');
  const content = editor.value.trim();
  
  if (!content) {
    showStatus('Nothing to export', 'error');
    return;
  }
  
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `master-resume-${timestamp}.md`;
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });
  
  showStatus('Exported as ' + filename, 'success');
}

// Export resume as plain text
function exportText() {
  const editor = document.getElementById('resumeEditor');
  const content = editor.value.trim();
  
  if (!content) {
    showStatus('Nothing to export', 'error');
    return;
  }
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `master-resume-${timestamp}.txt`;
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });
  
  showStatus('Exported as ' + filename, 'success');
}

// Toggle markdown guide
function toggleMarkdownGuide() {
  const guide = document.getElementById('markdownGuide');
  const btn = document.getElementById('markdownGuideBtn');
  
  if (guide.classList.contains('hidden')) {
    guide.classList.remove('hidden');
    btn.textContent = '📖 Markdown Guide ▲';
  } else {
    guide.classList.add('hidden');
    btn.textContent = '📖 Markdown Guide ▼';
  }
}

// Navigate back to viewer
function goBack() {
  window.location.href = 'job-details.html';
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  loadResume();
  startAutoSave();
  
  // Update last saved time every minute
  setInterval(() => {
    if (lastSavedTime) {
      updateLastSavedText();
    }
  }, 60000);
  
  // Check for unsaved changes
  document.getElementById('resumeEditor').addEventListener('input', checkUnsavedChanges);
  
  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveResume);
  
  // Keyboard shortcut: Ctrl/Cmd + S to save
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveResume();
    }
  });
  
  // Back button
  document.getElementById('backBtn').addEventListener('click', goBack);
  
  // Export buttons
  document.getElementById('exportMdBtn').addEventListener('click', exportMarkdown);
  document.getElementById('exportTxtBtn').addEventListener('click', exportText);
  
  // Markdown guide toggle
  document.getElementById('markdownGuideBtn').addEventListener('click', toggleMarkdownGuide);
  
  // Close markdown guide when clicking outside
  document.addEventListener('click', function(e) {
    const guide = document.getElementById('markdownGuide');
    const btn = document.getElementById('markdownGuideBtn');
    
    if (!guide.contains(e.target) && e.target !== btn && !guide.classList.contains('hidden')) {
      guide.classList.add('hidden');
      btn.textContent = '📖 Markdown Guide ▼';
    }
  });
});

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', function(e) {
  const editor = document.getElementById('resumeEditor');
  const currentContent = editor.value.trim();
  
  if (currentContent !== savedContent && currentContent !== '') {
    e.preventDefault();
    e.returnValue = '';
  }
});
