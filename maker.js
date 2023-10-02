// Melon's Gallery Maker!
// Info topic - https://forum.melonland.net/index.php?topic=2088

const { DateTime } = require("luxon");
const fs = require("fs-extra");
const crypto = require("crypto");
const path = require("path");
var _ = require("lodash");
const sharp = require("sharp");
const { minify } = require("html-minifier");
var sanitize = require("sanitize-filename");

let gallery = {};

gallery.settings = {};

// Gallery Settings
gallery.settings.thumbSize = 256; // Max width in px - Will be overwritten by settings file
gallery.settings.photoSize = 2560; // Max width in px - Will be overwritten by settings file
gallery.settings.compressionLevel = 85; // Max width in px - Will be overwritten by settings file
gallery.settings.photosPerAlbumPage = 100; // How many images go on each page - Will be overwritten by settings file
gallery.settings.showImageTitles = true; // Should image titles be displayed? - Will be overwritten by settings file
gallery.settings.doHTMLCompress = true; // Minify the exported HTML files
gallery.settings.useJavascript = true; // Minify the exported HTML files

// Gallery Info
gallery.settings.title = "My Gallery"; // Will be overwritten by settings file
gallery.settings.info = ""; // Will be overwritten by settings file

// Input Folders
gallery.settings.photosDir = "albums"; // This is where your source folder is!
gallery.settings.galleryDir = "MelonGallery"; // Utility directory we create in input albums
gallery.settings.templatesDir = "templates";

// Site Folders
gallery.settings.outputDir = "output"; // This is where the final gallery is exported to, it can be a path!
gallery.settings.thumbnailsDir = "thumbnails"; // /albums/thumbnails - Thumbnails go here
gallery.settings.imagesDir = "images"; // /albums/images - Resized web images

// DO NOT EDIT BELOW HERE
gallery.supportedFileTypes = [".png", ".jpeg", ".jpg", ".gif", ".tiff", ".webp"];
gallery.toJPEGFormats = [".jp2", ".tiff"];
gallery.singleCopyFormats = [".gif"];
// libvips is needed for jp2

// Template pages are imported here
gallery.templatePaths = [];
gallery.templatePaths.push("index.html");
gallery.templatePaths.push("gallery-page-template.html");
gallery.templatePaths.push("gallery.css");
gallery.templatePaths.push("gallery.js");

// Other filenames used by the gallery
gallery.otherFiles = {};
gallery.otherFiles.manifest = "manifest.json";

// These are vars that are expected to default every time the make runs
function resetMemory() {
    // General internal metrics and storage for processed files
    gallery.loading = {};
    gallery.loading.albums = 0;
    gallery.loading.thumbnailProcess = 0;
    gallery.loading.fileProcess = 0;

    gallery.loaded = {};
    gallery.loaded.albums = 0;
    gallery.loaded.templates = 0;
    gallery.loaded.imageProcess = 0;
    gallery.loaded.thumbnailProcess = 0;
    gallery.loaded.fileProcess = 0;

    gallery.templates = {}; // Processed template objects and their file data
    gallery.albums = []; // Processed list of album objects
    gallery.imageHashs = []; // A hash list of all source images included in the gallery

    gallery.manifest = {};
    gallery.manifest.info = {};
    gallery.manifest.info.maker = "Melon's Gallery Maker!";
    gallery.manifest.info.updated_at = getRFC2822Timestamp();
    gallery.manifest.settings = {};
    gallery.manifest.images = []; // A list of images that have actually been processed before and are up to date
    gallery.manifest.files = [];

    gallery.renderTime = DateTime.utc().toLocaleString(DateTime.DATE_MED);
}

// **** Master Make Function ****

