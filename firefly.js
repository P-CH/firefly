let fs = require("fs");
let http = require("http");
let os = require("os");
let path = require("path");

let {Parser, FileD} = require("./coreutils/main");
let Clicp = require("./coreutils/main").CliColorPrint;

let parser = new Parser();
parser.set({
    root: {
        call: "-r",
        desc: "sets the root",
        type: "regex",
        check: /^(([A-Z]:(\\|\/))|\/).*$/,
        default: process.cwd()
    },
    port: {
        call: "-p",
        desc: "sets the port",
        type: "regex",
        check: /^\d+$/,
        default: 80
    },
    netaddr: {
        call: "-n",
        desc: "sets the first 16 bit of the used net address",
        type: "regex",
        check: /^\d?\d?\d?\.\d?\d?\d?\.$/,
        default: "192.168"
    },
    interface: {
        call: "-i",
        desc: "sets the used interface",
        type: "bool",
        check: os.networkInterfaces()[new Parser().finder("-i")],
        default: undefined
    },
    debug: {
        call: "-d",
        desc: "enables debug mode",
        type: "toggle",
        check: true,
        default: false
    },
    subfolder: {
        call: "-nsf",
        desc: "disables subfolder access (so only the root is accessable)",
        type: "toggle",
        check: true,
        default: true
    }
});
parser.help = "<options>\nThe specified interface might be overwritten if it does not exist but another interface supports the configured network address.";

if(process.argv.includes("-h") || process.argv.includes("--help")) parser.showhelp();

let [worp, relp, listing, mclass, obj, sympointer, symprefix] = Array(8).fill("");
let isSym = false;
let ftypes = {
    exe: [".exe", ".elf"],
    lnk: [".lnk", ".url"],
    img: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp", ".ico"],
    src: [".js", ".mjs", ".ts", ".py", ".bat", ".vbs", ".sh", ".cmd", ".ps1", ".htm", ".html", ".css", ".c", ".cs", ".cpp", ".java", ".jar", ".vb", ".php", ".phps", ".md", ".rb", ".json", ".pl"], 
    aud: [".mp2", ".mp3", ".wav", ".wma"],
    txt: [".txt", ".doc", ".docx", ".rtf", ".log"],
    vid: [".mp4", ".mov", ".avi", ".mkv", ".wmv"]
}
let root = parser.get("root").replaceAll("\\", "/");
let port = parser.get("port");
let netaddr = parser.get("netaddr");
let interface = parser.get("interface");
let debug = parser.get("debug");
let nsf = parser.get("subfolder");
let env_root = process.platform == "win32" ? "\\" : "/";
let interfacelist = Object.keys(os.networkInterfaces()).reduce((t, interface) => {t[interface] = os.networkInterfaces()[interface].map(obj => obj.address); return t}, {});
let ip = Object.values(interface ? {[interface]:os.networkInterfaces()[interface].map(obj => obj.address)} : interfacelist).reduce((t, interface) => [...t, ...interface]).filter(f => {if(f.startsWith(netaddr)) return f})[0];
let used_interface = Object.entries(interfacelist).filter(interface => interface[1].includes(ip))[0]?.[0];
function debuginfo(socket){
    d = new Date(Date.now());
    h = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
    m = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
    s = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();
    ms = d.getMilliseconds() < 100 ? d.getMilliseconds() < 10 ? "00" + d.getMilliseconds() : "0" + d.getMilliseconds() : d.getMilliseconds();
    return `[${h}:${m}:${s}:${ms}][${socket.remoteAddress}]`;
}

