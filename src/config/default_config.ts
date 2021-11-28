// The "default" configuration file
// Rename to "config.ts" to get your app to build
export default {
    PORT: 80,
    RUN_HTTPS: false,
    HOSTNAME: "localhost",
    CERT: {
        KEY_PATH: "<path to private key>",
        CERT_PATH: "<path to public key>"
    },
    SIGNALING_PATH: "/api/signaling/"
}