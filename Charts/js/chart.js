// Function to load JSON data and update Plotly chart
function loadPlot(jsonPath) {
    fetch(jsonPath)
        .then(response => response.json())
        .then(data => {
            Plotly.react('plotly-div', data.data, data.layout);
        })
        .catch(error => console.error('Error loading plot:', error));
}

// Adjust viewport height for responsiveness
function adjustViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.getElementById('plotly-div').style.height = `calc(100 * var(--vh))`;
}

window.addEventListener('resize', adjustViewportHeight);
window.addEventListener('load', adjustViewportHeight);

// Toggle menu options visibility
document.addEventListener('DOMContentLoaded', function () {
    const menuCaption = document.getElementById('menu-caption');
    const menuOptions = document.getElementById('menu-options');
    menuCaption.addEventListener('click', function (e) {
        e.preventDefault();
        menuOptions.style.display = menuOptions.style.display === 'block' ? 'none' : 'block';
    });
});
