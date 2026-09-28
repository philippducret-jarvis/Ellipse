/** Apply reversible, bounded PBR adjustments to imported hero materials. */
export function tuneHeroMaterials(root,{roughness=1,metalness=1}={}){
 const seen=new Set();
 root.traverse(object=>{
  for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){
   if(!material||seen.has(material))continue;
   seen.add(material);
   if(material.userData.heroPbrBase===undefined)material.userData.heroPbrBase={roughness:material.roughness,metalness:material.metalness};
   const base=material.userData.heroPbrBase;
   if(Number.isFinite(base.roughness))material.roughness=Math.max(.08,Math.min(1,base.roughness*roughness));
   if(Number.isFinite(base.metalness))material.metalness=Math.max(0,Math.min(1,base.metalness*metalness));
  }
 });
 return seen.size;
}
