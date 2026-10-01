let mainChart_v2 = null;
let histogramChart_v2 = null;
let resizeTimer_v2 = null;
const priceSeriesByChart_v2 = new WeakMap();
const DEFAULT_CHART_TYPE_v2 = '1W';
const CHART_ORDER_v2 = Object.freeze([
    '1W', '1D', '2H', '30M',
    'Rk 1D', 'Rk 1D50', 'Rk 1D25', 'Rk 2H', 'Rk 2H50', 'Rk 30M'
]);

function normalizeChartType_v2(chartType) {
    // Preserve names saved by older versions before validating the selection.
    if (chartType === 'Rk 1h' || chartType === 'Rk 1H') chartType = 'Rk 2H50';
    if (chartType === 'Rk 30m') chartType = 'Rk 30M';
    return CHART_ORDER_v2.includes(chartType) ? chartType : DEFAULT_CHART_TYPE_v2;
}

const RENKO_CHART_CONFIGS_v2 = Object.freeze({
    'Rk 1D': { dataFolder: '1D_OHLC', defaultFactor: 0.5, factorKey: 'dailyRenkoAtrFactor_v2' },
    'Rk 1D50': { dataFolder: '1D_OHLC', defaultFactor: 0.5, factorKey: 'renkoAtrFactor_1D50_v2', lookbackYears: 3 },
    'Rk 1D25': { dataFolder: '1D_OHLC', defaultFactor: 0.25, factorKey: 'renkoAtrFactor_1D25_v2', lookbackYears: 1 },
    'Rk 2H': { dataFolder: '2H', defaultFactor: 1, factorKey: 'renkoAtrFactor_2H_v3' },
    'Rk 2H50': { dataFolder: '2H', defaultFactor: 0.5, factorKey: 'renkoAtrFactor_2H50_v2' },
    'Rk 30M': { dataFolder: '30M', defaultFactor: 1, factorKey: 'renkoAtrFactor_30M_v3' }
});
const RENKO_FIRST_TIME_v2 = 946684800;
const RENKO_SECONDS_PER_BRICK_v2 = 86400;
const RENKO_AXIS_DATE_FORMAT_v2 = new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', timeZone: 'UTC'
});
const RENKO_CROSSHAIR_DATE_FORMAT_v2 = new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
});
const RENKO_INTRADAY_CROSSHAIR_FORMAT_v2 = new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC'
});
let renkoLoadId_v2 = 0;
let renkoBrickTimestamps_v2 = [];

function isCalculatedRenkoChart_v2(chartType) {
    return Object.prototype.hasOwnProperty.call(RENKO_CHART_CONFIGS_v2, chartType);
}

function getRenkoSourceDate_v2(time) {
    const brickIndex = Math.round((Number(time) - RENKO_FIRST_TIME_v2) / RENKO_SECONDS_PER_BRICK_v2);
    const sourceTimestamp = renkoBrickTimestamps_v2[brickIndex];
    if (!sourceTimestamp) return null;
    const isoTimestamp = sourceTimestamp.length > 10
        ? `${sourceTimestamp.replace(' ', 'T')}Z`
        : `${sourceTimestamp}T00:00:00Z`;
    return { sourceTimestamp, date: new Date(isoTimestamp) };
}

function formatRenkoAxisDate_v2(time) {
    const source = getRenkoSourceDate_v2(time);
    return source ? RENKO_AXIS_DATE_FORMAT_v2.format(source.date) : '';
}

function formatRenkoCrosshairDate_v2(time) {
    const source = getRenkoSourceDate_v2(time);
    if (!source) return '';
    const formatter = source.sourceTimestamp.length > 10
        ? RENKO_INTRADAY_CROSSHAIR_FORMAT_v2
        : RENKO_CROSSHAIR_DATE_FORMAT_v2;
    return formatter.format(source.date);
}

