const sortStates = {}; // Store sort state for each column

function saveSortedTickers() {
    const table = document.getElementById("sortableTable");
    const tickers = Array.from(table.rows)
        .slice(1) // Exclude the header row
        .map(row => row.cells[0].innerText.trim()); // Get ticker values

    // Store sorted tickers in localStorage
    localStorage.setItem("sortedTickers", JSON.stringify(tickers));
    console.log(tickers);
}

function getSortedTickers() {
    return JSON.parse(localStorage.getItem("sortedTickers")) || [];
}

function parseSortableNumber(raw) {
  if (raw == null) return NaN;
  const cleaned = String(raw)
    .trim()
    .replace(/[%,$€\s]/g, "")
    .replace(/,/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function getComparableValue(cell) {
  // 1) 52-week bar: read inline width from the .current-price element if present
  const bar = cell.querySelector?.(".current-price");
  if (bar && bar.style && bar.style.width) {
    const n = parseFloat(bar.style.width);
    if (Number.isFinite(n)) return { type: "number", value: n };
  }

  // 2) Prefer a data-sort attribute if you set it during rendering
  if (cell.dataset && cell.dataset.sort != null) {
    const maybeNum = parseSortableNumber(cell.dataset.sort);
    if (Number.isFinite(maybeNum)) {
      return { type: "number", value: maybeNum };
    }
    return { type: "text", value: String(cell.dataset.sort).trim() };
  }

  // 3) Fallback to visible text
  const text = (cell.innerText || "").trim();
  const num = parseSortableNumber(text);
  if (Number.isFinite(num)) {
    return { type: "number", value: num };
  }
  return { type: "text", value: text };
}

function sortTable(columnIndex) {
  const table = document.getElementById("sortableTable");
  const headers = table.querySelectorAll("th");
  const rows = Array.from(table.rows).slice(1); // skip header
  const currentSortState = sortStates[columnIndex] || "asc";
  const newSortState = currentSortState === "asc" ? "desc" : "asc";
  sortStates[columnIndex] = newSortState;

  // Update header styles/icons
  headers.forEach((header, idx) => {
    const icon = header.querySelector(".sort-icon");
    header.classList.remove("sorted");
    if (icon) {
      icon.innerHTML = "";
      if (idx === columnIndex) {
        header.classList.add("sorted");
        icon.innerHTML = newSortState === "asc" ? "&#9650;" : "&#9660;";
      }
    }
  });

  const sortedRows = rows.sort((a, b) => {
    const aCell = a.cells[columnIndex];
    const bCell = b.cells[columnIndex];

    // Get comparable values with robust detection
    const av = getComparableValue(aCell);
    const bv = getComparableValue(bCell);

    let cmp = 0;

    if (av.type === "number" && bv.type === "number") {
      // Numbers: put missing/NaN to the bottom on ascending
      const aNum = Number.isFinite(av.value) ? av.value : Number.NEGATIVE_INFINITY;
      const bNum = Number.isFinite(bv.value) ? bv.value : Number.NEGATIVE_INFINITY;
      cmp = aNum - bNum;
    } else {
      // Text (or mixed): case-insensitive, natural order
      const aStr = String(av.value).toLowerCase();
      const bStr = String(bv.value).toLowerCase();
      cmp = aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: "base" });
    }

    return newSortState === "asc" ? cmp : -cmp;
  });

  table.tBodies[0].append(...sortedRows);
  saveSortedTickers();
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
      const alwaysKeys = ["ticker", "dayChange", "rsi_14", "weekRange"];
      const extraColumnsSet = new Set();
      listData.forEach(item => {
        Object.keys(item).forEach(key => {
          if (!alwaysKeys.includes(key)) {
            extraColumnsSet.add(key);
          }
        });
      });
      const extraColumns = Array.from(extraColumnsSet);

      const headerRow = document.getElementById("table-header");
      headerRow.innerHTML = ""; // Clear any existing header content
  
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

      // dynamic extra columns (2 .. 2 + extraColumns.length - 1)
      extraColumns.forEach((col, index) => {
        headerRow.appendChild(createHeaderCell(col, 2 + index));
      });

      // compute the next indices once
      const rsiColIndex = 2 + extraColumns.length;
      const week52ColIndex = rsiColIndex + 1;
      const tvColIndex = week52ColIndex + 1;

      // NEW: RSI (14) column BEFORE 52-Week
      headerRow.appendChild(createHeaderCell("RSI (14)", rsiColIndex));

      // existing 52-Week and TradingView columns
      headerRow.appendChild(createHeaderCell("52-Week", week52ColIndex));
      headerRow.appendChild(createHeaderCell("", tvColIndex)); // TradingView

      function getDayChangeClass(dayChangeStr) {
        const value = parseFloat(dayChangeStr);
        if (value > 2) return "light-green";
        else if (value >= 0 && value <= 2) return "green";
        else if (value < 0 && value >= -2) return "orange";
        else if (value < -2) return "red";
        else return "";
      }

      const tbody = document.getElementById("table-body");
      tbody.innerHTML = ""; // Clear existing rows

      listData.forEach(item => {
        console.log(item.ticker);
        
        const ticker = item.ticker;
        const info = infoMap[ticker] || {
            logoUrl: TRADING_VIEW_ICON_URL,
            tradingViewUrl: "#",
            companyName: "Info not available",
            industry: "N/A"
        };
        
        const detailUrl = "ticker_v2.html?ticker=" + ticker;
        const dayChangeClass = getDayChangeClass(item.dayChange);

        const tr = document.createElement("tr");

        const tdTicker = document.createElement("td");
        const tickerDiv = document.createElement("div");
        tickerDiv.className = "ticker-cell";
        
        const logoImg = document.createElement("img");
        logoImg.src = info.logoUrl;
        logoImg.className = "stock-logo";
        logoImg.title = `${info.companyName} - ${info.industry}`;

        const tickerLink = document.createElement("a");
        tickerLink.href = detailUrl;
        tickerLink.textContent = ticker;
        tickerDiv.appendChild(logoImg);
        tickerDiv.appendChild(tickerLink);
        tdTicker.appendChild(tickerDiv);
        tr.appendChild(tdTicker);

        const tdChange = document.createElement("td");
        tdChange.textContent = item.dayChange;
        tdChange.className = dayChangeClass;
        tr.appendChild(tdChange);

        extraColumns.forEach(col => {
          const tdExtra = document.createElement("td");
        
          if (col === "EMAs" && item[col]) {
            // Format EMAs column with specific colors
            const emsFormatted = item[col].split(" ").map(char => {
              const span = document.createElement("span");
              span.textContent = char;
              span.style.color = char === "O" ? "#DC484C" : char === "X" ? "#499782" : "black";
              span.style.marginRight = "0px"; // Add spacing between characters
              return span;
            });
        
            emsFormatted.forEach(span => tdExtra.appendChild(span));
          } 
          else if (col === "$ Prft") {
            // Parse numeric value and apply green/red logic
            let value = parseFloat(item[col]);
        
            if (!isNaN(value)) {
              const absValue = value; // Math.abs(value); // Remove the minus sign
              tdExtra.textContent = absValue; // Show absolute value
        
              tdExtra.style.color = value >= 0 ? "#499782" : "#DC484C"; // Green if >= 0, Red otherwise
            } else {
              tdExtra.textContent = item[col] !== undefined ? item[col] : "";
            }
          } 
          else if (col === "% Pfrt") {
            // Parse numeric value and apply color logic
            let value = parseFloat(item[col]);
        
            if (!isNaN(value)) {
              const absValue = value; // Remove the minus sign
              tdExtra.textContent = absValue; // Show absolute value
        
              if (value >= 10) {
                tdExtra.className = "light-green";
              } else if (value >= 0 && value < 10) {
                tdExtra.className = "green";
              } else if (value >= -5 && value < 0) {
                tdExtra.className = "orange";
              } else if (value < -5) {
                tdExtra.className = "red";
              }
            } else {
              tdExtra.textContent = item[col] !== undefined ? item[col] : "";
            }
          } 
          else {
            tdExtra.textContent = item[col] !== undefined ? item[col] : "";
          }
        
          tr.appendChild(tdExtra);
        });

        const tdRsi = document.createElement("td");
        const rsiVal = parseFloat(item.rsi_14);
        if (!isNaN(rsiVal)) {
          tdRsi.textContent = rsiVal.toFixed(1);  // display
          tdRsi.dataset.sort = rsiVal;            // <-- precise numeric sorting
          // (optional) add bands:
          if (rsiVal >= 70) tdRsi.className = "red";
          else if (rsiVal <= 30) tdRsi.className = "green";
        } else {
          tdRsi.textContent = item.rsi_14 ?? "";
        }
        tr.appendChild(tdRsi);
                        
        const tdRange = document.createElement("td");
        const rangeBar = document.createElement("div");
        rangeBar.className = "range-bar";
        const currentPrice = document.createElement("div");
        currentPrice.className = "current-price";
        currentPrice.style.width = item.weekRange + "%";
        rangeBar.appendChild(currentPrice);
        tdRange.appendChild(rangeBar);
        tr.appendChild(tdRange);

        const tdTV = document.createElement("td");
        const tvLink = document.createElement("a");
        tvLink.href = info.tradingViewUrl;
        tvLink.title = "TradingView";
        tvLink.target = "_blank";
        const tvIcon = document.createElement("img");
        tvIcon.src = TRADING_VIEW_ICON_URL;
        tvIcon.className = "stock-logo";
        tvLink.appendChild(tvIcon);
        tdTV.appendChild(tvLink);
        tr.appendChild(tdTV);

        tbody.appendChild(tr);
      });

      saveSortedTickers();
    }).catch(error => {
      console.error("Error loading JSON data:", error);
    });
}

// Run populateTickerTable when the page loads
//document.addEventListener("DOMContentLoaded", populateTickerTable);
