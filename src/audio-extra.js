audio = {};
audio.click = document.getElementById("click-audio");
audio.interact = document.getElementById("interact-audio");
audio.interact.volume = 0.3;
audio.error = document.getElementById("error-audio");
audio.success = document.getElementById("success-audio");
audio.loading = document.getElementById("loading-audio");

audio.context = new AudioContext();
audio.track = {};
audio.track.click = audio.context.createMediaElementSource(audio.click);
audio.track.click.connect(audio.context.destination);
audio.track.interact = audio.context.createMediaElementSource(audio.interact);
audio.track.interact.connect(audio.context.destination);
audio.track.error = audio.context.createMediaElementSource(audio.error);
audio.track.error.connect(audio.context.destination);
audio.track.success = audio.context.createMediaElementSource(audio.success);
audio.track.success.connect(audio.context.destination);
audio.track.loading = audio.context.createMediaElementSource(audio.loading);
audio.track.loading.connect(audio.context.destination);

document.addEventListener("mouseover", (e) => {
    if (e.target.tagName == "BUTTON") {
        audio.interact.play();
    }
});

document.addEventListener("click", (e) => {
    if (e.target.tagName == "BUTTON") {
        audio.click.play();
    }
});
