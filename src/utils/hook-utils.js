export function getHooks(hooks, url) {
    let hookQueue = [];
    for (let hook of hooks) {
        if (hook.urlIncludes && !url.includes(hook.urlIncludes)) {
            continue;
        }
        hookQueue.push(hook);
    }
    return hookQueue;
}

export function injectHooks(source, hookQueue) {
    for (let hook of hookQueue) {
        source = source.replace(hook.find, hook.replace);
    }
    return source;
}