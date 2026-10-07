// Deliberate public resources only. Student photos belong in private storage.
export const publicAssets=new Set(['index.html','app.js','auth-ui.js','camera.js','photos.js','urna.js','colinhas.js','style.css','favicon.svg','bahia.jpg','lideres.jpg','ouvidor.jpg','demo-candidate.jpg','confirma-urna.mp3','jspdf.umd.min.js','jspdf-LICENSE.txt']);
export const publicPath=pathname=>pathname==='/'?'index.html':publicAssets.has(pathname.slice(1))?pathname.slice(1):null;
