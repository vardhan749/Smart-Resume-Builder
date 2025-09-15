// Simple Resume Builder JavaScript
// Global variables (like containers to store information)
let currentSuggestionTarget = null;
let currentSuggestionType = null;

// Get HTML elements
const resumeForm = document.getElementById('resumeForm');
const previewSection = document.getElementById('previewSection');
const resumePreview = document.getElementById('resumePreview');
const aiModal = document.getElementById('aiModal');
const aiSuggestions = document.getElementById('aiSuggestions');

// When page loads, start the app
document.addEventListener('DOMContentLoaded', function() {
    setupButtons();
    setupAddMoreButtons();
    // Clear old data for fresh start
    localStorage.removeItem('resumeBuilderData');
});

// Connect all buttons to their functions
function setupButtons() {
    // Preview button
    document.getElementById('previewBtn').addEventListener('click', showPreview);
    
    // Export PDF button
    document.getElementById('exportBtn').addEventListener('click', exportToPDF);
    
    // Close preview button
    document.getElementById('closePreview').addEventListener('click', closePreview);
    
    // AI modal buttons
    document.querySelector('.modal .close').addEventListener('click', closeAIModal);
    document.getElementById('dismissSuggestion').addEventListener('click', closeAIModal);
    document.getElementById('applySuggestion').addEventListener('click', applySuggestion);
    
    // Auto-save when user types
    resumeForm.addEventListener('input', function() {
        setTimeout(saveFormData, 1000);
    });
    
    // Clear form button
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFormData);
    }
}

// Setup add more buttons
function setupAddMoreButtons() {
    // Add experience button
    document.getElementById('addExperience').addEventListener('click', function() {
        addFormItem('experience');
    });
    
    // Add education button
    document.getElementById('addEducation').addEventListener('click', function() {
        addFormItem('education');
    });
    
    // Add project button
    document.getElementById('addProject').addEventListener('click', function() {
        addFormItem('project');
    });
}

// Add dynamic form items
function addFormItem(type) {
    let container, template;
    
    switch(type) {
        case 'experience':
            container = document.getElementById('experienceContainer');
            template = createExperienceTemplate();
            break;
        case 'education':
            container = document.getElementById('educationContainer');
            template = createEducationTemplate();
            break;
        case 'project':
            container = document.getElementById('projectsContainer');
            template = createProjectTemplate();
            break;
    }
    
    const div = document.createElement('div');
    div.innerHTML = template;
    const newItem = div.firstElementChild;
    
    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', function() {
        newItem.remove();
    });
    newItem.appendChild(removeBtn);
    
    container.appendChild(newItem);
}

// Template creators
function createExperienceTemplate() {
    return `
        <div class="experience-item">
            <div class="form-row">
                <input type="text" name="jobTitle[]" placeholder="Job Title" required>
                <input type="text" name="company[]" placeholder="Company" required>
            </div>
            <div class="form-row">
                <input type="text" name="startDate[]" placeholder="Start Date (e.g., Jan 2020)" required>
                <input type="text" name="endDate[]" placeholder="End Date (or 'Present')" required>
            </div>
            <textarea name="jobDescription[]" placeholder="Describe your responsibilities and achievements" rows="3"></textarea>
            <button type="button" class="ai-suggest-btn" onclick="getAISuggestion('experience', this)">✨ Improve Description</button>
        </div>
    `;
}

function createEducationTemplate() {
    return `
        <div class="education-item">
            <div class="form-row">
                <input type="text" name="degree[]" placeholder="Degree" required>
                <input type="text" name="school[]" placeholder="School/University" required>
            </div>
            <div class="form-row">
                <input type="text" name="graduationYear[]" placeholder="Graduation Year">
                <input type="text" name="gpa[]" placeholder="GPA (optional)">
            </div>
        </div>
    `;
}

function createProjectTemplate() {
    return `
        <div class="project-item">
            <input type="text" name="projectName[]" placeholder="Project Name">
            <textarea name="projectDescription[]" placeholder="Brief description of the project and technologies used" rows="2"></textarea>
            <input type="url" name="projectLink[]" placeholder="Project Link (optional)">
        </div>
    `;
}

