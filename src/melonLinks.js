// Melonking.net - Melon Dynamic Links System v0.1 - Electron Version
// Displays random image or text links to melon projects.
// Example link placeholder:
// <span class="melonLink" data-melon-link-format="80x80"></span>

// Only needed if the windows does not get called first or use shell
//const { shell } = require("electron");

window.addEventListener("DOMContentLoaded", (event) => {
    let melonLinks = {};
    melonLinks.api = "http://localhost:3000/link";
    melonLinks.elements = document.getElementsByClassName("melonLink");
    for (let i = 0; i < melonLinks.elements.length; i++) {
        let melonLinkElement = melonLinks.elements[i];
        let format = melonLinkElement.dataset.melonLinkFormat;
        if (format == undefined) {
            console.log("Attempted to load a melon dynamic link, but the format data was missing!");
            continue;
        }
        fetch(melonLinks.api + "?format=" + format)
            .then((res) => res.json())
            .then((link) => {
                if (link.status != "success") {
                    console.log(link.msg);
                    return;
                }
                // Text only link
                if (format == "text") {
                    melonLinkElement.innerHTML = `<a href="${link.banner.url}" target="_blank">${link.banner.alt}</a>`;
                    return;
                }
                // General image link
                melonLinkElement.innerHTML = `<a href="${link.banner.url}" target="_blank"><img src="${link.banner.image}" alt="${link.banner.alt}" /></a>`;
            })
            .catch((err) => console.log(err));
    }
});

document.addEventListener("click", (e) => {
    // Images
    if (e.target.parentElement.parentElement.className == "melonLink") {
        e.preventDefault();
        shell.openExternal(e.target.parentElement.href);
    }
    // Text links
    if (e.target.parentElement.className == "melonLink") {
        e.preventDefault();
        shell.openExternal(e.target.href);
    }
});
