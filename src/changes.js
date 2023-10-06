const { ipcRenderer, shell } = require("electron");
const storage = require("electron-json-storage");

let ch = {};

ch.storagePath = "";

ch.html = {};
ch.html.open_templates = document.getElementById("open-templates");
ch.html.generate_templates = document.getElementById("generate-templates");
ch.html.open_chnagelog = document.getElementById("open-chnagelog");

ch.input = "";

ch.html.open_templates.addEventListener("click", () => {
    ipcRenderer.send("open-templates", ch.input);
});

ch.html.generate_templates.addEventListener("click", () => {
    ipcRenderer.send("create-templates", ch.input);
});

ch.html.open_chnagelog.addEventListener("click", () => {
    shell.openExternal("https://melonking.net/melon?z=/free/software/gallery-maker");
});

ipcRenderer.send("get-storage-path");

ipcRenderer.on("data-request", (event, data) => {
    ch.storagePath = data;
    start();
});

function start() {
    storage.setDataPath(ch.storagePath);
    storage.has("input", function (error, hasKey) {
        if (hasKey) {
            ch.input = storage.getSync("input");
        }
    });
}
