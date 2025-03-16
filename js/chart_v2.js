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

// ============================ Helper / Utility Functions ============================

/**
 * Checks if a valid ticker was provided.
 * @param {string|null} ticker
 * @returns {boolean}
 */
function validateTicker(ticker) {
    if (!ticker) {
        console.error("Error: No ticker provided. Cannot load chart.");
        return false;
    }
    return true;
}

/**
 * Clears the contents of the specified HTML containers.
 * @param {HTMLElement} container
 * @param {HTMLElement} histogramContainer
 */
function clearContainers(container, histogramContainer) {
    container.innerHTML = '';
    histogramContainer.innerHTML = '';
}

/**
 * Checks if the LightweightCharts library is loaded properly.
 * @returns {boolean}
 */
function isLibraryLoaded() {
    if (typeof LightweightCharts === 'undefined' || !LightweightCharts.createChart) {
        console.error("TradingView Lightweight Charts library is missing or not loaded.");
        return false;
    }
    return true;
}

/**
 * Fetches JSON data from a given URL.
 * @param {string} url
 * @returns {Promise<any>}
 */
async function fetchJSONData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load JSON from ${url}: ${response.statusText}`);
    }
    return await response.json();
}


// ============================ Chart Creation Functions ============================

/**
 * Creates and returns the main candlestick chart instance.
 * @param {HTMLElement} container - The container element for the main chart.
 * @returns {IChartApi} An instance of the created LightweightCharts chart.
 */
function createMainChart(container) {
    return LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
            background: { type: 'solid', color: 'black' },
            textColor: 'gray'
        },
        grid: {
            vertLines: { color: 'rgba(34, 34, 34, 0.5)' },
            horzLines: { color: 'rgba(34, 34, 34, 0.5)' }
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
}


/**
 * Creates and returns the histogram chart instance.
 * @param {HTMLElement} histogramContainer - The container element for the histogram chart.
 * @param {number} width - The desired width for the histogram chart.
 * @returns {IChartApi} An instance of the created LightweightCharts chart.
 */
function createHistogramChart(histogramContainer, width) {
    return LightweightCharts.createChart(histogramContainer, {
        width: width,
        height: histogramContainer.clientHeight,
        layout: {
            background: { type: 'solid', color: 'black' },
            textColor: 'gray'
        },
        grid: {
            vertLines: { color: 'rgba(34, 34, 34, 0.5)' },
            horzLines: { color: 'rgba(34, 34, 34, 0.5)' }
        },
        timeScale: {
            visible: false // Remove time scale from histogram
        },
        priceScale: {
            scaleMargins: {
                top: 0.02,
                bottom: 0.02
            },
            borderVisible: false,
            entireTextOnly: false,
            visible: true, // Show scale for histogram values
            drawTicks: true,
            ticksVisible: true,
            autoScale: true
        }
    });
}


// ============================ Data Processing & Plotting ============================

/**
 * Converts raw JSON data to a format suitable for the candlestick series.
 * @param {Array} rawData - The raw data loaded from the JSON file.
 * @returns {Array<Object>}
 */
function prepareCandleData(rawData) {
    return rawData.map(entry => ({
        time: Math.floor(new Date(entry.Timestamp).getTime() / 1000),
        open: entry.Open,
        high: entry.High,
        low: entry.Low,
        close: entry.Close
    }));
}

/**
 * Plots candlestick data on the main chart.
 * @param {IChartApi} chart - The main chart instance.
 * @param {Array<Object>} candleData - The processed candlestick data.
 * @returns {ISeriesApi<"Candlestick">} The candlestick series.
 */
function plotCandlesticks(chart, candleData) {
    const candleSeries = chart.addCandlestickSeries({
        priceLineVisible: true,
        lastValueVisible: false,
    });
    candleSeries.setData(candleData);
    return candleSeries;
}

/**
 * Fetches and plots orders on the main chart.
 * @param {IChartApi} chart - The main chart instance.
 * @param {Array<Object>} candleData - Candlestick data array (for time range).
 * @param {string} ticker - Current ticker symbol.
 */
async function plotOrders(chart, candleData, ticker) {
    try {
        const ordersData = await fetchJSONData("../../JSON/LatestOrders.json");
        console.log(`📄 Loaded ${ordersData.length} orders from LatestOrders.json`);

        const filteredOrders = ordersData.filter(order => order.ticker === ticker);
        console.log(`📊 Found ${filteredOrders.length} orders for ${ticker}:`, filteredOrders);

        filteredOrders.forEach(order => {
            const color = order.positionStatus === "Closed" ? "#FFD700" : "#1E90FF"; // Yellow for Closed, Blue for Open
            chart.addLineSeries({
                color: color,
                lineWidth: 1,
                lastValueVisible: false,
                lineStyle: LightweightCharts.LineStyle.Dotted
            }).setData([
                { time: candleData[0].time, value: order.price },
                { time: candleData[candleData.length - 1].time, value: order.price }
            ]);

            console.log(`✅ Plotted ${order.positionStatus} order at ${order.price} (${color})`);
        });
    } catch (error) {
        console.error("❌ Error loading Orders JSON:", error);
    }
}

function plotEMAs_1W(chart, rawData) {
    const emaColors = {
        EMA_5: "#ffff00", // Yellow
        EMA_10: "#e67e22", // Orange
        EMA_20: "#ff0000", // Red
        EMA_40: "#ffffff",  // White
        EMA_100: "#ab47bc",
        EMA_200: "#4caf50",
        EMA_400: "#f48fb1"
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
            crossHairMarkerVisible: false,
            pointMarkersVisible: false
        });

        emaSeries.setData(emaData);
        console.log(`✅ Plotted ${emaKey} with color ${emaColors[emaKey]}`);
    });
}

function plotHistogram_1W(histogramChart, rawData) {
    // Ensure we have both EMA_5 and EMA_10
    if (!rawData[0].EMA_5 || !rawData[0].EMA_10) {
        console.warn("⚠ Histogram not plotted: EMA_5 or EMA_10 missing in JSON.");
        return;
    }

    let prevValue = rawData[0].EMA_5 - rawData[0].EMA_10; // First value as reference
    const histogramData = rawData.map(entry => {
        const value = entry.EMA_5 - entry.EMA_10;
        let color;

        if (value >= 0) {
            color = value > prevValue ? "rgba(12, 171, 7, 0.6)" : "rgba(139, 222, 122, 0.6)";
        } else {
            color = value < prevValue ? "rgba(222, 7, 28, 0.6)" : "rgba(222, 167, 166, 0.6)";
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
    console.log("✅ Histogram (EMA_5 - EMA_10) added with trend-based colors.");
}

function plotEMAs_1D(chart, rawData) {
    const emaColors = {
        EMA_12: "#38ccdd",  // Cyan
        EMA_25: "#ffff00", // Yellow
        EMA_50: "#e67e22", // Orange
        EMA_100: "#ff0000", // Red
        EMA_200: "#ffffff",  // White
        ZLEMA: "#ff0000"    // Red (Dashed)
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
            lineStyle: emaKey === "ZLEMA" ? 3 : 0 // Dashed line for ZLEMA (2 = Dotted, 0 = Solid)
        });

        emaSeries.setData(emaData);
        console.log(`✅ Plotted ${emaKey} with color ${emaColors[emaKey]} ${emaKey === "ZLEMA" ? "(Dashed)" : ""}`);
    });
}

function plotHistogram_1D(histogramChart, rawData) {
    // Ensure EMA_12 and EMA_25 exist
    if (!rawData[0].EMA_12 || !rawData[0].EMA_25) {
        console.warn("⚠ Histogram not plotted: EMA_12 or EMA_25 missing in JSON.");
        return;
    }

    let prevValue = rawData[0].EMA_12 - rawData[0].EMA_25;
    const histogramData = rawData.map(entry => {
        const value = entry.EMA_12 - entry.EMA_25;
        let color;

        if (value >= 0) {
            color = value > prevValue ? "rgba(12, 171, 7, 0.6)" : "rgba(139, 222, 122, 0.6)";
        } else {
            color = value < prevValue ? "rgba(222, 7, 28, 0.6)" : "rgba(222, 167, 166, 0.6)";
        }
        prevValue = value;

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
}


function plotEMAs_2H(chart, rawData) {
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
            crossHairMarkerVisible: false,
            pointMarkersVisible: false
        });

        emaSeries.setData(emaData);
        console.log(`✅ Plotted ${emaKey} with color ${emaColors[emaKey]}`);
    });
}

function plotHistogram_2H(histogramChart, rawData) {
    // Ensure EMA_12 and EMA_25 exist
    if (!rawData[0].EMA_12 || !rawData[0].EMA_25) {
        console.warn("⚠ Histogram not plotted: EMA_12 or EMA_25 missing in JSON.");
        return;
    }

    let prevValue = rawData[0].EMA_12 - rawData[0].EMA_25;
    const histogramData = rawData.map(entry => {
        const value = entry.EMA_12 - entry.EMA_25;
        let color;

        if (value >= 0) {
            color = value > prevValue ? "rgba(12, 171, 7, 0.6)" : "rgba(139, 222, 122, 0.6)";
        } else {
            color = value < prevValue ? "rgba(222, 7, 28, 0.6)" : "rgba(222, 167, 166, 0.6)";
        }
        prevValue = value;

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
}

function plotEMAs_30m(chart, rawData) {
    const emaColors = {
        EMA_12: "lightgreen",
        EMA_25: "green",
        EMA_38: "#ffcbfb",   // Light Pink
        EMA_75: "#8c3caf",   // Purple
        EMA_150: "#38ccdd",  // Cyan
        EMA_300: "#ffff00"
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
            lastValueVisible: false
        });

        emaSeries.setData(emaData);
        console.log(`✅ Plotted ${emaKey} with color ${emaColors[emaKey]}`);
    });
}

function plotHistogram_30m(histogramChart, rawData) {
    // Ensure EMA_12 and EMA_25 exist
    if (!rawData[0].EMA_12 || !rawData[0].EMA_25) {
        console.warn("⚠ Histogram not plotted: EMA_12 or EMA_25 missing in JSON.");
        return;
    }

    let prevValue = rawData[0].EMA_12 - rawData[0].EMA_25;
    const histogramData = rawData.map(entry => {
        const value = entry.EMA_12 - entry.EMA_25;
        let color;

        if (value >= 0) {
            color = value > prevValue ? "rgba(12, 171, 7, 0.6)" : "rgba(139, 222, 122, 0.6)";
        } else {
            color = value < prevValue ? "rgba(222, 7, 28, 0.6)" : "rgba(222, 167, 166, 0.6)";
        }
        prevValue = value;

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
}

// ============================ Chart Synchronization ============================

/**
 * Synchronizes zoom, pan, and crosshair move events between two charts.
 * @param {IChartApi} sourceChart - The primary chart.
 * @param {IChartApi} targetChart - The chart to sync with the primary chart.
 */
function syncCharts(sourceChart, targetChart) {
    sourceChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        targetChart.timeScale().setVisibleRange(range);
    });

    // sourceChart.timeScale().subscribeBarSpacingChange((spacing) => {
    //     targetChart.timeScale().applyOptions({ barSpacing: spacing });
    // });

    sourceChart.subscribeCrosshairMove((param) => {
        targetChart.setCrosshairPosition(param);
    });

    targetChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        sourceChart.timeScale().setVisibleRange(range);
    });

    // targetChart.timeScale().subscribeBarSpacingChange((spacing) => {
    //     sourceChart.timeScale().applyOptions({ barSpacing: spacing });
    // });

    targetChart.subscribeCrosshairMove((param) => {
        sourceChart.setCrosshairPosition(param);
    });
}

async function loadTradingViewChart_v2(ticker = null) {
    console.log("Loading TradingView Chart...");

    if (!validateTicker(ticker)) return;

    const container = document.getElementById('plotly-div');
    const histogramContainer = document.getElementById('plotly-histogram');

    clearContainers(container, histogramContainer);

    if (!isLibraryLoaded()) return;

    const chart = createMainChart(container);
    const histogramChart = createHistogramChart(histogramContainer, container.clientWidth);

    let jsonPath;
    const selectedChart = localStorage.getItem('selectedChart');
    
    if (selectedChart === '1W') {
        jsonPath = `../../charts/JSON/1W/${ticker}.json`;
    } else if (selectedChart === '1D') {
        jsonPath = `../../charts/JSON/1D/${ticker}.json`;
    } else if (selectedChart === '30M') {
        jsonPath = `../../charts/JSON/30M/${ticker}.json`;
    } else {
        jsonPath = `../../charts/JSON/2H/${ticker}.json`;
    }

    console.log(jsonPath);
    
    let rawData;
    try {
        rawData = await fetchJSONData(jsonPath);
    } catch (error) {
        console.error("❌ Error loading candlestick JSON:", error);
        return;
    }

    const candleData = prepareCandleData(rawData);
    plotCandlesticks(chart, candleData);
    console.log(`✅ Candlestick chart successfully loaded for ${ticker}`);

 
    if (selectedChart === '1W') {
        await plotOrders(chart, candleData, ticker);
        localStorage.setItem('selectedChart', '1W');
        plotEMAs_1W(chart, rawData);
        plotHistogram_1W(histogramChart, rawData);
    } else if (selectedChart === '1D') {
        await plotOrders(chart, candleData, ticker);
        localStorage.setItem('selectedChart', '1D');
        plotEMAs_1D(chart, rawData);
        plotHistogram_1D(histogramChart, rawData);
    } else if (selectedChart === '2H') {
        await plotOrders(chart, candleData, ticker);
        localStorage.setItem('selectedChart', '2H');
        plotEMAs_2H(chart, rawData);
        plotHistogram_2H(histogramChart, rawData);
    }else if (selectedChart === '30M') {
        localStorage.setItem('selectedChart', '30M');
        plotEMAs_30m(chart, rawData);
        plotHistogram_30m(histogramChart, rawData);
    } 
    
    syncCharts(chart, histogramChart);
}

function loadChart_v2(chartType, chartPath, ticker = '') {
    console.log("loadChart_v2 charPath = " + chartPath);

    if (chartPath.includes('Renko')) {
        let imagePath = chartPath.replace('.json', '.png');
        loadImage_v2(imagePath);
    } else {
        localStorage.setItem('selectedChart', chartType);
        loadTradingViewChart_v2(ticker);
    }

    const menuCaption = document.getElementById("menu-caption");
    if (menuCaption) {
        menuCaption.textContent = localStorage.getItem('selectedChart');
    }

    //setCurrentChartDirectory_v2(chartPath);
}

document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const ticker = params.get("ticker");

    if (!ticker) {
        console.error("⚠ No ticker provided in URL.");
        return;
    }

    try {
        const response = await fetch("../../JSON/TickerInfo.json");
        const tickerInfo = await response.json();
        const stockData = tickerInfo.find(item => item.ticker === ticker);

        if (!stockData) {
            console.error("⚠ Ticker not found in TickerInfo.json:", ticker);
            return;
        }

        // ✅ Update the Menu Option: Rename "Summary" to `{ticker}`
        const summaryLink = document.getElementById("chart-summary");
        if (summaryLink) {
            summaryLink.textContent = ticker; // Rename the text to the ticker symbol
            summaryLink.href = `../../summaries/${ticker}.html`; // Keep the correct link
        }

        // const menuCaption = document.getElementById("menu-caption");
        // if (menuCaption) {
        //     menuCaption.textContent = localStorage.getItem('selectedChart');
        // }

        console.log(`✅ Renamed "Summary" to "${ticker}" in the Options Menu.`);

    } catch (error) {
        console.error("❌ Error fetching ticker data:", error);
    }
});



