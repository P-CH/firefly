//Written by P-CH. 2023
let fs = require("fs");

class Parser{
    /**
     * Message to be displayed when ``Parser.showhelp()`` is called
     */
    help = "No help message set."
    /**
     * Shows the help message, replaces the ``<options>`` tag with information on all possible arguments. If ``exit`` is set to false, the application is not going to close on it's own after the function call
     * @param {string} msg
     * @param {boolean} exit
     */
    showhelp(msg = this.help, exit = true){
        console.log(msg.replace("<options>", "Usage: node app.js <options>\n\n" + Object.keys(this).reduce((t, obj) => {return t += this[obj]["call"] ? `\n   ${this[obj]["call"]} - ${this[obj]["desc"]}`: ""}, "Options:")));
        if(exit) process.exit(0);
    }
    /**
     * Gets the CLI argument provided after the calling tag, undefined if the tag was not supplied
     * @param {string} call e.g. "-a", "-b", etc.
     * @returns {string | undefined}
     */
    finder(call){
        return process.argv.indexOf(call) == -1 ? undefined : process.argv.slice(2)?.[process.argv.slice(2)?.indexOf(call) + 1];
    }
    /**
     * Configures the parser, overwrites the previous configuration (if any)
     * 
     * Format:
     * ```md
     * {
     *  name: {
     *          "call": string
     *          "desc": string
     *          "type": string ("toggle" | "regex" | "bool")
     *          "check": regex | bool
     *          "default": any
     *          
     *        },
     *  name2: {}
     * }
     * ```
     * @param {object} parserobj
     */
    set(parserobj){
        for(let o of Object.keys(this)) if(o != "help") delete this[o];
        this.add(parserobj);
    }
    /**
     * Adds a new Parser object
     * 
     * Format:
     * ```md
     * {
     *  name: {
     *          "call": string
     *          "desc": string
     *          "type": string ("toggle" | "regex" | "bool")
     *          "check": regex | bool
     *          "default": any
     *          
     *        },
     *  name2: {}
     * }
     * ```
     * @param {object} parserobj 
     */
    add(parserobj){
        Object.entries(parserobj).forEach(pobj => {["call", "desc", "type", "check", "default"].forEach(key => {if(!Object.keys(pobj[1]).includes(key)) ExitMsg(`Error: Property "${key}" missing on parserobject "${pobj[0]}"`)})});
        for(let o of Object.keys(parserobj)) this[o] = parserobj[o];
    }
    /**
     * 
     * @param {string} name 
     * @returns {string}
     */
    get(name){
        if(this[name]?.["type"] == "toggle") return process.argv.includes(this[name]["call"]);
        let check = this[name]?.["type"] == "bool" ? this[name]["check"] : this[name]?.["check"].test(this.finder(this[name]?.["call"]));
        return process.argv.includes(this[name]?.["call"]) && check ? this.finder(this[name]["call"]) : this[name]?.["default"]
    }
    /**
     * 
     * @param {string} name 
     * @param {string=} prop 
     * @returns {object | string}
     */
    show(name, prop){
        return prop ? this[name][prop] : this[name];
    }
}
/**
 * Gets the file designator of the file supplied
 * @param {PathLike<String>} file
 */
let FileD = file => {
    try {
        let f = fs.lstatSync(file);
        if(f.isDirectory()) return "d";
        else if(f.isSymbolicLink()) return "l";
        else if(f.isFIFO()) return "p";
        else if(f.isSocket()) return "s";
        else if(f.isBlockDevice()) return "b";
        else if(f.isCharacterDevice()) return "c";
        else return "-";
    } catch {return "?"}
}
/**
 * Exists the process after leaving a message in the console
 * @param {string} msg 
 * @param {number} exitcode 
 */
let ExitMsg = (msg, exitcode = 0) => {
    CliColorPrint(msg);
    process.exit(exitcode);
}
/**
 * Prints the supplied text in the console, but replaces color tags with the escaped character set for the corrosponding color
 * @param {string} text 
 */
let CliColorPrint = text => {
    let colors = {
        "<!fgblack>": "\x1b[30m",
        "<!fgred>": "\x1b[31m",
        "<!fggreen>": "\x1b[32m",
        "<!fgyellow>": "\x1b[33m",
        "<!fgblue>": "\x1b[34m",
        "<!fgmagenta>": "\x1b[35m",
        "<!fgcyan>": "\x1b[36m",
        "<!fgwhite>": "\x1b[37m",
        "<!bgblack>": "\x1b[40m",
        "<!bgred>": "\x1b[41m",
        "<!bggreen>":"\x1b[42m",
        "<!bgyellow>": "\x1b[43m",
        "<!bgblue>": "\x1b[44m",
        "<!bgmagenta>": "\x1b[45m",
        "<!bgcyan>": "\x1b[46m",
        "<!bgwhite>": "\x1b[47m"
    }
    Object.keys(colors).forEach(color => {text = text.replaceAll(color, colors[color])});
    console.log(text);
}
/**
 * Returns the difference between two supplied numbers.
 * @param {number} v1 
 * @param {number} v2 
 * @returns {number}
 */
let Diff = (v1, v2) => (v1 < v2 ? [v1, v2] : [v2, v1]).reduce((v1, v2) => v2 - v1);
/**
 * Returns the input the user supplied via the standard input.
 * Usage:
 * ```js
 * async function main(){
 *     let userinput = await Stdin();
*      console.log(userinput);
 * }
 * ```
 * @returns {String}
 */
let Stdin = async () => await new Promise(res => require("readline").createInterface(process.stdin).question("", input => res(input)));
/**
 * Returns a list of all standard printable characters (ASCII 32 through 126)
 * @returns {String[]}
 */
let Characters = Object.keys([...Array(95).keys()]).map(key => String.fromCharCode(parseInt(key) + 32));


module.exports = {Parser, FileD, ExitMsg, CliColorPrint, Diff, Stdin, Characters}