async function make(makeData, makeCallback) {
    console.log("Starting Gallery Render!");

    resetMemory();

    // Get the user selected input and output
    gallery.settings.photosDir = makeData.input;
    gallery.settings.outputDir = makeData.output;

    loadSettings(makeData.settings);
    loadManifest();

    loadAlbums();
    await loadingWaitAlbums();

    processPhotos();
    await loadingWaitImageProcessing();

    if (gallery.albums.length < 1) {
        console.log("No albums found!");
        renderManifest(makeData.settings); // Called here incase old albums have been emptied
        makeCallback("Error - No Albums Found!");
        return;
    }

    loadTemplates();
    await loadingWaitTemplates();

    // Sort albums by name.
    gallery.albums = gallery.albums.sort(function (a, b) {
        let textA = a.name.toUpperCase();
        let textB = b.name.toUpperCase();
        return textA < textB ? -1 : textA > textB ? 1 : 0;
    });

    renderIndex();
    renderAlbums();

    await loadingWaitFileProcessing();

    renderManifest(makeData.settings);

    console.log("Done!");
    makeCallback("Render Complete! " + gallery.imageHashs.length + " Images in " + gallery.albums.length + " Albums!");
}

// **** File Loading ****

function loadSettings(file) {
    gallery.settings.title = file.title === "undefined" ? gallery.settings.title : file.title;
    gallery.settings.info = file.info === "undefined" ? gallery.settings.info : file.info;
    gallery.settings.thumbSize = file.thumbnail_size === "undefined" ? gallery.settings.thumbSize : file.thumbnail_size;
    gallery.settings.photoSize = file.image_size === "undefined" ? gallery.settings.photoSize : file.image_size;
    gallery.settings.compressionLevel = file.image_compression === "undefined" ? gallery.settings.compressionLevel : file.image_compression;
    gallery.settings.photosPerAlbumPage = file.images_per_page === "undefined" ? gallery.settings.tiphotosPerAlbumPagetle : file.images_per_page;
    gallery.settings.showImageTitles = file.show_filenames === "undefined" ? gallery.settings.showImageTitles : file.show_filenames;
    gallery.settings.doHTMLCompress = file.use_minify === "undefined" ? gallery.settings.doHTMLCompress : file.use_minify;
    gallery.settings.useJavascript = file.use_javascript === "undefined" ? gallery.settings.useJavascript : file.use_javascript;
}

function loadManifest() {
    let filepath = path.join(gallery.settings.outputDir, gallery.otherFiles.manifest);

    fs.readFile(filepath, "utf8", function (err, data) {
        if (err) {
            return console.log("Error loading manifest or no file found!: " + err);
        }
        gallery.manifest = JSON.parse(data);
        gallery.manifest.files = []; // Files are always regenerated
    });
}

// Loads in HTML template files and converts them to objects
function loadTemplates() {
    for (let filepath of gallery.templatePaths) {
        // Templates are expected in the album folder to look there!
        filepath = path.join(gallery.settings.photosDir, gallery.settings.galleryDir, gallery.settings.templatesDir, filepath);
        console.log(filepath);

        // Import template files
        fs.readFile(filepath, "utf8", function (err, data) {
            if (err) {
                return console.log("File Load Error: " + err);
            }

            let baseName = path.basename(filepath);
            let fileType = path.extname(baseName).toLowerCase();

            // Copy CSS files directly to the output
            if (fileType == ".css") {
                let cssWritePath = path.join(gallery.settings.outputDir, baseName);
                gallery.loaded.fileProcess++;
                fs.copyFileSync(filepath, cssWritePath);
                storeManifestFile(cssWritePath, baseName);
            }

            // Copy JS files directly to the output
            if (fileType == ".js" && gallery.settings.useJavascript) {
                let jsWritePath = path.join(gallery.settings.outputDir, baseName);
                gallery.loaded.fileProcess++;
                fs.copyFileSync(filepath, jsWritePath);
                storeManifestFile(jsWritePath, baseName);
            }

            // Save file data to memory
            let name = baseName.replaceAll(".", "_").replaceAll("-", "_");
            gallery.templates[name] = {};
            gallery.templates[name].name = baseName;
            gallery.templates[name].data = data;

            gallery.loaded.templates++;
        });
    }
}

