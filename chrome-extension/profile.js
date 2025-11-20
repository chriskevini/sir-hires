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

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  loadProfile();
  startAutoSave();
  
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
});
