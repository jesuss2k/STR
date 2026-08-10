let mainChart_v2 = null;
let histogramChart_v2 = null;
let resizeTimer_v2 = null;

// Function to load an image into the plotly-div container
function loadImage_v2(imagePath) {
    console.log('Reached loadImage_v2 with path:', imagePath);

    const container = document.getElementById('plotly-div');
    const histogramContainer = document.getElementById('plotly-histogram');

    clearContainers(container, histogramContainer);

    container.innerHTML = '';

    // Center image vertically + horizontally
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';

    const img = document.createElement('img');
    img.src = imagePath;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.display = 'block';
    img.style.margin = '0 auto';

    container.appendChild(img);
}

// Adjust viewport height for responsiveness
function adjustViewportHeight_v2() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    const plotlyDiv = document.getElementById('plotly-div');
    const histogramDiv = document.getElementById('plotly-histogram');

    if (plotlyDiv) {
        plotlyDiv.style.height = `calc(84 * var(--vh))`;
    }

    if (histogramDiv) {
        histogramDiv.style.height = `calc(16 * var(--vh))`;
    }
}

window.addEventListener('resize', adjustViewportHeight_v2);
window.addEventListener('load', adjustViewportHeight_v2);

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

function validateTicker(ticker) {
    if (!ticker) {
        console.error("Error: No ticker provided. Cannot load chart.");
        return false;
    }
    return true;
}

function clearContainers(container, histogramContainer) {
    container.innerHTML = '';
    histogramContainer.innerHTML = '';
}

function isLibraryLoaded() {
    if (typeof LightweightCharts === 'undefined' || !LightweightCharts.createChart) {
        console.error("TradingView Lightweight Charts library is missing or not loaded.");
        return false;
    }
    return true;
}

