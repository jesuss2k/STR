document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const ticker = params.get("ticker");

    if (!ticker) {
        window.location.href = "index.html";
        return;
    }

    try {
        const response = await fetch("../../JSON/TickerInfo.json");
        const tickerInfo = await response.json();
        const stockData = tickerInfo.find(item => item.ticker === ticker);

        if (!stockData) {
            console.error("Ticker not found in TickerInfo.json:", ticker);
            window.location.href = "index.html";
            return;
        }

        document.title = `${ticker} - 1D`;
        document.getElementById("summary-link").href = `../../summaries/${ticker}.html`;
        document.getElementById("stock-image").src = stockData.logoUrl;
        document.getElementById("stock-image").alt = `${ticker} Logo`;

        loadChart(getCurrentChartDirectory() + `/${ticker}.json`);

        document.getElementById("chart-ema1w").onclick = () => loadChart(`../../charts/JSON/EMA1W/${ticker}.json`);
        document.getElementById("chart-ema1d").onclick = () => loadChart(`../../charts/JSON/EMA1D/${ticker}.json`);
        document.getElementById("chart-renko1d").onclick = () => loadChart(`../../charts/Renko1D/${ticker}.png`);
        document.getElementById("chart-renko1h").onclick = () => loadChart(`../../charts/Renko1h/${ticker}.png`);
        document.getElementById("chart-ema30m").onclick = () => loadChart(`../../charts/JSON/EMA30Min/${ticker}.json`);
        document.getElementById("chart-ema30m-eth").onclick = () => loadChart(`../../chartsl/JSON/EMA30MinETH/${ticker}.json`);

        const sortedTickers = JSON.parse(localStorage.getItem("sortedTickers")) || [];
        const index = sortedTickers.indexOf(ticker);

        if (index > 0) {
            document.getElementById("prev-ticker").href = `ticker.html?ticker=${sortedTickers[index - 1]}`;
        } else {
            document.getElementById("prev-ticker").style.visibility = "hidden";
        }

        if (index < sortedTickers.length - 1) {
            document.getElementById("next-ticker").href = `ticker.html?ticker=${sortedTickers[index + 1]}`;
        } else {
            document.getElementById("next-ticker").style.visibility = "hidden";
        }

        initializeMenuLogic();

        let currentSelection = 49; 

        document.addEventListener("keydown", function (event) {
            switch (event.key) {
                case "ArrowLeft": case "a": case "A":
                    if (index > 0) window.location.href = `ticker.html?ticker=${sortedTickers[index - 1]}`;
                    break;
                case "ArrowRight": case "d": case "D":
                    if (index < sortedTickers.length - 1) window.location.href = `ticker.html?ticker=${sortedTickers[index + 1]}`;
                    break;
                case "0":
                    window.location.href = "index.html";
                    break;
                case "ArrowUp": case "w": case "W":
                    currentSelection = currentSelection > 49 ? currentSelection - 1 : 54;
                    loadChart(getChartPath(currentSelection, ticker));
                    break;
                case "ArrowDown": case "s": case "S":
                    currentSelection = currentSelection < 54 ? currentSelection + 1 : 49;
                    loadChart(getChartPath(currentSelection, ticker));
                    break;
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                    currentSelection = event.key.charCodeAt(0);
                    loadChart(getChartPath(currentSelection, ticker));
                    break;
            }
        });

        function getChartPath(selection, ticker) {
            const chartPaths = {
                49: `../../charts/JSON/EMA1W/${ticker}.json`,
                50: `../../charts/JSON/EMA1D/${ticker}.json`,
                51: `../../charts/Renko1D/${ticker}.png`,
                52: `../../charts/Renko1h/${ticker}.png`,
                53: `../../charts/JSON/EMA30Min/${ticker}.json`,
                54: `../../chartsl/JSON/EMA30MinETH/${ticker}.json`
            };
            return chartPaths[selection];
        }
    } catch (error) {
        console.error("Error fetching ticker data:", error);
        window.location.href = "index.html";
    }
});
