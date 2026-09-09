function showTab(tabName) {
    const contents = document.querySelectorAll('.content');
    contents.forEach(content => content.classList.add('hidden'));
    document.getElementById(tabName).classList.remove('hidden');

    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');
}

document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' && event.key !== 'i' && event.key !== 'I') {
        return;
    }
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) {
        return;
    }

    const activeElement = document.activeElement;
    const tag = activeElement?.tagName;
    if (activeElement?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
    }

    event.preventDefault();
    window.history.back();
});
