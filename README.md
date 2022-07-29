# Firefly - File System Webserver

I know that there are a bunch of webservers to host your file system out there, however, I was not really happy with the design of any of them.
In addition to that, I thought it'd be a nice lil project to get my hands on.
<hr>

I included file highlighting for different types/groups of files. Feel free to hit me up if I missed any important ones in the ``ftypes`` object...

<hr>

**Usage:**

``node firefly.js [options]`` - sets the root in the working directory and hosts on port 80 (http)

<u>options:</u>

``-r <path>`` - sets the root to ``path``

``-p <port>`` - uses ``port`` for the webserver

``-n <netAddr>`` - supply this if your network address does not start with ``192.168`` (format should be ``xxx.xxx``)

``-d`` - enables debug mode (prints all important information about requests)

<hr>

![PoC](https://cdn.discordapp.com/attachments/687024607831916567/1001572303651483699/PoC_debug.png)

![PoC](https://cdn.discordapp.com/attachments/687024607831916567/1001572304024784906/PoC_web.png)

By right-clicking on a list item which is a file, you'll get the file contents displayed on the right. There can be exceptions, e.g. if node doesnt have read permissions or the file size exceeds 3MB (this is to decrease loading times).

**Code:**

```js
let http = require("http");
let fs = require("fs");
let os = require("os");
let indexer = param => process.argv[process.argv.indexOf(param) + 1];
let [worp, relp, listing, mclass, obj] = Array(5).fill("");
let isSym = false;
let errlvl = 0;
let ftypes = {
    exe: [".exe", ".elf"],
    lnk: [".lnk", ".url"],
    img: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp", ".ico"],
    src: [".js", ".mjs", ".ts", ".py", ".bat", ".vbs", ".sh", ".cmd", ".ps1", ".htm", ".html", ".css", ".c", ".cs", ".cpp", ".java", ".jar", ".vb", ".php", ".phps", ".md", ".rb", ".json"], 
    aud: [".mp2", ".mp3", ".wav", ".wma"],
    txt: [".txt", ".doc", ".docx", ".rtf", ".log"],
}
let fcontent = {};
let root = process.argv.includes("-r") && /^(([A-Z]:\\)|\/).*$/.test(indexer("-r")) ? indexer("-r") : process.cwd();
let port = process.argv.includes("-p") && /^\d+$/.test(indexer("-p")) ? indexer("-p") : 80;
let netaddr = process.argv.includes("-n") && /^\d{3}\.\d{3}$/.test(indexer("-n")) ? indexer("-n") : "192.168";
let debug = process.argv.includes("-d") ? true : false;
let env_root = process.platform == "win32" ? "\\" : "/";
let ip = [...os.networkInterfaces().Ethernet, ...os.networkInterfaces().WLAN].filter(f => {if(f.address.startsWith(netaddr)) return f})[0]?.address;
function debuginfo(socket){
    d = new Date(Date.now());
    return `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()}][${socket.remoteAddress.split(":")[3]}]`;
}

console.log("\x1b[32mStarted Firefly.\x1b[37m");
console.log(`Root Directory: \x1b[36m"${root}"\x1b[37m\nPort: \x1b[36m${port}\x1b[37m\nLocal Address: \x1b[36m${ip}\x1b[37m\n`);
http.createServer((req, res) => {
    if(req.url == "/favicon.ico") return;
    worp = req.url.indexOf("?") == 1 ? decodeURI(req.url.substring(2)).replaceAll(/(\/|\\)\.\./g, "") : root;
    if(/.+(\/|\\)\.\..*/.test(decodeURI(req.url))){
        if(debug) console.log(`[\x1b[31mAlert\x1b[37m][\x1b[33m308\x1b[37m]${debuginfo(req.socket)} --> Possibly attempted directory traversal ("${req.url.substring(2)}")`);
        res.writeHead(308, {"Location":`http://${ip}/?${worp}`});
        res.end();
        return;
    }
    if(!worp.includes(root)){
        if(debug) console.log(`[\x1b[33mWarn\x1b[37m][\x1b[33m307\x1b[37m]${debuginfo(req.socket)} --> Tried to access direcory/file below the root ("${req.url.substring(2)}")`);
        res.writeHead(307, {"Location":`http://${ip}/?${root}`});
        res.end();
        return;
    }
    try {
        if(fs.lstatSync(worp).isFile()){
            res.writeHead(200, {"Content-Type":"text/plain"});
            res.write(fs.readFileSync(worp));
            res.end();
            if(debug) console.log(`[\x1b[32mInfo\x1b[37m][\x1b[32m200\x1b[37m]${debuginfo(req.socket)} --> Opened "${worp}"`);
        }
        else if(fs.lstatSync(worp).isSymbolicLink() && fs.lstatSync(fs.readlinkSync(worp)).isFile()){
            res.writeHead(200, {"Content-Type":"text/plain"});
            res.write(fs.readFileSync(fs.readlinkSync(worp)));
            res.end();
            if(debug) console.log(`[\x1b[32mInfo\x1b[37m][\x1b[32m200\x1b[37m]${debuginfo(req.socket)} --> Opened "${worp}"`);
        } else {
            relp = root == worp ? env_root : worp.replace(root, "");
            if(relp != env_root) listing += `<a href="${env_root}" class="dir"><b>${env_root}</b></a><br><a href="?${worp.slice(0, worp.lastIndexOf(env_root))}" class="dir"><b>..</b></a><br>`;
            fs.readdirSync(worp).forEach(elem => {
                obj = worp + env_root + elem;
                try {isSym = fs.lstatSync(obj).isSymbolicLink() ? true : false} catch {};
                finder: for(o of Object.entries(ftypes)){
                    for(p of o[1]){
                        try{
                            if(obj.toLowerCase().endsWith(p)){
                                mclass = o[0];
                                break finder;
                            }
                            else if(fs.lstatSync(obj).isSymbolicLink() && fs.lstatSync(fs.readlinkSync(obj)).isFile() && fs.readlinkSync(obj).toLowerCase().endsWith(p)){
                                mclass = `${o[0]} sym`;
                                break finder;
                            }
                        } catch {};
                    }
                }
                try {
                    if(fs.lstatSync(obj).isDirectory()){
                        mclass = "dir";
                        fcontent[obj] = "Selected item is a directory and cannot be read.";
                    }
                    else if(isSym && fs.lstatSync(fs.readlinkSync(obj)).isDirectory()){
                        mclass = "dir sym";
                        fcontent[obj] = "Selected item is a directory and cannot be read.";
                    }
                } catch {};
                try {fs.readFileSync(obj)} catch {errlvl++};
                try {fs.readdirSync(obj)} catch {errlvl++};
                if(errlvl == 2){
                    mclass = "r_err";
                    if(isSym) mclass += " sym";
                    fcontent[obj] = "File/Directory cannot be accessed due to the lack of read permissions."
                }
                if(!fcontent[obj]) fcontent[obj] = fs.statSync(obj).size <= 3000000 ? fs.readFileSync(obj, "utf-8") : "File size exceeds 3MB and could not be read to reduce loading times.";
                listing += `<a href="?${obj}" class="${mclass}">${elem} ${isSym ? "(" + fs.readlinkSync(obj) + ")" : ""}</a><br>`;
                mclass = "";
                errlvl = 0;
            });
            res.writeHead(200, {"Content-Type":"text/html"});
            res.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Firefly</title>
                <script>
                    contents = ${JSON.stringify(fcontent).replaceAll("<", "\\<").replaceAll(">", "\\>")};
                    document.addEventListener("contextmenu", e => {
                        if(!e.target.toString().includes("?")) return;
                        else {
                            e.preventDefault();
                            document.getElementById("field").innerText = contents[decodeURI(e.target.toString().split("?")[1])];
                            let listing = document.getElementsByClassName("listing")[0];
                            let info = document.getElementsByClassName("info")[0]
                            listing.style.height = Math.max(listing.scrollHeight, info.scrollHeight) + "px";
                        }
                    });
                </script>
                <style>
                    body{
                        background-color: #252525;
                        color: white;
                        font-family: Arial, Helvetica, sans-serif;
                    }
                    a{
                        color: white;
                        text-decoration: none;
                        font-size: 16px;
                        display: inline-block;
                        padding-bottom: 10px;
                    }
                    .listing{
                        width: 49.5%;
                        min-height: 85vh;
                        border-right-style: groove;
                        float: left;
                    }
                    .info{
                        width: 49.5%;
                        float: right;
                    }
                    .r_err{
                        color: black;
                    }
                    .path{
                        background-color: #0c0c0c;
                        padding: 5px;
                    }
                    .dir{
                        color: rgb(36, 204, 255);
                    }
                    .sym{
                        text-decoration: underline;
                    }
                    .exe{
                        color: rgb(255, 0, 0);
                    }
                    .lnk{
                        color: rgb(255, 255, 157);
                    }
                    .img{
                        color: rgb(151, 224, 42);
                    }
                    .src{
                        color: rgb(255, 136, 0);
                    }
                    .aud{
                        color: rgb(119, 62, 29);
                    }
                    .txt{
                        color: rgb(145, 87, 145);
                    }
                </style>
            </head>
            <body>
                <h3>Working Directory: <span class="path">${relp}</span></h3>
                <h5>Root Directory: <span class="path">${root}</span></h5>
                <hr><br>
                <div class="listing">
                ${listing}
                </div>
                <div class="info">
                    <pre id="field">No file selected.</pre>
                </div>
            </body>
            </html>
            `);
            res.end();
            listing = "";
            fcontent = {};
            if(debug) console.log(`[\x1b[32mInfo\x1b[37m][\x1b[32m200\x1b[37m]${debuginfo(req.socket)} --> Accessed "${worp}"`);
        }
    } catch (error){
        if(error.message.split(":")[0] == "EPERM"){
            if(debug) console.log(`[\x1b[33mWarn\x1b[37m][\x1b[31m403\x1b[37m]${debuginfo(req.socket)} --> ${error.message}`);
            res.writeHead(403);
        }
        else if(error.message.split(":")[0] == "ENOENT"){
            if(debug) console.log(`[\x1b[35mError\x1b[37m][\x1b[31m404\x1b[37m]${debuginfo(req.socket)} --> ${error.message}`);
            res.writeHead(404);
        }
        else console.log(`\x1b[41mException: ${error.message}\x1b[40m`);
        res.end();
    }
}).listen(port);
```