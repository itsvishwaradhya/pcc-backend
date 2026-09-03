import dotenv from "dotenv";

dotenv.config();

if(!process.env.NODE_ENV){
    throw new Error("NODE_ENV is not defined");
    process.exit(1);
}

if(!process.env.PORT){
    throw new Error("PORT is not defined");
    process.exit(1);
}

if(!process.env.JWT_SECRET){
    throw new Error("JWT_SECRET is not defined");
    process.exit(1);
}

if(!process.env.MONGO_URI){
    throw new Error("MONGO_URI is not defined");
    process.exit(1);
}


const config = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT || 5000,
    JWT_SECRET: process.env.JWT_SECRET,
    MONGO_URI: process.env.MONGO_URI,    
}

export default config;