// Function to load an image into the plotly-div container
function loadImage_v2(imagePath) {
    console.log('Reached loadImage_v2 with path:', imagePath);

    const container = document.getElementById('plotly-div');
    const histogramContainer = document.getElementById('plotly-histogram');

    clearContainers(container, histogramContainer);
    adjustViewportHeight_v2();

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
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const vh = viewportHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    const plotlyDiv = document.getElementById('plotly-div');
    const histogramDiv = document.getElementById('plotly-histogram');
    const showHistogram = isHistogramVisible_v2() && !isCalculatedRenkoChart_v2(getSelectedChart_v2());

    if (plotlyDiv) {
        plotlyDiv.style.height = `calc(${showHistogram ? 84 : 100} * var(--vh))`;
    }

    if (histogramDiv) {
        histogramDiv.style.display = showHistogram ? 'block' : 'none';
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
    if (mainChart_v2) {
        mainChart_v2.remove();
        mainChart_v2 = null;
    }
    if (histogramChart_v2) {
        histogramChart_v2.remove();
        histogramChart_v2 = null;
    }
    container.classList.remove('daily-renko-active');
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
    return normalizeChartType_v2(localStorage.getItem('selectedChart'));
}

function getChartLabel_v2(chartType) {
    switch (normalizeChartType_v2(chartType)) {
        case '1W': return '1W';
        case '1D': return '1D';
        case '2H': return '2h';
        case '30M': return '30m';
        case 'Rk 1D': return '1D';
        case 'Rk 1D50': return '½D';
        case 'Rk 1D25': return '¼D';
        case 'Rk 2H': return '2h';
        case 'Rk 2H50': return '½2h';
        case 'Rk 30M': return '30m';
        default: return DEFAULT_CHART_TYPE_v2;
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
        'Rk 2H50': 'chart-rk-1h',
        'Rk 30M': 'chart-rk-30m'
    };

    const id = chartMap[normalizeChartType_v2(selectedChart)];
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
    const halfTwoHourRenko = document.getElementById('chart-rk-1h');
    if (halfTwoHourRenko) halfTwoHourRenko.textContent = '½2h';
    bind('chart-rk-1h', 'Rk 2H50');
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
        height: histogramContainer.clientHeight || Math.round(window.innerHeight * 0.16),
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

function addPriceSeries_v2(chart, type, options) {
    const series = type === 'Candlestick'
        ? chart.addCandlestickSeries(options)
        : chart.addLineSeries(options);
    if (!priceSeriesByChart_v2.has(chart)) {
        priceSeriesByChart_v2.set(chart, []);
    }
    priceSeriesByChart_v2.get(chart).push(series);
    return series;
}

function prepareCandleData(rawData) {
    return rawData.map(entry => ({
        time: Math.floor(new Date(entry.Timestamp).getTime() / 1000),
        open: entry.Open,
        high: entry.High,
        low: entry.Low,
        close: entry.Close
    }));
}

function prepareHeikinAshiData(rawData) {
    let previousOpen = null;
    let previousClose = null;

    return rawData.map(entry => {
        const close = (entry.Open + entry.High + entry.Low + entry.Close) / 4;
        const open = previousOpen === null
            ? (entry.Open + entry.Close) / 2
            : (previousOpen + previousClose) / 2;
        const candle = {
            time: Math.floor(new Date(entry.Timestamp).getTime() / 1000),
            open,
            high: Math.max(entry.High, open, close),
            low: Math.min(entry.Low, open, close),
            close
        };

        previousOpen = open;
        previousClose = close;
        return candle;
    });
}

function prepareLineData(rawData) {
    return rawData.map(entry => ({
        time: Math.floor(new Date(entry.Timestamp).getTime() / 1000),
        value: entry.Close
    }));
}

function plotLine(chart, lineData) {
    const lineSeries = addPriceSeries_v2(chart, 'Line', {
        color: "blue",
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true
    });

    lineSeries.setData(lineData);
    return lineSeries;
}

function plotCloseLine(chart, lineData) {
    const lineSeries = addPriceSeries_v2(chart, 'Line', {
        color: "dodgerblue",
        lineWidth: 2,
        pointMarkersVisible: true,
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
    const candleSeries = addPriceSeries_v2(chart, 'Candlestick', {
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
            addPriceSeries_v2(chart, 'Line', {
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

            addPriceSeries_v2(chart, 'Line', {
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
            addPriceSeries_v2(chart, 'Line', {
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

async function loadRenkoReferenceLevels_v2(ticker) {
    const loadRows = async (path) => {
        try {
            const rows = await fetchJSONData(path);
            return Array.isArray(rows) ? rows.filter(row => row.ticker === ticker) : [];
        } catch (error) {
            console.error(`Unable to load Renko reference levels from ${path}:`, error);
            return [];
        }
    };

    const [orders, submittedOrders, guruFocus] = await Promise.all([
        loadRows('../../JSON/LatestOrders.json'),
        loadRows('../../JSON/OrdersSubmitted.json'),
        loadRows('../../JSON/GuruFocus.json')
    ]);
    return { orders, submittedOrders, guruFocus };
}

function plotRenkoReferenceLevels_v2(series, levels) {
    const addPriceLine = (price, color, lineWidth, lineStyle) => {
        if (!Number.isFinite(price)) return;
        series.createPriceLine({
            price,
            color,
            lineWidth,
            lineStyle,
            axisLabelVisible: false,
            title: ''
        });
    };

    levels.orders.forEach(order => {
        const color = order.positionStatus === 'Closed' ? '#FFD700' : '#1E90FF';
        addPriceLine(order.price, color, 1, LightweightCharts.LineStyle.Dotted);
    });

    levels.submittedOrders.forEach(order => {
        const lineStyle = order.buySell === 'Sell'
            ? LightweightCharts.LineStyle.Dashed
            : LightweightCharts.LineStyle.Dotted;
        addPriceLine(order.price, '#f48fb1', 2, lineStyle);
    });

    levels.guruFocus.forEach(value => {
        addPriceLine(value.GFValue, 'rgba(245, 245, 220, 0.3)', 10, LightweightCharts.LineStyle.Solid);
    });
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

        const emaSeries = addPriceSeries_v2(chart, 'Line', {
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

    const zlemaSeries = addPriceSeries_v2(chart, 'Line', {
        color: '#ff0000',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        lastValueVisible: false,
        priceLineVisible: true
    });
    zlemaSeries.setData(zlemaData);

    const yellowSeries = addPriceSeries_v2(chart, 'Line', {
        color: '#ffff00',
        lineWidth: 1,
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

        const emaSeries = addPriceSeries_v2(chart, 'Line', {
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

        const emaSeries = addPriceSeries_v2(chart, 'Line', {
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

        const emaSeries = addPriceSeries_v2(chart, 'Line', {
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

function isFitToScreenEnabled_v2() {
    return localStorage.getItem('fitToScreenEnabled_v2') !== 'false';
}

function isVerticalFitEnabled_v2() {
    return localStorage.getItem('verticalFitEnabled_v2') !== 'false';
}

function isHistogramVisible_v2() {
    return localStorage.getItem('histogramVisible_v2') !== 'false';
}

function setHistogramVisible_v2(visible) {
    localStorage.setItem('histogramVisible_v2', String(visible));
    const checkbox = document.getElementById('histogram-visible');
    if (checkbox) checkbox.checked = visible;
    resizeActiveCharts_v2();
}

async function fitInitialPriceRange_v2(chart, candleData) {
    const visibleRange = chart.timeScale().getVisibleRange();
    const logicalRange = chart.timeScale().getVisibleLogicalRange();
    const series = priceSeriesByChart_v2.get(chart) || [];
    if (!visibleRange || series.length === 0) return;

    let minValue = Infinity;
    let maxValue = -Infinity;
    for (const candle of candleData) {
        if (candle.time < visibleRange.from || candle.time > visibleRange.to) continue;
        if (!Number.isFinite(candle.low) || !Number.isFinite(candle.high)) continue;
        minValue = Math.min(minValue, candle.low);
        maxValue = Math.max(maxValue, candle.high);
    }
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return;

    // A flat price has no range to stretch; give it a small, finite scale.
    if (minValue === maxValue) {
        const padding = Math.max(Math.abs(minValue) * 0.001, 0.01);
        minValue -= padding;
        maxValue += padding;
    }

    const priceScale = chart.priceScale('right');
    const originalProviders = series.map(item => item.options().autoscaleInfoProvider);
    let fitting = true;
    try {
        // Use the same candle-only bounds for every price series temporarily,
        // so EMAs and reference lines cannot expand the opening range.
        series.forEach((item, index) => item.applyOptions({
            autoscaleInfoProvider: original => fitting
                ? { priceRange: { minValue, maxValue } }
                : originalProviders[index] ? originalProviders[index](original) : original()
        }));
        priceScale.applyOptions({
            autoScale: true,
            scaleMargins: { top: 0.1, bottom: 0.1 }
        });
        await new Promise(resolve => requestAnimationFrame(resolve));
        // Different price labels can change the axis width. Keep the opening
        // horizontal view while the new vertical scale settles.
        if (logicalRange) {
            chart.timeScale().setVisibleLogicalRange(logicalRange);
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
        // Materialize the calculated scale before freezing it for free manual
        // zoom/pan. There is no public price-range setter in library v4.1.
        series[0].priceToCoordinate(minValue);
        priceScale.applyOptions({ autoScale: false });
    } finally {
        // Resume normal providers without applying series options again:
        // v4.1 would schedule another autoscale even with autoScale disabled.
        fitting = false;
    }
}

function resizeActiveCharts_v2() {
    const container = document.getElementById('plotly-div');
    const histogramContainer = document.getElementById('plotly-histogram');

    if (!container || !histogramContainer) return;

    adjustViewportHeight_v2();

    const selectedChart = getSelectedChart_v2();

    if (isCalculatedRenkoChart_v2(selectedChart)) {
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'stretch';
        container.style.justifyContent = 'flex-start';
        const chartHost = container.querySelector('#daily-renko-chart');
        if (mainChart_v2 && chartHost) {
            mainChart_v2.applyOptions({
                width: chartHost.clientWidth,
                height: chartHost.clientHeight
            });
        }
        return;
    }

    // Image-based Renko modes remain centered until their data feeds are migrated.
    if (selectedChart.startsWith('Rk ')) {
        container.style.display = 'flex';
        container.style.flexDirection = 'row';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        return;
    }

    // Normal charts
    container.style.display = 'block';
    container.style.flexDirection = '';
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
            // Keep its time scale sized while hidden, so showing the pane
            // again does not require reloading data or resetting the view.
            width: histogramContainer.clientWidth || container.clientWidth,
            height: histogramContainer.clientHeight || Math.round(window.innerHeight * 0.16)
        });
    }
}

window.addEventListener('orientationchange', () => {
    clearTimeout(resizeTimer_v2);
    resizeTimer_v2 = setTimeout(resizeActiveCharts_v2, 250);
});

const scheduleActiveChartResize_v2 = () => {
    clearTimeout(resizeTimer_v2);
    resizeTimer_v2 = setTimeout(resizeActiveCharts_v2, 120);
};

window.addEventListener('resize', scheduleActiveChartResize_v2);
window.visualViewport?.addEventListener('resize', scheduleActiveChartResize_v2);

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
    adjustViewportHeight_v2();

    container.style.display = 'block';
    container.style.alignItems = '';
    container.style.justifyContent = '';

    if (!isLibraryLoaded()) return;

    const chart = createMainChart(container);
    const histogramChart = createHistogramChart(
        histogramContainer, histogramContainer.clientWidth || container.clientWidth
    );

    mainChart_v2 = chart;
    histogramChart_v2 = histogramChart;

    const verticalFit = isVerticalFitEnabled_v2();
    const chartElements = [container.firstElementChild, histogramContainer.firstElementChild];
    if (verticalFit) {
        // Keep layout and canvas rendering active without showing intermediate
        // scales. Retain these specific elements so an older load cannot reveal
        // a newer chart if the user switches views while data is loading.
        chartElements.forEach(element => { element.style.visibility = 'hidden'; });
    }

    try {
        let jsonPath;
        const selectedChart = getSelectedChart_v2();

        if (selectedChart === '1W') {
            jsonPath = `../../charts/JSON/1W/${ticker}.json`;
        } else if (selectedChart === '1D') {
            jsonPath = `../../charts/JSON/1D/${ticker}.json`;
        } else if (selectedChart === '30M') {
            jsonPath = `../../charts/JSON/30M/${ticker}.json`;
        } else if (selectedChart === '2H') {
            jsonPath = `../../charts/JSON/2H/${ticker}.json`;
        } else {
            jsonPath = `../../charts/JSON/${DEFAULT_CHART_TYPE_v2}/${ticker}.json`;
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
        let displayCandleData = candleData;
        if (renderMode === 'LINE') {
            const lineData = prepareLineData(rawData);
            plotCloseLine(chart, lineData);
            console.log(`✅ Rendered LINE for ${ticker}`);
        } else {
            if (renderMode === 'HEIKIN_ASHI') {
                displayCandleData = prepareHeikinAshiData(rawData);
            }
            plotCandlesticks(chart, displayCandleData);
            console.log(`✅ Rendered ${renderMode === 'HEIKIN_ASHI' ? 'HEIKIN ASHI' : 'CANDLES'} for ${ticker}`);
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
            await plotGuruFocus(chart, candleData, ticker);
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
            await plotOrders(chart, candleData, ticker);
            await plotSubmittedOrders(chart, candleData, ticker);
            await plotGuruFocus(chart, candleData, ticker);
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

        resizeActiveCharts_v2();

        // Fit once after loading all series and sizing both panes. Manual zoom and
        // pan remain available; resizing does not reapply this initial view.
        if (isFitToScreenEnabled_v2() && rawData.length > 0) {
            for (const pane of [chart, histogramChart]) {
                const timeScale = pane.timeScale();
                // Allow dense histories to fit even on narrow screens.
                timeScale.applyOptions({
                    minBarSpacing: Math.min(0.5, timeScale.width() / (rawData.length + 1))
                });
                timeScale.fitContent();
            }
        }

        syncCharts(chart, histogramChart);

        if (verticalFit) {
            // fitContent and canvas sizing settle during rendering. Wait for that
            // opening view, and ignore a chart superseded by navigation or Renko.
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            if (chart !== mainChart_v2 || getSelectedChart_v2().startsWith('Rk ')) return;
            await fitInitialPriceRange_v2(chart, displayCandleData);
        }
    } finally {
        if (verticalFit) {
            // Reveal both panes together after the final fitted frame is drawn.
            await new Promise(resolve => requestAnimationFrame(resolve));
            chartElements.forEach(element => { element.style.visibility = ''; });
        }
    }
}

function calculateRenkoAtr_v2(rows, period) {
    if (rows.length < period) return null;

    const trueRanges = rows.map((row, index) => {
        if (index === 0) return row.High - row.Low;
        const previousClose = rows[index - 1].Close;
        return Math.max(
            row.High - row.Low,
            Math.abs(row.High - previousClose),
            Math.abs(row.Low - previousClose)
        );
    });

    let atr = trueRanges.slice(0, period).reduce((sum, range) => sum + range, 0) / period;
    for (let index = period; index < trueRanges.length; index += 1) {
        atr = ((atr * (period - 1)) + trueRanges[index]) / period;
    }
    return atr;
}

function buildRenkoBricks_v2(rows, boxSize) {
    let close = rows[0].Close;
    let direction = 0;
    const bricks = [];
    const brickTimestamps = [];

    for (const row of rows.slice(1)) {
        let addedBrick = true;
        while (addedBrick) {
            addedBrick = false;
            let open;
            let nextClose;

            if (direction === 0) {
                if (row.Close >= close + boxSize) {
                    open = close;
                    nextClose = close + boxSize;
                    direction = 1;
                } else if (row.Close <= close - boxSize) {
                    open = close;
                    nextClose = close - boxSize;
                    direction = -1;
                }
            } else if (direction > 0 && row.Close >= close + boxSize) {
                open = close;
                nextClose = close + boxSize;
            } else if (direction > 0 && row.Close <= close - (2 * boxSize)) {
                open = close - boxSize;
                nextClose = close - (2 * boxSize);
                direction = -1;
            } else if (direction < 0 && row.Close <= close - boxSize) {
                open = close;
                nextClose = close - boxSize;
            } else if (direction < 0 && row.Close >= close + (2 * boxSize)) {
                open = close + boxSize;
                nextClose = close + (2 * boxSize);
                direction = 1;
            }

            if (nextClose !== undefined) {
                close = nextClose;
                const time = RENKO_FIRST_TIME_v2 + (bricks.length * RENKO_SECONDS_PER_BRICK_v2);
                bricks.push({
                    time,
                    open: Number(open.toFixed(2)),
                    high: Number(Math.max(open, close).toFixed(2)),
                    low: Number(Math.min(open, close).toFixed(2)),
                    close: Number(close.toFixed(2))
                });
                brickTimestamps.push(row.Timestamp);
                addedBrick = true;
            }
        }
    }
    return { bricks, brickTimestamps };
}

function buildRenkoEma_v2(bricks, period) {
    if (bricks.length < period) return [];

    const alpha = 2 / (period + 1);
    let ema = bricks.slice(0, period).reduce((sum, brick) => sum + brick.close, 0) / period;
    const values = [{ time: bricks[period - 1].time, value: ema }];
    for (let index = period; index < bricks.length; index += 1) {
        ema = (bricks[index].close * alpha) + (ema * (1 - alpha));
        values.push({ time: bricks[index].time, value: ema });
    }
    return values;
}

function buildRenkoTrendline_v2(bricks, direction, swingStrength = 2) {
    if (bricks.length < (swingStrength * 2) + 2) return null;

    const pivotValues = [];
    const field = direction === 'up' ? 'low' : 'high';
    for (let index = swingStrength; index < bricks.length - swingStrength; index += 1) {
        const value = bricks[index][field];
        const left = bricks.slice(index - swingStrength, index).map(brick => brick[field]);
        const right = bricks.slice(index + 1, index + swingStrength + 1).map(brick => brick[field]);
        const isPivot = direction === 'up'
            ? left.every(item => item >= value) && right.every(item => item >= value) &&
                left.some(item => item > value) && right.some(item => item > value)
            : left.every(item => item <= value) && right.every(item => item <= value) &&
                left.some(item => item < value) && right.some(item => item < value);

        if (isPivot) pivotValues.push({ index, value });
    }

    const candidates = pivotValues.slice(-30);
    const tolerance = Math.abs(bricks[0].high - bricks[0].low) * 0.1;
    for (let second = candidates.length - 1; second > 0; second -= 1) {
        for (let first = second - 1; first >= 0; first -= 1) {
            const start = candidates[first];
            const end = candidates[second];
            const slope = (end.value - start.value) / (end.index - start.index);
            if ((direction === 'up' && slope <= 0) || (direction === 'down' && slope >= 0)) continue;

            let unbroken = true;
            for (let index = start.index + 1; index < bricks.length; index += 1) {
                const lineValue = start.value + slope * (index - start.index);
                const brickValue = bricks[index][field];
                if ((direction === 'up' && brickValue < lineValue - tolerance) ||
                    (direction === 'down' && brickValue > lineValue + tolerance)) {
                    unbroken = false;
                    break;
                }
            }
            if (!unbroken) continue;

            const lastIndex = bricks.length - 1;
            return {
                direction,
                data: [
                    { time: bricks[start.index].time, value: start.value },
                    {
                        time: bricks[lastIndex].time,
                        value: start.value + slope * (lastIndex - start.index)
                    }
                ]
            };
        }
    }
    return null;
}

function isValidRenkoOhlcRow_v2(row) {
    if (!row || !Number.isFinite(row.High) || !Number.isFinite(row.Low) || !Number.isFinite(row.Close) ||
        typeof row.Timestamp !== 'string') return false;
    const isoTimestamp = row.Timestamp.length > 10
        ? `${row.Timestamp.replace(' ', 'T')}Z`
        : `${row.Timestamp}T00:00:00Z`;
    return Number.isFinite(Date.parse(isoTimestamp));
}

async function loadAtrRenkoChart_v2(ticker, chartType) {
    if (!validateTicker(ticker)) return;

    const config = RENKO_CHART_CONFIGS_v2[chartType];
    if (!config) return;

    const loadId = ++renkoLoadId_v2;
    const container = document.getElementById('plotly-div');
    const histogramContainer = document.getElementById('plotly-histogram');
    clearContainers(container, histogramContainer);
    adjustViewportHeight_v2();

    container.classList.add('daily-renko-active');
    const toolbar = document.createElement('div');
    toolbar.id = 'daily-renko-toolbar';
    toolbar.innerHTML = `
        <div id="daily-renko-factor-control">
            <input id="daily-renko-factor" type="range" min="0.10" max="1.00" step="0.05" aria-label="Daily Renko ATR factor">
            <output id="daily-renko-factor-value" for="daily-renko-factor" hidden></output>
        </div>
        <span id="daily-renko-status" role="status" aria-live="polite"></span>
    `;
    const chartHost = document.createElement('div');
    chartHost.id = 'daily-renko-chart';
    container.append(toolbar, chartHost);

    const factorInput = toolbar.querySelector('#daily-renko-factor');
    const factorOutput = toolbar.querySelector('#daily-renko-factor-value');
    const status = toolbar.querySelector('#daily-renko-status');
    const savedFactor = Number(localStorage.getItem(config.factorKey));
    factorInput.value = Number.isFinite(savedFactor) && savedFactor >= 0.1 && savedFactor <= 1
        ? String(savedFactor)
        : String(config.defaultFactor);

    if (!isLibraryLoaded()) {
        status.textContent = 'Chart library unavailable.';
        return;
    }

    const chart = LightweightCharts.createChart(chartHost, {
        width: chartHost.clientWidth,
        height: chartHost.clientHeight,
        layout: {
            background: { type: 'solid', color: 'black' },
            textColor: '#aab2b8',
            fontFamily: 'IBM Plex Mono, Consolas, monospace',
            fontSize: 11
        },
        grid: {
            vertLines: { color: 'rgba(120, 130, 140, 0.10)' },
            horzLines: { color: 'rgba(120, 130, 140, 0.16)' }
        },
        rightPriceScale: {
            borderVisible: false,
            scaleMargins: { top: 0.02, bottom: 0.12 }
        },
        timeScale: {
            borderColor: '#333333',
            timeVisible: false,
            tickMarkFormatter: (time) => formatRenkoAxisDate_v2(time)
        },
        crosshair: {
            vertLine: { color: '#77877d', labelBackgroundColor: '#303a35' },
            horzLine: { color: '#77877d', labelBackgroundColor: '#303a35' }
        },
        localization: {
            priceFormatter: (price) => price < 100 ? price.toFixed(1) : price.toFixed(0),
            timeFormatter: (time) => formatRenkoCrosshairDate_v2(time)
        }
    });
    mainChart_v2 = chart;

    const renkoSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: 'price', precision: 1, minMove: 0.1 }
    });
    const ema12Series = chart.addLineSeries({
        color: '#d8e479',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'price', precision: 1, minMove: 0.1 }
    });
    const ema25Series = chart.addLineSeries({
        color: '#f2a65a',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'price', precision: 1, minMove: 0.1 }
    });
    const trendlineSeries = chart.addLineSeries({
        color: '#26a69a',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'price', precision: 1, minMove: 0.1 }
    });
    let lastClosePriceLine = null;
    let sourceRows = [];
    let atr = null;
    let factorHideTimer = null;

    const hideFactorValue = () => {
        clearTimeout(factorHideTimer);
        factorHideTimer = setTimeout(() => {
            factorOutput.hidden = true;
        }, 650);
    };

    const showFactorValue = () => {
        factorOutput.hidden = false;
        clearTimeout(factorHideTimer);
    };

    const render = () => {
        const factor = Number(factorInput.value);
        const boxSize = atr * factor;
        const result = buildRenkoBricks_v2(sourceRows, boxSize);
        const allBricks = result.bricks;
        renkoBrickTimestamps_v2 = result.brickTimestamps;
        let firstVisibleIndex = 0;
        if (config.lookbackYears && allBricks.length) {
            const lastDate = new Date(`${sourceRows[sourceRows.length - 1].Timestamp.slice(0, 10)}T00:00:00Z`);
            lastDate.setUTCFullYear(lastDate.getUTCFullYear() - config.lookbackYears);
            const cutoffDate = lastDate.toISOString().slice(0, 10);
            const cutoffIndex = result.brickTimestamps.findIndex(timestamp => timestamp.slice(0, 10) >= cutoffDate);
            firstVisibleIndex = cutoffIndex < 0 ? allBricks.length : cutoffIndex;
        }
        const bricks = allBricks.slice(firstVisibleIndex);
        const firstVisibleTime = bricks[0]?.time;
        renkoSeries.setData(bricks);
        ema12Series.setData(firstVisibleTime === undefined
            ? []
            : buildRenkoEma_v2(allBricks, 12).filter(point => point.time >= firstVisibleTime));
        ema25Series.setData(firstVisibleTime === undefined
            ? []
            : buildRenkoEma_v2(allBricks, 25).filter(point => point.time >= firstVisibleTime));
        const uptrend = buildRenkoTrendline_v2(bricks, 'up');
        const downtrend = buildRenkoTrendline_v2(bricks, 'down');
        const activeTrendline = !uptrend ? downtrend
            : !downtrend ? uptrend
                : uptrend.data[0].time >= downtrend.data[0].time ? uptrend : downtrend;
        trendlineSeries.applyOptions({ color: activeTrendline?.direction === 'down' ? '#ef5350' : '#26a69a' });
        trendlineSeries.setData(activeTrendline?.data || []);
        if (lastClosePriceLine) renkoSeries.removePriceLine(lastClosePriceLine);
        lastClosePriceLine = bricks.length ? renkoSeries.createPriceLine({
            price: bricks[bricks.length - 1].close,
            color: '#e7ece8',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            axisLabelVisible: false
        }) : null;
        factorOutput.value = `${factor.toFixed(2)}x`;
        factorOutput.textContent = factorOutput.value;
        localStorage.setItem(config.factorKey, String(factor));
        chart.timeScale().fitContent();
        resizeActiveCharts_v2();
    };

    factorInput.addEventListener('input', () => {
        render();
        showFactorValue();
        hideFactorValue();
    });
    factorInput.addEventListener('pointerdown', showFactorValue);
    factorInput.addEventListener('pointerup', hideFactorValue);
    factorInput.addEventListener('pointercancel', hideFactorValue);
    factorInput.addEventListener('keydown', showFactorValue);
    factorInput.addEventListener('keyup', hideFactorValue);
    factorInput.addEventListener('blur', hideFactorValue);
    try {
        status.textContent = 'Loading Renko data...';
        const rows = await fetchJSONData(`../../charts/JSON/${config.dataFolder}/${encodeURIComponent(ticker)}.json`);
        if (loadId !== renkoLoadId_v2 || getSelectedChart_v2() !== chartType) return;
        if (!Array.isArray(rows) || rows.length < 14 || rows.some(row => !isValidRenkoOhlcRow_v2(row))) {
            throw new Error(`Invalid ${config.dataFolder} OHLC data`);
        }
        sourceRows = rows;
        atr = calculateRenkoAtr_v2(sourceRows, 14);
        if (atr === null) throw new Error('Not enough data for ATR(14)');
        status.textContent = '';
        render();
        const referenceLevels = await loadRenkoReferenceLevels_v2(ticker);
        if (loadId !== renkoLoadId_v2 || getSelectedChart_v2() !== chartType || mainChart_v2 !== chart) return;
        plotRenkoReferenceLevels_v2(renkoSeries, referenceLevels);
    } catch (error) {
        if (loadId === renkoLoadId_v2 && getSelectedChart_v2() === chartType) {
            status.textContent = `Renko data unavailable for ${ticker}.`;
            console.error('Unable to load Renko data:', error);
        }
    }
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

    chartType = normalizeChartType_v2(chartType);
    localStorage.setItem('selectedChart', chartType);

    if (isCalculatedRenkoChart_v2(chartType)) {
        loadAtrRenkoChart_v2(ticker, chartType);
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
        'Rk 1D': '1D',
        'Rk 2H': '1D',
        'Rk 1D50': '1W',
        'Rk 1D25': '1D',
        'Rk 2H50': '2H',
        'Rk 30M': '30M'
    };
    return chartMap[normalizeChartType_v2(selectedChart)] || DEFAULT_CHART_TYPE_v2;
}

function getPnlJsonPath_v2(ticker) {
    const selectedChart = getSelectedChart_v2();
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

    const summaryLink = document.getElementById("chart-summary");
    if (summaryLink) {
        let displayTicker = ticker;
        if (ticker.endsWith('_MC')) {
            displayTicker = '\uD83C\uDDEA\uD83C\uDDF8' + ' ' + ticker.replace('_MC', '');
        }
        summaryLink.textContent = displayTicker;
        summaryLink.href = `../../summaries/${ticker}.html`;
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

// ---------- Render mode (CANDLES -> LINE -> ZLEMA -> HEIKIN_ASHI -> CANDLES) ----------
function getRenderMode_v2() {
    return localStorage.getItem('chartRenderMode_v2') || 'CANDLES';
}

function setRenderMode_v2(mode) {
    const normalized = mode === 'LINE' ? 'LINE'
        : mode === 'ZLEMA' ? 'ZLEMA'
        : mode === 'HEIKIN_ASHI' ? 'HEIKIN_ASHI'
        : 'CANDLES';
    localStorage.setItem('chartRenderMode_v2', normalized);
}

function toggleRenderMode_v2() {
    const modes = ['CANDLES', 'LINE', 'ZLEMA', 'HEIKIN_ASHI'];
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
    } else if (mode === 'HEIKIN_ASHI') {
        lineBtn.textContent = 'H-Ashi';
    } else {
        lineBtn.textContent = 'Cndl';
    }
}
