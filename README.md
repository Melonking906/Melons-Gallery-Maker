# Melon's Gallery Maker
A little static HTML gallery generator!

* Info Page: https://melonking.net/melon?z=/free/software/gallery-maker
* Forum Thread: https://forum.melonland.net/index.php?topic=2088

## How to build:
* Ensure Node.js 18+ is installed on your system
* Clone the repository and open a Git Bash/Terminal within the repo root
* Run: `corepack enable` as admin
* Run: `yarn install`
* Run: `yarn run start` to open a test build
* AND/OR Run: `yarn run dist` to build an final executable for your system
* Check the "dist" folder for your new exe/app

## Troubleshooting:
JavaScript Error related to the "sharp" package:
* Linux users: Run `apt install libvips` before trying to run the AppImage
* Mac users: Run `brew install vips` before trying to run the app
