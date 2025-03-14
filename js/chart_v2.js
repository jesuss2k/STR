// Function to load an image into the plotly-div container
function loadImage_v2(imagePath) {
    console.log('Reached loadImage_v2 with path:', imagePath); // For debugging

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
function loadPlot_v2(jsonPath) {
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

// Adjust viewport height for responsiveness
function adjustViewportHeight_v2() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.getElementById('plotly-div').style.height = `calc(100 * var(--vh))`;
}

window.addEventListener('resize', adjustViewportHeight_v2);
window.addEventListener('load', adjustViewportHeight_v2);

// Toggle menu options visibility
document.addEventListener('DOMContentLoaded', function () {
    const menuCaption = document.getElementById('menu-caption');
    const menuOptions = document.getElementById('menu-options');
    menuCaption.addEventListener('click', function (e) {
        e.preventDefault();
        menuOptions.style.display = menuOptions.style.display === 'block' ? 'none' : 'block';
    });
});

// Swipe Navigation Support for Mobile Devices
function initSwipeNavigation_v2({ swipeLeftUrl, swipeRightUrl }) {
    let xDown = null;
    let yDown = null;

    function handleTouchStart(evt) {
        if (evt.touches.length !== 1) {
            xDown = null;
            yDown = null;
            return;
        }
        const firstTouch = evt.touches[0];
        xDown = firstTouch.clientX;
        yDown = firstTouch.clientY;
    }

    function handleTouchMove(evt) {
        if (xDown === null || yDown === null || evt.touches.length !== 1) {
            return;
        }

        const xUp = evt.touches[0].clientX;
        const yUp = evt.touches[0].clientY;
        const xDiff = xDown - xUp;
        const yDiff = yDown - yUp;

        if (Math.abs(xDiff) > Math.abs(yDiff)) {
            if (xDiff > 0 && swipeLeftUrl) {
                window.location.href = swipeLeftUrl;
            } else if (swipeRightUrl) {
                window.location.href = swipeRightUrl;
            }
        }

        xDown = null;
        yDown = null;
    }

    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchmove', handleTouchMove, false);
}

// Initialize Menu Logic (with persistence)
function initializeMenuLogic_v2() {
    const menuCaption = document.getElementById('menu-caption');
    const menuOptions = document.getElementById('menu-options');

    console.log("DOM fully loaded. Initializing menu...");

    let isMenuOpen = false;
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

    menuCaption.addEventListener('click', function (e) {
        e.preventDefault();
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

// Get the current chart directory from localStorage
function getCurrentChartDirectory_v2() {
    let savedCurrentChartDirectory = localStorage.getItem('CurrentChartDirectory');
    
    if (!savedCurrentChartDirectory || savedCurrentChartDirectory.length === 0) {
        savedCurrentChartDirectory = '../../charts/JSON/EMA1W';
    }

    console.log("getCurrentChartDirectory_v2 = " + savedCurrentChartDirectory);

    return savedCurrentChartDirectory;
}

// Set the current chart directory in localStorage
function setCurrentChartDirectory_v2(chartPath) {
    localStorage.setItem('CurrentChartDirectory', chartPath.substring(0, chartPath.lastIndexOf('/')));
}

async function loadTradingViewChart_v2(ticker = null) {
    console.log("Loading TradingView Chart...");

    const container = document.getElementById('plotly-div');
    container.innerHTML = '';

    // Ensure LightweightCharts is loaded before using it
    if (typeof LightweightCharts === 'undefined' || !LightweightCharts.createChart) {
        console.error("TradingView Lightweight Charts library is missing or not loaded.");
        return;
    }

    // Create the TradingView chart
    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
            backgroundColor: 'black',
            textColor: 'white'
        },
        grid: {
            vertLines: { color: '#222' },
            horzLines: { color: '#222' }
        }
    });

    if (!ticker) {
        console.log("No ticker provided. Displaying empty chart.");
        
        // Make sure the function exists before calling it
        if (typeof chart.addLineSeries !== 'function') {
            console.error("Error: 'chart.addLineSeries' is not available.");
            return;
        }

        const lineSeries = chart.addLineSeries();
        lineSeries.setData([]);
        return;
    }

    const jsonPath = `../JSON/2H/${ticker}.json`;

    try {
        const response = await fetch(jsonPath);
        if (!response.ok) {
            throw new Error(`Failed to load JSON: ${response.statusText}`);
        }

        const rawData = await response.json();

        // Convert JSON data into TradingView format
        const candleData = rawData.map(entry => ({
            time: Math.floor(new Date(entry.Timestamp).getTime() / 1000), // Convert to Unix timestamp
            open: entry.Open,
            high: entry.High,
            low: entry.Low,
            close: entry.Close
        }));

        // Check if candlestick series is available before adding
        if (typeof chart.addCandlestickSeries !== 'function') {
            console.error("Error: 'chart.addCandlestickSeries' is not available.");
            return;
        }

        const candleSeries = chart.addCandlestickSeries();
        candleSeries.setData(candleData);

        console.log("Candlestick chart successfully loaded.");
    } catch (error) {
        console.error("Error loading candlestick chart:", error);
    }
}

// Update loadChart_v2 function to support "2H" TradingView charts
function loadChart_v2(chartPath, ticker = '') {
    console.log("loadChart_v2 charPath = " + chartPath);
    
    if (chartPath.includes('Renko')) {
        let imagePath = chartPath.replace('.json', '.png');
        loadImage_v2(imagePath);
    } else if (chartPath.endsWith('.json')) {
        if (chartPath.includes('/2H/')) {
            loadTradingViewChart_v2(ticker); // Load candlestick chart for 2H
        } else {
            loadPlot_v2(chartPath);
        }
    } else if (chartPath.endsWith('.png')) {
        loadImage_v2(chartPath);
    }

    setCurrentChartDirectory_v2(chartPath);
}

// Add event listener for the "2H" menu option
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("chart-ema2h").onclick = () => {
        const params = new URLSearchParams(window.location.search);
        const ticker = params.get("ticker");
        loadTradingViewChart_v2(ticker);
    };
});
