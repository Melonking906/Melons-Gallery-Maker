const { ipcRenderer, shell } = require("electron");
const storage = require("electron-json-storage");

let rg = {};

rg.storagePath = "";

rg.html = {};
rg.html.name = document.getElementById("reg-name");
rg.html.key1 = document.getElementById("reg-1");
rg.html.key2 = document.getElementById("reg-2");
rg.html.key3 = document.getElementById("reg-3");
rg.html.button = document.getElementById("reg-button");
rg.html.order = document.getElementById("reg-order");
rg.html.feedback = document.getElementById("reg-feedback");

rg.one = {};
rg.one.min = 900;
rg.one.max = 999;

rg.two = {};
rg.two.min = 0;
rg.two.max = 100;

rg.three = {};
rg.three.min = 200;
rg.three.max = 300;

ipcRenderer.send("get-storage-path");

ipcRenderer.on("data-request", (event, data) => {
    rg.storagePath = data;
    start();
});

function start() {
    storage.setDataPath(rg.storagePath);

    storage.has("reg_key", function (error, hasKey) {
        if (hasKey) {
            let keys = storage.getSync("reg_key").split("-");
            rg.html.key1.value = keys[0];
            rg.html.key2.value = keys[1];
            rg.html.key3.value = keys[2];
        }
    });
    storage.has("reg_name", function (error, hasKey) {
        if (hasKey) {
            setInputs(true);
            rg.html.name.value = storage.getSync("reg_name");
            rg.html.feedback.innerHTML = "Thank you for registering " + name + " !!!";
        }
    });
}

rg.html.button.addEventListener("click", () => {
    let name = rg.html.name.value;
    if (name == undefined || name == "") {
        rg.html.feedback.innerHTML = "Please enter a name!";
        return;
    }

    let key1 = Math.floor(rg.html.key1.value);
    let key2 = Math.floor(rg.html.key2.value);
    let key3 = Math.floor(rg.html.key3.value);

    if (key1 > rg.one.min && key1 < rg.one.max) {
        if (key2 > rg.two.min && key2 < rg.two.max) {
            if (key3 > rg.three.min && key3 < rg.three.max) {
                rg.html.feedback.innerHTML = "Thank you for registering " + name + " !!!";
                storage.set("reg_key", key1 + "-" + key2 + "-" + key3);
                storage.set("reg_name", name);
                ipcRenderer.send("register-update");
                return;
            }
        }
    }

    storage.remove("reg_key");
    storage.remove("reg_name");
    ipcRenderer.send("register-update");
    rg.html.feedback.innerHTML = "Excuse me! That is not a valid registration key!!!";
});

rg.html.order.addEventListener("click", () => {
    shell.openExternal("https://melonking.net/melon?z=/shop/");
});

function setInputs(disabled) {
    let inputs = Array.from(document.getElementsByTagName("input"));
    let buttons = Array.from(document.getElementsByTagName("button"));
    let elements = inputs.concat(buttons);
    for (let i = 0; i < elements.length; i++) {
        elements[i].disabled = disabled;
    }
}
