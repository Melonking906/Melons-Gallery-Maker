// +++ Melon's Micro Gallery Viewer v0.2 - https://melonking.net/melon?z=/free/software/gallery-maker +++

let al = {};

// Inject viewer code to the end of the body!
document.body.insertAdjacentHTML("beforeend", '<div id="js-viewer"><img id="js-viewer-img" src="" /><span><button id="js-viewer-prev" type="button">Previous</button> <button id="js-viewer-next" type="button">Next</button></span></div>');

al.html = {};
al.html.viewer = document.getElementById("js-viewer");
al.html.viewer.style.display = "none";

al.html.viewerImg = document.getElementById("js-viewer-img");
al.html.viewerPrev = document.getElementById("js-viewer-prev");
al.html.viewerNext = document.getElementById("js-viewer-next");

al.isViewing = false;
al.selectedPhoto = undefined;

document.addEventListener("click", (e) => {
    // Photo Viewing Events!
    if (e.target.parentElement != undefined && e.target.parentElement.tagName == "A" && e.target.parentElement.parentElement != undefined && e.target.parentElement.parentElement.parentElement != undefined && e.target.parentElement.parentElement.parentElement.id == "photos") {
        e.preventDefault();
        viewPhoto(e.target.parentElement.parentElement);
    }
    if (e.target.tagName == "A" && e.target.parentElement.id == "photos") {
        e.preventDefault();
        viewPhoto(e.target);
    }
    // Viewer Hide!
    if (e.target.id == "js-viewer") {
        al.isViewing = false;
        al.html.viewer.style.display = "none";
    }
    // Prev Button Event
    if (e.target.id == "js-viewer-prev") {
        viewPhoto(al.selectedPhoto.parentElement.previousElementSibling);
    }
    // Next Button Event
    if (e.target.id == "js-viewer-next") {
        viewPhoto(al.selectedPhoto.parentElement.nextElementSibling);
    }
});

document.addEventListener("keyup", (e) => {
    // Close the viewer is Esc is pressed!
    if (al.isViewing && e.key === "Escape") {
        al.isViewing = false;
        al.html.viewer.style.display = "none";
    }
    if (al.isViewing && e.key === "ArrowLeft") {
        viewPhoto(al.selectedPhoto.parentElement.previousElementSibling);
    }
    if (al.isViewing && e.key === "ArrowRight") {
        viewPhoto(al.selectedPhoto.parentElement.nextElementSibling);
    }
});

// Open the viewer and display a photo!
function viewPhoto(photo) {
    if (photo == undefined) return;
    al.isViewing = true;
    al.selectedPhoto = photo.firstElementChild;
    al.html.viewerImg.src = ""; // Clear photo so it does not appear to lag
    al.html.viewerImg.src = al.selectedPhoto.href;
    al.html.viewer.style.display = "";
    al.html.viewerPrev.style.display = "";
    al.html.viewerNext.style.display = "";
    if (al.selectedPhoto.parentElement.previousElementSibling == undefined) al.html.viewerPrev.style.display = "none";
    if (al.selectedPhoto.parentElement.nextElementSibling == undefined) al.html.viewerNext.style.display = "none";
}