// Show resume preview
function showPreview() {
    const formData = collectFormData();
    const resumeHTML = generateResumeHTML(formData);
    
    resumePreview.innerHTML = resumeHTML;
    previewSection.classList.add('active');
    
    // Scroll to preview on mobile
    if (window.innerWidth <= 1024) {
        previewSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Close preview
function closePreview() {
    previewSection.classList.remove('active');
}

// Collect form data
function collectFormData() {
    const formData = new FormData(resumeForm);
    const data = {
        personal: {
            fullName: formData.get('fullName') || '',
            email: formData.get('email') || '',
            phone: formData.get('phone') || '',
            location: formData.get('location') || '',
            linkedin: formData.get('linkedin') || '',
            portfolio: formData.get('portfolio') || ''
        },
        summary: formData.get('summary') || '',
        experience: [],
        education: [],
        skills: formData.get('skills') || '',
        projects: []
    };
    
    // Collect experience data
    const jobTitles = formData.getAll('jobTitle[]');
    const companies = formData.getAll('company[]');
    const startDates = formData.getAll('startDate[]');
    const endDates = formData.getAll('endDate[]');
    const jobDescriptions = formData.getAll('jobDescription[]');
    
    for (let i = 0; i < jobTitles.length; i++) {
        if (jobTitles[i] || companies[i]) {
            data.experience.push({
                jobTitle: jobTitles[i] || '',
                company: companies[i] || '',
                startDate: startDates[i] || '',
                endDate: endDates[i] || '',
                description: jobDescriptions[i] || ''
            });
        }
    }
    
    // Collect education data
    const degrees = formData.getAll('degree[]');
    const schools = formData.getAll('school[]');
    const graduationYears = formData.getAll('graduationYear[]');
    const gpas = formData.getAll('gpa[]');
    
    for (let i = 0; i < degrees.length; i++) {
        if (degrees[i] || schools[i]) {
            data.education.push({
                degree: degrees[i] || '',
                school: schools[i] || '',
                graduationYear: graduationYears[i] || '',
                gpa: gpas[i] || ''
            });
        }
    }
    
    // Collect projects data
    const projectNames = formData.getAll('projectName[]');
    const projectDescriptions = formData.getAll('projectDescription[]');
    const projectLinks = formData.getAll('projectLink[]');
    
    for (let i = 0; i < projectNames.length; i++) {
        if (projectNames[i] || projectDescriptions[i]) {
            data.projects.push({
                name: projectNames[i] || '',
                description: projectDescriptions[i] || '',
                link: projectLinks[i] || ''
            });
        }
    }
    
    return data;
}

// Generate resume HTML
function generateResumeHTML(data) {
    let html = `
        <div class="resume-header">
            <h1>${data.personal.fullName}</h1>
            <div class="contact-info">
                ${data.personal.email ? `<span>${data.personal.email}</span>` : ''}
                ${data.personal.phone ? `<span>${data.personal.phone}</span>` : ''}
                ${data.personal.location ? `<span>${data.personal.location}</span>` : ''}
                ${data.personal.linkedin ? `<span><a href="${data.personal.linkedin}" target="_blank">LinkedIn</a></span>` : ''}
                ${data.personal.portfolio ? `<span><a href="${data.personal.portfolio}" target="_blank">Portfolio</a></span>` : ''}
            </div>
        </div>
    `;
    
    // Professional Summary
    if (data.summary) {
        html += `
            <div class="resume-section">
                <h2>Professional Summary</h2>
                <p>${data.summary}</p>
            </div>
        `;
    }
    
    // Work Experience
    if (data.experience.length > 0) {
        html += `<div class="resume-section"><h2>Work Experience</h2>`;
        data.experience.forEach(exp => {
            html += `
                <div class="experience-entry">
                    <div class="entry-header">
                        <div>
                            <div class="job-title">${exp.jobTitle}</div>
                            <div class="company">${exp.company}</div>
                        </div>
                        <div class="date-range">${exp.startDate} - ${exp.endDate}</div>
                    </div>
                    ${exp.description ? `<div class="description">${exp.description}</div>` : ''}
                </div>
            `;
        });
        html += `</div>`;
    }
    
    // Education
    if (data.education.length > 0) {
        html += `<div class="resume-section"><h2>Education</h2>`;
        data.education.forEach(edu => {
            html += `
                <div class="education-entry">
                    <div class="entry-header">
                        <div>
                            <div class="degree">${edu.degree}</div>
                            <div class="school">${edu.school}</div>
                        </div>
                        <div class="date-range">
                            ${edu.graduationYear}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    // Skills
    if (data.skills) {
        const skillsArray = data.skills.split(',').map(skill => skill.trim()).filter(skill => skill);
        if (skillsArray.length > 0) {
            html += `
                <div class="resume-section">
                    <h2>Skills</h2>
                    <div class="skills-list">
                        ${skillsArray.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    // Projects
    if (data.projects.length > 0) {
        html += `<div class="resume-section"><h2>Projects</h2>`;
        data.projects.forEach(project => {
            html += `
                <div class="project-entry">
                    <div class="entry-header">
                        <div>
                            <div class="job-title">${project.name}</div>
                            ${project.link ? `<div class="company"><a href="${project.link}" target="_blank">${project.link}</a></div>` : ''}
                        </div>
                    </div>
                    ${project.description ? `<div class="description">${project.description}</div>` : ''}
                </div>
            `;
        });
        html += `</div>`;
    }
    
    return html;
}

// AI Suggestion functionality
async function getAISuggestion(type, buttonElement) {
    const button = buttonElement || event.target;
    const originalText = button.innerHTML;
    
    // Show loading state
    button.innerHTML = '<span class="loading"></span> Getting suggestions...';
    button.disabled = true;
    
    try {
        let content = '';
        let context = '';
        
        // Determine what content to improve based on type
        switch(type) {
            case 'summary':
                content = document.getElementById('summary').value;
                context = 'professional summary';
                currentSuggestionTarget = document.getElementById('summary');
                break;
            case 'experience':
                // Find the closest textarea (job description)
                const experienceItem = button.closest('.experience-item');
                const descriptionTextarea = experienceItem.querySelector('textarea[name="jobDescription[]"]');
                content = descriptionTextarea.value;
                context = 'job experience description';
                currentSuggestionTarget = descriptionTextarea;
                break;
            case 'skills':
                content = document.getElementById('skills').value;
                context = 'skills list';
                currentSuggestionTarget = document.getElementById('skills');
                break;
        }
        
        if (!content.trim()) {
            alert('Please enter some content first before getting AI suggestions.');
            button.innerHTML = originalText;
            button.disabled = false;
            return;
        }
        
        currentSuggestionType = type;
        
        // Make API call to backend
        const response = await fetch('/api/ai-suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
                context: context,
                type: type
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show AI suggestion in modal
            aiSuggestions.textContent = data.suggestion;
            aiModal.classList.add('active');
        } else {
            alert('Error getting suggestions: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error getting AI suggestions:', error);
        alert('Error connecting to AI service. Please try again.');
    } finally {
        // Reset button state
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Apply AI suggestion
function applySuggestion() {
    if (currentSuggestionTarget && aiSuggestions.textContent) {
        currentSuggestionTarget.value = aiSuggestions.textContent.trim();
        closeAIModal();
        
        // Trigger form save
        saveFormData();
    }
}

// Close AI modal
function closeAIModal() {
    aiModal.classList.remove('active');
    currentSuggestionTarget = null;
    currentSuggestionType = null;
}

// Export to PDF
async function exportToPDF() {
    if (!previewSection.classList.contains('active')) {
        alert('Please preview your resume first before exporting.');
        return;
    }
    
    const exportBtn = document.getElementById('exportBtn');
    const originalText = exportBtn.innerHTML;
    
    // Show loading state
    exportBtn.innerHTML = '<span class="loading"></span> Generating PDF...';
    exportBtn.disabled = true;
    
    try {
        const formData = collectFormData();
        
        const response = await fetch('/api/export-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            // Download the PDF
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${formData.personal.fullName.replace(/\s+/g, '_')}_Resume.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const errorData = await response.json();
            alert('Error generating PDF: ' + (errorData.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        // Reset button state
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
    }
}

// Local storage functions
function saveFormData() {
    const formData = collectFormData();
    localStorage.setItem('resumeBuilderData', JSON.stringify(formData));
}

function clearFormData() {
    if (confirm('Are you sure you want to clear all form data? This cannot be undone.')) {
        // Clear localStorage
        localStorage.removeItem('resumeBuilderData');
        
        // Reset the form
        resumeForm.reset();
        
        // Remove dynamically added sections (keep only the first one of each type)
        const experienceContainer = document.getElementById('experienceContainer');
        const educationContainer = document.getElementById('educationContainer');
        const projectsContainer = document.getElementById('projectsContainer');
        
        // Remove all but the first experience item
        const experienceItems = experienceContainer.querySelectorAll('.experience-item');
        for (let i = 1; i < experienceItems.length; i++) {
            experienceItems[i].remove();
        }
        
        // Remove all but the first education item
        const educationItems = educationContainer.querySelectorAll('.education-item');
        for (let i = 1; i < educationItems.length; i++) {
            educationItems[i].remove();
        }
        
        // Remove all but the first project item
        const projectItems = projectsContainer.querySelectorAll('.project-item');
        for (let i = 1; i < projectItems.length; i++) {
            projectItems[i].remove();
        }
        
        // Close preview if open
        closePreview();
        
        alert('Form data cleared successfully!');
    }
}

// That's all the JavaScript we need!
