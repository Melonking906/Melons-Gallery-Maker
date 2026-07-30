// melonking.net / forum.melonland.net - Melon Dynamic Links System v0.3 - Electron Version
// Displays random image or text links to melon projects and melonland community links!
// Example link placeholder:
// <span class="melonLink" data-melon-link-format="400x40"></span>

const { shell } = require("electron");

let melonLinks = {};
melonLinks.loopTime = 25; // In seconds
melonLinks.loop = undefined;
melonLinks.api = "https://brain.melonking.net/link";
melonLinks.infoUrl = "https://forum.melonland.net/banners.php";
melonLinks.borderRadius = "30px";

window.addEventListener("DOMContentLoaded", (event) => {
    if (melonLinks.elements != undefined) {
        return; // The script has already been setup
    }

    melonLinks.elements = document.getElementsByClassName("melonLink");
    updateLinks();
    melonLinks.loop = setInterval(updateLinks, melonLinks.loopTime * 1000);
});

function updateLinks() {
    for (let i = 0; i < melonLinks.elements.length; i++) {
        let melonLinkElement = melonLinks.elements[i];
        let format = melonLinkElement.dataset.melonLinkFormat;
        if (format == undefined) {
            console.log("Attempted to load a melon dynamic link, but the format data was missing!");
            continue;
        }
        let isText = format.includes("text");

        fetch(melonLinks.api + "?format=" + format)
            .then((res) => res.json())
            .then((link) => {
                if (link.status != "success") {
                    console.log(link.msg);
                    return;
                }

                // First time setup of a link!
                if (!melonLinkElement.hasChildNodes()) {
                    melonLinkElement.style.position = "relative";
                    melonLinkElement.style.display = "inline-block";
                    melonLinkElement.style.overflow = "hidden";
                    melonLinkElement.style.borderRadius = melonLinks.borderRadius;

                    let link = document.createElement("a");
                    link.target = "_blank";
                    link.href = "#";
                    if (!isText) {
                        let img = document.createElement("img");
                        img.alt = "Loading...";
                        img.src = "#";
                        img.style.borderRadius = melonLinks.borderRadius;
                        img.style.display = "block";
                        link.appendChild(img);
                    }
                    melonLinkElement.appendChild(link);

                    // Info badge!
                    let info = document.createElement("a");
                    info.target = "_blank";
                    info.href = melonLinks.infoUrl;
                    info.title = "What's this?";
                    info.textContent = "ℹ";
                    info.style.cssText = [
                        "position: absolute",
                        "top: 0",
                        "right: 0",
                        "bottom: 0",
                        "width: 22px",
                        "display: flex",
                        "align-items: center",
                        "justify-content: center",
                        "background: rgba(0, 0, 0, 0.5)",
                        "color: yellow",
                        "font-size: 1.5em",
                        "text-decoration: none",
                        "transform: translateX(100%)",
                        "transition: 0.2s ease-in-out"
                    ].join(";");
                    melonLinkElement.appendChild(info);
                    
                    let img = melonLinkElement.querySelector("img");
                    
                    // Hover events!
                    melonLinkElement.addEventListener("mouseenter", () => {
                        info.style.transform = "translateX(0)";
                        if (img != null) {
                            img.style.filter = "brightness(1.5)";
                        }
                    });
                    melonLinkElement.addEventListener("mouseleave", () => {
                        info.style.transform = "translateX(100%)";
                        if (img != null) {
                            img.style.filter = "";
                        }
                    });
                }

                melonLinkElement.firstChild.href = link.banner.url;
                
                // Text Link
                if (isText) {
                    melonLinkElement.firstChild.innerText = link.banner.alt;
                    return;
                }
                // Image Link
                melonLinkElement.firstChild.firstChild.alt = link.banner.alt;
                fetch(link.banner.image)
                    .then((e) => e.blob())
                    .then((e) => {
                        melonLinkElement.firstChild.firstChild.src = URL.createObjectURL(e);
                    });
            })
            .catch((err) => console.log(err));
    }
}

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
