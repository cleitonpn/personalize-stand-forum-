export async function salvarBlob(blob,nome){
  const url=URL.createObjectURL(blob),a=document.createElement('a')
  a.href=url;a.download=nome||'arquivo';a.click()
  setTimeout(()=>URL.revokeObjectURL(url),30000)
}
