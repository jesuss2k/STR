const sortStates = {}; // Store sort state for each column

function saveSortedTickers() {
    const table = document.getElementById("sortableTable");
    const tickers = Array.from(table.rows)
        .slice(1) // Exclude the header row
        .map(row => {
            // Prefer explicit data-ticker attribute to avoid emoji/display decorations.
            const rawTicker = row.dataset.ticker;
            if (rawTicker) return rawTicker.trim();

            // Fallback: parse ticker from first cell's link query parameter.
            const anchor = row.querySelector("td:nth-child(1) a");
            if (anchor) {
                try {
                    const url = new URL(anchor.href, window.location.origin);
                    const q = url.searchParams.get("ticker");
                    if (q) return q.trim();
                } catch (e) {
                    // ignore parse error and fallback to visible text
                }
            }

            return row.cells[0].innerText.trim();
        });

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
  if (cell.dataset?.sortMissing === "true") {
    return { type: "missing" };
  }

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

function initializeTableFilters() {
  const table = document.getElementById("sortableTable");
  if (!table || !table.tBodies[0]) return;

  const existingPanel = document.getElementById("table-filter-panel");
  if (existingPanel) existingPanel.remove();

  const rows = Array.from(table.tBodies[0].rows);
  const columns = Array.from(table.tHead.rows[0].cells)
    .map((header, index) => ({ index, title: header.textContent.trim() }))
    .filter(column => column.title && column.title !== "Chart")
    .map(column => {
      const values = rows.map(row => getComparableValue(row.cells[column.index]));
      const numericHint = /^(%|\$)/.test(column.title) ||
        column.title === "RSI (14)" || column.title === "52-Week";
      const populatedValues = values.filter(value =>
        value.type !== "missing" && String(value.value ?? "").trim() !== "" && value.value !== "—"
      );
      const numeric = numericHint || (
        populatedValues.length > 0 && populatedValues.every(value => value.type === "number")
      );
      const choices = Array.from(new Set(rows
        .map(row => (row.cells[column.index].innerText || "").trim())
        .filter(value => value && value !== "—")))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

      return {
        ...column,
        type: numeric ? "number" : choices.length <= 20 ? "choice" : "text",
        choices
      };
    });

  if (!columns.length) return;

  const filters = new Map();
  const panel = document.createElement("section");
  panel.id = "table-filter-panel";
  panel.setAttribute("aria-label", "Table filters");

  const disclosure = document.createElement("details");
  disclosure.className = "table-filter-disclosure";
  const summary = document.createElement("summary");
  summary.setAttribute("aria-label", "Toggle table filters");
  summary.title = "Filters";
  const filterIcon = document.createElement("span");
  filterIcon.className = "table-filter-icon";
  filterIcon.setAttribute("aria-hidden", "true");
  const hiddenLabel = document.createElement("span");
  hiddenLabel.className = "table-filter-visually-hidden";
  hiddenLabel.textContent = "Filters";
  const activeFilterCount = document.createElement("span");
  activeFilterCount.className = "table-filter-active-count";
  activeFilterCount.hidden = true;
  summary.append(filterIcon, hiddenLabel, activeFilterCount);
  disclosure.appendChild(summary);

  const popover = document.createElement("div");
  popover.className = "table-filter-popover";

  const form = document.createElement("form");
  form.className = "table-filter-controls";

  function createField(labelText, control) {
    const label = document.createElement("label");
    label.className = "table-filter-field";
    const caption = document.createElement("span");
    caption.textContent = labelText;
    label.append(caption, control);
    return label;
  }

  const columnSelect = document.createElement("select");
  columnSelect.setAttribute("aria-label", "Filter column");
  const operatorSelect = document.createElement("select");
  operatorSelect.setAttribute("aria-label", "Filter operator");
  let valueInput = document.createElement("input");
  valueInput.setAttribute("aria-label", "Filter value");
  const upperInput = document.createElement("input");
  upperInput.setAttribute("aria-label", "Filter maximum value");
  upperInput.type = "number";
  upperInput.step = "any";
  upperInput.required = true;
  const upperField = createField("Maximum", upperInput);
  upperField.hidden = true;

  const addButton = document.createElement("button");
  addButton.type = "submit";
  addButton.textContent = "Add filter";

  const chips = document.createElement("div");
  chips.className = "table-filter-chips";
  chips.setAttribute("aria-label", "Active filters");

  const activeFilters = document.createElement("div");
  activeFilters.className = "table-filter-active";

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "table-filter-clear";
  clearButton.textContent = "Clear all";
  clearButton.hidden = true;
  activeFilters.append(chips, clearButton);

  const columnField = createField("Column", columnSelect);
  const operatorField = createField("Condition", operatorSelect);
  const valueField = createField("Value", valueInput);
  form.append(columnField, operatorField, valueField, upperField, addButton);
  popover.append(activeFilters, form);
  disclosure.appendChild(popover);
  panel.appendChild(disclosure);
  table.parentElement.insertBefore(panel, table);

  function refreshColumnOptions() {
    const previousIndex = columnSelect.value;
    columnSelect.replaceChildren();
    columns.filter(column => !filters.has(column.index)).forEach(column => {
      const option = document.createElement("option");
      option.value = String(column.index);
      option.textContent = column.title;
      columnSelect.appendChild(option);
    });

    if (Array.from(columnSelect.options).some(option => option.value === previousIndex)) {
      columnSelect.value = previousIndex;
    }
    addButton.disabled = columnSelect.options.length === 0;
    updateFilterInputs();
  }

  function updateFilterInputs() {
    const column = columns.find(candidate => candidate.index === Number(columnSelect.value));
    operatorSelect.replaceChildren();
    upperField.hidden = true;
    upperInput.value = "";

    if (!column) return;

    valueInput = document.createElement(column.type === "choice" ? "select" : "input");
    valueInput.setAttribute("aria-label", "Filter value");
    valueInput.required = true;

    const operators = column.type === "number"
      ? [["gt", "greater than"], ["gte", "at least"], ["lt", "less than"], ["lte", "at most"], ["eq", "equals"], ["between", "between"]]
      : column.type === "choice" ? [["eq", "is"]] : [["contains", "contains"]];
    operators.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      operatorSelect.appendChild(option);
    });

    if (column.type === "choice") {
      column.choices.forEach(choice => {
        const option = document.createElement("option");
        option.value = choice;
        option.textContent = choice;
        valueInput.appendChild(option);
      });
    } else {
      valueInput.type = column.type === "number" ? "number" : "search";
      if (column.type === "number") valueInput.step = "any";
      valueInput.required = true;
    }

    valueField.replaceChildren();
    const caption = document.createElement("span");
    caption.textContent = column.type === "number" ? "Value" : column.type === "choice" ? "Value" : "Text";
    valueField.append(caption, valueInput);
    updateUpperField();
  }

  function updateUpperField() {
    const between = operatorSelect.value === "between";
    upperField.hidden = !between;
    upperInput.required = between;
  }

  function formatFilter(filter) {
    const operatorLabels = { gt: ">", gte: ">=", lt: "<", lte: "<=", eq: "=", between: "between", contains: "contains" };
    const value = filter.operator === "between"
      ? `${filter.value} and ${filter.upper}`
      : `${operatorLabels[filter.operator]} ${filter.value}`;
    return `${filter.title} ${value}`;
  }

  function applyFilters() {
    rows.forEach(row => {
      const matches = Array.from(filters.values()).every(filter => {
        const cell = row.cells[filter.index];
        if (!cell) return false;

        if (filter.type === "number") {
          const comparable = getComparableValue(cell);
          if (comparable.type !== "number") return false;
          const value = comparable.value;
          if (filter.operator === "gt") return value > filter.value;
          if (filter.operator === "gte") return value >= filter.value;
          if (filter.operator === "lt") return value < filter.value;
          if (filter.operator === "lte") return value <= filter.value;
          if (filter.operator === "between") return value >= filter.value && value <= filter.upper;
          return value === filter.value;
        }

        const text = (cell.innerText || "").trim().toLocaleLowerCase();
        const target = filter.value.toLocaleLowerCase();
        return filter.operator === "contains" ? text.includes(target) : text === target;
      });

      row.hidden = !matches;
    });

    chips.replaceChildren();
    filters.forEach((filter, index) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "table-filter-chip";
      chip.setAttribute("aria-label", `Remove filter: ${formatFilter(filter)}`);
      chip.textContent = formatFilter(filter);
      chip.addEventListener("click", () => {
        filters.delete(index);
        refreshColumnOptions();
        applyFilters();
      });
      chips.appendChild(chip);
    });
    activeFilterCount.textContent = filters.size ? String(filters.size) : "";
    activeFilterCount.hidden = filters.size === 0;
    activeFilters.hidden = filters.size === 0;
    clearButton.hidden = filters.size === 0;
  }

  columnSelect.addEventListener("change", updateFilterInputs);
  operatorSelect.addEventListener("change", updateUpperField);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const index = Number(columnSelect.value);
    const column = columns.find(candidate => candidate.index === index);
    if (!column || filters.has(index) || !valueInput.value.trim()) return;

    const value = column.type === "number" ? Number(valueInput.value) : valueInput.value.trim();
    if (column.type === "number" && !Number.isFinite(value)) return;
    const upper = Number(upperInput.value);
    if (operatorSelect.value === "between" && (!Number.isFinite(upper) || upper < value)) return;

    filters.set(index, {
      index,
      title: column.title,
      type: column.type,
      operator: operatorSelect.value,
      value,
      upper
    });
    refreshColumnOptions();
    applyFilters();
  });
  clearButton.addEventListener("click", () => {
    filters.clear();
    rows.forEach(row => { row.hidden = false; });
    refreshColumnOptions();
    applyFilters();
  });

  refreshColumnOptions();
  applyFilters();
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

    // Keep unavailable change values last in either sort direction.
    if (av.type === "missing" || bv.type === "missing") {
      if (av.type === bv.type) return 0;
      return av.type === "missing" ? 1 : -1;
    }

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

      const changeColumns = [
        { key: "dayChange", title: "% Day" },
        { key: "weekChange", title: "% Week" },
        { key: "monthChange", title: "% Month" }
      ];
      // Fixed columns must not also appear as dynamic extra columns.
      const alwaysKeys = ["ticker", ...changeColumns.map(col => col.key), "rsi_14", "weekRange"];
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
      headerRow.appendChild(createHeaderCell("Chart", 1));
      changeColumns.forEach((col, index) => {
        headerRow.appendChild(createHeaderCell(col.title, 2 + index));
      });

      const extraColStartIndex = 2 + changeColumns.length;
      extraColumns.forEach((col, index) => {
        headerRow.appendChild(createHeaderCell(col, extraColStartIndex + index));
      });

      // compute the next indices once
      const rsiColIndex = extraColStartIndex + extraColumns.length;
      const week52ColIndex = rsiColIndex + 1;
      const tvColIndex = week52ColIndex + 1;

      // NEW: RSI (14) column BEFORE 52-Week
      headerRow.appendChild(createHeaderCell("RSI (14)", rsiColIndex));

      // existing 52-Week and TradingView columns
      headerRow.appendChild(createHeaderCell("52-Week", week52ColIndex));
      headerRow.appendChild(createHeaderCell("", tvColIndex)); // TradingView

      function getChangeClass(value) {
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

        const tr = document.createElement("tr");
        // Keep canonical ticker for navigation (no emoji disclaimer text).
        tr.dataset.ticker = ticker;

        const tdTicker = document.createElement("td");
        const tickerDiv = document.createElement("div");
        tickerDiv.className = "ticker-cell";
        
        const logoImg = document.createElement("img");
        logoImg.src = info.logoUrl;
        logoImg.className = "stock-logo";
        logoImg.title = `${info.companyName} - ${info.industry}`;

        const tickerLink = document.createElement("a");
        tickerLink.href = detailUrl;
        let displayTicker = ticker;
        if (ticker.endsWith('_MC')) {
            displayTicker = '\uD83C\uDDEA\uD83C\uDDF8' + ' ' + ticker.replace('_MC', '');
        }
        tickerLink.textContent = displayTicker;
        tickerDiv.appendChild(logoImg);
        tickerDiv.appendChild(tickerLink);
        tdTicker.appendChild(tickerDiv);
        tr.appendChild(tdTicker);

        const tdChart = document.createElement("td");
        const chartImg = document.createElement("img");
        chartImg.src = `../../sparklines/${ticker}.png`;
        chartImg.style.width = "64px";
        chartImg.style.height = "32px";
        chartImg.style.objectFit = "contain";
        chartImg.loading = "lazy";

        // Optional: click opens detail page
        chartImg.style.cursor = "pointer";
        chartImg.onclick = () => {
            window.location.href = detailUrl;
        };

        tdChart.appendChild(chartImg);
        tr.appendChild(tdChart);

        changeColumns.forEach(({ key }) => {
          const tdChange = document.createElement("td");
          const value = parseSortableNumber(item[key]);
          if (Number.isFinite(value)) {
            tdChange.textContent = item[key];
            tdChange.dataset.sort = value;
            tdChange.className = getChangeClass(value);
          } else {
            tdChange.textContent = "\u2014";
            tdChange.dataset.sortMissing = "true";
          }
          tr.appendChild(tdChange);
        });

        extraColumns.forEach(col => {
          const tdExtra = document.createElement("td");
        
          if (["EMAs.", "ZLEMAs"].includes(col) && item[col]) {
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
          else if (col.startsWith("%")) {
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
          else if (col === "Action") {
            const action = String(item[col] ?? "").trim().toLowerCase();
            tdExtra.textContent = item[col] ?? "";
            if (action === "buy") tdExtra.className = "light-blue";
            else if (action === "sell") tdExtra.className = "light-red";
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
      initializeTableFilters();
    }).catch(error => {
      console.error("Error loading JSON data:", error);
    });
}

// Run populateTickerTable when the page loads
//document.addEventListener("DOMContentLoaded", populateTickerTable);
