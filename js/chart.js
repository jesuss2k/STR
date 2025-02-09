// Function to load an image into the plotly-div container
function loadImage(imagePath) {
    console.log('Reached loadImage with path:', imagePath); // For debugging

    const container = document.getElementById('plotly-div');
    
    // If you're using Plotly on that same container, you might want to purge it first:
    if (typeof Plotly !== 'undefined' && Plotly.purge) {
        Plotly.purge(container);
    }
    
    // Clear any HTML previously in the container
    container.innerHTML = '';
    
    // Create a new <img> element
    const img = document.createElement('img');
    img.src = imagePath;
    
    // Optionally, you can make the image responsive by adjusting styles:
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    
    // Append the <img> to the container
    container.appendChild(img);
}

// Function to load JSON data and update Plotly chart
function loadPlot(jsonPath) {
    // Grab the container element
    const container = document.getElementById('plotly-div');

    // If Plotly is present, purge any existing Plotly chart from the container
    if (typeof Plotly !== 'undefined' && Plotly.purge) {
        Plotly.purge(container);
    }

    // Clear any leftover HTML in the container (e.g., if an <img> was previously loaded)
    container.innerHTML = '';

    // Fetch your JSON data and then plot
    fetch(jsonPath)
        .then(response => response.json())
        .then(data => {
            const config = { displayModeBar: false };
            Plotly.newPlot('plotly-div', data.data, data.layout, config);
        })
        .catch(error => console.error('Error loading plot:', error));
}

function loadChart(chartPath) {
    if (chartPath.includes('Renko')) {
        let imagePath = chartPath.replace('.json', '.png');
        loadImage(imagePath);
    } else if (chartPath.endsWith('.json')) {
        loadPlot(chartPath);
    } else if (chartPath.endsWith('.png')) {
        loadImage(chartPath);
    }

    setCurrentChartDirectory(chartPath);
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

// chart.js

/**
 * Initialize swipe navigation for left/right swipes, without blocking pinch-zoom.
 * 
 * @param {Object} options
 * @param {string} options.swipeLeftUrl  - URL to go to when user swipes left
 * @param {string} options.swipeRightUrl - URL to go to when user swipes right
 */
function initSwipeNavigation({ swipeLeftUrl, swipeRightUrl }) {
    let xDown = null;
    let yDown = null;

    /**
     * Stores the initial touch coordinates (only if exactly one finger).
     */
    function handleTouchStart(evt) {
        // If more than one finger, do nothing (allow pinch-zoom, etc.)
        if (evt.touches.length !== 1) {
            xDown = null;
            yDown = null;
            return;
        }
        const firstTouch = evt.touches[0];
        xDown = firstTouch.clientX;
        yDown = firstTouch.clientY;
    }

    /**
     * Compares the initial vs. current touch positions to detect a horizontal swipe.
     */
    function handleTouchMove(evt) {
        // If we don't have a single-finger start, or there's more than one finger now, skip.
        if (
            xDown === null ||
            yDown === null ||
            evt.touches.length !== 1
        ) {
            return;
        }

        const xUp = evt.touches[0].clientX;
        const yUp = evt.touches[0].clientY;

        const xDiff = xDown - xUp;
        const yDiff = yDown - yUp;

        // Check if it's primarily a horizontal swipe
        if (Math.abs(xDiff) > Math.abs(yDiff)) {
            if (xDiff > 0) {
                // Swipe LEFT
                if (swipeLeftUrl) {
                    window.location.href = swipeLeftUrl;
                }
            } else {
                // Swipe RIGHT
                if (swipeRightUrl) {
                    window.location.href = swipeRightUrl;
                }
            }
        }

        // Reset so subsequent swipes are detected
        xDown = null;
        yDown = null;
    }

    // Attach event listeners
    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchmove', handleTouchMove, false);
}

function initializeMenuLogic() {
    const menuCaption = document.getElementById('menu-caption');
    const menuOptions = document.getElementById('menu-options');

    console.log("DOM fully loaded. Initializing menu...");

    /* Initialize state variable */
    let isMenuOpen = false;

    /* Check localStorage for the saved display state */
    const savedDisplayState = localStorage.getItem('menuDisplayState');
    console.log("Saved display state from localStorage:", savedDisplayState);

    if (savedDisplayState === 'block') {
        menuOptions.style.display = 'block';
        isMenuOpen = true;
        console.log("Menu initialized as open.");
    } else {
        menuOptions.style.display = 'none';
        isMenuOpen = false;
        console.log("Menu initialized as closed.");
    }

    /* Toggle the menu display and save the state */
    menuCaption.addEventListener('click', function (e) {
        e.preventDefault();

        /* Toggle the menu state */
        if (isMenuOpen) {
            menuOptions.style.display = 'none';
            localStorage.setItem('menuDisplayState', 'none');
            isMenuOpen = false;
            console.log("Menu closed. New state saved: 'none'");
        } else {
            menuOptions.style.display = 'block';
            localStorage.setItem('menuDisplayState', 'block');
            isMenuOpen = true;
            console.log("Menu opened. New state saved: 'block'");
        }
    });
}

function getCurrentChartDirectory() {
    let savedCurrentChartDirectory = localStorage.getItem('CurrentChartDirectory');
    
    if (!savedCurrentChartDirectory || savedCurrentChartDirectory.length === 0) {
        savedCurrentChartDirectory = '../../charts/JSON/EMA1W';
    }

    console.log("getCurrentChartDirectory = " + savedCurrentChartDirectory);

    return savedCurrentChartDirectory;
}


function setCurrentChartDirectory(chartPath) {
    localStorage.setItem('CurrentChartDirectory', chartPath.substring(0, chartPath.lastIndexOf('/')));
}

