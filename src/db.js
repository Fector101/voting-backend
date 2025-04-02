const mongoose = require('mongoose')

let cachedDB = null;
const uri = process.env.MONGODB_URI
if (!uri){
    throw new Error('Please add URI to env vars')
}

async function connectToDatabase() {
    if(cachedDB){
        console.log('Using Cache DB connection')
        return cachedDB
    }
    console.log('Creating new DB connection')
    try{
        cachedDB = await mongoose.connect( uri )
        return cachedDB
    }catch(err){
        console.error('Error connecting to DB', err)
        return null
    }
    
}


module.exports = connectToDatabase
