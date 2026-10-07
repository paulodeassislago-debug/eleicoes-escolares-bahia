import {HttpError} from './security.mjs';
export const MAX_PHOTO_BYTES=65536;
// Remove EXIF/XMP/IPTC/comments, including embedded thumbnails and camera/GPS
// metadata. Parse scan boundaries to handle progressive JPEGs as well.
export function sanitizeJPEG(bytes){
  const invalid=()=>{throw new HttpError('Foto JPEG inválida.');};
  if(bytes.length>MAX_PHOTO_BYTES||bytes.length<4||bytes[0]!==255||bytes[1]!==216)invalid();
  let position=2,frame=false,scan=false,ended=false;const parts=[bytes.subarray(0,2)];
  while(position<bytes.length){
    const start=position;if(bytes[position++]!==255)invalid();
    while(bytes[position]===255)position++;
    const marker=bytes[position++];
    if(marker===217){if(position!==bytes.length||!frame||!scan)invalid();parts.push(bytes.subarray(start,position));ended=true;break;}
    if(marker===0||marker===216||marker===undefined||(marker>=208&&marker<=215))invalid();
    const length=(bytes[position]<<8)|bytes[position+1];
    if(length<2||position+length>bytes.length)invalid();
    if([192,193,194].includes(marker)){
      if(frame||length<8)invalid();
      const height=(bytes[position+3]<<8)|bytes[position+4],width=(bytes[position+5]<<8)|bytes[position+6],components=bytes[position+7];
      if(!width||!height||width>4096||height>4096||![1,3].includes(components)||length!==8+3*components)invalid();frame=true;
    }
    const end=position+length;
    if(!(marker>=224&&marker<=239)&&marker!==254)parts.push(bytes.subarray(start,end));
    position=end;
    if(marker===218){
      if(!frame)invalid();scan=true;const scanStart=position;
      while(position<bytes.length){
        if(bytes[position]!==255){position++;continue;}
        let next=position+1;while(bytes[next]===255)next++;
        if(bytes[next]===0||(bytes[next]>=208&&bytes[next]<=215)){position=next+1;continue;}
        break;
      }
      parts.push(bytes.subarray(scanStart,position));
    }
  }
  if(!ended)invalid();
  const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
}
export function photoBytes(photo){if(typeof photo!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)||photo.length>87500)throw new HttpError('Use uma foto JPEG de até 64 KB.');let bytes;try{bytes=Uint8Array.from(atob(photo.split(',')[1]),c=>c.charCodeAt(0))}catch{throw new HttpError('Foto inválida.')}return sanitizeJPEG(bytes);}
export function photoKey(school,photo){if(!/^[a-zA-Z0-9-]+$/.test(school)||!/^[-a-zA-Z0-9]+\.jpg$/.test(photo||''))throw new HttpError('Foto inválida.');return school+'/'+photo;}
export async function storePhoto(storage,school,candidate,photo){const bytes=photoBytes(photo);if(!storage)throw new HttpError('O armazenamento de fotos está indisponível.');const name=crypto.randomUUID()+'.jpg';try{await storage.put(photoKey(school,name),bytes,{httpMetadata:{contentType:'image/jpeg'}})}catch{throw new HttpError('Não foi possível salvar a foto. Tente novamente.')}return name;}
export async function getPhoto(storage,school,photo){if(!storage)throw new HttpError('O armazenamento de fotos está indisponível.');try{const object=await storage.get(photoKey(school,photo));if(!object)throw new HttpError('missing');return sanitizeJPEG(new Uint8Array(await object.arrayBuffer()))}catch{throw new HttpError('Não foi possível carregar a foto.')}}
export function photoData(bytes){let text='';for(const b of bytes)text+=String.fromCharCode(b);return 'data:image/jpeg;base64,'+btoa(text);}
