var isObject = require("@nathanfaucett/is_object"),
    isString = require("@nathanfaucett/is_string"),
    isNullOrUndefined = require("@nathanfaucett/is_null_or_undefined"),
    isNull = require("@nathanfaucett/is_null"),
    punycode = require("punycode"),
    qs = require("@nathanfaucett/qs");


var url = module.exports,

    protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,
    delims = ["<", ">", '"', "`", " ", "\r", "\n", "	"],
    unwise = ["{", "}", "|", "\\", "^", "`"].concat(delims),
    autoEscape = ["'"].concat(unwise),
    nonHostChars = ["%", "/", "?", ";", "#"].concat(autoEscape),
    hostEndingChars = ["/", "?", "#"],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    unsafeProtocol = {
        javascript: true,
        "javascript:": true
    },
    hostlessProtocol = {
        javascript: true,
        "javascript:": true
    },
    slashedProtocol = {
        http: true,
        https: true,
        ftp: true,
        gopher: true,
        file: true,
        "http:": true,
        "https:": true,
        "ftp:": true,
        "gopher:": true,
        "file:": true
    };


function Url() {
    this.protocol = null;
    this.slashes = null;
    this.auth = null;
    this.host = null;
    this.port = null;
    this.hostname = null;
    this.hash = null;
    this.search = null;
    this.query = null;
    this.pathname = null;
    this.path = null;
    this.href = null;
}

function urlParse(url, parseQueryString, slashesDenoteHost) {
    if (url && isObject(url) && url instanceof Url) {
        return url;
    }
    var u = new Url();
    u.parse(url, parseQueryString, slashesDenoteHost);
    return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
    var hashSplit, rest, simplePath, proto, lowerProto, slashes, hostEnd, i, hec, auth, atSign, ipv6Hostname, hostparts, l, part, newpart, j, k, validParts, notHost, bit, p, h, ae, esc, hash, qm, s;
    if (!isString(url)) {
        throw new TypeError("Parameter 'url' must be a string, not " + typeof(url));
    }
    hashSplit = url.split("#");
    hashSplit[0] = hashSplit[0].replace(/\\/g, "/");
    url = hashSplit.join("#");
    rest = url;
    rest = rest.trim();
    if (!slashesDenoteHost && 1 === hashSplit.length) {
        simplePath = simplePathPattern.exec(rest);
        if (simplePath) {
            this.path = rest;
            this.href = rest;
            this.pathname = simplePath[1];
            if (simplePath[2]) {
                this.search = simplePath[2];
                this.query = parseQueryString ? qs.parse(this.search.substr(1)) : this.search.substr(1);
            }
            return this;
        }
    }
    proto = protocolPattern.exec(rest);
    if (proto) {
        proto = proto[0];
        lowerProto = proto.toLowerCase();
        this.protocol = lowerProto;
        rest = rest.substr(proto.length);
    }
    if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
        slashes = "//" === rest.substr(0, 2);
        if (slashes && !(proto && hostlessProtocol[proto])) {
            rest = rest.substr(2);
            this.slashes = true;
        }
    }
    if (!hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
        hostEnd = -1;
        for (i = 0; i < hostEndingChars.length; i++) {
            hec = rest.indexOf(hostEndingChars[i]); - 1 === hec || -1 !== hostEnd && hec >= hostEnd || (hostEnd = hec);
        }
        atSign = -1 === hostEnd ? rest.lastIndexOf("@") : rest.lastIndexOf("@", hostEnd);
        if (-1 !== atSign) {
            auth = rest.slice(0, atSign);
            rest = rest.slice(atSign + 1);
            this.auth = decodeURIComponent(auth);
        }
        hostEnd = -1;
        for (i = 0; i < nonHostChars.length; i++) {
            hec = rest.indexOf(nonHostChars[i]); - 1 === hec || -1 !== hostEnd && hec >= hostEnd || (hostEnd = hec);
        } - 1 === hostEnd && (hostEnd = rest.length);
        this.host = rest.slice(0, hostEnd);
        rest = rest.slice(hostEnd);
        this.parseHost();
        this.hostname = this.hostname || "";
        ipv6Hostname = "[" === this.hostname[0] && "]" === this.hostname[this.hostname.length - 1];
        if (!ipv6Hostname) {
            hostparts = this.hostname.split(/\./);
            for (i = 0, l = hostparts.length; l > i; i++) {
                part = hostparts[i];
                if (part && !part.match(hostnamePartPattern)) {
                    newpart = "";
                    for (j = 0, k = part.length; k > j; j++) {
                        newpart += part.charCodeAt(j) > 127 ? "x" : part[j];
                    }
                    if (!newpart.match(hostnamePartPattern)) {
                        validParts = hostparts.slice(0, i);
                        notHost = hostparts.slice(i + 1);
                        bit = part.match(hostnamePartStart);
                        if (bit) {
                            validParts.push(bit[1]);
                            notHost.unshift(bit[2]);
                        }
                        notHost.length && (rest = "/" + notHost.join(".") + rest);
                        this.hostname = validParts.join(".");
                        break;
                    }
                }
            }
        }
        this.hostname = this.hostname.length > hostnameMaxLen ? "" : this.hostname.toLowerCase();
        ipv6Hostname || (this.hostname = punycode.toASCII(this.hostname));
        p = this.port ? ":" + this.port : "";
        h = this.hostname || "";
        this.host = h + p;
        this.href += this.host;
        if (ipv6Hostname) {
            this.hostname = this.hostname.substr(1, this.hostname.length - 2);
            "/" !== rest[0] && (rest = "/" + rest);
        }
    }
    if (!unsafeProtocol[lowerProto]) {
        for (i = 0, l = autoEscape.length; l > i; i++) {
            ae = autoEscape[i];
            esc = encodeURIComponent(ae);
            esc === ae && (esc = escape(ae));
            rest = rest.split(ae).join(esc);
        }
    }
    hash = rest.indexOf("#");
    if (-1 !== hash) {
        this.hash = rest.substr(hash);
        rest = rest.slice(0, hash);
    }
    qm = rest.indexOf("?");
    if (-1 !== qm) {
        this.search = rest.substr(qm);
        this.query = rest.substr(qm + 1);
        parseQueryString && (this.query = qs.parse(this.query));
        rest = rest.slice(0, qm);
    } else {
        if (parseQueryString) {
            this.search = "";
            this.query = {};
        }
    }
    rest && (this.pathname = rest);
    slashedProtocol[lowerProto] && this.hostname && !this.pathname && (this.pathname = "/");
    if (this.pathname || this.search) {
        p = this.pathname || "";
        s = this.search || "";
        this.path = p + s;
    }
    this.href = this.format();
    return this;
};

