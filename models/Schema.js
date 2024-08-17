const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    url: String,
    scrapedData: Object,
    analysis: Object,
});

module.exports = mongoose.model('Schema', dataSchema);