async function fetchJSONData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load JSON from ${url}: ${response.statusText}`);
    }
    return await response.json();
}

// ============================ Menu Helpers ============================

function getSelectedChart_v2() {
    return localStorage.getItem('selectedChart') || '1W';
}

function getChartLabel_v2(chartType) {
    switch (chartType) {
        case '1W': return '1W';
        case '1D': return '1D';
        case '2H': return '2h';
        case '30M': return '30m';
        case 'Rk 1D': return '1D';
        case 'Rk 1D50': return '½D';
        case 'Rk 1D25': return '¼D';
        case 'Rk 2H': return '2h';
        case 'Rk 1H': return '1h';
        case 'Rk 30M': return '30m';
        default: return chartType || '1W';
    }
}

function updateMenuCaption_v2(ticker) {
    const menuCaption = document.getElementById("menu-caption");
    if (!menuCaption) return;

    const selectedChart = getSelectedChart_v2();
    menuCaption.textContent = getChartLabel_v2(selectedChart);
}

function clearActiveMenuLinks_v2() {
    document.querySelectorAll('#menu-options-main a, #menu-options-renko a')
        .forEach(link => link.classList.remove('active'));
}

function updateActiveMenuLinks_v2(selectedChart) {
    clearActiveMenuLinks_v2();

    const chartMap = {
        '1W': 'chart-1w',
        '1D': 'chart-1d',
        '2H': 'chart-2h',
        '30M': 'chart-30m',
        'Rk 1D': 'chart-rk-1d',
        'Rk 1D50': 'chart-rk-1d50',
        'Rk 1D25': 'chart-rk-1d25',
        'Rk 2H': 'chart-rk-2h',
        'Rk 1H': 'chart-rk-1h',
        'Rk 30M': 'chart-rk-30m'
    };

    const id = chartMap[selectedChart];
    if (id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }
}

function initializeMenuLogic_v2() {
    const menuCaption = document.getElementById('menu-caption');
    const menuOptionsMain = document.getElementById('menu-options-main');
    const menuOptionsRenko = document.getElementById('menu-options-renko');

    if (!menuCaption || !menuOptionsMain || !menuOptionsRenko) {
        console.warn("Menu elements not found. Skipping menu initialization.");
        return;
    }

    console.log("DOM fully loaded. Initializing menu...");

    let isMenuOpen = false;
    const savedDisplayState = localStorage.getItem('menuDisplayState');
    console.log("Saved display state from localStorage:", savedDisplayState);

    if (savedDisplayState === 'block') {
        menuOptionsMain.style.display = 'flex';
        menuOptionsRenko.style.display = 'flex';
        isMenuOpen = true;
        console.log("Menu initialized as open.");
    } else {
        menuOptionsMain.style.display = 'none';
        menuOptionsRenko.style.display = 'none';
        isMenuOpen = false;
        console.log("Menu initialized as closed.");
    }

    menuCaption.addEventListener('click', function (e) {
        e.preventDefault();

        if (isMenuOpen) {
            menuOptionsMain.style.display = 'none';
            menuOptionsRenko.style.display = 'none';
            localStorage.setItem('menuDisplayState', 'none');
            isMenuOpen = false;
            console.log("Menu closed. New state saved: 'none'");
        } else {
            menuOptionsMain.style.display = 'flex';
            menuOptionsRenko.style.display = 'flex';
            localStorage.setItem('menuDisplayState', 'block');
            isMenuOpen = true;
            console.log("Menu opened. New state saved: 'block'");
        }
    });
}

function bindMenuActions_v2(ticker) {
    const bind = (id, chartType) => {
        const el = document.getElementById(id);
        if (!el) {
            console.warn(`Element not found: ${id}`);
            return;
        }

        el.onclick = (e) => {
            e.preventDefault();
            console.log(`Clicked ${id} -> ${chartType}`);
            loadChart_v2(chartType, '', ticker);
        };
    };

    bind('chart-1w', '1W');
    bind('chart-1d', '1D');
    bind('chart-2h', '2H');
    bind('chart-30m', '30M');

    bind('chart-rk-1d', 'Rk 1D');
    bind('chart-rk-1d50', 'Rk 1D50');
    bind('chart-rk-1d25', 'Rk 1D25');    
    bind('chart-rk-2h', 'Rk 2H');
    bind('chart-rk-1h', 'Rk 1H');
    bind('chart-rk-30m', 'Rk 30M');

    const lineBtn = document.getElementById('chart-line');
    if (lineBtn) {
        lineBtn.onclick = (e) => {
            e.preventDefault();
            console.log('Clicked chart-line -> LINE');
            loadChart_v2('LINE', 'LINE', ticker);
        };
    }
}

// ============================ Chart Creation Functions ============================

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
        timeScale: {},
        priceScale: {
            scaleMargins: {
                top: 0.1,
                bottom: 0.08
            },
            borderVisible: false,
            entireTextOnly: false,
            visible: false,
            drawTicks: false,
            ticksVisible: false
        },
        rightPriceScale: {
            borderVisible: false,
        },
        crosshair: {
            mode: 0,
        }
    });
}

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
            visible: false
        },
        priceScale: {
            scaleMargins: {
                top: 0.02,
                bottom: 0.02
            },
            borderVisible: false,
            entireTextOnly: false,
            visible: true,
            drawTicks: true,
            ticksVisible: true,
            autoScale: true
        },
        rightPriceScale: {
            borderVisible: false,
        },
    });
}

// ============================ Data Processing & Plotting ============================

function prepareCandleData(rawData) {
    return rawData.map(entry => ({
        time: Math.floor(new Date(entry.Timestamp).getTime() / 1000),
        open: entry.Open,
        high: entry.High,
        low: entry.Low,
        close: entry.Close
    }));
}

function prepareLineData(rawData) {
    return rawData.map(entry => ({
        time: Math.floor(new Date(entry.Timestamp).getTime() / 1000),
        value: entry.Close
    }));
}

function plotLine(chart, lineData) {
    const lineSeries = chart.addLineSeries({
        color: "blue",
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true
    });

    lineSeries.setData(lineData);
    return lineSeries;
}

function plotCloseLine(chart, lineData) {
    const lineSeries = chart.addLineSeries({
        color: "dodgerblue",
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        priceFormat: {
            type: 'price',
            precision: 0,
            minMove: 1
        }
    });

    lineSeries.setData(lineData);
    return lineSeries;
}

function plotCandlesticks(chart, candleData) {
    const candleSeries = chart.addCandlestickSeries({
        priceFormat: {
            type: 'price',
            precision: 0,
            minMove: 1
        },
        priceLineVisible: true,
        lastValueVisible: false
    });
    candleSeries.setData(candleData);

    return candleSeries;
}

async function plotOrders(chart, candleData, ticker) {
    try {
        const ordersData = await fetchJSONData("../../JSON/LatestOrders.json");
        console.log(`📄 Loaded ${ordersData.length} orders from LatestOrders.json`);

        const filteredOrders = ordersData.filter(order => order.ticker === ticker);
        console.log(`📊 Found ${filteredOrders.length} orders for ${ticker}:`, filteredOrders);

        filteredOrders.forEach(order => {
            const color = order.positionStatus === "Closed" ? "#FFD700" : "#1E90FF";
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

async function plotSubmittedOrders(chart, candleData, ticker) {
    try {
        const ordersData = await fetchJSONData("../../JSON/OrdersSubmitted.json");

        const filteredOrders = ordersData.filter(order => order.ticker === ticker);

        filteredOrders.forEach(order => {
            const lineStyle = order.buySell === "Sell"
                ? LightweightCharts.LineStyle.Dashed
                : LightweightCharts.LineStyle.Dotted;

            chart.addLineSeries({
                color: "#f48fb1",
                lineWidth: 2,
                lastValueVisible: false,
                lineStyle: lineStyle
            }).setData([
                { time: candleData[0].time, value: order.price },
                { time: candleData[candleData.length - 1].time, value: order.price }
            ]);
        });
    } catch (error) {
        console.error("Error loading OrdersSubmitted JSON:", error);
    }
}

async function plotGuruFocus(chart, candleData, ticker) {
    try {
        const GuruFocusData = await fetchJSONData("../../JSON/GuruFocus.json");
        console.log(`📄 Loaded ${GuruFocusData.length} GuruFocus from GuruFocus.json`);

        const filteredOrders = GuruFocusData.filter(GuruFocus => GuruFocus.ticker === ticker);
        console.log(`📊 Found ${filteredOrders.length} GuruFocus for ${ticker}:`, filteredOrders);

        filteredOrders.forEach(GuruFocus => {
            chart.addLineSeries({
                lineWidth: 9,
                color: "rgba(245, 245, 220, 0.4)",
                priceLineVisible: false,
                lastValueVisible: false,
                lineStyle: LightweightCharts.LineStyle.Solid
            }).setData([
                { time: candleData[0].time, value: GuruFocus.GFValue },
                { time: candleData[candleData.length - 1].time, value: GuruFocus.GFValue }
            ]);

            console.log(`✅ Plotted GuruFocus at ${GuruFocus.GFValue}`);
        });
    } catch (error) {
        console.error("❌ Error loading GuruFocus JSON:", error);
    }
}

function plotEMAs_1W(chart, rawData) {
    const emaColors = {
        EMA_5: "#ffff00",
        EMA_10: "#e67e22",
        EMA_20: "#ff0000",
        EMA_40: "#ffffff",
        EMA_80: "#ab47bc",
        EMA_160: "#4caf50",
        EMA_320: "#f48fb1",
        ZLEMA: "#ff0000"
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
            lineWidth: emaKey === "ZLEMA" ? 1 : 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            pointMarkersVisible: false,
            lineStyle: emaKey === "ZLEMA" ? 3 : 0
        });

        emaSeries.setData(emaData);

        console.log(`✅ Plotted ${emaKey} with color ${emaColors[emaKey]}`);
    });
}

function plotZlemaOverlay_v2(chart, rawData, selectedChart) {
    const yellowMap = {
        '1W': 'EMA_5',
        '1D': 'EMA_25',
        '2H': 'EMA_100',
        '30M': 'EMA_400'
    };

    const yellowKey = yellowMap[selectedChart];
    if (!yellowKey) {
        console.warn(`⚠ No yellow EMA mapping for chart ${selectedChart}`);
        return;
    }

    if (!rawData[0] || rawData[0][yellowKey] === undefined || rawData[0].ZLEMA === undefined) {
        console.warn(`⚠ Data missing for ZLEMA overlay: ${yellowKey} or ZLEMA not present.`);
        return;
    }

    const zlemaData = rawData.map(entry => ({
        time: Math.floor(new Date(entry.Timestamp).getTime() / 1000),
        value: entry.ZLEMA
    }));

    const emaYellowData = rawData.map(entry => ({
        time: Math.floor(new Date(entry.Timestamp).getTime() / 1000),
        value: entry[yellowKey]
    }));

    const zlemaSeries = chart.addLineSeries({
        color: '#ff0000',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        lastValueVisible: false,
        priceLineVisible: false
    });
    zlemaSeries.setData(zlemaData);

    const yellowSeries = chart.addLineSeries({
        color: '#ffff00',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        lastValueVisible: false,
        priceLineVisible: false
    });
    yellowSeries.setData(emaYellowData);

    console.log(`✅ ZLEMA overlay plotted for ${selectedChart}: ZLEMA + ${yellowKey}`);
}

function plotHistogram_1W(histogramChart, rawData) {
    if (!rawData[0].EMA_5 || !rawData[0].EMA_10) {
        console.warn("⚠ Histogram not plotted: EMA_5 or EMA_10 missing in JSON.");
        return;
    }

    let prevValue = rawData[0].EMA_5 - rawData[0].EMA_10;
    const histogramData = rawData.map(entry => {
        const value = entry.EMA_5 - entry.EMA_10;
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
        lastValueVisible: false,
        priceFormat: {
            type: 'price',
            precision: 0,
            minMove: 1
        }
    });

    histogramSeries.setData(histogramData);
    console.log("✅ Histogram (EMA_5 - EMA_10) added with trend-based colors.");
}

function plotHistogram_ZLEMA_v2(histogramChart, rawData) {
    if (!rawData[0] || rawData[0].Close === undefined || rawData[0].ZLEMA === undefined) {
        console.warn("Histogram not plotted: Close or ZLEMA missing in JSON.");
        return;
    }

    let prevValue = rawData[0].Close - rawData[0].ZLEMA;
    const histogramData = rawData.map(entry => {
        const value = entry.Close - entry.ZLEMA;
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
        lastValueVisible: false,
        priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01
        }
    });

    histogramSeries.setData(histogramData);
    console.log("Histogram (Close - ZLEMA) added with trend-based colors.");
}

function plotEMAs_1D(chart, rawData) {
    const emaColors = {
        EMA_12: "#38ccdd",
        EMA_25: "#ffff00",
        EMA_50: "#e67e22",
        EMA_100: "#ff0000",
        EMA_200: "#ffffff",
        ZLEMA: "#ff0000"
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
            crosshairMarkerVisible: false,
            pointMarkersVisible: false,
            lineStyle: emaKey === "ZLEMA" ? 3 : 0
        });

        emaSeries.setData(emaData);
        console.log(`✅ Plotted ${emaKey} with color ${emaColors[emaKey]} ${emaKey === "ZLEMA" ? "(Dashed)" : ""}`);
    });
}

function plotHistogram_1D(histogramChart, rawData) {
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
        lastValueVisible: false,
        priceFormat: {
            type: 'price',
            precision: 0,
            minMove: 1
        }
    });

    histogramSeries.setData(histogramData);
    console.log("✅ Histogram (EMA_12 - EMA_25) added with trend-based colors.");
}

function plotEMAs_2H(chart, rawData) {
    const emaColors = {
        EMA_12: "#ffcbfb",
        EMA_25: "#8c3caf",
        EMA_50: "#38ccdd",
        EMA_100: "#ffff00",
        EMA_200: "#e67e22",
        EMA_400: "#ff0000",
        EMA_800: "#ffffff",
        ZLEMA: "#ff0000"
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
            crosshairMarkerVisible: false,
            pointMarkersVisible: false,
            lineStyle: emaKey === "ZLEMA" ? 3 : 0
        });

        emaSeries.setData(emaData);
        console.log(`✅ Plotted ${emaKey} with color ${emaColors[emaKey]} ${emaKey === "ZLEMA" ? "(Dashed)" : ""}`);
    });
}

function plotHistogram_2H(histogramChart, rawData) {
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
        lastValueVisible: false,
        priceFormat: {
            type: 'price',
            precision: 0,
            minMove: 1
        }
    });

    histogramSeries.setData(histogramData);
    console.log("✅ Histogram (EMA_12 - EMA_25) added with trend-based colors.");
}

function plotEMAs_30m(chart, rawData) {
    const emaColors = {
        EMA_12: "lightgreen",
        EMA_25: "green",
        EMA_50: "#ffcbfb",
        EMA_100: "#8c3caf",
        EMA_200: "#38ccdd",
        EMA_400: "#ffff00",
        EMA_800: "#ff8c00",
        EMA_1600: "#f700ff",
        ZLEMA: "#ff0000"
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
            crosshairMarkerVisible: false,
            pointMarkersVisible: false,
            lineStyle: emaKey === "ZLEMA" ? 3 : 0
        });

        emaSeries.setData(emaData);
        console.log(`✅ Plotted ${emaKey} with color ${emaColors[emaKey]} ${emaKey === "ZLEMA" ? "(Dashed)" : ""}`);
    });
}

function plotHistogram_30m(histogramChart, rawData) {
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
        lastValueVisible: false,
        priceFormat: {
            type: 'price',
            precision: 0,
            minMove: 1
        }
    });

    histogramSeries.setData(histogramData);
    console.log("✅ Histogram (EMA_12 - EMA_25) added with trend-based colors.");
}

function resizeActiveCharts_v2() {
    const container = document.getElementById('plotly-div');
    const histogramContainer = document.getElementById('plotly-histogram');

    if (!container || !histogramContainer) return;

    // Update viewport unit first
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    container.style.height = `calc(84 * var(--vh))`;
    histogramContainer.style.height = `calc(16 * var(--vh))`;

    const selectedChart = localStorage.getItem('selectedChart') || '1W';

    // Renko is just an image: flex centering is enough
    if (selectedChart.startsWith('Rk ')) {
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        return;
    }

    // Normal charts
    container.style.display = 'block';
    container.style.alignItems = '';
    container.style.justifyContent = '';

    if (mainChart_v2) {
        mainChart_v2.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight
        });
    }

    if (histogramChart_v2) {
        histogramChart_v2.applyOptions({
            width: histogramContainer.clientWidth,
            height: histogramContainer.clientHeight
        });
    }
}

window.addEventListener('orientationchange', () => {
    clearTimeout(resizeTimer_v2);
    resizeTimer_v2 = setTimeout(resizeActiveCharts_v2, 250);
});

window.addEventListener('resize', () => {
    clearTimeout(resizeTimer_v2);
    resizeTimer_v2 = setTimeout(resizeActiveCharts_v2, 120);
});

// ============================ Chart Synchronization ============================

function syncCharts(sourceChart, targetChart) {
    sourceChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        targetChart.timeScale().setVisibleRange(range);
    });

    sourceChart.subscribeCrosshairMove((param) => {
        if (targetChart.setCrosshairPosition) {
            targetChart.setCrosshairPosition(param);
        }
    });

    targetChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        sourceChart.timeScale().setVisibleRange(range);
    });

    targetChart.subscribeCrosshairMove((param) => {
        if (sourceChart.setCrosshairPosition) {
            sourceChart.setCrosshairPosition(param);
        }
    });
}

async function loadTradingViewChart_v2(ticker = null) {
    console.log("Loading TradingView Chart...");

    if (!validateTicker(ticker)) return;

    const container = document.getElementById('plotly-div');
    const histogramContainer = document.getElementById('plotly-histogram');

    clearContainers(container, histogramContainer);

    container.style.display = 'block';
    container.style.alignItems = '';
    container.style.justifyContent = '';

    if (!isLibraryLoaded()) return;

    const chart = createMainChart(container);
    const histogramChart = createHistogramChart(histogramContainer, histogramContainer.clientWidth);

    mainChart_v2 = chart;
    histogramChart_v2 = histogramChart;

    let jsonPath;
    const selectedChart = localStorage.getItem('selectedChart') || '1W';

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

    const renderMode = getRenderMode_v2();
    if (renderMode === 'LINE') {
        const lineData = prepareLineData(rawData);
        plotCloseLine(chart, lineData);
        console.log(`✅ Rendered LINE for ${ticker}`);
    } else {
        plotCandlesticks(chart, candleData);
        console.log(`✅ Rendered CANDLES for ${ticker}`);
    }

    if (selectedChart === '1W') {
        await plotOrders(chart, candleData, ticker);
        await plotSubmittedOrders(chart, candleData, ticker);
        await plotGuruFocus(chart, candleData, ticker);
        if (renderMode === 'ZLEMA') {
            plotZlemaOverlay_v2(chart, rawData, selectedChart);
        } else {
            plotEMAs_1W(chart, rawData);
        }
        if (renderMode === 'ZLEMA') {
            plotHistogram_ZLEMA_v2(histogramChart, rawData);
        } else {
            plotHistogram_1W(histogramChart, rawData);
        }
    } else if (selectedChart === '1D') {
        await plotOrders(chart, candleData, ticker);
        await plotSubmittedOrders(chart, candleData, ticker);
        await plotGuruFocus(chart, candleData, ticker);
        if (renderMode === 'ZLEMA') {
            plotZlemaOverlay_v2(chart, rawData, selectedChart);
        } else {
            plotEMAs_1D(chart, rawData);
        }
        if (renderMode === 'ZLEMA') {
            plotHistogram_ZLEMA_v2(histogramChart, rawData);
        } else {
            plotHistogram_1D(histogramChart, rawData);
        }
    } else if (selectedChart === '2H') {
        await plotOrders(chart, candleData, ticker);
        await plotSubmittedOrders(chart, candleData, ticker);
        if (renderMode === 'ZLEMA') {
            plotZlemaOverlay_v2(chart, rawData, selectedChart);
        } else {
            plotEMAs_2H(chart, rawData);
        }
        if (renderMode === 'ZLEMA') {
            plotHistogram_ZLEMA_v2(histogramChart, rawData);
        } else {
            plotHistogram_2H(histogramChart, rawData);
        }
    } else if (selectedChart === '30M') {
        if (renderMode === 'ZLEMA') {
            plotZlemaOverlay_v2(chart, rawData, selectedChart);
        } else {
            plotEMAs_30m(chart, rawData);
        }
        if (renderMode === 'ZLEMA') {
            plotHistogram_ZLEMA_v2(histogramChart, rawData);
        } else {
            plotHistogram_30m(histogramChart, rawData);
        }
    }

    syncCharts(chart, histogramChart);
    resizeActiveCharts_v2();
}

function loadChart_v2(chartType, chartPath, ticker = '') {
    console.log("loadChart_v2 chartType = " + chartType);

    if (chartType === 'LINE') {
        const newMode = toggleRenderMode_v2();
        loadTradingViewChart_v2(ticker);
        updateLineMenuLabel_v2(newMode);
        updateMenuCaption_v2(ticker);
        updateActiveMenuLinks_v2(getSelectedChart_v2());
        updateOverlay_v2(ticker);
        return;
    }

    updateLineMenuLabel_v2();

    localStorage.setItem('selectedChart', chartType);

    if (chartType === 'Rk 1D') {
        loadImage_v2(`../../charts/Renko1D/${ticker}.png`);
    } else if (chartType === 'Rk 1D50') {
        loadImage_v2(`../../charts/Renko1D50/${ticker}.png`);
    } else if (chartType === 'Rk 1D25') {
        loadImage_v2(`../../charts/Renko1D25/${ticker}.png`);
    } else if (chartType === 'Rk 2H') {
        loadImage_v2(`../../charts/Renko2H/${ticker}.png`);
    } else if (chartType === 'Rk 1H') {
        loadImage_v2(`../../charts/Renko1h/${ticker}.png`);
    } else if (chartType === 'Rk 30M') {
        loadImage_v2(`../../charts/Renko30M/${ticker}.png`);
    } else {
        loadTradingViewChart_v2(ticker);
    }
    updateMenuCaption_v2(ticker);
    updateActiveMenuLinks_v2(chartType);
    updateOverlay_v2(ticker);
}

function normalizeOverlayTicker_v2(ticker) {
    return String(ticker || '').trim().toUpperCase().replace(/\.MC$/, '_MC');
}

function getOverlayMode_v2() {
    return localStorage.getItem('overlayMode_v2') || 'PNL';
}

function getPnlBaseChart_v2(selectedChart) {
    const chartMap = {
        '1W': '1W',
        '1D': '1D',
        '2H': '2H',
        '30M': '30M',
        'Rk 1D50': '1W',
        'Rk 1D25': '1D',
        'Rk 1H': '2H',
        'Rk 30M': '30M'
    };
    return chartMap[selectedChart] || '1D';
}

function getPnlJsonPath_v2(ticker) {
    const selectedChart = localStorage.getItem('selectedChart') || '1W';
    const baseChart = getPnlBaseChart_v2(selectedChart);
    return `../../charts/JSON/${baseChart}/${ticker}.json`;
}

function formatPnlNumber_v2(value) {
    return Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatWholeNumber_v2(value) {
    return Number(value).toLocaleString(undefined, {
        maximumFractionDigits: 0
    });
}

async function updateEmaOverlay_v2(ticker, overlay) {
    const response = await fetch("../../JSON/TickerTechnicals.json");
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading TickerTechnicals.json`);
    }

    const technicals = await response.json();
    const normalizedTicker = normalizeOverlayTicker_v2(ticker);
    const rec = technicals.find(x =>
        normalizeOverlayTicker_v2(x.ticker || x.Ticker) === normalizedTicker
    );

    const emasRaw = rec?.EMAs ?? "";
    const emasHtml = emasRaw
        .replace(/\s+/g, "")
        .split("")
        .map(ch => {
            const c = ch.toUpperCase();
            if (c === "X") return `<span class="ema-x">X</span>`;
            if (c === "O" || c === "0") return `<span class="ema-o">O</span>`;
            return "";
        })
        .join("");

    overlay.classList.remove('pnl-positive', 'pnl-negative', 'pnl-neutral');
    overlay.innerHTML = emasHtml;
}

