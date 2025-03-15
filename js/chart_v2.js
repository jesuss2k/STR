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

function setCurrentChartDirectory_v2(chartPath) {
    if (!chartPath || typeof chartPath !== 'string') {
        console.error("Invalid chartPath provided to setCurrentChartDirectory_v2.");
        return;
    }

    const directoryPath = chartPath.substring(0, chartPath.lastIndexOf('/'));

    if (directoryPath.length > 0) {
        localStorage.setItem('CurrentChartDirectory', directoryPath);
        console.log("setCurrentChartDirectory_v2 = " + directoryPath);
    } else {
        console.warn("setCurrentChartDirectory_v2: Unable to determine directory path from chartPath:", chartPath);
    }
}

async function loadTradingViewChart_v2(ticker = null) {
    console.log("Loading TradingView Chart...");

    if (!ticker) {
        console.error("Error: No ticker provided. Cannot load chart.");
        return;
    }

    const container = document.getElementById('plotly-div');
    const histogramContainer = document.getElementById('plotly-histogram');

    container.innerHTML = '';
    histogramContainer.innerHTML = '';

    if (typeof LightweightCharts === 'undefined' || !LightweightCharts.createChart) {
        console.error("TradingView Lightweight Charts library is missing or not loaded.");
        return;
    }

    // ✅ Create Main Chart
    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
            backgroundColor: 'black',
            textColor: 'gray'
        },
        grid: {
            vertLines: { color: '#222' },
            horzLines: { color: '#222' }
        },
        timeScale: {
            rightOffset: 10,
            barSpacing: 6,
            fixLeftEdge: true,
            fixRightEdge: true
        },
        priceScale: {
            scaleMargins: {
                top: 0.1,
                bottom: 0.08
            },
            borderVisible: false,
            entireTextOnly: false,
            visible: true,
            drawTicks: false,
            ticksVisible: false
        }
    });

    // ✅ Create Histogram Chart (WITHOUT TIME SCALE)
    const histogramChart = LightweightCharts.createChart(histogramContainer, {
        width: container.clientWidth,
        height: histogramContainer.clientHeight,
        layout: {
            backgroundColor: 'black',
            textColor: 'gray'
        },
        grid: {
            vertLines: { color: '#222' },
            horzLines: { color: '#222' }
        },
        timeScale: {
            visible: false // ✅ Remove time scale from histogram
        },
        priceScale: {
            scaleMargins: {
                top: 0.02,
                bottom: 0.02
            },
            borderVisible: false,
            entireTextOnly: false,
            visible: true, // ✅ Show scale for histogram values
            drawTicks: true,
            ticksVisible: true
        }
    });

    const jsonPath = `../JSON/2H/${ticker}.json`;

    try {
        const response = await fetch(jsonPath);
        if (!response.ok) {
            throw new Error(`Failed to load JSON: ${response.statusText}`);
        }

        const rawData = await response.json();

        // ✅ Plot Candlestick Series
        const candleData = rawData.map(entry => ({
            time: Math.floor(new Date(entry.Timestamp).getTime() / 1000),
            open: entry.Open,
            high: entry.High,
            low: entry.Low,
            close: entry.Close
        }));

        const candleSeries = chart.addCandlestickSeries({
            priceLineVisible: true,
            lastValueVisible: false,
        });
        candleSeries.setData(candleData);

        console.log("✅ Candlestick chart successfully loaded for", ticker);

        // ========== 📈 ADD EMA SERIES 📈 ==========
        const emaColors = {
            EMA_12: "#ffcbfb",  // Light Pink
            EMA_25: "#8c3caf",  // Purple
            EMA_50: "#38ccdd",  // Cyan
            EMA_100: "#ffff00", // Yellow
            EMA_200: "#e67e22", // Orange
            EMA_400: "#ff0000", // Red
            EMA_800: "#ffffff"  // White
        };

        Object.keys(emaColors).forEach(emaKey => {
            if (!rawData[0][emaKey]) {
                console.warn(`⚠ Skipping ${emaKey}, not found in JSON.`);
                return;
            }

            const emaData = rawData.map(entry => ({
                time: Math.floor(new Date(entry.Timestamp).getTime() / 1000),
                value: entry[emaKey]
            }));

            const emaSeries = chart.addLineSeries({
                color: emaColors[emaKey],
                lineWidth: 1,
                priceLineVisible: false,
                lastValueVisible: false,
                crossHairMarkerVisible: false
            });

            emaSeries.setData(emaData);
            console.log(`✅ Plotted ${emaKey} with color ${emaColors[emaKey]}`);
        });

        // ========== 📊 ADD HISTOGRAM (EMA_12 - EMA_25) 📊 ==========
        if (rawData[0].EMA_12 && rawData[0].EMA_25) {
            let prevValue = rawData[0].EMA_12 - rawData[0].EMA_25; // First value as reference

            const histogramData = rawData.map((entry, index) => {
                const value = entry.EMA_12 - entry.EMA_25;
                let color;

                if (value >= 0) {
                    color = value > prevValue ? "rgba(12, 171, 7, 0.7)" : "rgba(139, 222, 122, 0.7)"; // Dark Green (up), Light Green (down)
                } else {
                    color = value < prevValue ? "rgba(222, 7, 28, 0.7)" : "rgba(222, 167, 166, 0.7)"; // Dark Red (down), Light Red (up)
                }
                prevValue = value; // Update for next iteration

                return {
                    time: Math.floor(new Date(entry.Timestamp).getTime() / 1000),
                    value,
                    color
                };
            });

            const histogramSeries = histogramChart.addHistogramSeries({
                priceLineVisible: true,
                lastValueVisible: false
            });

            histogramSeries.setData(histogramData);
            console.log("✅ Histogram (EMA_12 - EMA_25) added with trend-based colors.");
        } else {
            console.warn("⚠ Histogram not plotted: EMA_12 or EMA_25 missing in JSON.");
        }

        // ========== 🔄 SYNC CHARTS (ZOOM, PAN, BAR SPACING) 🔄 ==========
        function syncCharts(sourceChart, targetChart) {
            sourceChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
                targetChart.timeScale().setVisibleRange(range);
            });

            sourceChart.timeScale().subscribeBarSpacingChange((spacing) => {
                targetChart.timeScale().applyOptions({ barSpacing: spacing });
            });

            sourceChart.subscribeCrosshairMove((param) => {
                targetChart.setCrosshairPosition(param);
            });

            targetChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
                sourceChart.timeScale().setVisibleRange(range);
            });

            targetChart.timeScale().subscribeBarSpacingChange((spacing) => {
                sourceChart.timeScale().applyOptions({ barSpacing: spacing });
            });

            targetChart.subscribeCrosshairMove((param) => {
                sourceChart.setCrosshairPosition(param);
            });
        }

        syncCharts(chart, histogramChart);

        // ✅ Force Sync on Load
        setTimeout(() => {
            const visibleRange = chart.timeScale().getVisibleRange();
            if (visibleRange) {
                histogramChart.timeScale().setVisibleRange(visibleRange);
            }

            chart.timeScale().applyOptions({ rightOffset: 10 });
            histogramChart.timeScale().applyOptions({ rightOffset: 10 });

            console.log("✅ Forced histogram synchronization on load.");
        }, 500);

        console.log("✅ Main chart and histogram are now fully synchronized.");

    } catch (error) {
        console.error("❌ Error loading candlestick chart:", error);
    }
}


function loadChart_v2(chartPath, ticker = '') {
    console.log("loadChart_v2 charPath = " + chartPath);

    if (chartPath.includes('Renko')) {
        let imagePath = chartPath.replace('.json', '.png');
        loadImage_v2(imagePath);
    } else if (chartPath.endsWith('.json')) {
        if (chartPath.includes('/2H/')) {
            localStorage.setItem('selectedChart', '2H'); // ✅ Store "2H" selection
            loadTradingViewChart_v2(ticker); // ✅ Load "2H" chart
        } else {
            localStorage.setItem('selectedChart', 'default'); // ✅ Reset if not "2H"
            loadPlot_v2(chartPath);
        }
    } else if (chartPath.endsWith('.png')) {
        loadImage_v2(chartPath);
    }

    setCurrentChartDirectory_v2(chartPath);
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("chart-ema2h").onclick = () => {
        const params = new URLSearchParams(window.location.search);
        const ticker = params.get("ticker");

        if (!ticker) {
            console.error("Error: No ticker found in URL.");
            return;
        }

        loadTradingViewChart_v2(ticker); // ✅ Ensure ticker is passed
    };
});

