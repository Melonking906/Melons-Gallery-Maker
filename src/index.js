const { ipcRenderer } = require("electron");
const storage = require("electron-json-storage");

const index = {};

index.storagePath = "";

index.html = {};
index.html.version = document.getElementById("version");
index.html.input = document.getElementById("input");
index.html.input_feedback = document.getElementById("input-feedback");
index.html.input_feedback_new = document.getElementById("input-feedback-new");
index.html.input_feedback_new_button = document.getElementById("input-feedback-new-button");
index.html.input_feedback_open = document.getElementById("input-feedback-open");
index.html.input_feedback_open_button = document.getElementById("input-feedback-open-button");

index.html.output = document.getElementById("output");
index.html.output_feedback = document.getElementById("output-feedback");
index.html.title = document.getElementById("title");
index.html.info = document.getElementById("info");
index.html.image_size = document.getElementById("image_size");
index.html.image_compression = document.getElementById("image_compression");
index.html.thumbnail_size = document.getElementById("thumbnail_size");
index.html.images_per_page = document.getElementById("images_per_page");
index.html.show_filenames = document.getElementById("show_filenames");
index.html.use_javascript = document.getElementById("use_javascript");
index.html.use_minify = document.getElementById("use_minify");

index.html.generate = document.getElementById("generate");
index.html.generate_feedback = document.getElementById("generate-feedback");

index.html.open_output = document.getElementById("open-output");
index.html.open_neocities = document.getElementById("open-neocities");

index.html.registration = document.getElementById("registration");

index.input = "";
index.output = "";

// Start
ipcRenderer.send("get-storage-path");
ipcRenderer.on("data-request", (event, data) => {
    index.storagePath = data;
    start();
});
function start() {
    storage.setDataPath(index.storagePath);
    index.html.version.innerHTML = "v" + storage.getSync("version");
    updateRegistration();
}

function makeData() {
    let makeData = {};

    makeData.settings = {};
    makeData.settings.title = index.html.title.value;
    makeData.settings.info = index.html.info.value;
    makeData.settings.image_size = Math.floor(index.html.image_size.value);
    makeData.settings.image_compression = Math.floor(index.html.image_compression.value);
    makeData.settings.thumbnail_size = Math.floor(index.html.thumbnail_size.value);
    makeData.settings.images_per_page = Math.floor(index.html.images_per_page.value);
    makeData.settings.show_filenames = index.html.show_filenames.checked;
    makeData.settings.use_javascript = index.html.use_javascript.checked;
    makeData.settings.use_minify = index.html.use_minify.checked;

    makeData.input = index.input;
    makeData.output = index.output;

    return makeData;
}

async function updateRegistration() {
    await sleep(500); // Dumb bug fix for storage write delay.
    storage.has("reg_name", function (error, hasKey) {
        if (hasKey) {
            index.html.registration.innerHTML = "Registered to " + storage.getSync("reg_name") + " !";
        } else {
            index.html.registration.innerHTML = "unregistered";
        }
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTemplates() {
    ipcRenderer.send("create-templates");
}

function setInputs(disabled) {
    let inputs = Array.from(document.getElementsByTagName("input"));
    let textareas = Array.from(document.getElementsByTagName("textarea"));
    let buttons = Array.from(document.getElementsByTagName("button"));
    let elements = inputs.concat(textareas).concat(buttons);

    for (let i = 0; i < elements.length; i++) {
        elements[i].disabled = disabled;
    }
}

// ++++ Events

// ++ OUT

index.html.input.addEventListener("click", () => {
    ipcRenderer.send("open-input-picker");
});

index.html.input_feedback_new_button.addEventListener("click", () => {
    ipcRenderer.send("create-templates", index.input);
});

index.html.input_feedback_open_button.addEventListener("click", () => {
    ipcRenderer.send("open-templates", index.input);
});

index.html.output.addEventListener("click", () => {
    ipcRenderer.send("open-output-picker");
});

index.html.open_output.addEventListener("click", () => {
    ipcRenderer.send("open-output", index.output);
});

index.html.open_neocities.addEventListener("click", () => {
    ipcRenderer.send("open-neocities", index.output);
});

index.html.registration.addEventListener("click", () => {
    ipcRenderer.send("open-register");
});

index.html.generate.addEventListener("click", () => {
    if (index.input == undefined || index.input == "") {
        index.html.generate_feedback.innerHTML = "You have not selected a gallery soruce!";
        return;
    }
    if (index.output == undefined || index.output == "") {
        index.html.generate_feedback.innerHTML = "You have not set a save location!";
        return;
    }

    index.html.generate_feedback.innerHTML = "Generating Gallery!! Aaaaaaa <img src='images/work-0082.gif' /> (This may take a while!)";

    setInputs(true);
    ipcRenderer.send("do-make", makeData());
    audio.loading.play();
});

// ++ IN

ipcRenderer.on("new-settings", (event, newSettings) => {
    newSettings = JSON.parse(newSettings);

    index.html.title.value = newSettings.title;
    index.html.info.value = newSettings.info;
    index.html.image_size.value = newSettings.image_size;
    index.html.image_compression.value = newSettings.image_compression;
    index.html.thumbnail_size.value = newSettings.thumbnail_size;
    index.html.images_per_page.value = newSettings.images_per_page;
    index.html.show_filenames.checked = newSettings.show_filenames;
    index.html.use_minify.checked = newSettings.use_minify;
    index.html.use_javascript.checked = newSettings.use_javascript;
});

ipcRenderer.on("input-selected-error", (event) => {
    index.html.input_feedback.innerHTML = "Oops, the directory is missing!";
    audio.error.play();
});

ipcRenderer.on("input-selected", (event, path, isNew) => {
    index.html.input_feedback.innerHTML = "You picked: <b>" + path + "</b> !!!";
    index.input = path;

    if (isNew) {
        index.html.input_feedback_open.style.display = "none";
        index.html.input_feedback_new.style.display = "inline";
    } else {
        index.html.input_feedback_new.style.display = "none";
        index.html.input_feedback_open.style.display = "inline";
    }
});

ipcRenderer.on("output-selected", (event, path) => {
    index.html.output_feedback.innerHTML = "You picked: <b>" + path + "</b> !!!";
    index.output = path;
});

ipcRenderer.on("make-finished", (event, feedback) => {
    index.html.generate_feedback.innerHTML = "The Render is DONE !!! <img src='images/party-0781.gif' /><br>" + feedback;
    audio.loading.pause();
    audio.success.play();
    setInputs(false);
});

ipcRenderer.on("update-registration", (event) => {
    updateRegistration();
});
