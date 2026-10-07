import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir,cp,rm} from 'node:fs/promises';
import {join} from 'node:path';
process.umask(0o077);
const data='/var/lib/eleicoes-escolares',root=process.env.BACKUP_DIRECTORY||join(data,'backups');
const name=new Date().toISOString().replace(/[:.]/g,'-'),temporary=join(root,name+'.incomplete'),destination=join(root,name);
await mkdir(temporary,{recursive:true,mode:0o700});
const db=new DatabaseSync(process.env.ELECTION_DB||join(data,'elections.sqlite'),{readOnly:true});
try{
  // The SQLite online backup API includes committed WAL data. Copying only
  // the .sqlite file while the application runs would miss recent writes.
  await backup(db,join(temporary,'elections.sqlite'));
  await cp(process.env.PHOTO_DIRECTORY||join(data,'photos'),join(temporary,'photos'),{recursive:true});
  const {rename}=await import('node:fs/promises');await rename(temporary,destination);
  console.log('Backup concluído:',name);
}catch(error){await rm(temporary,{recursive:true,force:true});throw error;}
finally{db.close();}