// Reads albums and photo files and builds folder structure
function loadAlbums() {
    fs.readdir(gallery.settings.photosDir, function (err, albumNames) {
        if (err) {
            return console.log("Unable to scan directory: " + err);
        }

        albumNames = albumNames.filter((item) => !/(^|\/)\.[^\/\.]/g.test(item)); // Remove hidden files
        gallery.loading.albums = albumNames.length;

        albumNames.forEach(function (albumName) {
            let folderPath = path.join(gallery.settings.photosDir, albumName);

            // Make sure we are loading a folder and not a file!
            if (fs.statSync(folderPath).isFile()) {
                gallery.loaded.albums++;
                return;
            }

            // Skip the MelonGallery folder we create
            if (albumName == gallery.settings.galleryDir) {
                gallery.loaded.albums++;
                return;
            }
            // Get files in the albums folder
            fs.readdir(folderPath, function (err, files) {
                if (err) {
                    return console.log("Unable to scan directory: " + err);
                }
                files = files.filter((item) => !/(^|\/)\.[^\/\.]/g.test(item)); //Remove hidden files

                let album = {};
                album.name = albumName;
                album.safeName = htmlSafeString(albumName);
                album.webName = album.name
                    .replace(/[^a-z0-9]/gi, "-")
                    .replace(/-+/g, "-") // Removes repeating ---s
                    .toLowerCase();
                album.sourcePath = path.join(gallery.settings.photosDir, album.name);
                album.outputPath = path.join(gallery.settings.outputDir, album.webName);
                album.css = "";
                album.txt = "";
                album.files = [];

                // Generate the file structure for the albumName
                fs.ensureDirSync(album.outputPath);
                fs.ensureDirSync(path.join(album.outputPath, gallery.settings.imagesDir));
                fs.ensureDirSync(path.join(album.outputPath, gallery.settings.thumbnailsDir));

                files.forEach(function (file) {
                    let fileType = path.extname(file).toLowerCase();
                    // Custom CSS support
                    if (fileType == ".css") {
                        album.css = file;
                        fs.copyFile(path.join(album.sourcePath, album.css), path.join(album.outputPath, album.css), (err) => {
                            if (err) throw err;
                            console.log("CSS Found for albumName: " + albumName);
                        });
                        return;
                    }

                    // Custom Info File
                    if (fileType == ".txt") {
                        fs.readFile(path.join(album.sourcePath, file), "utf8", function (err, data) {
                            album.txt = data;
                        });
                        return;
                    }

                    // Unsupported file type
                    if (!gallery.supportedFileTypes.includes(fileType)) {
                        console.log("Unsupported file found: " + file);
                        return;
                    }

                    // Add supported image!
                    album.files.push(file);

                    // Log it in the storage index as a hash
                    let sourceHash = crypto
                        .createHash("sha1")
                        .update(album.name + file, "utf8")
                        .digest("base64");
                    gallery.imageHashs.push(sourceHash);
                });

                // Skip folders that have no images in them that can be included
                if (album.files < 1) {
                    console.log("Album had no images, skipping: " + albumName);
                    fs.rmSync(album.outputPath, { recursive: true, force: true });
                    gallery.loaded.albums++;
                    return;
                }

                //Sort the files to ensure they come out the same after regens.
                album.files.sort();

                gallery.albums.push(album);
                gallery.loaded.albums++;
            });
        });
    });
}

// **** Page Rendering ****

function getAlbumLinks(pathRoot) {
    let albumLinks = "";
    gallery.albums.forEach(function (album) {
        albumLinks += '<li><a href="' + pathRoot + album.webName + '">' + album.safeName + "</a></li>";
    });
    return albumLinks;
}

