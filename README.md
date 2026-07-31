# Melon's Gallery Maker
A little static HTML gallery generator for self hosted and Neocities sites!

* Wiki Pgae: https://wiki.melonland.net/gallery_maker
* Info Page: https://melonking.net/melon?z=/free/software/gallery-maker
* Forum Thread: https://forum.melonland.net/index.php?topic=2088

## How to build:
* Ensure Node.js 20+ is installed on your system
* Clone the repository and open a Git Bash/Terminal within the repo root
* Run: `corepack enable` as admin
* Run: `yarn install`
* Run: `yarn run start` to open a test build
* AND/OR Run: `yarn run dist` to build an final executable for your system
* Check the "dist" folder for your new exe/app

NOTE: Some Node installers (like MacPorts) don't have corepack if that's the case do `node .yarn/releases/yarn-3.6.3.cjs start` etc instead

## Legacy Build Notes
Edit package.json versions to these numbers for legacy builds:
* NodeJS 24 for Mac 10.9+ - https://github.com/Wowfunhappy/Node-24-Mavericks
* NodeJS 20 for Windows 7 - https://github.com/vladimir-andreevich/node.js-windows-7

* Mac OSX 10.13 (NodeJS 24.6.0 custom) - electron 26.6.10, sharp 0.32.6 - dmg will fail, zip build works

## Nekoweb Node
Basic nekoweb support exists in this project, but their API is just not developed enough to make it easy to finish, plus I dont use nekoweb! So if anyone wants to finish support for NW, feel free to do it and issue a pull request!

## Troubleshooting:
JavaScript Error related to the "sharp" package:
* Linux users: Run `apt install libvips` before trying to run the AppImage
