const sortStates = {}; // Store sort state for each column

function sortTable(columnIndex) {
    const table = document.getElementById("sortableTable");
    const headers = table.querySelectorAll("th");
    const rows = Array.from(table.rows).slice(1); // Exclude header row
    const isNumeric = columnIndex !== 0; // Only Ticker (column 0) is non-numeric
    const currentSortState = sortStates[columnIndex] || "asc"; // Default to ascending

    // Determine new sort state
    const newSortState = currentSortState === "asc" ? "desc" : "asc";
    sortStates[columnIndex] = newSortState;

    // Reset header styles
    headers.forEach((header, idx) => {
        const icon = header.querySelector(".sort-icon");
        header.classList.remove("sorted");
        if (icon) {
            icon.innerHTML = ""; // Clear any existing icon
            if (idx === columnIndex) {
                header.classList.add("sorted");
                icon.innerHTML = newSortState === "asc" ? "&#9650;" : "&#9660;"; // ▲ or ▼
            }
        }
    });

    // Sort rows
    const sortedRows = rows.sort((a, b) => {
        let aText = a.cells[columnIndex].innerText.replace('%', '');
        let bText = b.cells[columnIndex].innerText.replace('%', '');

        // Handle 52-week range column (parse width of the current price)
        if (columnIndex === 2) {
            const aBar = a.cells[columnIndex].querySelector(".current-price").style.width;
            const bBar = b.cells[columnIndex].querySelector(".current-price").style.width;
            aText = parseFloat(aBar);
            bText = parseFloat(bBar);
        }

        const comparison = isNumeric
            ? parseFloat(aText) - parseFloat(bText)
            : aText.localeCompare(bText);

        return newSortState === "asc" ? comparison : -comparison;
    });

    // Append sorted rows back to the table
    table.tBodies[0].append(...sortedRows);
}

function populateTickerTable() {
    // Constant TradingView icon URL used for every ticker.
    const TRADING_VIEW_ICON_URL = "https://cdn-1.webcatalog.io/catalog/tradingview/tradingview-icon-filled-256.webp?v=1714773033909";
  
    // Fetch both JSON files concurrently.
    Promise.all([
      fetch('../../JSON/TickerInfo.json').then(response => response.json()),
      fetch('TickerList.json').then(response => response.json())
    ]).then(([infoData, listData]) => {
      // Build a mapping for ticker info.
      const infoMap = {};
      infoData.forEach(item => {
        infoMap[item.ticker] = item;
      });
  
      // Define keys that are always present.
      const alwaysKeys = ["ticker", "dayChange", "weekRange"];
      // Gather any extra keys (e.g. RandomName1, RandomName2, etc.)
      const extraColumnsSet = new Set();
      listData.forEach(item => {
        Object.keys(item).forEach(key => {
          if (!alwaysKeys.includes(key)) {
            extraColumnsSet.add(key);
          }
        });
      });
      const extraColumns = Array.from(extraColumnsSet);
  
      // Build the table header dynamically.
      // The header order will be:
      // Ticker | % Day | (Extra Columns...) | 52-Week | (TradingView)
      const headerRow = document.getElementById("table-header");
      headerRow.innerHTML = ""; // Clear any existing header content
  
      // Helper to create header cell with optional sorting
      function createHeaderCell(title, sortIndex) {
        const th = document.createElement("th");
        if (title) {
          th.textContent = title + " ";
          th.onclick = function() { sortTable(sortIndex); };
        }
        const sortSpan = document.createElement("span");
        sortSpan.className = "sort-icon";
        th.appendChild(sortSpan);
        return th;
      }
  
      headerRow.appendChild(createHeaderCell("Ticker", 0));
      headerRow.appendChild(createHeaderCell("% Day", 1));
      extraColumns.forEach((col, index) => {
        headerRow.appendChild(createHeaderCell(col, 2 + index));
      });
      headerRow.appendChild(createHeaderCell("52-Week", 2 + extraColumns.length));
      headerRow.appendChild(createHeaderCell("", 3 + extraColumns.length)); // TradingView column
  
      // Helper function to compute the CSS class for dayChange.
      function getDayChangeClass(dayChangeStr) {
        const value = parseFloat(dayChangeStr);
        if (value > 2) return "light-green";
        else if (value > 0 && value <= 2) return "green";
        else if (value < 0 && value >= -2) return "orange";
        else if (value < -4) return "red";
        else return "";
      }
  
      const tbody = document.getElementById("table-body");
      tbody.innerHTML = ""; // Clear existing rows
  
      // Build table rows.
      listData.forEach(item => {
        const ticker = item.ticker;
        const info = infoMap[ticker];
        // Build detailUrl dynamically.
        const detailUrl = ticker + ".html";
        const dayChangeClass = getDayChangeClass(item.dayChange);
  
        const tr = document.createElement("tr");
  
        // --- Ticker Cell ---
        const tdTicker = document.createElement("td");
        const tickerDiv = document.createElement("div");
        tickerDiv.className = "ticker-cell";
        const logoImg = document.createElement("img");
        logoImg.src = info.logoUrl;
        logoImg.className = "stock-logo";
        const tickerLink = document.createElement("a");
        tickerLink.href = detailUrl;
        tickerLink.textContent = ticker;
        tickerDiv.appendChild(logoImg);
        tickerDiv.appendChild(tickerLink);
        tdTicker.appendChild(tickerDiv);
        tr.appendChild(tdTicker);
  
        // --- Day Change Cell ---
        const tdChange = document.createElement("td");
        tdChange.textContent = item.dayChange;
        tdChange.className = dayChangeClass;
        tr.appendChild(tdChange);
  
        // --- Extra Columns (if any) ---
        extraColumns.forEach(col => {
          const tdExtra = document.createElement("td");
          tdExtra.textContent = item[col] !== undefined ? item[col] : "";
          tr.appendChild(tdExtra);
        });
  
        // --- 52-Week Range Cell ---
        const tdRange = document.createElement("td");
        const rangeBar = document.createElement("div");
        rangeBar.className = "range-bar";
        const currentPrice = document.createElement("div");
        currentPrice.className = "current-price";
        currentPrice.style.width = item.weekRange + "%";
        rangeBar.appendChild(currentPrice);
        tdRange.appendChild(rangeBar);
        tr.appendChild(tdRange);
  
        // --- TradingView Cell ---
        const tdTV = document.createElement("td");
        const tvLink = document.createElement("a");
        tvLink.href = info.tradingViewUrl;
        tvLink.title = "TradingView";
        tvLink.target = "_blank";
        const tvIcon = document.createElement("img");
        // Use the constant TRADING_VIEW_ICON_URL instead of the value from JSON.
        tvIcon.src = TRADING_VIEW_ICON_URL;
        tvIcon.className = "stock-logo";
        tvLink.appendChild(tvIcon);
        tdTV.appendChild(tvLink);
        tr.appendChild(tdTV);
  
        tbody.appendChild(tr);
      });
    }).catch(error => {
      console.error("Error loading JSON data:", error);
    });
  }
  
  