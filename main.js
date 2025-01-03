import fs from 'fs';
import YAML from 'js-yaml';
import pLimit from 'p-limit';


const config = {
    concurrencyLimit: 10,
    responseThresholdInMs: 500,
    waitTimeInSeconds: 15,
}

let isShuttingDown = false;
const limit = pLimit(config.concurrencyLimit);

function getDomain(url) {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname;
    } catch (err) {
        console.error(`Invalid URL: ${url} - ${err.message}`);
        return null;
    }
}

async function performHealthChecks(inputObject, healthchecks) {
    const checkPromises = inputObject.map((endpoint) =>
        limit(async () => {
            if (!endpoint.domain) return;

            try {
                const response = await fetch(endpoint.url, {
                    method: endpoint.method || 'GET',
                    headers: endpoint.headers || {},
                    body: endpoint.body || null,
                    signal: AbortSignal.timeout(config.responseThresholdInMs), // Automatically fails requests after threshold is exceeded
                    keepalive: true, // default
                });

                if (response.ok) {
                    healthchecks[endpoint.domain].up += 1;
                } else {
                    healthchecks[endpoint.domain].down += 1;
                }
            } catch (err) {
                if (err.name === 'AbortError') {
                    // Log Aborted connections
                    // console.error(
                    //     `Request Timeout for ${endpoint.url} (${config.responseThresholdInMs}ms) (error: ${err.message})`
                    // );
                } else {
                    console.error(`Request failed: ${err.message}`);
                }
                healthchecks[endpoint.domain].down += 1;
            }
        })
    );

    await Promise.all(checkPromises);

    for (const [domain, stats] of Object.entries(healthchecks)) {
        const total = stats.up + stats.down;
        const availability = total > 0 ? Math.round((stats.up / total) * 100) : "0";
        console.log(`${domain} has ${availability}% availability percentage`);
    }
}

async function shutdown() {
    if (isShuttingDown) return; // Prevent multiple shutdowns
    isShuttingDown = true;

    console.log("\nexiting...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("complete.");
    process.exit(0);
};

// Capture termination signals
process.on('SIGINT', shutdown); // Ctrl+C
process.on('SIGTERM', shutdown); // Terminal Signal

async function main() {
    const args = process.argv.slice(2);

    // Check if the file path is provided
    const filePath = args[0];
    if (!filePath) {
        console.error("Error: No file path provided.");
        process.exit(1);
    }

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        console.error(`Error: No such file: ${filePath}`);
        process.exit(1);
    }

    // Read the YAML file
    let inputObject;
    try {
        const inputYAML = fs.readFileSync(filePath, { encoding: "utf-8" });
        inputObject = YAML.load(inputYAML);
    } catch (err) {
        console.error("Error parsing YAML:", err.message);
        process.exit(1);
    }

    // Validate YAML structure
    if (!Array.isArray(inputObject)) {
        console.error("Error: YAML Input must be a list of endpoints.");
        process.exit(1);
    }

    // Initialize domains for healthchecks
    const healthchecks = {};

    for (const endpoint of inputObject) {
        endpoint.domain = getDomain(endpoint.url);
        if (endpoint.domain) {
            healthchecks[endpoint.domain] = { up: 0, down: 0 };
        }
    }

    console.log("Cumulative Availability:");

    // Run the first health check immediately
    await performHealthChecks(inputObject, healthchecks);

    // Periodic health checks
    setInterval(async () => {
        await performHealthChecks(inputObject, healthchecks);
    }, config.waitTimeInSeconds * 1000);
}

main();
