#!/usr/bin/env node

import mysql from 'mysql2/promise';
import fs from 'fs';

// 🎨 Color configuration for logging
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// 📝 Logger utility
const logger = {
    info: (message) => console.log(`${colors.cyan}ℹ️ ${message}${colors.reset}`),
    success: (message) => console.log(`${colors.green}✅ ${message}${colors.reset}`),
    warning: (message) => console.log(`${colors.yellow}⚠️ ${message}${colors.reset}`),
    error: (message) => console.log(`${colors.red}❌ ${message}${colors.reset}`),
    debug: (message) => console.log(`${colors.magenta}🐛 ${message}${colors.reset}`)
};

// 🔧 Configuration
const CONFIG = {
    CHUNK_SIZE: 15,
    OUTPUT_FILE: '/opt/exports/drivers_export.csv',
    TABLE_NAME: 'drivers'
};

/**
 * Escape CSV values according to RFC 4180
 */
function escapeCsvValue(value) {
    if (value === null || value === undefined) {
        return '';
    }

    const stringValue = String(value);

    // Escape double quotes by doubling them and wrap in quotes if contains special characters
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}

/**
 * Format row as CSV line
 */
function formatCsvRow(row) {
    return Object.values(row).map(escapeCsvValue).join(',') + '\n';
}

/**
 * Get database connection configuration from environment variables
 */
function getDbConfig() {
    const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    return {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'logistic_db',
        charset: 'utf8mb4',
        timezone: 'Z',
        connectionLimit: 1,
        acquireTimeout: 60000,
        timeout: 60000
    };
}

/**
 * Main export function
 */
async function exportTableToCSV() {
    let connection = null;
    let fileHandle = null;
    let totalExported = 0;

    try {
        logger.info('🚀 Starting CSV export process...');

        // 📊 Validate database connection
        const dbConfig = getDbConfig();
        logger.info(`🔌 Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

        connection = await mysql.createConnection(dbConfig);

        // 🧪 Test connection and table existence
        logger.info('🔍 Checking if table exists...');
        const [tables] = await connection.execute(
            `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = ?`,
            [dbConfig.database, CONFIG.TABLE_NAME]
        );

        if (tables[0].count === 0) {
            throw new Error(`Table '${CONFIG.TABLE_NAME}' does not exist in database '${dbConfig.database}'`);
        }

        // 📁 Create output file
        logger.info(`📄 Creating output file: ${CONFIG.OUTPUT_FILE}`);
        fileHandle = await fs.promises.open(CONFIG.OUTPUT_FILE, 'w');

        // 📋 Get column names for CSV header
        logger.info('📊 Retrieving table structure...');
        const [columns] = await connection.execute(
            `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
       ORDER BY ORDINAL_POSITION`,
            [dbConfig.database, CONFIG.TABLE_NAME]
        );

        if (columns.length === 0) {
            throw new Error(`No columns found for table '${CONFIG.TABLE_NAME}'`);
        }

        const columnNames = columns.map(col => col.COLUMN_NAME);
        const headerRow = columnNames.map(escapeCsvValue).join(',') + '\n';

        // ✍️ Write CSV header
        await fileHandle.write(headerRow);
        logger.success(`📝 CSV header written with ${columnNames.length} columns`);

        // 🔢 Get total row count for progress tracking
        logger.info('📈 Counting total rows...');
        const [countResult] = await connection.execute(
            `SELECT COUNT(*) as total FROM ${CONFIG.TABLE_NAME}`
        );
        const totalRows = countResult[0].total;
        logger.info(`📊 Total rows to export: ${totalRows}`);

        if (totalRows === 0) {
            logger.warning('⚠️ Table is empty, exporting only headers');
            await fileHandle.close();
            logger.success('🎉 Export completed successfully (empty table)');
            return;
        }

        // 🔄 Stream data in chunks
        let offset = 0;

        while (offset < totalRows) {
            logger.debug(`📦 Processing chunk: ${offset} - ${Math.min(offset + CONFIG.CHUNK_SIZE, totalRows)}`);

            const [rows] = await connection.execute(
                `SELECT * FROM ${CONFIG.TABLE_NAME} LIMIT ${CONFIG.CHUNK_SIZE} OFFSET ${offset}`
            );

            if (rows.length === 0) {
                break;
            }

            // 📝 Write rows to CSV
            const csvLines = rows.map(formatCsvRow).join('');
            await fileHandle.write(csvLines);

            totalExported += rows.length;
            const progress = ((totalExported / totalRows) * 100).toFixed(1);

            logger.info(`📊 Progress: ${totalExported}/${totalRows} (${progress}%)`);

            offset += CONFIG.CHUNK_SIZE;

            // 🎛️ Add small delay to prevent overwhelming the database
            if (offset < totalRows) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // ✅ Finalize
        await fileHandle.close();
        await connection.end();

        logger.success(`🎉 Export completed successfully!`);
        logger.success(`📁 File: ${CONFIG.OUTPUT_FILE}`);
        logger.success(`📊 Total records exported: ${totalExported}`);

    } catch (error) {
        // 🚨 Error handling with proper cleanup
        logger.error(`💥 Export failed: ${error.message}`);
        logger.error(error.stack);

        // 🧹 Cleanup resources
        try {
            if (fileHandle) {
                await fileHandle.close();
            }
            if (connection) {
                await connection.end();
            }
        } catch (cleanupError) {
            logger.error(`🔥 Cleanup failed: ${cleanupError.message}`);
        }

        process.exit(1);
    }
}

/**
 * Graceful shutdown handler
 */
function setupShutdownHandlers() {
    const shutdown = async (signal) => {
        logger.warning(`\n${signal} received, starting graceful shutdown...`);
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // 🚨 Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error(`💥 Uncaught Exception: ${error.message}`);
        logger.error(error.stack);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error(`💥 Unhandled Rejection at: ${promise}, reason: ${reason}`);
        process.exit(1);
    });
}

/**
 * Main execution function
 */
async function main() {
    try {
        setupShutdownHandlers();
        await exportTableToCSV();
    } catch (error) {
        logger.error(`💥 Fatal error: ${error.message}`);
        process.exit(1);
    }
}

// 🚀 Start the application
main();
