module.exports = {
    apps : [
        {
            name: "account-server",
            cwd: "./account-server",
            script: "./dist/bin/index.js"
        },
        {
            name: "asset-bundles",
            cwd: "./assets",
            script: "./index.js"
        },
        {
            name: "hindenburg",
            cwd: "./Hindenburg",
            script: "./dist/bin/worker.js"
        }
    ]
};