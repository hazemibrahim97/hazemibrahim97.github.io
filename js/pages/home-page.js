import news from '../data/news.js';
import publications from '../data/publications.js';
import projects from '../data/projects.js';
import videos from '../data/videos.js';

function loadRecentNews() {
    const newsGrid = document.querySelector('#recent-news .news-grid');
    if (!newsGrid) return;

    const recentNews = news.slice(0, 3); // Get 3 most recent news items
    
    recentNews.forEach(item => {
        const article = document.createElement('article');
        article.className = 'news-item';
        article.innerHTML = `
            <p class="news-date">${new Date(item.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</p>
            <h2>${item.title}</h2>
            <p>${item.description}</p>
        `;
        newsGrid.appendChild(article);
    });
}

function loadSelectedPublications() {
    const pubGrid = document.querySelector('#selected-publications .publications-grid');
    if (!pubGrid) return;

    const featuredPubs = publications.filter(pub => pub.featured).slice(0, 3);
    
    featuredPubs.forEach(pub => {
        const article = document.createElement('article');
        article.className = 'publication-item';
        article.innerHTML = `
            <h2 class="publication-title">
                <a href="${pub.doi || pub.pdf}" target="_blank">${pub.title}</a>
            </h2>
            <p class="publication-authors">${pub.authors.join(', ')}</p>
            <p>${pub.journal} (${pub.year})</p>
        `;
        pubGrid.appendChild(article);
    });
}

function loadFeaturedProjects() {
    const projectsGrid = document.querySelector('#featured-projects .projects-grid');
    if (!projectsGrid) return;

    const featuredProjects = projects.filter(proj => proj.featured).slice(0, 3);
    
    featuredProjects.forEach(project => {
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
        
        projectsGrid.appendChild(article);
    });
}

function loadFeaturedVideos() {
    const videosGrid = document.querySelector('#featured-videos .videos-grid');
    if (!videosGrid) return;

    const featuredVideos = videos.filter(vid => vid.featured).slice(0, 2);
    
    featuredVideos.forEach(video => {
        const article = document.createElement('article');
        article.className = 'video-item';
        
        article.innerHTML = `
            <h2 class="video-title">${video.title}</h2>
            <p class="video-description">${video.description}</p>
            <div class="video-container">
                <iframe 
                    src="https://www.youtube.com/embed/${video.youtubeId}"
                    title="${video.title}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>
        `;
        
        videosGrid.appendChild(article);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Home page script loaded');
    console.log('News data:', news);
    console.log('Publications data:', publications);
    console.log('Projects data:', projects);
    
    loadRecentNews();
    loadSelectedPublications();
    loadFeaturedProjects();
    loadFeaturedVideos();
}); 