function urlFormat(obj) {
    isString(obj) && (obj = urlParse(obj));
    return obj instanceof Url ? obj.format() : Url.prototype.format.call(obj);
}

Url.prototype.format = function() {
    var protocol, pathname, hash, host, query, search, auth = this.auth || "";
    if (auth) {
        auth = encodeURIComponent(auth);
        auth = auth.replace(/%3A/i, ":");
        auth += "@";
    }
    protocol = this.protocol || "", pathname = this.pathname || "", hash = this.hash || "", host = false, query = "";
    if (this.host) {
        host = auth + this.host;
    } else {
        if (this.hostname) {
            host = auth + (-1 === this.hostname.indexOf(":") ? this.hostname : "[" + this.hostname + "]");
            this.port && (host += ":" + this.port);
        }
    }
    this.query && isObject(this.query) && Object.keys(this.query).length && (query = qs.stringify(this.query));
    search = this.search || query && "?" + query || "";
    protocol && ":" !== protocol.substr(-1) && (protocol += ":");
    if (this.slashes || (!protocol || slashedProtocol[protocol]) && false !== host) {
        host = "//" + (host || "");
        pathname && "/" !== pathname.charAt(0) && (pathname = "/" + pathname);
    } else {
        host || (host = "");
    }
    hash && "#" !== hash.charAt(0) && (hash = "#" + hash);
    search && "?" !== search.charAt(0) && (search = "?" + search);
    pathname = pathname.replace(/[?#]/g, function(match) {
        return encodeURIComponent(match);
    });
    search = search.replace("#", "%23");
    return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
    return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
    return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
    return source ? urlParse(source, false, true).resolveObject(relative) : relative;
}

