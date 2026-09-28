// Three homologous landmarks align a generated layer without rewriting its PNG.
export const LAYER_RIG = {
  schema:'shadow-layer-rig-2',heroId:'seraphine',status:'combat_study_review',fidelity_approved:false,
  frame:{width:1024,height:1536,paddingX:600,paddingY:150},
  files:{body:'../../03_assets/characters/seraphine/layers-v1/body.png',arm:'../../03_assets/characters/seraphine/layers-v1/arm-sword-v2.png'},
  sourceAnchors:[[545,180],[438,596],[40,1509]],targetAnchors:[[422,337],[342,708],[18,1438]],
  pivot:[422,337],shoulderOccluder:[[378,270],[454,278],[477,330],[451,395],[374,364]],
  limits:{angleMin:-80,angleMax:12},
};
export const LEGACY_LAYER_RIG={...LAYER_RIG,schema:'shadow-layer-rig-1',status:'alignment_review',files:{...LAYER_RIG.files,arm:'../../03_assets/characters/seraphine/layers-v1/arm-sword.png'},sourceAnchors:[[508,180],[438,596],[40,1509]]};
export function alignThreePoints(source,target){
  if(source.length!==3||target.length!==3||[...source.flat(),...target.flat()].some(v=>!Number.isFinite(v)))throw new Error('Trois repères finis requis');
  const [[x0,y0],[x1,y1],[x2,y2]]=source,[[u0,v0],[u1,v1],[u2,v2]]=target;
  const dx1=x1-x0,dy1=y1-y0,dx2=x2-x0,dy2=y2-y0,det=dx1*dy2-dx2*dy1;
  if(Math.abs(det)<1e-6)throw new Error('Repères alignés : calibration impossible');
  const a=((u1-u0)*dy2-(u2-u0)*dy1)/det,c=(dx1*(u2-u0)-dx2*(u1-u0))/det;
  const b=((v1-v0)*dy2-(v2-v0)*dy1)/det,d=(dx1*(v2-v0)-dx2*(v1-v0))/det;
  return [a,b,c,d,u0-a*x0-c*y0,v0-b*x0-d*y0];
}
export function swing(time,duration=1.8){
  const t=((Math.max(0,time)%duration)/duration);
  const ease=x=>x*x*(3-2*x);
  // Small anticipation, clean rigid sweep, deliberately slower recovery.
  if(t<.22)return 10*ease(t/.22);
  if(t<.52)return 10-82*ease((t-.22)/.30);
  return -72+72*ease((t-.52)/.48);
}
export class LayerActor {
  constructor(host,body,arm,rig=LAYER_RIG,settings={}){
    this.settings=settings;
    this.host=host;this.body=body;this.arm=arm;this.rig=rig;this.alignment=alignThreePoints(rig.sourceAnchors,rig.targetAnchors);
    this.canvas=document.createElement('canvas');this.canvas.className='layer-canvas';host.append(this.canvas);
    this.ctx=this.canvas.getContext('2d');this.options={angle:0};
    this.observer=new ResizeObserver(()=>{this.resize();this.draw(this.options);});this.observer.observe(host);this.resize();this.draw();
  }
  resize(){
    const f=this.rig.frame,scale=Math.min(this.host.clientWidth/(f.width+(this.settings.fitCharacter?0:f.paddingX*2)),this.host.clientHeight/(f.height+(this.settings.fitCharacter?0:f.paddingY*2))),dpr=Math.min(devicePixelRatio||1,2);
    const w=(f.width+f.paddingX*2)*scale,h=(f.height+f.paddingY*2)*scale;
    this.canvas.style.width=`${w}px`;this.canvas.style.height=`${h}px`;this.canvas.width=Math.max(1,Math.round(w*dpr));this.canvas.height=Math.max(1,Math.round(h*dpr));
  }
  draw(options={}){
    this.options={angle:0,body:true,arm:true,pivots:false,separate:0,reference:0,...options};
    const o=this.options,ctx=this.ctx,f=this.rig.frame,angle=Math.min(this.rig.limits.angleMax,Math.max(this.rig.limits.angleMin,Number(o.angle)||0));
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    ctx.scale(this.canvas.width/(f.width+f.paddingX*2),this.canvas.height/(f.height+f.paddingY*2));ctx.translate(f.paddingX,f.paddingY);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.save();ctx.translate(512+(o.rootX??0),1440+(o.rootY??0));ctx.rotate((o.bodyAngle??0)*Math.PI/180);ctx.translate(-512,-1440);
    if(o.body)ctx.drawImage(this.body,0,0);
    if(o.arm){ctx.save();ctx.translate(this.rig.pivot[0]-o.separate,this.rig.pivot[1]);ctx.rotate(angle*Math.PI/180);ctx.translate(-this.rig.pivot[0],-this.rig.pivot[1]);ctx.transform(...this.alignment);ctx.drawImage(this.arm,0,0);ctx.restore();}
    if(o.arm&&o.body&&!o.separate){ctx.save();ctx.beginPath();for(const [i,p]of this.rig.shoulderOccluder.entries())i?ctx.lineTo(...p):ctx.moveTo(...p);ctx.closePath();ctx.clip();ctx.drawImage(this.body,0,0);ctx.restore();}
    ctx.restore();
    if(o.reference&&this.reference){ctx.save();ctx.globalAlpha=o.reference;ctx.drawImage(this.reference,0,0);ctx.restore();}
    if(o.pivots){
      for(const [i,p]of this.rig.targetAnchors.entries()){
        ctx.strokeStyle='#ffdea2';ctx.fillStyle='#16101b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(...p,11,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.font='22px sans-serif';ctx.fillStyle='#ffe5b3';ctx.fillText(['Épaule','Main','Pointe'][i],p[0]+20,p[1]-8);
      }
    }
    this.canvas.dataset.angle=String(angle);
  }
  destroy(){this.observer.disconnect();this.canvas.remove();}
}
