const fs = require('fs')
const express = require('express')
var glob = require("glob")
const { InMemoryDatabase } = require('in-memory-database');

const app = express();
const router = express.Router()

const db = new InMemoryDatabase();

//Default tags
db.set('tags', ["Seperated"] )

var MAIN_FOLDER = ""
var MAIN_FILTER = "jpg|mp4"
const MAIN_PORT = 80

//Functions
var stringToColour = function(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var colour = '#';
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
}
function padZero(str, len) {
    len = len || 2;
    var zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
}
function invertColor(hex) {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
    var r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
        g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
        b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
    return '#' + padZero(r) + padZero(g) + padZero(b);
}
function move(oldPath, newPath, callback) {
    fs.rename(oldPath, newPath, function (err) {
        if (err) {
            if (err.code === 'EXDEV') {
                copy();
            } else {
                callback(err);
            }
            return;
        }
        callback();
    });
    function copy() {
        var readStream = fs.createReadStream(oldPath);
        var writeStream = fs.createWriteStream(newPath);
        readStream.on('error', callback);
        writeStream.on('error', callback);
        readStream.on('close', function () {
            fs.unlink(oldPath, callback);
        });
        readStream.pipe(writeStream);
    }
}
function makeFolder(dir) {
    if (!fs.existsSync(MAIN_FOLDER + "\\" + dir)){
        fs.mkdirSync(MAIN_FOLDER + "\\" + dir, { recursive: true });
    }
}
//Functions - END

router.get('/', function(req, res) {
    if (MAIN_FOLDER == "" || MAIN_FILTER == "") {
        res.redirect('/settings')
    } else {
        router.use('/image', express.static(MAIN_FOLDER))

        if (db.has("tags")) {
            var tags = db.get('tags');
        } else {
            db.set("tags",[])
            var tags = db.get('tags');
        }

        let files = glob.sync('*.@(' + MAIN_FILTER + ')', { cwd: MAIN_FOLDER+"\\" });
        if (files.length > 0) {
            var image_url = files[Math.floor(Math.random() * files.length)]
        }
            
        res.writeHead(200, {'Content-Type': 'text/html'})
        res.write(`
        <html>
            <head>
                <meta http-equiv="Content-Type" content="text/html;charset=UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Image Seperator</title>
                <style>
                * {
                    font-family: Calibri
                }
                #main {
                    width:300px;
                    margin: 0 auto 50px;
                    text-align:center;
                }                    
                #main img {
                    max-height: 100%;
                    max-width: 100%;
                }
                #buttons {
                    width: 100%;
                    margin: 0 auto;
                    text-align: center;
                }
                #buttons a {
                    padding: 5px;
                    border-radius: 10px;
                    border: 1px solid #7c7c7c;
                    height: 16px;
                    display: inline-block;
                    font-size: 14px;
                    margin-bottom: 5px;
                    text-decoration: none;
                    margin-right:3px;
                }

                #buttons a.remove {
                    background-color: #f44336;
                    border:1px solid #000000;
                    color: #ffffff;
                }

                #buttons a.new {
                    background-color: #4CAF50;
                    border:1px solid #000000;
                    color: #ffffff;
                }
                #buttons a.settings {
                    background-color: #d7d7d7;
                    border:1px solid #000000;
                    color: #ffffff;
                }
                </style>
                <script>
                    function createTag(file) {
                        var tagName = prompt("Tag Name?\n\nYou can write names like folder or sub/folder","");
                        location.href = "/go?action=new&file=" + file + "&name=" + tagName
                    }
                </script>
            </head>
            <body>
            
            <div id="main">
            `)
            if (files.length > 0) {
                if (image_url.slice(-4) == ".jpg") {
                    res.write(`            <img src="/image/${image_url}">`)
                }
                if (image_url.slice(-4) == ".mp4") {
                    res.write(`            <video width="100%" height="100%" controls>
                    <source src="/image/${image_url}" type="video/mp4">
                Your browser does not support the video tag.
                </video>`)
                }
            } else {
                res.write(`            No more pictures...`)
            }
            
            res.write(`        </div>

            <div id="buttons">`)

        tags.forEach(tag => {
            res.write(`<a style="background-color: ${stringToColour(tag)};color:${invertColor(stringToColour(tag))}" href="/go?action=move&file=${image_url}&tag=${tag}">${tag}</a>`)
        });

        res.write(`<br>
                <a class="remove" onclick="return confirm('Are you sure to delete this item?')" href="/go?action=remove&file=${image_url}">Remove</a>
                <a class="new" href="#" onclick="createTag('${image_url}')">New Tag</a>
                <a class="settings" href="/settings">Settings</a>
            </div>

            </body>
        </html>`)
        res.end();
    }
});

router.get('/go', function(req, res) {
    if (req.query.action == "new") {
        //New tag and move
        tempArr = db.get("tags")
        tempArr.push(req.query.name)
        console.log(tempArr)
        db.set("tags",tempArr)

        makeFolder(req.query.name)

        move(MAIN_FOLDER + "\\" + req.query.file, MAIN_FOLDER + "\\" + req.query.name + "\\" + req.query.file, function (err) {
            if (err) throw err
            console.log(req.query.file + ' -> Taşıma Başarılı!')
        })

        res.redirect('/')
    }
    if (req.query.action == "move") {
        makeFolder(req.query.tag)

        move(MAIN_FOLDER + "\\" + req.query.file, MAIN_FOLDER + "\\" + req.query.tag + "\\" + req.query.file, function (err) {
            if (err) throw err
            console.log(req.query.file + ' -> Taşıma Başarılı!')
        })
        
        res.redirect('/')
    }
    if (req.query.action == "remove") {
        fs.unlinkSync(MAIN_FOLDER + "\\" + req.query.file)

        res.redirect('/')
    }
    
});
router.get('/settings', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.write(`
    <html>
        <head>
            <meta http-equiv="Content-Type" content="text/html;charset=UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Image Seperator - Settings</title>
            <style>
            * {
                font-family: Calibri
            }
            #main {
                width:300px;
                margin: 0 auto 50px;
                text-align:center;
            }
            form span {
                margin-bottom: 5px;
                display: inherit;
            }

            </style>
        </head>
        <body>
        
        <div id="main">
            <form method="post" action="/settings">
                <span>Folder: <input id="folder" type="text" name="folder" value="${MAIN_FOLDER}" size="20"/></span>
                <span>Tags: <input id="tags" type="text" name="tags" value="${MAIN_FILTER.replace("|",",")}" size="20"/></span>
                <input type="submit" value="Kaydet">
            </form>
        </div>

        </body>
    </html>`)
        
    res.end()
})
router.post('/settings', function(req, res) {
    //post requesst?
    if (req.body.folder != undefined) {
        MAIN_FOLDER = req.body.folder
        router.use('/image', express.static(MAIN_FOLDER))
    }
    if (req.body.tags != undefined) {
        MAIN_FILTER = req.body.tags.replace(",","|")
    }
    res.redirect('/')
})

app.use(express.urlencoded({extended: false}))
app.use('/', router)
return app.listen(MAIN_PORT, () => console.log(`Image Seperator is listening on port ${MAIN_PORT}!`))