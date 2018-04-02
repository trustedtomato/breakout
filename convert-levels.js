const txtToBin = require('./level-txt-to-bin');
const fs = require('fs');
const path = require('path');

const levelDir = path.resolve(__dirname, 'levels');
fs.readdir(levelDir, (err, files) => {
    if(err) return console.error(err);
    for(const file of files){
        if(file.endsWith('.txt')){
            const p = path.resolve(levelDir, file);
            fs.readFile(p, 'utf8', (err, data) => {
                if(err) return console.error(err);
                fs.writeFile(p.match(/(.*)\.txt/)[1], txtToBin(data), (err, data) => {
                    if(err) return console.error(err);
                });
            })
        }
    }
});