const archiver = require('archiver');
const { ensureDirSync } = require('fs-extra');
const { createWriteStream } = require('fs');

const main = () => {
    // Ensure the dist directory exists
    ensureDirSync('dist');

    // Bundle the content of the build path to a zip file, output it into the dist folder
    const output = archiver('zip', {
        zlib: { level: 0 }
    });

    output.pipe(
        // Create a file stream to write the zip file to
        createWriteStream(`dist/web-web-root.zip`)
    );

    // Add the files to the zip file
    output.directory('build', '/');

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