function renderIndex() {
    let newIndex = gallery.templates.index_html.data;

    newIndex = newIndex.replace("{ALBUMS}", getAlbumLinks(""));
    newIndex = newIndex.replaceAll("{COUNT_IMAGES}", gallery.imageHashs.length);
    newIndex = newIndex.replaceAll("{COUNT_ALBUMS}", gallery.albums.length);
    newIndex = newIndex.replaceAll("{GALLERY_TITLE}", htmlSafeString(gallery.settings.title));
    newIndex = newIndex.replaceAll("{GALLERY_INFO}", gallery.settings.info);
    newIndex = newIndex.replaceAll("{MAKER_VERSION}", "v" + process.env.npm_package_version);
    newIndex = newIndex.replaceAll("{LAST_UPDATE}", gallery.renderTime);
    newIndex = newIndex.replaceAll("{ANTI_CACHE}", getAntiCacheQuery());

    gallery.loaded.fileProcess++;
    let writePath = path.join(gallery.settings.outputDir, gallery.templates.index_html.name);
    fs.writeFile(writePath, compressHTML(newIndex), function (err) {
        if (err) {
            console.log("Index write error: " + err);
        }
        storeManifestFile(writePath, gallery.templates.index_html.name);
    });
}

//For each album, split images into chunks and then render a page for each
async function renderAlbums() {
    gallery.albums.forEach(function (album) {
        let pageCounter = 0;
        let albumChucks = _.chunk(album.files, gallery.settings.photosPerAlbumPage);

        //Create each page
        albumChucks.forEach(function (albumChunk) {
            let newPage = gallery.templates.gallery_page_template_html.data;

            //=== Title rendering
            let titleText = "";
            if (albumChucks.length > 1 && pageCounter != 0) {
                titleText = album.safeName + " - " + pageCounter;
            } else {
                titleText = album.safeName;
            }
            newPage = newPage.replaceAll("{ALBUM_TITLE}", titleText);
            newPage = newPage.replaceAll("{GALLERY_TITLE}", htmlSafeString(gallery.settings.title));

            //=== Info
            newPage = newPage.replaceAll("{ALBUM_INFO}", album.txt);
            newPage = newPage.replaceAll("{GALLERY_INFO}", gallery.settings.info);

            //=== CSS
            if (album.css != "") {
                newPage = newPage.replace("{CUSTOM_CSS}", '<link href="' + album.css + getAntiCacheQuery() + '" rel="stylesheet" type="text/css" media="all" />');
            } else {
                newPage = newPage.replace("{CUSTOM_CSS}", "");
            }

            //=== Extras
            newPage = newPage.replaceAll("{LAST_UPDATE}", gallery.renderTime);
            newPage = newPage.replaceAll("{MAKER_VERSION}", "v" + process.env.npm_package_version);
            newPage = newPage.replace("{ALBUMS}", getAlbumLinks("../"));
            newPage = newPage.replaceAll("{ANTI_CACHE}", getAntiCacheQuery());

            //=== Photo rendering
            let photosHTML = "";
            albumChunk.forEach(function (photo) {
                // After this point photo is web safe, source is lost
                photo = sanitize(photo);
                let fileType = path.extname(photo).toLowerCase();
                let baseName = photo.replace(fileType, "");
                let photoAddress = path.posix.join(gallery.settings.imagesDir, photo);

                // This section renames some files to jpg because they will later be converted to this format!
                if (gallery.toJPEGFormats.includes(fileType)) {
                    photoAddress = path.posix.join(gallery.settings.imagesDir, baseName + ".jpg");
                }

                // Thumbnail address
                let thumbAddress = path.posix.join(gallery.settings.thumbnailsDir, "thumb_" + baseName + ".jpg");
                if (gallery.singleCopyFormats.includes(fileType)) {
                    thumbAddress = path.posix.join(gallery.settings.imagesDir, photo);
                }

                // Generate HTML
                photosHTML += '<a href="' + photoAddress + '" target="_blank"><img src="' + thumbAddress + '" />';
                if (gallery.settings.showImageTitles) {
                    photosHTML += "<span>" + photo + "</span>";
                }
                photosHTML += "</a>\n";
            });
            newPage = newPage.replace("{PHOTOS}", photosHTML);

            //=== Page Links
            let pageLinks = "<span>Pages ... </span>";
            if (pageCounter > 0) {
                if (pageCounter == 1) {
                    pageLinks += '<a href="index.html">&#8592;</a> ';
                } else {
                    pageLinks += '<a href="' + (pageCounter - 1) + '.html">&#8592;</a>';
                }
            }
            pageLinks += "<ul>";
            for (let i = 0; i < albumChucks.length; i++) {
                let pageLink = i + ".html";
                if (i == 0) {
                    pageLink = "index.html";
                }
                if (i == pageCounter) {
                    pageLinks += "<li><b>" + i + "</b></li>\n";
                } else {
                    pageLinks += '<li><a href="' + pageLink + '">' + i + "</a></li>\n";
                }
            }
            pageLinks += "</ul>";
            if (pageCounter < albumChucks.length - 1) {
                pageLinks += ' <a href="' + (pageCounter + 1) + '.html">&#8594;</a>';
            }
            //Blank it out if there is only one page
            if (albumChucks.length == 1) {
                newPage = newPage.replaceAll("{PAGELINKS}", "");
            } else {
                newPage = newPage.replaceAll("{PAGELINKS}", pageLinks);
            }

            //=== File write
            let pageName = pageCounter + ".html";
            if (pageCounter == 0) {
                pageName = "index.html";
            }

            // Add JavaScript
            if (gallery.settings.useJavascript) {
                newPage = newPage.replace("</body>", '<script src="../gallery.js' + getAntiCacheQuery() + '"></script></body>');
            }

            gallery.loaded.fileProcess++;
            let writePath = path.join(album.outputPath, pageName);
            fs.writeFile(writePath, compressHTML(newPage), function (err) {
                if (err) {
                    return console.log(err);
                }
                storeManifestFile(writePath, path.posix.join(album.webName, pageName));
            });

            pageCounter++;
        });
    });
}

