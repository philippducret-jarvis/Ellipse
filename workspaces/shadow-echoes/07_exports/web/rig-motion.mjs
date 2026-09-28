export const CLIPS = {
  neutral:{label:'Pose de référence',duration:1,loop:true},
  idle:{label:'Attente',duration:4,loop:true},
  attack:{label:'Attaque',duration:.85,loop:false},
  skill:{label:'Compétence',duration:1.25,loop:false},
  ultimate:{label:'Ultime',duration:1.65,loop:false},
  hit:{label:'Impact',duration:.55,loop:false},
  guard:{label:'Garde',duration:.8,loop:false},
  defeat:{label:'Affaiblissement',duration:1.2,loop:false,hold:true},
};
const I = () => [1,0,0,1,0,0];
export function multiply(a,b) {
  return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
}
export function transform(m,x,y) {return [m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];}
const smooth = t => t*t*(3-2*t);
function envelope(t,peak=.38) {return t < peak ? smooth(t/peak) : 1-smooth((t-peak)/(1-peak));}
export function samplePose(rig,clip,time,strength=1) {
  if (!CLIPS[clip]) throw new Error(`Animation inconnue : ${clip}`);
  if (!Number.isFinite(time) || !Number.isFinite(strength)) throw new Error('Animation invalide');
  strength = Math.min(1,Math.max(0,strength));
  const def=CLIPS[clip], phase=def.loop ? ((Math.max(0,time)%def.duration)/def.duration) : Math.min(1,Math.max(0,time/def.duration));
  const pose=Object.fromEntries(rig.bones.map(b=>[b.id,{angle:0,x:0,y:0}]));
  if (clip === 'neutral' || strength === 0) return pose;
  const wave=Math.sin(phase*Math.PI*2), pulse=envelope(phase);
  const put=(id,angle=0,x=0,y=0)=>{pose[id]={angle:angle*strength,x:x*strength,y:y*strength};};
  if (clip === 'idle') {
    const breath=1-Math.cos(phase*Math.PI*2),settle=Math.sin(phase*Math.PI*4);
    put('root',wave*.16,wave*1.8,-breath*(rig.heroId==='nyxara'?4:1.5));
    put('spine',wave*.28,0,-breath*1.3);
    put('head',-wave*.45+settle*.12);put('arm',wave*.24);put('weapon',-wave*.28+settle*.08);put('farArm',-wave*.18);
    put('capeLeft',(wave*.45+settle*.09)*rig.motion.cloth);put('capeRight',(Math.sin(phase*Math.PI*2+.9)-Math.sin(.9))*.32*rig.motion.cloth);
  } else if (['attack','skill','ultimate'].includes(clip)) {
    const scale=rig.motion[clip], amount=pulse*scale;
    const windup=phase<.2 ? Math.sin(phase/.2*Math.PI)*.22*scale : 0;
    const extra=clip==='ultimate'?1.2:clip==='skill'?.85:1;
    put('root',0,(amount-windup)*18*extra,0);
    put('spine',(amount-windup)*1.5*extra,0,-amount*3);
    put('head',-amount*1.3*extra);
    put('arm',-amount*1.3*extra); put('weapon',amount*2.0*extra);
    put('farArm',-amount*1.4*extra);
    put('capeLeft',-amount*.8); put('capeRight',amount*.6);
  } else if (clip==='hit') {
    put('root',0,-pulse*13,pulse*3); put('spine',-pulse*1.3); put('head',pulse*1.3);
  } else if (clip==='guard') {
    put('spine',-pulse*.65); put('arm',pulse*.8); put('farArm',-pulse*1.5); put('head',pulse*.7);
  } else if (clip==='defeat') {
    const e=smooth(phase); put('root',-e*4,-e*10,e*12); put('spine',-e*1.7); put('head',e*2.4);
  }
  return pose;
}
export function boneMatrices(rig,pose) {
  const matrices=[], byId=new Map();
  for (const bone of rig.bones) {
    const {angle=0,x=0,y=0}=pose[bone.id]??{}, r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r),[px,py]=bone.pivot;
    const local=[c,s,-s,c,px-c*px+s*py+x,py-s*px-c*py+y];
    const parent=bone.parent===null ? I() : byId.get(bone.parent);
    if (!parent) throw new Error(`Parent absent pour ${bone.id}`);
    const matrix=multiply(parent,local); matrices.push(matrix); byId.set(bone.id,matrix);
  }
  return matrices;
}
function segmentDistance(x,y,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
  const t=length===0?0:Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/length));
  return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
}
function regionWeight(x,y,region) {
  const p=region.polygon; let inside=false, distance=Infinity;
  for(let i=0,j=p.length-1;i<p.length;j=i++) {
    const a=p[i],b=p[j];
    if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
    distance=Math.min(distance,segmentDistance(x,y,a,b));
  }
  // A broad continuous transition is necessary without reconstructed hidden layers.
  const t=Math.min(1,Math.max(0,.5+(inside?distance:-distance)/(2*region.feather)));
  return smooth(t)*region.strength;
}
export function createMesh(rig) {
  const {columns,rows}=rig.grid,{width,height}=rig.frame,n=(columns+1)*(rows+1),bones=rig.bones.length;
  const positions=new Float32Array(n*2),weights=new Float32Array(n*bones),indices=new Uint16Array(columns*rows*6);
  let index=0;
  for(let y=0;y<=rows;y++) for(let x=0;x<=columns;x++) {
    const vertex=y*(columns+1)+x,px=x/columns*width,py=y/rows*height;
    positions[vertex*2]=px;positions[vertex*2+1]=py;weights[vertex*bones]=1;
    for(const region of rig.regions) {
      const influence=regionWeight(px,py,region),bone=rig.bones.findIndex(b=>b.id===region.bone);
      if (bone<0) throw new Error('Région sans articulation');
      for(let b=0;b<bones;b++) weights[vertex*bones+b]*=1-influence;
      weights[vertex*bones+bone]+=influence;
    }
    if(x<columns && y<rows) {const a=vertex,b=a+1,c=a+columns+1,d=c+1;indices.set([a,b,c,b,d,c],index);index+=6;}
  }
  return {positions,weights,indices,bones};
}
export function deform(mesh,matrices,out=new Float32Array(mesh.positions.length)) {
  for(let i=0;i<mesh.positions.length/2;i++) {
    const x=mesh.positions[i*2],y=mesh.positions[i*2+1];let px=0,py=0;
    for(let b=0;b<mesh.bones;b++) {
      const w=mesh.weights[i*mesh.bones+b]; if(w<.000001)continue;
      const m=matrices[b];px+=(m[0]*x+m[2]*y+m[4])*w;py+=(m[1]*x+m[3]*y+m[5])*w;
    }
    out[i*2]=px;out[i*2+1]=py;
  }
  return out;
}
export function meshQuality(mesh,positions) {
  let minAreaRatio=Infinity,maxStretch=0,inverted=0;
  const area=(p,a,b,c)=>(p[b*2]-p[a*2])*(p[c*2+1]-p[a*2+1])-(p[b*2+1]-p[a*2+1])*(p[c*2]-p[a*2]);
  for(let i=0;i<mesh.indices.length;i+=3) {
    const [a,b,c]=mesh.indices.subarray(i,i+3),ratio=area(positions,a,b,c)/area(mesh.positions,a,b,c);
    minAreaRatio=Math.min(minAreaRatio,ratio);if(ratio<=0)inverted++;
    for(const [u,v] of [[a,b],[b,c],[c,a]]) {
      const length=p=>Math.hypot(p[u*2]-p[v*2],p[u*2+1]-p[v*2+1]);
      maxStretch=Math.max(maxStretch,length(positions)/length(mesh.positions));
    }
  }
  return {inverted,minAreaRatio,maxStretch};
}
