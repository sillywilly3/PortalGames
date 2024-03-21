window.onload = function() {
    var cloaked = localStorage.getItem("cloak");
    if(cloaked) {
        applyCloak();
    }
    else {
        
    }
}

function applyCloak() {
    function gcloak() {
        var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = 'https://ssl.gstatic.com/docs/doclist/images/infinite_arrow_favicon_5.ico';
        document.title = 'My Drive - Google Drive';
        console.log(document.title);
        document.getElementsByTagName('head')[0].appendChild(link);
    }

    var cloakText = document.querySelector('#cloakText');
    cloakText.textContent = "Uncloak Tab";

    setInterval(gcloak, 100);
    localStorage.setItem('cloak', 'true');
}

function removeCloak() {
    // Remove cloaking logic
    var link = document.querySelector("link[rel*='icon']");
    if (link) {
        link.parentNode.removeChild(link);
    }
    localStorage.removeItem('cloak');
    var cloakText = document.querySelector('#cloakText');
    cloakText.textContent = "Cloak Tab";

    window.location.reload();
}