async function updatePnlOverlay_v2(ticker, overlay) {
    const normalizedTicker = normalizeOverlayTicker_v2(ticker);
    const orders = await fetchJSONData("../../JSON/LatestOrders.json");
    const openOrders = orders.filter(order =>
        normalizeOverlayTicker_v2(order.ticker) === normalizedTicker &&
        String(order.positionStatus || '').toUpperCase() === 'OPEN'
    );

    if (!openOrders.length) {
        overlay.classList.remove('pnl-positive', 'pnl-negative');
        overlay.classList.add('pnl-neutral');
        overlay.textContent = '---';
        return;
    }

    const chartData = await fetchJSONData(getPnlJsonPath_v2(ticker));
    const latestBar = chartData[chartData.length - 1];
    const latestClose = Number(latestBar?.Close);
    if (!Number.isFinite(latestClose)) {
        overlay.classList.remove('pnl-positive', 'pnl-negative');
        overlay.classList.add('pnl-neutral');
        overlay.textContent = '---';
        return;
    }

    const totalQuantity = openOrders.reduce((sum, order) => sum + Number(order.quantity || 0), 0);
    const totalCost = openOrders.reduce(
        (sum, order) => sum + (Number(order.price || 0) * Number(order.quantity || 0)),
        0
    );

    if (!Number.isFinite(totalQuantity) || totalQuantity <= 0 || !Number.isFinite(totalCost)) {
        overlay.classList.remove('pnl-positive', 'pnl-negative');
        overlay.classList.add('pnl-neutral');
        overlay.textContent = '---';
        return;
    }

    const averagePrice = totalCost / totalQuantity;
    if (!Number.isFinite(averagePrice) || averagePrice <= 0) {
        overlay.classList.remove('pnl-positive', 'pnl-negative');
        overlay.classList.add('pnl-neutral');
        overlay.textContent = '---';
        return;
    }

    const pnl = (latestClose - averagePrice) * totalQuantity;
    const pnlPercent = ((latestClose - averagePrice) / averagePrice) * 100;
    const positionSize = totalQuantity * latestClose;
    const pnlClass = pnl > 0 ? 'pnl-positive' : pnl < 0 ? 'pnl-negative' : 'pnl-neutral';

    overlay.classList.remove('ema-o', 'ema-x', 'pnl-positive', 'pnl-negative', 'pnl-neutral');
    overlay.innerHTML = `<span class="pnl-size">${formatWholeNumber_v2(positionSize)}</span> <span class="${pnlClass}">${formatWholeNumber_v2(pnl)} (${formatPnlNumber_v2(pnlPercent)}%)</span>`;
}

