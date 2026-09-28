import {readFile,writeFile} from 'node:fs/promises';
import sharp from './lib/forge/sharp.mjs';

const base=new URL('../apps/ellipse-desktop/assets/',import.meta.url);
const svg=await readFile(new URL('ellipse-app.svg',base));
const sizes=[16,24,32,48,64,128,256];
const images=await Promise.all(sizes.map(size=>sharp(svg).resize(size,size).png().toBuffer()));
const header=Buffer.alloc(6+16*sizes.length);
header.writeUInt16LE(1,2); header.writeUInt16LE(sizes.length,4);
let offset=header.length;
images.forEach((png,i)=>{
  const start=6+i*16;
  header[start]=sizes[i]===256?0:sizes[i]; header[start+1]=header[start];
  header.writeUInt16LE(1,start+4);header.writeUInt16LE(32,start+6);
  header.writeUInt32LE(png.length,start+8);header.writeUInt32LE(offset,start+12);offset+=png.length;
});
await writeFile(new URL('ellipse-app.ico',base),Buffer.concat([header,...images]));
await writeFile(new URL('ellipse-app.png',base),await sharp(svg).resize(512,512).png().toBuffer());
console.log('Icône Ellipse : PNG 512 px et ICO Windows 16 à 256 px.');
