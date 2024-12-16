function initTheme() {
    const themeToggle = document.querySelector('.theme-toggle');
    const root = document.documentElement;
    const icon = themeToggle.querySelector('i');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        root.setAttribute('data-theme', savedTheme);
        updateIcon(icon, savedTheme);
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(icon, newTheme);
    });

    // Update icon on hover
    themeToggle.addEventListener('mouseenter', () => {
        const currentTheme = root.getAttribute('data-theme') || 'dark';
        icon.classList.remove(currentTheme === 'light' ? 'fa-moon' : 'fa-sun');
        icon.classList.add(currentTheme === 'light' ? 'fa-sun' : 'fa-moon');
    });

    themeToggle.addEventListener('mouseleave', () => {
        const currentTheme = root.getAttribute('data-theme');
        updateIcon(icon, currentTheme);
    });
}

function updateIcon(icon, theme) {
    icon.classList.remove('fa-sun', 'fa-moon');
    icon.classList.add(theme === 'light' ? 'fa-sun' : 'fa-moon');
}

document.addEventListener('DOMContentLoaded', initTheme); 