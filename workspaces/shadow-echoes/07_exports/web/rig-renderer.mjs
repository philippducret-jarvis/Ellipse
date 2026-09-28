import {createMesh, samplePose, boneMatrices, deform, transform, CLIPS} from './rig-motion.mjs';

const vertexSource=`
attribute vec2 a_position;
attribute vec2 a_uv;
attribute float a_weight;
uniform vec2 u_size;
uniform float u_padding;
varying vec2 v_uv;
varying float v_weight;
void main(){
  gl_Position=vec4((a_position+u_padding)/u_size*vec2(2.0,-2.0)+vec2(-1.0,1.0),0.0,1.0);
  v_uv=a_uv;v_weight=a_weight;
}`;
const fragmentSource=`
precision highp float;
uniform sampler2D u_texture;
uniform float u_heat;
uniform float u_wire;
varying vec2 v_uv;
varying float v_weight;
void main(){
  vec4 c=texture2D(u_texture,v_uv);
  vec3 heat=mix(vec3(0.07,0.19,0.45),vec3(1.0,0.25,0.15),v_weight);
  c.rgb=mix(c.rgb,heat,u_heat*0.75);
  if(u_wire>0.5)c=vec4(0.5,0.95,0.83,0.4);
  gl_FragColor=vec4(c.rgb*c.a,c.a);
}`;
function shader(gl,type,source) {
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const info=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(`Shader indisponible : ${info}`);}return s;
}

