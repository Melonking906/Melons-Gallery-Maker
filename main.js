const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require("electron");
const storage = require("electron-json-storage");
const fs = require("fs-extra");
const path = require("path");
const { DateTime } = require("luxon");
const NeoCities = require("neocities-extended");
const request = require("request");

const melonMaker = require("./maker.js");

let galleryFolder = "MelonGallery";

let mainWindow = undefined;
let neocitiesWindow = undefined;
let registerWindow = undefined;

let dataForNeocitiesWindow = {};

const createMainWindow = () => {
    mainWindow = new BrowserWindow({
        width: 950,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile("src/index.html");
    // mainWindow.webContents.openDevTools();
};

const createNeocitiesWindow = () => {
    neocitiesWindow = new BrowserWindow({
        width: 500,
        height: 530,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    neocitiesWindow.loadFile("src/neocities.html");
    // neocitiesWindow.webContents.openDevTools();
};

const createRegisterWindow = () => {
    registerWindow = new BrowserWindow({
        width: 670,
        height: 380,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    registerWindow.loadFile("src/register.html");
    // registerWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
    // Menu Bar
    let menuTemplate = [
        { label: app.name, submenu: [{ label: "About", role: "about" }, { type: "separator" }, { label: "Quit", role: "quit" }] },
        {
            label: "Edit",
            submenu: [
                {
                    label: "Undo",
                    accelerator: "CmdOrCtrl+Z",
                    selector: "undo:",
                },
                {
                    label: "Redo",
                    accelerator: "Shift+CmdOrCtrl+Z",
                    selector: "redo:",
                },
                {
                    type: "separator",
                },
                {
                    label: "Copy",
                    accelerator: "CmdOrCtrl+C",
                    selector: "copy:",
                },
                {
                    label: "Paste",
                    accelerator: "CmdOrCtrl+V",
                    selector: "paste:",
                },
                {
                    label: "Select All",
                    accelerator: "CmdOrCtrl+A",
                    selector: "selectAll:",
                },
            ],
        },
        {
            label: "Help",
            submenu: [
                {
                    label: "Visit the Support Page",
                    click: function () {
                        shell.openExternal("https://melonking.net/melon?z=/free/software/gallery-maker");
                    },
                },
                {
                    label: "Visit the Forum Thread",
                    click: function () {
                        shell.openExternal("https://forum.melonland.net/index.php?topic=2088");
                    },
                },
                {
                    label: "Email Me!",
                    click: function () {
                        shell.openExternal("mailto:webmaster@melonking.net?subject=GalleryMakerSupport");
                    },
                },
            ],
        },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

    // Other cosmetic stuff
    app.setAppUserModelId(app.name);

    // Update version number
    storage.set("version", app.getVersion());

    // Windows
    createMainWindow();

    // +++ Events +++

    // Open a window if none exist
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });

    // Quit when all windows are closed, except on mac
    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit();
    });

    // Startup load memory
    mainWindow.webContents.once("dom-ready", () => {
        storage.has("input", function (error, hasKey) {
            if (hasKey) {
                inputPathUpdate(storage.getSync("input"));
            }
        });
        storage.has("output", function (error, hasKey) {
            if (hasKey) {
                mainWindow.webContents.send("output-selected", storage.getSync("output"));
            }
        });
    });

    // ++++ Custom Events ++++

    ipcMain.on("open-input-picker", (event) => {
        dialog
            .showOpenDialog({
                title: "Select a Gallery Source",
                button: "Pick!",
                properties: ["openDirectory", "createDirectory"],
            })
            .then((result) => {
                let path = result.filePaths[0];
                if (path == undefined) {
                    // The picker was closed without selecting anything
                    return;
                }
                inputPathUpdate(path);
                storage.set("input", path);
            })
            .catch((err) => {
                console.log(err);
            });
    });

    ipcMain.on("open-output-picker", (event) => {
        dialog
            .showOpenDialog({
                properties: ["openDirectory"],
            })
            .then((result) => {
                let path = result.filePaths[0];
                if (path == undefined) {
                    // The picker was closed without selecting anything
                    return;
                }
                event.sender.send("output-selected", path);
                storage.set("output", path);
            })
            .catch((err) => {
                console.log(err);
            });
    });

    ipcMain.on("open-output", (event, outputPath) => {
        shell.openPath(outputPath);
    });

    ipcMain.on("do-make", (event, makeData) => {
        // Make the Gallery Folder if missing
        fs.ensureDirSync(path.join(makeData.input, galleryFolder));
        // Save any new settings
        fs.writeFileSync(path.join(makeData.input, galleryFolder, "/settings.json"), JSON.stringify(makeData.settings), { encoding: "utf8", flag: "w" });

        testForTemplates(path.join(makeData.input, galleryFolder), (hasTemplates) => {
            if (hasTemplates) {
                // Trigger the gallery maker!
                melonMaker.make(makeData, makeFinished);
            } else {
                // No templates found, create them before we do the make!
                createTemplates(makeData.input, (templatesPath) => {
                    if (templatesPath != undefined) {
                        melonMaker.make(makeData, makeFinished);
                        return;
                    }
                    makeFinished("Template Creation Error!");
                });
            }
        });
    });

    // +++ TEMPLATES

    ipcMain.on("open-templates", (event, inputPath) => {
        let newGalleryFolder = path.join(inputPath, galleryFolder, "templates");
        shell.openPath(newGalleryFolder);
    });

    ipcMain.on("create-templates", (event, inputPath) => {
        createTemplates(inputPath, (templatesPath) => {
            if (templatesPath != undefined) {
                shell.openPath(templatesPath);
            }
        });
    });

    // +++ NEOCITIES

    ipcMain.on("open-neocities", (event, outputPath) => {
        dataForNeocitiesWindow = {
            storagePath: storage.getDataPath(),
            outputPath: outputPath,
        };

        createNeocitiesWindow();
    });

    ipcMain.on("neocities-getdata", (event) => {
        event.sender.send("data-request", dataForNeocitiesWindow);
    });

    ipcMain.on("neocities-upload", (event, user, pass, uploadPath) => {
        let api = new NeoCities(user, pass);
        let manifestURL = "https://" + user + ".neocities.org" + path.posix.join("/", uploadPath, "manifest.json");

        request.get(manifestURL, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                let ncManifest = JSON.parse(body);
                neocitiesUpload(event, ncManifest.images, uploadPath, api);
            } else {
                console.log("No manifest found, must be a new upload!");
                neocitiesUpload(event, [], uploadPath, api);
            }
        });
    });

    // +++ REGISTER

    ipcMain.on("open-register", (event) => {
        createRegisterWindow();
    });

    ipcMain.on("register-update", (event) => {
        mainWindow.webContents.send("update-registration");
    });

    // +++ GENERAL

    ipcMain.on("get-storage-path", (event) => {
        event.sender.send("data-request", storage.getDataPath());
    });
});

