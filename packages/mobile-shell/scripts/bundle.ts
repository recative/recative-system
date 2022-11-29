const archiver = require('archiver');
const { ensureDirSync } = require('fs-extra');
const { createWriteStream, existsSync } = require('fs');
const { join } = require('path');

const ANDROID_ROOT_PATH = './android/app/src/main/assets/public';
const IOS_ROOT_PATH = './ios/App/App/public';
const CORDOVA_ENTRANCE = 'cordova_plugins.js';

let cordovaPath: string;

if (existsSync(join(ANDROID_ROOT_PATH, CORDOVA_ENTRANCE))) {
    cordovaPath = ANDROID_ROOT_PATH;
} else if (existsSync(join(IOS_ROOT_PATH, CORDOVA_ENTRANCE))) {
    cordovaPath = IOS_ROOT_PATH;
} else {
    console.error(`Cannot find ${CORDOVA_ENTRANCE}`);
    process.exit(1);
}

const main = () => {
    // Ensure the dist directory exists
    ensureDirSync('dist');

    // Bundle the content of the build path to a zip file, output it into the dist folder
    const output = archiver('zip', {
        zlib: { level: 0 }
    });

    output.pipe(
        // Create a file stream to write the zip file to
        createWriteStream(`dist/mobile-web-root.zip`)
    );

    // Add the files to the zip file
    output.directory('build', '/');

    // Add Cordova plugins
    output.directory(join(cordovaPath, 'plugins'), '/plugins');
    output.file(join(cordovaPath, 'cordova.js'), { name: 'cordova.js' });
    output.file(join(cordovaPath, 'cordova_plugins.js'), { name: 'cordova_plugins.js' });

    // Finalize the zip file
    output.finalize();

    // Log the size of the zip file
    output.on('finish', () => {
        console.log(`Zip file size: ${output.pointer()} bytes`);
    });

    // Log any errors that occur
    output.on('error', (err: unknown) => {
        console.error(err);
    });
}

main();

export {};