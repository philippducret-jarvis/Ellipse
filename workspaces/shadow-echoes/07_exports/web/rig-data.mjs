// Artist landmarks in the original 1024 × 1536 texture. No source pixels are replaced.
// These deformation regions are not isolated anatomical layers.
const profiles = {
  seraphine: {
    waist:[535,580], neck:[572,256], shoulder:[430,318], elbow:[394,510], farShoulder:[675,306],
    head:[[390,0],[705,0],[719,267],[610,298],[485,260],[374,173]],
    arm:[[405,304],[474,346],[452,542],[394,696],[349,784],[313,764],[306,661],[342,450]],
    weapon:[[358,650],[411,691],[353,799],[279,1020],[100,1360],[13,1474],[0,1413],[116,1100],[259,801]],
    farArm:[[626,219],[689,186],[751,276],[804,417],[749,461],[676,362]],
    capeLeft:[[238,470],[406,573],[405,956],[311,1317],[112,1440],[40,1392],[168,973]],
    capeRight:[[692,440],[939,598],[1005,1455],[806,1498],[644,944]],
    motion:{attack:1,skill:1,ultimate:1,cloth:1},
  },
  nyxara: {
    waist:[579,538], neck:[562,247], shoulder:[435,296], elbow:[349,434], farShoulder:[661,320],
    head:[[439,0],[680,0],[679,222],[605,285],[497,259],[421,182]],
    arm:[[424,270],[470,328],[417,457],[352,513],[299,449],[248,351],[268,282],[331,319],[376,360]],
    weapon:[[126,70],[374,62],[410,234],[340,317],[357,424],[293,449],[248,355],[173,296],[129,216]],
    farArm:[[648,363],[715,403],[740,594],[810,726],[770,790],[717,765],[668,593]],
    capeLeft:[[242,449],[401,467],[443,794],[382,1231],[144,1517],[0,1480],[130,1000]],
    capeRight:[[718,449],[904,486],[1024,1430],[836,1472],[699,1100]],
    motion:{attack:.65,skill:.85,ultimate:.9,cloth:.8},
  },
  lysael: {
    waist:[558,575], neck:[538,284], shoulder:[438,326], elbow:[373,488], farShoulder:[637,374],
    head:[[339,0],[704,0],[716,267],[625,328],[448,297],[350,187]],
    arm:[[414,313],[464,341],[451,502],[380,570],[280,585],[243,546],[289,508],[370,463]],
    weapon:[[54,91],[317,88],[371,282],[295,490],[305,583],[454,1438],[468,1524],[411,1515],[238,590],[195,489],[130,367],[65,303]],
    farArm:[[634,378],[678,411],[706,514],[802,526],[865,493],[903,555],[866,591],[785,591],[678,558]],
    capeLeft:[[300,578],[434,602],[452,891],[353,1498],[14,1452],[111,1041]],
    capeRight:[[732,576],[858,619],[1020,1315],[947,1508],[766,1449],[702,1000]],
    motion:{attack:.38,skill:.55,ultimate:.65,cloth:.8},
  },
  voren: {
    waist:[616,563], neck:[599,251], shoulder:[422,329], elbow:[327,537], farShoulder:[714,346],
    head:[[467,0],[693,0],[703,254],[626,312],[512,261],[454,170]],
    arm:[[362,282],[474,303],[449,438],[385,637],[356,754],[286,793],[252,725],[264,563],[299,424]],
    weapon:[[263,669],[365,686],[391,892],[474,973],[457,1248],[351,1423],[146,1534],[19,1273],[0,1101],[90,997],[284,859]],
    farArm:[[711,324],[790,397],[824,567],[912,748],[861,824],[802,783],[754,613]],
    capeLeft:[[224,652],[430,560],[440,832],[264,1200],[74,1095]],
    capeRight:[[758,550],[908,711],[1024,1322],[986,1480],[841,1389],[757,1053]],
    motion:{attack:.7,skill:.8,ultimate:.9,cloth:.7},
  },
};
export const BONE_NAMES = ['root','spine','head','arm','weapon','capeLeft','capeRight','farArm'];
export function createRig(id) {
  const p = profiles[id];
  if (!p) throw new Error(`Rig inconnu : ${id}`);
  const bone = (id,parent,pivot) => ({id,parent,pivot});
  return {
    schema:'shadow-mesh-rig-1', heroId:id, frame:{width:1024,height:1536,padding:150},
    grid:{columns:40,rows:60}, status:'deformation_study', anatomical_layers:false,
    texture:`../../03_assets/characters/${id}/presentation-v1.png`,
    bones:[bone('root',null,[530,1450]),bone('spine','root',p.waist),bone('head','spine',p.neck),
      bone('arm','spine',p.shoulder),bone('weapon','arm',p.elbow),
      bone('capeLeft','root',[390,600]),bone('capeRight','root',[698,620]),bone('farArm','spine',p.farShoulder)],
    regions:[
      {bone:'capeLeft',polygon:p.capeLeft,feather:115,strength:.75},
      {bone:'capeRight',polygon:p.capeRight,feather:115,strength:.75},
      {bone:'spine',polygon:[[350,165],[737,165],[751,486],[674,645],[437,639],[328,424]],feather:125,strength:1},
      {bone:'head',polygon:p.head,feather:45,strength:1},
      {bone:'farArm',polygon:p.farArm,feather:70,strength:.8},
      {bone:'arm',polygon:p.arm,feather:65,strength:1},
      {bone:'weapon',polygon:p.weapon,feather:85,strength:1},
    ],
    motion:p.motion,
    limits:{rotation:'amplitudes limitées ; pas de changement de perspective',layers:'pas de faces cachées reconstruites'},
  };
}
export const RIG_IDS = Object.keys(profiles);