// Uploads the gallery to neocities; takes a list of existing cityFiles to compare and exclude from the upload
function neocitiesUpload(event, cityFiles, uploadPath, api) {
    console.log("Starting Neocities Upload");

    // Access the local manifest to get files to upload
    fs.readFile(path.join(dataForNeocitiesWindow.outputPath, "manifest.json"), "utf8", (error, data) => {
        let localFiles = [];
        if (error) {
            console.log("No manifest found at: " + dataForNeocitiesWindow.outputPath);
            return;
        } else {
            data = JSON.parse(data);
            localFiles = data.images.concat(data.files);
        }

        // Filter existing neocities files from the local list
        for (let i = localFiles.length - 1; i >= 0; i--) {
            let localFile = localFiles[i];
            cityFiles.forEach(function (cityFile) {
                // Filter out neocities upload path so its just a local path
                if (cityFile.path == localFile.path) {
                    // Same file !!!
                    let cityDate = DateTime.fromRFC2822(cityFile.updated_at);
                    let localDate = DateTime.fromRFC2822(localFile.updated_at);
                    if (cityDate >= localDate && cityFile.size == localFile.size) {
                        // File is the same or newer - do not upload!
                        localFiles.splice(i, 1);
                    }
                }
            });
        }

        // Convert files to NC upload request - lazy I know, but comeoooonn!
        let uploadFiles = [];
        localFiles.forEach((localFile) => {
            uploadFiles.push({
                name: path.posix.join(uploadPath, localFile.path),
                path: path.join(dataForNeocitiesWindow.outputPath, localFile.path),
            });
        });

        // UPLOAD
        api.upload(uploadFiles, (resp) => {
            console.log(resp);

            if (resp.result == "error") {
                event.sender.send("upload-error", resp.message);
                return;
            }

            if (resp.result == "success") {
                event.sender.send("upload-success", uploadFiles.length);
                return;
            }
        });
    });
}

// ++++ Functions ++++

function inputPathUpdate(inputPath) {
    fs.readdir(inputPath, function (err, fileNames) {
        if (err) {
            mainWindow.webContents.send("input-selected-error");
            return console.log("Unable to scan directory: " + err);
        }

        // Check to see if there is a gallery folder
        if (fileNames.includes(galleryFolder)) {
            // Its an existing gallery
            loadSettings(inputPath);

            // Check to see if the templates are there
            testForTemplates(path.join(inputPath, galleryFolder), (hasTemplates) => {
                if (hasTemplates) {
                    mainWindow.webContents.send("input-selected", inputPath, false);
                } else {
                    mainWindow.webContents.send("input-selected", inputPath, true);
                }
            });
        } else {
            // No Gallery folder, its a new gallery!
            mainWindow.webContents.send("input-selected", inputPath, true);
        }
    });
}

function testForTemplates(testGalleryPath, callback) {
    fs.readdir(path.join(testGalleryPath, "templates"), function (err, templates) {
        if (err) {
            console.log(err);
            callback(false);
            return;
        }
        if (!templates.includes("index.html") || !templates.includes("gallery-page-template.html") || !templates.includes("gallery.css") || !templates.includes("gallery.js")) {
            // There is a template missing!
            callback(false);
            return;
        }
        callback(true);
    });
}

function createTemplates(inputPath, callback) {
    console.log("Creating Templates at: " + inputPath);
    let newGalleryFolder = path.join(inputPath, galleryFolder);
    fs.copy(path.join(process.resourcesPath, "assets"), newGalleryFolder, { overwrite: false }, (err) => {
        if (err) {
            console.log("TEMPLAE SETUP Error: ", err);
            return undefined;
        }
        inputPathUpdate(inputPath);
        callback(path.join(newGalleryFolder, "templates"));
    });
}

function makeFinished(feedback) {
    console.log("MAIN DONE!!");
    mainWindow.webContents.send("make-finished", feedback);
}

function loadSettings(sourcePath) {
    fs.readFile(path.join(sourcePath, galleryFolder, "/settings.json"), "utf8", (error, data) => {
        if (error) {
            console.log("No settings file found!");
            return;
        }
        mainWindow.webContents.send("new-settings", data);
    });
}
