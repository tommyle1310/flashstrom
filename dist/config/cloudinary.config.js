"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_1 = require("cloudinary");
const dotenv = require("dotenv");
dotenv.config();
console.log(process.env.CLOUDINARY_API_KEY);
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
exports.default = cloudinary_1.v2;
//# sourceMappingURL=cloudinary.config.js.map