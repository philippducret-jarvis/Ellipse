import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {sampleHeroPose} from './hero-motion-3d.mjs';
export const MODEL_STYLE={
 seraphine:{skin:'#edd2c7',hair:'#d5cbd2',cloth:'#641e35',armor:'#25212e',gold:'#b9a070',glow:'#ff4566',eye:'#b92247',scale:1,weapon:'sword'},
 nyxara:{skin:'#dbc3cb',hair:'#34213f',cloth:'#382051',armor:'#211a30',gold:'#c3a273',glow:'#b066ff',eye:'#9953d2',scale:1,weapon:'orb'},
 lysael:{skin:'#efd7bd',hair:'#e7d6ad',cloth:'#e0d9c5',armor:'#ede3cb',gold:'#a89553',glow:'#bfe9a6',eye:'#538b62',scale:1,weapon:'staff'},
 voren:{skin:'#cdb4a1',hair:'#bcafb0',cloth:'#601b28',armor:'#292832',gold:'#bb8050',glow:'#ff6b25',eye:'#f66028',scale:1.11,weapon:'axe'}
};
const V=(x,y,z)=>new T.Vector3(x,y,z);
function tube(points,r=.006,segments=26){return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>V(...p))),segments,r,5,false);}
function hairLock(points,r){const curve=new T.CatmullRomCurve3(points.map(p=>V(...p))),geo=new T.TubeGeometry(curve,24,r,8,false),p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const t=uv.getX(i),c=curve.getPointAt(t),taper=Math.max(.035,Math.sin((.15+t*.85)*Math.PI));p.setXYZ(i,c.x+(p.getX(i)-c.x)*taper,c.y+(p.getY(i)-c.y)*taper,c.z+(p.getZ(i)-c.z)*taper*.6);}geo.computeVertexNormals();return geo;}
function surface(rows,segments=32){const g=new T.LatheGeometry(rows.map(([r,y])=>new T.Vector2(r,y)),segments);return g;}
/** Native volume meshes attached to named skeletal joints. Illustrations are never projected onto the model. */
export function createHeroModel(id){
 const style=MODEL_STYLE[id];if(!style)throw Error('Héros 3D inconnu');
 const male=id==='voren',root=new T.Group(),bones={},secondary=[],eyes=[],fingers=[],meshes=[];root.name=id;root.scale.setScalar(style.scale);
 const mats={};for(const [key,color]of Object.entries(style)){if(!['skin','hair','cloth','armor','gold','glow','eye'].includes(key))continue;mats[key]=new T.MeshStandardMaterial({color,roughness:key==='gold'?.28:key==='armor'?.38:key==='hair'?.48:.76,metalness:key==='gold'?.8:key==='armor'?.65:0,side:key==='cloth'?T.DoubleSide:T.FrontSide});}
 mats.glow.emissive.set(style.glow);mats.glow.emissiveIntensity=1.0;mats.glow.toneMapped=false;mats.skin.roughness=.88;mats.armor.roughness=.58;mats.armor.metalness=.4;mats.hair.roughness=.68;
 mats.dark=new T.MeshStandardMaterial({color:'#16111b',roughness:.55});mats.white=new T.MeshStandardMaterial({color:'#f1e8dc',roughness:.4});mats.lips=new T.MeshStandardMaterial({color:male?'#82605b':'#ab6872',roughness:.65});mats.leaf=new T.MeshStandardMaterial({color:'#536f3b',roughness:.7,side:T.DoubleSide});
 function joint(name,parent,pos){const b=new T.Bone();b.name=name;b.position.set(...pos);(parent??root).add(b);bones[name]=b;return b;}
 function mesh(parent,geometry,material,pos=[0,0,0],scale=[1,1,1]){const m=new T.Mesh(geometry,typeof material==='string'?mats[material]:material);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);meshes.push(m);return m;}
 function ball(parent,pos,size,mat){return mesh(parent,new T.SphereGeometry(1,18,12),mat,pos,size);}
 function rod(parent,a,b,r,mat,r2=r){const va=V(...a),vb=V(...b),d=vb.clone().sub(va);const m=mesh(parent,new T.CylinderGeometry(r2,r,d.length(),10),mat,va.clone().add(vb).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return m;}
 function line(parent,points,mat='gold',r=.005){return mesh(parent,tube(points,r),mat);}
 function ring(parent,pos,r,thick,mat='gold'){return mesh(parent,new T.TorusGeometry(r,thick,6,40),mat,pos);}
 function jewel(parent,pos,size=.035){const m=mesh(parent,new T.OctahedronGeometry(size,0),'glow',pos,[.7,1.3,.5]);return m;}
 const hips=joint('hips',root,[0,1.02,0]),spine=joint('spine',hips,[0,.14,0]),chest=joint('chest',spine,[0,.22,0]),neck=joint('neck',chest,[0,.22,0]),head=joint('head',neck,[0,.14,0]);
 const width=male?1.3:1;
 mesh(hips,surface([[.07,-.1],[.17,-.065],[.19,0],[.155,.12],[.115,.21]],28),'armor',[0,0,0],[width,1,.7]);
 mesh(spine,surface([[.13,-.015],[.122,.06],[.13,.15],[.175,.25],[.20,.32]],32),male?'skin':'armor',[0,0,0],[width,1,.72]);
 mesh(chest,surface([[.15,-.035],[.2,.035],[.205,.11],[.16,.19],[.07,.24]],32),male?'skin':'armor',[0,0,0],[width,1,.7]);
 rod(neck,[0,-.035,0],[0,.12,0],.052,'skin',.046);
 // Sculpted silhouette, jaw and cheek volume; eyes are separate eyelid/iris geometry.
 mesh(head,surface([[.018,-.105],[.052,-.09],[.083,-.045],[.099,.015],[.102,.08],[.089,.14],[.048,.175],[.005,.184]],40),'skin',[0,0,0],[male?1.06:1,1,.86]);
 ball(head,[0,-.005,.083],[.017,.035,.023],'skin');ball(head,[0,-.024,.097],[.016,.011,.015],'skin');
 for(const s of [-1,1]){
  ball(head,[s*.102,.017,0],[.016,.039,.023],'skin');
  const lid=new T.Group();lid.position.set(s*.043,.026,.080);head.add(lid);eyes.push(lid);
  ball(lid,[0,0,0],[.034,.016,.015],'white');ball(lid,[s*.001,0,.013],[.012,.013,.005],'eye');ball(lid,[s*.001,0,.017],[.006,.009,.0025],'dark');ball(lid,[-.003,.004,.019],[.0035,.003,.002],'white');
  line(head,[[s*.014,.039,.086],[s*.043,.046,.086],[s*.076,.043,.067]],'dark',.0028);
  line(head,[[s*.017,.065,.083],[s*.042,.072,.084],[s*.071,.066,.07]],'hair',.004);
  line(head,[[s*.091,-.012,.024],[s*.109,-.066,.027],[s*.10,-.10,.035]],'gold',.003);jewel(head,[s*.10,-.10,.035],.012);
 }
 line(head,[[-.029,-.049,.081],[0,-.046,.089],[.029,-.049,.081]],'lips',.0045);line(head,[[-.023,-.054,.08],[0,-.059,.086],[.023,-.054,.08]],'lips',.003);
 // Layered crown follows the head, not the camera.
 const crown=ring(head,[0,.128,0],.11,.007);crown.rotation.x=PI/2;
 for(let i=0;i<11;i++){const a=i/11*PI*2,x=Math.cos(a)*.112,z=Math.sin(a)*.09,h=(i%2?.08:.13)*(male?1.1:1);line(head,[[x,.12,z],[x*1.09,.17,z*1.09],[x*.87,.15+h,z*.87]],'gold',.005);if(i%2===0)jewel(head,[x*.9,.16+h*.62,z*.9],.018);}
 if(id==='seraphine')for(let i=0;i<5;i++){const a=i*.5+.5;for(let p=0;p<6;p++)ball(head,[Math.cos(a)*.12+Math.sin(p)*.012,.16+Math.cos(p)*.009,Math.sin(a)*.09],[.019,.013,.015],'cloth');}
 if(id==='lysael')for(let i=0;i<12;i++){const a=i/12*PI*2;const leaf=ball(head,[Math.cos(a)*.13,.21+(i%3)*.023,Math.sin(a)*.10],[.013,.045,.008],'leaf');leaf.rotation.z=a;}
 // Hair cap and individually hinged, curved locks with genuine depth.
 mesh(head,new T.SphereGeometry(.108,24,16,0,PI*2,0,PI*.57),'hair',[0,.067,-.019],[1,1.1,.9]);
 for(let i=0;i<26;i++){
  const a=i/26*PI*2,front=Math.sin(a)>.35,len=front?.23:male?.51:.82;
  const g=new T.Group();g.position.set(Math.cos(a)*.095,.12,Math.sin(a)*.082-.008);head.add(g);
  const x=Math.cos(a),z=Math.sin(a);
  const sign=x<0?-1:1;
  const points=front?[[0,0,0],[sign*.04,-.005,.018],[sign*(.12-Math.abs(x)*.07),-.06,.032],[sign*(.15-Math.abs(x)*.06),-.24,-.035]]:[[0,0,0],[x*.018,-.1,z*.03],[x*.045,-len*.5,z*.07-.025],[x*.10+Math.sin(i)*.022,-len,z*.08-.025]];
  mesh(g,hairLock(points,front?.022:.035),'hair');
  secondary.push({group:g,kind:'hair',phase:i*.7,base:g.rotation.clone()});
 }
 // Arms, elbows, wrists and fingers move independently.
 for(const [side,s]of [['L',1],['R',-1]]){
  const upper=joint('upperArm'+side,chest,[s*(male?.27:.215),.12,0]),lower=joint('lowerArm'+side,upper,[0,-.285,0]),hand=joint('hand'+side,lower,[0,-.265,0]);
  ball(upper,[0,-.025,0],[male?.09:.048,.073,.059],'armor');rod(upper,[0,-.02,0],[0,-.27,0],male?.071:.043,'skin',male?.079:.051);
  ball(lower,[0,0,0],[.048,.048,.047],'armor');mesh(lower,surface([[.037,-.25],[.05,-.19],[.061,-.055],[.051,.01]],20),'armor',[0,0,0],[male?1.3:1,1,.85]);
  for(let k=0;k<4;k++){const y=-.06-k*.05;const r=ring(lower,[0,y,.003],.052-k*.004,.0038);r.rotation.x=PI/2;}
  line(lower,[[0,.016,.05],[.038,-.08,.03],[0,-.24,.04],[-.038,-.08,.03],[0,.016,.05]],'gold',.004);
  ball(hand,[0,-.04,0],[.038,.056,.022],'skin');
  for(let k=0;k<5;k++){const f=new T.Group();f.position.set((k-2)*.015,-.071,k===0?.015:0);hand.add(f);rod(f,[0,0,0],[0,-(k===0?.032:.049),.006],.008,'skin',.006);fingers.push({group:f,index:k});}
  // Shoulder plate with filigree and spikes/foliage.
  const plate=new T.Shape();plate.moveTo(-.065,.045);plate.lineTo(.012,.08);plate.lineTo(.1,.025);plate.lineTo(.06,-.065);plate.lineTo(0,-.025);plate.lineTo(-.06,-.065);plate.closePath();const shoulder=mesh(upper,new T.ExtrudeGeometry(plate,{depth:.09,bevelEnabled:true,bevelSize:.012,bevelThickness:.013,bevelSegments:2}),'armor',[s*.012,.01,-.045],[male?1.7:1,1,1]);shoulder.rotation.z=-s*.16;
  for(let k=0;k<4;k++){const x=s*(.025+k*.024),z=(k%2?1:-1)*.035;line(upper,[[x*.4,.055,z],[x,.10,z],[x*1.3,.11+(male?.07:.015),z]],'gold',.004);}
  if(id==='lysael')for(let k=0;k<3;k++){const l=ball(upper,[s*.045,.035,k*.045-.04],[.017,.047,.013],'leaf');l.rotation.z=s*.7;}
 }
 // Legs with knee flexion, ankle motion and separate feet.
 for(const [side,s]of [['L',1],['R',-1]]){
  const thigh=joint('thigh'+side,hips,[s*.094,-.065,0]),shin=joint('shin'+side,thigh,[0,-.435,0]),foot=joint('foot'+side,shin,[0,-.425,0]);
  mesh(thigh,surface([[.045,-.43],[.063,-.32],[.083,-.10],[.09,0]],22),id==='lysael'?'skin':'armor',[0,0,0],[male?1.14:1,1,.9]);
  ball(shin,[0,.01,.012],[.061,.063,.054],'armor');mesh(shin,surface([[.037,-.41],[.045,-.30],[.067,-.16],[.059,.025]],22),id==='lysael'?'skin':'armor',[0,0,0],[1,1,.85]);
  ball(foot,[0,-.022,.063],[.046,.041,.133],id==='lysael'?'skin':'armor');
  line(shin,[[0,.055,.062],[.039,-.09,.045],[0,-.34,.04],[-.039,-.09,.045],[0,.055,.062]],'gold',.005);
  line(foot,[[-.045,-.02,.01],[0,.003,.11],[.045,-.02,.01]],'gold',.005);
  jewel(shin,[0,-.04,.059],.025);
 }
 // Tailored bodice filigree follows torso segments. Volcanic chest for Voren.
 for(const s of [-1,1]){
  for(let k=0;k<5;k++){const y=.005+k*.048;line(spine,[[s*.018,y,.105],[s*.10,y+.025,.12],[s*.125,y+.055,.092]],'gold',.0035);line(spine,[[s*.035,y,.11],[s*.062,y+.038,.119],[s*.018,y+.044,.11]],'gold',.0023);}
  line(chest,[[s*.18,.11,.10],[s*.11,.17,.12],[0,.19,.10]],'gold',.0045);for(let k=0;k<3;k++)line(chest,[[s*.01,.04+k*.04,.13],[s*.09,.035+k*.045,.151],[s*.18,.08+k*.027,.09]],'gold',.0028);
  if(male){ball(chest,[s*.107,.058,.115],[.105,.065,.042],'skin');for(let k=0;k<3;k++)ball(spine,[s*.045,.04+k*.06,.101],[.041,.035,.016],'skin');}
 }
 jewel(chest,[0,.16,.12],.035);jewel(hips,[0,.07,.13],.036);
 for(let i=0;i<12;i++){
  const a=i/12*PI*2;line(hips,[[Math.cos(a)*.16,.055,Math.sin(a)*.115],[Math.cos(a+.2)*.20,-.10,Math.sin(a+.2)*.14],[Math.cos(a+.3)*.21,-.22,Math.sin(a+.3)*.15]],'gold',.004);
 }
 // Cloth panels have their own hinges and curved volume. Open front preserves leg readability.
 const count=male?9:13;
 for(let i=0;i<count;i++){
  const a=.55+i/(count-1)*(PI*2-1.1),g=new T.Group();g.rotation.y=a;hips.add(g);g.position.set(0,.055,0);
  const pos=[],uv=[],idx=[],rows=12,cols=5,len=male?.82:.95,w=male?.17:.14;
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const t=y/rows,u=x/cols;pos.push((u-.5)*w*(1+t*1.8),-t*len,.16+t*t*.18+Math.sin(u*PI*3)*.015*(.3+t));uv.push(u,t);}
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const n=y*(cols+1)+x;idx.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();mesh(g,geo,i%3===0?'armor':'cloth');
  line(g,[[-w*.46,0,.165],[-w*.70,-len*.45,.20],[-w*1.24,-len*.94,.32]],'gold',.0035);
  for(let k=0;k<4;k++){const y=.15+k*.17,z=.16+(y/len)**2*.18;line(g,[[0,-y,z+.014],[.033,-y-.055,z+.02],[0,-y-.11,z+.03],[-.033,-y-.055,z+.02],[0,-y,z+.014]],'gold',.0025);}
  if(id==='lysael'&&i%2===0){for(let k=0;k<4;k++){const l=ball(g,[Math.sin(k)*.04,-.16-k*.18,.18+k*.032],[.023,.052,.009],'leaf');l.rotation.z=k*.7;}}
  secondary.push({group:g,kind:'cloth',phase:i*.65,base:g.rotation.clone()});
 }
 // Shoulder cape behind the body, separate from skirt and hair.
 for(const s of [-1,1]){const g=new T.Group();g.position.set(s*.14,.13,-.06);chest.add(g);const points=[[0,0,0],[s*.10,-.35,-.09],[s*.20,-.75,-.15],[s*.3,-1.3,-.17]];line(g,points,'cloth',male?.1:.06);secondary.push({group:g,kind:'cape',phase:s,base:g.rotation.clone()});}
 const weapon=new T.Group();weapon.name='weapon';bones.handR.add(weapon);weapon.position.set(0,-.05,.022);
 if(style.weapon==='sword'){
  rod(weapon,[0,-.13,0],[0,.11,0],.017,'dark');rod(weapon,[-.14,-.1,0],[.14,-.1,0],.013,'gold');
  const shape=new T.Shape();shape.moveTo(-.042,-.11);shape.lineTo(-.037,-.76);shape.lineTo(0,-1.03);shape.lineTo(.037,-.76);shape.lineTo(.042,-.11);shape.closePath();mesh(weapon,new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSize:.006,bevelThickness:.007,bevelSegments:1}),'armor',[0,0,-.012]);line(weapon,[[0,-.13,.025],[0,-.72,.025],[0,-.98,.025]],'glow',.007);jewel(weapon,[0,-.09,.032],.032);
 }else if(style.weapon==='axe'){
  rod(weapon,[0,.24,0],[0,-.98,0],.025,'dark');for(let i=0;i<7;i++){const r=ring(weapon,[0,-.1-i*.1,0],.029,.005);r.rotation.x=PI/2;}
  for(const s of [-1,1]){const shape=new T.Shape();shape.moveTo(0,-.43);shape.lineTo(s*.24,-.38);shape.lineTo(s*.39,-.48);shape.quadraticCurveTo(s*.42,-.67,s*.27,-.91);shape.lineTo(s*.12,-.77);shape.lineTo(0,-.72);shape.closePath();mesh(weapon,new T.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:1}),'armor',[0,0,-.02]);line(weapon,[[s*.24,-.4,.04],[s*.36,-.5,.04],[s*.36,-.66,.04],[s*.26,-.87,.04]],'glow',.008);}
 }else if(style.weapon==='staff'){
  rod(weapon,[0,-.91,0],[0,.64,0],.02,'gold');line(weapon,[[.018,-.8,0],[-.03,-.3,.015],[.035,.1,0],[0,.65,0]],'gold',.012);
  for(let i=0;i<3;i++){const r=ring(weapon,[0,.69,0],.137,.01);r.rotation.y=i*PI/3;}
  ball(weapon,[0,.69,0],[.065,.065,.065],'glow');for(let i=0;i<7;i++){const a=i/7*PI*2,l=ball(weapon,[Math.cos(a)*.16,.69+Math.sin(a)*.16,0],[.025,.05,.012],'leaf');l.rotation.z=-a;}
 }else{
  ball(weapon,[0,-.08,.17],[.09,.09,.09],'dark');const orb=ball(weapon,[0,-.08,.17],[.059,.059,.059],'glow');
  for(let i=0;i<3;i++){const r=ring(weapon,[0,-.08,.17],.11+i*.017,.003,'glow');r.rotation.set(i*.8,i*.9,.4);secondary.push({group:r,kind:'orbit',phase:i,base:r.rotation.clone()});}
  // Raven perched on the left shoulder; wing feathers are three-dimensional.
  const bird=new T.Group();bird.position.set(.26,.25,-.03);chest.add(bird);ball(bird,[0,0,0],[.062,.078,.065],'dark');ball(bird,[0,.086,.02],[.04,.041,.045],'dark');rod(bird,[0,.083,.05],[0,.078,.105],.016,'gold',.001);jewel(bird,[.028,.09,.047],.006);
  for(const s of [-1,1])for(let i=0;i<4;i++){const feather=ball(bird,[s*(.043+i*.007),-.025-i*.02,-.015],[.014,.079,.013],'hair');feather.rotation.z=s*-.3;}
 }
 const effect=new T.Group();effect.name='magic';root.add(effect);const halo=ring(effect,[0,1.23,0],.63,.008,'glow');halo.rotation.x=PI/2;
 const sparks=[];for(let i=0;i<12;i++){const m=mesh(effect,new T.OctahedronGeometry(.018),'glow');sparks.push(m);}
 // Batch only static children within each joint; keep animated secondary objects separate.
 const animated=new Set([...secondary.map(s=>s.group),...sparks,halo]);const parents=[];root.traverse(o=>{if(o.children.length)parents.push(o);});
 for(const parent of parents){const groups=new Map();for(const child of [...parent.children]){if(!child.isMesh||animated.has(child)||child.children.length)continue;const list=groups.get(child.material)??[];list.push(child);groups.set(child.material,list);}for(const [material,list]of groups){if(list.length<2)continue;const geometries=list.map(m=>{m.updateMatrix();let geo=m.geometry.clone();if(geo.index){const previous=geo;geo=geo.toNonIndexed();previous.dispose();}return geo.applyMatrix4(m.matrix);});const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!merged)continue;for(const m of list){parent.remove(m);m.geometry.dispose();}mesh(parent,merged,material);}}
 const skeleton=new T.Skeleton(Object.values(bones));root.userData={heroId:id,representation:'articulated-volume',jointCount:Object.keys(bones).length,secondaryCount:secondary.length,artStatus:'first-volume-study'};
 function apply(pose,time=0){
  for(const [name,r]of Object.entries(pose.joints))bones[name].rotation.set(...r);
  hips.position.set(pose.offset[0],1.02+pose.offset[1],pose.offset[2]);root.rotation.y=pose.yaw;
  for(const e of eyes)e.scale.y=Math.max(.06,1-pose.blink*.94);
  for(const f of fingers)f.group.rotation.x=-.2-pose.grip*.6;
  for(const s of secondary){s.group.rotation.copy(s.base);if(s.kind==='orbit'){s.group.rotation.y+=time*.8;s.group.rotation.z+=time*.6;}else{s.group.rotation.x+=Math.sin(time*1.7+s.phase)*(s.kind==='hair'?.045:.075)+pose.joints.spine[0]*.13;s.group.rotation.z+=Math.sin(time*1.15+s.phase)*.025;}}
  effect.visible=pose.effect>.015;effect.scale.setScalar(.75+pose.effect*.5);halo.rotation.z=time;for(let i=0;i<sparks.length;i++){const a=time*.8+i*PI/6;sparks[i].position.set(Math.cos(a)*.54,.5+(i/12)*1.5,Math.sin(a)*.54);sparks[i].rotation.y=time+i;}
  root.updateMatrixWorld(true);
 }
 apply(sampleHeroPose(id,'idle',0));
 return {root,bones,skeleton,style,apply,meshes,animatedNodes:[root,...Object.values(bones),...secondary.map(s=>s.group),...eyes],dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());skeleton.dispose();}};
}
const PI=Math.PI;