Url.prototype.resolveObject = function(relative) {
    var rel, result, tkeys, tk, tkey, rkeys, rk, rkey, keys, v, k, relPath, p, s, isSourceAbs, isRelAbs, mustEndAbs, removeAllDots, srcPath, psychotic, authInHost, last, hasTrailingSlash, up, i, isAbsolute;
    if (isString(relative)) {
        rel = new Url();
        rel.parse(relative, false, true);
        relative = rel;
    }
    result = new Url();
    tkeys = Object.keys(this);
    for (tk = 0; tk < tkeys.length; tk++) {
        tkey = tkeys[tk];
        result[tkey] = this[tkey];
    }
    result.hash = relative.hash;
    if ("" === relative.href) {
        result.href = result.format();
        return result;
    }
    if (relative.slashes && !relative.protocol) {
        rkeys = Object.keys(relative);
        for (rk = 0; rk < rkeys.length; rk++) {
            rkey = rkeys[rk];
            "protocol" !== rkey && (result[rkey] = relative[rkey]);
        }
        slashedProtocol[result.protocol] && result.hostname && !result.pathname && (result.path = result.pathname = "/");
        result.href = result.format();
        return result;
    }
    if (relative.protocol && relative.protocol !== result.protocol) {
        if (!slashedProtocol[relative.protocol]) {
            keys = Object.keys(relative);
            for (v = 0; v < keys.length; v++) {
                k = keys[v];
                result[k] = relative[k];
            }
            result.href = result.format();
            return result;
        }
        result.protocol = relative.protocol;
        if (relative.host || hostlessProtocol[relative.protocol]) {
            result.pathname = relative.pathname;
        } else {
            relPath = (relative.pathname || "").split("/");
            for (; relPath.length && !(relative.host = relPath.shift());) {}
            relative.host || (relative.host = "");
            relative.hostname || (relative.hostname = "");
            "" !== relPath[0] && relPath.unshift("");
            relPath.length < 2 && relPath.unshift("");
            result.pathname = relPath.join("/");
        }
        result.search = relative.search;
        result.query = relative.query;
        result.host = relative.host || "";
        result.auth = relative.auth;
        result.hostname = relative.hostname || relative.host;
        result.port = relative.port;
        if (result.pathname || result.search) {
            p = result.pathname || "";
            s = result.search || "";
            result.path = p + s;
        }
        result.slashes = result.slashes || relative.slashes;
        result.href = result.format();
        return result;
    }
    isSourceAbs = result.pathname && "/" === result.pathname.charAt(0), isRelAbs = relative.host || relative.pathname && "/" === relative.pathname.charAt(0),
        mustEndAbs = isRelAbs || isSourceAbs || result.host && relative.pathname, removeAllDots = mustEndAbs, srcPath = result.pathname && result.pathname.split("/") || [],
        relPath = relative.pathname && relative.pathname.split("/") || [], psychotic = result.protocol && !slashedProtocol[result.protocol];
    if (psychotic) {
        result.hostname = "";
        result.port = null;
        result.host && ("" === srcPath[0] ? srcPath[0] = result.host : srcPath.unshift(result.host));
        result.host = "";
        if (relative.protocol) {
            relative.hostname = null;
            relative.port = null;
            relative.host && ("" === relPath[0] ? relPath[0] = relative.host : relPath.unshift(relative.host));
            relative.host = null;
        }
        mustEndAbs = mustEndAbs && ("" === relPath[0] || "" === srcPath[0]);
    }
    if (isRelAbs) {
        result.host = relative.host || "" === relative.host ? relative.host : result.host;
        result.hostname = relative.hostname || "" === relative.hostname ? relative.hostname : result.hostname;
        result.search = relative.search;
        result.query = relative.query;
        srcPath = relPath;
    } else {
        if (relPath.length) {
            srcPath || (srcPath = []);
            srcPath.pop();
            srcPath = srcPath.concat(relPath);
            result.search = relative.search;
            result.query = relative.query;
        } else {
            if (!isNullOrUndefined(relative.search)) {
                if (psychotic) {
                    result.hostname = result.host = srcPath.shift();
                    authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
                    if (authInHost) {
                        result.auth = authInHost.shift();
                        result.host = result.hostname = authInHost.shift();
                    }
                }
                result.search = relative.search;
                result.query = relative.query;
                isNull(result.pathname) && isNull(result.search) || (result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : ""));
                result.href = result.format();
                return result;
            }
        }
    }
    if (!srcPath.length) {
        result.pathname = null;
        result.path = result.search ? "/" + result.search : null;
        result.href = result.format();
        return result;
    }
    last = srcPath.slice(-1)[0];
    hasTrailingSlash = (result.host || relative.host) && ("." === last || ".." === last) || "" === last;
    up = 0;
    for (i = srcPath.length; i >= 0; i--) {
        last = srcPath[i];
        if ("." === last) {
            srcPath.splice(i, 1);
        } else {
            if (".." === last) {
                srcPath.splice(i, 1);
                up++;
            } else {
                if (up) {
                    srcPath.splice(i, 1);
                    up--;
                }
            }
        }
    }
    if (!mustEndAbs && !removeAllDots) {
        for (; up--; up) {
            srcPath.unshift("..");
        }
    }

    !mustEndAbs || "" === srcPath[0] || srcPath[0] && "/" === srcPath[0].charAt(0) || srcPath.unshift("");
    hasTrailingSlash && "/" !== srcPath.join("/").substr(-1) && srcPath.push("");
    isAbsolute = "" === srcPath[0] || srcPath[0] && "/" === srcPath[0].charAt(0);

    if (psychotic) {
        result.hostname = result.host = isAbsolute ? "" : srcPath.length ? srcPath.shift() : "";
        authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
        if (authInHost) {
            result.auth = authInHost.shift();
            result.host = result.hostname = authInHost.shift();
        }
    }
    mustEndAbs = mustEndAbs || result.host && srcPath.length;
    mustEndAbs && !isAbsolute && srcPath.unshift("");
    if (srcPath.length) {
        result.pathname = srcPath.join("/");
    } else {
        result.pathname = null;
        result.path = null;
    }
    isNull(result.pathname) && isNull(result.search) || (result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : ""));
    result.auth = relative.auth || result.auth;
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
};

Url.prototype.parseHost = function() {
    var host = this.host,
        port = portPattern.exec(host);
    if (port) {
        port = port[0];
        ":" !== port && (this.port = port.substr(1));
        host = host.substr(0, host.length - port.length);
    }
    host && (this.hostname = host);
};


url.parse = urlParse;
url.resolve = urlResolve;
url.resolveObject = urlResolveObject;
url.format = urlFormat;
url.Url = Url;
