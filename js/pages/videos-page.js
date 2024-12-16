import videos from '../data/videos.js';

function createVideoItem(video) {
    const article = document.createElement('article');
    article.className = 'video-item';
    
    article.innerHTML = `
        <div class="video-thumbnail">
            <img src="https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg" alt="${video.title}">
            <button class="play-button" data-youtube-id="${video.youtubeId}">
                <i class="fas fa-play"></i>
            </button>
        </div>
        <div class="video-content">
            <h2 class="video-title">${video.title}</h2>
            <p class="video-date">${new Date(video.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</p>
            <p class="video-description">${video.description}</p>
        </div>
    `;
    
    // Add click handler for play button
    const playButton = article.querySelector('.play-button');
    playButton.addEventListener('click', () => {
        const videoId = playButton.dataset.youtubeId;
        openVideoModal(videoId);
    });
    
    return article;
}

function openVideoModal(videoId) {
    const modal = document.createElement('div');
    modal.className = 'video-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <div class="video-container">
                <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                </iframe>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal handlers
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function initVideosPage() {
    const videosList = document.getElementById('videos-list');
    const sortedVideos = [...videos].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedVideos.forEach(video => {
        videosList.appendChild(createVideoItem(video));
    });
}

document.addEventListener('DOMContentLoaded', initVideosPage); 