/** A deformable mesh over an unchanged RGBA texture; no rectangular body crops. */
export class MeshActor {
  constructor(host,rig,image,{onFallback=()=>{}}={}) {
    this.host=host;this.rig=rig;this.image=image;this.mesh=createMesh(rig);this.output=new Float32Array(this.mesh.positions.length);
    this.onFallback=onFallback;this.disposed=false;this.lost=false;this.options={};
    this.canvas=document.createElement('canvas');this.canvas.className='mesh-actor';this.canvas.setAttribute('aria-hidden','true');
    this.overlay=document.createElement('canvas');this.overlay.className='mesh-overlay';this.overlay.setAttribute('aria-hidden','true');
    this.context=this.overlay.getContext('2d');
    this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,preserveDrawingBuffer:true});
    if(!this.gl) throw new Error('WebGL indisponible');
    this.onLost=e=>{e.preventDefault();this.lost=true;this.canvas.hidden=true;this.overlay.hidden=true;this.onFallback(true);};
    this.onRestored=()=>{if(this.disposed)return;try{this.setup();this.lost=false;this.canvas.hidden=false;this.onFallback(false);this.draw(this.lastClip??'neutral',this.lastTime??0,this.lastStrength??1,this.options);}catch{this.onFallback(true);}};
    this.canvas.addEventListener('webglcontextlost',this.onLost);this.canvas.addEventListener('webglcontextrestored',this.onRestored);
    this.setup();host.append(this.canvas,this.overlay);
    this.resizeObserver=new ResizeObserver(()=>{if(!this.disposed){this.resize();this.draw(this.lastClip??'neutral',this.lastTime??0,this.lastStrength??1,this.options);}});
    this.resizeObserver.observe(host);this.resize();this.draw('neutral',0);
  }
  setup() {
    const gl=this.gl;this.buffers=[];this.program=gl.createProgram();
    const vertex=shader(gl,gl.VERTEX_SHADER,vertexSource),fragment=shader(gl,gl.FRAGMENT_SHADER,fragmentSource);
    gl.attachShader(this.program,vertex);gl.attachShader(this.program,fragment);gl.linkProgram(this.program);
    gl.deleteShader(vertex);gl.deleteShader(fragment);
    if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error('Programme WebGL indisponible');
    gl.useProgram(this.program);
    const buffer=(name,size,data,usage=gl.STATIC_DRAW)=>{
      const b=gl.createBuffer();this.buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,usage);
      const loc=gl.getAttribLocation(this.program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);return b;
    };
    this.positionsBuffer=buffer('a_position',2,this.mesh.positions,gl.DYNAMIC_DRAW);
    // Power-of-two padding enables mipmaps in WebGL 1 without rescaling the master.
    // This avoids aliasing on the gold filigree at small in-game sizes.
    const textureWidth=2**Math.ceil(Math.log2(this.image.naturalWidth)),textureHeight=2**Math.ceil(Math.log2(this.image.naturalHeight));
    const uv=Float32Array.from(this.mesh.positions,(p,i)=>p/(i%2?textureHeight:textureWidth));buffer('a_uv',2,uv);
    this.weightsBuffer=buffer('a_weight',1,new Float32Array(this.mesh.positions.length/2),gl.DYNAMIC_DRAW);this.weightBone=null;
    this.indexBuffer=gl.createBuffer();this.buffers.push(this.indexBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.mesh.indices,gl.STATIC_DRAW);
    const edges=[];for(let i=0;i<this.mesh.indices.length;i+=3){const [a,b,c]=this.mesh.indices.subarray(i,i+3);edges.push(a,b,b,c,c,a);}
    this.edges=new Uint16Array(edges);this.edgeBuffer=gl.createBuffer();this.buffers.push(this.edgeBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.edgeBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.edges,gl.STATIC_DRAW);
    this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const padded=document.createElement('canvas');padded.width=textureWidth;padded.height=textureHeight;
    padded.getContext('2d').drawImage(this.image,0,0);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,padded);gl.generateMipmap(gl.TEXTURE_2D);
    this.uniforms=Object.fromEntries(['size','padding','heat','wire'].map(n=>[n,gl.getUniformLocation(this.program,`u_${n}`)]));
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
  }
  resize() {
    const {width,height,padding}=this.rig.frame,scale=Math.min(this.host.clientWidth/width,this.host.clientHeight/height);
    const w=(width+padding*2)*scale,h=(height+padding*2)*scale,dpr=Math.min(devicePixelRatio||1,2);
    for(const canvas of [this.canvas,this.overlay]) {
      canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
      const pw=Math.max(1,Math.round(w*dpr)),ph=Math.max(1,Math.round(h*dpr));
      if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
    }
  }
  draw(clip,time,strength=1,options={}) {
    if(this.disposed||this.lost)return;
    this.lastClip=clip;this.lastTime=time;this.lastStrength=strength;this.options=options;
    const pose=samplePose(this.rig,clip,time,strength),matrices=boneMatrices(this.rig,pose);
    deform(this.mesh,matrices,this.output);
    const gl=this.gl,{width,height,padding}=this.rig.frame;
    gl.useProgram(this.program);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.uniforms.size,width+padding*2,height+padding*2);gl.uniform1f(this.uniforms.padding,padding);
    gl.uniform1f(this.uniforms.heat,options.weightBone?1:0);gl.uniform1f(this.uniforms.wire,0);
    if(options.weightBone && options.weightBone!==this.weightBone) {
      this.weightBone=options.weightBone;const bone=this.rig.bones.findIndex(b=>b.id===this.weightBone);
      const values=new Float32Array(this.mesh.positions.length/2);
      for(let i=0;i<values.length;i++)values[i]=this.mesh.weights[i*this.mesh.bones+Math.max(0,bone)];
      gl.bindBuffer(gl.ARRAY_BUFFER,this.weightsBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,values);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,this.positionsBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.output);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);gl.drawElements(gl.TRIANGLES,this.mesh.indices.length,gl.UNSIGNED_SHORT,0);
    if(options.wireframe){gl.uniform1f(this.uniforms.wire,1);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.edgeBuffer);gl.drawElements(gl.LINES,this.edges.length,gl.UNSIGNED_SHORT,0);}
    this.canvas.dataset.clip=clip;
    this.overlay.hidden=!options.bones;
    if(options.bones) {
      const ctx=this.context;ctx.clearRect(0,0,this.overlay.width,this.overlay.height);
      const sx=this.overlay.width/(width+padding*2),sy=this.overlay.height/(height+padding*2);
      const points=this.rig.bones.map((b,i)=>transform(matrices[i],...b.pivot).map((p,j)=>(p+padding)*(j?sy:sx)));
      for(let i=0;i<this.rig.bones.length;i++) {
        const b=this.rig.bones[i],[x,y]=points[i],parent=this.rig.bones.findIndex(p=>p.id===b.parent);
        ctx.strokeStyle='#8cdccd';ctx.lineWidth=1.5;
        if(parent>=0){ctx.beginPath();ctx.moveTo(...points[parent]);ctx.lineTo(x,y);ctx.stroke();}
        ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle='#ffe5ab';ctx.fill();
        ctx.font=`${Math.max(10,this.overlay.width/55)}px sans-serif`;ctx.fillStyle='#fff0d3';ctx.strokeStyle='#16111e';ctx.lineWidth=3;
        ctx.strokeText(b.id,x+7,y-7);ctx.fillText(b.id,x+7,y-7);
      }
    }
  }
  destroy() {
    if(this.disposed)return;this.disposed=true;this.resizeObserver?.disconnect();
    this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestored);
    for(const buffer of this.buffers)this.gl.deleteBuffer(buffer);
    this.gl.deleteTexture(this.texture);this.gl.deleteProgram(this.program);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();this.canvas.remove();this.overlay.remove();
  }
}
export async function loadActor(host,rig,url,options) {
  const img=new Image();img.src=url;await img.decode();return new MeshActor(host,rig,img,options);
}
const priorities={idle:0,attack:20,guard:25,hit:30,skill:40,ultimate:50,defeat:100};
export class MotionPlayer {
  constructor(){this.clip='idle';this.startedAt=0;}
  trigger(clip,at) {
    if(!CLIPS[clip]||!Number.isFinite(at))return false;
    const current=this.sample(at);
    if(current.clip!=='idle' && priorities[current.clip]>priorities[clip])return false;
    this.clip=clip;this.startedAt=at;return true;
  }
  sample(at) {
    const def=CLIPS[this.clip],elapsed=Math.max(0,at-this.startedAt);
    if(!def.loop&&!def.hold&&elapsed>=def.duration)return {clip:'idle',time:at};
    return {clip:this.clip,time:def.hold?Math.min(elapsed,def.duration):elapsed};
  }
  reset(){this.clip='idle';this.startedAt=0;}
}
