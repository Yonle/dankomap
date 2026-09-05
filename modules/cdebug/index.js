import http from "node:http";
import WebSocket from "ws";

const DEFAULT_DEBUGGING_URL = "http://127.0.0.1:9222";

function httpGetJson(url) {
    return new Promise((resolve, reject) => {
        const request = http.get(url, {
            headers: {
                Connection: "keep-alive",
            },
        }, response => {
            let data = "";

            response.setEncoding("utf8");

            response.on("data", chunk => { data += chunk; });

            response.on("end", () => {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(`HTTP ${response.statusCode} ${response.statusMessage}`));
                    return;
                }

                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(new Error("Invalid JSON response.", { cause: error }));
                }
            });

            response.on("error", reject);
        });

        request.on("error", reject);
    });
}

export async function getBrowserWebSocketUrl(debuggingUrl = DEFAULT_DEBUGGING_URL) {
    const url = `${debuggingUrl.replace(/\/+$/, "")}/json/version`;
    const info = await httpGetJson(url);

    if (!info.webSocketDebuggerUrl) {
        throw new Error("Chromium did not provide webSocketDebuggerUrl.");
    }

    return info.webSocketDebuggerUrl;
}

export function connect(url) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url, {
            perMessageDeflate: false,
        });

        const onOpen = () => {
            cleanup();
            resolve(ws);
        };

        const onError = error => {
            cleanup();
            reject(error);
        };

        const cleanup = () => {
            ws.removeListener("open", onOpen);
            ws.removeListener("error", onError);
        };

        ws.once("open", onOpen);
        ws.once("error", onError);
    });
}

export function createRpc(ws) {
    let nextId = 0;
    const pending = new Map();

    ws.on("message", data => {
        let message;

        try {
            message = JSON.parse(data.toString());
        } catch {
            return;
        }

        if (message.id === undefined) {
            return;
        }

        const request = pending.get(message.id);

        if (!request) {
            return;
        }

        pending.delete(message.id);

        if (message.error) {
            request.reject(new Error(message.error.message || "CDP request failed."));
            return;
        }

        request.resolve(message.result);
    });

    ws.on("close", () => {
        const error = new Error("Chromium debugging connection closed.");

        for (const request of pending.values()) {
            request.reject(error);
        }

        pending.clear();
    });

    return (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId;

        pending.set(id, { resolve, reject });

        ws.send(JSON.stringify({ id, method, params }), error => {
            if (!error) {
                return;
            }

            pending.delete(id);
            reject(error);
        });
    });
}

export async function create(debuggingUrl = DEFAULT_DEBUGGING_URL) {
    const websocketUrl = await getBrowserWebSocketUrl(debuggingUrl);
    const ws = await connect(websocketUrl);
    const rpc = createRpc(ws);

    return {
        ws,
        rpc,
        url: websocketUrl,
        close() {
            ws.close();
        },
    };
}

export { DEFAULT_DEBUGGING_URL };