document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const ticker = params.get("ticker");

    if (!ticker) {
        window.location.href = "index.html"; // Redirect if no ticker is provided
        return;
    }

    try {
        // Fetch TickerInfo.json to get logo URL & TradingView link
        const response = await fetch("../../JSON/TickerInfo.json");
        const tickerInfo = await response.json();
        
        // Find the current ticker info
        const stockData = tickerInfo.find(item => item.ticker === ticker);

        if (!stockData) {
            console.error("Ticker not found in TickerInfo.json:", ticker);
            window.location.href = "index.html"; // Redirect if ticker not found
            return;
        }

        // Update page title and summary link
        document.title = `${ticker} - 1D`;
        document.getElementById("summary-link").href = `../../summaries/${ticker}.html`;
        
        // Update stock image and TradingView link
        document.getElementById("stock-image").src = stockData.logoUrl;
        document.getElementById("stock-image").alt = `${ticker} Logo`;

        // Load default chart
        loadChart(getCurrentChartDirectory() + `/${ticker}.json`);

        // Set chart links
        document.getElementById("chart-ema1w").onclick = () => loadChart(`../../charts/JSON/EMA1W/${ticker}.json`);
        document.getElementById("chart-ema1d").onclick = () => loadChart(`../../charts/JSON/EMA1D/${ticker}.json`);
        document.getElementById("chart-renko1d").onclick = () => loadChart(`../../charts/Renko1D/${ticker}.png`);
        document.getElementById("chart-renko1h").onclick = () => loadChart(`../../charts/Renko1h/${ticker}.png`);
        document.getElementById("chart-ema30m").onclick = () => loadChart(`../../charts/JSON/EMA30Min/${ticker}.json`);
        document.getElementById("chart-ema30m-eth").onclick = () => loadChart(`../../chartsl/JSON/EMA30MinETH/${ticker}.json`);

        // Get sorted tickers from localStorage
        const sortedTickers = JSON.parse(localStorage.getItem("sortedTickers")) || [];
        const index = sortedTickers.indexOf(ticker);

        // Set navigation links
        if (index > 0) {
            const prevTicker = sortedTickers[index - 1];
            document.getElementById("prev-ticker").href = `ticker.html?ticker=${prevTicker}`;
        } else {
            document.getElementById("prev-ticker").style.visibility = "hidden";
        }

        if (index < sortedTickers.length - 1) {
            const nextTicker = sortedTickers[index + 1];
            document.getElementById("next-ticker").href = `ticker.html?ticker=${nextTicker}`;
        } else {
            document.getElementById("next-ticker").style.visibility = "hidden";
        }

        // Initialize menu logic
        initializeMenuLogic();

        // Keyboard Navigation
        document.addEventListener("keydown", function (event) {
            switch (event.keyCode) {
                case 37: // Left Arrow
                    if (index > 0) window.location.href = `ticker.html?ticker=${sortedTickers[index - 1]}`;
                    break;
                case 39: // Right Arrow
                    if (index < sortedTickers.length - 1) window.location.href = `ticker.html?ticker=${sortedTickers[index + 1]}`;
                    break;
                case 48: // "0" key - Go to index
                    window.location.href = "index.html";
                    break;
                case 49: // "1" key - EMA 1W
                    loadChart(`../../charts/JSON/EMA1W/${ticker}.json`);
                    break;
                case 50: // "2" key - EMA 1D
                    loadChart(`../../charts/JSON/EMA1D/${ticker}.json`);
                    break;
                case 51: // "3" key - Renko 1D
                    loadChart(`../../charts/Renko1D/${ticker}.png`);
                    break;
                case 52: // "4" key - Renko 1h
                    loadChart(`../../charts/Renko1h/${ticker}.png`);
                    break;
                case 53: // "5" key - EMA 30m
                    loadChart(`../../charts/JSON/EMA30Min/${ticker}.json`);
                    break;
                case 54: // "6" key - EMA 30m ETH
                    loadChart(`../../chartsl/JSON/EMA30MinETH/${ticker}.json`);
                    break;
            }
        });

    } catch (error) {
        console.error("Error fetching ticker data:", error);
        window.location.href = "index.html"; // Redirect if error occurs
    }
});
