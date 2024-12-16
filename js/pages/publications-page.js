import publications from '../data/publications.js';

function createPublicationItem(pub) {
    const article = document.createElement('article');
    article.className = 'publication-item';
    
    article.innerHTML = `
        <h2 class="publication-title">${pub.title}</h2>
        <p class="publication-authors">${pub.authors.join(', ')}</p>
        <p>${pub.journal} (${pub.year})</p>
        <div class="publication-meta">
            ${pub.doi ? `
                <a href="${pub.doi}" class="publication-link" target="_blank">
                    <i class="fas fa-external-link-alt"></i> DOI
                </a>
            ` : ''}
            ${pub.pdf ? `
                <a href="${pub.pdf}" class="publication-link" target="_blank">
                    <i class="fas fa-file-pdf"></i> PDF
                </a>
            ` : ''}
        </div>
    `;
    
    return article;
}

function initPublicationsPage() {
    const publicationsList = document.getElementById('publications-list');
    const sortedPubs = [...publications].sort((a, b) => b.year - a.year);
    
    sortedPubs.forEach(pub => {
        publicationsList.appendChild(createPublicationItem(pub));
    });
}

document.addEventListener('DOMContentLoaded', initPublicationsPage); 