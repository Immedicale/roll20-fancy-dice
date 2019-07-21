import MessageTypes from "../message-types.js";
import logger from "../logger.js";

const targetScripts = [
    "https://app.roll20.net/v2/js/jquery",
    "https://app.roll20.net/v2/js/jquery.migrate.js",
    "https://app.roll20.net/js/featuredetect.js",
    "https://app.roll20.net/v2/js/patience.js",
    "https://app.roll20.net/editor/startjs",
    "https://app.roll20.net/js/jquery-ui",
    "https://app.roll20.net/js/d20/loading.js",
    "https://app.roll20.net/assets/firebase",
    "https://app.roll20.net/assets/base.js",
    "https://app.roll20.net/assets/app.js",
    "https://app.roll20.net/js/tutorial_tips.js",
];
let alreadyRedirected = {};
let redirectQueue = [];
let isRedirecting = false;

logger.debug("background.js");
attachListeners();

function attachListeners() {
    chrome.runtime.onMessage.addListener(handleMessage);

    chrome.webRequest.onHeadersReceived.addListener(
        handleHeadersReceived,
        {urls: [
            "*://app.roll20.net/*"

        ]},
        ["blocking", "responseHeaders"]
    );

    chrome.webRequest.onBeforeRequest.addListener(
        handleBeforeRequest,
        {urls: ["*://app.roll20.net/*"]},
        ["blocking"]
    );
}

function handleMessage(msg, sender, sendResponse) {
    if (msg[MessageTypes.DOM_LOADED]) {
        endRedirectQueue();
        sendResponse(redirectQueue);
    }
}

function handleBeforeRequest(req) {
    if (req.type !== "script") {
        return;
    }
    for (const url of targetScripts) {
        if (!req.url.startsWith(url)) {
            continue;
        }
        beginRedirectQueue();
        if (!alreadyRedirected[req.url]) {
            redirectQueue.push(req.url);
            alreadyRedirected[req.url] = true;
            return {
                cancel: true
            };
        }
        break;
    }
}

function handleHeadersReceived(req) {
    const corsAllowed = shouldAllowCORS(req);
    logger.debug(`Should CORS be allowed for URL ${req.url}`, corsAllowed ? "YES" : "NO");
    if (!corsAllowed) {
        return;
    }
    beginRedirectQueue();
    for (let i = 0; i < req.responseHeaders.length; i++) {
        const header = req.responseHeaders[i];
        const name = header.name.toLowerCase();
        if (name !== "content-security-policy") {
            continue;
        }
        header.value += " blob:";
        logger.debug("Changed content-security-policy header.");
    }
    logger.debug("Resulting request:", req);
    delete req.frameId;
    return req;
}

function shouldAllowCORS(request) {
    const url = request.url;
    if (url === "https://app.roll20.net/editor/") {
        return true;
    }
    if (url === "https://app.roll20.net/editor") {
        return true;
    }
    if (url.startsWith("https://app.roll20.net/editor?")) {
        return true;
    }
    if (url.startsWith("https://app.roll20.net/editor#")) {
        return true;
    }
    return false;
}

function beginRedirectQueue() {
    if (isRedirecting) {
        return;
    }
    isRedirecting = true;
    alreadyRedirected = {};
    redirectQueue = [];
}

function endRedirectQueue() {
    isRedirecting = false;
}