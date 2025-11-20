// Test suite for profile-parser.js and profile-validator.js
document.getElementById('parseBtn').addEventListener('click', function() {
  const input = document.getElementById('profileInput').value;
  const outputDiv = document.getElementById('output');
  const validationDiv = document.getElementById('validationOutput');
  
  try {
    // Parse the profile
    const parsed = parseProfileTemplate(input);
    
    // Display full parsed structure
    outputDiv.innerHTML = '<p class="success">✅ Parse successful!</p><pre>' + 
      JSON.stringify(parsed, null, 2) + '</pre>';
    
    // Validate the parsed profile
    const validation = validateProfileTemplate(parsed);
    const summary = getValidationSummary(validation);
    
    // Display validation results
    validationDiv.innerHTML = '<pre>' + summary + '</pre>' +
      '<details style="margin-top: 16px;"><summary style="cursor: pointer; font-weight: 600;">Full Validation Object</summary><pre>' +
      JSON.stringify(validation, null, 2) + '</pre></details>';
    
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
