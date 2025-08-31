let socket: WebSocket | null = null;
let listeners: ((data: any) => void)[] = [];
let oidCache: string | null = null;
let heartbeat: any = null;

function buildWsUrl(baseApi?: string) {
  if (typeof window !== 'undefined' && window.location) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}/api/ws`;
  }
  if (baseApi) {
    return baseApi.replace(/^http/,'ws') + '/api/ws';
  }
  return '/api/ws';
}

export function connectWs(oid: string, baseApi?: string) {
  oidCache = oid;
  const url = buildWsUrl(baseApi) + `?oid=${encodeURIComponent(oid)}`;
  try {
    socket = new WebSocket(url);
    socket.onopen = () => {
      // heartbeat
      heartbeat = setInterval(() => {
        try { socket?.send?.('ping'); } catch {}
      }, 5000);
    };
    socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        listeners.forEach((cb) => cb(data));
      } catch {}
    };
    socket.onclose = () => {
      if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
      // try reconnect after delay
      setTimeout(() => { if (oidCache) connectWs(oidCache, baseApi); }, 3000);
    };
  } catch {}
}

export function onWsMessage(cb: (data: any) => void) {
  listeners.push(cb);
  return () => { listeners = listeners.filter((x) => x !== cb); };
}