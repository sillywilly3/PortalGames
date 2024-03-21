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
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    window.location.href = "/device-not-supported.html";
} else {
    var games = document.querySelectorAll('.game');

    games.forEach(function(game) {
        game.addEventListener('click', function() {
            var id = this.id;
            var url = id + '.html';
            window.location.href = url;
        });
    });
}
