// Test suite for job-parser.js and job-validator.js
document.getElementById('parseBtn').addEventListener('click', function() {
  const input = document.getElementById('jobInput').value;
  const outputDiv = document.getElementById('output');
  const validationDiv = document.getElementById('validationOutput');
  
  try {
    // Parse the job
    const parsed = parseJobTemplate(input);
    
    // Display full parsed structure
    outputDiv.innerHTML = '<p class="success">✅ Parse successful!</p><pre>' + 
      JSON.stringify(parsed, null, 2) + '</pre>';
    
    // Validate the parsed job
    const validation = validateJobTemplate(parsed);
    const summary = getValidationSummary(validation);
    
    // Display validation results
    validationDiv.innerHTML = '<pre>' + summary + '</pre>' +
      '<details style="margin-top: 16px;"><summary style="cursor: pointer; font-weight: 600;">Full Validation Object</summary><pre>' +
      JSON.stringify(validation, null, 2) + '</pre></details>';
    
    // Extract and display specific data
    document.getElementById('topLevelOutput').textContent = 
      JSON.stringify(parsed.topLevelFields, null, 2);
    
    document.getElementById('requiredSkillsOutput').textContent = 
      JSON.stringify(extractRequiredSkills(parsed), null, 2);
    
    document.getElementById('descriptionOutput').textContent = 
      JSON.stringify(extractDescription(parsed), null, 2);
    
    document.getElementById('preferredSkillsOutput').textContent = 
      JSON.stringify(extractPreferredSkills(parsed), null, 2);
    
    document.getElementById('aboutCompanyOutput').textContent = 
      JSON.stringify(extractAboutCompany(parsed), null, 2);
    
    // Display custom fields and sections
    const customInfo = {
      customFields: validation.customFields || [],
      customSections: validation.customSections || []
    };
    document.getElementById('customOutput').textContent = 
      JSON.stringify(customInfo, null, 2);
    
  } catch (error) {
    outputDiv.innerHTML = '<p class="error">❌ Parse failed!</p><pre>' + 
      error.message + '\n\n' + error.stack + '</pre>';
  }
});
