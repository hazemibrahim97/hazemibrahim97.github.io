import news from '../data/news.js';

function createNewsItem(newsItem) {
    const article = document.createElement('article');
    article.className = 'news-item';
    
    article.innerHTML = `
        <p class="news-date">${new Date(newsItem.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</p>
        <h2>${newsItem.title}</h2>
        <p>${newsItem.description}</p>
    `;
    
    return article;
}

function initNewsPage() {
    const newsList = document.getElementById('news-list');
    const sortedNews = [...news].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedNews.forEach(newsItem => {
        newsList.appendChild(createNewsItem(newsItem));
    });
}

document.addEventListener('DOMContentLoaded', initNewsPage); 