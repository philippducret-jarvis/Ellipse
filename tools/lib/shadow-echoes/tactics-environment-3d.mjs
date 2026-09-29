import * as T from './vendor/three.module.js';

/** Physical depth layers for the tactical arena. The sky is procedural, never
 * the illustration displayed by the 2D mode. All architecture is actual mesh.
 */
export function createTacticsEnvironment(scene,{reduced=false,arcade=false}={}){
 const sin=Math.sin;
 const sky=document.createElement('canvas');sky.width=1024;sky.height=512;
 const ctx=sky.getContext('2d');const gradient=ctx.createLinearGradient(0,0,0,512);
 gradient.addColorStop(0,'#0b1020');gradient.addColorStop(.46,'#301725');gradient.addColorStop(.78,'#613044');gradient.addColorStop(1,'#191c2c');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,512);
 let seed=241;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<190;i++){const x=random()*1024,y=random()*310,r=random()*1.2+.2;ctx.fillStyle=`rgba(232,210,224,${.15+random()*.5})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
 const skyTexture=new T.CanvasTexture(sky);skyTexture.colorSpace=T.SRGBColorSpace;scene.background=skyTexture;
 scene.fog=new T.FogExp2('#241b2a',.042);
 const root=new T.Group();root.name='The Ruins of Dawn — modeled environment';scene.add(root);
 // A distant matte supplies atmosphere only. The walkable bridge, columns,
 // parapet, arches and torches below are depth-bearing geometry with PBR maps.
 const vista=new T.Mesh(new T.PlaneGeometry(15,8.45,12,1),new T.MeshBasicMaterial({color:'#b7a7ae',fog:false,depthWrite:false}));
 vista.name='Distant cathedral panorama';vista.position.set(0,-1.5,-11);root.add(vista);
 new T.TextureLoader().load('../../03_assets/environments/campaign-tactical/ruins-eclipse-backdrop-v1.webp',texture=>{
  texture.colorSpace=T.SRGBColorSpace;vista.material.map=texture;vista.material.needsUpdate=true;
 });
 const box=new T.BoxGeometry(1,1,1),stoneMaterials=[];
 const stone=new T.MeshStandardMaterial({color:'#d4cbd0',roughness:.88,metalness:.02});stoneMaterials.push(stone);
 const darkStone=new T.MeshStandardMaterial({color:'#8f8a91',roughness:.91,metalness:.01});stoneMaterials.push(darkStone);
 const farStone=new T.MeshStandardMaterial({color:'#343546',roughness:1,metalness:0});
 const iron=new T.MeshStandardMaterial({color:'#27232c',roughness:.46,metalness:.66});
 const gold=new T.MeshStandardMaterial({color:'#8d6946',roughness:.42,metalness:.63});
 const ember=new T.MeshBasicMaterial({color:'#e75f43',transparent:true,opacity:.83,depthWrite:false});
 const flameCore=new T.MeshBasicMaterial({color:'#ffd08a',transparent:true,opacity:.78,depthWrite:false});
 const windowMat=new T.MeshBasicMaterial({color:'#c46368',transparent:true,opacity:.72,side:T.DoubleSide});
 const fogMat=new T.MeshBasicMaterial({color:'#85606e',transparent:true,opacity:.08,depthWrite:false,side:T.DoubleSide});
 const parts={towers:0,arches:0,blocks:0,torches:0,chains:0,arcade:0};
 function mesh(geo,mat,x,y,z,sx=1,sy=1,sz=1,group=root){const item=new T.Mesh(geo,mat);item.position.set(x,y,z);item.scale.set(sx,sy,sz);item.castShadow=mat!==farStone&&mat!==fogMat;item.receiveShadow=mat!==fogMat;group.add(item);return item;}
 function block(x,y,z,w,h,d,mat=stone){parts.blocks++;return mesh(box,mat,x,y,z,w,h,d);}
 function arch(x,y,z,r,material=stone){const arc=mesh(new T.TorusGeometry(r,.085,7,24,Math.PI),material,x,y,z);parts.arches++;return arc;}
 function tower(x,z,s=1,material=darkStone){const base=-.35;
  block(x,base+1.25*s,z,.72*s,2.5*s,.66*s,material);
  for(const side of [-1,1])block(x+side*.40*s,base+.9*s,z,.12*s,1.8*s,.82*s,material);
  block(x,base+2.55*s,z,.9*s,.23*s,.8*s,stone);
  const spire=mesh(new T.ConeGeometry(.49*s,1.12*s,8),material,x,base+3.16*s,z);spire.castShadow=true;
  for(let i=0;i<3;i++){mesh(new T.PlaneGeometry(.11*s,.30*s),windowMat,x-.19*s+i*.19*s,base+(1.1+i%2*.5)*s,z+.35*s);}
  parts.towers++;
 }

 // The cathedral skyline is made of distant geometry, with haze between its
 // sections. This prevents a single flat picture from supplying all depth.
 for(const [x,z,s] of [[-5.1,-6.7,1.05],[4.9,-7.1,1.15]])tower(x,z,s,darkStone);
 for(const x of [-4.2,-3.65,3.7,4.25]){
  block(x,.83,-5.3,.26,2.75,.64,darkStone);
  for(let row=0;row<5;row++)block(x+.07*(row%2),.1+row*.52,-4.95,.31,.055,.08,stone);
 }
 for(const [x,s] of [[-3.9,1],[3.95,-1]]){
  arch(x+s*.42,2.04,-5.2,.83,darkStone);
  for(let i=0;i<3;i++)block(x+s*(.16+i*.28),2.88-i*.16,-5.2,.32,.13,.65,darkStone);
 }
 for(const x of [-4.35,-3.95,3.98,4.36]){
  block(x,.55,-3.35,.31,2.55,.55,stone);
  block(x,.76,-3.01,.18,.98,.08,darkStone);
 }
 for(const x of [-3.35,3.38])arch(x,1.95,-3.34,.56,stone);
 if(arcade){
  // A row of pointed bays sits in front of the vista. Its open spans retain
  // the distant city, while real stone jambs and two rib depths move in parallax.
  const rib=(center,side,z,material,width)=>{
   const curve=new T.QuadraticBezierCurve3(
    new T.Vector3(center+side*1.08,1.55,z),
    new T.Vector3(center+side*.89,2.86,z),
    new T.Vector3(center,3.03,z)
   );
   for(let i=0;i<9;i++){
    const start=curve.getPoint(i/9),end=curve.getPoint((i+1)/9);
    const dx=end.x-start.x,dy=end.y-start.y;
    const stonePiece=mesh(box,material,(start.x+end.x)/2,(start.y+end.y)/2,z,width,Math.hypot(dx,dy)*.965,.42);
    stonePiece.rotation.z=Math.atan2(-dx,dy);
    parts.arcade++;
   }
  };
  for(const x of [-5.55,-2.85,-.15,2.55,5.25]){
   block(x,.61,-2.49,.31,2.02,.64,darkStone);
   block(x,1.61,-2.37,.43,.18,.70,stone);
   block(x,-.33,-2.37,.43,.19,.75,stone);
   block(x,.77,-2.29,.075,1.42,.11,stone);
   for(let row=0;row<5;row++)block(x+(row%2?.045:-.045),-.12+row*.32,-2.15,.26,.035,.12,stone);
   parts.arcade++;
  }
  for(const center of [-4.2,-1.5,1.2,3.9]){
   for(const side of [-1,1]){
    rib(center,side,-2.22,stone,.18);
    rib(center,side,-2.53,darkStone,.13);
   }
   block(center,3.27,-2.43,2.7,.39,.62,darkStone);
   block(center,3.51,-2.29,2.67,.09,.70,stone);
   block(center,3.13,-2.14,2.52,.055,.11,stone);
   const rose=mesh(new T.TorusGeometry(.12,.025,6,12),gold,center,3.29,-2.08);rose.castShadow=false;
   parts.arcade++;
  }
 }
 const banners=[];
 const bannerCanvas=document.createElement('canvas');bannerCanvas.width=256;bannerCanvas.height=512;
 const bannerCtx=bannerCanvas.getContext('2d'),bannerGradient=bannerCtx.createLinearGradient(0,0,256,0);
 bannerGradient.addColorStop(0,'#2b0814');bannerGradient.addColorStop(.27,'#6f1a2c');bannerGradient.addColorStop(.52,'#9a2940');bannerGradient.addColorStop(.76,'#5f1528');bannerGradient.addColorStop(1,'#290813');
 bannerCtx.fillStyle=bannerGradient;bannerCtx.fillRect(0,0,256,512);
 bannerCtx.strokeStyle='#ac8a54';bannerCtx.lineWidth=5;bannerCtx.beginPath();
 for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,r=i%2?43:91,x=128+Math.cos(a)*r,y=215+Math.sin(a)*r;i?bannerCtx.lineTo(x,y):bannerCtx.moveTo(x,y);}
 bannerCtx.closePath();bannerCtx.stroke();bannerCtx.lineWidth=3;bannerCtx.beginPath();bannerCtx.moveTo(128,105);bannerCtx.lineTo(128,321);bannerCtx.moveTo(55,214);bannerCtx.lineTo(201,214);bannerCtx.stroke();
 const bannerTexture=new T.CanvasTexture(bannerCanvas);bannerTexture.colorSpace=T.SRGBColorSpace;
 const bannerMat=new T.MeshStandardMaterial({map:bannerTexture,side:T.DoubleSide,roughness:.96,metalness:0});
 for(const x of [-4.1,4.1]){
  block(x,2.0,-3.0,.65,.075,.14,gold);
  const geometry=new T.PlaneGeometry(.55,1.15,4,10);
  const cloth=mesh(geometry,bannerMat,x,1.39,-2.92);
  cloth.castShadow=true;cloth.receiveShadow=true;banners.push({geometry,base:Float32Array.from(geometry.attributes.position.array),phase:x});
  block(x,.92,-2.95,.07,.07,.11,gold);
 }

 // Near masonry is at a third depth, with a real walkway, cut stone courses,
 // buttresses and arches under the playable formation line.
 block(0,-.30,-.04,9.1,.46,2.8,darkStone);
 for(let i=0;i<9;i++){const x=-4+i;
  block(x,-.065,.03,.94,.13,2.55,stone);
  block(x,-.18,1.29,.97,.16,.16,darkStone);
  if(i%2===0)block(x-.39,-.03,1.31,.13,.14,.22,gold);
 }
 for(let i=0;i<28;i++){
  const x=-4.38+i*.325,uneven=(i%5===0?.045:0);
  block(x,-.34+uneven,1.4,.31,.26+uneven,.22,i%4===0?stone:darkStone);
 }
 for(let x=-4.2;x<=4.25;x+=1.12){
  block(x,-1.02,1.42,.26,1.18,.38,darkStone);
  arch(x+.56,-.60,1.42,.43,darkStone);
 }
 for(const x of [-4.25,4.25]){
  block(x,.03,1.18,.24,.36,.27,stone);
  mesh(new T.ConeGeometry(.16,.42,6),darkStone,x,.40,1.18);
 }
 for(const x of [-4.4,4.4]){block(x,-.08,.1,.54,.57,.7,darkStone);block(x,.28,.1,.61,.12,.74,gold);}

 // Chains and braziers provide moving highlights on the modeled stone.
 for(const x of [-3.75,3.75])for(let i=0;i<9;i++){
  const link=mesh(new T.TorusGeometry(.06,.014,5,10),iron,x+.04*sin(i*.8),2.5-i*.16,-3.1);link.rotation.y=i%2?Math.PI/2:0;parts.chains++;
 }
 const flames=[];
 for(const x of [-3.15,3.15]){
  block(x,1.37,-3.03,.18,.75,.18,darkStone);block(x,1.79,-3.03,.38,.12,.33,iron);
  const flame=mesh(new T.ConeGeometry(.12,.38,9),ember,x,2.02,-3.02);flames.push(flame);
  mesh(new T.ConeGeometry(.054,.26,9),flameCore,x,1.99,-2.99);
  const light=new T.PointLight('#ff8368',8,5,2);light.position.set(x,2.05,-2.8);root.add(light);flames.push(light);parts.torches++;
 }
 for(const [z,opacity] of [[-9,.055],[-4,.045],[-1.7,.025]]){
  const veil=mesh(new T.PlaneGeometry(13,1.15),fogMat,0,.38,z);veil.material=fogMat.clone();veil.material.opacity=opacity;veil.castShadow=false;
 }
 const dustGeo=new T.BufferGeometry(),dustPositions=new Float32Array(360);
 for(let i=0;i<120;i++){dustPositions[i*3]=(random()-.5)*10;dustPositions[i*3+1]=random()*3;dustPositions[i*3+2]=-2-random()*8;}
 dustGeo.setAttribute('position',new T.BufferAttribute(dustPositions,3));
 const dust=new T.Points(dustGeo,new T.PointsMaterial({color:'#d9b397',size:.025,transparent:true,opacity:.36,depthWrite:false}));root.add(dust);
 return {stoneMaterials,parts,update(time){if(reduced)return;for(let i=0;i<flames.length;i+=2){flames[i].scale.y=.87+.18*sin(time*9+i);flames[i+1].intensity=7+1.5*sin(time*7+i);}for(const banner of banners){const position=banner.geometry.attributes.position;for(let i=0;i<position.count;i++){const row=Math.floor(i/5),weight=row/10;position.setZ(i,banner.base[i*3+2]+.075*weight*sin(time*1.7+banner.phase+row*.35));}position.needsUpdate=true;banner.geometry.computeVertexNormals();}dust.rotation.y=.01*sin(time*.12);},dispose(){skyTexture.dispose();bannerTexture.dispose();vista.material.map?.dispose();}};
}
