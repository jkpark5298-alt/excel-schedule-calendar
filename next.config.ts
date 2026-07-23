import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "dommatrix", "tesseract.js"],
};

export default nextConfig;
