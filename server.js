// Resume Builder Server
// Simple Node.js server for the resume builder

const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const puppeteer = require('puppeteer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Google AI
let gemini = null;
if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    gemini = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});


// AI Suggestions endpoint
app.post('/api/ai-suggestions', async (req, res) => {
    try {
        const { content, context, type } = req.body;

        if (!content || !context) {
            return res.status(400).json({
                success: false,
                error: 'Missing content or context'
            });
        }

        if (!gemini) {
            return res.status(500).json({
                success: false,
                error: 'AI service not configured'
            });
        }

        const suggestion = await getGeminiSuggestion(content, type);
        
        res.json({
            success: true,
            suggestion: suggestion,
            original: content,
            source: 'Google Gemini'
        });

    } catch (error) {
        console.error('AI Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get AI suggestions'
        });
    }
});

// Google Gemini AI function
async function getGeminiSuggestion(content, type) {
    let prompt = '';
    
    switch (type) {
        case 'summary':
            prompt = `Improve this professional summary for a resume. Make it more compelling and professional: "${content}"`;
            break;
        case 'experience':
            prompt = `Improve this job description for a resume. Use action verbs and bullet points: "${content}"`;
            break;
        case 'skills':
            prompt = `Organize and improve this skills list for a resume: "${content}"`;
            break;
        default:
            prompt = `Improve this ${type} for a professional resume: "${content}"`;
    }

    const result = await gemini.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
}

// PDF Export endpoint
app.post('/api/export-pdf', async (req, res) => {
    try {
        const resumeData = req.body;

        if (!resumeData || !resumeData.personal || !resumeData.personal.fullName) {
            return res.status(400).json({
                success: false,
                error: 'Invalid resume data'
            });
        }

        const htmlContent = generatePDFHTML(resumeData);
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
        });

        await browser.close();

        const filename = `${resumeData.personal.fullName.replace(/\\s+/g, '_')}_Resume.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PDF'
        });
    }
});

// Generate HTML for PDF
function generatePDFHTML(data) {
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Resume - ${data.personal.fullName}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Arial', sans-serif; line-height: 1.5; color: #333; font-size: 12pt; }
                .resume-container { max-width: 8.5in; margin: 0 auto; padding: 0.5in; }
                .resume-header { text-align: center; margin-bottom: 20pt; border-bottom: 2pt solid #333; padding-bottom: 15pt; }
                .resume-header h1 { font-size: 20pt; margin-bottom: 8pt; font-weight: bold; }
                .contact-info { display: flex; justify-content: center; gap: 15pt; font-size: 11pt; }
                .resume-section { margin-bottom: 18pt; }
                .resume-section h2 { font-size: 14pt; margin-bottom: 10pt; text-transform: uppercase; border-bottom: 1pt solid #ccc; padding-bottom: 3pt; }
                .experience-entry, .education-entry { margin-bottom: 15pt; }
                .entry-header { display: flex; justify-content: space-between; margin-bottom: 5pt; }
                .job-title, .degree { font-weight: bold; font-size: 12pt; }
                .company, .school { font-style: italic; color: #666; }
                .date-range { font-size: 10pt; color: #666; }
                .description { margin-top: 5pt; font-size: 11pt; }
                .skills-list { display: flex; flex-wrap: wrap; gap: 8pt; }
                .skill-tag { background: #f5f5f5; padding: 2pt 6pt; border-radius: 3pt; font-size: 10pt; border: 0.5pt solid #ddd; }
            </style>
        </head>
        <body>
            <div class="resume-container">
                <div class="resume-header">
                    <h1>${data.personal.fullName}</h1>
                    <div class="contact-info">
                        ${data.personal.email ? `<span>${data.personal.email}</span>` : ''}
                        ${data.personal.phone ? `<span>${data.personal.phone}</span>` : ''}
                        ${data.personal.location ? `<span>${data.personal.location}</span>` : ''}
                        ${data.personal.linkedin ? `<span>${data.personal.linkedin}</span>` : ''}
                    </div>
                </div>
    `;

    if (data.summary) {
        html += `
            <div class="resume-section">
                <h2>Professional Summary</h2>
                <p class="description">${data.summary}</p>
            </div>
        `;
    }

    if (data.experience && data.experience.length > 0) {
        html += `<div class="resume-section"><h2>Work Experience</h2>`;
        data.experience.forEach(exp => {
            if (exp.jobTitle || exp.company) {
                html += `
                    <div class="experience-entry">
                        <div class="entry-header">
                            <div>
                                <div class="job-title">${exp.jobTitle || ''}</div>
                                <div class="company">${exp.company || ''}</div>
                            </div>
                            <div class="date-range">${exp.startDate || ''} - ${exp.endDate || ''}</div>
                        </div>
                        ${exp.description ? `<div class="description">${exp.description}</div>` : ''}
                    </div>
                `;
            }
        });
        html += `</div>`;
    }

    if (data.education && data.education.length > 0) {
        html += `<div class="resume-section"><h2>Education</h2>`;
        data.education.forEach(edu => {
            if (edu.degree || edu.school) {
                html += `
                    <div class="education-entry">
                        <div class="entry-header">
                            <div>
                                <div class="degree">${edu.degree || ''}</div>
                                <div class="school">${edu.school || ''}</div>
                            </div>
                            <div class="date-range">${edu.graduationYear || ''}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}</div>
                        </div>
                    </div>
                `;
            }
        });
        html += `</div>`;
    }

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

    html += `</div></body></html>`;
    return html;
}

// Start the server
app.listen(PORT, () => {
    console.log(`Resume Builder server running on http://localhost:${PORT}`);
});
