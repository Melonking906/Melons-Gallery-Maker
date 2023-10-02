const { ipcRenderer } = require("electron");
const storage = require("electron-json-storage");

let nc = {};

nc.html = {};
nc.html.selected_output = document.getElementById("selected-output");
nc.html.user = document.getElementById("user");
nc.html.pass = document.getElementById("pass");
nc.html.upload_path = document.getElementById("upload-path");
nc.html.upload = document.getElementById("upload");
nc.html.upload_feedback = document.getElementById("upload-feedback");

nc.outputPath = "";
nc.storagePath = "";

ipcRenderer.send("neocities-getdata");

ipcRenderer.on("data-request", (event, data) => {
    nc.outputPath = data.outputPath;
    nc.storagePath = data.storagePath;

    start();
});

function start() {
    storage.setDataPath(nc.storagePath);

    nc.html.selected_output.innerHTML = "Uploading Gallery from " + nc.outputPath;

    storage.has("neocities_user", function (error, hasKey) {
        if (hasKey) {
            nc.html.user.value = storage.getSync("neocities_user");
        }
    });
    storage.has("neocities_upload_path", function (error, hasKey) {
        if (hasKey) {
            nc.html.upload_path.value = storage.getSync("neocities_upload_path");
        }
    });
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

nc.html.upload.addEventListener("click", () => {
    console.log("Neocities Upload Requested!");

    setInputs(true);

    let user = nc.html.user.value;
    let pass = nc.html.pass.value;
    let uploadPath = nc.html.upload_path.value;

    if (user == "" || pass == "" || uploadPath == "") {
        nc.html.upload_feedback.innerHTML = "Oops, looks like you are missing some info!";
        audio.error.play();
        setInputs(false);
        return;
    }

    storage.set("neocities_user", user);
    storage.set("neocities_upload_path", uploadPath);

    ipcRenderer.send("neocities-upload", user, pass, uploadPath);
    nc.html.upload_feedback.innerHTML = "<span>Your gallery is UPLOADING!!? (This may take some time)</span>";
    audio.loading.play();
});

ipcRenderer.on("upload-error", (event, message) => {
    nc.html.upload_feedback.innerHTML = "<span class='alert'>ALERT - There was an error, check your name and password!</span>";
    audio.error.play();
    setInputs(false);
});

ipcRenderer.on("upload-success", (event, fileCount) => {
    nc.html.upload_feedback.innerHTML = "<span class='success'>Your gallery has been uploaded! " + fileCount + " files were updated!</span><br>";
    audio.success.play();
    setInputs(false);
});