async function updateOverlay_v2(ticker) {
    const overlay = document.getElementById("ema-overlay");
    if (!overlay) {
        console.warn("ema-overlay div not found in HTML.");
        return;
    }

    try {
        if (getOverlayMode_v2() === 'PNL') {
            await updatePnlOverlay_v2(ticker, overlay);
        } else {
            await updateEmaOverlay_v2(ticker, overlay);
        }
    } catch (err) {
        console.error("Error loading/painting overlay:", err);
        overlay.classList.remove('pnl-positive', 'pnl-negative');
        overlay.classList.add('pnl-neutral');
        overlay.textContent = '---';
    }
}

window.updateOverlay_v2 = updateOverlay_v2;

document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const ticker = params.get("ticker");

    console.log("DOMContentLoaded chart_v2.js");

    if (!ticker) {
        console.error("⚠ No ticker provided in URL.");
        return;
    }

    initializeMenuLogic_v2();
    bindMenuActions_v2(ticker);
    updateMenuCaption_v2(ticker);
    updateActiveMenuLinks_v2(getSelectedChart_v2());

    async function updateEmaOverlay_v2(ticker) {
        try {
            const response = await fetch("../../JSON/TickerTechnicals.json");
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} loading TickerTechnicals.json`);
            }

            const technicals = await response.json();

            const rec = technicals.find(x =>
                (x.ticker || x.Ticker) === ticker
            );

            const overlay = document.getElementById("ema-overlay");
            if (!overlay) {
                console.warn("ema-overlay div not found in HTML.");
                return;
            }

            const emasRaw = rec?.EMAs ?? "";

            const emasHtml = emasRaw
                .replace(/\s+/g, "")
                .split("")
                .map(ch => {
                    const c = ch.toUpperCase();
                    if (c === "X") return `<span class="ema-x">X</span>`;
                    if (c === "O" || c === "0") return `<span class="ema-o">O</span>`;
                    return "";
                })
                .join("");

            overlay.innerHTML = emasHtml;

            console.log(`✅ EMA overlay updated for ${ticker}: ${overlay.textContent}`);
        } catch (err) {
            console.error("❌ Error loading/painting EMA overlay:", err);
        }
    }

    updateOverlay_v2(ticker);

    try {
        const response = await fetch("../../JSON/TickerInfo.json");
        const tickerInfo = await response.json();
        const normalizedTicker = (ticker || '').trim().toUpperCase();
        const stockData = tickerInfo.find(item => {
            const itemTicker = (item.ticker || '').trim().toUpperCase();
            if (itemTicker === normalizedTicker) return true;
            if (normalizedTicker.endsWith('.MC') && itemTicker === normalizedTicker.slice(0, -3)) return true;
            if (itemTicker.endsWith('.MC') && itemTicker.slice(0, -3) === normalizedTicker) return true;
            return false;
        });

        if (!stockData) {
            console.error("⚠ Ticker not found in TickerInfo.json:", ticker);
        }

        const summaryLink = document.getElementById("chart-summary");
        if (summaryLink) {
            let displayTicker = ticker;
            if (ticker.endsWith('_MC')) {
                displayTicker = '\uD83C\uDDEA\uD83C\uDDF8' + ' ' + ticker.replace('_MC', '');
            }
            summaryLink.textContent = displayTicker;
            summaryLink.href = `../../summaries/${ticker}.html`;
        }

        console.log(`✅ Summary link updated for "${ticker}".`);
    } catch (error) {
        console.error("❌ Error fetching ticker data:", error);
    }

    // Add keyboard shortcut for mode toggle
    document.addEventListener('keydown', function(event) {
        if (event.key === 'm' || event.key === 'M') {
            console.log('Keyboard shortcut: toggle mode');
            const newMode = toggleRenderMode_v2();
            loadTradingViewChart_v2(ticker);
            updateLineMenuLabel_v2(newMode);
            updateMenuCaption_v2(ticker);
            updateActiveMenuLinks_v2(getSelectedChart_v2());
            updateOverlay_v2(ticker);
        }
    });
});

// ---------- Render mode (CANDLES -> LINE -> ZLEMA -> CANDLES) ----------
function getRenderMode_v2() {
    return localStorage.getItem('chartRenderMode_v2') || 'CANDLES';
}

function setRenderMode_v2(mode) {
    const normalized = mode === 'LINE' ? 'LINE' : mode === 'ZLEMA' ? 'ZLEMA' : 'CANDLES';
    localStorage.setItem('chartRenderMode_v2', normalized);
}

function toggleRenderMode_v2() {
    const modes = ['CANDLES', 'LINE', 'ZLEMA'];
    const current = getRenderMode_v2();
    const idx = modes.indexOf(current);
    const next = modes[(idx + 1) % modes.length] || 'CANDLES';
    setRenderMode_v2(next);
    return next;
}

// Updates the menu label to show what is currently displayed
function updateLineMenuLabel_v2(mode = getRenderMode_v2()) {
    const lineBtn = document.getElementById('chart-line');
    if (!lineBtn) return;

    if (mode === 'CANDLES') {
        lineBtn.textContent = 'Cndl';
    } else if (mode === 'LINE') {
        lineBtn.textContent = 'Line';
    } else if (mode === 'ZLEMA') {
        lineBtn.textContent = 'Zlema';
    } else {
        lineBtn.textContent = 'Cndl';
    }
}
