/** Authored motion in radians/metres; independent of render frequency. No image deformation. */
const clip=(label,duration,loop=false,group='Combat')=>({label,duration,loop,group});
export const MOTIONS={
 idle:clip('Respiration',4,true,'Présence'),idleLook:clip('Regard et appui',6,true,'Présence'),
 walk:clip('Marche',1.1,true,'Déplacement'),run:clip('Course',.68,true,'Déplacement'),stop:clip('Arrêt',.5,false,'Déplacement'),turn:clip('Demi-tour',1.1,false,'Déplacement'),
 strafeLeft:clip('Pas latéral gauche',1,true,'Déplacement'),strafeRight:clip('Pas latéral droit',1,true,'Déplacement'),
 dodgeForward:clip('Esquive avant',.7,false,'Déplacement'),dodgeBack:clip('Esquive arrière',.7,false,'Déplacement'),dodgeLeft:clip('Esquive gauche',.7,false,'Déplacement'),dodgeRight:clip('Esquive droite',.7,false,'Déplacement'),
 attack1:clip('Combo · ouverture',.65),attack2:clip('Combo · revers',.8),attack3:clip('Combo · conclusion',1.05),windup:clip('Préparation',.6),guard:clip('Garde',1.4,true),hitLight:clip('Impact léger',.55),hitHeavy:clip('Impact lourd',1),
 skill1Start:clip('Compétence I · préparation',.65,false,'Compétences'),skill1Cast:clip('Compétence I · lancement',1,false,'Compétences'),skill1End:clip('Compétence I · retour',.6,false,'Compétences'),
 skill2Start:clip('Compétence II · préparation',.65,false,'Compétences'),skill2Cast:clip('Compétence II · lancement',1.2,false,'Compétences'),skill2End:clip('Compétence II · retour',.6,false,'Compétences'),
 skill3Start:clip('Compétence III · préparation',.8,false,'Compétences'),skill3Cast:clip('Compétence III · lancement',1.3,false,'Compétences'),skill3End:clip('Compétence III · retour',.7,false,'Compétences'),
 ultimateStart:clip('Ultime · rassemblement',1,false,'Ultime'),ultimateCast:clip('Ultime · libération',1.7,false,'Ultime'),ultimateHold:clip('Ultime · maintien',1.4,true,'Ultime'),ultimateEnd:clip('Ultime · réception',.9,false,'Ultime'),
 knockdown:clip('Chute',1.2,false,'Réactions'),death:clip('À terre',1.8,false,'Réactions'),revive:clip('Résurrection',2,false,'Réactions'),heal:clip('Soin reçu',1.8,false,'Réactions'),buff:clip('Bénédiction',1.6,false,'Réactions'),interact:clip('Interaction',1.5,false,'Réactions'),
 victory:clip('Victoire',3,false,'Présentation'),defeat:clip('Défaite',2.2,false,'Présentation'),select:clip('Salut de sélection',2,false,'Présentation'),summon:clip('Dévoilement',3.4,false,'Présentation')
};
export const JOINTS=['hips','spine','chest','neck','head','upperArmL','lowerArmL','handL','upperArmR','lowerArmR','handR','thighL','shinL','footL','thighR','shinR','footR'];
const S=Math.sin,C=Math.cos,PI=Math.PI,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const bump=(p,a,b)=>p<a?ease(p/a):1-ease((p-a)/(b-a));
export function sampleHeroPose(id,name='idle',time=0){
 const def=MOTIONS[name]??MOTIONS.idle,t=Math.max(0,Number.isFinite(time)?time:0),p=def.loop?(t%def.duration)/def.duration:clamp(t/def.duration);
 const j=Object.fromEntries(JOINTS.map(n=>[n,[0,0,0]])),heavy=id==='voren',mage=id==='nyxara',healer=id==='lysael',q=heavy?.8:1;
 const pose={joints:j,offset:[0,0,0],yaw:0,blink:Math.pow(Math.max(0,C(t*1.4+1.7)),45),effect:0,grip:.65};
 j.upperArmL=[.04,0,.12];j.upperArmR=[.04,0,-.12];j.lowerArmL=[-.18,0,0];j.lowerArmR=[-.18,0,0];
 if(mage){j.upperArmR=[-.42,0,-.32];j.lowerArmR=[-1.0,0,0];j.handR=[-.2,0,.12];}
 if(healer){j.upperArmR=[-.12,0,-.2];j.lowerArmR=[-.5,0,0];}
 j.chest[0]=S(t*1.7)*.012;j.spine[2]=S(t*.8)*.009;j.head[1]=S(t*.65)*.055;
 pose.offset[1]=S(t*1.7)*.005;
 if(name==='neutral'){for(const a of Object.values(j))a.fill(0);pose.offset=[0,0,0];pose.blink=0;return pose;}
 if(name==='idleLook'){j.head[1]=S(p*PI*2)*.24;j.head[2]=S(p*PI*2)*.08;j.hips[2]=S(p*PI*2)*.04;j.lowerArmL[0]-=S(p*PI)**4*.3;}
 if(['walk','run','strafeLeft','strafeRight'].includes(name)){
  const fast=name==='run',phase=p*PI*2,a=fast?.8:.4;
  for(const [side,off]of [['L',0],['R',PI]]){const s=S(phase+off);j['thigh'+side][0]=s*a;j['shin'+side][0]=Math.max(0,-s)*a*1.4;j['foot'+side][0]=-Math.max(0,s)*.2;j['upperArm'+side][0]=-s*a*.65;j['lowerArm'+side][0]=fast?-.9:-.25;}
  j.spine[0]=fast?.12:.025;j.chest[1]=S(phase)*.09;pose.offset[1]=Math.abs(C(phase))*(fast?.045:.018);
  if(name.startsWith('strafe')){const side=name==='strafeLeft'?1:-1;j.thighL[2]=side*.24+S(phase)*.16;j.thighR[2]=side*.24-S(phase)*.16;j.spine[2]=side*-.09;}
 }
 if(name==='stop'){j.spine[0]=S(p*PI)*.18;j.shinL[0]=S(p*PI)*.25;pose.offset[1]=-S(p*PI)*.07;}
 if(name==='turn'){pose.yaw=ease(p)*PI;j.chest[1]=S(p*PI)*.25;j.thighL[0]=S(p*PI*2)*.28;j.thighR[0]=-S(p*PI*2)*.28;}
 if(name.startsWith('dodge')){const b=S(p*PI),side=name==='dodgeLeft'?1:name==='dodgeRight'?-1:0;j.hips[0]=b*.5;j.spine[2]=side*b*.3;j.thighL[0]=-b*.55;j.shinL[0]=b*1.1;j.thighR[0]=-b*.45;j.shinR[0]=b*.95;pose.offset[1]=-b*.24;j.upperArmL[0]=b*.35;j.upperArmR[0]=b*.35;}
 if(name.startsWith('attack')||name==='windup'){
  const n=Number(name.at(-1))||1,a=bump(p,.32,1),strike=ease((p-.25)/.25)*(1-ease((p-.65)/.35));
  j.chest[1]=(n===2?-1:1)*(-a*.45+strike*1.15)*q;j.spine[0]=strike*.12;
  if(mage||healer){j.upperArmR=[-a*.4-strike*.95,0,-.25];j.lowerArmR=[-a*.8+strike*.6,0,0];j.handR=[strike*.45,0,0];j.upperArmL[2]=a*.35;pose.effect=strike;}
  else{j.upperArmR=[-a*1.7+strike*1.4,(n===2?-1:1)*a*.4,-.25-a*.55];j.lowerArmR=[-.3-a*.85+strike*.65,0,0];j.handR[0]=strike*.5;j.upperArmL=[-.2-a*.6,0,.35];j.lowerArmL[0]=-.7;j.thighL[0]=-strike*.28;j.shinL[0]=strike*.4;pose.offset[2]=strike*.08;}
  if(n===3){j.upperArmR[0]-=a*.6;j.hips[0]+=strike*.2;pose.offset[1]=-strike*.09;}
 }
 if(name==='guard'){j.upperArmL=[-.9,0,.35];j.lowerArmL=[-1.5,0,0];j.upperArmR=[-.55,0,-.3];j.lowerArmR=[-1.2,0,0];j.shinL[0]=.2;j.thighL[0]=-.15;pose.offset[1]=-.03;}
 if(name.startsWith('hit')){const b=bump(p,.18,1)*(name==='hitHeavy'?1:.5);j.chest[0]=-b*.3;j.head[0]=-b*.2;j.hips[2]=b*.1;j.upperArmL[2]+=b*.3;pose.offset[2]=-b*.1;}
 const m=name.match(/^skill([123])(Start|Cast|End)$/);
 if(m){const n=+m[1],stage=m[2],a=stage==='Start'?ease(p):stage==='End'?1-ease(p):1,b=stage==='Cast'?S(p*PI):0;
  j.upperArmR=[-(.65+n*.3)*a,0,-(.25+n*.13)*a];j.lowerArmR=[-a*.65+b*.5,0,0];j.handR[0]=a*.2;j.upperArmL=[-(.25+n*.25)*a,0,(.3+n*.14)*a];j.lowerArmL[0]=-a*.6;j.chest[1]=a*.13*(mage?-1:1);j.head[0]=-a*.08;
  if(heavy){j.upperArmR[0]-=a*.6;j.upperArmL[0]-=a*.5;j.spine[0]=b*.32;pose.offset[1]=-b*.1;}
  if(n===2)j.chest[1]+=b*.55;if(n===3){j.upperArmL[2]+=.3*a;j.upperArmR[2]-=.3*a;}
  pose.effect=stage==='Cast'?b:a*.15;
 }
 if(name.startsWith('ultimate')){const stage=name.slice(8),a=stage==='Start'?ease(p):stage==='End'?1-ease(p):1,b=stage==='Cast'?S(p*PI):a;
  j.upperArmR=[-a*1.7,0,-a*.8];j.upperArmL=[-a*1.4,0,a*.8];j.lowerArmR[0]=-a*.5;j.lowerArmL[0]=-a*.7;j.head[0]=-a*.15;j.chest[0]=-a*.08;pose.offset[1]=heavy?-a*.08:a*.13;pose.effect=b;
  if(heavy&&stage==='Cast'){j.spine[0]=b*.45;j.upperArmR[0]+=b*1.2;}
 }
 if(['knockdown','death','revive','defeat'].includes(name)){
  const a=name==='revive'?1-ease(p):ease(p);j.thighL[0]=-a*1.15;j.shinL[0]=a*2.1;j.thighR[0]=-a*.7;j.shinR[0]=a*1.65;j.spine[0]=a*.4;j.head[0]=a*.35;j.upperArmL[0]=-a*.15;j.upperArmR[0]=-a*.25;pose.offset[1]=-a*.48;
  if(name==='death'){j.hips[2]=a*.75;pose.offset[1]-=a*.22;}
 }
 if(['heal','buff','select','victory','interact','summon'].includes(name)){
  const a=name==='summon'?1-ease(p):S(p*PI),salute=name==='select'||name==='interact';
  j.upperArmL=[-a*(salute?.6:1),0,a*.6];j.lowerArmL[0]=-a*(salute?1.6:.65);j.handL[2]=a*.2;j.head[0]=salute?a*.1:-a*.1;
  if(!salute){j.upperArmR=[-a*1.1,0,-a*.65];j.lowerArmR[0]=-a*.65;pose.effect=a*.65;}
  if(name==='summon'){pose.offset[1]=a*.45;j.thighL[0]=-a*.15;j.shinL[0]=a*.35;pose.yaw=-a*.7;}
  if(name==='victory'){j.upperArmR[0]=-a*2.6;j.lowerArmR[0]=-.2;j.chest[1]=a*.15;}
 }
 return pose;
}
export const CLIP_ALIASES={attack:'attack1',skill:'skill1Cast',ultimate:'ultimateCast',hit:'hitLight'};
export function resolvedMotion(name){return CLIP_ALIASES[name]??name;}
export function mixPoses(a,b,w){const mix=(x,y)=>x+(y-x)*clamp(w);return {joints:Object.fromEntries(JOINTS.map(n=>[n,a.joints[n].map((v,i)=>mix(v,b.joints[n][i]))])),offset:a.offset.map((v,i)=>mix(v,b.offset[i])),yaw:mix(a.yaw,b.yaw),blink:mix(a.blink,b.blink),effect:mix(a.effect,b.effect),grip:mix(a.grip,b.grip)};}
