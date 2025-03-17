document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const ticker = params.get("ticker");

    if (!ticker) {
        console.error("Error: No ticker parameter in URL.");
        return;
    }

    try {
        const response = await fetch("../../JSON/TickerInfo.json");
        const tickerInfo = await response.json();
        const stockData = tickerInfo.find(item => item.ticker === ticker);

        if (!stockData) {
            console.error("Ticker not found in TickerInfo.json:", ticker);
            return;
        }

        document.title = `${ticker} - 1D`;
        document.getElementById("summary-link").href = `index.html`;
        document.getElementById("stock-image").src = stockData.logoUrl;
        document.getElementById("stock-image").alt = `${ticker} Logo`;

        // ✅ Check if "2H" was last selected and reload it
        const lastSelectedChart = localStorage.getItem('selectedChart');
        console.log(`LastSelectedChart=${lastSelectedChart}`)

        if (lastSelectedChart === null) {
            loadChart_v2('2H', '2H', ticker)
        } else {
            loadChart_v2(lastSelectedChart, lastSelectedChart, ticker)
        }

        document.getElementById("chart-summary").href = `../../summaries/${ticker}.html`;
        document.getElementById("chart-ema1w").onclick = () => loadChart_v2('1W', '1W', ticker);
        document.getElementById("chart-ema1d").onclick = () => loadChart_v2('1D', '1D', ticker);
        document.getElementById("chart-ema2h").onclick = ()  => loadChart_v2('2H', '2H', ticker);
        document.getElementById("chart-ema30m").onclick = ()  => loadChart_v2('30M', '30M', ticker);
        document.getElementById("chart-renko1d").onclick = () => loadChart_v2('Rk 1D', `../../charts/Renko1D/${ticker}.png`, ticker);
        document.getElementById("chart-renko1h").onclick = () => loadChart_v2('Rk 1h', `../../charts/Renko1h/${ticker}.png`, ticker);
 
        const sortedTickers = JSON.parse(localStorage.getItem("sortedTickers")) || [];
        const index = sortedTickers.indexOf(ticker);

        if (index > 0) {
            document.getElementById("prev-ticker").href = `ticker_v2.html?ticker=${sortedTickers[index - 1]}`;
        } else {
            document.getElementById("prev-ticker").style.visibility = "hidden";
        }

        if (index < sortedTickers.length - 1) {
            document.getElementById("next-ticker").href = `ticker_v2.html?ticker=${sortedTickers[index + 1]}`;
        } else {
            document.getElementById("next-ticker").style.visibility = "hidden";
        }

        initializeMenuLogic_v2();

        // ✅ Restore Original Keyboard Navigation (LEFT/RIGHT for tickers, UP/DOWN for charts)
        let currentSelection = 49; // Default selection

        document.addEventListener("keydown", function (event) {
            switch (event.key) {
                case "ArrowLeft": case "a": case "A":
                    if (index > 0) {
                        const newTicker = sortedTickers[index - 1];
                        console.log(`🔄 Navigating to: ${newTicker}`);

                        // ✅ Preserve "2H" selection when navigating
                        const selectedChart = localStorage.getItem('selectedChart');
                        if (selectedChart === '2H') {
                            window.location.href = `ticker_v2.html?ticker=${newTicker}&chart=2H`;
                        } else {
                            window.location.href = `ticker_v2.html?ticker=${newTicker}`;
                        }
                    }
                    break;
                case "ArrowRight": case "d": case "D":
                    if (index < sortedTickers.length - 1) {
                        const newTicker = sortedTickers[index + 1];
                        console.log(`🔄 Navigating to: ${newTicker}`);

                        const selectedChart = localStorage.getItem('selectedChart');
                        if (selectedChart === '2H') {
                            window.location.href = `ticker_v2.html?ticker=${newTicker}&chart=2H`;
                        } else {
                            window.location.href = `ticker_v2.html?ticker=${newTicker}`;
                        }
                    }
                    break;
                case "0":
                    window.location.href = "index.html";
                    break;
                case "ArrowUp": case "w": case "W":
                    currentSelection = currentSelection > 49 ? currentSelection - 1 : 54;
                    loadChart_v2(getChartPath_v2(currentSelection, ticker), ticker);
                    break;
                case "ArrowDown": case "s": case "S":
                    currentSelection = currentSelection < 54 ? currentSelection + 1 : 49;
                    loadChart_v2(getChartPath_v2(currentSelection, ticker), ticker);
                    break;
                case "1":
                    loadChart_v2('1W', '1W', ticker);
                    break;
                case "2":
                    loadChart_v2('1D', '1D', ticker);
                    break;
                case "3":
                    loadChart_v2('2H', '2H', ticker);
                    break;
                case "4":
                    loadChart_v2('30M', '30M', ticker);
                    break;
                case "5":
                    loadChart_v2('Rk 1D', `../../charts/Renko1D/${ticker}.png`, ticker);
                    break;
                case "6":
                    loadChart_v2('Rk 1h', `../../charts/Renko1h/${ticker}.png`, ticker);
                    break;
            }
        });

        function getChartPath_v2(selection, ticker) {
            const chartPaths = {
                49: `../../charts/JSON/EMA1W/${ticker}.json`,
                50: `../../charts/JSON/EMA1D/${ticker}.json`,
                51: `../../charts/Renko1D/${ticker}.png`,
                52: `../../charts/Renko1h/${ticker}.png`,
                53: `../../charts/JSON/EMA30Min/${ticker}.json`,
                54: `../../charts/JSON/2H/${ticker}.json` // ✅ Now includes "2H"
            };
            return chartPaths[selection];
        }

    } catch (error) {
        console.error("Error fetching ticker data:", error);
    }
});


// Ensure "2H" option correctly loads the chart
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("chart-ema2h").onclick = () => {
        const params = new URLSearchParams(window.location.search);
        const ticker = params.get("ticker");

        if (!ticker) {
            console.error("Error: No ticker found in URL.");
            return;
        }

        loadTradingViewChart_v2(ticker);
    };
});
