(function () {
    const originalPlotlyThemes = new WeakMap();

    function applyPlotlyTheme(theme) {
        if (!window.Plotly) return;

        document.querySelectorAll('.js-plotly-plot').forEach(plot => {
            if (!originalPlotlyThemes.has(plot)) {
                const layout = plot._fullLayout || {};
                const remember = (key, value) => {
                    if (value !== undefined) original[key] = value;
                };
                const original = {
                    paper_bgcolor: layout.paper_bgcolor,
                    plot_bgcolor: layout.plot_bgcolor,
                    'font.color': layout.font?.color
                };
                Object.keys(layout).filter(key => /^[xy]axis\d*$/.test(key)).forEach(axis => {
                    remember(`${axis}.color`, layout[axis].color);
                    remember(`${axis}.gridcolor`, layout[axis].gridcolor);
                    remember(`${axis}.linecolor`, layout[axis].linecolor);
                    remember(`${axis}.tickfont.color`, layout[axis].tickfont?.color);
                    remember(`${axis}.title.font.color`, layout[axis].title?.font?.color);
                });
                originalPlotlyThemes.set(plot, original);
            }

            if (theme === 'dark') {
                if (originalPlotlyThemes.get(plot)) {
                    window.Plotly.relayout(plot, originalPlotlyThemes.get(plot));
                }
                return;
            }

            const updates = {
                paper_bgcolor: '#ffffff',
                plot_bgcolor: '#ffffff',
                'font.color': '#333a42'
            };
            const axes = Object.keys(plot._fullLayout || {}).filter(key => /^[xy]axis\d*$/.test(key));
            axes.forEach(axis => {
                updates[`${axis}.color`] = '#49515a';
                updates[`${axis}.gridcolor`] = '#e2e6ea';
                updates[`${axis}.linecolor`] = '#c8cfd6';
                updates[`${axis}.tickfont.color`] = '#49515a';
                updates[`${axis}.title.font.color`] = '#333a42';
            });
            window.Plotly.relayout(plot, updates);
        });
    }

    function applySavedTheme() {
        const theme = localStorage.getItem('siteTheme') === 'light' ? 'light' : 'dark';
        document.documentElement.dataset.theme = theme;
        applyPlotlyTheme(theme);
    }

    applySavedTheme();
    document.addEventListener('DOMContentLoaded', applySavedTheme);
    window.addEventListener('storage', event => {
        if (event.key === 'siteTheme') applySavedTheme();
    });
})();