// Update the manifests data and write it to file
function renderManifest(makeSettings) {
    let filepath = path.join(gallery.settings.outputDir, gallery.otherFiles.manifest);
    gallery.manifest.settings = makeSettings;
    gallery.manifest.info.updated_at = getRFC2822Timestamp();

    // Remove dead images from the manifest that are no longer in the gallery - very bad method!!
    for (let i = gallery.manifest.images.length - 1; i >= 0; i--) {
        if (!gallery.imageHashs.includes(gallery.manifest.images[i].source)) {
            gallery.manifest.images.splice(i, 1);
        }
    }

    // Create an entry for the manifest! its IMPOSSIBLE to give the correct size!!
    gallery.manifest.files.push({
        path: gallery.otherFiles.manifest,
        size: -1,
        updated_at: getRFC2822Timestamp(),
    });

    fs.writeFileSync(filepath, JSON.stringify(gallery.manifest), { encoding: "utf8", flag: "w" });
}

// **** Image Processing ****

function processPhotos() {
    console.log("Starting Photo Processing!");

    // Create a list of all existing images in the manifest
    let manifestList = gallery.manifest.images.map((a) => a.path);
    // For Each Album
    gallery.albums.forEach(function (album) {
        // For Each Photo
        album.files.forEach(function (photo) {
            let sourcePath = path.join(album.sourcePath, photo);

            let sourceHash = crypto
                .createHash("sha1")
                .update(album.name + photo, "utf8")
                .digest("base64");

            // After this point the photo file is web safe format, source is lost
            photo = sanitize(photo);
            let fileType = path.extname(photo).toLowerCase();
            let resizeOpt = { width: gallery.settings.photoSize, withoutEnlargement: true };
            let resizeThumbOpt = { width: gallery.settings.thumbSize };
            let outputPath = path.join(album.outputPath, gallery.settings.imagesDir, photo);

            let manifestEntry = {
                path: path.posix.join(album.webName, gallery.settings.imagesDir, photo),
                size: -1,
                updated_at: undefined,
                source: sourceHash,
            };

            gallery.loading.imageProcess++;
            gallery.loading.thumbnailProcess++;

            // Files the need to be renamed need pretreatment
            if (gallery.toJPEGFormats.includes(fileType)) {
                // Note these files are ALWAYS converted to jpgs!
                let fileName = path.basename(photo, fileType);
                let jpegName = fileName + ".jpg";

                outputPath = path.join(album.outputPath, gallery.settings.imagesDir, jpegName);
                manifestEntry.path = path.posix.join(album.webName, gallery.settings.imagesDir, jpegName);

                if (!shouldPhotoBeProcessed(manifestEntry, manifestList)) {
                    gallery.loaded.imageProcess++;
                } else {
                    sharp(sourcePath)
                        .rotate() // Empty rotate fixes the image rotation from metadata before its removed
                        .resize(resizeOpt)
                        .toFormat("jpeg")
                        .jpeg({ quality: gallery.settings.compressionLevel, progressive: true })
                        .toFile(outputPath, (err, info) => {
                            finishImageProcess(err, info, manifestEntry);
                        });
                }
            } else {
                // Regular file processing!

                if (!shouldPhotoBeProcessed(manifestEntry, manifestList)) {
                    gallery.loaded.imageProcess++;
                } else {
                    if (fileType == ".jpg" || fileType == ".jpeg") {
                        sharp(sourcePath)
                            .rotate()
                            .resize(resizeOpt)
                            .jpeg({ quality: gallery.settings.compressionLevel, progressive: true })
                            .toFile(outputPath, (err, info) => {
                                finishImageProcess(err, info, manifestEntry);
                            });
                    } else if (fileType == ".png") {
                        sharp(sourcePath)
                            .rotate()
                            .resize(resizeOpt)
                            .png({ quality: gallery.settings.compressionLevel, progressive: true })
                            .toFile(outputPath, (err, info) => {
                                finishImageProcess(err, info, manifestEntry);
                            });
                    } else if (fileType == ".webp") {
                        sharp(sourcePath)
                            .rotate()
                            .resize(resizeOpt)
                            .webp({ quality: gallery.settings.compressionLevel })
                            .toFile(outputPath, (err, info) => {
                                finishImageProcess(err, info, manifestEntry);
                            });
                    } else if (gallery.singleCopyFormats.includes(fileType)) {
                        // Note gifs are not resized
                        fs.copyFile(sourcePath, outputPath, (err) => {
                            if (err) {
                                gallery.loaded.imageProcess++;
                                console.log("Single Copy Error: ", err);
                                return;
                            }
                            // Gif needs its own finish handling
                            fs.stat(outputPath, (err2, stats) => {
                                gallery.loaded.imageProcess++;
                                if (err2) {
                                    console.log("GIF Stat Error: ", err);
                                } else {
                                    manifestEntry.updated_at = getRFC2822Timestamp();
                                    manifestEntry.size = stats.size;

                                    updateOrAddToManifest(manifestEntry);
                                }
                            });
                        });
                    }
                }
            }

            // Thumbnail! - GIFs are not processed
            if (gallery.singleCopyFormats.includes(fileType)) {
                gallery.loaded.thumbnailProcess++;
            } else {
                let baseName = photo.replace(fileType, "");
                let thumbName = "thumb_" + baseName + ".jpg";
                let outputThumbPath = path.join(album.outputPath, gallery.settings.thumbnailsDir, thumbName);

                let manifestEntryThumb = {
                    path: path.posix.join(album.webName, gallery.settings.thumbnailsDir, thumbName),
                    size: -1,
                    updated_at: undefined,
                    source: sourceHash,
                };

                if (!shouldThumbnailBeProcessed(manifestEntryThumb, manifestList)) {
                    gallery.loaded.thumbnailProcess++;
                } else {
                    sharp(sourcePath)
                        .rotate()
                        .resize(resizeThumbOpt)
                        .jpeg({ quality: 75, progressive: true })
                        .toFile(outputThumbPath, (err, info) => {
                            gallery.loaded.thumbnailProcess++;
                            if (err) {
                                console.log("Thumb-error: " + outputPath + " | " + err);
                                return;
                            }
                            manifestEntryThumb.updated_at = getRFC2822Timestamp();
                            manifestEntryThumb.size = info.size;

                            updateOrAddToManifest(manifestEntryThumb);
                        });
                }
            }
        });
    });
}

