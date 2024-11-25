function showTab(tabName) {
    const contents = document.querySelectorAll('.content');
    contents.forEach(content => content.classList.add('hidden'));
    document.getElementById(tabName).classList.remove('hidden');

    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');
}
