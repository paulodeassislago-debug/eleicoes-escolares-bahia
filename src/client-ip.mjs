import {isIP} from 'node:net';
export function clientIP(request,trustLocalProxy=false){
  const remote=request.socket.remoteAddress||'local';
  const loopback=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote);
  const forwarded=request.headers['x-real-ip'];
  // The reverse proxy must overwrite X-Real-IP. Never trust it from a direct
  // network connection, or without this explicit opt-in.
  const value=trustLocalProxy&&loopback&&typeof forwarded==='string'&&isIP(forwarded)?forwarded:remote;
  return value.startsWith('::ffff:')&&isIP(value.slice(7))===4?value.slice(7):value;
}
