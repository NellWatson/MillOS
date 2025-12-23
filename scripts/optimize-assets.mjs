#!/usr/bin/env node
/**
 * GLB/GLTF Asset Optimization Script
 *
 * Compresses 3D models using gltf-transform with Draco compression.
 * Reduces file sizes by ~80-95% while maintaining visual quality.
 *
 * Prerequisites:
 *   npm install -D @gltf-transform/cli
 *
 * Usage:
 *   npm run optimize-assets
 *   npm run optimize-assets -- --dry-run
 */

import { execSync } from 'child_process';
import { readdirSync, statSync, existsSync, copyFileSync, unlinkSync } from 'fs';
import { join, basename } from 'path';

const MODELS_DIR = 'public/models';
const BACKUP_SUFFIX = '.backup.glb';

// Recursively find all .glb files in a directory
function findGlbFiles(dir, fileList = []) {
    if (!existsSync(dir)) return fileList;

    const files = readdirSync(dir);

    files.forEach(file => {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
            findGlbFiles(filePath, fileList);
        } else if (file.endsWith('.glb') && !file.includes('.backup') && !file.includes('.temp')) {
            // Store relative path from MODELS_DIR
            // filePath is public/models/subdir/file.glb
            // we want subdir/file.glb
            // join(MODELS_DIR) gives public/models
            // path.relative is cleaner but we can just slice if we know the structure
            // Let's use relative path logic for safety
            const relativePath = filePath.substring(MODELS_DIR.length + 1); // +1 for separator
            fileList.push(relativePath);
        }
    });

    return fileList;
}

// Models to optimize (dynamically found)
const MODELS_TO_OPTIMIZE = findGlbFiles(MODELS_DIR);

// Minimum size to bother compressing (100KB)
const MIN_SIZE_BYTES = 100 * 1024;

function checkGltfTransformInstalled() {
    try {
        execSync('npx gltf-transform --version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function formatSize(bytes) {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
}

function optimizeModel(modelPath, dryRun = false) {
    const fullPath = join(MODELS_DIR, modelPath);

    if (!existsSync(fullPath)) {
        console.log(`  [skip] ${modelPath} - file not found`);
        return { skipped: true, reason: 'not found' };
    }

    const inputSize = statSync(fullPath).size;

    if (inputSize < MIN_SIZE_BYTES) {
        console.log(`  [skip] ${modelPath} - already small (${formatSize(inputSize)})`);
        return { skipped: true, reason: 'already small' };
    }

    console.log(`  [optimize] ${modelPath} (${formatSize(inputSize)})`);

    if (dryRun) {
        console.log(`    [dry-run] Would compress with Draco`);
        return { dryRun: true };
    }

    const backupPath = fullPath + BACKUP_SUFFIX;
    const tempPath = fullPath + '.temp.glb';

    try {
        // Backup original
        copyFileSync(fullPath, backupPath);

        // Run gltf-transform with full optimization pipeline:
        // - Draco: Apply Draco geometry compression
        // - texture-compress webp: Convert textures to WebP format (~75% smaller)
        // - texture-size 512: Resize textures to max 512px (reasonable for game assets)
        const cmd = `npx gltf-transform optimize "${fullPath}" "${tempPath}" --compress draco --texture-compress webp --texture-size 512`;

        console.log(`    Running: ${cmd}`);
        execSync(cmd, { stdio: 'pipe' });

        // Check output size
        const outputSize = statSync(tempPath).size;
        const savings = ((1 - outputSize / inputSize) * 100).toFixed(1);

        // Only keep compressed if it's actually smaller
        if (outputSize < inputSize) {
            // Replace original with compressed
            unlinkSync(fullPath);
            copyFileSync(tempPath, fullPath);
            unlinkSync(tempPath);

            console.log(`    ${formatSize(inputSize)} → ${formatSize(outputSize)} (${savings}% smaller)`);
            return { success: true, inputSize, outputSize, savings };
        } else {
            // Revert - compression made it larger (unlikely but possible with small files)
            unlinkSync(tempPath);
            console.log(`    [revert] Compression increased size, keeping original`);
            return { reverted: true };
        }
    } catch (err) {
        // Restore from backup on error
        if (existsSync(backupPath)) {
            copyFileSync(backupPath, fullPath);
        }
        if (existsSync(tempPath)) {
            unlinkSync(tempPath);
        }
        console.error(`    [error] Failed: ${err.message}`);
        return { error: true, message: err.message };
    }
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    console.log('=== GLB Asset Optimization (Draco Compression) ===\n');

    // Check for gltf-transform
    if (!checkGltfTransformInstalled()) {
        console.error('Error: @gltf-transform/cli not found. Please install:');
        console.error('  npm install -D @gltf-transform/cli');
        process.exit(1);
    }

    console.log(`Processing ${MODELS_TO_OPTIMIZE.length} models...\n`);

    const stats = { success: 0, skipped: 0, error: 0, totalSaved: 0 };

    for (const modelPath of MODELS_TO_OPTIMIZE) {
        const result = optimizeModel(modelPath, dryRun);

        if (result.success) {
            stats.success++;
            stats.totalSaved += result.inputSize - result.outputSize;
        } else if (result.skipped || result.dryRun || result.reverted) {
            stats.skipped++;
        } else if (result.error) {
            stats.error++;
        }
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Optimized: ${stats.success}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.error}`);
    if (stats.totalSaved > 0) {
        console.log(`Total saved: ${formatSize(stats.totalSaved)}`);
    }

    if (dryRun) {
        console.log('\n(Dry run - no files were modified)');
    } else if (stats.success > 0) {
        console.log('\nBackup files created with .backup.glb suffix.');
        console.log('Delete backups after verifying models work correctly.');
    }
}

main().catch(console.error);
