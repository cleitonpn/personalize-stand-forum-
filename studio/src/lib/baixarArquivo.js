import {Capacitor} from '@capacitor/core'
export async function salvarBlob(blob,nome){
  if(Capacitor.isNativePlatform()){
    const [{Filesystem,Directory},{Share}]=await Promise.all([import('@capacitor/filesystem'),import('@capacitor/share')])
    const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('Não foi possível preparar o arquivo.'));r.readAsDataURL(blob)})
    const path=`uset/${crypto.randomUUID()}-${String(nome||'arquivo').replace(/[^\w.-]/g,'_')}`
    const r=await Filesystem.writeFile({path,data,directory:Directory.Cache,recursive:true})
    await Share.share({title:nome,files:[r.uri],dialogTitle:'Salvar ou compartilhar arquivo'})
    return
  }
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=nome||'arquivo';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)
}
