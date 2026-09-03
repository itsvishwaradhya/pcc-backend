import mongoose from "mongoose";
import config from "./config.js";

const connectDB = async () => {
    try{
        await mongoose.connect(config.MONGO_URI);
        console.log("Mongo DB connected successfully");
    }catch(error){
        if(config.NODE_ENV === "dev"){
            console.error("Failed to connect to mongodb")
        }
    }
}

export default connectDB;