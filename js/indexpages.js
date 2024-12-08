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
