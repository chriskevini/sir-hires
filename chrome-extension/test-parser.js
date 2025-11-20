// Test suite for profile-parser.js
document.getElementById('parseBtn').addEventListener('click', function() {
  const input = document.getElementById('profileInput').value;
  const outputDiv = document.getElementById('output');
  
  try {
    // Parse the profile
    const parsed = parseProfileTemplate(input);
    
    // Display full parsed structure
    outputDiv.innerHTML = '<p class="success">✅ Parse successful!</p><pre>' + 
      JSON.stringify(parsed, null, 2) + '</pre>';
    
    // Extract and display specific data
    document.getElementById('topLevelOutput').textContent = 
      JSON.stringify(parsed.topLevelFields, null, 2);
    
    document.getElementById('educationOutput').textContent = 
      JSON.stringify(extractEducation(parsed), null, 2);
    
    document.getElementById('experienceOutput').textContent = 
      JSON.stringify(extractExperience(parsed), null, 2);
    
    document.getElementById('interestsOutput').textContent = 
      JSON.stringify(extractInterests(parsed), null, 2);
    
  } catch (error) {
    outputDiv.innerHTML = '<p class="error">❌ Parse failed!</p><pre>' + 
      error.message + '\n\n' + error.stack + '</pre>';
  }
});
