/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images.dog.ceo",
                port: "",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "cdn2.thecatapi.com",
                port: "",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "25.media.tumblr.com",
                port: "",
                pathname: "/**",
            },
        ],
    },
};

module.exports = nextConfig;
