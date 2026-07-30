document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const ticker = params.get("ticker");

    console.log("DOMContentLoaded ticker_v2.js");

    if (!ticker) {
        console.error("Error: No ticker parameter in URL.");
        return;
    }

    function normalizeChartType_v2(chartType) {
        switch (chartType) {
            case 'Rk 1h':
                return 'Rk 1H';
            case 'Rk 30m':
                return 'Rk 30M';
            default:
                return chartType || '2H';
        }
    }

    function normalizeTicker_v2(ticker) {
        if (!ticker) return '';

        let t = String(ticker).trim().toUpperCase();

        // Remove any emoji prefix (e.g. Spanish flag) and extra whitespace.
        // This prevents values like "🇪🇸 ABC" from blocking navigation.
        t = t.replace(/^[\p{Emoji}\s]+/u, '');

        // Keep only ticker-relevant chars (letters, digits, ., _, -).
        t = t.replace(/[^A-Z0-9._-]/g, '');

        return t;
    }

    function findTickerIndex_v2(sortedTickers, targetTicker) {
        const normalizedTarget = normalizeTicker_v2(targetTicker);
        if (!normalizedTarget) return -1;

        const normalizedList = sortedTickers.map(normalizeTicker_v2);
        let idx = normalizedList.indexOf(normalizedTarget);
        if (idx !== -1) return idx;

        const variantSuffixes = ['.MC', '_MC'];

        const tryVariant = suffix => {
            if (normalizedTarget.endsWith(suffix)) {
                const withoutSuffix = normalizedTarget.slice(0, -suffix.length);
                idx = normalizedList.indexOf(withoutSuffix);
                if (idx !== -1) return idx;
            } else {
                const withSuffix = `${normalizedTarget}${suffix}`;
                idx = normalizedList.indexOf(withSuffix);
                if (idx !== -1) return idx;
            }
            return -1;
        };

        for (const suffix of variantSuffixes) {
            const found = tryVariant(suffix);
            if (found !== -1) return found;
        }

        // Last attempt: compare base ticker without any suffix
        const baseTarget = normalizedTarget.replace(/(\.MC|_MC)$/, '');
        idx = normalizedList.findIndex(val => val.replace(/(\.MC|_MC)$/, '') === baseTarget);
        return idx;
    }

    const chartOrder = [
        '1W',       // 1
        '1D',       // 2
        '2H',       // 3
        '30M',      // 4
        'Rk 1D',    // 5
        'Rk 1D50',  // 6 -> ½D
        'Rk 1D25',  // 7 -> ¼D
        'Rk 2H',    // 8
        'Rk 1H',    // 9
        'Rk 30M'    // 0
    ];

    const autoNavigationPairs = {
        '1W': 'Rk 1D50',
        '1D': 'Rk 1D25',
        '2H': 'Rk 1H',
        '30M': 'Rk 30M'
    };
    const autoNavigationReversePairs = Object.fromEntries(
        Object.entries(autoNavigationPairs).map(([baseChart, renkoChart]) => [renkoChart, baseChart])
    );
    const autoNavigationKeys = {
        enabled: 'autoNavigationEnabled_v2',
        seconds: 'autoNavigationSeconds_v2',
        baseChart: 'autoNavigationBaseChart_v2',
        startedAt: 'autoNavigationLastStartedAt_v2'
    };
    let autoNavigationTimerId = null;
    let autoNavigationProgressId = null;
    let autoNavigationTickers = [];
    let autoNavigationElements = {};

    function getCurrentChartIndex_v2() {
        const selectedChart = normalizeChartType_v2(localStorage.getItem('selectedChart'));
        const idx = chartOrder.indexOf(selectedChart);
        return idx >= 0 ? idx : 2; // default = 2H
    }

    function loadChartByIndex_v2(indexToLoad) {
        const chartType = chartOrder[indexToLoad];
        if (!chartType) return;
        loadChart_v2(chartType, '', ticker);
    }

    function getAutoNavigationSeconds_v2() {
        const savedSeconds = parseInt(localStorage.getItem(autoNavigationKeys.seconds), 10);
        return Number.isFinite(savedSeconds) ? Math.max(3, savedSeconds) : 15;
    }

    function setAutoNavigationSeconds_v2(seconds) {
        const normalizedSeconds = Math.max(3, parseInt(seconds, 10) || 15);
        localStorage.setItem(autoNavigationKeys.seconds, String(normalizedSeconds));
        if (autoNavigationElements.secondsInput) {
            autoNavigationElements.secondsInput.value = String(normalizedSeconds);
        }
        resetAutoNavigationTimer_v2();
    }

    function isAutoNavigationEnabled_v2() {
        return localStorage.getItem(autoNavigationKeys.enabled) === 'true';
    }

    function inferAutoNavigationBaseChart_v2(chartType) {
        const selectedChart = normalizeChartType_v2(chartType);
        if (autoNavigationPairs[selectedChart]) return selectedChart;
        if (autoNavigationReversePairs[selectedChart]) return autoNavigationReversePairs[selectedChart];
        return '1W';
    }

    function getAutoNavigationBaseChart_v2() {
        const savedBaseChart = localStorage.getItem(autoNavigationKeys.baseChart);
        return autoNavigationPairs[savedBaseChart] ? savedBaseChart : '1W';
    }

    function setAutoNavigationBaseChart_v2(baseChart) {
        const normalizedBaseChart = autoNavigationPairs[baseChart] ? baseChart : '1W';
        localStorage.setItem(autoNavigationKeys.baseChart, normalizedBaseChart);
        return normalizedBaseChart;
    }

    function updateAutoNavigationUi_v2() {
        const enabled = isAutoNavigationEnabled_v2();

        if (autoNavigationElements.enabledInput) {
            autoNavigationElements.enabledInput.checked = enabled;
        }

        if (autoNavigationElements.progress) {
            autoNavigationElements.progress.style.display = enabled ? 'block' : 'none';
        }

        if (!enabled && autoNavigationElements.progressFill) {
            autoNavigationElements.progressFill.style.width = '0%';
        }
    }

    async function getAutoNavigationTickers_v2() {
        if (autoNavigationTickers.length) return autoNavigationTickers;

        const savedTickers = JSON.parse(localStorage.getItem("sortedTickers") || "[]");
        if (savedTickers.length) {
            autoNavigationTickers = savedTickers;
            return autoNavigationTickers;
        }

        try {
            const response = await fetch('TickerList.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const tickerList = await response.json();
            autoNavigationTickers = tickerList
                .map(item => item && item.ticker)
                .filter(Boolean);
            localStorage.setItem("sortedTickers", JSON.stringify(autoNavigationTickers));
        } catch (error) {
            console.error("Auto Navigation: unable to load TickerList.json fallback.", error);
            autoNavigationTickers = [];
        }

        return autoNavigationTickers;
    }

    async function navigateToNextAutoTicker_v2() {
        const tickers = await getAutoNavigationTickers_v2();
        if (!tickers.length) return;

        const currentIndex = findTickerIndex_v2(tickers, ticker);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % tickers.length;
        const nextTicker = tickers[nextIndex];
        const baseChart = getAutoNavigationBaseChart_v2();

        localStorage.setItem('selectedChart', baseChart);
        localStorage.setItem(autoNavigationKeys.startedAt, String(Date.now()));
        window.location.href = `ticker_v2.html?ticker=${encodeURIComponent(nextTicker)}`;
    }

    function updateAutoNavigationProgress_v2() {
        if (!isAutoNavigationEnabled_v2() || !autoNavigationElements.progressFill) return;

        const startedAt = parseInt(localStorage.getItem(autoNavigationKeys.startedAt), 10) || Date.now();
        const durationMs = getAutoNavigationSeconds_v2() * 1000;
        const elapsedMs = Date.now() - startedAt;
        const percent = Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));
        autoNavigationElements.progressFill.style.width = `${percent}%`;
    }

    function clearAutoNavigationTimers_v2() {
        if (autoNavigationTimerId) {
            clearTimeout(autoNavigationTimerId);
            autoNavigationTimerId = null;
        }

        if (autoNavigationProgressId) {
            clearInterval(autoNavigationProgressId);
            autoNavigationProgressId = null;
        }
    }

    function scheduleAutoNavigation_v2() {
        clearAutoNavigationTimers_v2();
        updateAutoNavigationUi_v2();

        if (!isAutoNavigationEnabled_v2()) return;

        const selectedChart = normalizeChartType_v2(localStorage.getItem('selectedChart'));
        if (!autoNavigationPairs[selectedChart] && !autoNavigationReversePairs[selectedChart]) {
            setAutoNavigationBaseChart_v2('1W');
            loadChart_v2('1W', '', ticker);
        }

        localStorage.setItem(autoNavigationKeys.startedAt, String(Date.now()));
        updateAutoNavigationProgress_v2();
        autoNavigationProgressId = setInterval(updateAutoNavigationProgress_v2, 100);

        autoNavigationTimerId = setTimeout(async () => {
            const selectedChart = normalizeChartType_v2(localStorage.getItem('selectedChart'));
            let baseChart = getAutoNavigationBaseChart_v2();
            if (autoNavigationPairs[selectedChart]) {
                baseChart = selectedChart;
            } else if (autoNavigationReversePairs[selectedChart]) {
                baseChart = autoNavigationReversePairs[selectedChart];
            }
            const renkoChart = autoNavigationPairs[baseChart];
            setAutoNavigationBaseChart_v2(baseChart);

            if (selectedChart === renkoChart) {
                await navigateToNextAutoTicker_v2();
                return;
            }

            loadChart_v2(renkoChart, '', ticker);
            scheduleAutoNavigation_v2();
        }, getAutoNavigationSeconds_v2() * 1000);
    }

    function resetAutoNavigationTimer_v2() {
        if (!isAutoNavigationEnabled_v2()) return;
        scheduleAutoNavigation_v2();
    }

    function setAutoNavigationEnabled_v2(enabled) {
        localStorage.setItem(autoNavigationKeys.enabled, enabled ? 'true' : 'false');

        if (!enabled) {
            clearAutoNavigationTimers_v2();
            localStorage.removeItem(autoNavigationKeys.startedAt);
            updateAutoNavigationUi_v2();
            return;
        }

        const selectedChart = normalizeChartType_v2(localStorage.getItem('selectedChart'));
        const baseChart = setAutoNavigationBaseChart_v2(inferAutoNavigationBaseChart_v2(selectedChart));

        if (!autoNavigationPairs[selectedChart] && !autoNavigationReversePairs[selectedChart]) {
            loadChart_v2(baseChart, '', ticker);
        }

        scheduleAutoNavigation_v2();
    }

    function buildAutoNavigationOptions_v2() {
        const menuOptionsMain = document.getElementById('menu-options-main');
        const menuWrapper = document.getElementById('menu-wrapper');
        const menuCaption = document.getElementById('menu-caption');
        if (!menuOptionsMain || !menuWrapper) return;

        const optionsToggle = document.createElement('a');
        optionsToggle.href = '#';
        optionsToggle.id = 'chart-options-toggle';
        optionsToggle.textContent = String.fromCharCode(9881);
        optionsToggle.title = 'Options';
        optionsToggle.setAttribute('aria-label', 'Options');
        menuOptionsMain.insertBefore(optionsToggle, menuOptionsMain.firstChild);

        const optionsPanel = document.createElement('div');
        optionsPanel.id = 'chart-options-panel';
        optionsPanel.className = 'chart-options-panel';
        optionsPanel.innerHTML = `
            <label class="chart-option-row">
                <input type="checkbox" id="auto-navigation-enabled">
                <span>Auto Navigation</span>
            </label>
            <label class="chart-option-row">
                <span>Seconds</span>
                <input type="number" id="auto-navigation-seconds" min="3" step="1">
            </label>
            <label class="chart-option-row">
                <span>Overlay</span>
                <select id="overlay-mode">
                    <option value="PNL">PnL</option>
                    <option value="EMAS">EMAs</option>
                </select>
            </label>
        `;
        menuWrapper.appendChild(optionsPanel);

        const progress = document.createElement('div');
        progress.id = 'auto-navigation-progress';
        progress.innerHTML = '<div id="auto-navigation-progress-fill"></div>';
        document.body.appendChild(progress);

        autoNavigationElements = {
            optionsToggle,
            optionsPanel,
            enabledInput: document.getElementById('auto-navigation-enabled'),
            secondsInput: document.getElementById('auto-navigation-seconds'),
            overlayInput: document.getElementById('overlay-mode'),
            progress,
            progressFill: document.getElementById('auto-navigation-progress-fill')
        };

        autoNavigationElements.secondsInput.value = String(getAutoNavigationSeconds_v2());
        autoNavigationElements.overlayInput.value = localStorage.getItem('overlayMode_v2') || 'PNL';

        optionsToggle.addEventListener('click', (event) => {
            event.preventDefault();
            const isOpen = optionsPanel.style.display === 'flex';
            optionsPanel.style.display = isOpen ? 'none' : 'flex';
        });

        if (menuCaption) {
            menuCaption.addEventListener('click', () => {
                setTimeout(() => {
                    if (menuOptionsMain.style.display === 'none') {
                        optionsPanel.style.display = 'none';
                    }
                }, 0);
            });
        }

        autoNavigationElements.enabledInput.addEventListener('change', (event) => {
            setAutoNavigationEnabled_v2(event.target.checked);
        });

        autoNavigationElements.secondsInput.addEventListener('change', (event) => {
            setAutoNavigationSeconds_v2(event.target.value);
        });

        autoNavigationElements.overlayInput.addEventListener('change', (event) => {
            localStorage.setItem('overlayMode_v2', event.target.value);
            if (window.updateOverlay_v2) {
                window.updateOverlay_v2(ticker);
            }
        });

        updateAutoNavigationUi_v2();
    }

    window.autoNavigationResetTimer_v2 = resetAutoNavigationTimer_v2;

    try {
        const response = await fetch("../../JSON/TickerInfo.json");
        const tickerInfo = await response.json();
        const stockData = tickerInfo.find(item => item.ticker === ticker);

        if (!stockData) {
            console.error("Ticker not found in TickerInfo.json:", ticker);
            return;
        }

        document.title = `${ticker} - 1D`;

        const summaryLinkTop = document.getElementById("summary-link");
        if (summaryLinkTop) {
            summaryLinkTop.href = "index.html";
        }

        const stockImage = document.getElementById("stock-image");
        if (stockImage) {
            stockImage.src = stockData.logoUrl;
            stockImage.alt = `${ticker} Logo`;
        }

        const lastSelectedChart = normalizeChartType_v2(localStorage.getItem('selectedChart'));
        console.log(`LastSelectedChart=${lastSelectedChart}`);

        if (!lastSelectedChart) {
            loadChart_v2('2H', '2H', ticker);
        } else {
            loadChart_v2(lastSelectedChart, lastSelectedChart, ticker);
        }

        const chartSummary = document.getElementById("chart-summary");
        if (chartSummary) {
            chartSummary.href = `../../summaries/${ticker}.html`;
        }

        let sortedTickers = JSON.parse(localStorage.getItem("sortedTickers")) || [];
        if (!sortedTickers.length) {
            sortedTickers = await getAutoNavigationTickers_v2();
        }
        let index = findTickerIndex_v2(sortedTickers, ticker);

        const prevTickerEl = document.getElementById("prev-ticker");
        const nextTickerEl = document.getElementById("next-ticker");

        const updatePrevNext = () => {
            if (!prevTickerEl || !nextTickerEl) return;

            index = findTickerIndex_v2(sortedTickers, ticker); // always stay in sync

            if (index > 0) {
                prevTickerEl.href = `ticker_v2.html?ticker=${encodeURIComponent(sortedTickers[index - 1])}`;
                prevTickerEl.style.visibility = "visible";
            } else {
                prevTickerEl.removeAttribute("href");
                prevTickerEl.style.visibility = "hidden";
            }

            if (index >= 0 && index < sortedTickers.length - 1) {
                nextTickerEl.href = `ticker_v2.html?ticker=${encodeURIComponent(sortedTickers[index + 1])}`;
                nextTickerEl.style.visibility = "visible";
            } else {
                nextTickerEl.removeAttribute("href");
                nextTickerEl.style.visibility = "hidden";
            }
        };

        updatePrevNext();

        if (prevTickerEl) {
            prevTickerEl.addEventListener('click', (e) => {
                e.preventDefault();
                resetAutoNavigationTimer_v2();
                if (index > 0) {
                    const target = sortedTickers[index - 1];
                    window.location.href = `ticker_v2.html?ticker=${encodeURIComponent(target)}`;
                }
            });
        }

        if (nextTickerEl) {
            nextTickerEl.addEventListener('click', (e) => {
                e.preventDefault();
                resetAutoNavigationTimer_v2();
                if (index >= 0 && index < sortedTickers.length - 1) {
                    const target = sortedTickers[index + 1];
                    window.location.href = `ticker_v2.html?ticker=${encodeURIComponent(target)}`;
                }
            });
        }

        buildAutoNavigationOptions_v2();
        scheduleAutoNavigation_v2();

        document.addEventListener('click', (event) => {
            const clickedManualChartControl = event.target.closest(
                '#menu-options-main a, #menu-options-renko a, #prev-ticker, #next-ticker'
            );
            if (clickedManualChartControl && clickedManualChartControl.id !== 'chart-options-toggle') {
                resetAutoNavigationTimer_v2();
            }
        });

        document.addEventListener("keydown", function (event) {
            const tag = document.activeElement?.tagName;
            const isEditable = document.activeElement?.isContentEditable;
            if (isEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                return;
            }

            const currentIndex = findTickerIndex_v2(sortedTickers, ticker);
            if (currentIndex === -1) return;

            switch (event.key) {
                // Ticker navigation
                case "ArrowLeft":
                case "a":
                case "A":
                    if (currentIndex > 0) {
                        const newTicker = sortedTickers[currentIndex - 1];
                        console.log(`🔄 Navigating to: ${newTicker}`);
                        resetAutoNavigationTimer_v2();
                        window.location.href = `ticker_v2.html?ticker=${encodeURIComponent(newTicker)}`;
                    }
                    break;

                case "ArrowRight":
                case "d":
                case "D":
                    if (currentIndex < sortedTickers.length - 1) {
                        const newTicker = sortedTickers[currentIndex + 1];
                        console.log(`🔄 Navigating to: ${newTicker}`);
                        resetAutoNavigationTimer_v2();
                        window.location.href = `ticker_v2.html?ticker=${encodeURIComponent(newTicker)}`;
                    }
                    break;

                // Direct chart shortcuts
                case "1":
                    loadChart_v2('1W', '', ticker);
                    resetAutoNavigationTimer_v2();
                    break;
                case "2":
                    loadChart_v2('1D', '', ticker);
                    resetAutoNavigationTimer_v2();
                    break;
                case "3":
                    loadChart_v2('2H', '', ticker);
                    resetAutoNavigationTimer_v2();
                    break;
                case "4":
                    loadChart_v2('30M', '', ticker);
                    resetAutoNavigationTimer_v2();
                    break;
                case "q":
                case "Q":
                    loadChart_v2('Rk 1D', '', ticker);
                    resetAutoNavigationTimer_v2();
                    break;
                case "w":
                case "W":
                    loadChart_v2('Rk 1D50', '', ticker); // ½D
                    resetAutoNavigationTimer_v2();
                    break;
                case "e":
                case "E":
                    loadChart_v2('Rk 1D25', '', ticker); // ¼D
                    resetAutoNavigationTimer_v2();
                    break;
                case "r":
                case "R":
                    loadChart_v2('Rk 2H', '', ticker);
                    resetAutoNavigationTimer_v2();
                    break;
                case "t":
                case "T":
                    loadChart_v2('Rk 1H', '', ticker);
                    resetAutoNavigationTimer_v2();
                    break;
                case "y":
                case "Y":
                    loadChart_v2('Rk 30M', '', ticker);
                    resetAutoNavigationTimer_v2();
                    break;

                // Circular backward
                case ",":
                case "<":
                case "z":
                case "Z": {
                    const currentIndex = getCurrentChartIndex_v2();
                    const prevIndex = (currentIndex - 1 + chartOrder.length) % chartOrder.length;
                    loadChartByIndex_v2(prevIndex);
                    resetAutoNavigationTimer_v2();
                    break;
                }

                // Circular forward
                case ".":
                case ">":
                case "x":
                case "X": {
                    const currentIndex = getCurrentChartIndex_v2();
                    const nextIndex = (currentIndex + 1) % chartOrder.length;
                    loadChartByIndex_v2(nextIndex);
                    resetAutoNavigationTimer_v2();
                    break;
                }
            }
        });

    } catch (error) {
        console.error("Error fetching ticker data:", error);
    }
});