function finishImageProcess(error, info, manifestEntry) {
    gallery.loaded.imageProcess++;
    if (error) {
        console.log("Image Error: " + outputPath + " | " + err);
        return;
    }
    manifestEntry.updated_at = getRFC2822Timestamp();
    manifestEntry.size = info.size;

    updateOrAddToManifest(manifestEntry);
}

function updateOrAddToManifest(entry) {
    // Update the old entry or add a new one
    let oldIndex = gallery.manifest.images.findIndex((x) => x.path == entry.path);
    if (oldIndex == -1) {
        gallery.manifest.images.push(entry);
    } else {
        gallery.manifest.images[oldIndex] = entry;
    }
}

function shouldPhotoBeProcessed(photoManifestEntry, manifestList) {
    // First time render
    if (gallery.manifest.settings == undefined) {
        return true;
    }
    // If image settings have changed, always redo
    if (gallery.manifest.settings.image_size != gallery.settings.photoSize) {
        return true;
    }
    if (gallery.manifest.settings.image_compression != gallery.settings.compressionLevel) {
        return true;
    }
    // Settings are the same, so check manifest
    if (manifestList.includes(photoManifestEntry.path)) {
        return false;
    }
    // Its not in the manifest!
    return true;
}

function shouldThumbnailBeProcessed(thumbnailManifestEntry, manifestList) {
    // First time render
    if (gallery.manifest.settings == undefined) {
        return true;
    }
    // If image settings have changed, always redo
    if (gallery.manifest.settings.thumbnail_size != gallery.settings.thumbSize) {
        return true;
    }
    // Settings are the same, so check manifest
    if (manifestList.includes(thumbnailManifestEntry.path)) {
        return false;
    }
    // Its not in the manifest!
    return true;
}

