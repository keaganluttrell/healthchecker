import fs from 'fs';
import YAML from 'js-yaml';

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
    const checkPromises = inputObject.map(async (endpoint) => {
        if (!endpoint.domain) return; // Skip invalid domains

        try {
            const start = Date.now();
            const response = await fetch(endpoint.url, {
                method: endpoint.method || 'GET',
                headers: endpoint.headers || {},
                body: endpoint.body || null,
            });
            const latency = Date.now() - start;

            if (response.ok && latency < 500) {
                healthchecks[endpoint.domain].up += 1;
            } else {
                healthchecks[endpoint.domain].down += 1;
            }
        } catch (err) {
            healthchecks[endpoint.domain].down += 1;
            console.error(`Unable to complete request. ${endpoint.domain} is DOWN (error: ${err.message})`);
        }
    });

    await Promise.all(checkPromises);

    // Log cumulative availability
    for (const [domain, stats] of Object.entries(healthchecks)) {
        const total = stats.up + stats.down;
        const availability = total > 0 ? ((stats.up / total) * 100).toFixed(2) : "0.00";
        console.log(`${domain} has ${availability}% availability percentage`);
    }
}


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

    // Initialize healthchecks and domains
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
    }, 15000);
}

main().catch((err) => {
    console.error("An unexpected error occurred:", err.message);
    process.exit(1);
});
