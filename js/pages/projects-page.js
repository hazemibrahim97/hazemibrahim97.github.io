import projects from '../data/projects.js';

function createProjectItem(project) {
    const article = document.createElement('article');
    article.className = 'project-item';
    
    article.innerHTML = `
        <h2 class="project-title">${project.title}</h2>
        <p class="project-description">${project.description}</p>
        <div class="project-links">
            ${project.github ? `
                <a href="${project.github}" class="project-link" target="_blank">
                    <i class="fab fa-github"></i> GitHub
                </a>
            ` : ''}
            ${project.demo ? `
                <a href="${project.demo}" class="project-link" target="_blank">
                    <i class="fas fa-external-link-alt"></i> Live Demo
                </a>
            ` : ''}
        </div>
    `;
    
    return article;
}

function initProjectsPage() {
    const projectsList = document.getElementById('projects-list');
    const sortedProjects = [...projects].sort((a, b) => b.featured - a.featured);
    
    sortedProjects.forEach(project => {
        projectsList.appendChild(createProjectItem(project));
    });
}

document.addEventListener('DOMContentLoaded', initProjectsPage); 