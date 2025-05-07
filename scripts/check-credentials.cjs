#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// Patterns that might indicate hardcoded credentials
const CREDENTIAL_PATTERNS = [
    {
        pattern: /['"]([A-Za-z0-9-_]{20,})\.([A-Za-z0-9-_]{20,})\.([A-Za-z0-9-_]{20,})['"]/, // Stricter JWT pattern
        description: 'JWT token'
    },
    // {
    //     pattern: /['"](?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?['"]/, // Base64 pattern
    //     description: 'Possible Base64-encoded secret'
    // },
    {
        pattern: /supabase.*key.*['"][^'"]+['"]/, // Supabase key pattern
        description: 'Supabase key'
    },
    {
        pattern: /password.*['"][^'"]+['"]/, // Password pattern
        description: 'Hardcoded password'
    },
    {
        pattern: /secret.*['"][^'"]+['"]/, // Secret pattern
        description: 'Hardcoded secret'
    },
    {
        pattern: /api[_-]?key.*['"][^'"]+['"]/, // API key pattern
        description: 'API key'
    }
];

// Files and directories to ignore
const IGNORED = [
    'node_modules',
    'dist',
    'build',
    '.git',
    'package-lock.json',
    '.env',
    '*.min.js',
    '*.test.js',
    '*.spec.js'
];

async function getGitStagedFiles() {
    try {
        const { stdout } = await exec('git diff --cached --name-only');
        return stdout.split('\n').filter(Boolean);
    } catch (error) {
        console.error('Error getting staged files:', error);
        process.exit(1);
    }
}

function shouldIgnoreFile(filePath) {
    return IGNORED.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(filePath);
        }
        return filePath.includes(pattern);
    });
}

function checkFileForCredentials(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        let foundCredentials = false;

        lines.forEach((line, index) => {
            CREDENTIAL_PATTERNS.forEach(({ pattern, description }) => {
                if (pattern.test(line)) {
                    console.error(
                        `\x1b[31mWarning: Possible ${description} found in ${filePath}:${index + 1}\x1b[0m`
                    );
                    console.error(`Line: ${line.trim()}`);
                    foundCredentials = true;
                }
            });
        });

        return foundCredentials;
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return false;
    }
}

async function main() {
    const stagedFiles = await getGitStagedFiles();
    let foundCredentials = false;

    for (const file of stagedFiles) {
        if (!shouldIgnoreFile(file) && fs.existsSync(file)) {
            if (checkFileForCredentials(file)) {
                foundCredentials = true;
            }
        }
    }

    if (foundCredentials) {
        console.error('\n\x1b[31mError: Potential hardcoded credentials found in staged files.\x1b[0m');
        console.error('Please remove any hardcoded credentials and use environment variables instead.');
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
}); 