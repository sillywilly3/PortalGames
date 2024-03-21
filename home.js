function gotoGames() {
    gamesUrl = "/games.html"
    window.location.href = gamesUrl
}

function openInBlank() {
    alert('Coming Soon...')
}
function toggleCloak() {
    var isCloaked = localStorage.getItem('cloak') === 'true';
    if (isCloaked) {
        removeCloak();
    } else {
        applyCloak();
    }
}
