const path = require("path");

module.exports = {
    entry: ["./index.js"],
    mode: "development",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js"
    },
    devServer: {
        static: [
            {
                directory: path.resolve(__dirname, "dist"),
            },
            {
                directory: path.resolve(__dirname),
                publicPath: "/",
            },
        ],
        port: 3000, // Port to run the server
        open: true, // Automatically open the browser
        hot: true,  // Enable hot module replacement
        allowedHosts: "all",
    },
};
