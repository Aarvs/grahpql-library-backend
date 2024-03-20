const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        minlength: 4
    },

    password: {
        type: String,
        required: true,
        minlength: 8
    },

    favouriteGenre: {
        type: String,
        required: true,
    }
})

module.exports = mongoose.model('User', schema)