Clicp("<!fggreen>Started Firefly.<!fgwhite>");
if(!ip){
    Clicp(`<!fgred>Specifed interface (${parser.finder("-i")}) does not ${interface ? `have the network address "${netaddr}"` : `exist and there is no alternative interface supporting the configured network address (${netaddr})`}<!fgwhite>`);
    process.exit(1);
}
Clicp(`Root Directory: <!fgcyan>${root}<!fgwhite>\nPort: <!fgcyan>${port}<!fgwhite>\nLocal Address: <!fgcyan>${ip}<!fgwhite> (using "${used_interface}"${(process.argv.includes("-i") && os.networkInterfaces()[parser.finder("-i")]) || !process.argv.includes("-i") ? "" : `,<!fgred> not "${parser.finder("-i")}"<!fgwhite>`})\n`);
http.createServer((req, res) => {
    if(req.url == "/favicon.ico") return;
    worp = req.url != "/" ? decodeURI(req.url.substring(1)).replaceAll(/(\/|\\)\.\./g, "").replace("\\\\", "\\") : root;
    if(/.+(\/|\\)\.\..*/.test(decodeURI(req.url))){
        if(debug) Clicp(`[<!fgred>Alert<!fgwhite>][<!fgyellow>308<!fgwhite>]${debuginfo(req.socket)} --> Possibly attempted directory traversal ("${req.url.substring(1)}")`);
        res.writeHead(308, {"Location":`http://${ip}:${port}/${worp}`});
        res.end();
        return;
    }
    if(!worp.toLowerCase().includes(root.toLowerCase())){
        if(debug) Clicp(`[<!fgyellow>Warn<!fgwhite>][<!fgyellow>307<!fgwhite>]${debuginfo(req.socket)} --> Tried to access direcory/file below the root ("${worp}")`);
        res.writeHead(307, {"Location":`http://${ip}:${port}`});
        res.end();
        return;
    }
    if(FileD(req.url.substring(1)) == "d" && nsf){
        if(debug) Clicp(`[<!fggreen>Info<!fgwhite>][<!fgred>403<!fgwhite>]${debuginfo(req.socket)} --> Tried to access subfolder ("${worp}")`);
        res.writeHead(403);
        res.end();
        return;
    }
    try {
        if(fs.lstatSync(worp).isFile()){
            res.writeHead(200, {"Content-Type":"text/plain"});
            res.write(fs.readFileSync(worp));
            res.end();
            if(debug) Clicp(`[<!fggreen>Info<!fgwhite>][<!fggreen>200<!fgwhite>]${debuginfo(req.socket)} --> Viewed "${worp}"`);
        }
        else if(fs.lstatSync(worp).isSymbolicLink() && fs.lstatSync(process.platform != "win32" ? "/" : "" + fs.readlinkSync(worp)).isFile()){
            res.writeHead(200, {"Content-Type":"text/plain"});
            res.write(fs.readFileSync(process.platform != "win32" ? "/" : "" + fs.readlinkSync(worp)));
            res.end();
            if(debug) Clicp(`[<!fggreen>Info<!fgwhite>][<!fggreen>200<!fgwhite>]${debuginfo(req.socket)} --> Viewed "${worp}"`);
        } 
        else if(FileD(worp) == "p" || FileD(worp) == "s" || FileD(worp) == "b" || FileD(worp) == "c"){
            res.writeHead(415);
            res.end();
            if(debug) Clicp(`[<!fgmagenta>Error<!fgwhite>][<!fgred>415<!fgwhite>]${debuginfo(req.socket)} --> Requested resource is used for inter-process communication and cannot be read. (${worp})`)
        } else {
            relp = root == worp ? env_root : worp.replace(root, "");
            if(relp != env_root) listing += `<a href="${env_root}" class="dir"><b>${env_root}</b></a><br><a href="/${path.join(worp, "..")}" class="dir"><b>..</b></a><br>`;
            fs.readdirSync(worp).forEach(elem => {
                obj = `${worp}${worp == root ? "" : env_root}/${elem}`;
                try {isSym = fs.lstatSync(obj).isSymbolicLink()} catch {};
                try {sympointer = isSym ? `(${fs.readlinkSync(obj)})` : ""} catch {};
                symprefix = process.platform != "win32" ? "/" : "";
                finder: for(o of Object.entries(ftypes)){
                    for(p of o[1]){
                        try{
                            if(obj.toLowerCase().endsWith(p) || (isSym && fs.lstatSync(symprefix + fs.readlinkSync(obj)).isFile() && (symprefix + fs.readlinkSync(obj)).toLowerCase().endsWith(p))){
                                mclass = o[0];
                                break finder;
                            }
                        } catch {};
                    }
                }
                try {
                    if(fs.lstatSync(obj).isDirectory() || (isSym && fs.lstatSync(symprefix + fs.readlinkSync(obj)).isDirectory())){
                        mclass = "dir"
                        if(nsf) mclass += " nsf";
                    }
                } catch {};
                if(FileD(obj) == "?") mclass = "r_err";
                if(FileD(obj) != "?" && FileD(obj) != "-" && FileD(obj) != "d") mclass += " fd";
                listing += `<div style="display: inline-block; width: 1.5vw;">(${FileD(obj)})</div> ${FileD(obj) == "-" || FileD(obj) == "l" && mclass != "dir fd" ? `<a href="/${isSym ? /^(([A-Z]:(\\|\/))|\/).*$/.test(sympointer.replaceAll(/(\(|\))/g, "")) ? sympointer.replaceAll(/(\(|\))/g, "") : worp + env_root + sympointer.replaceAll(/(\(|\))/g, "") : obj}" download="${elem}"><i class="fa fa-download"></i></a>`: `<i class="fa fa-download" style="visibility: hidden;"></i>`} <a href="/${isSym ? /^(([A-Z]:(\\|\/))|\/).*$/.test(sympointer.replaceAll(/(\(|\))/g, "")) ? sympointer.replaceAll(/(\(|\))/g, "") : worp + env_root + sympointer.replaceAll(/(\(|\))/g, "") : obj}" class="${mclass}">${elem} ${sympointer}</a><br>`;
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
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
                <title>Firefly</title>
                <script>
                    let desc = {};
                    let temp;
                    async function getContent(target){
                        await fetch(target.href).then(data => data.text()).then(data => {temp = data.replaceAll("<", "\\<").replaceAll(">", "\\>")});
                        return temp;
                    }
                    document.addEventListener("contextmenu", async e => {
                        if(e.target.parentElement?.className != "listing" || e.target.tagName != "A") return;
                        else {
                            e.preventDefault();
                            if(e.target.attributes.class.value.includes("dir")) desc[e.target.innerText] = "Selected item is a directory and cannot be read.";
                            else if(e.target.attributes.class.value.includes("r_err")) desc[e.target.innerText] = "File/Directory cannot be accessed due to the lack of read permissions.";
                            document.getElementById("field").innerText = desc[e.target.innerText] || await getContent(e.target);
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
                    .fa{
                        padding-right: 0.5vw;
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
                    .fd{
                        text-decoration: underline;
                    }
                    .r_err{
                        color: black;
                    }
                    .nsf{
                        color: darkgrey !important;
                    }
                    .path{
                        background-color: #0c0c0c;
                        padding: 5px;
                    }
                    .dir{
                        color: rgb(36, 204, 255);
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
                    .vid{
                        color: rgb(255, 0, 255);
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
            if(debug) Clicp(`[<!fggreen>Info<!fgwhite>][<!fggreen>200<!fgwhite>]${debuginfo(req.socket)} --> Accessed "${worp}"`);
        }
    } catch (error){
        if(error.message.split(":")[0] == "EPERM"){
            if(debug) Clicp(`[<!fgyellow>Warn<!fgwhite>][<!fgred>403<!fgwhite>]${debuginfo(req.socket)} --> ${error.message}`);
            res.writeHead(403);
        }
        else if(error.message.split(":")[0] == "ENOENT"){
            if(debug) Clicp(`[<!fgmagenta>Error<!fgwhite>][<!fgred>404<!fgwhite>]${debuginfo(req.socket)} --> ${error.message}`);
            res.writeHead(404);
        }
        else Clicp(`<!bgred>Unhandled Exception: ${error.message}<!bgblack>`);
        res.end();
    }
}).listen(port);