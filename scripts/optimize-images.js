/**
 * Image optimization script
 * Resizes large PNG images in /public to reasonable dimensions
 * Run with: node scripts/optimize-images.js
 *
 * Requires: npm install --save-dev sharp
 */
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");

const targets = [
    {
        file: "logo.png",
        maxWidth: 512,
        reason: "Displayed at 160x48, 512px provides 3.2x for retina",
    },
    {
        file: "personalicon.png",
        maxWidth: 800,
        reason: "Not currently used in code, 800px is generous",
    },
];

async function optimizeImages() {
    const sharp = require("sharp");

    for (const target of targets) {
        const filePath = path.join(publicDir, target.file);
        if (!fs.existsSync(filePath)) {
            console.log("Skipping " + target.file + ": file not found");
            continue;
        }

        const sizeBefore = fs.statSync(filePath).size;
        console.log(
            target.file + ": " + (sizeBefore / 1024 / 1024).toFixed(2) + " MB"
        );

        try {
            const tempPath = filePath + ".tmp";
            await sharp(filePath)
                .resize({ width: target.maxWidth })
                .png({ quality: 85, compressionLevel: 9 })
                .toFile(tempPath);

            fs.renameSync(tempPath, filePath);
            const sizeAfter = fs.statSync(filePath).size;
            const reduction = Math.round(
                (1 - sizeAfter / sizeBefore) * 100
            );
            console.log(
                "  -> " +
                    (sizeAfter / 1024).toFixed(0) +
                    " KB (" +
                    reduction +
                    "% reduction)"
            );
            console.log("  Reason: " + target.reason);
        } catch (e) {
            console.log("  Failed to optimize: " + e.message);
        }
    }
}

optimizeImages().catch(console.error);