// **** Helper Functions ****

function storeManifestFile(writePath, localPath) {
    fs.stat(writePath, (err, stats) => {
        if (err) {
            console.log("Stat Error: ", err);
        } else {
            let manifestEntry = {
                path: localPath,
                size: stats.size,
                updated_at: getRFC2822Timestamp(),
            };
            gallery.manifest.files.push(manifestEntry);
        }
    });
}

function htmlSafeString(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getRFC2822Timestamp() {
    const now = DateTime.utc();
    return now.toRFC2822();
}

function getAntiCacheQuery() {
    return "?v=" + DateTime.now().toUnixInteger();
}

function compressHTML(html) {
    if (!gallery.settings.doHTMLCompress) {
        return html;
    }

    return minify(html, {
        collapseWhitespace: true,
        removeComments: true,
        collapseBooleanAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeOptionalTags: true,
        minifyJS: true,
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadingWaitFileProcessing() {
    while (gallery.manifest.files.length < gallery.loaded.fileProcess || gallery.manifest.files.length == 0) {
        await sleep(1000);
    }
    console.log("Files Processed: " + gallery.manifest.files.length);
    return;
}

async function loadingWaitImageProcessing() {
    while (gallery.loading.imageProcess != gallery.loaded.imageProcess && gallery.loading.thumbnailProcess != gallery.loaded.thumbnailProcess) {
        await sleep(1000);
    }
    console.log("Images Processed: " + gallery.loaded.imageProcess + " / Thumbnails: " + gallery.loaded.thumbnailProcess);
    return;
}

async function loadingWaitTemplates() {
    while (gallery.loaded.templates < gallery.templatePaths.length) {
        await sleep(1000);
    }
    console.log("Templates Loaded: " + gallery.loaded.templates + "/" + gallery.templatePaths.length);
    return;
}

async function loadingWaitAlbums() {
    while (gallery.loading.albums == 0 || gallery.loading.albums != gallery.loaded.albums) {
        await sleep(1000);
    }
    console.log("Albums Loaded: " + gallery.loaded.albums + "/" + gallery.loading.albums);
    return;
}

module.exports = {
    make: function (makeData, makeCallback) {
        return make(makeData, makeCallback);
    },
};
