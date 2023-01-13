class DirTravErr extends Error {
    constructor(message = "Client possibly attempted directory traversal!"){
        super(message);
        this.tcolor = "red";
        this.type = "Alert",
        this.scolor = "yellow";
        this.status = 308;
    }
}
class BelowRootErr extends Error {
    constructor(message = "Client tried to access a file/directory below the root!"){
        super(message);
        this.tcolor = "yellow";
        this.type = "Warn",
        this.scolor = "yellow";
        this.status = 307;
    }
}
class SubfolderErr extends Error {
    constructor(message = "Client tried to access subfolder!"){
        super(message);
        this.tcolor = "green";
        this.type = "Info",
        this.scolor = "red";
        this.status = 403;
    }
}
class InterprocErr extends Error {
    constructor(message = "Requested resource is used for inter-process communication!"){
        super(message);
        this.tcolor = "magenta";
        this.type = "Error",
        this.scolor = "red";
        this.status = 415;
    }
}

module.exports = {DirTravErr, BelowRootErr, SubfolderErr, InterprocErr}