let http = require("http");
let fs = require("fs");
let os = require("os");
let options = [
    "\x1b[32m-r\x1b[37m - sets the root of the file system part hosted (default: working directory)",
    "\x1b[32m-p\x1b[37m - sets the port used (default: 80)",
    "\x1b[32m-n\x1b[37m - sets the first 16 bit of the used network address (default: 192.168)",
    "\x1b[32m-i\x1b[37m - sets the network interface used (default: first interface with an IP address matching the network address pattern)",
    "\x1b[32m-d\x1b[37m - enables debug mode"
]
let indexer = param => process.argv.slice(2)?.[process.argv.slice(2)?.indexOf(param) + 1];
let [worp, relp, listing, mclass, obj, sympointer] = Array(6).fill("");
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
let netaddr = process.argv.includes("-n") && /^\d{3}\.\d\d?\d?$/.test(indexer("-n")) ? indexer("-n") : "192.168";
let interface = process.argv.includes("-i") && os.networkInterfaces()[indexer("-i")] ? indexer("-i") : undefined;
let debug = process.argv.includes("-d") ? true : false;
let env_root = process.platform == "win32" ? "\\" : "/";
let interfacelist = Object.keys(os.networkInterfaces()).reduce((t, interface) => {t[interface] = os.networkInterfaces()[interface].map(obj => obj.address); return t}, {});
let ip = Object.values(interface ? {[interface]:os.networkInterfaces()[interface].map(obj => obj.address)} : interfacelist).reduce((t, interface) => [...t, ...interface]).filter(f => {if(f.startsWith(netaddr)) return f})[0];
let used_interface = Object.entries(interfacelist).filter(interface => interface[1].includes(ip))[0]?.[0];
function debuginfo(socket){
    d = new Date(Date.now());
    return `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()}][${socket.remoteAddress.split(":")[3]}]`;
}

if(process.argv.includes("-h") || process.argv.includes("--help")){
    console.log(`Options:\n   ${options.join("\n   ")}\n\nThe specified interface might be overwritten if it does not exist but another interface supports the configured network address.`);
    process.exit(0);
}
console.log("\x1b[32mStarted Firefly.\x1b[37m");
if(!ip){
    console.log(`\x1b[31mSpecifed interface (${indexer("-i")}) does not ${interface ? `have the network address "${netaddr}"` : `exist and there is no alternative interface supporting the configured network address (${netaddr})`}\x1b[37m`);
    process.exit(1);
}
console.log(`Root Directory: \x1b[36m${root}\x1b[37m\nPort: \x1b[36m${port}\x1b[37m\nLocal Address: \x1b[36m${ip}\x1b[37m (using "${used_interface}"${(process.argv.includes("-i") && os.networkInterfaces()[indexer("-i")]) || !process.argv.includes("-i") ? "" : `,\x1b[31m not "${indexer("-i")}"\x1b[37m`})\n`);
http.createServer((req, res) => {
    if(req.url == "/favicon.ico") return;
    worp = req.url.indexOf("?") == 1 ? decodeURI(req.url.substring(2)).replaceAll(/(\/|\\)\.\./g, "") : root;
    if(/.+(\/|\\)\.\..*/.test(decodeURI(req.url))){
        if(debug) console.log(`[\x1b[31mAlert\x1b[37m][\x1b[33m308\x1b[37m]${debuginfo(req.socket)} --> Possibly attempted directory traversal ("${req.url.substring(2)}")`);
        res.writeHead(308, {"Location":`http://${ip}:${port}/?${worp}`});
        res.end();
        return;
    }
    if(!worp.toLowerCase().includes(root.toLocaleLowerCase())){
        if(debug) console.log(`[\x1b[33mWarn\x1b[37m][\x1b[33m307\x1b[37m]${debuginfo(req.socket)} --> Tried to access direcory/file below the root ("${req.url.substring(2)}")`);
        res.writeHead(307, {"Location":`http://${ip}:${port}/?${root}`});
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
                            else if(isSym && fs.lstatSync(fs.readlinkSync(obj)).isFile() && fs.readlinkSync(obj).toLowerCase().endsWith(p)){
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
                try {sympointer = isSym ? `(${fs.readlinkSync(obj)})` : ""} catch {};
                listing += `<a href="?${obj}" class="${mclass}">${elem} ${sympointer}</a><br>`;
                mclass = "";
                errlvl = 0;
                isSym = false;
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